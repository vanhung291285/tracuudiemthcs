/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Student, SchoolClass, VisitorMonthlyStats } from "../types";
import { DEFAULT_STUDENTS } from "./mockData";

// Environment variables
const ENV_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://ahxhjmbmvgiznjembknb.supabase.co";
const ENV_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeGhqbWJtdmdpem5qZW1ia25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NjQyODgsImV4cCI6MjA5NzM0MDI4OH0.YYpY3UCDknw8mH5W3hrNnRMCPZRgZslh0jwelR6lV8Y";

class DatabaseService {
  private supabase: SupabaseClient | null = null;
  private localStudentsList: Student[] = [];
  public lastError: string | null = null;

  // Schema state indicators for maximum compatibility
  private mapFormatChecked = false;
  private isSnakeCaseSchema = false;
  private classesFormatChecked = false;
  private isSnakeCaseClasses = false;

  constructor() {
    this.initialize();
  }

  // Load client dynamically with priority: Saved Config > Env Config
  public initialize() {
    const savedUrl = localStorage.getItem("thcs_supabase_url") || ENV_URL;
    const savedKey = localStorage.getItem("thcs_supabase_key") || ENV_KEY;
    
    // Clear check state on re-init
    this.mapFormatChecked = false;
    this.classesFormatChecked = false;
    
    if (savedUrl && savedKey) {
      try {
        this.supabase = createClient(savedUrl, savedKey);
        console.log("Supabase client initialized successfully.");
      } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
        this.supabase = null;
      }
    } else {
      this.supabase = null;
    }

    // Initialize local memory store from localStorage or default
    const stored = localStorage.getItem("thcs_students_db");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Student[];
        // Upgrade legacy school names and student codes to the new 12-digit CCCD codes
        this.localStudentsList = parsed.map(st => {
          if (st.school === "Trường THCS Chu Văn An") {
            st.school = "Trường PTDTBT Tiểu Học và THCS Suối Lư";
          }
          if (st.studentCode === "HS202601") st.studentCode = "037206123456";
          if (st.studentCode === "HS202602") st.studentCode = "037206123457";
          if (st.studentCode === "HS202603") st.studentCode = "037206123458";
          if (st.studentCode === "HS202604") st.studentCode = "037206123459";
          if (st.studentCode === "HS202605") st.studentCode = "037206123460";
          return st;
        });
        this.saveLocally();
      } catch {
        this.localStudentsList = [...DEFAULT_STUDENTS];
        this.saveLocally();
      }
    } else {
      this.localStudentsList = [...DEFAULT_STUDENTS];
      this.saveLocally();
    }
  }

  // Save the memory list back to localStorage
  private saveLocally() {
    localStorage.setItem("thcs_students_db", JSON.stringify(this.localStudentsList));
  }

  public getSupabaseClient(): SupabaseClient | null {
    return this.supabase;
  }

  public getConfig() {
    return {
      url: localStorage.getItem("thcs_supabase_url") || ENV_URL,
      key: localStorage.getItem("thcs_supabase_key") || ENV_KEY,
      isRealSupabase: !!this.supabase,
    };
  }

  // Synchronize configuration credentials from centralized server
  public async syncConfigFromServer(): Promise<boolean> {
    try {
      const resp = await fetch("/api/settings");
      if (resp.ok) {
        const result = await resp.json();
        if (result.status === "success" && result.data) {
          const serverUrl = result.data["thcs_supabase_url"];
          const serverKey = result.data["thcs_supabase_key"];
          
          let hasChanges = false;
          if (serverUrl && localStorage.getItem("thcs_supabase_url") !== serverUrl) {
            localStorage.setItem("thcs_supabase_url", serverUrl);
            hasChanges = true;
          }
          if (serverKey && localStorage.getItem("thcs_supabase_key") !== serverKey) {
            localStorage.setItem("thcs_supabase_key", serverKey);
            hasChanges = true;
          }

          // Populate student portal header and footer configurations from centralized settings
          const portalKeys = [
            "portal_header_top",
            "portal_header_main",
            "portal_school_year",
            "portal_footer_title",
            "portal_footer_desc",
            "portal_footer_copy"
          ];
          for (const key of portalKeys) {
            const serverVal = result.data[key];
            if (serverVal !== undefined && serverVal !== null && localStorage.getItem(key) !== serverVal) {
              localStorage.setItem(key, serverVal);
            }
          }
          
          if (hasChanges) {
            console.log("Supabase config synchronized from centralized server. Re-initializing...");
            this.initialize();
            return true;
          }
        }
      }
    } catch (err) {
      console.warn("Failed to synchronize Supabase configuration from server:", err);
    }
    return false;
  }

  public async saveConfig(url: string, key: string) {
    if (url && key) {
      localStorage.setItem("thcs_supabase_url", url);
      localStorage.setItem("thcs_supabase_key", key);
      
      // Save configuration to backend database
      try {
        await fetch("/api/settings/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "thcs_supabase_url": url,
            "thcs_supabase_key": key
          })
        });
      } catch (err) {
        console.warn("Failed to update central configuration on server API:", err);
      }
    } else {
      localStorage.removeItem("thcs_supabase_url");
      localStorage.removeItem("thcs_supabase_key");
      
      // Remove configuration on backend
      try {
        await fetch("/api/settings/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "thcs_supabase_url": "",
            "thcs_supabase_key": ""
          })
        });
      } catch (err) {
        console.warn("Failed to clear central configuration on server API:", err);
      }
    }
    this.initialize();
  }

  // Clear connection details and revert to local fallback
  public async disconnect() {
    localStorage.removeItem("thcs_supabase_url");
    localStorage.removeItem("thcs_supabase_key");
    this.supabase = null;
    
    // Disconnect backend config too
    try {
      await fetch("/api/settings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "thcs_supabase_url": "",
          "thcs_supabase_key": ""
        })
      });
    } catch (err) {
      console.warn("Failed to clear centralized credentials on server:", err);
    }
    
    console.log("Supabase credentials cleared, using local database mode.");
  }

  // Check the table's key casing style dynamically
  private async checkSchemaCase() {
    if (this.mapFormatChecked || !this.supabase) return;
    try {
      const { error } = await this.supabase
        .from("students")
        .select("student_code")
        .limit(1);
      
      this.isSnakeCaseSchema = !error;
      console.log(`Database schema detected: ${this.isSnakeCaseSchema ? "snake_case" : "camelCase"} columns`);
      this.mapFormatChecked = true;
    } catch {
      this.isSnakeCaseSchema = false;
    }
  }

  // Check classes table casing
  private async checkClassesSchema() {
    if (this.classesFormatChecked || !this.supabase) return;
    try {
      const { error } = await this.supabase
        .from("portal_classes")
        .select("class_name")
        .limit(1);
      
      this.isSnakeCaseClasses = !error;
      console.log(`Classes schema detected: ${this.isSnakeCaseClasses ? "snake_case" : "camelCase"} columns`);
      this.classesFormatChecked = true;
    } catch {
      this.isSnakeCaseClasses = false;
    }
  }

  // Bidirectional mapping from Postgres Row to standard react Student
  private mapDbToStudent(row: any): Student {
    const studentCode = row.studentCode || row.student_code || "";
    const fullName = row.fullName || row.full_name || "";
    const dob = row.dob || row.date_of_birth || row.birth_date || row.ngay_sinh || "";
    const gender = row.gender || "";
    const className = row.className || row.class_name || "";
    const gradeLevel = row.gradeLevel || row.grade_level || "";
    const school = row.school || "Trường PTDTBT Tiểu Học và THCS Suối Lư";

    let subjectsList = Array.isArray(row.subjects) ? row.subjects : [];
    let extra: any = {};
    if (row.subjects && !Array.isArray(row.subjects)) {
      subjectsList = row.subjects.subjectsList || [];
      extra = row.subjects;
    }

    return {
      id: row.id || `student_${studentCode}`,
      studentCode,
      fullName,
      dob,
      gender,
      school,
      className,
      gradeLevel,
      academicYear: row.academicYear || extra.academicYear || "2025-2026",
      academicGrade: row.academicGrade || extra.academicGrade || "Tốt",
      academicGradeHK1: row.academicGradeHK1 || extra.academicGradeHK1 || "",
      academicGradeHK2: row.academicGradeHK2 || extra.academicGradeHK2 || "",
      behaviorGrade: row.behaviorGrade || extra.behaviorGrade || "Tốt",
      behaviorGradeHK1: row.behaviorGradeHK1 || extra.behaviorGradeHK1 || "",
      behaviorGradeHK2: row.behaviorGradeHK2 || extra.behaviorGradeHK2 || "",
      behaviorGradeSummer: row.behaviorGradeSummer || extra.behaviorGradeSummer || "Không",
      daysAbsent: typeof row.daysAbsent === "number" ? row.daysAbsent : (typeof extra.daysAbsent === "number" ? extra.daysAbsent : 0),
      daysAbsentUnexcused: typeof row.daysAbsentUnexcused === "number" ? row.daysAbsentUnexcused : (typeof extra.daysAbsentUnexcused === "number" ? extra.daysAbsentUnexcused : 0),
      distinction: row.distinction || extra.distinction || "Không",
      notes: row.notes || extra.notes || "",
      verificationToken: row.verificationToken || extra.verificationToken || `VERIFY-NEW-${studentCode}`,
      subjects: subjectsList
    };
  }

  // Bidirectional mapping from React Student to target DB columns
  private mapStudentToDb(student: Student): any {
    if (this.isSnakeCaseSchema) {
      return {
        student_code: student.studentCode,
        full_name: student.fullName,
        date_of_birth: student.dob,
        gender: student.gender,
        class_name: student.className,
        grade_level: student.gradeLevel,
        subjects: {
          subjectsList: student.subjects,
          school: student.school,
          academicYear: student.academicYear,
          academicGrade: student.academicGrade,
          academicGradeHK1: student.academicGradeHK1,
          academicGradeHK2: student.academicGradeHK2,
          behaviorGrade: student.behaviorGrade,
          behaviorGradeHK1: student.behaviorGradeHK1,
          behaviorGradeHK2: student.behaviorGradeHK2,
          behaviorGradeSummer: student.behaviorGradeSummer,
          daysAbsent: student.daysAbsent,
          daysAbsentUnexcused: student.daysAbsentUnexcused,
          distinction: student.distinction,
          notes: student.notes,
          verificationToken: student.verificationToken
        }
      };
    } else {
      return student;
    }
  }

  public async queryStudentsByName(fullName: string, dob: string): Promise<Student[]> {
    const cleanName = fullName.trim().toLowerCase();
    const cleanDob = dob.trim();

    if (this.supabase) {
      try {
        await this.checkSchemaCase();
        let query = this.supabase.from("students").select("*");
        if (this.isSnakeCaseSchema) {
          query = query.ilike("full_name", `%${cleanName}%`);
        } else {
          query = query.ilike("fullName", `%${cleanName}%`);
        }
        const { data, error } = await query;

        if (error) {
          console.warn("Supabase query failed, falling back to local database search:", error.message);
        } else if (data && data.length > 0) {
          const mappedList = data.map((d: any) => this.mapDbToStudent(d));
          const found = mappedList.filter((m: Student) => this.compareDates(m.dob, cleanDob) && m.fullName.toLowerCase() === cleanName);
          if (found.length > 0) return found;
        }
      } catch (err) {
        console.error("Err querying Supabase:", err);
      }
    }

    // Fallback: search local database
    const found = this.localStudentsList.filter(s => 
      s.fullName.toLowerCase() === cleanName && 
      this.compareDates(s.dob, cleanDob)
    );
    return found;
  }

  public async queryStudentByName(fullName: string, dob: string): Promise<Student | null> {
    const cleanName = fullName.trim().toLowerCase();
    const cleanDob = dob.trim();

    if (this.supabase) {
      try {
        await this.checkSchemaCase();
        let query = this.supabase.from("students").select("*");
        if (this.isSnakeCaseSchema) {
          query = query.ilike("full_name", `%${cleanName}%`);
        } else {
          query = query.ilike("fullName", `%${cleanName}%`);
        }
        const { data, error } = await query;

        if (error) {
          console.warn("Supabase query failed, falling back to local database search:", error.message);
        } else if (data && data.length > 0) {
          const mappedList = data.map((d: any) => this.mapDbToStudent(d));
          const found = mappedList.find((m: Student) => this.compareDates(m.dob, cleanDob) && m.fullName.toLowerCase() === cleanName);
          if (found) return found;
        }
      } catch (err) {
        console.error("Err querying Supabase:", err);
      }
    }

    // Fallback: search local database
    const found = this.localStudentsList.find(s => 
      s.fullName.toLowerCase() === cleanName && 
      this.compareDates(s.dob, cleanDob)
    );
    return found || null;
  }

  // Query student records
  public async queryStudent(studentCode: string, dob: string): Promise<Student | null> {
    const formattedCode = studentCode.trim().toUpperCase();
    const cleanDob = dob.trim(); // format: YYYY-MM-DD or DD-MM-YY etc depending on input

    if (this.supabase) {
      try {
        await this.checkSchemaCase();
        // Query official Supabase DB ('students' table)
        let query = this.supabase.from("students").select("*");
        if (this.isSnakeCaseSchema) {
          query = query.eq("student_code", formattedCode);
        } else {
          query = query.eq("studentCode", formattedCode);
        }
        const { data, error } = await query.single();

        if (error) {
          console.warn("Supabase query failed, falling back to local database search:", error.message);
        } else if (data) {
          const mapped = this.mapDbToStudent(data);
          // Dates in Vietnamese educational portals are stored as YYYY-MM-DD or simple strings.
          // Let's standardise comparison
          if (this.compareDates(mapped.dob, cleanDob)) {
            return mapped;
          } else {
            console.warn("Student found, but date of birth does not match.");
            return null;
          }
        }
      } catch (err) {
        console.error("Err querying Supabase:", err);
      }
    }

    // Fallback: search local database
    const found = this.localStudentsList.find(s => 
      s.studentCode.toUpperCase() === formattedCode && 
      this.compareDates(s.dob, cleanDob)
    );
    return found || null;
  }

  private compareDates(dbDob: string, inputDob: string): boolean {
    const cleanDb = dbDob.replace(/[^0-9]/g, "");
    const cleanInput = inputDob.replace(/[^0-9]/g, "");
    
    // Exact match or partial end-of-string match (e.g. DD-MM-YYYY comparing with input)
    if (cleanDb === cleanInput) return true;
    
    // If user input is DD/MM/YYYY vs DB YYYY-MM-DD, try reordering:
    // database "2011-05-15" (20110515) vs input "15/05/2011" (15052011)
    if (dbDob.includes("-") && (inputDob.includes("/") || inputDob.includes("-"))) {
      const dbParts = dbDob.split("-"); // YYYY, MM, DD
      const inputChar = inputDob.includes("/") ? "/" : "-";
      const inputParts = inputDob.split(inputChar); // DD, MM, YYYY or YYYY, MM, DD
      
      if (dbParts.length === 3 && inputParts.length === 3) {
        // match: [2011, 05, 15] vs [15, 05, 2011]
        const dbY = dbParts[0], dbM = dbParts[1], dbD = dbParts[2];
        
        let inY = "", inM = "", inD = "";
        if (inputParts[0].length === 4) {
          inY = inputParts[0]; inM = inputParts[1]; inD = inputParts[2];
        } else {
          inD = inputParts[0]; inM = inputParts[1]; inY = inputParts[2];
        }
         
        if (parseInt(dbY) === parseInt(inY) && 
            parseInt(dbM) === parseInt(inM) && 
            parseInt(dbD) === parseInt(inD)) {
          return true;
        }
      }
    }
    
    // Quick string match
    return dbDob.includes(inputDob) || inputDob.includes(dbDob);
  }

  // Fetch all students (for admin panel)
  public async getAllStudents(): Promise<Student[]> {
    if (this.supabase) {
      try {
        const timeoutPromise = new Promise<{data: any, error: any}>((_, resolve) => 
          setTimeout(() => resolve({ data: null, error: { message: "Timeout" } }), 3000)
        );
        await Promise.race([this.checkSchemaCase(), new Promise(r => setTimeout(r, 1000))]);
        
        const result = await Promise.race([
          this.supabase.from("students").select("*"),
          timeoutPromise
        ]);

        const data = result.data;
        const error = result.error;

        if (!error && data) {
          const mappedList = data.map(row => this.mapDbToStudent(row));
          // Sort inside Javascript uniformly to avoid database ORDER BY case sensitivity bugs
          return mappedList.sort((a, b) => {
            const classCompare = a.className.localeCompare(b.className);
            if (classCompare !== 0) return classCompare;
            return a.fullName.localeCompare(b.fullName);
          });
        }
        console.warn("Supabase select fails:", error?.message);
      } catch (err) {
        console.error("Supabase select exceptional err:", err);
      }
    }
    return [...this.localStudentsList];
  }

  // Get total count of students
  public async getStudentCount(): Promise<number> {
    if (this.supabase) {
      try {
        const { count, error } = await this.supabase
          .from("students")
          .select("*", { count: "exact", head: true });
        
        if (!error && count !== null) {
          return count;
        }
      } catch (err) {
        console.warn("Supabase count failed:", err);
      }
    }
    return this.localStudentsList.length;
  }

  // Create or Update student
  public async upsertStudent(student: Student): Promise<boolean> {
    // 1. Update in local memory immediately
    const existingIdx = this.localStudentsList.findIndex(s => s.studentCode === student.studentCode);
    if (existingIdx !== -1) {
      this.localStudentsList[existingIdx] = student;
    } else {
      this.localStudentsList.push(student);
    }
    this.saveLocally();

    // 2. Query Supabase
    if (this.supabase) {
      try {
        const timeoutPromise = new Promise<{error: any}>((resolve) => 
          setTimeout(() => resolve({ error: { message: "Kết nối máy chủ Supabase vượt quá thời gian chờ (Timeout)." } }), 5000)
        );

        await Promise.race([this.checkSchemaCase(), new Promise(r => setTimeout(r, 2000))]);
        
        const mapped = this.mapStudentToDb(student);

        const result = await Promise.race([
          this.supabase
            .from("students")
            .upsert(mapped, { onConflict: this.isSnakeCaseSchema ? "student_code" : "studentCode" }),
          timeoutPromise
        ]);

        if (result.error) {
          console.error("Supabase upsert error:", result.error.message);
          this.lastError = result.error.message;
          return false;
        }
        
        this.lastError = null;
        return true;
      } catch (err: any) {
        console.error("Supabase upsert exception:", err);
        this.lastError = err.message || String(err);
        return false;
      }
    }
    
    // Offline mode
    this.lastError = null;
    return true;
  }

  // Delete student
  public async deleteStudent(studentCode: string): Promise<boolean> {
    this.localStudentsList = this.localStudentsList.filter(s => s.studentCode !== studentCode);
    this.saveLocally();

    if (this.supabase) {
      try {
        await Promise.race([this.checkSchemaCase(), new Promise(r => setTimeout(r, 2000))]);
        
        let query = this.supabase.from("students").delete();
        if (this.isSnakeCaseSchema) {
          query = query.eq("student_code", studentCode);
        } else {
          query = query.eq("studentCode", studentCode);
        }
        
        const result = await Promise.race([
          query,
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
        ]);

        if (result && result.error) {
          console.error("Supabase delete failed:", result.error.message);
          this.lastError = result.error.message;
          return false;
        }
        this.lastError = null;
        return true;
      } catch (err: any) {
        console.error("Supabase delete exception:", err);
        this.lastError = err.message || String(err);
        return false;
      }
    }
    this.lastError = null;
    return true;
  }

  // Synchronise mock data to Supabase (helper to write to their remote project)
  public async syncLocalDataToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
    if (!this.supabase) {
      return { success: false, count: 0, error: "Supabase is not connected yet" };
    }

    try {
      const syncWork = async () => {
        await this.checkSchemaCase();
        let uploadedCount = 0;
        for (const student of this.localStudentsList) {
          const mapped = this.mapStudentToDb(student);
          const { error } = await this.supabase!
            .from("students")
            .upsert(mapped, { onConflict: this.isSnakeCaseSchema ? "student_code" : "studentCode" });
          if (!error) uploadedCount++;
        }
        return uploadedCount;
      };

      const uploadedCount = await Promise.race([
        syncWork(),
        new Promise<number>((_, reject) => setTimeout(() => reject(new Error("Quá thời gian đồng bộ. Vui lòng kiểm tra lại kết nối Supabase.")), 15000))
      ]);

      return { success: true, count: uploadedCount };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || "An error occurred during synchronization." };
    }
  }

  // Reset local database
  public resetToDefault() {
    this.localStudentsList = [...DEFAULT_STUDENTS];
    this.saveLocally();
    return [...this.localStudentsList];
  }

  // Clear all students completely
  public async clearAllStudents(): Promise<boolean> {
    this.localStudentsList = [];
    this.saveLocally();

    if (this.supabase) {
      try {
        await Promise.race([this.checkSchemaCase(), new Promise(r => setTimeout(r, 2000))]);
        
        let query = this.supabase.from("students").delete();
        if (this.isSnakeCaseSchema) {
          query = query.neq("student_code", "");
        } else {
          query = query.neq("studentCode", "");
        }
        
        const result = await Promise.race([
          query,
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
        ]);

        if (result && result.error) {
          console.error("Supabase clear all failed:", result.error.message);
          this.lastError = result.error.message;
          return false;
        }
        this.lastError = null;
        return true;
      } catch (err: any) {
        console.error("Supabase clear all exception:", err);
        this.lastError = err.message || String(err);
        return false;
      }
    }
    this.lastError = null;
    return true;
  }

  // Delete all students of a specific class
  public async deleteStudentsByClass(className: string): Promise<boolean> {
    this.localStudentsList = this.localStudentsList.filter(s => s.className !== className);
    this.saveLocally();

    if (this.supabase) {
      try {
        await this.checkSchemaCase();
        
        let query = this.supabase.from("students").delete();
        if (this.isSnakeCaseSchema) {
          query = query.eq("class_name", className);
        } else {
          query = query.eq("className", className);
        }
        const { error } = await query;

        if (error) {
          console.error("Supabase delete by class failed:", error.message);
          this.lastError = error.message;
          return false;
        }
        this.lastError = null;
        return true;
      } catch (err: any) {
        console.error("Supabase delete by class exception:", err);
        this.lastError = err.message || String(err);
        return false;
      }
    }
    this.lastError = null;
    return true;
  }

  // Load classes from Supabase if possible, otherwise fallback locally
  public async getClasses(): Promise<SchoolClass[]> {
    if (this.supabase) {
      try {
        await this.checkClassesSchema();
        const { data, error } = await this.supabase
          .from("portal_classes")
          .select("*");

        if (!error && data) {
          const mapped = data.map((row: any) => ({
            id: row.id,
            className: row.className || row.class_name || "",
            gradeLevel: row.gradeLevel || row.grade_level || "",
            advisorName: row.advisorName || row.advisor_name || "",
            roomNumber: row.roomNumber || row.room_number || ""
          }));
          return mapped.sort((a, b) => a.className.localeCompare(b.className));
        }
        console.warn("Supabase portal_classes query failed. (Does the table exist yet?):", error?.message);
      } catch (err) {
        console.error("Supabase portal_classes exception:", err);
      }
    }

    // Fallback to local storage load
    const cached = localStorage.getItem("portal_classes");
    if (cached) {
      try {
        return JSON.parse(cached) as SchoolClass[];
      } catch (e) {
        // error parsing, fallback to base
      }
    }
    return [
      { id: "class_01", className: "9A1", gradeLevel: "9", advisorName: "Cô Nguyễn Minh Thảo", roomNumber: "Phòng 301" },
      { id: "class_02", className: "9A2", gradeLevel: "9", advisorName: "Thầy Trương Văn Lâm", roomNumber: "Phòng 302" },
      { id: "class_03", className: "8B1", gradeLevel: "8", advisorName: "Cô Phạm Thị Thanh", roomNumber: "Phòng 201" },
      { id: "class_04", className: "8B2", gradeLevel: "8", advisorName: "Cô Lò Thị Mai", roomNumber: "Phòng 202" },
      { id: "class_05", className: "7C1", gradeLevel: "7", advisorName: "Thầy Nguyễn Tiến Dũng", roomNumber: "Phòng 101" },
      { id: "class_06", className: "6A1", gradeLevel: "6", advisorName: "Cô Hoàng Lan Anh", roomNumber: "Phòng 102" }
    ];
  }

  // Save/Upsert classes to Supabase
  public async saveClasses(classes: SchoolClass[]): Promise<boolean> {
    // Save to local storage first
    localStorage.setItem("portal_classes", JSON.stringify(classes));

    if (this.supabase) {
      try {
        await Promise.race([this.checkClassesSchema(), new Promise(r => setTimeout(r, 2000))]);
        const mapped = classes.map(c => {
          if (this.isSnakeCaseClasses) {
            return {
              id: c.id,
              class_name: c.className,
              grade_level: c.gradeLevel,
              advisor_name: c.advisorName,
              room_number: c.roomNumber
            };
          } else {
            return c;
          }
        });

        const result = await Promise.race([
          this.supabase.from("portal_classes").upsert(mapped, { onConflict: "id" }),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout saving classes")), 5000))
        ]);

        if (result && result.error) {
          console.error("Supabase portal_classes upsert failed:", result.error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.error("Supabase portal_classes exception on save:", err);
        return false;
      }
    }
    return true;
  }

  // Delete a class from Supabase
  public async deleteClass(classId: string): Promise<boolean> {
    if (this.supabase) {
      try {
        const result = await Promise.race([
          this.supabase.from("portal_classes").delete().eq("id", classId),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout deleting class")), 5000))
        ]);

        if (result && result.error) {
          console.error("Supabase portal_classes delete failed:", result.error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.error("Supabase portal_classes exception on delete:", err);
        return false;
      }
    }
    return true;
  }

  // Load a single portal setting with tiered fallback (Supabase > LocalStorage > Server API > Default)
  public async getPortalSetting(key: string, defaultValue: string): Promise<string> {
    // 1. Try to fetch from remote Supabase if connected
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from("portal_settings")
          .select("setting_value")
          .eq("id", key)
          .maybeSingle();

        if (!error && data && data.setting_value !== undefined) {
          localStorage.setItem(key, data.setting_value);
          // Async sync to server to maintain centralized backup
          this.syncSettingToServer(key, data.setting_value);
          return data.setting_value;
        }
      } catch (err) {
        console.warn(`Supabase getPortalSetting for key "${key}" failed, fallback to local storage:`, err);
      }
    }

    // 2. Fallback to LocalStorage first (as it was pre-synchronized on startup)
    const localVal = localStorage.getItem(key);
    if (localVal !== null && localVal !== undefined) {
      return localVal;
    }

    // 3. Try to fetch from central Server API only if not in localStorage
    try {
      const resp = await fetch("/api/settings");
      if (resp.ok) {
        const result = await resp.json();
        if (result.status === "success" && result.data && result.data[key] !== undefined) {
          const val = result.data[key];
          localStorage.setItem(key, val);
          return val;
        }
      }
    } catch (err) {
      console.warn("Server API getPortalSetting fallback failed:", err);
    }

    return defaultValue;
  }

  // Save portal setting centrally across LocalStorage, Server API, and remote Supabase
  public async savePortalSetting(key: string, value: string): Promise<boolean> {
    localStorage.setItem(key, value);

    // A. Always save to backend Server API so all browsers/devices synchronize immediately
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
    } catch (err) {
      console.warn("Failed to save portal setting to server API:", err);
    }

    // B. Save to remote Supabase if connected
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from("portal_settings")
          .upsert({ id: key, setting_value: value }, { onConflict: "id" });

        if (error) {
          console.warn("Supabase portal_settings upsert failed:", error.message);
          this.lastError = error.message;
          return false;
        }
        this.lastError = null;
        return true;
      } catch (err: any) {
        console.warn("Supabase savePortalSetting exception:", err);
        this.lastError = err.message;
        return false;
      }
    }
    return true;
  }

  // Backup sync helper
  private async syncSettingToServer(key: string, value: string) {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
    } catch (e) {
      // quiet fail
    }
  }

  // Visitor statistics tracking
  public async recordVisit(): Promise<void> {
    if (!this.supabase) {
      // Offline mode: keep track in localStorage for simple feedback
      const current = localStorage.getItem("thcs_visitor_count") || "0";
      localStorage.setItem("thcs_visitor_count", (parseInt(current) + 1).toString());
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      
      // We'll use a specific table 'visitor_counts' for daily aggregation
      // Columns: visit_date (date, PK), count (integer)
      
      // Try to get today's record first
      const { data, error: fetchError } = await this.supabase
        .from("visitor_counts")
        .select("count")
        .eq("visit_date", today)
        .maybeSingle();

      if (!fetchError) {
        if (data) {
          // Update existing
          await this.supabase
            .from("visitor_counts")
            .update({ count: (data.count || 0) + 1 })
            .eq("visit_date", today);
        } else {
          // Insert new
          await this.supabase
            .from("visitor_counts")
            .insert({ visit_date: today, count: 1 });
        }
      }
      
      // Also keep legacy 'visitor_stats' if it exists (one row per visit) for backward compatibility
      // but in a separate try/catch
      try {
        const monthStr = today.substring(0, 7); // YYYY-MM
        await this.supabase.from("visitor_stats").insert({
          visited_at: new Date().toISOString(),
          month: monthStr
        }).select().single();
      } catch (e) {
        // Ignore if visitor_stats table doesn't exist
      }

    } catch (err) {
      console.warn("Failed to record visitor stats to Supabase:", err);
    }
  }

  public async getVisitorStats(): Promise<VisitorMonthlyStats[]> {
    if (!this.supabase) {
       const offlineCount = parseInt(localStorage.getItem("thcs_visitor_count") || "0");
       return [{ month: "Ngoại tuyến (Offline)", count: offlineCount }];
    }

    try {
      // We'll aggregate from 'visitor_counts' (daily) as it's more accurate now
      const { data, error } = await this.supabase
        .from("visitor_counts")
        .select("visit_date, count");
      
      if (error) {
        // Fallback to legacy visitor_stats if visitor_counts doesn't exist
        const { data: legacyData, error: legacyError } = await this.supabase
          .from("visitor_stats")
          .select("month");
        
        if (legacyError) return [];
        
        const counts: Record<string, number> = {};
        legacyData.forEach((row: any) => {
          if (row.month) {
            counts[row.month] = (counts[row.month] || 0) + 1;
          }
        });
        return Object.entries(counts)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => b.month.localeCompare(a.month));
      }

      // Aggregate daily counts into monthly
      const monthlyCounts: Record<string, number> = {};
      data.forEach((row: any) => {
        const month = row.visit_date.substring(0, 7); // YYYY-MM
        monthlyCounts[month] = (monthlyCounts[month] || 0) + row.count;
      });

      return Object.entries(monthlyCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => b.month.localeCompare(a.month));
    } catch (err) {
      console.warn("Failed to fetch visitor stats:", err);
      return [];
    }
  }

  public async getTotalVisitors(): Promise<number> {
    if (!this.supabase) {
      return parseInt(localStorage.getItem("thcs_visitor_count") || "0");
    }

    try {
      // Sum counts from visitor_counts
      const { data, error } = await this.supabase
        .from("visitor_counts")
        .select("count");
      
      if (!error && data) {
        return data.reduce((sum, row) => sum + (row.count || 0), 0);
      }

      // Fallback to legacy count
      const { count, error: legacyError } = await this.supabase
        .from("visitor_stats")
        .select("*", { count: 'exact', head: true });
      
      return count || 0;
    } catch {
      return 0;
    }
  }

  public async getVisitorOverview(): Promise<{ online: number; today: number; thisMonth: number; total: number }> {
    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split("T")[0];
    
    // Calculate first and last day of current month
    const firstDayOfMonth = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1).toISOString().split("T")[0];
    const lastDayOfMonth = new Date(todayObj.getFullYear(), todayObj.getMonth() + 1, 0).toISOString().split("T")[0];
    
    let total = 0;
    let today = 0;
    let thisMonth = 0;
    
    if (this.supabase) {
      try {
        // 1. Get today's count
        const { data: todayData } = await this.supabase
          .from("visitor_counts")
          .select("count")
          .eq("visit_date", todayStr)
          .maybeSingle();
        if (todayData) today = todayData.count || 0;
        
        // 2. Get this month's total (sum of daily records in month)
        const { data: monthData } = await this.supabase
          .from("visitor_counts")
          .select("count")
          .gte("visit_date", firstDayOfMonth)
          .lte("visit_date", lastDayOfMonth);
        
        if (monthData) {
          thisMonth = monthData.reduce((sum, row) => sum + (row.count || 0), 0);
        }

        // 3. Get total visitors (sum of all daily records)
        const { data: allData } = await this.supabase
          .from("visitor_counts")
          .select("count");
        
        if (allData) {
          total = allData.reduce((sum, row) => sum + (row.count || 0), 0);
        }

        // Fallback to legacy count if visitor_counts is empty but visitor_stats has data
        if (total === 0) {
          total = await this.getTotalVisitors();
        }

      } catch (e) {
        console.warn("Failed to fetch detailed visitor stats:", e);
      }
    } else {
      // Offline fallback
      total = 1234;
      today = 15;
      thisMonth = 450;
    }

    return {
      online: Math.floor(Math.random() * 4) + 2, // Simulated active sessions (2-5)
      today: today || 1,
      thisMonth: thisMonth || today || 1,
      total: total || thisMonth || 1
    };
  }
}

export const dbService = new DatabaseService();
export default dbService;

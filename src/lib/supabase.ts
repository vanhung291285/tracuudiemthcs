/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Student, SchoolClass } from "../types";
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
      behaviorGrade: row.behaviorGrade || extra.behaviorGrade || "Tốt",
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
          behaviorGrade: student.behaviorGrade,
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
        await this.checkSchemaCase();
        const { data, error } = await this.supabase
          .from("students")
          .select("*");

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

  // Create or Update student
  public async upsertStudent(student: Student): Promise<boolean> {
    // 1. Update in local memory immediately
    const idx = this.localStudentsList.findIndex(s => s.studentCode === student.studentCode);
    if (idx !== -1) {
      this.localStudentsList[idx] = student;
    } else {
      this.localStudentsList.push(student);
    }
    this.saveLocally();

    // 2. Query Supabase
    if (this.supabase) {
      try {
        await this.checkSchemaCase();
        
        const mapped = this.mapStudentToDb(student);
        const { error } = await this.supabase
          .from("students")
          .upsert(mapped, { onConflict: this.isSnakeCaseSchema ? "student_code" : "studentCode" });

        if (error) {
          console.error("Supabase upsert error:", error.message);
          this.lastError = error.message;
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
    this.lastError = null;
    return true;
  }

  // Delete student
  public async deleteStudent(studentCode: string): Promise<boolean> {
    this.localStudentsList = this.localStudentsList.filter(s => s.studentCode !== studentCode);
    this.saveLocally();

    if (this.supabase) {
      try {
        await this.checkSchemaCase();
        
        let query = this.supabase.from("students").delete();
        if (this.isSnakeCaseSchema) {
          query = query.eq("student_code", studentCode);
        } else {
          query = query.eq("studentCode", studentCode);
        }
        const { error } = await query;

        if (error) {
          console.error("Supabase delete failed:", error.message);
          this.lastError = error.message;
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
      await this.checkSchemaCase();
      let uploadedCount = 0;
      for (const student of this.localStudentsList) {
        const mapped = this.mapStudentToDb(student);
        const { error } = await this.supabase
          .from("students")
          .upsert(mapped, { onConflict: this.isSnakeCaseSchema ? "student_code" : "studentCode" });
        if (!error) uploadedCount++;
      }
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
        await this.checkSchemaCase();
        
        let query = this.supabase.from("students").delete();
        if (this.isSnakeCaseSchema) {
          query = query.neq("student_code", "");
        } else {
          query = query.neq("studentCode", "");
        }
        const { error } = await query;

        if (error) {
          console.error("Supabase clear all failed:", error.message);
          this.lastError = error.message;
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
        await this.checkClassesSchema();
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

        const { error } = await this.supabase
          .from("portal_classes")
          .upsert(mapped, { onConflict: "id" });

        if (error) {
          console.error("Supabase portal_classes upsert failed:", error.message);
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
        const { error } = await this.supabase
          .from("portal_classes")
          .delete()
          .eq("id", classId);

        if (error) {
          console.error("Supabase portal_classes delete failed:", error.message);
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
          .select("value")
          .eq("key", key)
          .maybeSingle();

        if (!error && data && data.value !== undefined) {
          localStorage.setItem(key, data.value);
          // Async sync to server to maintain centralized backup
          this.syncSettingToServer(key, data.value);
          return data.value;
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
          .upsert({ key, value }, { onConflict: "key" });

        if (error) {
          console.warn("Supabase portal_settings upsert failed:", error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.warn("Supabase savePortalSetting exception:", err);
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
}

export const dbService = new DatabaseService();
export default dbService;

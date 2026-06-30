/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Student, SchoolClass, VisitorMonthlyStats, RecentActivity } from "../types";
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
  private isModernSchema = false;
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
        // Initialization log suppressed for cleaner output
      } catch (err) {
        // Silent capture of initialization err
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
          for (const key in result.data) {
            if (key.startsWith("portal_")) {
              const serverVal = result.data[key];
              if (serverVal !== undefined && serverVal !== null && localStorage.getItem(key) !== serverVal) {
                localStorage.setItem(key, serverVal);
              }
            }
          }
          
          if (hasChanges) {
            this.initialize();
            return true;
          }
        }
      }
    } catch (err) {
      // Background sync errors are logged at low priority
      console.log("Supabase config background sync status:", (err as any).message);
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
        // Silent fail on background config update
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
        // Silent fail
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
      // Silent fail
    }
    
    console.log("Supabase credentials cleared, using local database mode.");
  }

  // Check the table's key casing style dynamically
  private async checkSchemaCase() {
    if (this.mapFormatChecked || !this.supabase) return;
    try {
      // 1. Check for modern snake_case schema (all columns present)
      const { data, error } = await this.supabase
        .from("students")
        .select("student_code, academic_grade")
        .limit(1);
      
      if (!error) {
        this.isSnakeCaseSchema = true;
        this.isModernSchema = true;
      } else {
        // 2. Check for legacy snake_case (only core columns)
        const { error: legacyError } = await this.supabase
          .from("students")
          .select("student_code")
          .limit(1);
        
        this.isSnakeCaseSchema = !legacyError;
        this.isModernSchema = false;
      }
      this.mapFormatChecked = true;
    } catch {
      this.isSnakeCaseSchema = false;
      this.isModernSchema = false;
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
      academicYear: row.academicYear || row.academic_year || extra.academicYear || "2025-2026",
      academicGrade: row.academicGrade || row.academic_grade || extra.academicGrade || "Tốt",
      academicGradeHK1: row.academicGradeHK1 || row.academic_grade_hk1 || extra.academicGradeHK1 || "",
      academicGradeHK2: row.academicGradeHK2 || row.academic_grade_hk2 || extra.academicGradeHK2 || "",
      behaviorGrade: row.behaviorGrade || row.behavior_grade || extra.behaviorGrade || "Tốt",
      behaviorGradeHK1: row.behaviorGradeHK1 || row.behavior_grade_hk1 || extra.behavior_grade_hk1 || "",
      behaviorGradeHK2: row.behaviorGradeHK2 || row.behavior_grade_hk2 || extra.behavior_grade_hk2 || "",
      behaviorGradeSummer: row.behaviorGradeSummer || row.behavior_grade_summer || extra.behaviorGradeSummer || "Không",
      daysAbsent: typeof row.daysAbsent === "number" ? row.daysAbsent : (typeof row.days_absent === "number" ? row.days_absent : (typeof extra.daysAbsent === "number" ? extra.daysAbsent : 0)),
      daysAbsentUnexcused: typeof row.daysAbsentUnexcused === "number" ? row.daysAbsentUnexcused : (typeof row.days_absent_unexcused === "number" ? row.days_absent_unexcused : (typeof extra.daysAbsentUnexcused === "number" ? extra.daysAbsentUnexcused : 0)),
      distinction: row.distinction || extra.distinction || "Không",
      notes: row.notes || extra.notes || "",
      verificationToken: row.verificationToken || row.verification_token || extra.verificationToken || `VERIFY-NEW-${studentCode}`,
      teacher: row.teacher || extra.teacher || "",
      subjects: subjectsList
    };
  }

  // Bidirectional mapping from React Student to target DB columns
  private mapStudentToDb(student: Student): any {
    // 1. Modern Schema: Top-level columns
    if (this.isSnakeCaseSchema && this.isModernSchema) {
      return {
        id: student.id,
        student_code: student.studentCode,
        full_name: student.fullName,
        date_of_birth: student.dob,
        gender: student.gender,
        school: student.school,
        class_name: student.className,
        grade_level: student.gradeLevel,
        academic_year: student.academicYear,
        academic_grade: student.academicGrade,
        academic_grade_hk1: student.academicGradeHK1 || "",
        academic_grade_hk2: student.academicGradeHK2 || "",
        behavior_grade: student.behaviorGrade,
        behavior_grade_hk1: student.behaviorGradeHK1 || "",
        behavior_grade_hk2: student.behaviorGradeHK2 || "",
        behavior_grade_summer: student.behaviorGradeSummer || "Không",
        days_absent: student.daysAbsent,
        days_absent_unexcused: student.daysAbsentUnexcused,
        distinction: student.distinction,
        notes: student.notes || "",
        verification_token: student.verificationToken,
        teacher: student.teacher || "",
        subjects: student.subjects
      };
    } 
    
    // 2. Legacy Schema (Fallback): Pack extra fields into JSONB column 'subjects'
    if (this.isSnakeCaseSchema) {
      return {
        id: student.id,
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
          verificationToken: student.verificationToken,
          teacher: student.teacher
        }
      };
    }
    
    // 3. Default (CamelCase or others)
    return student;
  }

  private removeDiacritics(str: string): string {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  private normalizeName(name: string): string {
    if (!name) return "";
    let normalized = name.trim().toLowerCase().normalize("NFC").replace(/\s+/g, " ");
    
    // Standardize Vietnamese accent placement (handling old vs new spelling)
    // This is crucial for matching manually typed names vs imported names
    const map: Record<string, string> = {
      "uỳ": "ùy", "uý": "úy", "uỷ": "ủy", "uỹ": "ũy", "uỵ": "ụy",
      "oà": "òa", "oè": "òe", "oả": "ỏa", "oã": "oã", "oạ": "ọa",
      "uờ": "ườ", "uớ": "ướ", "uở": "ưở", "uỡ": "ưỡ", "uợ": "ượ",
      "iề": "iề", "iế": "iế", "iể": "iể", "iễ": "iễ", "iệ": "iệ"
    };
    
    for (const [key, value] of Object.entries(map)) {
      normalized = normalized.replace(new RegExp(key, "g"), value);
    }
    
    return normalized;
  }

  public async queryStudentByNameAndClass(fullName: string, className: string): Promise<Student[]> {
    const cleanName = this.normalizeName(fullName);
    const noDiacriticInput = this.removeDiacritics(fullName);
    const cleanClass = className.trim().toUpperCase();

    if (!cleanName && !noDiacriticInput) return [];

    if (this.supabase) {
      try {
        await this.checkSchemaCase();
        const nameField = this.isSnakeCaseSchema ? "full_name" : "fullName";
        const classField = this.isSnakeCaseSchema ? "class_name" : "className";
        
        const { data, error } = await this.supabase
          .from("students")
          .select("*")
          .eq(classField, cleanClass);

        if (!error && data && data.length > 0) {
          const mappedList = data.map((d: any) => this.mapDbToStudent(d));
          
          // 1. Try strict match with normalization
          let found = mappedList.filter((m: Student) => 
            this.normalizeName(m.fullName) === cleanName
          );
          if (found.length > 0) return found;

          // 2. Try match without diacritics
          found = mappedList.filter((m: Student) => 
            this.removeDiacritics(m.fullName) === noDiacriticInput
          );
          if (found.length > 0) return found;

          // 3. Fuzzy match: Ensure parts of the input are present in the name
          const inputParts = cleanName.split(" ").filter(p => p.length > 1);
          found = mappedList.filter((m: Student) => {
            const dbName = this.normalizeName(m.fullName);
            const dbNoAccents = this.removeDiacritics(m.fullName);
            return inputParts.every(part => dbName.includes(part) || dbNoAccents.includes(this.removeDiacritics(part)));
          });
          if (found.length > 0) return found;
        }
      } catch (err) {
        console.warn("Supabase query by name/class error:", err);
      }
    }

    // Fallback: search local database
    const localFound = this.localStudentsList.filter(s => {
      const isClassMatch = (s.className || "").trim().toUpperCase() === cleanClass;
      if (!isClassMatch) return false;

      const dbNameNormalized = this.normalizeName(s.fullName);
      const dbNoAccents = this.removeDiacritics(s.fullName);
      
      if (dbNameNormalized === cleanName) return true;
      if (dbNoAccents === noDiacriticInput) return true;
      
      const inputParts = cleanName.split(" ").filter(p => p.length > 1);
      return inputParts.length > 0 && inputParts.every(part => 
        dbNameNormalized.includes(part) || dbNoAccents.includes(this.removeDiacritics(part))
      );
    });
    
    return localFound;
  }

  public async queryStudentsByName(fullName: string, dob: string): Promise<Student[]> {
    const cleanName = this.normalizeName(fullName);
    const noDiacriticInput = this.removeDiacritics(fullName);
    const cleanDob = dob.trim();

    if (!cleanName && !noDiacriticInput) return [];

    if (this.supabase) {
      try {
        await this.checkSchemaCase();
        const nameField = this.isSnakeCaseSchema ? "full_name" : "fullName";
        
        // Fetch candidates by the last name (personal name) to handle normalization in JS
        const searchTerms = fullName.trim().split(" ");
        const lastName = searchTerms[searchTerms.length - 1];
        
        const { data, error } = await this.supabase
          .from("students")
          .select("*")
          .ilike(nameField, `%${lastName}%`);

        if (!error && data && data.length > 0) {
          const mappedList = data.map((d: any) => this.mapDbToStudent(d));
          
          // 1. Try strict match with normalization
          let found = mappedList.filter((m: Student) => 
            this.compareDates(m.dob, cleanDob) && 
            this.normalizeName(m.fullName) === cleanName
          );
          
          if (found.length > 0) return found;

          // 2. Try match without diacritics (extremely robust for manual typing)
          found = mappedList.filter((m: Student) => 
            this.compareDates(m.dob, cleanDob) && 
            this.removeDiacritics(m.fullName) === noDiacriticInput
          );

          if (found.length > 0) return found;

          // 3. Fuzzy match for long names: Ensure all words in the input are present in the database name
          const inputParts = cleanName.split(" ").filter(p => p.length > 1);
          found = mappedList.filter((m: Student) => {
            if (!this.compareDates(m.dob, cleanDob)) return false;
            const dbName = this.normalizeName(m.fullName);
            const dbNoAccents = this.removeDiacritics(m.fullName);
            return inputParts.every(part => dbName.includes(part) || dbNoAccents.includes(this.removeDiacritics(part)));
          });

          if (found.length > 0) return found;
        }
      } catch (err) {
        console.warn("Supabase query error:", err);
      }
    }

    // Fallback: search local database
    const localFound = this.localStudentsList.filter(s => {
      const isDateMatch = this.compareDates(s.dob, cleanDob);
      if (!isDateMatch) return false;

      const dbNameNormalized = this.normalizeName(s.fullName);
      const dbNoAccents = this.removeDiacritics(s.fullName);
      
      if (dbNameNormalized === cleanName) return true;
      if (dbNoAccents === noDiacriticInput) return true;
      
      const inputParts = cleanName.split(" ").filter(p => p.length > 1);
      return inputParts.length > 0 && inputParts.every(part => 
        dbNameNormalized.includes(part) || dbNoAccents.includes(this.removeDiacritics(part))
      );
    });
    
    return localFound;
  }

  public async queryStudentByName(fullName: string, dob: string): Promise<Student | null> {
    const results = await this.queryStudentsByName(fullName, dob);
    return results.length > 0 ? results[0] : null;
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
          // Query info status
        } else if (data) {
          const mapped = this.mapDbToStudent(data);
          // Dates in Vietnamese educational portals are stored as YYYY-MM-DD or simple strings.
          // Let's standardise comparison
          if (this.compareDates(mapped.dob, cleanDob)) {
            return mapped;
          } else {
            return null;
          }
        }
      } catch (err) {
        // Silent query error
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
    if (!dbDob || !inputDob) return false;
    
    const cleanDb = dbDob.replace(/[^0-9]/g, "");
    const cleanInput = inputDob.replace(/[^0-9]/g, "");
    
    // Quick match
    if (cleanDb === cleanInput) return true;
    
    // Helper to extract parts from various string formats
    const getParts = (str: string) => {
      let parts: string[] = [];
      if (str.includes("-")) parts = str.split("-");
      else if (str.includes("/")) parts = str.split("/");
      else if (str.includes(".")) parts = str.split(".");
      
      if (parts.length === 3) {
        // Handle YYYY-MM-DD
        if (parts[0].length === 4) {
          return { y: parseInt(parts[0]), m: parseInt(parts[1]), d: parseInt(parts[2]) };
        } 
        // Handle DD-MM-YYYY
        else if (parts[2].length === 4) {
          return { y: parseInt(parts[2]), m: parseInt(parts[1]), d: parseInt(parts[0]) };
        }
        // Handle YY-MM-DD (fallback)
        else if (parts[0].length === 2 && parseInt(parts[0]) > 31) {
           return { y: 2000 + parseInt(parts[0]), m: parseInt(parts[1]), d: parseInt(parts[2]) };
        }
      }
      return null;
    };

    const dbP = getParts(dbDob);
    const inP = getParts(inputDob);

    if (dbP && inP) {
      return dbP.y === inP.y && dbP.m === inP.m && dbP.d === inP.d;
    }
    
    // Final fallback: string containment
    return dbDob.includes(inputDob) || inputDob.includes(dbDob);
  }

  // Fetch all students (for admin panel)
  public async getAllStudents(): Promise<Student[]> {
    if (this.supabase) {
      try {
        const timeoutPromise = new Promise<{data: any, error: any}>((_, resolve) => 
          setTimeout(() => resolve({ data: null, error: { message: "Timeout" } }), 10000)
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
      } catch (err) {
        // Exception log suppressed
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
        // Count deferred
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
      } catch (err) {
        // Silent skip
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

        if (!error && data && data.setting_value !== undefined && data.setting_value !== null && data.setting_value !== "null" && data.setting_value !== "undefined") {
          localStorage.setItem(key, data.setting_value);
          // Async sync to server to maintain centralized backup
          this.syncSettingToServer(key, data.setting_value);
          return data.setting_value;
        }
      } catch (err) {
        // Silent fallback
      }
    }

    // 2. Try to fetch from central Server API first to ensure real-time synchronization
    try {
      const resp = await fetch("/api/settings");
      if (resp.ok) {
        const result = await resp.json();
        if (result.status === "success" && result.data && result.data[key] !== undefined && result.data[key] !== null && result.data[key] !== "null" && result.data[key] !== "undefined") {
          const val = result.data[key];
          localStorage.setItem(key, val);
          return val;
        }
      }
    } catch (err) {
      // Fallback to local storage if server is unreachable
    }

    // 3. Fallback to LocalStorage
    const localVal = localStorage.getItem(key);
    if (localVal !== null && localVal !== undefined && localVal !== "null" && localVal !== "undefined") {
      return localVal;
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
      // Silent fail
    }

    // B. Save to remote Supabase if connected
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from("portal_settings")
          .upsert({ id: key, setting_value: value }, { onConflict: "id" });

        if (error) {
          this.lastError = error.message;
          return false;
        }
        this.lastError = null;
        return true;
      } catch (err: any) {
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
        // Ignore stats table issues
      }

    } catch (err) {
      // Silent stats fail
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
        // Stats deferred
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

  // Activity feed: Logging searches with robust persistence
  public async logSearchActivity(studentName: string, className: string): Promise<void> {
    const now = new Date().toISOString();
    
    // 1. Supabase Persistence (Primary)
    if (this.supabase) {
      try {
        // Fetch current count for upsert logic
        const { data: existing, error: fetchError } = await this.supabase
          .from("search_activity")
          .select("id, count")
          .eq("student_name", studentName)
          .eq("class_name", className)
          .maybeSingle();

        if (existing) {
          await this.supabase
            .from("search_activity")
            .update({ 
              count: (existing.count || 1) + 1,
              queried_at: now
            })
            .eq("id", existing.id);
        } else {
          await this.supabase.from("search_activity").insert({
            student_name: studentName,
            class_name: className,
            queried_at: now,
            count: 1
          });
        }
      } catch (err) {
        console.warn("Database sync deferred:", err);
      }
    }

    // 2. Local fallback mechanism
    const stored = localStorage.getItem("thcs_recent_activities") || "[]";
    try {
      let activities = JSON.parse(stored) as RecentActivity[];
      const existingIndex = activities.findIndex(a => 
        a.studentName.toLowerCase() === studentName.toLowerCase() && 
        a.className === className
      );

      if (existingIndex !== -1) {
        activities[existingIndex].count = (activities[existingIndex].count || 1) + 1;
        activities[existingIndex].queriedAt = now;
        const existing = activities.splice(existingIndex, 1)[0];
        activities.unshift(existing);
      } else {
        activities.unshift({
          id: Math.random().toString(36).substring(2, 9),
          studentName,
          className,
          queriedAt: now,
          count: 1
        });
      }
      localStorage.setItem("thcs_recent_activities", JSON.stringify(activities.slice(0, 20)));
    } catch {
      // Local recovery
    }
  }

  public async getRecentActivities(): Promise<RecentActivity[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from("search_activity")
          .select("*")
          .order("queried_at", { ascending: false })
          .limit(10);
        
        if (!error && data) {
          return data.map((d: any) => ({
            id: d.id?.toString() || Math.random().toString(),
            studentName: d.student_name || d.studentName || "Học sinh",
            className: d.class_name || d.className || "N/A",
            queriedAt: d.queried_at || d.queriedAt || new Date().toISOString(),
            count: d.count || 1
          }));
        }
      } catch (err) {
        console.error("Error fetching activities:", err);
      }
    }

    // Local fallback
    const stored = localStorage.getItem("thcs_recent_activities") || "[]";
    try {
      return JSON.parse(stored) as RecentActivity[];
    } catch {
      return [];
    }
  }
}

export const dbService = new DatabaseService();
export default dbService;

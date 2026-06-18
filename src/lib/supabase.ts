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

  constructor() {
    this.initialize();
  }

  // Load client dynamically with priority: Saved Config > Env Config
  public initialize() {
    const savedUrl = localStorage.getItem("thcs_supabase_url") || ENV_URL;
    const savedKey = localStorage.getItem("thcs_supabase_key") || ENV_KEY;
    
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

  public saveConfig(url: string, key: string) {
    if (url && key) {
      localStorage.setItem("thcs_supabase_url", url);
      localStorage.setItem("thcs_supabase_key", key);
    } else {
      localStorage.removeItem("thcs_supabase_url");
      localStorage.removeItem("thcs_supabase_key");
    }
    this.initialize();
  }

  // Clear connection details and revert to local fallback
  public disconnect() {
    localStorage.removeItem("thcs_supabase_url");
    localStorage.removeItem("thcs_supabase_key");
    this.supabase = null;
    console.log("Supabase credentials cleared, using local database mode.");
  }

  // Query student records
  public async queryStudent(studentCode: string, dob: string): Promise<Student | null> {
    const formattedCode = studentCode.trim().toUpperCase();
    const cleanDob = dob.trim(); // format: YYYY-MM-DD or DD-MM-YY etc depending on input

    if (this.supabase) {
      try {
        // Query official Supabase DB ('students' table)
        const { data, error } = await this.supabase
          .from("students")
          .select("*")
          .eq("studentCode", formattedCode)
          .single();

        if (error) {
          console.warn("Supabase query failed, falling back to local database search:", error.message);
        } else if (data) {
          // Dates in Vietnamese educational portals are stored as YYYY-MM-DD or simple strings.
          // Let's standardise comparison
          if (this.compareDates(data.dob, cleanDob)) {
            return data as Student;
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
        const { data, error } = await this.supabase
          .from("students")
          .select("*")
          .order("className", { ascending: true })
          .order("fullName", { ascending: true });

        if (!error && data) {
          return data as Student[];
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
        const { error } = await this.supabase
          .from("students")
          .upsert(student, { onConflict: "studentCode" });

        if (error) {
          console.error("Supabase upsert error:", error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.error("Supabase upsert exception:", err);
        return false;
      }
    }
    return true;
  }

  // Delete student
  public async deleteStudent(studentCode: string): Promise<boolean> {
    this.localStudentsList = this.localStudentsList.filter(s => s.studentCode !== studentCode);
    this.saveLocally();

    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from("students")
          .delete()
          .eq("studentCode", studentCode);

        if (error) {
          console.error("Supabase delete failed:", error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.error("Supabase delete exception:", err);
        return false;
      }
    }
    return true;
  }

  // Synchronise mock data to Supabase (helper to write to their remote project)
  public async syncLocalDataToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
    if (!this.supabase) {
      return { success: false, count: 0, error: "Supabase is not connected yet" };
    }

    try {
      let uploadedCount = 0;
      for (const student of this.localStudentsList) {
        const { error } = await this.supabase
          .from("students")
          .upsert(student, { onConflict: "studentCode" });
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
        const { error } = await this.supabase
          .from("students")
          .delete()
          .neq("studentCode", "");

        if (error) {
          console.error("Supabase clear all failed:", error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.error("Supabase clear all exception:", err);
        return false;
      }
    }
    return true;
  }

  // Delete all students of a specific class
  public async deleteStudentsByClass(className: string): Promise<boolean> {
    this.localStudentsList = this.localStudentsList.filter(s => s.className !== className);
    this.saveLocally();

    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from("students")
          .delete()
          .eq("className", className);

        if (error) {
          console.error("Supabase delete by class failed:", error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.error("Supabase delete by class exception:", err);
        return false;
      }
    }
    return true;
  }

  // Load classes from Supabase if possible, otherwise fallback locally
  public async getClasses(): Promise<SchoolClass[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from("portal_classes")
          .select("*")
          .order("className", { ascending: true });

        if (!error && data) {
          return data as SchoolClass[];
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
        const { error } = await this.supabase
          .from("portal_classes")
          .upsert(classes);

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

  // Load a single portal setting
  public async getPortalSetting(key: string, defaultValue: string): Promise<string> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from("portal_settings")
          .select("value")
          .eq("key", key)
          .maybeSingle();

        if (!error && data) {
          return data.value;
        }
      } catch (err) {
        console.warn("Supabase getPortalSetting exception or missing relation:", err);
      }
    }
    return localStorage.getItem(key) || defaultValue;
  }

  // Save portal setting
  public async savePortalSetting(key: string, value: string): Promise<boolean> {
    localStorage.setItem(key, value);

    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from("portal_settings")
          .upsert({ key, value });

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
}

export const dbService = new DatabaseService();
export default dbService;

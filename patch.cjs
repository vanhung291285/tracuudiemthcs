const fs = require('fs');
const file = 'src/lib/supabase.ts';
let code = fs.readFileSync(file, 'utf8');

const oldCode = `  public async clearClassesByYear(academicYear: string): Promise<{success: boolean, error?: string}> {
    if (this.supabase) {
      try {
        // Find if using snake_case or camelCase schema
        await Promise.race([this.checkClassesSchema(), new Promise(r => setTimeout(r, 2000))]);
        
        if (this.isSnakeCaseClasses && !this.hasAcademicYearClasses) {
          return { 
            success: false, 
            error: "Bảng portal_classes chưa có cột academic_year. Vui lòng vào tab Supabase -> Cập nhật CSDL để chạy lệnh ALTER TABLE thêm cột này trước khi thao tác theo năm học."
          };
        }

        let result;
        if (this.isSnakeCaseClasses) {
          result = await Promise.race([
            this.supabase.from("portal_classes").delete().eq("academic_year", academicYear),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout clearing classes by year")), 10000))
          ]);
        } else {
          result = await Promise.race([
            this.supabase.from("portal_classes").delete().eq("academicYear", academicYear),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout clearing classes by year")), 10000))
          ]);
        }`;

const newCode = `  public async clearClassesByYear(academicYear: string, classIds?: string[]): Promise<{success: boolean, error?: string}> {
    if (this.supabase) {
      try {
        // Find if using snake_case or camelCase schema
        await Promise.race([this.checkClassesSchema(), new Promise(r => setTimeout(r, 2000))]);
        
        let result;
        if (classIds && classIds.length > 0) {
          // Delete by class ID instead of academic year column if IDs are provided
          result = await Promise.race([
            this.supabase.from("portal_classes").delete().in("id", classIds),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout clearing classes by year")), 10000))
          ]);
        } else {
          if (this.isSnakeCaseClasses && !this.hasAcademicYearClasses) {
            return { 
              success: false, 
              error: "Bảng portal_classes chưa có cột academic_year. Vui lòng vào tab Supabase -> Cập nhật CSDL để chạy lệnh ALTER TABLE thêm cột này trước khi thao tác theo năm học."
            };
          }

          if (this.isSnakeCaseClasses) {
            result = await Promise.race([
              this.supabase.from("portal_classes").delete().eq("academic_year", academicYear),
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout clearing classes by year")), 10000))
            ]);
          } else {
            result = await Promise.race([
              this.supabase.from("portal_classes").delete().eq("academicYear", academicYear),
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout clearing classes by year")), 10000))
            ]);
          }
        }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync(file, code);

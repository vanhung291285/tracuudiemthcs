const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

// Replace the old clear logic
const oldClear = `
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
`;

const newClear = `
          if (!this.hasAcademicYearClasses) {
            return { 
              success: false, 
              error: "Bảng portal_classes chưa có cột academic_year. Vui lòng vào tab Supabase -> Cập nhật CSDL để chạy lệnh ALTER TABLE thêm cột này trước khi thao tác theo năm học."
            };
          }

          const yearCol = this.isSnakeCaseYear ? "academic_year" : "academicYear";
          result = await Promise.race([
            this.supabase.from("portal_classes").delete().eq(yearCol, academicYear),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout clearing classes by year")), 10000))
          ]);
`;

if (content.includes(oldClear.trim().substring(0, 50))) {
  // It's hard to match exact whitespaces, let's use string operations or regex
}

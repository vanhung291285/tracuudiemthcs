const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const regex = /if \(this\.isSnakeCaseClasses && !this\.hasAcademicYearClasses\) \{[\s\S]*?\}\s*if \(this\.isSnakeCaseClasses\) \{[\s\S]*?\} else \{[\s\S]*?\}/g;

const newClear = `if (!this.hasAcademicYearClasses) {
            return { 
              success: false, 
              error: "Bảng portal_classes chưa có cột academic_year. Vui lòng vào tab Supabase -> Cập nhật CSDL để chạy lệnh ALTER TABLE thêm cột này trước khi thao tác theo năm học."
            };
          }

          const yearCol = this.isSnakeCaseYear ? "academic_year" : "academicYear";
          result = await Promise.race([
            this.supabase.from("portal_classes").delete().eq(yearCol, academicYear),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout clearing classes by year")), 10000))
          ]);`;

content = content.replace(regex, newClear);
fs.writeFileSync('src/lib/supabase.ts', content);
console.log("Patched clearClassesByYear");

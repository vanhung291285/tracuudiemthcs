const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const anchor = `.upsert(mapped, { onConflict: this.isSnakeCaseSchema ? "student_code" : "studentCode" });`;
const replacement = `.upsert(mapped, { 
              onConflict: this.isSnakeCaseSchema 
                ? (this.hasAcademicYearColumn ? "student_code,academic_year" : "student_code") 
                : (this.hasAcademicYearColumn ? "studentCode,academicYear" : "studentCode") 
            });`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/lib/supabase.ts', content);
    console.log("Patched syncWork onConflict");
} else {
    console.log("Anchor not found in syncWork");
}

const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const anchor = `        const onConflictCols = this.isSnakeCaseSchema 
          ? (this.hasAcademicYearColumn ? ["student_code", "academic_year"] : ["student_code"]) 
          : (this.hasAcademicYearColumn ? ["studentCode", "academicYear"] : ["studentCode"]);`;

const replacement = `        // Force using 'id' for onConflict if available to prevent silent overwrites of previous academic years.
        // If the DB has a legacy unique constraint on student_code, this will throw an error,
        // which is better than silently deleting data. The user will be prompted to upgrade their schema.
        let onConflictCols = [];
        if (this.hasIdColumn) {
          onConflictCols = ["id"];
        } else {
          onConflictCols = this.isSnakeCaseSchema 
            ? (this.hasAcademicYearColumn ? ["student_code", "academic_year"] : ["student_code"]) 
            : (this.hasAcademicYearColumn ? ["studentCode", "academicYear"] : ["studentCode"]);
        }`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/lib/supabase.ts', content);
    console.log("Patched upsertStudent in supabase.ts");
} else {
    console.log("Anchor not found in supabase.ts");
}

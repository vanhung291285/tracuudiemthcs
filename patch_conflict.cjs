const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const anchor = `        let onConflictCols = [];
        if (this.hasIdColumn) {
          onConflictCols = ["id"];
        } else {
          onConflictCols = this.isSnakeCaseSchema 
            ? (this.hasAcademicYearColumn ? ["student_code", "academic_year"] : ["student_code"]) 
            : (this.hasAcademicYearColumn ? ["studentCode", "academicYear"] : ["studentCode"]);
        }`;
        
const replacement = `        let onConflictCols = [];
        // Do not use 'id' as onConflict because in upgraded schemas it lacks a UNIQUE constraint, 
        // causing 'no unique or exclusion constraint' errors.
        onConflictCols = this.isSnakeCaseSchema 
          ? (this.hasAcademicYearColumn ? ["student_code", "academic_year"] : ["student_code"]) 
          : (this.hasAcademicYearColumn ? ["studentCode", "academicYear"] : ["studentCode"]);`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/lib/supabase.ts', content);
    console.log("Patched upsertStudent onConflict logic");
} else {
    console.log("Anchor not found in upsertStudent");
}

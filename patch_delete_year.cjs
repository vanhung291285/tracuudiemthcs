const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const newMethod = `
  // Delete all students of a specific year
  public async deleteStudentsByYear(academicYear: string): Promise<boolean> {
    this.localStudentsList = this.localStudentsList.filter(s => s.academicYear !== academicYear);
    this.saveLocally();

    if (this.supabase) {
      try {
        await this.checkSchemaCase();
        
        let query = this.supabase.from("students").delete();
        if (this.isSnakeCaseSchema && this.hasAcademicYearColumn) {
          query = query.eq("academic_year", academicYear);
        } else if (this.hasAcademicYearColumn) {
          query = query.eq("academicYear", academicYear);
        } else {
           return true; // No academic year column means we can't filter safely
        }
        
        const { error } = await query;
        if (error) {
          console.error("Supabase delete students by year error:", error);
          return false;
        }
        return true;
      } catch (err) {
        console.error("Supabase delete students by year exception:", err);
        return false;
      }
    }
    return true;
  }
`;

if (!content.includes('deleteStudentsByYear')) {
    content = content.replace('// Delete all students of a specific class', newMethod + '\n  // Delete all students of a specific class');
    fs.writeFileSync('src/lib/supabase.ts', content);
    console.log("Added deleteStudentsByYear to supabase.ts");
}

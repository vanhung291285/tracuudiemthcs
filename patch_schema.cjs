const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const oldCheck = `
      if (this.isSnakeCaseClasses) {
        const { error: yearError } = await this.supabase
          .from("portal_classes")
          .select("academic_year")
          .limit(1);
        this.hasAcademicYearClasses = !(yearError && (yearError.code === 'PGRST204' || yearError.code === '42703'));
      } else {
        const { error: yearError } = await this.supabase
          .from("portal_classes")
          .select("academicYear")
          .limit(1);
        this.hasAcademicYearClasses = !(yearError && (yearError.code === 'PGRST204' || yearError.code === '42703'));
      }
`;

const newCheck = `
      // Always check for both academic_year and academicYear to be safe
      const { error: yearErrorSnake } = await this.supabase.from("portal_classes").select("academic_year").limit(1);
      const hasSnakeYear = !(yearErrorSnake && (yearErrorSnake.code === 'PGRST204' || yearErrorSnake.code === '42703'));
      
      const { error: yearErrorCamel } = await this.supabase.from("portal_classes").select("academicYear").limit(1);
      const hasCamelYear = !(yearErrorCamel && (yearErrorCamel.code === 'PGRST204' || yearErrorCamel.code === '42703'));
      
      this.hasAcademicYearClasses = hasSnakeYear || hasCamelYear;
      this.isSnakeCaseYear = hasSnakeYear;
`;

content = content.replace(oldCheck, newCheck);
fs.writeFileSync('src/lib/supabase.ts', content);
console.log("Patched schema check");

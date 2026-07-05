const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

// Add property
content = content.replace(
  'public hasAcademicYearClasses: boolean = false;',
  'public hasAcademicYearClasses: boolean = false;\n  public isSnakeCaseYear: boolean = false;'
);

// Fix saveClasses
content = content.replace(
  '            if (this.hasAcademicYearClasses) {\n              obj.academic_year = c.academicYear;\n            }',
  '            if (this.hasAcademicYearClasses) {\n              if (this.isSnakeCaseYear) obj.academic_year = c.academicYear;\n              else obj.academicYear = c.academicYear;\n            }'
);

content = content.replace(
  '            if (this.hasAcademicYearClasses) {\n              obj.academicYear = c.academicYear;\n            }',
  '            if (this.hasAcademicYearClasses) {\n              if (this.isSnakeCaseYear) obj.academic_year = c.academicYear;\n              else obj.academicYear = c.academicYear;\n            }'
);

fs.writeFileSync('src/lib/supabase.ts', content);
console.log("Fixed year casing");

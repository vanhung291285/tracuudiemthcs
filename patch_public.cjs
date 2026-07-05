const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');
content = content.replace('private hasAcademicYearColumn = false;', 'public hasAcademicYearColumn = false;');
fs.writeFileSync('src/lib/supabase.ts', content);
console.log("Made hasAcademicYearColumn public");

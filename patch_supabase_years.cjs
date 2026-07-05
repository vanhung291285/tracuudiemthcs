const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');
content = content.replace(
  'if (academicYears.length === 0) return true;',
  'if (years.length === 0) return true;'
);
fs.writeFileSync('src/lib/supabase.ts', content);
console.log("Patched supabase.ts years bug");

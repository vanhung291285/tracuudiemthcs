const fs = require('fs');
const file = 'src/lib/supabase.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/error\.code === 'PGRST204'/g, "(error.code === 'PGRST204' || error.code === '42703')");
code = code.replace(/yearError\.code === 'PGRST204'/g, "(yearError.code === 'PGRST204' || yearError.code === '42703')");

fs.writeFileSync(file, code);

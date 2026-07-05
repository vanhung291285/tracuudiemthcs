const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const anchor = `    if (dbService.supabase && !dbService.hasAcademicYearColumn) {`;
const replacement = `    if (dbService.supabase) {
      await dbService.recheckSchema();
    }
    
    if (dbService.supabase && !dbService.hasAcademicYearColumn) {`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/components/AdminDashboard.tsx', content);
    console.log("Patched recheckSchema in handleApplyImport");
} else {
    console.log("Anchor not found");
}

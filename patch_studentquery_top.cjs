const fs = require('fs');
let content = fs.readFileSync('src/components/StudentQuery.tsx', 'utf-8');

const anchor = `  const fetchTopStudents = async () => {
    try {
      const activeYearName = academicYears.find(y => y.isActive)?.yearName;
      const all = await dbService.getAllStudents(activeYearName);`;

const replacement = `  const fetchTopStudents = async () => {
    try {
      const activeYearName = selectedAcademicYear || academicYears.find(y => y.isActive)?.yearName;
      if (!activeYearName) {
         setTopStudents([]);
         return;
      }
      const all = await dbService.getAllStudents(activeYearName);`;

content = content.replace(anchor, replacement);
fs.writeFileSync('src/components/StudentQuery.tsx', content);
console.log("Patched fetchTopStudents in StudentQuery.tsx");

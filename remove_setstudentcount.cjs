const fs = require('fs');
let content = fs.readFileSync('src/components/StudentQuery.tsx', 'utf-8');

content = content.replace('      setStudentCount(all.length);', '      // removed setStudentCount here, now handled in useEffect for selectedAcademicYear');

fs.writeFileSync('src/components/StudentQuery.tsx', content);
console.log("Removed setStudentCount from fetchTopStudents");

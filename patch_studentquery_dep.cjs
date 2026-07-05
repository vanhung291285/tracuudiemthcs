const fs = require('fs');
let content = fs.readFileSync('src/components/StudentQuery.tsx', 'utf-8');

const anchor = `  useEffect(() => {
    if (academicYears.length > 0) {
      fetchTopStudents();
    }
  }, [academicYears]);`;

const replacement = `  useEffect(() => {
    if (academicYears.length > 0) {
      fetchTopStudents();
    }
  }, [academicYears, selectedAcademicYear]);`;

content = content.replace(anchor, replacement);
fs.writeFileSync('src/components/StudentQuery.tsx', content);
console.log("Patched useEffect deps");

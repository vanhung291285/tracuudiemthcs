const fs = require('fs');
let content = fs.readFileSync('src/components/StudentQuery.tsx', 'utf-8');

// Find the selectedAcademicYear useEffect
const anchor = `  useEffect(() => {
    if (selectedAcademicYear) {
      fetchClassesList(selectedAcademicYear);
    }
  }, [selectedAcademicYear]);`;

const replacement = `  useEffect(() => {
    if (selectedAcademicYear) {
      fetchClassesList(selectedAcademicYear);
      // Fetch student count for the selected academic year
      dbService.getAllStudents(selectedAcademicYear).then(students => {
        setStudentCount(students.length);
      }).catch(() => {
        setStudentCount(0);
      });
    } else {
      setStudentCount(0);
    }
  }, [selectedAcademicYear]);`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/components/StudentQuery.tsx', content);
    console.log("Patched count update in StudentQuery.tsx");
} else {
    console.log("Anchor not found in StudentQuery.tsx");
}

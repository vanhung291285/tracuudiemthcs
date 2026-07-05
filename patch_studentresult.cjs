const fs = require('fs');
let content = fs.readFileSync('src/components/StudentResult.tsx', 'utf-8');

const anchor = `  // Behavior Grade
  let activeBehaviorGrade = term === "hk1" ? student.behaviorGradeHK1 : term === "hk2" ? student.behaviorGradeHK2 : student.behaviorGrade;
  if (!activeBehaviorGrade) {
    activeBehaviorGrade = hasDataForTerm ? (student.behaviorGrade || "Tốt") : "";
  }`;

const replacement = anchor + `

  // If calculating for the whole year (canam), ensure they actually have Semester 2 data
  const hasSemester2Data = (student.subjects || []).some(s => s.semester2 !== undefined && s.semester2 !== null && s.semester2 !== "");
  if (term === "canam" && !hasSemester2Data) {
    activeAcademicGrade = "";
    activeBehaviorGrade = "";
  }
`;

content = content.replace(anchor, replacement);
fs.writeFileSync('src/components/StudentResult.tsx', content);
console.log("Patched StudentResult.tsx for canam grades");

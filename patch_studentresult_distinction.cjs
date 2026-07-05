const fs = require('fs');
let content = fs.readFileSync('src/components/StudentResult.tsx', 'utf-8');

const anchor = `      if (activeAcademicGrade && activeBehaviorGrade) {
        d = evaluateDistinctionTT22(activeAcademicGrade as string, activeBehaviorGrade as string, currentScores);
      } else if (!hasDataForTerm) {
        d = "Không";
      }`;

const replacement = `      if (activeAcademicGrade && activeBehaviorGrade) {
        d = evaluateDistinctionTT22(activeAcademicGrade as string, activeBehaviorGrade as string, currentScores);
      } else if (!hasDataForTerm || !hasSemester2Data) {
        d = "Không";
      }`;

content = content.replace(anchor, replacement);
fs.writeFileSync('src/components/StudentResult.tsx', content);
console.log("Patched distinction logic");

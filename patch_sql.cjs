const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// Replace the constraint add logic to first drop the constraint if it exists
content = content.replace(
  /-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_key;\n-- ALTER TABLE students ADD CONSTRAINT students_student_code_year_unique UNIQUE \(student_code, academic_year\);\n-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_class_name_key;\n-- ALTER TABLE portal_classes ADD CONSTRAINT portal_classes_name_year_unique UNIQUE \(class_name, academic_year\);/g,
  \`-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_key;
-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_year_unique;
-- ALTER TABLE students ADD CONSTRAINT students_student_code_year_unique UNIQUE (student_code, academic_year);
-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_class_name_key;
-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique;
-- ALTER TABLE portal_classes ADD CONSTRAINT portal_classes_name_year_unique UNIQUE (class_name, academic_year);\`
);

content = content.replace(
  /-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_studentCode_key;\n-- ALTER TABLE students ADD CONSTRAINT students_studentCode_year_unique UNIQUE \("studentCode", "academicYear"\);\n-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique UNIQUE \("className", "academicYear"\);/g,
  \`-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_studentCode_key;
-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_studentCode_year_unique;
-- ALTER TABLE students ADD CONSTRAINT students_studentCode_year_unique UNIQUE ("studentCode", "academicYear");
-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique;
-- ALTER TABLE portal_classes ADD CONSTRAINT portal_classes_name_year_unique UNIQUE ("className", "academicYear");\`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log("Patched SQL in AdminDashboard.tsx");

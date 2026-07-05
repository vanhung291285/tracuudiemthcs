import re

with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace(
'''-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_key;
-- ALTER TABLE students ADD CONSTRAINT students_student_code_year_unique UNIQUE (student_code, academic_year);
-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_class_name_key;
-- ALTER TABLE portal_classes ADD CONSTRAINT portal_classes_name_year_unique UNIQUE (class_name, academic_year);''',
'''-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_key;
-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_year_unique;
-- ALTER TABLE students ADD CONSTRAINT students_student_code_year_unique UNIQUE (student_code, academic_year);
-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_class_name_key;
-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique;
-- ALTER TABLE portal_classes ADD CONSTRAINT portal_classes_name_year_unique UNIQUE (class_name, academic_year);'''
)

content = content.replace(
'''-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_studentCode_key;
-- ALTER TABLE students ADD CONSTRAINT students_studentCode_year_unique UNIQUE ("studentCode", "academicYear");
-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique UNIQUE ("className", "academicYear");''',
'''-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_studentCode_key;
-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_studentCode_year_unique;
-- ALTER TABLE students ADD CONSTRAINT students_studentCode_year_unique UNIQUE ("studentCode", "academicYear");
-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique;
-- ALTER TABLE portal_classes ADD CONSTRAINT portal_classes_name_year_unique UNIQUE ("className", "academicYear");'''
)

content = content.replace(
'''-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique UNIQUE ("className", "academicYear");''',
'''-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique;
-- ALTER TABLE portal_classes ADD CONSTRAINT portal_classes_name_year_unique UNIQUE ("className", "academicYear");'''
)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)

print("Patched SQL in AdminDashboard.tsx")

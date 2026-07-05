import re

with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

# For Mẫu 1 (Snake Case)
old_snake = """-- 1. NÂNG CẤP BẢNG CŨ (Nếu bạn đã có bảng nhưng thiếu cột, hãy chạy đoạn này)
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS id TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT DEFAULT 'Trường PTDTBT Tiểu Học và THCS Suối Lư';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_grade TEXT DEFAULT 'Tốt';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_grade_hk1 TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_grade_hk2 TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade TEXT DEFAULT 'Tốt';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade_hk1 TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade_hk2 TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade_summer TEXT DEFAULT 'Không';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS days_absent INTEGER DEFAULT 0;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS days_absent_unexcused INTEGER DEFAULT 0;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS distinction TEXT DEFAULT 'Không';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS verification_token TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher TEXT;
-- ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';
-- ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS advisor_name TEXT;
-- ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS room_number TEXT;
-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_key;
-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_year_unique;
-- ALTER TABLE students ADD CONSTRAINT students_student_code_year_unique UNIQUE (student_code, academic_year);
-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_class_name_key;
-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique;
-- ALTER TABLE portal_classes ADD CONSTRAINT portal_classes_name_year_unique UNIQUE (class_name, academic_year);
-- NOTIFY pgrst, 'reload schema';"""

new_snake = """-- 1. NÂNG CẤP BẢNG CŨ (Nếu bạn đã có bảng nhưng thiếu cột, hãy chạy đoạn này)
ALTER TABLE students ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT DEFAULT 'Trường PTDTBT Tiểu Học và THCS Suối Lư';
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_grade TEXT DEFAULT 'Tốt';
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_grade_hk1 TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_grade_hk2 TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade TEXT DEFAULT 'Tốt';
ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade_hk1 TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade_hk2 TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade_summer TEXT DEFAULT 'Không';
ALTER TABLE students ADD COLUMN IF NOT EXISTS days_absent INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS days_absent_unexcused INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS distinction TEXT DEFAULT 'Không';
ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher TEXT;
ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';
ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS advisor_name TEXT;
ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_year_unique;
ALTER TABLE students ADD CONSTRAINT students_student_code_year_unique UNIQUE (student_code, academic_year);
ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_class_name_key;
ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique;
ALTER TABLE portal_classes ADD CONSTRAINT portal_classes_name_year_unique UNIQUE (class_name, academic_year);
NOTIFY pgrst, 'reload schema';"""

# For Mẫu 2 (Camel Case)
old_camel = """-- 1. NÂNG CẤP BẢNG CŨ (Nếu bạn đã có bảng nhưng thiếu cột, hãy chạy đoạn này)
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS id TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT DEFAULT 'Trường PTDTBT Tiểu Học và THCS Suối Lư';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicYear" TEXT DEFAULT '2025-2026';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicGrade" TEXT DEFAULT 'Tốt';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicGradeHK1" TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicGradeHK2" TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGrade" TEXT DEFAULT 'Tốt';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGradeHK1" TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGradeHK2" TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGradeSummer" TEXT DEFAULT 'Không';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "daysAbsent" INTEGER DEFAULT 0;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "daysAbsentUnexcused" INTEGER DEFAULT 0;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS distinction TEXT DEFAULT 'Không';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher TEXT;
-- ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS "academicYear" TEXT DEFAULT '2025-2026';
-- ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS "advisorName" TEXT;
-- ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS "roomNumber" TEXT;
-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_studentCode_key;
-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_studentCode_year_unique;
-- ALTER TABLE students ADD CONSTRAINT students_studentCode_year_unique UNIQUE ("studentCode", "academicYear");
-- ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique;
-- ALTER TABLE portal_classes ADD CONSTRAINT portal_classes_name_year_unique UNIQUE ("className", "academicYear");
-- NOTIFY pgrst, 'reload schema';"""

new_camel = """-- 1. NÂNG CẤP BẢNG CŨ (Nếu bạn đã có bảng nhưng thiếu cột, hãy chạy đoạn này)
ALTER TABLE students ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT DEFAULT 'Trường PTDTBT Tiểu Học và THCS Suối Lư';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicYear" TEXT DEFAULT '2025-2026';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicGrade" TEXT DEFAULT 'Tốt';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicGradeHK1" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicGradeHK2" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGrade" TEXT DEFAULT 'Tốt';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGradeHK1" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGradeHK2" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGradeSummer" TEXT DEFAULT 'Không';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "daysAbsent" INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "daysAbsentUnexcused" INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS distinction TEXT DEFAULT 'Không';
ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher TEXT;
ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS "academicYear" TEXT DEFAULT '2025-2026';
ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS "advisorName" TEXT;
ALTER TABLE portal_classes ADD COLUMN IF NOT EXISTS "roomNumber" TEXT;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_studentCode_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_studentCode_year_unique;
ALTER TABLE students ADD CONSTRAINT students_studentCode_year_unique UNIQUE ("studentCode", "academicYear");
ALTER TABLE portal_classes DROP CONSTRAINT IF EXISTS portal_classes_name_year_unique;
ALTER TABLE portal_classes ADD CONSTRAINT portal_classes_name_year_unique UNIQUE ("className", "academicYear");
NOTIFY pgrst, 'reload schema';"""


if old_snake in content:
    content = content.replace(old_snake, new_snake)
    print("Patched Mẫu 1 (Snake case)")
else:
    print("Mẫu 1 not found")

if old_camel in content:
    content = content.replace(old_camel, new_camel)
    print("Patched Mẫu 2 (Camel case)")
else:
    print("Mẫu 2 not found")
    
with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)


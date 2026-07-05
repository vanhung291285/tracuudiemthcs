import re

with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

# Pattern for ALTER TABLE in Mẫu 1
content = content.replace(
"ALTER TABLE students ADD COLUMN IF NOT EXISTS days_absent_unexcused INTEGER DEFAULT 0;",
"""ALTER TABLE students ADD COLUMN IF NOT EXISTS days_absent_unexcused INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS skipped_periods INTEGER DEFAULT 0;"""
)

# Pattern for CREATE TABLE in Mẫu 1
content = content.replace(
"  days_absent_unexcused INTEGER NOT NULL,",
"""  days_absent_unexcused INTEGER NOT NULL,
  skipped_periods INTEGER DEFAULT 0,"""
)


# Pattern for ALTER TABLE in Mẫu 2
content = content.replace(
"ALTER TABLE students ADD COLUMN IF NOT EXISTS \"daysAbsentUnexcused\" INTEGER DEFAULT 0;",
"""ALTER TABLE students ADD COLUMN IF NOT EXISTS "daysAbsentUnexcused" INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "skippedPeriods" INTEGER DEFAULT 0;"""
)

# Pattern for CREATE TABLE in Mẫu 2
content = content.replace(
"  \"daysAbsentUnexcused\" INTEGER NOT NULL,",
"""  "daysAbsentUnexcused" INTEGER NOT NULL,
  "skippedPeriods" INTEGER DEFAULT 0,"""
)


with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)

print("Patched skipped_periods SQL in AdminDashboard.tsx")

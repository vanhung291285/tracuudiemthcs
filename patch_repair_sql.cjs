const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const anchor = `ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';`;
const replacement = `ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';
-- NẾU HỌC SINH NĂM CŨ BỊ ĐỔI THÀNH 2025-2026, CHẠY LỆNH NÀY ĐỂ KHÔI PHỤC:
-- UPDATE students SET academic_year = subjects->>'academicYear' WHERE subjects->>'academicYear' IS NOT NULL AND subjects->>'academicYear' != '';
-- UPDATE portal_classes SET academic_year = '2024-2025' WHERE class_name = 'Tên Lớp Cũ'; -- (Tự chỉnh sửa nếu cần)`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/components/AdminDashboard.tsx', content);
    console.log("Patched repair sql");
} else {
    console.log("Anchor not found for repair sql");
}

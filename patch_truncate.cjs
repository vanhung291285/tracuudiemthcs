const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// For Mẫu 1 (Snake Case)
let anchor = `-- 0. DỌN DẸP DỮ LIỆU (Chạy nếu bạn muốn bắt đầu lại từ đầu hoặc sửa lỗi trùng lặp)
-- TRUNCATE students; -- Xóa sạch toàn bộ học sinh
-- TRUNCATE portal_classes; -- Xóa sạch toàn bộ lớp học`;

let replacement = `-- 0. DỌN DẸP DỮ LIỆU (XÓA BẢN GHI TRÙNG LẶP NẾU CÓ - CHẠY 2 LỆNH DELETE DƯỚI ĐÂY)
-- LƯU Ý: KHÔNG DÙNG LỆNH TRUNCATE NỮA ĐỂ TRÁNH XÓA NHẦM HẾT DỮ LIỆU!`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    // Replace it twice since there are two places (snake and camel)
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/components/AdminDashboard.tsx', content);
    console.log("Patched truncate warnings");
} else {
    console.log("Anchor not found for truncate warning");
}

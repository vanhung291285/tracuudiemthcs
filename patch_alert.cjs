const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const anchor = `👉 CÁCH SỬA: Bạn hãy vào tab 'Supabase & Database' trong Cài đặt, COPY đoạn mã ở phần "1. NÂNG CẤP BẢNG CŨ" và CHẠY trên SQL Editor của Supabase`;
const replacement = `👉 CÁCH SỬA: Bạn hãy vào tab 'Supabase & Database' trong Cài đặt, COPY đoạn mã ở phần "1. NÂNG CẤP BẢNG CŨ" (Lưu ý: Bấm chọn "Mẫu 1: Snake Case") và CHẠY trên SQL Editor của Supabase`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/components/AdminDashboard.tsx', content);
    console.log("Patched alert in AdminDashboard.tsx");
} else {
    console.log("Anchor not found in AdminDashboard.tsx");
}

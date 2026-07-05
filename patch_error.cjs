const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const anchor = `      if (errorMsgText.includes("column") || errorMsgText.includes("schema cache")) {
        let missingCol = "";
        if (errorMsgText.includes("'id'")) missingCol = "(cột 'id')";
        else if (errorMsgText.includes("'academic_grade'")) missingCol = "(cột 'academic_grade')";
        
        specificTip = \`Hệ thống phát hiện Cấu trúc bảng Students của bạn đã CŨ hoặc thiếu cột \${missingCol}. \\n\\n👉 CÁCH SỬA: Bạn hãy vào tab 'Supabase & Database' trong Cài đặt, COPY đoạn mã ở phần "0. NÂNG CẤP BẢNG CŨ" và CHẠY trên SQL Editor của Supabase để cập nhật các cột còn thiếu, sau đó thử nhập lại.\`;
      }`;

const replacement = `      if (errorMsgText.includes("column") || errorMsgText.includes("schema cache") || errorMsgText.includes("duplicate key") || errorMsgText.includes("unique constraint")) {
        let missingCol = "";
        if (errorMsgText.includes("'id'")) missingCol = "(cột 'id')";
        else if (errorMsgText.includes("'academic_grade'")) missingCol = "(cột 'academic_grade')";
        
        specificTip = \`Hệ thống phát hiện Cấu trúc bảng Students của bạn đã CŨ (không hỗ trợ nhiều niên khóa hoặc thiếu cột \${missingCol}). \\n\\n👉 CÁCH SỬA: Bạn hãy vào tab 'Supabase & Database' trong Cài đặt, COPY đoạn mã ở phần "1. NÂNG CẤP BẢNG CŨ" và CHẠY trên SQL Editor của Supabase để cập nhật Cấu trúc bảng, sau đó thử nhập lại.\`;
      }`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/components/AdminDashboard.tsx', content);
    console.log("Patched error message in AdminDashboard.tsx");
} else {
    console.log("Anchor not found in AdminDashboard.tsx");
}

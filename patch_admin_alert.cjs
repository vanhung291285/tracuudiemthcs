const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const anchor = `    if (dbService.supabase && !dbService.hasAcademicYearColumn) {
      alert("⚠️ CẢNH BÁO QUAN TRỌNG: Cấu trúc cơ sở dữ liệu Supabase của bạn đã CŨ (không hỗ trợ nhiều niên khóa).\\n\\nNếu tiếp tục nhập dữ liệu cho năm học mới, hệ thống sẽ GHI ĐÈ và làm MẤT TOÀN BỘ danh sách học sinh của năm học cũ!\\n\\n👉 CÁCH KHẮC PHỤC: Bạn hãy vào tab 'Cài đặt' -> 'Supabase & Database' -> copy đoạn mã '1. NÂNG CẤP BẢNG CŨ' và chạy trong mục SQL Editor của Supabase để cập nhật Cấu trúc bảng. Sau đó mới quay lại đây nhập danh sách.");
      return;
    }`;
        
const replacement = `    if (dbService.supabase && !dbService.hasAcademicYearColumn) {
      const proceed = window.confirm("⚠️ CẢNH BÁO: Cấu trúc CSDL của bạn có vẻ đã CŨ hoặc Supabase chưa cập nhật bộ nhớ đệm (schema cache).\\n\\nNếu bạn chưa chạy mã SQL nâng cấp, việc tiếp tục có thể GHI ĐÈ dữ liệu học sinh năm cũ.\\n\\nNếu bạn VỪA MỚI chạy SQL nâng cấp, hãy bấm OK để tiếp tục thử (nếu lỗi, hệ thống sẽ báo chi tiết).\\n\\nBấm 'OK' để tiếp tục hoặc 'Cancel' để hủy.");
      if (!proceed) return;
    }`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/components/AdminDashboard.tsx', content);
    console.log("Patched admin alert");
} else {
    console.log("Anchor not found in admin alert");
}

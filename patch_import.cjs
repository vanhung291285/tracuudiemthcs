const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const anchor = `  const handleApplyImport = async () => {
    if (importPreview.length === 0) return;
    setAuthIsLoading(true);
    let successfullySaved = 0;`;

const replacement = `  const handleApplyImport = async () => {
    if (importPreview.length === 0) return;

    if (dbService.supabase && !dbService.hasAcademicYearColumn) {
      alert("⚠️ CẢNH BÁO QUAN TRỌNG: Cấu trúc cơ sở dữ liệu Supabase của bạn đã CŨ (không hỗ trợ nhiều niên khóa).\n\nNếu tiếp tục nhập dữ liệu cho năm học mới, hệ thống sẽ GHI ĐÈ và làm MẤT TOÀN BỘ danh sách học sinh của năm học cũ!\n\n👉 CÁCH KHẮC PHỤC: Bạn hãy vào tab 'Cài đặt' -> 'Supabase & Database' -> copy đoạn mã '1. NÂNG CẤP BẢNG CŨ' và chạy trong mục SQL Editor của Supabase để cập nhật Cấu trúc bảng. Sau đó mới quay lại đây nhập danh sách.");
      return;
    }

    setAuthIsLoading(true);
    let successfullySaved = 0;`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/components/AdminDashboard.tsx', content);
    console.log("Patched handleApplyImport in AdminDashboard.tsx");
} else {
    console.log("Anchor not found in AdminDashboard.tsx");
}

const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// Replace actual newlines inside the alert string with \n
const badStringStart = `alert("⚠️ CẢNH BÁO QUAN TRỌNG:`;
const badStringEnd = `cập nhật Cấu trúc bảng. Sau đó mới quay lại đây nhập danh sách.");`;

let startIdx = content.indexOf(badStringStart);
if (startIdx !== -1) {
    let endIdx = content.indexOf(badStringEnd, startIdx) + badStringEnd.length;
    let block = content.substring(startIdx, endIdx);
    // Replace actual newlines in this block with \\n so they become \n in the JS code
    let fixedBlock = block.replace(/\n/g, '\\n');
    content = content.substring(0, startIdx) + fixedBlock + content.substring(endIdx);
    fs.writeFileSync('src/components/AdminDashboard.tsx', content);
    console.log("Fixed syntax error");
}

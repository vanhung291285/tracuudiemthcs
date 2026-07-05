const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const anchor = `        if (result.error) {
          console.error("Supabase upsert error:", result.error.message);
          this.lastError = result.error.message;
          return false;
        }`;
        
const replacement = `        if (result.error) {
          console.error("Supabase upsert error:", result.error.message);
          if (result.error.message.includes("no unique or exclusion constraint")) {
              this.lastError = "LỖI BỘ NHỚ ĐỆM: Bảng của bạn đã được nâng cấp nhưng Supabase chưa nhận diện được. Hãy vào SQL Editor chạy lệnh: NOTIFY pgrst, 'reload schema'; rồi tải lại trang.";
          } else {
              this.lastError = result.error.message;
          }
          return false;
        }`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/lib/supabase.ts', content);
    console.log("Patched upsert error handling");
} else {
    console.log("Anchor not found in upsert error handling");
}

const fs = require('fs');
let content = fs.readFileSync('src/components/StudentQuery.tsx', 'utf-8');

const anchor = `              <div className="flex flex-col gap-5">
                {/* Step 1 */}
                <div className="flex items-start gap-4 p-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#337819] flex items-center justify-center text-white font-black text-base shadow-sm">1</div>
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-black uppercase text-[#337819] tracking-tight">CHỌN NĂM HỌC</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Chọn năm học tương ứng với kết quả bạn muốn xem.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4 p-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#337819] flex items-center justify-center text-white font-black text-base shadow-sm">2</div>
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-black uppercase text-[#337819] tracking-tight">NHẬP HỌ TÊN</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Nhập họ và tên đầy đủ, chính xác của học sinh cần tra cứu.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4 p-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#337819] flex items-center justify-center text-white font-black text-base shadow-sm">3</div>
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-black uppercase text-[#337819] tracking-tight">CHỌN LỚP HỌC</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Chọn hoặc nhập đúng lớp của học sinh (Ví dụ: Lớp 9A1).</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start gap-4 p-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E53935] flex items-center justify-center text-white font-black text-base shadow-sm">4</div>
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-black uppercase text-[#E53935] tracking-tight">TRA CỨU KẾT QUẢ</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Nhấn nút tra cứu để xem chi tiết bảng điểm thành phần môn học và kết quả rèn luyện.</p>
                  </div>
                </div>
              </div>`;

const replacement = `              <div className="flex flex-col gap-5">
                {/* Step 1 */}
                <div className="flex items-start gap-4 p-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#337819] flex items-center justify-center text-white font-black text-base shadow-sm">1</div>
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-black uppercase text-[#337819] tracking-tight">NHẬP HỌ TÊN</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Nhập họ và tên đầy đủ, chính xác của học sinh cần tra cứu.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4 p-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#337819] flex items-center justify-center text-white font-black text-base shadow-sm">2</div>
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-black uppercase text-[#337819] tracking-tight">CHỌN LỚP HỌC</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Chọn hoặc nhập đúng lớp của học sinh (Ví dụ: Lớp 9A1).</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4 p-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#337819] flex items-center justify-center text-white font-black text-base shadow-sm">3</div>
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-black uppercase text-[#337819] tracking-tight">CHỌN NĂM HỌC</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Chọn năm học tương ứng với kết quả bạn muốn xem.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start gap-4 p-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E53935] flex items-center justify-center text-white font-black text-base shadow-sm">4</div>
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-black uppercase text-[#E53935] tracking-tight">TRA CỨU KẾT QUẢ</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Nhấn nút tra cứu để xem chi tiết bảng điểm thành phần môn học và kết quả rèn luyện.</p>
                  </div>
                </div>
              </div>`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/components/StudentQuery.tsx', content);
    console.log("Patched instructions");
} else {
    console.log("Anchor not found in StudentQuery.tsx");
}

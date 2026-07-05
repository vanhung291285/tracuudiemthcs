const fs = require('fs');
let content = fs.readFileSync('src/components/StudentQuery.tsx', 'utf-8');

const anchor = `                {/* Prominent link to Scoreboard mode */}
                <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#337819] flex items-center justify-center text-white">
                      <BarChartHorizontal className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 leading-tight">
                      Bạn muốn xem <span className="text-[#337819]">Bảng điểm toàn trường</span> theo năm học?
                    </div>
                  </div>
                  <button
                    onClick={() => setViewMode("scoreboard")}
                    className="px-3 py-1.5 bg-[#337819] text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition shadow-sm cursor-pointer"
                  >
                    XEM NGAY
                  </button>
                </div>`;

if (content.includes(anchor)) {
    content = content.replace(anchor, '');
    fs.writeFileSync('src/components/StudentQuery.tsx', content);
    console.log("Removed scoreboard link");
} else {
    console.log("Anchor not found");
}

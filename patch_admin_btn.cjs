const fs = require('fs');
let content = fs.readFileSync('src/components/StudentQuery.tsx', 'utf-8');

const anchor = `        {/* Admin Button - Floating in the top right corner */}
        <div className="absolute top-4 right-4 md:top-5 md:right-6 no-print">
          <button 
            onClick={onNavigateToAdmin}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-all px-3 py-1.5 rounded-full border border-white/20 text-[10px] md:text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95"
            title="Quản trị hệ thống"
          >
            <LayoutDashboard className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Quản trị</span>
          </button>
        </div>`;

if (content.includes(anchor)) {
    content = content.replace(anchor, '');
    fs.writeFileSync('src/components/StudentQuery.tsx', content);
    console.log("Removed Admin button");
} else {
    console.log("Anchor not found");
}

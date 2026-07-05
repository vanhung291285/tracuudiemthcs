const fs = require('fs');
const content = fs.readFileSync('src/components/StudentQuery.tsx', 'utf-8');
const searchString = `        {/* View Mode Toggle - Top Left */}
        <div className="absolute top-4 left-4 md:top-5 md:left-6 no-print flex gap-1 bg-white/10 p-1 rounded-full border border-white/20">
          <button 
            onClick={() => setViewMode("search")}
            className={\`px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all cursor-pointer \${viewMode === "search" ? "bg-white text-[#337819] shadow-sm" : "text-white hover:bg-white/10"}\`}
          >
            TRA CỨU
          </button>
          <button 
            onClick={() => setViewMode("scoreboard")}
            className={\`px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all cursor-pointer \${viewMode === "scoreboard" ? "bg-white text-[#337819] shadow-sm" : "text-white hover:bg-white/10"}\`}
          >
            TRA CỨU THEO NĂM HỌC
          </button>
        </div>`;

if (content.includes(searchString)) {
  const newContent = content.replace(searchString, '');
  fs.writeFileSync('src/components/StudentQuery.tsx', newContent);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find the target string.");
}

const fs = require('fs');
let content = fs.readFileSync('src/components/StudentQuery.tsx', 'utf-8');

const anchorYear = `                  {/* Academic Year Selection */}
                  {academicYears.length > 0 && (
                    <div>
                      <label htmlFor="student-year" className="block text-[11px] font-semibold text-slate-900 uppercase mb-1.5 tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#337819]" /> Năm học tra cứu <span className="text-[#E53935]">*</span>
                      </label>
                      <select
                        id="student-year"
                        value={selectedAcademicYear}
                        onChange={(e) => setSelectedAcademicYear(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#337819] focus:bg-white transition cursor-pointer"
                      >
                        {academicYears.map((year, idx) => (
                          <option key={\`year-query-\${year.id && year.id !== "undefined" ? year.id : \`idx-\${idx}\`}\`} value={year.yearName}>
                            {year.yearName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}`;

const anchorClass = `                  {/* Student Class Input */}
                  <div>
                    <label htmlFor="student-class" className="block text-[11px] font-semibold text-slate-900 uppercase mb-1.5 tracking-wider flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-[#337819]" /> Lớp học <span className="text-[#E53935]">*</span>
                    </label>
                    <select
                      id="student-class"
                      value={searchClass}
                      onChange={(e) => setSearchClass(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#337819] focus:bg-white transition cursor-pointer"
                      required
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {availableClasses.length > 0 ? (
                        availableClasses.map((cls, idx) => (
                          <option key={\`cls-\${cls || idx}\`} value={cls}>
                            Lớp {cls}
                          </option>
                        ))
                      ) : (
                        <option disabled value="">Chưa có lớp học cho năm này</option>
                      )}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1.5 pl-1 font-medium italic">
                      Vui lòng chọn đúng lớp của học sinh để tra cứu điểm.
                    </p>
                  </div>`;

if (content.includes(anchorYear) && content.includes(anchorClass)) {
    // Replace the combined block
    const oldBlock = anchorYear + '\\n' + anchorClass;
    const newBlock = anchorClass + '\\n' + anchorYear;
    
    // Sometimes there are extra spaces/newlines between them.
    // Let's replace by finding the index.
    const parts = content.split(anchorYear);
    if (parts.length === 2) {
      const parts2 = parts[1].split(anchorClass);
      if (parts2.length === 2) {
        // parts[0] + anchorYear + parts2[0] + anchorClass + parts2[1]
        const finalContent = parts[0] + anchorClass + parts2[0] + anchorYear + parts2[1];
        fs.writeFileSync('src/components/StudentQuery.tsx', finalContent);
        console.log("Successfully swapped Class and Year");
      }
    } else {
        console.log("Could not split by Year");
    }
} else {
  console.log("Anchors not found!");
}

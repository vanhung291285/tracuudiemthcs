/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Search, 
  GraduationCap, 
  Calendar, 
  User, 
  Users,
  HelpCircle, 
  Key, 
  Info, 
  Award, 
  ShieldCheck, 
  Clock, 
  Bell, 
  LayoutDashboard, 
  ChevronRight, 
  CheckSquare,
  RefreshCw,
  ExternalLink,
  Zap,
  Filter,
  CalendarDays,
  BarChartHorizontal
} from "lucide-react";
import dbService from "../lib/supabase";
import { Student } from "../types";

interface StudentQueryProps {
  onQueryResult: (student: Student, term: "hk1" | "hk2" | "canam") => void;
  onNavigateToAdmin: () => void;
}

export default function StudentQuery({ onQueryResult, onNavigateToAdmin }: StudentQueryProps) {
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<"hk1" | "hk2" | "canam">("canam");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Search config features
  const [searchByCccd, setSearchByCccd] = useState(true);
  const [searchByName, setSearchByName] = useState(true);
  const [searchMode, setSearchMode] = useState<"cccd" | "name">("name");

  // States for automatically updated News Board harvested from suoilu.db.edu.vn
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsSource, setNewsSource] = useState("Hệ thống");

  const [topStudents, setTopStudents] = useState<Student[]>([]);
  const [multipleMatches, setMultipleMatches] = useState<Student[]>([]);
  const [studentCount, setStudentCount] = useState<number>(0);

  useEffect(() => {
    let active = true;

    const fetchStudentCount = async () => {
      try {
        const count = await dbService.getStudentCount();
        if (active) setStudentCount(count);
      } catch (err) {
        // Silent skip
      }
    };
    
    const fetchNews = async () => {
      try {
        const response = await fetch("/api/news");
        if (!response.ok) throw new Error("Server error");
        const result = await response.json();
        if (active && result && result.data) {
          setNewsItems(result.data);
          setNewsSource(result.source === "scraped" ? "suoilu.db.edu.vn (Trực tuyến)" : "Hệ thống");
        }
      } catch (err) {
        // Reduced news loading log severity
        console.log("Automatic news feed loading deferred:", (err as any).message);
      } finally {
        if (active) setNewsLoading(false);
      }
    };

    const fetchTopStudents = async () => {
      try {
        const all = await dbService.getAllStudents();
        const targetStudents = all.filter(s => {
          // Robust score check: counts subjects with actual numeric or valid string evaluations
          const scoredCount = (s.subjects || []).filter(sub => {
            const hasS1 = (typeof sub.semester1 === "number") || (sub.semester1 === "Đạt" || sub.semester1 === "Chưa đạt");
            const hasS2 = (typeof sub.semester2 === "number") || (sub.semester2 === "Đạt" || sub.semester2 === "Chưa đạt");
            const hasAvg = (typeof sub.yearAvg === "number") || (sub.yearAvg === "Đạt" || sub.yearAvg === "Chưa đạt");
            return hasS1 || hasS2 || hasAvg;
          }).length;
          
          const isExempt = scoredCount === 0 && (s.notes?.toLowerCase().includes("khuyết tật") || s.notes?.toLowerCase().includes("miễn"));
          const hasNoScoresAtAll = scoredCount === 0;

          if (isExempt || hasNoScoresAtAll) return false;

          // Only include Xuất sắc and Giỏi as per user request
          return s.distinction === "Học sinh Xuất sắc" || 
                 s.distinction === "Học sinh Giỏi";
        });
        
        targetStudents.sort((a, b) => {
          const rankA = a.distinction === "Học sinh Xuất sắc" ? 1 : 2;
          const rankB = b.distinction === "Học sinh Xuất sắc" ? 1 : 2;
          if (rankA !== rankB) return rankA - rankB;
          return a.fullName.localeCompare(b.fullName, "vi");
        });

        if (active) {
          setTopStudents(targetStudents);
        }
      } catch (err) {
        console.warn("Could not load top students:", err);
      }
    };

    fetchNews();
    fetchTopStudents();
    fetchStudentCount();
    return () => {
      active = false;
    };
  }, []);

  const [headerTop, setHeaderTop] = useState(() => 
    localStorage.getItem("portal_header_top") || "ỦY BAN NHÂN DÂN XÃ XA DUNG • TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ"
  );
  const [headerMain, setHeaderMain] = useState(() => 
    localStorage.getItem("portal_header_main") || "TRA CỨU KẾT QUẢ HỌC TẬP HỌC SINH THCS"
  );
  const [schoolYear, setSchoolYear] = useState(() => 
    localStorage.getItem("portal_school_year") || "NĂM HỌC 2025 - 2026"
  );

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const top = await dbService.getPortalSetting("portal_header_top", "ỦY BAN NHÂN DÂN XÃ XA DUNG • TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ");
        setHeaderTop(top);
        const main = await dbService.getPortalSetting("portal_header_main", "TRA CỨU KẾT QUẢ HỌC TẬP HỌC SINH THCS");
        setHeaderMain(main);
        const year = await dbService.getPortalSetting("portal_school_year", "NĂM HỌC 2025 - 2026");
        setSchoolYear(year);
        
        const isCccdEnabled = await dbService.getPortalSetting("portal_search_cccd", "true");
        const cccdEnabled = isCccdEnabled !== "false";
        setSearchByCccd(cccdEnabled);

        const isNameEnabled = await dbService.getPortalSetting("portal_search_name", "true");
        const nameEnabled = isNameEnabled === "true";
        setSearchByName(nameEnabled);
        
        if (!nameEnabled && cccdEnabled) {
          setSearchMode("cccd");
        } else if (nameEnabled) {
          setSearchMode("name");
        }
      } catch (err) {
        console.warn("Could not load setting config from Supabase:", err);
      }
    };
    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanCode = studentCode.trim().replace(/\s/g, "");
    const cleanName = fullName.trim();
    const cleanDob = dob.trim();

    if (searchMode === "cccd") {
      if (!cleanCode) {
        setError("Vui lòng nhập Số Căn cước công dân (CCCD).");
        return;
      }
      const cccdRegex = /^[0-9]{12}$/;
      if (!cccdRegex.test(cleanCode)) {
        setError("Số Căn cước công dân (CCCD) phải đủ 12 chữ số (chỉ bao gồm các số từ 0-9).");
        return;
      }
    } else {
      if (!cleanName) {
        setError("Vui lòng nhập Họ và tên đầy đủ của học sinh.");
        return;
      }
    }

    if (!cleanDob) {
      setError("Vui lòng nhập Ngày sinh.");
      return;
    }

    // Format D/M/YYYY or DD/M/YYYY or D/MM/YYYY into DD/MM/YYYY
    let queryDob = cleanDob;
    if (queryDob.includes("/")) {
      const parts = queryDob.split("/");
      if (parts.length === 3) {
        queryDob = `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
      }
    }

    // Strict RegEx checking DD/MM/YYYY
    const dobRegex = /^([0-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/[0-9]{4}$/;
    if (!dobRegex.test(queryDob)) {
      setError("Ngày sinh học sinh không hợp lệ. Vui lòng nhập đúng (Ví dụ: 15/05/2011 hoặc 1/5/2011).");
      return;
    }

    setIsLoading(true);
    setMultipleMatches([]);
    
    try {
      let results: Student[] = [];
      if (searchMode === "cccd") {
        const student = await dbService.queryStudent(cleanCode, queryDob);
        if (student) results = [student];
      } else {
        results = await dbService.queryStudentsByName(cleanName, queryDob);
      }

      if (results && results.length > 0) {
        if (results.length === 1) {
          onQueryResult(results[0], selectedTerm);
        } else {
          // Found multiple matches
          setMultipleMatches(results);
        }
      } else {
        if (searchMode === "cccd") {
          setError(
            `Không tìm thấy học sinh phù hợp. Hãy kiểm tra lại chính xác Số CCCD và Ngày sinh (Gợi ý kiểm thử: ${cleanCode} sinh ngày ${cleanDob}).`
          );
        } else {
          setError(
            `Không tìm thấy học sinh phù hợp. Hãy kiểm tra lại chính xác Họ tên và Ngày sinh.`
          );
        }
      }
    } catch (err) {
      setError("Đã xảy ra lỗi hệ thống khi kết nối cơ sở dữ liệu học tập.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMatch = (student: Student) => {
    setMultipleMatches([]);
    onQueryResult(student, selectedTerm);
  };

  const handleFillDemo = (code: string, name: string, date: string) => {
    setStudentCode(code);
    setFullName(name);
    setDob(date);
    setError("");
  };

  return (
    <div className="w-full flex-1 flex flex-col relative" id="student-query-root">
      
      {/* Dynamic Background subtle grid for texture */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.05] no-print" 
           style={{ backgroundImage: 'radial-gradient(#0055A5 0.5px, transparent 0.5px)', backgroundSize: '32px 32px' }}>
      </div>

      {/* Dynamic Background SVG blobs / patterns */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 mix-blend-multiply overflow-hidden no-print">
         <svg className="absolute top-[-5%] left-[-5%] w-[450px] h-[450px] text-slate-200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M44.5,-76.3C58.1,-69.1,70.1,-58.5,78.8,-45.5C87.4,-32.5,92.8,-17.1,92.2,-2.1C91.6,12.9,85.1,27.5,76,40.8C66.9,54.1,55.3,66.1,41.4,73.4C27.5,80.7,11.3,83.2,-4.5,91C-20.2,98.8,-35.4,111.9,-48.3,110.8C-61.2,109.8,-71.7,94.6,-78.9,79.5C-86.2,64.4,-90.1,49.4,-92.3,34.8C-94.5,20.2,-95,5.9,-93.4,-8.2C-91.8,-22.3,-88.2,-36.1,-80.6,-48.4C-73,-60.7,-61.4,-71.4,-48.4,-79.1C-35.4,-86.8,-21.1,-91.4,-6.2,-80.6C8.7,-69.9,23.5,-43.8,44.5,-76.3Z" transform="translate(100 100)" />
         </svg>
      </div>
      
      {/* Main Content Area: Redesigned as an Open Book */}
      <main className="flex-1 max-w-6xl w-full mx-auto pt-8 pb-12 md:pt-12 md:pb-16 px-4">
        
        {/* New Integrated Title Section above the book */}
        <div className="mb-8 md:mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-lg md:text-2xl font-black text-[#E53935] leading-tight tracking-tighter uppercase mb-2">
            {headerMain}
          </h1>
          
          <div className="inline-flex items-center gap-2 bg-[#0055A5]/10 border border-[#0055A5]/20 text-[#0055A5] px-4 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E53935] animate-pulse" />
            {schoolYear}
          </div>

          <p className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-[0.2em] max-w-lg mx-auto">
            {headerTop}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-px w-8 md:w-12 bg-slate-200"></div>
            <div className="w-2 h-2 rounded-full border border-slate-300"></div>
            <div className="h-px w-8 md:w-12 bg-slate-200"></div>
          </div>
        </div>

        <div className="open-book-container relative">
          {/* Visual Book Spine for Desktop */}
          <div className="book-spine hidden lg:block" />

          <div className="grid grid-cols-1 lg:grid-cols-12 w-full">
            
            {/* LEFT PAGE: LOOKUP TOOL & QUICK CANDIDATES (col-span-5) */}
            <div className="lg:col-span-5 book-page book-page-left p-5 sm:p-8 md:p-10 z-10">
              
              {/* Corner Decorations */}
              <div className="page-decoration-corner page-decoration-bottom-left hidden md:block" />

              <div className="space-y-6 md:space-y-8">
                {/* Core Query Inner Section */}
                <div id="card-query" className="w-full relative">
                  <div className="text-center mb-5 md:mb-6">
                    <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-sky-50 mb-2 md:mb-3 border border-sky-100 shadow-inner">
                      <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-[#0055A5]" />
                    </div>
                    <h2 className="text-sm md:text-base font-black text-[#0055A5] uppercase tracking-tight">
                      CỬA SỔ TRA CỨU HỌC TẬP
                    </h2>
                    <p className="text-[10px] md:text-[11px] text-slate-500 font-bold mt-1 italic uppercase tracking-wider">
                      "Khai tri thức - Mở tương lai"
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Search Mode Toggles */}
                    {searchByCccd && searchByName && (
                      <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 mb-6 shadow-inner">
                        <button
                          type="button"
                          onClick={() => setSearchMode("name")}
                          className={`flex-1 py-2.5 text-[10px] md:text-[11px] uppercase font-black tracking-wider rounded-lg transition-all duration-300 cursor-pointer text-center z-10 ${
                            searchMode === "name"
                              ? "bg-[#0055A5] text-white shadow-lg ring-1 ring-[#0055A5]/20"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          TRA CỨU HỌ VÀ TÊN
                        </button>
                        <button
                          type="button"
                          onClick={() => setSearchMode("cccd")}
                          className={`flex-1 py-2.5 text-[10px] md:text-[11px] uppercase font-black tracking-wider rounded-lg transition-all duration-300 cursor-pointer text-center z-10 ${
                            searchMode === "cccd"
                              ? "bg-[#0055A5] text-white shadow-lg ring-1 ring-[#0055A5]/20"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          TRA CỨU QUA CCCD
                        </button>
                      </div>
                    )}

                    {/* Student Identity Input */}
                    {searchMode === "cccd" && searchByCccd ? (
                      <div className="space-y-2">
                        <label htmlFor="student-code" className="block text-[11px] font-black font-sharp-black uppercase tracking-wider flex items-center gap-1.5 ml-1 mb-1.5">
                          <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0055A5]" /> Số CCCD học sinh <span className="text-[#E53935]">*</span>
                        </label>
                        <input
                          type="text"
                          id="student-code"
                          value={studentCode}
                          onChange={(e) => setStudentCode(e.target.value)}
                          placeholder="Nhập 12 số định danh..."
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-sm input-sharp focus:outline-none focus:ring-2 focus:ring-[#0055A5] focus:border-transparent transition shadow-sm"
                          autoComplete="off"
                        />
                      </div>
                    ) : searchByName ? (
                      <div className="space-y-1.5">
                        <label htmlFor="student-name" className="block text-[11px] font-black font-sharp-black uppercase tracking-wider flex items-center gap-1.5 ml-1 mb-1.5">
                          <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0055A5]" /> Họ và Tên đầy đủ <span className="text-[#E53935]">*</span>
                        </label>
                        <input
                          type="text"
                          id="student-name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Văn An..."
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-sm input-sharp focus:outline-none focus:ring-2 focus:ring-[#0055A5] focus:border-transparent transition shadow-sm"
                          autoComplete="off"
                        />
                      </div>
                    ) : null}

                    {/* Date of Birth Input */}
                    <div className="space-y-1.5">
                      <label htmlFor="date-of-birth" className="block text-[11px] font-black font-sharp-black uppercase tracking-wider flex items-center gap-1.5 ml-1 mb-1.5">
                        <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0055A5]" /> Ngày sinh học sinh <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        id="date-of-birth"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        placeholder="Định dạng: DD/MM/YYYY"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 md:px-4 md:py-3 text-sm input-sharp focus:outline-none focus:ring-2 focus:ring-[#0055A5] focus:border-transparent transition shadow-sm"
                        autoComplete="off"
                      />
                    </div>

                    {/* Academic Term Selector */}
                    <div className="space-y-1.5 pt-2">
                      <label className="block text-[11px] font-black font-sharp-black uppercase tracking-wider flex items-center gap-1.5 ml-1 mb-1.5">
                        <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0055A5]" /> CHỌN HỌC KỲ TRA CỨU <span className="text-[#E53935]">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        {((["hk1", "hk2", "canam"] as const)).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSelectedTerm(t)}
                            className={`py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg transition-all duration-300 cursor-pointer text-center ${
                              selectedTerm === t
                                ? "bg-[#0055A5] text-white shadow-md"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {t === "hk1" ? "Kỳ I" : t === "hk2" ? "Kỳ II" : "Cả Năm"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-[11px] font-bold shadow-sm leading-relaxed">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#E53935] hover:bg-red-700 text-white font-black py-4 px-6 rounded-xl uppercase text-sm transition-all duration-300 shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 mt-4"
                    >
                      {isLoading ? (
                         <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Search className="w-5 h-5 stroke-[2.5]" />
                          TRA CỨU KẾT QUẢ
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Statistics Box */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">HỌC SINH SỐ HÓA</div>
                    <div className="text-lg font-black text-[#0055A5]">{studentCount.toLocaleString()}+</div>
                  </div>
                  <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">KẾT XUẤT</div>
                    <div className="text-lg font-black text-[#E53935]">0.1 GIÂY</div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PAGE: SYSTEM OVERVIEW AND INSIGHTS PANEL (col-span-7) */}
            <div className="lg:col-span-7 book-page book-page-right p-5 sm:p-8 md:p-10 flex flex-col gap-6 md:gap-8">
              
              <div className="page-decoration-corner page-decoration-top-right hidden md:block" />

              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b-2 border-amber-400 pb-2 mb-3 md:mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-200">
                    <Award className="w-6 h-6 text-amber-500 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest leading-none">
                      BẢNG VÀNG DANH DỰ
                    </h3>
                    <span className="text-[10px] font-bold text-amber-700/60 uppercase tracking-widest mt-1 block">TƯNG BỪNG KHEN THƯỞNG</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {topStudents.length > 0 ? topStudents.slice(0, 10).map((student, idx) => (
                    <div
                      key={student.id || idx}
                      className={`p-3 bg-white border border-amber-100 rounded-xl flex items-center justify-between group hover:border-amber-400 transition-all duration-300 shadow-sm hover:shadow-md`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-sm border border-amber-100 group-hover:scale-110 transition-transform">
                          {student.distinction === "Học sinh Xuất sắc" ? "👑" : "🎖️"}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight line-clamp-1">{student.fullName}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">
                            Lớp: {student.className}
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-10 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-200" />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100/50 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                   <HelpCircle className="w-12 h-12 text-[#0055A5]" />
                 </div>

                 <h3 className="text-[11px] font-black text-[#0055A5] uppercase tracking-[0.15em] mb-4 border-l-4 border-[#0055A5] pl-3">
                   HƯỚNG DẪN SỬ DỤNG
                 </h3>

                 <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#0055A5] text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                      <p className="text-[10px] text-slate-600 font-bold leading-relaxed">Chọn chế độ tra cứu bằng Họ tên hoặc CCCD.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#0055A5] text-white flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                      <p className="text-[10px] text-slate-600 font-bold leading-relaxed">Nhập đầy đủ thông tin định danh và ngày sinh.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#E53935] text-white flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                      <p className="text-[10px] text-slate-600 font-bold leading-relaxed">Nhấn nút tra cứu để tải dữ liệu học bạ điện tử.</p>
                    </div>
                 </div>
              </div>

              <div className="flex-1 min-h-[180px]">
                 <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                   <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                     <Bell className="w-4 h-4 text-[#E53935] animate-swing origin-top" />
                     THÔNG BÁO NHÀ TRƯỜNG
                   </h3>
                   <span className="text-[8px] bg-red-100 text-[#E53935] px-2 py-0.5 rounded font-black uppercase tracking-widest">LIVE</span>
                 </div>

                 <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                   {newsLoading ? (
                     <div className="animate-pulse space-y-3">{[1,2].map(i=><div key={i} className="h-14 bg-slate-50 rounded-xl"></div>)}</div>
                   ) : newsItems.slice(0, 3).map((item, idx) => (
                     <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition cursor-pointer flex gap-4 items-center group">
                        <div className="w-14 h-14 bg-slate-50 rounded-lg shrink-0 overflow-hidden border border-slate-100">
                          <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-[11px] font-black text-slate-800 line-clamp-2 leading-tight">{item.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">{item.date}</span>
                            <span className="text-[7px] text-[#0055A5] font-black underline uppercase">Xem chi tiết</span>
                          </div>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

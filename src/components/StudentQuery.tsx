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
  ExternalLink
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

  useEffect(() => {
    let active = true;
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
        console.error("Error loading automatic bulletin feed:", err);
      } finally {
        if (active) setNewsLoading(false);
      }
    };

    const fetchTopStudents = async () => {
      try {
        const all = await dbService.getAllStudents();
        const targetStudents = all.filter(s => 
          s.distinction === "Học sinh Xuất sắc" || 
          s.distinction === "Học sinh Giỏi"
        );
        
        targetStudents.sort((a, b) => {
          const rankA = a.distinction === "Học sinh Xuất sắc" ? 1 : 2;
          const rankB = b.distinction === "Học sinh Xuất sắc" ? 1 : 2;
          return rankA - rankB;
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
  const [footerTitle, setFooterTitle] = useState(() =>
    localStorage.getItem("portal_footer_title") || "CỔNG THÔNG TIN ĐIỆN TỬ TRƯỜNG PHỔ THÔNG DÂN TỘC BÁN TRÚ TIỂU HỌC VÀ THCS SUỐI LƯ"
  );
  const [footerDesc, setFooterDesc] = useState(() =>
    localStorage.getItem("portal_footer_desc") || "Hạ tầng quản lý kết quả học tập trực tuyến dành cho toàn thể học sinh Tiểu học và THCS xã Suối Lư. Địa chỉ: Xã Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên."
  );
  const [footerCopy, setFooterCopy] = useState(() =>
    localStorage.getItem("portal_footer_copy") || "© 2026 PTDTBT TH & THCS SUỐI LƯ"
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
        const title = await dbService.getPortalSetting("portal_footer_title", "CỔNG THÔNG TIN ĐIỆN TỬ TRƯỜNG PHỔ THÔNG DÂN TỘC BÁN TRÚ TIỂU HỌC VÀ THCS SUỐI LƯ");
        setFooterTitle(title);
        const desc = await dbService.getPortalSetting("portal_footer_desc", "Hạ tầng quản lý kết quả học tập trực tuyến dành cho toàn thể học sinh Tiểu học và THCS xã Suối Lư. Địa chỉ: Xã Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên.");
        setFooterDesc(desc);
        const copy = await dbService.getPortalSetting("portal_footer_copy", "© 2026 PTDTBT TH & THCS SUỐI LƯ");
        setFooterCopy(copy);
        
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
    <div className="w-full flex-1 flex flex-col justify-between bg-sky-100" id="student-query-root">
      
      {/* Top Banner Navigation Header */}
      <header className="w-full bg-[#0055A5] text-white px-6 py-4 md:py-5 shadow-md shrink-0 relative flex flex-col items-center justify-center text-center">
        <div className="max-w-6xl mx-auto space-y-1.5">
          <div className="flex flex-col items-center">
            <span className="text-[10px] md:text-xs uppercase tracking-[0.15em] font-bold text-slate-100/90 leading-none">
              {headerTop}
            </span>
            <h1 className="text-base md:text-xl font-black mt-1 leading-tight tracking-wide uppercase text-white">
              {headerMain}
            </h1>
          </div>
          <div className="inline-block bg-[#E53935] px-3 py-0.5 rounded font-black text-[9px] md:text-xs uppercase tracking-wider text-white shadow-sm">
            {schoolYear}
          </div>
        </div>


      </header>

      {/* Main Content Area: Side-By-Side Redesigned Portal */}
      <main className="flex-1 max-w-6xl w-full mx-auto py-8 md:py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          
          {/* LEFT SIDE: LOOKUP TOOL & QUICK CANDIDATES (col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Core Query Card */}
            <div id="card-query" className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
              <div className="h-2 bg-[#0055A5]" />
              
              <div className="p-6 md:p-8">
                <h2 className="text-base font-black text-[#0055A5] uppercase text-center mb-1.5 tracking-tight">
                  TRA CỨU KẾT QUẢ HỌC TẬP
                </h2>
                <p className="text-xs text-slate-500 text-center mb-6 font-semibold">
                  Vui lòng điền thông tin định danh học sinh bên dưới để truy xuất học bạ điện tử gốc.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Search Mode Toggles (only show if both are enabled) */}
                  {searchByCccd && searchByName && (
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mb-5 relative">
                      <button
                        type="button"
                        onClick={() => setSearchMode("name")}
                        className={`flex-1 py-2.5 text-[10px] md:text-[11px] uppercase font-black tracking-wider rounded-md transition-all duration-200 cursor-pointer text-center z-10 ${
                          searchMode === "name"
                            ? "bg-white text-[#0055A5] shadow-sm ring-1 ring-slate-200/50"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        TRA CỨU HỌ VÀ TÊN
                      </button>
                      <button
                        type="button"
                        onClick={() => setSearchMode("cccd")}
                        className={`flex-1 py-2.5 text-[10px] md:text-[11px] uppercase font-black tracking-wider rounded-md transition-all duration-200 cursor-pointer text-center z-10 ${
                          searchMode === "cccd"
                            ? "bg-white text-[#0055A5] shadow-sm ring-1 ring-slate-200/50"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        TRA CỨU QUA CCCD
                      </button>
                    </div>
                  )}

                  {/* Student Identity Input */}
                  {searchMode === "cccd" && searchByCccd ? (
                    <div>
                      <label htmlFor="student-code" className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#0055A5]" /> Số Căn cước công dân (12 số) <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        id="student-code"
                        value={studentCode}
                        onChange={(e) => setStudentCode(e.target.value)}
                        placeholder="Nhập đủ 12 số CCCD học sinh (Ví dụ: 037206123456)"
                        className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2.5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0055A5] focus:bg-white transition"
                        autoComplete="off"
                      />
                    </div>
                  ) : searchByName ? (
                    <div>
                      <label htmlFor="student-name" className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#0055A5]" /> Họ và Tên học sinh <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        id="student-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nhập tên học sinh (Ví dụ: Nguyễn Minh Anh)"
                        className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2.5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0055A5] focus:bg-white transition"
                        autoComplete="off"
                      />
                    </div>
                  ) : null}

                  {/* Date of Birth Input */}
                  <div>
                    <label htmlFor="date-of-birth" className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#0055A5]" /> Ngày sinh học sinh <span className="text-[#E53935]">*</span>
                    </label>
                    <input
                      type="text"
                      id="date-of-birth"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="Nhập định dạng: DD/MM/YYYY (Ví dụ: 15/05/2011)"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2.5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0055A5] focus:bg-white transition"
                      autoComplete="off"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 pl-1 font-semibold italic">
                      Thông tin phải trùng khớp tuyệt đối với sổ bộ bản sao gốc.
                    </p>
                  </div>

                  {/* Academic Term Selector tabs */}
                  <div className="space-y-2 mt-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0055A5]" /> KỲ HỌC TẬP TRA CỨU <span className="text-[#E53935]">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSelectedTerm("hk1")}
                        className={`py-2 text-[11px] font-bold rounded-md transition duration-200 cursor-pointer text-center ${
                          selectedTerm === "hk1"
                            ? "bg-[#0055A5] text-white shadow"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                      >
                        Học kỳ I
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTerm("hk2")}
                        className={`py-2 text-[11px] font-bold rounded-md transition duration-200 cursor-pointer text-center ${
                          selectedTerm === "hk2"
                            ? "bg-[#0055A5] text-white shadow"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                      >
                        Học kỳ II
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTerm("canam")}
                        className={`py-2 text-[11px] font-bold rounded-md transition duration-200 cursor-pointer text-center ${
                          selectedTerm === "canam"
                            ? "bg-[#0055A5] text-white shadow"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                      >
                        Cả Năm
                      </button>
                    </div>
                  </div>

                  {/* Error messages display */}
                  {error && (
                    <div className="p-3.5 bg-rose-50 border-l-4 border-[#E53935] text-rose-800 rounded text-xs leading-relaxed font-bold">
                      {error}
                    </div>
                  )}

                  {/* Multiple Matches handling */}
                  {multipleMatches.length > 0 && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                      <p className="font-bold text-orange-900 mb-3">
                        Tìm thấy {multipleMatches.length} học sinh trùng khớp. Vui lòng chọn học sinh thuộc lớp của bạn:
                      </p>
                      <div className="flex flex-col gap-2">
                        {multipleMatches.map((student, idx) => (
                          <button
                            key={student.studentCode || idx}
                            type="button"
                            onClick={() => handleSelectMatch(student)}
                            className="bg-white border border-orange-200 hover:border-orange-400 hover:shadow-sm p-3 rounded text-left transition-all cursor-pointer flex justify-between items-center"
                          >
                            <div>
                              <div className="font-black text-slate-800 uppercase text-sm">{student.fullName}</div>
                              <div className="text-xs text-slate-500 font-medium mt-0.5">Sinh ngày: <span className="text-slate-800 font-bold">{student.dob}</span> | Số CCCD: <span className="font-mono text-slate-600">{student.studentCode}</span></div>
                            </div>
                            <div className="bg-[#0055A5] text-white px-3 py-1 rounded font-bold text-xs uppercase shadow-sm">
                              Lớp {student.className}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Submit button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    id="btn-search-student"
                    className="w-full bg-[#E53935] hover:bg-red-700 text-white font-black py-3 px-6 rounded uppercase text-sm transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Đang đối chiếu...
                      </span>
                    ) : (
                      <>
                        <Search className="w-4 h-4 stroke-[3]" />
                        TRA CỨU HỌC BẠ ĐIỆN TỬ
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-200 flex items-start gap-2 text-slate-500 text-xs text-justify">
                  <HelpCircle className="w-4 h-4 text-[#0055A5] shrink-0 mt-0.5" />
                  <div className="leading-normal font-medium">
                    Hệ thống tích hợp Cơ sở dữ liệu quốc gia về học tập bậc THCS. Điểm số được bảo vệ bằng hạ tầng chữ ký số và xác thực QR Code tức thời.
                  </div>
                </div>

              </div>
            </div>

            {/* Sandbox Quick Testing Data panel */}
            <div className="w-full bg-slate-100 border border-slate-250 text-slate-900 p-5 rounded-xl shadow-sm">
              <div className="flex items-center gap-1.5 mb-2 font-black uppercase text-slate-700 tracking-wider text-xs">
                <Info className="w-4 h-4 text-[#0055A5]" />
                <span>HỌC SINH TIÊU BIỂU</span>
              </div>
              <p className="mb-3 leading-relaxed text-slate-500 font-bold uppercase text-[9px] tracking-wide">
                Danh sách học sinh giỏi và xuất sắc:
              </p>
              
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {topStudents.length > 0 ? topStudents.map((student, idx) => {
                  // Determine distinction color styling
                  let badgeColors = "bg-slate-100 text-slate-800 border-slate-200";
                  let bgHover = "hover:bg-slate-50";
                  let label = "Tiêu biểu";
                  if (student.distinction === "Học sinh Xuất sắc") {
                    badgeColors = "bg-emerald-50 text-emerald-800 border-emerald-200";
                    label = "Xuất sắc";
                  } else if (student.distinction === "Học sinh Giỏi") {
                    badgeColors = "bg-blue-50 text-blue-800 border-blue-200";
                    label = "Giỏi";
                  }
                  
                  return (
                    <div
                      key={student.id || idx}
                      className={`w-full p-3 bg-white ${bgHover} transition border border-slate-200 rounded text-left shadow-sm flex justify-between items-center animate-fadeIn`}
                    >
                      <div>
                        <div className="font-black text-[#0055A5] text-[12px] uppercase">{student.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">Lớp: {student.className}</div>
                      </div>
                      <span className={`text-[9px] ${badgeColors} border px-2 py-1 rounded font-black uppercase`}>{label}</span>
                    </div>
                  );
                }) : (
                  <div className="text-center py-4 text-xs text-slate-400 font-medium">Đang tải danh sách...</div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: SYSTEM OVERVIEW AND INSIGHTS PANEL (col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Realtime Statistics Bento Grid */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Stat 1 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">HỌC SINH SỐ HÓA</span>
                  <div className="w-7 h-7 rounded-md bg-[#0055A5]/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#0055A5]" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-[#0055A5] tracking-tight block">18,450+</span>
                  <span className="text-[10px] font-bold text-slate-500 leading-tight">Hồ sơ học bạ điện tử trực tuyến</span>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TRƯỜNG LIÊN KẾT</span>
                  <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center border border-emerald-100">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800 tracking-tight block">48 Trường</span>
                  <span className="text-[10px] font-bold text-slate-500 leading-tight">Đồng bộ dữ liệu điểm THCS</span>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">XÁC MINH SỐ</span>
                  <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center border border-amber-100">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-[#E53935] tracking-tight block">100%</span>
                  <span className="text-[10px] font-bold text-slate-500 leading-tight">Đối chiếu QR và chữ ký số gốc</span>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TỐC ĐỘ PHẢN HỒI</span>
                  <div className="w-7 h-7 rounded-md bg-purple-50 flex items-center justify-center border border-purple-100">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800 tracking-tight block">&lt; 0.3s</span>
                  <span className="text-[10px] font-bold text-slate-500 leading-tight">Kết xuất bảng điểm tức thời</span>
                </div>
              </div>

            </div>

            {/* Quick Three-Step Guideline */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5 border-b pb-2.5 border-slate-100">
                <LayoutDashboard className="w-4.5 h-4.5 text-[#0055A5]" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  HƯỚNG DẪN TRA CỨU HỌC BẠ ĐIỆN TỬ
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-700">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2">
                  <span className="text-xs font-black bg-[#0055A5] text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-[#0055A5]">Nhập Mã HS</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-snug">Điền chính xác mã định danh gồm định dạng chữ và số.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2">
                  <span className="text-xs font-black bg-[#0055A5] text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-[#0055A5]">Nhập Ngày Sinh</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-snug">Khớp định dạng năm-tháng-ngày ghi trên khai sinh gốc.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2">
                  <span className="text-xs font-black bg-[#E53935] text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-[#E53935]">Nhận học bạ</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-snug">Xem bảng điểm chi tiết học kỳ, rèn luyện cùng danh hiệu.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Bulletin / Notifications */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-3 border-slate-100 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-5 h-5 text-[#E53935] shrink-0" />
                    <h3 className="text-sm font-black text-[#0055A5] uppercase tracking-wide leading-none">
                      BẢN TIN MỚI NHẤT CỦA NHÀ TRƯỜNG
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    Tin cập nhật từ trang thông tin điện tử nhà trường (<a href="https://suoilu.db.edu.vn" target="_blank" referrerPolicy="no-referrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-bold">suoilu.db.edu.vn <ExternalLink className="w-2.5 h-2.5" /></a>)
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                  <span className="text-[9px] bg-red-100 text-[#E53935] px-2 py-0.5 rounded font-black uppercase tracking-wider animate-pulse shrink-0">
                    Trực tuyến
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 italic shrink-0" title="Đã đồng bộ tự động từ trang chủ của PTDTBT TH & THCS Suối Lư">
                    Nguồn: {newsSource}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {newsLoading ? (
                  // Pulse Skeleton Loaders for modern list with images
                  <div className="space-y-4 py-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="animate-pulse flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="w-full sm:w-28 h-20 bg-slate-150 rounded-lg shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-slate-100 rounded w-5/6"></div>
                          <div className="h-3 bg-slate-50 rounded w-1/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : newsItems && newsItems.length > 0 ? (
                  newsItems.map((item, idx) => (
                    <a
                      key={item.id || idx}
                      href={item.link || "https://suoilu.db.edu.vn"}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50/70 p-2 -mx-2 rounded-xl transition duration-200 group cursor-pointer"
                    >
                      {/* Left: Beautiful article illustration image */}
                      <div className="w-full sm:w-28 h-20 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-150 relative">
                        <img 
                          src={item.image} 
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            // Smooth fallback on error
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=60";
                          }}
                        />
                        <div className="absolute top-1 left-1">
                          <span className="text-[8px] font-black uppercase tracking-wider bg-[#E53935]/95 text-white px-1.5 py-0.5 rounded leading-none">
                            {idx === 0 ? "Mới nhất" : `Tin #${idx + 1}`}
                          </span>
                        </div>
                      </div>

                      {/* Right: metadata & title details */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-[#0055A5] font-extrabold uppercase bg-[#0055A5]/10 px-1.5 py-0.5 rounded tracking-wide font-sans">
                            {item.category}
                          </span>
                          <span className="text-[9px] font-medium text-slate-300">•</span>
                          <span className="font-mono text-[9px] text-slate-400 font-bold">
                            {item.date}
                          </span>
                        </div>

                        <p className="font-bold text-slate-800 text-xs leading-snug group-hover:text-[#0055A5] transition-colors flex items-start gap-1">
                          <span>{item.title}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 shrink-0 mt-0.5" />
                        </p>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    <p className="text-[11px] font-medium mb-2">Không nạp được bản tin từ nguồn Suối Lư.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewsLoading(true);
                        fetch("/api/news")
                          .then((r) => r.json())
                          .then((res) => {
                            if (res && res.data) {
                              setNewsItems(res.data);
                              setNewsSource(res.source === "scraped" ? "suoilu.db.edu.vn (Trực tuyến)" : "Hệ thống");
                            }
                          })
                          .catch((e) => console.error(e))
                          .finally(() => setNewsLoading(false));
                      }}
                      className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                    >
                      Thử tải lại
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer Vietnamese Government Portal Layout */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 text-center text-xs text-slate-500 text-slate-600 font-medium font-serif">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-bold text-slate-700 uppercase">
            {footerTitle}
          </p>
          <p className="max-w-2xl mx-auto leading-relaxed text-[11px] text-slate-400">
            {footerDesc}
          </p>
          <div className="flex justify-center gap-4 text-[10px] text-slate-400 pt-2 border-t border-slate-200 max-w-sm mx-auto">
            <span>{footerCopy}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

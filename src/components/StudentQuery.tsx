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
  Crown,
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
  BarChartHorizontal,
  BookOpen,
  Lightbulb,
  MessageCircle,
  Facebook,
  Globe,
  School
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import dbService from "../lib/supabase";
import { Student, RecentActivity } from "../types";

interface StudentQueryProps {
  onQueryResult: (student: Student, term: "hk1" | "hk2" | "canam") => void;
  onNavigateToAdmin: () => void;
}

const ZaloIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M12 2C6.477 2 2 6.136 2 11.25c0 3.012 1.583 5.711 4.1 7.378-.124.786-.607 2.195-.732 2.535-.145.41.134.4.284.298.118-.08 1.884-1.285 2.637-1.808.558.129 1.144.197 1.741.197 5.523 0 10-4.136 10-9.25C22 6.136 17.523 2 12 2z"/>
    <path d="M15.5 13.5h-4.31l3.52-4.04c.16-.18.16-.46 0-.64l-.36-.36c-.18-.18-.46-.18-.64 0l-4.5 5.16c-.11.12-.11.3 0 .42l.36.36c.12.12.3.12.42 0l.5-.58h5.01c.25 0 .45-.2.45-.45v-.45c0-.25-.2-.42-.45-.42z" fill="white"/>
  </svg>
);

export default function StudentQuery({ onQueryResult, onNavigateToAdmin }: StudentQueryProps) {
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [searchClass, setSearchClass] = useState("");
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
  const [newsSourceUrl, setNewsSourceUrl] = useState(() => 
    localStorage.getItem("portal_news_source_url") || "https://suoilu.db.edu.vn"
  );

  const [topStudents, setTopStudents] = useState<Student[]>([]);
  const [multipleMatches, setMultipleMatches] = useState<Student[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [studentCount, setStudentCount] = useState<number>(0);

  const toDisplayCase = (str: string) => {
    if (!str) return "Học sinh";
    // Tự động nhận diện nếu tên đã có dấu tiếng việt hoặc đã là Title Case thì giữ nguyên một số phần
    // Ở đây ta dùng regex đơn giản để viết hoa chữ cái đầu mỗi từ
    return str.toLowerCase().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
  };

  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    return d.getDate() === now.getDate() &&
           d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  };

  const fetchRecentActivities = async () => {
    try {
      const activities = await dbService.getRecentActivities();
      if (activities.length === 0) {
        // Provide sample activities with accents if empty
        setRecentActivities([
          { id: 'm1', studentName: "Nguyễn Văn Hùng", className: "9A1", queriedAt: new Date().toISOString(), count: 5 },
          { id: 'm2', studentName: "Phạm Thị Mai Chi", className: "8B2", queriedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), count: 3 },
          { id: 'm3', studentName: "Lê Hoàng Bảo", className: "7C3", queriedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), count: 1 }
        ]);
      } else {
        setRecentActivities(activities);
      }
    } catch (err) { }
  };

  const fetchNews = async (url?: string) => {
    try {
      const targetUrl = url || newsSourceUrl;
      const response = await fetch(`/api/news?source=${encodeURIComponent(targetUrl)}`);
      if (!response.ok) throw new Error("Server error");
      const result = await response.json();
      if (result && result.data && result.data.length > 0) {
        if (result.source === "scraped") {
          // Sync successful scrape back to Supabase/localStorage central settings
          await dbService.savePortalSetting("portal_cached_news", JSON.stringify(result.data));
          setNewsItems(result.data);
          setNewsSource(new URL(targetUrl).hostname);
        } else if (result.source === "fallback_static" || result.status === "fallback") {
          // If server failed and returned fallback, check if we have persistent cached news in DB first
          const savedNewsStr = await dbService.getPortalSetting("portal_cached_news", "");
          if (savedNewsStr) {
            try {
              const savedNews = JSON.parse(savedNewsStr);
              if (Array.isArray(savedNews) && savedNews.length > 0) {
                setNewsItems(savedNews);
                setNewsSource(new URL(targetUrl).hostname);
                return;
              }
            } catch { }
          }
          // If no cached news exists, use the server fallbacks
          setNewsItems(result.data);
          setNewsSource("Hệ thống");
        } else {
          setNewsItems(result.data);
          const isFromWebsite = ["scraped", "cache", "cache_stale"].includes(result.source);
          setNewsSource(isFromWebsite ? new URL(targetUrl).hostname : "Hệ thống");
        }
      }
    } catch (err) {
      console.log("Automatic news feed loading deferred:", (err as any).message);
      // On error, check if we have persistent cached news
      try {
        const savedNewsStr = await dbService.getPortalSetting("portal_cached_news", "");
        if (savedNewsStr) {
          const savedNews = JSON.parse(savedNewsStr);
          if (Array.isArray(savedNews) && savedNews.length > 0) {
            setNewsItems(savedNews);
            setNewsSource(new URL(url || newsSourceUrl).hostname);
          }
        }
      } catch { }
    } finally {
      setNewsLoading(false);
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

      setTopStudents(targetStudents);
      setStudentCount(all.length);
    } catch (err) {
      console.warn("Could not load top students:", err);
    }
  };

  const fetchClassesList = async () => {
    try {
      const clsList = await dbService.getClasses();
      const names = clsList.map(c => c.className).filter(Boolean);
      const uniqueNames = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "vi"));
      setAvailableClasses(uniqueNames);
      if (uniqueNames.length > 0) {
        setSearchClass(uniqueNames[0]);
      }
    } catch (err) {
      console.warn("Could not load classes:", err);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchTopStudents();
    fetchRecentActivities();
    fetchClassesList();
  }, []);

  const [headerTop, setHeaderTop] = useState(() => {
    const val = localStorage.getItem("portal_header_top");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "ỦY BAN NHÂN DÂN XÃ XA DUNG • TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ";
  });
  const [headerMain, setHeaderMain] = useState(() => {
    const val = localStorage.getItem("portal_header_main");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "TRA CỨU KẾT QUẢ HỌC TẬP HỌC SINH THCS";
  });
  const [schoolYear, setSchoolYear] = useState(() => {
    const val = localStorage.getItem("portal_school_year");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "NĂM HỌC 2025 - 2026";
  });
  const [footerTitle, setFooterTitle] = useState("HỆ THỐNG SUỐI LƯ");
  const [footerDesc, setFooterDesc] = useState("Cổng tra cứu kết quả học tập và học bạ điện tử chính thức của **Trường PTDTBT TH & THCS Suối Lư**. Hệ thống cung cấp dữ liệu số hóa chính xác từ sổ bộ gốc của nhà trường, phục vụ học sinh và phụ huynh.");
  const [footerKeywords, setFooterKeywords] = useState("Suối Lư, THCS Suối Lư, Tiểu học Suối Lư, Học bạ điện tử, Tra cứu điểm, Điện Biên");
  const [footerContact, setFooterContact] = useState("• Địa chỉ: Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên\n• Website gốc: https://suoilu.db.edu.vn\n• Bản quyền © 2026 PTDTBT TH & THCS Suối Lư");
  const [zaloUrl, setZaloUrl] = useState("https://zalo.me/0333333333");
  const [facebookUrl, setFacebookUrl] = useState("https://facebook.com/suoilu");
  const [websiteUrl, setWebsiteUrl] = useState("https://suoilu.db.edu.vn");

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const top = await dbService.getPortalSetting("portal_header_top", "ỦY BAN NHÂN DÂN XÃ XA DUNG • TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ");
        setHeaderTop(top);
        const main = await dbService.getPortalSetting("portal_header_main", "TRA CỨU KẾT QUẢ HỌC TẬP HỌC SINH THCS");
        setHeaderMain(main);
        const year = await dbService.getPortalSetting("portal_school_year", "NĂM HỌC 2025 - 2026");
        setSchoolYear(year);

        const fTitle = await dbService.getPortalSetting("portal_footer_title", "HỆ THỐNG SUỐI LƯ");
        setFooterTitle(fTitle);
        const fDesc = await dbService.getPortalSetting("portal_footer_desc", "Cổng tra cứu kết quả học tập và học bạ điện tử chính thức của **Trường PTDTBT TH & THCS Suối Lư**. Hệ thống cung cấp dữ liệu số hóa chính xác từ sổ bộ gốc của nhà trường, phục vụ học sinh và phụ huynh.");
        setFooterDesc(fDesc);
        const fKey = await dbService.getPortalSetting("portal_footer_keywords", "Suối Lư, THCS Suối Lư, Tiểu học Suối Lư, Học bạ điện tử, Tra cứu điểm, Điện Biên");
        setFooterKeywords(fKey);
        const fCon = await dbService.getPortalSetting("portal_footer_contact", "• Địa chỉ: Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên\n• Website gốc: https://suoilu.db.edu.vn\n• Bản quyền © 2026 PTDTBT TH & THCS Suối Lư");
        setFooterContact(fCon);

        const z = await dbService.getPortalSetting("portal_zalo_url", "https://zalo.me/0333333333");
        setZaloUrl(z);
        const f = await dbService.getPortalSetting("portal_facebook_url", "https://facebook.com/suoilu");
        setFacebookUrl(f);
        const w = await dbService.getPortalSetting("portal_website_url", "https://suoilu.db.edu.vn");
        setWebsiteUrl(w);
        
        const isCccdEnabled = await dbService.getPortalSetting("portal_search_cccd", "true");
        const cccdEnabled = isCccdEnabled !== "false";
        setSearchByCccd(cccdEnabled);

        const isNameEnabled = await dbService.getPortalSetting("portal_search_name", "true");
        const nameEnabled = isNameEnabled === "true";
        setSearchByName(nameEnabled);

        const nUrl = await dbService.getPortalSetting("portal_news_source_url", "https://suoilu.db.edu.vn");
        setNewsSourceUrl(nUrl);
        
        // Pre-populate cached news instantly to prevent empty flash
        const cachedNewsStr = await dbService.getPortalSetting("portal_cached_news", "");
        if (cachedNewsStr) {
          try {
            const cached = JSON.parse(cachedNewsStr);
            if (Array.isArray(cached) && cached.length > 0) {
              setNewsItems(cached);
              setNewsSource(new URL(nUrl).hostname);
            }
          } catch { }
        }

        fetchNews(nUrl);
        
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

    const cleanName = fullName.trim().normalize("NFC");
    const cleanClass = searchClass.trim().toUpperCase();

    if (!cleanName) {
      setError("Vui lòng nhập Họ và tên đầy đủ của học sinh.");
      return;
    }

    if (!cleanClass) {
      setError("Vui lòng chọn hoặc nhập Lớp học.");
      return;
    }

    setIsLoading(true);
    setMultipleMatches([]);
    
    try {
      const results = await dbService.queryStudentByNameAndClass(cleanName, cleanClass);

      if (results && results.length > 0) {
        if (results.length === 1) {
          const student = results[0];
          await dbService.logSearchActivity(student.fullName, student.className);
          const updatedActivities = await dbService.getRecentActivities();
          setRecentActivities(updatedActivities);
          onQueryResult(student, selectedTerm);
        } else {
          // Found multiple matches
          setMultipleMatches(results);
        }
      } else {
        setError(
          `Không tìm thấy học sinh "${fullName}" thuộc lớp "${searchClass}". Vui lòng kiểm tra lại chính xác Họ tên và Lớp học.`
        );
      }
    } catch (err) {
      setError("Đã xảy ra lỗi hệ thống khi kết nối cơ sở dữ liệu học tập.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMatch = async (student: Student) => {
    setMultipleMatches([]);
    await dbService.logSearchActivity(student.fullName, student.className);
    const updatedActivities = await dbService.getRecentActivities();
    setRecentActivities(updatedActivities);
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
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30 mix-blend-overlay overflow-hidden no-print">
         <svg className="absolute top-[-5%] left-[-5%] w-[450px] h-[450px] text-white/50" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M44.5,-76.3C58.1,-69.1,70.1,-58.5,78.8,-45.5C87.4,-32.5,92.8,-17.1,92.2,-2.1C91.6,12.9,85.1,27.5,76,40.8C66.9,54.1,55.3,66.1,41.4,73.4C27.5,80.7,11.3,83.2,-4.5,91C-20.2,98.8,-35.4,111.9,-48.3,110.8C-61.2,109.8,-71.7,94.6,-78.9,79.5C-86.2,64.4,-90.1,49.4,-92.3,34.8C-94.5,20.2,-95,5.9,-93.4,-8.2C-91.8,-22.3,-88.2,-36.1,-80.6,-48.4C-73,-60.7,-61.4,-71.4,-48.4,-79.1C-35.4,-86.8,-21.1,-91.4,-6.2,-80.6C8.7,-69.9,23.5,-43.8,44.5,-76.3Z" transform="translate(100 100)" />
         </svg>

         {/* Floating icons match the provided image */}
         <div className="absolute top-10 left-[10%] opacity-10 animate-vertical-floating">
            <BookOpen className="w-24 h-24 text-white" />
         </div>
         <div className="absolute top-40 left-[5%] opacity-10 animate-vertical-floating [animation-delay:1s]">
            <Lightbulb className="w-16 h-16 text-white" />
         </div>
         <div className="absolute top-80 left-[12%] opacity-10 animate-vertical-floating [animation-delay:2s]">
            <GraduationCap className="w-20 h-20 text-white" />
         </div>
         <div className="absolute bottom-20 left-[8%] opacity-5">
            <BarChartHorizontal className="w-32 h-32 text-white" />
         </div>
      </div>
      
      {/* Top Banner Navigation Header */}
      <header className="w-full bg-[#0055A5] text-white px-6 py-4 md:py-5 shadow-md shrink-0 relative flex flex-col items-center justify-center text-center">
        {/* Admin Navigation Button */}
        <div className="absolute top-3 right-4 md:top-4 md:right-6 lg:right-10 flex items-center gap-2">
          <button
            onClick={onNavigateToAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-xs font-bold text-white transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
            title="Đăng nhập trang quản trị"
            id="btn-nav-to-admin"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quản trị viên</span>
            <span className="sm:hidden">Quản trị</span>
          </button>
        </div>

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
      <main className="flex-1 max-w-6xl w-full mx-auto pt-8 pb-4 md:pt-12 md:pb-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          
          {/* LEFT SIDE: LOOKUP TOOL & QUICK CANDIDATES (col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Core Query Card */}
            <div id="card-query" className="w-full glass-card rounded-xl shadow-xl border border-white/50 overflow-hidden transition-all hover:shadow-2xl relative z-10">
              <div className="h-2 bg-[#0055A5] shadow-sm" />
              
              <div className="p-6 md:p-8">
                <h2 className="text-base font-black text-[#0055A5] uppercase text-center mb-1.5 tracking-tight">
                  TRA CỨU KẾT QUẢ HỌC TẬP
                </h2>
                <p className="text-xs text-slate-700 text-center mb-6 font-medium">
                  Vui lòng điền thông tin định danh học sinh bên dưới để truy xuất học bạ điện tử gốc.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Student Name Input */}
                  <div>
                    <label htmlFor="student-name" className="block text-[11px] font-semibold text-slate-900 uppercase mb-1.5 tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#0055A5]" /> Họ và Tên học sinh <span className="text-[#E53935]">*</span>
                    </label>
                    <input
                      type="text"
                      id="student-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nhập tên học sinh (Ví dụ: Vũ Văn Hùng)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-[13px] placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0055A5] focus:bg-white transition"
                      autoComplete="off"
                      required
                    />
                  </div>

                  {/* Student Class Input */}
                  <div>
                    <label htmlFor="student-class" className="block text-[11px] font-semibold text-slate-900 uppercase mb-1.5 tracking-wider flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-[#0055A5]" /> Lớp học <span className="text-[#E53935]">*</span>
                    </label>
                    {availableClasses.length > 0 ? (
                      <select
                        id="student-class"
                        value={searchClass}
                        onChange={(e) => setSearchClass(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0055A5] focus:bg-white transition cursor-pointer"
                      >
                        {availableClasses.map((cls) => (
                          <option key={cls} value={cls}>
                            Lớp {cls}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        id="student-class"
                        value={searchClass}
                        onChange={(e) => setSearchClass(e.target.value)}
                        placeholder="Nhập tên lớp (Ví dụ: 9A1)"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0055A5] focus:bg-white transition"
                        autoComplete="off"
                        required
                      />
                    )}
                    <p className="text-[11px] text-slate-500 mt-1.5 pl-1 font-medium italic">
                      Vui lòng nhập hoặc chọn đúng lớp của học sinh để tra cứu điểm.
                    </p>
                  </div>

                  {/* Academic Term Selector tabs */}
                  <div className="space-y-2 mt-2">
                    <label className="block text-[11px] font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-1.5 mt-2 mb-1.5">
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
                              <div className="text-xs text-slate-500 font-medium mt-0.5">Mã học sinh: <span className="font-mono text-slate-800 font-bold">{student.studentCode}</span></div>
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
                        TRA CỨU KẾT QUẢ
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

            {/* Quick Three-Step Guideline (Moved here for top-down lookup instruction flow) */}
            <div className="glass-card p-6 rounded-xl border border-white/50 shadow-lg relative z-10">
              <div className="flex items-center gap-1.5 border-b pb-3.5 border-slate-100 mb-5 text-[#0055A5]">
                <LayoutDashboard className="w-4.5 h-4.5" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  HƯỚNG DẪN TRA CỨU KẾT QUẢ
                </h3>
              </div>
              
              <div className="flex flex-col gap-5">
                {/* Step 1 */}
                <div className="flex items-start gap-4 p-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0055A5] flex items-center justify-center text-white font-black text-base shadow-sm">1</div>
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-black uppercase text-[#0055A5] tracking-tight">NHẬP HỌ TÊN</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Nhập họ và tên đầy đủ, chính xác của học sinh cần tra cứu.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4 p-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0055A5] flex items-center justify-center text-white font-black text-base shadow-sm">2</div>
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-black uppercase text-[#0055A5] tracking-tight">CHỌN LỚP HỌC</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Chọn hoặc nhập đúng lớp của học sinh (Ví dụ: Lớp 9A1).</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4 p-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E53935] flex items-center justify-center text-white font-black text-base shadow-sm">3</div>
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-black uppercase text-[#E53935] tracking-tight">TRA CỨU KẾT QUẢ</h4>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">Nhấn nút tra cứu để xem chi tiết bảng điểm thành phần môn học và kết quả rèn luyện.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Realtime Statistics Bento Grid (Moved here for better balance) */}
            <div className="grid grid-cols-2 gap-4 relative z-10">
              
              {/* Stat 1 */}
              <div className="glass-card p-4 rounded-xl border border-white/50 flex flex-col justify-between shadow-lg hover:shadow-xl transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">HỌC SINH SỐ HÓA</span>
                  <div className="w-7 h-7 rounded-md bg-[#0055A5]/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#0055A5]" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-[#0055A5] tracking-tight block">{studentCount.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-500 leading-tight">Hồ sơ học bạ điện tử</span>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="glass-card p-4 rounded-xl border border-white/50 flex flex-col justify-between shadow-lg hover:shadow-xl transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TRƯỜNG LIÊN KẾT</span>
                  <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center border border-emerald-100">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800 tracking-tight block">48 Trường</span>
                  <span className="text-[10px] font-bold text-slate-500 leading-tight">Đồng bộ dữ liệu điểm</span>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="glass-card p-4 rounded-xl border border-white/50 flex flex-col justify-between shadow-lg hover:shadow-xl transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">XÁC MINH SỐ</span>
                  <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center border border-amber-100">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-[#E53935] tracking-tight block">100%</span>
                  <span className="text-[10px] font-bold text-slate-500 leading-tight">Chữ ký số gốc</span>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="glass-card p-4 rounded-xl border border-white/50 flex flex-col justify-between shadow-lg hover:shadow-xl transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TỐC ĐỘ</span>
                  <div className="w-7 h-7 rounded-md bg-purple-50 flex items-center justify-center border border-purple-100">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800 tracking-tight block">&lt; 0.3s</span>
                  <span className="text-[10px] font-bold text-slate-500 leading-tight">Kết xuất tức thời</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: SYSTEM OVERVIEW AND INSIGHTS PANEL (col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Official Bulletin / Notifications */}
            <div className="glass-card p-6 rounded-xl border border-white/50 shadow-lg relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-3 border-slate-100 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-5 h-5 text-[#E53935] shrink-0" />
                    <h3 className="text-sm font-black text-[#0055A5] uppercase tracking-wide leading-none">
                      BẢN TIN MỚI NHẤT CỦA NHÀ TRƯỜNG
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    Tin cập nhật từ trang thông tin điện tử nhà trường <span className="inline-block whitespace-nowrap">(<a href="https://suoilu.db.edu.vn" target="_blank" referrerPolicy="no-referrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-bold">suoilu.db.edu.vn <ExternalLink className="w-2.5 h-2.5" /></a>)</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                  <button 
                    onClick={async () => {
                      setNewsLoading(true);
                      try {
                        const r = await fetch(`/api/news?refresh=true&source=${encodeURIComponent(newsSourceUrl)}`);
                        if (r.ok) {
                          const res = await r.json();
                          if (res && res.data && res.data.length > 0) {
                            if (res.source === "scraped") {
                              await dbService.savePortalSetting("portal_cached_news", JSON.stringify(res.data));
                              setNewsItems(res.data);
                              setNewsSource(new URL(newsSourceUrl).hostname);
                            } else if (res.source === "fallback_static" || res.status === "fallback") {
                              const savedNewsStr = await dbService.getPortalSetting("portal_cached_news", "");
                              if (savedNewsStr) {
                                try {
                                  const savedNews = JSON.parse(savedNewsStr);
                                  if (Array.isArray(savedNews) && savedNews.length > 0) {
                                    setNewsItems(savedNews);
                                    setNewsSource(new URL(newsSourceUrl).hostname);
                                    return;
                                  }
                                } catch { }
                              }
                              setNewsItems(res.data);
                              setNewsSource("Hệ thống");
                            } else {
                              setNewsItems(res.data);
                              const isFromWebsite = ["scraped", "cache", "cache_stale"].includes(res.source);
                              setNewsSource(isFromWebsite ? new URL(newsSourceUrl).hostname : "Hệ thống");
                            }
                          }
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setNewsLoading(false);
                      }
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-[#0055A5] cursor-pointer"
                    title="Lấy tin mới nhất ngay"
                    disabled={newsLoading}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${newsLoading ? 'animate-spin' : ''}`} />
                  </button>
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
                  <div className="space-y-4 py-2.5">
                    {/* Hero Feature: Primary Latest News (Exactly like the design mockup) */}
                    {newsItems.slice(0, 1).map((item, idx) => (
                      <a
                        key={item.id || idx}
                        href={item.link || "https://suoilu.db.edu.vn"}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50/70 p-2 -mx-2 rounded-xl transition duration-200 group cursor-pointer"
                      >
                        {/* Left: Beautiful article illustration image */}
                        <div className="w-full sm:w-28 h-20 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-150 relative">
                          <img 
                            src={item.image} 
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const fallbacks = [
                                "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=500&auto=format&fit=crop&q=60",
                                "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=60",
                                "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=500&auto=format&fit=crop&q=60",
                                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&auto=format&fit=crop&q=60",
                                "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=500&auto=format&fit=crop&q=60"
                              ];
                              (e.target as HTMLImageElement).src = fallbacks[idx % fallbacks.length];
                            }}
                          />
                          <div className="absolute top-1 left-1">
                            <span className="text-[8px] font-black uppercase tracking-wider bg-[#E53935]/95 text-white px-1.5 py-0.5 rounded leading-none">
                              Mới nhất
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
                    ))}

                    {/* Secondary News Row: Remaining 4 latest news items in a compact, highly polished list */}
                    {newsItems.length > 1 && (
                      <div className="pt-3 border-t border-slate-100/80">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">TIN TỨC LIÊN QUAN KHÁC</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {newsItems.slice(1, 5).map((item, idx) => (
                            <a
                              key={item.id || idx}
                              href={item.link || "https://suoilu.db.edu.vn"}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="p-2 bg-slate-50/40 hover:bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5 transition duration-150 group cursor-pointer"
                            >
                              <div className="w-14 h-11 bg-slate-100 rounded overflow-hidden shrink-0 border border-slate-150 relative">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    const fallbacks = [
                                      "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=200&auto=format&fit=crop&q=60",
                                      "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=200&auto=format&fit=crop&q=60",
                                      "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=200&auto=format&fit=crop&q=60",
                                      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=200&auto=format&fit=crop&q=60"
                                    ];
                                    (e.target as HTMLImageElement).src = fallbacks[idx % fallbacks.length];
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[10.5px] text-slate-700 leading-tight line-clamp-2 group-hover:text-[#0055A5] transition-colors">
                                  {item.title}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[8px] text-slate-400 font-bold font-mono">{item.date}</span>
                                  <span className="text-[8px] text-slate-300">•</span>
                                  <span className="text-[8px] text-[#0055A5] font-extrabold uppercase bg-[#0055A5]/5 px-1 py-0.2 rounded truncate max-w-[120px]">{item.category}</span>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    <p className="text-[11px] font-medium mb-2">Không nạp được bản tin từ nguồn Suối Lư.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewsLoading(true);
                        fetch(`/api/news?refresh=true&source=${encodeURIComponent(newsSourceUrl)}`)
                          .then((r) => r.json())
                          .then((res) => {
                            if (res && res.data) {
                              setNewsItems(res.data);
                              const isFromWebsite = ["scraped", "cache", "cache_stale"].includes(res.source);
                              setNewsSource(isFromWebsite ? new URL(newsSourceUrl).hostname : "Hệ thống");
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

            {/* Board of Honor (Bảng Vàng) panel - Game Show Style */}
            <div className="w-full bg-[#FFFBEB] border-2 border-amber-300 text-slate-900 p-5 md:p-6 rounded-3xl shadow-[0_15px_40px_-12px_rgba(251,191,36,0.2)] relative z-10 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl animate-pulse" />
              
              <div className="flex flex-col items-center mb-6 pt-2">
                <div className="relative flex items-center justify-center gap-4 md:gap-6">
                  {/* Left Wreath Decoration */}
                  <motion.div 
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="flex flex-col items-center opacity-90"
                  >
                    <Award className="w-8 h-8 md:w-10 md:h-10 text-amber-500 drop-shadow-sm" />
                    <div className="w-0.5 h-3 bg-amber-400 rounded-full mt-1" />
                  </motion.div>

                  <div className="bg-white px-8 py-3 rounded-2xl border-2 border-amber-200 shadow-[0_6px_0_0_#FEF3C7] flex flex-col items-center justify-center relative">
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                      VINH DANH
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-amber-900 uppercase tracking-[0.12em] text-center leading-tight">
                      BẢNG VÀNG
                    </h3>
                  </div>

                  {/* Right Wreath Decoration */}
                  <motion.div 
                    animate={{ rotate: [5, -5, 5] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="flex flex-col items-center opacity-90"
                  >
                    <Award className="w-8 h-8 md:w-10 md:h-10 text-amber-500 drop-shadow-sm" />
                    <div className="w-0.5 h-3 bg-amber-400 rounded-full mt-1" />
                  </motion.div>
                </div>
                
                {/* Decorative separator */}
                <div className="flex items-center gap-3 mt-5">
                   <div className="h-0.5 w-6 bg-gradient-to-r from-transparent to-amber-400 rounded-full" />
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                   <div className="h-0.5 w-6 bg-gradient-to-l from-transparent to-amber-400 rounded-full" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 max-h-[400px] overflow-y-auto pr-1.5 custom-scrollbar">
                {topStudents.length > 0 ? topStudents.map((student, idx) => {
                  let badgeStyles = "bg-sky-50 text-sky-700 border-sky-100";
                  let label = "Học sinh Giỏi";
                  let icon = <Award className="w-4.5 h-4.5 text-sky-500" />;
                  let cardStyles = "bg-white border-slate-100";
                  let nameStyles = "text-slate-800";

                  if (student.distinction === "Học sinh Xuất sắc") {
                    badgeStyles = "bg-amber-50 text-amber-800 border-amber-100";
                    label = "Xuất sắc";
                    icon = <Crown className="w-4.5 h-4.5 text-amber-500" />; 
                    cardStyles = "bg-white border-amber-200 shadow-[0_4px_12px_-4px_rgba(251,191,36,0.15)]";
                    nameStyles = "text-amber-900";
                  }
                  
                  return (
                    <motion.div
                      key={student.id || idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-3.5 ${cardStyles} border rounded-2xl text-left flex items-center justify-between group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden`}
                    >
                      <div className="flex items-center gap-3 relative z-10 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 border border-slate-50 shadow-sm ${student.distinction === "Học sinh Xuất sắc" ? "bg-amber-50/80" : "bg-sky-50/80"}`}>
                          {icon}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className={`font-black ${nameStyles} text-[11px] md:text-[13px] uppercase leading-tight tracking-tighter truncate whitespace-nowrap`}>{student.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 bg-slate-50/50 px-2 py-0.5 rounded-lg border border-slate-100/50 w-fit">
                            <Users className="w-3 h-3 opacity-50" />
                            {student.className}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 relative z-10 ml-2">
                        <span className={`${badgeStyles} border px-2 py-0.5 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-wider shadow-sm`}>
                          {label}
                        </span>
                      </div>
                      
                      {/* Suble hover highlight */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </motion.div>
                  );
                }) : (
                  <div className="col-span-full text-center py-10 text-[10px] text-amber-600/40 font-black uppercase tracking-[0.2em] flex flex-col items-center gap-5 bg-white/40 rounded-3xl border-2 border-dashed border-amber-200/50">
                    <RefreshCw className="w-6 h-6 animate-spin opacity-20" />
                    Chưa có danh sách vinh danh...
                  </div>
                )}
              </div>
            </div>

            {/* Recent Lookups Live Feed */}
            <div className="glass-card rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 overflow-hidden group/card bg-white/70 backdrop-blur-xl">
              {/* Decorative side accent */}
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/80 group-hover/card:w-2 transition-all duration-500" />
              
              {/* Animated decorative gradient bg */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-emerald-100/30 rounded-full blur-3xl group-hover/card:scale-110 transition-transform duration-700" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-emerald-50/20 rounded-full blur-2xl" />

              <div className="p-5 relative">
                <div className="flex items-center gap-2 border-b pb-3 border-slate-100 mb-4 text-emerald-700">
                  <div className="bg-emerald-100 p-2 rounded-xl border border-emerald-200 group-hover/card:scale-110 group-hover/card:rotate-12 transition-all duration-500 shadow-sm">
                    <Zap className="w-4 h-4 fill-emerald-600 animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-widest leading-none">
                      TRA CỨU GẦN ĐÂY
                    </h3>
                    <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Hoạt động thời gian thực</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2 px-2.5 py-1.5 bg-white/80 rounded-full border border-emerald-100 shadow-sm transition-all hover:bg-emerald-50">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">LIVE</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1.5 custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {recentActivities.length > 0 ? (
                      recentActivities.map((activity, idx) => (
                        <motion.div 
                          key={activity.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.05 }}
                          className="w-full bg-white/60 backdrop-blur-md p-3.5 rounded-2xl border border-white/90 hover:border-emerald-300 hover:bg-white/95 transition-all duration-500 group flex items-center justify-between gap-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
                        >
                          <div className="flex items-center gap-3.5 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shrink-0 border border-white shadow-inner">
                              <User className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-black text-slate-800 leading-none mb-1.5 group-hover:text-emerald-700 transition-colors tracking-tight truncate whitespace-nowrap">
                                {toDisplayCase(activity.studentName)}
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                  <span className="text-emerald-600 font-extrabold uppercase text-[8px]">Lớp</span> 
                                  <span className="text-slate-700 font-black">{activity.className}</span>
                               </div>
                                {activity.count && activity.count > 1 && (
                                  <div className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-500 shadow-sm shadow-emerald-200">
                                    {activity.count} lần
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1.5">
                            <div className="text-[10px] font-mono font-black text-emerald-800 bg-white px-2 py-1 rounded-xl border border-emerald-100 shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                              {new Date(activity.queriedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex items-center gap-1 text-[8px] font-black text-slate-300 uppercase tracking-widest">
                               {isToday(activity.queriedAt) ? (
                                  <>
                                    <Clock className="w-3 h-3 text-emerald-300" />
                                    <span>Vừa tra</span>
                                  </>
                               ) : (
                                  <span>{new Date(activity.queriedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                               )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="w-full text-center py-12 text-[11px] font-bold text-slate-400 italic bg-white/40 rounded-3xl border-2 border-dashed border-slate-200/50">
                        Chưa có hoạt động tra cứu mới hôm nay
                      </div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map(i => (
                      <motion.div 
                        key={i} 
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                        className="w-1.5 h-1.5 rounded-full bg-emerald-300" 
                      />
                    ))}
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">HỆ THỐNG TRỰC TUYẾN</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      
      {/* Floating Contact Buttons */}
      <div className="fixed right-4 bottom-24 z-50 flex flex-col gap-3">
        <motion.a
          href={zaloUrl}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.9 }}
          className="group flex items-center gap-3 bg-[#0068ff] text-white p-2.5 rounded-full shadow-lg shadow-blue-200 border border-blue-400"
          title="Liên hệ qua Zalo"
        >
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-bold text-sm">Zalo Nhà Trường</span>
          <ZaloIcon className="w-7 h-7" />
        </motion.a>

        <motion.a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.9 }}
          className="group flex items-center gap-3 bg-[#1877F2] text-white p-3 rounded-full shadow-lg shadow-blue-300 border border-blue-600"
          title="Theo dõi trên Facebook"
        >
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-bold text-sm">Fanpage Facebook</span>
          <Facebook className="w-6 h-6 fill-current" />
        </motion.a>

        <motion.a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.9 }}
          className="group flex items-center gap-3 bg-[#0055A5] text-white p-3 rounded-full shadow-lg shadow-slate-300 border border-blue-900"
          title="Truy cập Website chính thức"
        >
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-bold text-sm">Website Suối Lư</span>
          <Globe className="w-6 h-6" />
        </motion.a>
      </div>
    </div>
  );
}

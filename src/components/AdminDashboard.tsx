/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Student, SubjectResult, SchoolClass, VisitorMonthlyStats } from "../types";
import dbService from "../lib/supabase";
import * as XLSX from "xlsx";
import { 
  Users, Edit, Trash2, Plus, Upload, BarChart3, Database, LogOut, Check, X,
  RefreshCw, Info, Lock, Eye, Copy, ArrowLeft, Layers, School, FileCheck, Keyboard, Download, FileSpreadsheet, UserX, SortAsc
} from "lucide-react";

import { evaluateTT22, evaluateDistinctionTT22 } from "../lib/tt22";

interface AdminDashboardProps {
  onBackToPortal: () => void;
}

/**
 * Helper to compare Vietnamese names correctly (Tên -> Đệm -> Họ)
 */
const compareVietnameseNames = (nameA: string, nameB: string) => {
  const aParts = (nameA || "").trim().split(/\s+/);
  const bParts = (nameB || "").trim().split(/\s+/);
  
  const aFirstName = aParts.pop() || "";
  const bFirstName = bParts.pop() || "";
  
  const firstNameCompare = aFirstName.localeCompare(bFirstName, "vi");
  if (firstNameCompare !== 0) return firstNameCompare;
  
  const aRest = aParts.join(" ");
  const bRest = bParts.join(" ");
  return aRest.localeCompare(bRest, "vi");
};

export default function AdminDashboard({ onBackToPortal }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authIsLoading, setAuthIsLoading] = useState(false);

  // States
  const [students, setStudents] = useState<Student[]>([]);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [activeTab, setActiveTab] = useState<"students" | "grades" | "import" | "stats" | "supabase" | "settings" | "classes">("students");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");

  const handleSortStudentsABC = () => {
    const sorted = [...students].sort((a, b) => {
      // Primary sort by Class Name
      const classCompare = (a.className || "").localeCompare(b.className || "", "vi");
      if (classCompare !== 0) return classCompare;
      
      // Secondary sort by Full Name (Vietnamese Standard)
      return compareVietnameseNames(a.fullName, b.fullName);
    });
    setStudents(sorted);
    alert("Đã sắp xếp danh sách học sinh theo Lớp và thứ tự ABC (Tên -> Đệm -> Họ) thành công.");
  };

  // Classes config state
  const [classes, setClasses] = useState<SchoolClass[]>(() => {
    const cached = localStorage.getItem("portal_classes");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fallback
      }
    }
    return [
      { id: "class_01", className: "9A1", gradeLevel: "9", advisorName: "Cô Nguyễn Minh Thảo", roomNumber: "Phòng 301" },
      { id: "class_02", className: "9A2", gradeLevel: "9", advisorName: "Thầy Trương Văn Lâm", roomNumber: "Phòng 302" },
      { id: "class_03", className: "8B1", gradeLevel: "8", advisorName: "Cô Phạm Thị Thanh", roomNumber: "Phòng 201" },
      { id: "class_04", className: "8B2", gradeLevel: "8", advisorName: "Cô Lò Thị Mai", roomNumber: "Phòng 202" },
      { id: "class_05", className: "7C1", gradeLevel: "7", advisorName: "Thầy Nguyễn Tiến Dũng", roomNumber: "Phòng 101" },
      { id: "class_06", className: "6A1", gradeLevel: "6", advisorName: "Cô Hoàng Lan Anh", roomNumber: "Phòng 102" }
    ];
  });

  // Keep localStorage updated
  useEffect(() => {
    localStorage.setItem("portal_classes", JSON.stringify(classes));
  }, [classes]);

  // Sync missing classes from loaded students roster
  useEffect(() => {
    if (students.length > 0) {
      const studentClassNames = Array.from(new Set(students.map(s => s.className).filter(Boolean))) as string[];
      const existingClassNames = classes.map(c => c.className);
      const missingClassNames = studentClassNames.filter(cName => !existingClassNames.includes(cName));
      if (missingClassNames.length > 0) {
        const newClasses = [
          ...classes,
          ...missingClassNames.map((cName, idx) => {
            const match = cName.match(/\d/);
            const grade: "6" | "7" | "8" | "9" = match && ["6", "7", "8", "9"].includes(match[0]) 
              ? (match[0] as any) 
              : "9";
            return {
              id: `class_auto_${Date.now()}_${idx}`,
              className: cName,
              gradeLevel: grade,
              advisorName: "Chưa phân công chủ nhiệm",
              roomNumber: "Chưa xếp phòng"
            };
          })
        ];
        setClasses(newClasses);
      }
    }
  }, [students]);

  // Form State for Classes Tab
  const [classFormId, setClassFormId] = useState<string | null>(null);
  const [classFormName, setClassFormName] = useState("");
  const [classFormGrade, setClassFormGrade] = useState<"6" | "7" | "8" | "9">("9");
  const [classFormAdvisor, setClassFormAdvisor] = useState("");
  const [classFormRoom, setClassFormRoom] = useState("");
  const [classFormError, setClassFormError] = useState("");

  // Portal Title Config States
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
  const [footerTitle, setFooterTitle] = useState(() => {
    const val = localStorage.getItem("portal_footer_title");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "HỆ THỐNG SUỐI LƯ";
  });
  const [footerDesc, setFooterDesc] = useState(() => {
    const val = localStorage.getItem("portal_footer_desc");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "Cổng tra cứu kết quả học tập và học bạ điện tử chính thức của **Trường PTDTBT TH & THCS Suối Lư**. Hệ thống cung cấp dữ liệu số hóa chính xác từ sổ bộ gốc của nhà trường, phục vụ học sinh và phụ huynh.";
  });
  const [footerCopy, setFooterCopy] = useState(() => {
    const val = localStorage.getItem("portal_footer_copy");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "• Bản quyền © 2026 PTDTBT TH & THCS Suối Lư";
  });
  const [footerKeywords, setFooterKeywords] = useState(() => {
    const val = localStorage.getItem("portal_footer_keywords");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "Suối Lư, THCS Suối Lư, Tiểu học Suối Lư, Học bạ điện tử, Tra cứu điểm, Điện Biên";
  });
  const [footerContact, setFooterContact] = useState(() => {
    const val = localStorage.getItem("portal_footer_contact");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "• Địa chỉ: Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên\n• Website gốc: https://suoilu.db.edu.vn\n• Bản quyền © 2026 PTDTBT TH & THCS Suối Lư";
  });
  
  const [searchByCccd, setSearchByCccd] = useState(() => {
    const val = localStorage.getItem("portal_search_cccd");
    return val !== "false"; // default true
  });
  const [searchByName, setSearchByName] = useState(() => {
    const val = localStorage.getItem("portal_search_name");
    return val === "true"; 
  });
  const [zaloUrl, setZaloUrl] = useState(() => localStorage.getItem("portal_zalo_url") || "https://zalo.me/0333333333");
  const [facebookUrl, setFacebookUrl] = useState(() => localStorage.getItem("portal_facebook_url") || "https://facebook.com/suoilu");
  const [websiteUrl, setWebsiteUrl] = useState(() => localStorage.getItem("portal_website_url") || "https://suoilu.db.edu.vn");
  const [newsSourceUrl, setNewsSourceUrl] = useState(() => localStorage.getItem("portal_news_source_url") || "https://suoilu.db.edu.vn");

  // Student Form Dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formStudent, setFormStudent] = useState<Partial<Student>>({});
  const [formError, setFormError] = useState("");

  // Grade Edit State
  const [editingStudentCode, setEditingStudentCode] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [tempGradeValue, setTempGradeValue] = useState("");
  const [tempTx, setTempTx] = useState("");
  const [tempMid, setTempMid] = useState("");
  const [tempEnd, setTempEnd] = useState("");
  const [gradesTerm, setGradesTerm] = useState<"hk1" | "hk2" | "canam">("hk1");

  // Supabase dynamic config
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [supabaseStatus, setSupabaseStatus] = useState({ isConnected: false, mode: "Local Offline Mode" });

  // SQL code copy interaction state
  const [copiedSql, setCopiedSql] = useState(false);

  // Import State
  const [importTerm, setImportTerm] = useState<"hk1" | "hk2" | "canam">("hk1");
  const [importClass, setImportClass] = useState(() => classes.length > 0 ? classes[0].className : "9A1");
  const [importText, setImportText] = useState("");
  const [importMethod, setImportMethod] = useState<"paste" | "upload">("paste");
  const [importPreview, setImportPreview] = useState<Student[]>([]);
  const [importStatus, setImportStatus] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  // Visitor stats state
  const [visitorMonthlyStats, setVisitorMonthlyStats] = useState<VisitorMonthlyStats[]>([]);
  const [totalVisitors, setTotalVisitors] = useState(0);

  // Keep importClass valid based on available classes
  useEffect(() => {
    if (classes.length > 0 && !classes.find(c => c.className === importClass)) {
      setImportClass(classes[0].className);
    }
  }, [classes, importClass]);

  // Load initial students list
  useEffect(() => {
    if (isAuthenticated) {
      loadStudents();
      loadSupabaseConfig();
      loadPortalConfig();
      loadVisitorStats();
    }
  }, [isAuthenticated]);

  const loadVisitorStats = async () => {
    const stats = await dbService.getVisitorStats();
    setVisitorMonthlyStats(stats);
    const total = await dbService.getTotalVisitors();
    setTotalVisitors(total);
  };

  const loadStudents = async () => {
    try {
      const list = await dbService.getAllStudents();
      setStudents(list);
    } catch (err) {
      console.error("Critical: Failed to sync students list from server:", err);
    } finally {
      setIsInitialLoadDone(true);
    }
  };

  const loadPortalConfig = async () => {
    try {
      const cls = await dbService.getClasses();
      setClasses(cls);

      const top = await dbService.getPortalSetting("portal_header_top", "ỦY BAN NHÂN DÂN XÃ XA DUNG • TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ");
      setHeaderTop(top);

      const main = await dbService.getPortalSetting("portal_header_main", "TRA CỨU KẾT QUẢ HỌC TẬP HỌC SINH THCS");
      setHeaderMain(main);

      const year = await dbService.getPortalSetting("portal_school_year", "NĂM HỌC 2025 - 2026");
      setSchoolYear(year);

      const title = await dbService.getPortalSetting("portal_footer_title", "HỆ THỐNG SUỐI LƯ");
      setFooterTitle(title);

      const desc = await dbService.getPortalSetting("portal_footer_desc", "Cổng tra cứu kết quả học tập và học bạ điện tử chính thức của **Trường PTDTBT TH & THCS Suối Lư**. Hệ thống cung cấp dữ liệu số hóa chính xác từ sổ bộ gốc của nhà trường, phục vụ học sinh và phụ huynh.");
      setFooterDesc(desc);

      const copy = await dbService.getPortalSetting("portal_footer_copy", "• Bản quyền © 2026 PTDTBT TH & THCS Suối Lư");
      setFooterCopy(copy);

      const keywords = await dbService.getPortalSetting("portal_footer_keywords", "Suối Lư, THCS Suối Lư, Tiểu học Suối Lư, Học bạ điện tử, Tra cứu điểm, Điện Biên");
      setFooterKeywords(keywords);

      const contact = await dbService.getPortalSetting("portal_footer_contact", "• Địa chỉ: Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên\n• Website gốc: https://suoilu.db.edu.vn\n• Bản quyền © 2026 PTDTBT TH & THCS Suối Lư");
      setFooterContact(contact);

      const searchCccd = await dbService.getPortalSetting("portal_search_cccd", "true");
      setSearchByCccd(searchCccd !== "false");

      const searchName = await dbService.getPortalSetting("portal_search_name", "true");
      setSearchByName(searchName === "true");

      const z = await dbService.getPortalSetting("portal_zalo_url", "https://zalo.me/0333333333");
      setZaloUrl(z);
      const f = await dbService.getPortalSetting("portal_facebook_url", "https://facebook.com/suoilu");
      setFacebookUrl(f);
      const w = await dbService.getPortalSetting("portal_website_url", "https://suoilu.db.edu.vn");
      setWebsiteUrl(w);
      const n = await dbService.getPortalSetting("portal_news_source_url", "https://suoilu.db.edu.vn");
      setNewsSourceUrl(n);
    } catch (e) {
      // Configuration fallback log
      console.log("Portal settings deferred load info:", (e as any).message);
    }
  };

  const loadSupabaseConfig = () => {
    const config = dbService.getConfig();
    setSupabaseUrl(config.url);
    setSupabaseKey(config.key);
    setSupabaseStatus({
      isConnected: config.isRealSupabase,
      mode: config.isRealSupabase ? "Supabase Online Cloud Mode" : "Local Offline Storage Mode"
    });
  };

  // Handle local Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthIsLoading(true);

    // Prioritise easy educator testing: email "admin@edu.vn" / pass "admin123"
    // But if they configured realistic Supabase Auth, they can also sign in
    const client = dbService.getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (!error) {
          setIsAuthenticated(true);
          return;
        } else {
          // Silent fallback to local master credentials
        }
      } catch (err) {
        // Fallback
      }
    }

    // Default Fallback Authentication (Master Access)
    if (authEmail.trim() === "admin@edu.vn" && authPassword === "admin123") {
      setIsAuthenticated(true);
    } else {
      setAuthError("Tài khoản hoặc mật khẩu không chính xác.");
    }
    setAuthIsLoading(false);
  };

  // Copy SQL script tool handler
  const handleCopySql = () => {
    const snakeEl = document.getElementById("sql_snake_case");
    const camelEl = document.getElementById("sql_camel_case");
    let textToCopy = "";
    
    if (snakeEl && !snakeEl.classList.contains("hidden")) {
      const pre = snakeEl.querySelector("pre");
      if (pre) textToCopy = pre.innerText || pre.textContent || "";
    } else if (camelEl && !camelEl.classList.contains("hidden")) {
      const pre = camelEl.querySelector("pre");
      if (pre) textToCopy = pre.innerText || pre.textContent || "";
    }
    
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setCopiedSql(true);
          setTimeout(() => setCopiedSql(false), 2000);
        })
        .catch(err => {
          console.error("Failed to copy SQL text:", err);
        });
    }
  };

  // Save Config for Supabase
  const handleSaveSupabaseConfig = () => {
    try {
      dbService.saveConfig(supabaseUrl.trim(), supabaseKey.trim());
      loadSupabaseConfig();
      loadStudents();
      alert("Đã cập nhật cấu hình Supabase! Hệ thống đã tự động kết nối và đồng bộ.");
    } catch (err: any) {
      alert("Lỗi cấu hình: " + err.message);
    }
  };

  const handleDisconnectSupabase = () => {
    dbService.disconnect();
    loadSupabaseConfig();
    loadStudents();
    alert("Đã tắt kết nối Supabase, quay trở lại dữ liệu nội bộ trình duyệt.");
  };

  const handleSyncToSupabase = async () => {
    setAuthIsLoading(true);
    const result = await dbService.syncLocalDataToSupabase();
    setAuthIsLoading(false);
    if (result.success) {
      alert(`Đồng bộ thành công! Đã tải lên ${result.count} hồ sơ học sinh lên Supabase.`);
    } else {
      let errStr = result.error || "";
      if (errStr.includes("Failed to fetch")) {
        errStr = "Lỗi mạng hoặc CORS do chưa thiết lập Site URL trong Supabase Authentication cài đặt, hoặc chưa thêm biến môi trường trên Vercel.";
      }
      alert("Thất bại khi đồng bộ: \n" + errStr);
    }
  };

  // Reset local database completely
  const handleResetLocalDb = () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại cơ sở dữ liệu về mặc định ban đầu? Toàn bộ sửa đổi mới sẽ bị xóa.")) {
      const resetList = dbService.resetToDefault();
      setStudents(resetList);
      alert("Đã khôi phục cơ sở dữ liệu về mặc định ban đầu.");
    }
  };

  // Dry-run/complete deletion of all class and student data
  const handleClearAllData = async () => {
    if (confirm("CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn xóa TOÀN BỘ danh sách lớp học và học sinh trong hệ thống không? Toàn bộ dữ liệu điểm số, thông tin học sinh và sơ đồ lớp học sẽ bị xóa sạch khỏi bộ nhớ. Hành động này không thể khôi phục!")) {
      setAuthIsLoading(true);
      try {
        await dbService.clearAllStudents();
        setStudents([]);
        setClasses([]);
        localStorage.removeItem("portal_classes");
        alert("Đã xóa vĩnh viễn toàn bộ lớp học và hồ sơ học sinh thành công.");
      } catch (err: any) {
        alert("Lỗi khi thực hiện xóa dữ liệu: " + err.message);
      } finally {
        setAuthIsLoading(false);
      }
    }
  };

  const handleSavePortalSettings = async () => {
    setAuthIsLoading(true);
    try {
      const r1 = await dbService.savePortalSetting("portal_header_top", headerTop.trim());
      const r2 = await dbService.savePortalSetting("portal_header_main", headerMain.trim());
      const r3 = await dbService.savePortalSetting("portal_school_year", schoolYear.trim());
      const r4 = await dbService.savePortalSetting("portal_footer_title", footerTitle.trim());
      const r5 = await dbService.savePortalSetting("portal_footer_desc", footerDesc.trim());
      const r6 = await dbService.savePortalSetting("portal_footer_copy", footerCopy.trim());
      const r7 = await dbService.savePortalSetting("portal_search_cccd", searchByCccd ? "true" : "false");
      const r8 = await dbService.savePortalSetting("portal_search_name", searchByName ? "true" : "false");
      const r9 = await dbService.savePortalSetting("portal_zalo_url", zaloUrl.trim());
      const r10 = await dbService.savePortalSetting("portal_facebook_url", facebookUrl.trim());
      const r11 = await dbService.savePortalSetting("portal_website_url", websiteUrl.trim());
      const r12 = await dbService.savePortalSetting("portal_news_source_url", newsSourceUrl.trim());
      const r13 = await dbService.savePortalSetting("portal_footer_keywords", footerKeywords.trim());
      const r14 = await dbService.savePortalSetting("portal_footer_contact", footerContact.trim());
      
      const config = dbService.getConfig();
      if (config.isRealSupabase) {
        if (r1 && r2 && r3 && r4 && r5 && r6 && r7 && r8 && r9 && r10 && r11 && r12 && r13 && r14) {
          alert("Cấu hình cổng tra cứu đã được lưu thành công và đồng bộ lên Supabase!");
        } else {
          const dbErr = dbService.lastError ? `\n\nChi tiết lỗi từ Supabase: ${dbService.lastError}\n\n💡 HƯỚNG DẪN MẸO: Bạn hãy mở lại tab "Supabase & Database" trong Cài đặt, COPY toàn bộ Mã SQL VÀ CHẠY LẠI MỘT LẦN NỮA trên SQL Editor của Supabase để hệ thống làm mới schema cache, sau đó thử lưu lại.` : "";
          alert(`Cấu hình đã được lưu thành công ở trình duyệt của bạn (LocalStorage) nhưng không thể đồng bộ lên Supabase! Vui lòng đảm bảo bạn đã tạo bảng 'portal_settings' trong cơ sở dữ liệu Supabase bằng cách chạy đoạn mã SQL khởi tạo được hiển thị ở tab 'Supabase & Database' trong trang Quản trị này.${dbErr}`);
        }
      } else {
        alert("Cấu hình cổng tra cứu đã được lưu thành công vào trình duyệt (LocalStorage)!");
      }
    } catch (err: any) {
      alert("Lỗi khi lưu cấu hình: " + err.message);
    } finally {
      setAuthIsLoading(false);
    }
  };

  const handleResetPortalSettings = async () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại các cấu hình tiêu đề và chân trang về mặc định không?")) {
      const defaultHeaderTop = "ỦY BAN NHÂN DÂN XÃ XA DUNG • TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ";
      const defaultHeaderMain = "TRA CỨU KẾT QUẢ HỌC TẬP HỌC SINH THCS";
      const defaultSchoolYear = "NĂM HỌC 2025 - 2026";
      const defaultFooterTitle = "HỆ THỐNG SUỐI LƯ";
      const defaultFooterDesc = "Cổng tra cứu kết quả học tập và học bạ điện tử chính thức của **Trường PTDTBT TH & THCS Suối Lư**. Hệ thống cung cấp dữ liệu số hóa chính xác từ sổ bộ gốc của nhà trường, phục vụ học sinh và phụ huynh.";
      const defaultFooterKeywords = "Suối Lư, THCS Suối Lư, Tiểu học Suối Lư, Học bạ điện tử, Tra cứu điểm, Điện Biên";
      const defaultFooterContact = "• Địa chỉ: Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên\n• Website gốc: https://suoilu.db.edu.vn\n• Bản quyền © 2026 PTDTBT TH & THCS Suối Lư";
      const defaultFooterCopy = "• Bản quyền © 2026 PTDTBT TH & THCS Suối Lư";
      
      setHeaderTop(defaultHeaderTop);
      setHeaderMain(defaultHeaderMain);
      setSchoolYear(defaultSchoolYear);
      setFooterTitle(defaultFooterTitle);
      setFooterDesc(defaultFooterDesc);
      setFooterKeywords(defaultFooterKeywords);
      setFooterContact(defaultFooterContact);
      setFooterCopy(defaultFooterCopy);
      setSearchByCccd(true);
      setSearchByName(true);
      setZaloUrl("https://zalo.me/0333333333");
      setFacebookUrl("https://facebook.com/suoilu");
      setWebsiteUrl("https://suoilu.db.edu.vn");
      setNewsSourceUrl("https://suoilu.db.edu.vn");
      
      setAuthIsLoading(true);
      try {
        await dbService.savePortalSetting("portal_header_top", defaultHeaderTop);
        await dbService.savePortalSetting("portal_header_main", defaultHeaderMain);
        await dbService.savePortalSetting("portal_school_year", defaultSchoolYear);
        await dbService.savePortalSetting("portal_footer_title", defaultFooterTitle);
        await dbService.savePortalSetting("portal_footer_desc", defaultFooterDesc);
        await dbService.savePortalSetting("portal_footer_keywords", defaultFooterKeywords);
        await dbService.savePortalSetting("portal_footer_contact", defaultFooterContact);
        await dbService.savePortalSetting("portal_footer_copy", defaultFooterCopy);
        await dbService.savePortalSetting("portal_search_cccd", "true");
        await dbService.savePortalSetting("portal_search_name", "true");
        await dbService.savePortalSetting("portal_zalo_url", "https://zalo.me/0333333333");
        await dbService.savePortalSetting("portal_facebook_url", "https://facebook.com/suoilu");
        await dbService.savePortalSetting("portal_website_url", "https://suoilu.db.edu.vn");
        await dbService.savePortalSetting("portal_news_source_url", "https://suoilu.db.edu.vn");
        alert("Đã đặt lại toàn bộ cấu hình hiển thị và đồng bộ về mặc định thành công.");
      } catch (err: any) {
        alert("Lỗi khi đặt lại cấu hình trên Supabase: " + err.message);
      } finally {
        setAuthIsLoading(false);
      }
    }
  };

  // ==================== CLASS MANAGEMENT FUNCTIONS ====================
  const handleSaveClass = async () => {
    setClassFormError("");
    const cleanClassName = classFormName.trim();
    if (!cleanClassName) {
      setClassFormError("Vui lòng điền Tên lớp học (Ví dụ: 9A3)");
      return;
    }

    // Check for duplicates
    const duplicate = classes.find(c => c.className.toLowerCase() === cleanClassName.toLowerCase() && c.id !== classFormId);
    if (duplicate) {
      setClassFormError(`Lớp học với tên "${cleanClassName}" đã tồn tại.`);
      return;
    }

    setAuthIsLoading(true);
    try {
      if (classFormId) {
        // Edit mode
        const originClass = classes.find(c => c.id === classFormId);
        const oldName = originClass ? originClass.className : "";
        
        const updatedClasses = classes.map(c => {
          if (c.id === classFormId) {
            return {
              ...c,
              className: cleanClassName,
              gradeLevel: classFormGrade,
              advisorName: classFormAdvisor,
              roomNumber: classFormRoom
            };
          }
          return c;
        });
        setClasses(updatedClasses);
        await dbService.saveClasses(updatedClasses);

        // Synchronize with students roster
        if (oldName && oldName !== cleanClassName) {
          const updatedStudents = await Promise.all(students.map(async (s) => {
            if (s.className === oldName) {
              const updatedS: Student = { ...s, className: cleanClassName, gradeLevel: classFormGrade };
              await dbService.upsertStudent(updatedS);
              return updatedS;
            }
            return s;
          }));
          setStudents(updatedStudents);
        } else {
          // If only grade level, advisorName or roomNumber changed, we can also update gradeLevel on students
          const updatedStudents = await Promise.all(students.map(async (s) => {
            if (s.className === cleanClassName && s.gradeLevel !== classFormGrade) {
              const updatedS: Student = { ...s, gradeLevel: classFormGrade };
              await dbService.upsertStudent(updatedS);
              return updatedS;
            }
            return s;
          }));
          setStudents(updatedStudents);
        }

        alert(`Đã cập nhật cấu hình lớp ${cleanClassName} và đồng bộ lên Supabase thành công!`);
        setClassFormId(null);
      } else {
        // Create mode
        const newClass: SchoolClass = {
          id: "class_" + Date.now(),
          className: cleanClassName,
          gradeLevel: classFormGrade,
          advisorName: classFormAdvisor,
          roomNumber: classFormRoom
        };
        const updatedClasses = [...classes, newClass];
        setClasses(updatedClasses);
        await dbService.saveClasses(updatedClasses);
        alert(`Đã thêm mới lớp học ${cleanClassName} và đồng bộ lên Supabase thành công!`);
      }
    } catch (err: any) {
      alert("Lỗi khi lưu lớp học lên Supabase: " + err.message);
    } finally {
      setAuthIsLoading(false);
    }

    // Reset form states
    setClassFormName("");
    setClassFormAdvisor("");
    setClassFormRoom("");
  };

  const handleStartEditClass = (c: SchoolClass) => {
    setClassFormId(c.id);
    setClassFormName(c.className);
    setClassFormGrade(c.gradeLevel);
    setClassFormAdvisor(c.advisorName || "");
    setClassFormRoom(c.roomNumber || "");
    setClassFormError("");
  };

  const handleCancelEditClass = () => {
    setClassFormId(null);
    setClassFormName("");
    setClassFormAdvisor("");
    setClassFormRoom("");
    setClassFormError("");
  };

  const handleDeleteClass = async (classId: string) => {
    const classToDel = classes.find(c => c.id === classId);
    if (!classToDel) return;

    const rosterCount = students.filter(s => s.className === classToDel.className).length;
    const confirmMsg = rosterCount > 0 
      ? `Bạn có chắc chắn muốn xóa lớp ${classToDel.className}? Lớp đang có ${rosterCount} học sinh. Xóa lớp sẽ đưa trạng thái lớp học của các học sinh này về trạng thái "Chưa xếp lớp".`
      : `Bạn có chắc chắn muốn xóa lớp ${classToDel.className} không?`;

    if (confirm(confirmMsg)) {
      setAuthIsLoading(true);
      try {
        const filteredClasses = classes.filter(c => c.id !== classId);
        setClasses(filteredClasses);
        await dbService.saveClasses(filteredClasses);
        await dbService.deleteClass(classId);

        if (rosterCount > 0) {
          const updatedStudents = await Promise.all(students.map(async (s) => {
            if (s.className === classToDel.className) {
              const updatedS: Student = { ...s, className: "" };
              await dbService.upsertStudent(updatedS);
              return updatedS;
            }
            return s;
          }));
          setStudents(updatedStudents);
          alert(`Đã xóa lớp học thành công và đồng bộ lên Supabase! ${rosterCount} học sinh liên quan đã được đưa về trạng thái "Chưa xếp lớp".`);
        } else {
          alert("Đã xóa lớp học thành công và đồng bộ lên Supabase!");
        }
      } catch (err: any) {
        alert("Lỗi khi đồng bộ xóa lớp lên Supabase: " + err.message);
      } finally {
        setAuthIsLoading(false);
      }
    }
  };

  const handleDeleteClassStudents = async (className: string) => {
    const rosterCount = students.filter(s => s.className === className).length;
    if (rosterCount === 0) {
      alert(`Lớp ${className} hiện không có học sinh nào để xóa.`);
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa HOÀN TOÀN danh sách gồm ${rosterCount} học sinh của lớp ${className}? \nHành động này sẽ XÓA VĨNH VIỄN toàn bộ hồ sơ điểm số của các học sinh này trên cả hệ thống và Supabase, và không thể khôi phục!`)) {
      setAuthIsLoading(true);
      try {
        const success = await dbService.deleteStudentsByClass(className);
        if (success) {
          setStudents(students.filter(s => s.className !== className));
          alert(`Đã xóa thành công toàn bộ danh sách gồm ${rosterCount} học sinh của lớp ${className}!`);
        } else {
          const dbErr = dbService.lastError ? `\n\nChi tiết lỗi từ Supabase: ${dbService.lastError}` : "";
          alert(`Có lỗi xảy ra khi xóa danh sách học sinh trên Supabase.${dbErr}`);
        }
      } catch (err: any) {
        alert("Lỗi khi xử lý xóa danh sách học sinh: " + err.message);
      } finally {
        setAuthIsLoading(false);
      }
    }
  };

  // Delete student
  const handleDeleteStudent = async (studentCode: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa học sinh có mã ${studentCode}?`)) {
      const res = await dbService.deleteStudent(studentCode);
      if (res) {
        setStudents(students.filter(s => s.studentCode !== studentCode));
      } else {
        const dbErr = dbService.lastError ? `\n\nChi tiết lỗi từ Supabase: ${dbService.lastError}` : "";
        alert(`Có lỗi xảy ra khi xóa học sinh.${dbErr}`);
      }
    }
  };

  // Student CRUD Operations
  const openStudentForm = (mode: "create" | "edit", student?: Student) => {
    setFormMode(mode);
    setFormError("");
    if (mode === "edit" && student) {
      setFormStudent({ ...student });
    } else {
      // Default template
      setFormStudent({
        id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
        studentCode: "037206" + Math.floor(100000 + Math.random() * 900000).toString(),
        fullName: "",
        dob: "",
        gender: "Nam",
        school: "Trường PTDTBT Tiểu Học và THCS Suối Lư",
        className: "9A1",
        gradeLevel: "9",
        academicYear: "2025-2026",
        academicGrade: "Khá",
        academicGradeHK1: "",
        academicGradeHK2: "",
        behaviorGrade: "Tốt",
        behaviorGradeHK1: "",
        behaviorGradeHK2: "",
        behaviorGradeSummer: "Không",
        daysAbsent: 0,
        daysAbsentUnexcused: 0,
        skippedPeriods: 0,
        distinction: "Không",
        notes: "Hoàn thành tốt nhiệm vụ học tập.",
        verificationToken: `VERIFY-NEW-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        subjects: [
          { subjectId: "toan", subjectName: "Toán học", isEvaluatedByScore: true, semester1: "", semester2: "", yearAvg: "" },
          { subjectId: "ly_dia", subjectName: "Lịch sử và Địa lí", isEvaluatedByScore: true, semester1: "", semester2: "", yearAvg: "" },
          { subjectId: "khtn", subjectName: "Khoa học tự nhiên", isEvaluatedByScore: true, semester1: "", semester2: "", yearAvg: "" },
          { subjectId: "tin", subjectName: "Tin học", isEvaluatedByScore: true, semester1: "", semester2: "", yearAvg: "" },
          { subjectId: "van", subjectName: "Ngữ văn", isEvaluatedByScore: true, semester1: "", semester2: "", yearAvg: "" },
          { subjectId: "anh", subjectName: "Ngoại ngữ", isEvaluatedByScore: true, semester1: "", semester2: "", yearAvg: "" },
          { subjectId: "gdcd", subjectName: "GDCD", isEvaluatedByScore: true, semester1: "", semester2: "", yearAvg: "" },
          { subjectId: "cong_nghe", subjectName: "Công nghệ", isEvaluatedByScore: true, semester1: "", semester2: "", yearAvg: "" },
          { subjectId: "the_duc", subjectName: "Giáo dục thể chất", isEvaluatedByScore: false, semester1: "", semester2: "", yearAvg: "" },
          { subjectId: "nghe_thuat", subjectName: "Nghệ thuật", isEvaluatedByScore: false, semester1: "", semester2: "", yearAvg: "" },
          { subjectId: "gd_dia_phuong", subjectName: "Nội dung giáo dục của địa phương", isEvaluatedByScore: false, semester1: "", semester2: "", yearAvg: "" },
          { subjectId: "trai_nghiem", subjectName: "Hoạt động trải nghiệm, hướng nghiệp", isEvaluatedByScore: false, semester1: "", semester2: "", yearAvg: "" },
        ]
      });
    }
    setIsFormOpen(true);
  };

  const handleSaveStudent = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!formStudent.studentCode || !formStudent.fullName) {
      setFormError("Vui lòng điền đầy đủ Mã học sinh và Họ và tên.");
      return;
    }

    if (!formStudent.className) {
      setFormError("Vui lòng chọn hoặc xếp lớp học cho học sinh.");
      return;
    }

    const cleanCode = formStudent.studentCode.trim().replace(/\s/g, "");
    if (!/^[0-9]{12}$/.test(cleanCode)) {
      setFormError("Mã học sinh phải nhập chính xác đúng 12 chữ số.");
      return;
    }

    /* 
    if (!formStudent.dob) {
      setFormError("Vui lòng điền Ngày sinh học sinh.");
      return;
    }

    const cleanDob = formStudent.dob.trim();
    const dobRegex = /^([0-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/[0-9]{4}$/;
    const alternativeDbRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/; // YYYY-MM-DD
    if (!dobRegex.test(cleanDob) && !alternativeDbRegex.test(cleanDob)) {
      setFormError("Ngày sinh phải đúng định dạng ngày/tháng/năm: DD/MM/YYYY (Ví dụ: 15/05/2011) hoặc YYYY-MM-DD.");
      return;
    }
    */
    const cleanDob = formStudent.dob ? formStudent.dob.trim() : "";

    const preparedSubjects = (formStudent.subjects || []).map(sub => {
      if (sub.isEvaluatedByScore) {
        const s1 = (sub.semester1 !== "" && sub.semester1 !== undefined) ? parseFloat(String(sub.semester1)) : null;
        const s2 = (sub.semester2 !== "" && sub.semester2 !== undefined) ? parseFloat(String(sub.semester2)) : null;
        let yAvg = (sub.yearAvg !== "" && sub.yearAvg !== undefined) ? parseFloat(String(sub.yearAvg)) : "";
        
        if (s1 !== null && s2 !== null && !isNaN(s1) && !isNaN(s2)) {
          yAvg = parseFloat(((s2 * 2 + s1) / 3).toFixed(1));
        }

        return {
          ...sub,
          semester1: s1 === null || isNaN(s1) ? "" : s1,
          semester2: s2 === null || isNaN(s2) ? "" : s2,
          yearAvg: yAvg !== "" && !isNaN(Number(yAvg)) ? Number(yAvg) : yAvg,
        };
      }
      return sub;
    });

    // Auto-calculate summary fields based on prepared subjects using centralized TT22 logic
    let academicGrade = formStudent.academicGrade || "Chưa đạt";
    let distinction = formStudent.distinction || "Không";
    const behaviorGrade = formStudent.behaviorGrade || "Tốt";

    const scoreSubjectsList = preparedSubjects.filter(s => s.isEvaluatedByScore);
    const commentSubjectsList = preparedSubjects.filter(s => !s.isEvaluatedByScore);

    const currentScores = scoreSubjectsList
      .map(s => typeof s.yearAvg === "number" ? s.yearAvg : null)
      .filter(v => v !== null) as number[];
    
    const currentComments = commentSubjectsList
      .map(s => (s.yearAvg === "Đạt" || s.yearAvg === "Chưa đạt") ? s.yearAvg : "Đạt") as string[];

    if (currentScores.length > 0 || currentComments.length > 0) {
        const calculatedGrade = evaluateTT22(currentScores, currentComments);
        if (calculatedGrade) academicGrade = calculatedGrade;

        distinction = evaluateDistinctionTT22(academicGrade, behaviorGrade, currentScores);
    }

    const preparedStudent = {
      ...formStudent,
      studentCode: cleanCode,
      dob: cleanDob,
      subjects: preparedSubjects,
      academicGrade,
      distinction
    };

    setIsSavingStudent(true);
    setFormError(""); // Reset any prior errors
    
    try {
      const dbPromise = dbService.upsertStudent(preparedStudent as Student);
      const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => {
        dbService.lastError = "Xử lý vượt quá thời gian tối đa (10 giây).";
        resolve(false);
      }, 10000));

      const success = await Promise.race([dbPromise, timeoutPromise]);
      
      if (success) {
        setIsFormOpen(false);
        setFormStudent({});
        await loadStudents(); // Refresh from DB
      } else {
        let rawErr = dbService.lastError || "Lỗi không xác định";
        let dbErr = typeof rawErr === 'string' ? rawErr : JSON.stringify(rawErr);
        
        if (dbErr.includes("Failed to fetch") || dbErr.includes("NetworkError")) {
          dbErr = "Lỗi kết nối máy chủ (Supabase). Vui lòng kiểm tra internet hoặc cấu hình API Key.";
        }
        setFormError(`Lỗi đồng bộ: ${dbErr}`);
        await loadStudents(); 
      }
    } catch (err: any) {
      console.error("Unhandled error when saving student:", err);
      setFormError(`Lỗi hệ thống: ${err?.message || "Không rõ nguyên nhân"}`);
    } finally {
      setIsSavingStudent(false);
    }
  };

  // Grade Edit Cells
  const startEditingGrade = (student: Student, subId: string) => {
    setEditingStudentCode(student.studentCode);
    setEditingSubjectId(subId);
    
    const sub = student.subjects.find(s => s.subjectId === subId);
    if (sub) {
      if (gradesTerm === "hk1") {
        setTempTx(sub.tx1 || "");
        setTempMid(sub.mid1 !== undefined && sub.mid1 !== null && sub.mid1 !== "" ? sub.mid1.toString() : "");
        setTempEnd(sub.end1 !== undefined && sub.end1 !== null && sub.end1 !== "" ? sub.end1.toString() : "");
        setTempGradeValue(sub.semester1 !== undefined && sub.semester1 !== null && sub.semester1 !== "" ? sub.semester1.toString() : "");
      } else if (gradesTerm === "hk2") {
        setTempTx(sub.tx2 || "");
        setTempMid(sub.mid2 !== undefined && sub.mid2 !== null && sub.mid2 !== "" ? sub.mid2.toString() : "");
        setTempEnd(sub.end2 !== undefined && sub.end2 !== null && sub.end2 !== "" ? sub.end2.toString() : "");
        setTempGradeValue(sub.semester2 !== undefined && sub.semester2 !== null && sub.semester2 !== "" ? sub.semester2.toString() : "");
      } else {
        // canam
        setTempTx(sub.semester1 !== undefined && sub.semester1 !== null && sub.semester1 !== "" ? sub.semester1.toString() : "");
        setTempMid(sub.semester2 !== undefined && sub.semester2 !== null && sub.semester2 !== "" ? sub.semester2.toString() : "");
        setTempGradeValue(sub.yearAvg !== undefined && sub.yearAvg !== null && sub.yearAvg !== "" ? sub.yearAvg.toString() : "");
      }
    } else {
      setTempTx("");
      setTempMid("");
      setTempEnd("");
      setTempGradeValue("");
    }
  };

  const saveEditedGrade = async (student: Student) => {
    if (editingStudentCode && editingSubjectId) {
      const updatedSubjects = student.subjects.map(sub => {
        let updatedSub = { ...sub };
        if (sub.subjectId === editingSubjectId) {
          if (sub.isEvaluatedByScore) {
            const parseNum = (val: string): number | "" => {
              const cleaned = val.trim().replace(",", ".");
              if (!cleaned) return "";
              const num = parseFloat(cleaned);
              return isNaN(num) ? "" : num;
            };

            const parseTx = (val: string): string => {
              let str = val.trim();
              if (!str.includes(" ") && !str.includes(";")) {
                if ((str.match(/,/g) || []).length > 1) {
                  str = str.replace(/,/g, " ");
                } else if ((str.match(/\./g) || []).length > 1) {
                  str = str.replace(/\./g, " ");
                }
              }
              const parts = str.replace(/,/g, ".").split(/[\s;]+/).map(p => p.trim()).filter(Boolean);
              const validParts = parts.map(p => {
                const num = parseFloat(p);
                return isNaN(num) ? "" : num.toString();
              }).filter(Boolean);
              return validParts.join(" ");
            };

            if (gradesTerm === "hk1") {
              updatedSub.tx1 = parseTx(tempTx);
              updatedSub.mid1 = parseNum(tempMid);
              updatedSub.end1 = parseNum(tempEnd);
              updatedSub.semester1 = parseNum(tempGradeValue);
            } else if (gradesTerm === "hk2") {
              updatedSub.tx2 = parseTx(tempTx);
              updatedSub.mid2 = parseNum(tempMid);
              updatedSub.end2 = parseNum(tempEnd);
              updatedSub.semester2 = parseNum(tempGradeValue);
            } else {
              // canam
              updatedSub.semester1 = parseNum(tempTx);
              updatedSub.semester2 = parseNum(tempMid);
              updatedSub.yearAvg = parseNum(tempGradeValue);
            }
          } else {
            let cleanVal = "";
            const t = tempGradeValue.trim().toLowerCase();
            if (t === "đạt" || t === "dat" || t === "đ" || t === "d") cleanVal = "Đạt";
            else if (t === "chưa đạt" || t === "cd" || t.includes("chưa")) cleanVal = "Chưa đạt";
            
            const cleanComments = (val: string): string => {
              const parts = val.split(/[\s,;]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
              const cleaned = parts.map(p => {
                if (p === "đ" || p === "d" || p === "đạt" || p === "dat") return "Đ";
                if (p === "cd" || p === "cđ" || p === "chưa đạt" || p.includes("chưa") || p === "kđ" || p === "kd" || p === "không đạt" || p === "chua") return "CĐ";
                return "";
              }).filter(Boolean);
              return cleaned.join(" ");
            };

            if (gradesTerm === "hk1") {
              updatedSub.tx1 = cleanComments(tempTx);
              updatedSub.semester1 = cleanVal;
            } else if (gradesTerm === "hk2") {
              updatedSub.tx2 = cleanComments(tempTx);
              updatedSub.semester2 = cleanVal;
            } else {
              updatedSub.yearAvg = cleanVal;
            }
          }
        }

        // Re-calculate / Verify Annual Average for ALL subjects of this student whenever any grade is saved
        if (updatedSub.isEvaluatedByScore) {
          const s1 = typeof updatedSub.semester1 === "number" ? updatedSub.semester1 : null;
          const s2 = typeof updatedSub.semester2 === "number" ? updatedSub.semester2 : null;
          if (s1 !== null && s2 !== null) {
            updatedSub.yearAvg = parseFloat(((s2 * 2 + s1) / 3).toFixed(1));
          }
        } else {
          const s1 = updatedSub.semester1;
          const s2 = updatedSub.semester2;
          if (s1 === "Chưa đạt" || s2 === "Chưa đạt") {
            updatedSub.yearAvg = "Chưa đạt";
          } else if (s1 === "Đạt" && s2 === "Đạt") {
            updatedSub.yearAvg = "Đạt";
          }
        }
        return updatedSub;
      });

      // Compute overall average based on Year averages to maintain correct persistent annual state
      const scoreSubjects = updatedSubjects.filter(s => s.isEvaluatedByScore);
      const totalScore = scoreSubjects.reduce((sum, s) => sum + (typeof s.yearAvg === "number" ? s.yearAvg : 0), 0);
      const validScoreSubjects = scoreSubjects.filter(s => typeof s.yearAvg === "number");
      const newGpa = validScoreSubjects.length > 0 ? (totalScore / validScoreSubjects.length) : 0.0;

      let academicGrade: "Tốt" | "Khá" | "Đạt" | "Chưa đạt" | "" = student.academicGrade as any;
      let academicGradeHK1 = student.academicGradeHK1;
      let academicGradeHK2 = student.academicGradeHK2;
      
      const calculateTermGrade = (term: "hk1" | "hk2" | "canam") => {
        const termSubjects = updatedSubjects.filter(s => s.isEvaluatedByScore);
        const termScores = termSubjects.map(s => {
          if (term === "canam") {
             if (typeof s.semester1 === "number" && typeof s.semester2 === "number") {
                return parseFloat(((s.semester2 * 2 + s.semester1) / 3).toFixed(1));
             }
             return typeof s.yearAvg === "number" ? s.yearAvg : null;
          }
          return term === "hk1" ? s.semester1 : s.semester2;
        }).filter(v => typeof v === "number") as number[];
        
        const termComments = updatedSubjects.filter(s => !s.isEvaluatedByScore).map(s => {
          const val = term === "hk1" ? s.semester1 : term === "hk2" ? s.semester2 : s.yearAvg;
          return val === "Đạt" || val === "Chưa đạt" ? val : null;
        }).filter(v => v !== null) as string[];

        return evaluateTT22(termScores, termComments);
      };

      if (gradesTerm === "hk1") {
        const newHK1 = calculateTermGrade("hk1");
        if (newHK1) academicGradeHK1 = newHK1 as any;
      } else if (gradesTerm === "hk2") {
        const newHK2 = calculateTermGrade("hk2");
        if (newHK2) academicGradeHK2 = newHK2 as any;
      }

      // Check if student has NO scores at all (potentially exempt/disabled)
      const hasAnyScore = updatedSubjects.some(s => 
        (typeof s.semester1 === "number") || (typeof s.semester2 === "number") || (typeof s.yearAvg === "number") ||
        (s.semester1 === "Đạt" || s.semester1 === "Chưa đạt") ||
        (s.semester2 === "Đạt" || s.semester2 === "Chưa đạt") ||
        (s.yearAvg === "Đạt" || s.yearAvg === "Chưa đạt")
      );

      // Only recalculate overall year-end grade if we are in HK2 or All-Year editing mode AND they have results
      if (hasAnyScore && validScoreSubjects.length > 0 && gradesTerm !== "hk1") {
        const newCaNam = calculateTermGrade("canam");
        if (newCaNam) academicGrade = newCaNam as any;
      }

      const behaviorGrade = student.behaviorGrade;
      let distinction = student.distinction || "Không";
      
      if (academicGrade && behaviorGrade) {
        const yearScores = scoreSubjects.map(s => {
             if (typeof s.semester1 === "number" && typeof s.semester2 === "number") {
                return parseFloat(((s.semester2 * 2 + s.semester1) / 3).toFixed(1));
             }
             return typeof s.yearAvg === "number" ? s.yearAvg : 0;
        });
        distinction = evaluateDistinctionTT22(academicGrade, behaviorGrade, yearScores);
      }

      const updatedStudent: Student = {
        ...student,
        subjects: updatedSubjects,
        academicGrade,
        academicGradeHK1,
        academicGradeHK2,
        distinction: distinction as any
      };

      try {
        setIsSavingStudent(true);
        await dbService.upsertStudent(updatedStudent);
        setEditingStudentCode(null);
        setEditingSubjectId(null);
        await loadStudents();
      } catch (err) {
        console.error("Failed to save grade:", err);
        alert("Lỗi khi lưu điểm. Vui lòng thử lại.");
      } finally {
        setIsSavingStudent(false);
      }
    }
  };

  // Modularized parsing engine for both copy-paste and physical (.xlsx, .xls) file upload
  const parseDataAndPreview = (textToParse: string) => {
    if (!textToParse.trim()) {
      setImportStatus("Mời nhập/dán dữ liệu hoặc chọn tệp Excel trước.");
      setImportErrors([]);
      return;
    }

    // Safety check: ensure students list is loaded if we've been authenticated
    // This prevents overwriting existing data with partial rows due to failed merging
    if (isAuthenticated && !isInitialLoadDone) {
       loadStudents(); // Trigger a background refresh
       setImportStatus("Hệ thống đang tải lại danh sách học sinh từ máy chủ. Vui lòng đợi trong giây lát rồi thử lại để đảm bảo việc ghép điểm không bị lỗi.");
       return;
    }

    try {
      const lines = textToParse.split("\n");
      const parsedResults: Student[] = [];
      const targetClassObj = classes.find(c => c.className === importClass);
      const gradeLvl = targetClassObj?.gradeLevel || "9";
      const collectedErrors: string[] = [];

      const cleanSpaceSeparatedScores = (val: string): string => {
        if (!val) return "";
        let str = val.trim();
        if (!str.includes(" ") && !str.includes(";")) {
          if ((str.match(/,/g) || []).length > 1) {
            str = str.replace(/,/g, " ");
          } else if ((str.match(/\./g) || []).length > 1) {
            str = str.replace(/\./g, " ");
          }
        }
        const parts = str.replace(/,/g, ".").split(/[\s;]+/).map(p => p.trim()).filter(Boolean);
        const validParts = parts.map(p => {
          const num = parseFloat(p);
          return isNaN(num) ? "" : num.toString();
        }).filter(Boolean);
        return validParts.join(" ");
      };

      const cleanSpaceSeparatedComments = (val: string): string => {
        if (!val) return "";
        const parts = val.split(/[\s,;]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
        const cleanedParts = parts.map(p => {
          if (p === "đ" || p === "d" || p === "đạt" || p === "dat") return "Đ";
          if (p === "cd" || p === "cđ" || p === "chưa đạt" || p.includes("chưa") || p === "kđ" || p === "kd" || p === "không đạt" || p === "chua") return "CĐ";
          return "";
        }).filter(Boolean);
        return cleanedParts.join(" ");
      };

      // Detect and run specialized school card parser
      const isSchoolLayout = lines.some(line => line.includes("KẾT QUẢ HỌC TẬP") || line.includes("Họ và tên:") || line.includes("Mã HS :"));
      if (isSchoolLayout) {
        const rows = lines.map(line => line.split("\t"));
        const studentCardLocations: { r: number, c: number }[] = [];
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          for (let c = 0; c < row.length; c++) {
            const val = (row[c] || "").trim().toLowerCase();
            if (val === "họ và tên:" || val === "họ và tên" || val === "ho va ten:" || val === "ho va ten") {
              studentCardLocations.push({ r, c });
            }
          }
        }

        if (studentCardLocations.length > 0) {
          studentCardLocations.forEach(({ r, c }) => {
             // 1. Get full name
             let fullName = "";
             for (let offset = 1; offset <= 4; offset++) {
               const val = (rows[r]?.[c + offset] || "").trim();
               if (val && !val.toLowerCase().includes("lớp") && !val.toLowerCase().includes("lop")) {
                 fullName = val;
                 break;
               }
             }
             if (!fullName) return;

             // 2. Get class name
             let className = importClass;
             for (let col = c + 4; col < Math.min(c + 10, rows[r]?.length || 0); col++) {
               const cellVal = (rows[r]?.[col] || "").trim();
               if (cellVal.toLowerCase().includes("lớp") || cellVal.toLowerCase().includes("lop")) {
                 const classMatch = cellVal.match(/Lớp:\s*([A-Za-z0-9_-]+)/i) || cellVal.match(/Lớp\s*([A-Za-z0-9_-]+)/i) || cellVal.match(/Lop:\s*([A-Za-z0-9_-]+)/i) || cellVal.match(/Lop\s*([A-Za-z0-9_-]+)/i);
                 if (classMatch) {
                   className = classMatch[1].trim();
                   break;
                 }
               }
             }

             // 3. Student Code (Mã HS)
             let studentCode = "";
             let codeCellRow = r - 1;
             if (codeCellRow >= 0) {
               for (let col = c; col < Math.min(c + 4, rows[codeCellRow]?.length || 0); col++) {
                 const val = (rows[codeCellRow]?.[col] || "").trim();
                 if (val.toLowerCase().includes("mã hs") || val.toLowerCase().includes("ma hs")) {
                   for (let offset = 1; offset <= 3; offset++) {
                     const codeVal = (rows[codeCellRow]?.[col + offset] || "").trim();
                     if (codeVal && !codeVal.toLowerCase().includes("môn") && !codeVal.toLowerCase().includes("mon")) {
                       studentCode = codeVal.replace(/[^0-9A-Za-z-]/g, "").toUpperCase();
                       break;
                     }
                   }
                   break;
                 }
               }
             }

             const cleanString = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
             const rowNameClean = cleanString(fullName);
             const removeDiacritics = (str: string): string => {
               return str
                 .normalize("NFD")
                 .replace(/[\u0300-\u036f]/g, "")
                 .replace(/đ/g, "d")
                 .replace(/Đ/g, "D");
             };

             // Priority 1: Match by Student Code (CCCD) if we parsed it from this card
             let existing = students.find(
               s => studentCode && s.studentCode === studentCode
             );

             // Priority 2: Fallback to Name + Class matching
             if (!existing) {
               existing = students.find(
                 s => cleanString(s.fullName) === rowNameClean && 
                      s.className.trim().toUpperCase() === className.trim().toUpperCase()
               );
             }

             if (existing) {
               studentCode = existing.studentCode;
             } else if (!studentCode) {
               const cleanNameNoSign = removeDiacritics(fullName).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
               studentCode = `HS-${className.toUpperCase()}-${cleanNameNoSign}`;
             }

             // 4. Find headers to detect column offsets dynamically
             let headerR = r + 2;
             let colSubject = c + 1;
             let colTxStart = c + 2;
             let colMid = c + 3;
             let colEnd = c + 4;
             let colAvg = c + 5;
             
             for (let searchR = r; searchR <= Math.min(r + 8, rows.length - 1); searchR++) {
               const rowStr = rows[searchR]?.slice(Math.max(0, c - 2), c + 15).join(" ").toLowerCase() || "";
               if (rowStr.includes("môn") || rowStr.includes("mon") || rowStr.includes("đđgtx") || rowStr.includes("đđggk") || rowStr.includes("tx")) {
                 headerR = searchR;
                 let foundSubj = false, foundTx = false, foundMid = false, foundEnd = false, foundAvg = false;
                 for (let col = Math.max(0, c - 2); col <= Math.min(c + 20, rows[searchR]?.length - 1 || 0); col++) {
                   const hVal = (rows[searchR]?.[col] || "").trim().toLowerCase();
                   if (hVal && (hVal.includes("môn") || hVal === "môn học") && !foundSubj) { colSubject = col; foundSubj = true; }
                   else if (hVal && (hVal.includes("tx") || hVal === "đđgtx") && !foundTx) { colTxStart = col; foundTx = true; }
                   else if (hVal && (hVal.includes("gk") || hVal === "đđggk") && !foundMid) { colMid = col; foundMid = true; }
                   else if (hVal && (hVal.includes("ck") || hVal === "đđgck") && !foundEnd) { colEnd = col; foundEnd = true; }
                   else if (hVal && (hVal.includes("tb") || hVal === "đtb" || hVal.includes("tbm")) && !foundAvg) { colAvg = col; foundAvg = true; }
                 }
                 break;
               }
             }

             // 4b. Parse bottom stats
             let parsedAcad = '';
             let parsedBehav = '';
             let parsedAbsent = 0;
             let parsedAbsentUnexcused = 0;
             let parsedSkippedPeriods = 0;

             for (let b = r + 14; b <= Math.min(r + 30, rows.length - 1); b++) {
               const rowText = (rows[b] || []).slice(c, c + 15).join(' ').toLowerCase();
               
               const acadMatch = rowText.match(/đánh giá kq học tập:\s*(tốt|khá|đạt|chưa đạt|t|k|đ|cd|cđ)/i) || rowText.match(/kqht:\s*(tốt|khá|đạt|chưa đạt|t|k|đ|cd|cđ)/i);
               if (acadMatch) {
                 const v = acadMatch[1].trim().toLowerCase();
                 if (v === 't' || v === 'tốt') parsedAcad = 'Tốt';
                 else if (v === 'k' || v === 'khá') parsedAcad = 'Khá';
                 else if (v === 'đ' || v === 'đạt') parsedAcad = 'Đạt';
                 else if (v === 'cd' || v === 'cđ' || v.includes('chưa')) parsedAcad = 'Chưa đạt';
               }

               const behavMatch = rowText.match(/đánh giá kq rèn luyện:\s*(tốt|khá|đạt|chưa đạt|t|k|đ|cd|cđ)/i) || rowText.match(/kqrl:\s*(tốt|khá|đạt|chưa đạt|t|k|đ|cd|cđ)/i);
               if (behavMatch) {
                 const v = behavMatch[1].trim().toLowerCase();
                 if (v === 't' || v === 'tốt') parsedBehav = 'Tốt';
                 else if (v === 'k' || v === 'khá') parsedBehav = 'Khá';
                 else if (v === 'đ' || v === 'đạt') parsedBehav = 'Đạt';
                 else if (v === 'cd' || v === 'cđ' || v.includes('chưa')) parsedBehav = 'Chưa đạt';
               }

               const absentMatch = rowText.match(/số ngày nghỉ học:\s*(\d+)/i) || rowText.match(/vắng:\s*(\d+)\s*\(?phép\)?/i);
               if (absentMatch) {
                 parsedAbsent = parseInt(absentMatch[1], 10);
               }

               const absentKpMatch = rowText.match(/số ngày nghỉ học k.?p.?:\s*(\d+)/i) || rowText.match(/không phép:\s*(\d+)/i) || rowText.match(/vắng:[^\d]*\d+\s*\(?phép\)?\s*(\d+)\s*\(?không\)?/i);
               if (absentKpMatch) {
                 parsedAbsentUnexcused = parseInt(absentKpMatch[1], 10);
               }

               const skippedMatch = rowText.match(/bỏ tiết:\s*(\d+)/i) || rowText.match(/số tiết bỏ:\s*(\d+)/i);
               if (skippedMatch) {
                 parsedSkippedPeriods = parseInt(skippedMatch[1], 10);
               }
             }

             // 5. Parse subjects
             const cardSubjects: SubjectResult[] = [
               { subjectId: "toan", subjectName: "Toán học", isEvaluatedByScore: true },
               { subjectId: "ly_dia", subjectName: "Lịch sử và Địa lí", isEvaluatedByScore: true },
               { subjectId: "khtn", subjectName: "Khoa học tự nhiên", isEvaluatedByScore: true },
               { subjectId: "tin", subjectName: "Tin học", isEvaluatedByScore: true },
               { subjectId: "van", subjectName: "Ngữ văn", isEvaluatedByScore: true },
               { subjectId: "anh", subjectName: "Ngoại ngữ", isEvaluatedByScore: true },
               { subjectId: "gdcd", subjectName: "GDCD", isEvaluatedByScore: true },
               { subjectId: "cong_nghe", subjectName: "Công nghệ", isEvaluatedByScore: true },
               { subjectId: "the_duc", subjectName: "Giáo dục thể chất", isEvaluatedByScore: false },
               { subjectId: "nghe_thuat", subjectName: "Nghệ thuật", isEvaluatedByScore: false },
               { subjectId: "gd_dia_phuong", subjectName: "Nội dung giáo dục của địa phương", isEvaluatedByScore: false },
               { subjectId: "trai_nghiem", subjectName: "Hoạt động trải nghiệm, hướng nghiệp", isEvaluatedByScore: false }
             ].map((def, idx) => {
               const existingSub = existing ? existing.subjects.find(s => s.subjectId === def.subjectId) : null;
               const targetSub = { ...def, ...existingSub };

               let rowIdx = headerR + 1 + idx;
               let excelSubjName = (rows[rowIdx]?.[colSubject] || "").trim();
               if (!excelSubjName.toLowerCase().includes(def.subjectName.toLowerCase().slice(0, 4))) {
                 let foundRow = -1;
                 const keywords = def.subjectId === "toan" ? ["toán"] :
                                  def.subjectId === "ly_dia" ? ["sử", "lịch sử", "địa"] :
                                  def.subjectId === "khtn" ? ["khtn", "khoa học"] :
                                  def.subjectId === "tin" ? ["tin học", "tin"] :
                                  def.subjectId === "van" ? ["văn", "ngữ văn"] :
                                  def.subjectId === "anh" ? ["anh", "ngoại ngữ"] :
                                  def.subjectId === "gdcd" ? ["gdcd", "công dân"] :
                                  def.subjectId === "cong_nghe" ? ["công nghệ"] :
                                  def.subjectId === "the_duc" ? ["thể chất"] :
                                  def.subjectId === "nghe_thuat" ? ["nghệ thuật"] :
                                  def.subjectId === "gd_dia_phuong" ? ["địa phương"] :
                                  def.subjectId === "trai_nghiem" ? ["trải nghiệm"] :
                                  [def.subjectName.toLowerCase().slice(0, 4)];
                 for (let searchR = headerR + 1; searchR <= Math.min(headerR + 20, rows.length - 1); searchR++) {
                   const cellName = (rows[searchR]?.[colSubject] || "").trim().toLowerCase();
                   if (keywords.some(k => cellName.includes(k))) {
                     foundRow = searchR;
                     break;
                   }
                 }
                 if (foundRow !== -1) {
                   rowIdx = foundRow;
                 }
               }

               const txVals = [];
               for(let t = colTxStart; t < colMid; t++) {
                 const v = (rows[rowIdx]?.[t] || "").trim();
                 if (v) txVals.push(v);
               }
               
               const txVal = txVals.join(" ");
               const midVal = (rows[rowIdx]?.[colMid] || "").trim();
               const endVal = (rows[rowIdx]?.[colEnd] || "").trim();
               const avgVal = (rows[rowIdx]?.[colAvg] || "").trim();

               const parseScore = (val: string): number | "" => {
                 if (!val || val === "-" || val === "—" || val === "_" || val === "...") return "";
                 const cl = val.replace(",", ".");
                 const parsed = parseFloat(cl);
                 return isNaN(parsed) ? "" : parsed;
               };

               const parseComment = (val: string): "Đạt" | "Chưa đạt" | "" => {
                 if (!val || val === "-" || val === "—" || val === "_" || val === "...") return "";
                 const cl = val.trim().toLowerCase();
                 if (cl.includes(" ") || cl.includes(",") || cl.includes(";")) {
                   const parts = cl.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean);
                   if (parts.length > 0) {
                     const hasChuaDat = parts.some(p => p === "cd" || p === "cđ" || p === "chưa đạt" || p.includes("chưa") || p === "kđ" || p === "kd" || p === "không đạt" || p === "chua");
                     const hasDat = parts.some(p => p === "đ" || p === "d" || p === "đạt" || p === "dat" || p === "k" || p === "t" || p === "tb");
                     if (hasChuaDat) return "Chưa đạt";
                     if (hasDat) return "Đạt";
                   }
                 }
                 if (cl === "đ" || cl === "d" || cl === "đạt" || cl === "dat") return "Đạt";
                 if (cl === "cd" || cl === "cđ" || cl === "chưa đạt" || cl.includes("chưa") || cl === "kđ" || cl === "kd" || cl === "không đạt" || cl === "chua") return "Chưa đạt";
                 return "";
               };

               if (importTerm === "hk1") {
                 if (def.isEvaluatedByScore) {
                   if (txVal) targetSub.tx1 = cleanSpaceSeparatedScores(txVal);
                   const mVal = parseScore(midVal);
                   if (mVal !== "") targetSub.mid1 = mVal;
                   const eVal = parseScore(endVal);
                   if (eVal !== "") targetSub.end1 = eVal;
                   const aVal = parseScore(avgVal);
                   if (aVal !== "") targetSub.semester1 = aVal;
                 } else {
                   if (txVal) targetSub.tx1 = cleanSpaceSeparatedComments(txVal);
                   const commM = parseComment(midVal);
                   if (commM) targetSub.mid1 = commM;
                   const commE = parseComment(endVal);
                   if (commE) targetSub.end1 = commE;
                   const comm = parseComment(avgVal) || parseComment(txVal);
                   if (comm) targetSub.semester1 = comm;
                 }
               } else if (importTerm === "hk2") {
                 if (def.isEvaluatedByScore) {
                   if (txVal) targetSub.tx2 = cleanSpaceSeparatedScores(txVal);
                   const mVal = parseScore(midVal);
                   if (mVal !== "") targetSub.mid2 = mVal;
                   const eVal = parseScore(endVal);
                   if (eVal !== "") targetSub.end2 = eVal;
                   const aVal = parseScore(avgVal);
                   if (aVal !== "") targetSub.semester2 = aVal;
                 } else {
                   if (txVal) targetSub.tx2 = cleanSpaceSeparatedComments(txVal);
                   const commM = parseComment(midVal);
                   if (commM) targetSub.mid2 = commM;
                   const commE = parseComment(endVal);
                   if (commE) targetSub.end2 = commE;
                   const comm = parseComment(avgVal) || parseComment(txVal);
                   if (comm) targetSub.semester2 = comm;
                 }
               } else if (importTerm === "canam") {
                 if (def.isEvaluatedByScore) {
                   const h1Val = parseScore(txVal);
                   if (h1Val !== "") targetSub.semester1 = h1Val;
                   const h2Val = parseScore(midVal);
                   if (h2Val !== "") targetSub.semester2 = h2Val;
                   const yVal = parseScore(avgVal);
                   if (yVal !== "") targetSub.yearAvg = yVal;
                 } else {
                   const comm1 = parseComment(txVal) || txVal;
                   if (comm1) targetSub.semester1 = comm1;
                   const comm2 = parseComment(midVal) || midVal;
                   if (comm2) targetSub.semester2 = comm2;
                   const commY = parseComment(avgVal) || avgVal;
                   if (commY) targetSub.yearAvg = commY;
                 }
               }

               // Year Average formulation
               if (def.isEvaluatedByScore) {
                 const s1 = typeof targetSub.semester1 === "number" ? targetSub.semester1 : null;
                 const s2 = typeof targetSub.semester2 === "number" ? targetSub.semester2 : null;
                 if (importTerm !== "canam") {
                   if (s1 !== null && s2 !== null) {
                     targetSub.yearAvg = parseFloat(((s2 * 2 + s1) / 3).toFixed(1));
                   }
                 }
               } else {
                 const s1 = targetSub.semester1;
                 const s2 = targetSub.semester2;
                 if (importTerm !== "canam") {
                   if (s1 === "Chưa đạt" || s2 === "Chưa đạt") {
                     targetSub.yearAvg = "Chưa đạt";
                   } else if (s1 === "Đạt" && s2 === "Đạt") {
                     targetSub.yearAvg = "Đạt";
                   }
                 }
               }

               return targetSub;
             });

             // 5. Parse Academic / Behavior ratings & Attendance
             let academicGrade = existing?.academicGrade || "";
             let academicGradeHK1 = existing?.academicGradeHK1 || "";
             let academicGradeHK2 = existing?.academicGradeHK2 || "";
             
             let behaviorGrade = existing?.behaviorGrade || "Tốt";
             let behaviorGradeHK1 = existing?.behaviorGradeHK1 || "";
             let behaviorGradeHK2 = existing?.behaviorGradeHK2 || "";
             
             let behaviorGradeSummer = existing?.behaviorGradeSummer || "Không";
             let daysAbsent = existing?.daysAbsent || 0;
             let daysAbsentUnexcused = existing?.daysAbsentUnexcused || 0;
             let skippedPeriods = existing?.skippedPeriods || 0;
             let distinction = existing?.distinction || "Không";
             let notes = existing?.notes || "Nhập từ học bạ gốc";

             if (parsedAcad) {
               if (importTerm === "hk1") {
                 academicGradeHK1 = parsedAcad as any;
                 academicGrade = parsedAcad as any;
               } else if (importTerm === "hk2") {
                 academicGradeHK2 = parsedAcad as any;
                 academicGrade = parsedAcad as any;
               } else {
                 academicGrade = parsedAcad as any;
               }
             }

             if (parsedBehav) {
               if (importTerm === "hk1") {
                 behaviorGradeHK1 = parsedBehav as any;
                 behaviorGrade = parsedBehav as any;
               } else if (importTerm === "hk2") {
                 behaviorGradeHK2 = parsedBehav as any;
                 behaviorGrade = parsedBehav as any;
               } else {
                 behaviorGrade = parsedBehav as any;
               }
             }

             if (parsedAbsent) daysAbsent = parsedAbsent;
             if (parsedAbsentUnexcused) daysAbsentUnexcused = parsedAbsentUnexcused;
             if (parsedSkippedPeriods) skippedPeriods = parsedSkippedPeriods;
             
             // Force recalculate academic grade if scores are present
             if (!parsedAcad && cardSubjects.length > 0) {
               const termScores = cardSubjects
                 .filter(s => s.isEvaluatedByScore)
                 .map(s => {
                   const val = importTerm === "hk1" ? s.semester1 : importTerm === "hk2" ? s.semester2 : s.yearAvg;
                   return typeof val === "number" ? val : null;
                 })
                 .filter(v => v !== null) as number[];
               const termComments = cardSubjects
                 .filter(s => !s.isEvaluatedByScore)
                 .map(s => {
                   const val = importTerm === "hk1" ? s.semester1 : importTerm === "hk2" ? s.semester2 : s.yearAvg;
                   return (val === "Đạt" || val === "Chưa đạt") ? val : null;
                 })
                 .filter(v => v !== null) as string[];
               
               const calculatedAcad = evaluateTT22(termScores, termComments);
               if (calculatedAcad) {
                 academicGrade = calculatedAcad;
                 if (importTerm === "hk1") {
                   academicGradeHK1 = calculatedAcad;
                 } else if (importTerm === "hk2") {
                   academicGradeHK2 = calculatedAcad;
                 }
               }
             }

             // Academic Distinction Auto Evaluation
             const hasAnyScore = cardSubjects.some(s => 
               (typeof s.semester1 === "number") || (typeof s.semester2 === "number") || (typeof s.yearAvg === "number") ||
               (s.semester1 === "Đạt" || s.semester1 === "Chưa đạt")
             );

             if (hasAnyScore) {
               const validScores = cardSubjects.filter(s => s.isEvaluatedByScore && typeof s.yearAvg === "number");
               if (validScores.length > 0) {
                 const num9Plus = cardSubjects.filter(s => s.isEvaluatedByScore && typeof s.yearAvg === "number" && (s.yearAvg as number) >= 9.0).length;
                 if (academicGrade === "Tốt" && behaviorGrade === "Tốt") {
                   distinction = num9Plus >= 6 ? "Học sinh Xuất sắc" : "Học sinh Giỏi";
                 } else {
                   distinction = "Không";
                 }
               }
             }

             parsedResults.push({
               ...existing, // Preserve all existing fields (id, teacher, school, etc.)
               id: existing?.id || `student_${studentCode}`,
               studentCode: existing?.studentCode || studentCode,
               fullName,
               dob: existing?.dob || "",
               gender: existing?.gender || "Nam",
               school: existing?.school || "Trường PTDTBT Tiểu Học và THCS Suối Lư",
               className: className,
               gradeLevel: (targetClassObj?.gradeLevel || "9") as any,
               academicYear: existing?.academicYear || "2025-2026",
               academicGrade,
               academicGradeHK1,
               academicGradeHK2,
               behaviorGrade,
               behaviorGradeHK1,
               behaviorGradeHK2,
               behaviorGradeSummer,
               daysAbsent,
               daysAbsentUnexcused,
               skippedPeriods,
               distinction,
               notes,
               verificationToken: existing?.verificationToken || `VERIFY-CCCD-${studentCode}-${className}`,
               subjects: cardSubjects
             });
          });

          if (parsedResults.length > 0) {
            parsedResults.sort((a, b) => compareVietnameseNames(a.fullName, b.fullName));
            setImportPreview(parsedResults);
            setImportStatus(`Phân tích thành công ${parsedResults.length} phiếu học bạ cá nhân của lớp ${importClass} (${importTerm === "hk1" ? "Học kỳ I" : importTerm === "hk2" ? "Học kỳ II" : "Cả năm"}).`);
            setImportErrors([]);
            return;
          }
        }
      }

      // Default column indexes matching template structure
      let cccdCol = 1;
      let nameCol = 2;
      let dobCol = 3;

      const subjCols: { [subjectId: string]: number } = {
        toan: 4, ly_dia: 5, khtn: 6, tin: 7, van: 8, anh: 9, gdcd: 10, cong_nghe: 11,
        the_duc: 12, nghe_thuat: 13, gd_dia_phuong: 14, trai_nghiem: 15
      };

      let academicCol = 16;
      let behaviorCol = 17;
      let behaviorSummerCol = importTerm === "canam" ? 18 : -1;
      let absentPCol = importTerm === "canam" ? 19 : 18;
      let absentKCol = importTerm === "canam" ? 20 : 19;
      let skippedPeriodsCol = importTerm === "canam" ? 21 : 20;
      let distinctionCol = importTerm === "canam" ? 22 : -1;
      let notesCol = importTerm === "canam" ? 23 : 21;

      // Identify header line index dynamically to protect against cell shifts
      let headerLineIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split("\t");
        const hasName = parts.some(p => p.toLowerCase().includes("họ và tên") || p.toLowerCase().includes("họ tên") || p.toLowerCase().includes("tên"));
        const hasCccd = parts.some(p => p.toLowerCase().includes("cccd") || p.toLowerCase().includes("căn cước") || p.toLowerCase().includes("mã") || p.toLowerCase().includes(" định danh") || p.toLowerCase().includes("chữ số"));
        if (hasName && hasCccd) {
          headerLineIdx = i;
          break;
        }
      }

      if (headerLineIdx !== -1) {
        const headerParts = lines[headerLineIdx].split("\t").map(p => p.trim().toLowerCase());
        
        const cccdIdx = headerParts.findIndex(p => p.includes("cccd") || p.includes("căn cước") || p.includes("mã") || p.includes("định danh") || p.includes("chữ số"));
        if (cccdIdx !== -1) cccdCol = cccdIdx;

        const nameIdx = headerParts.findIndex(p => p.includes("họ và tên") || p.includes("họ tên") || p.includes(" tên") || p === "tên");
        if (nameIdx !== -1) nameCol = nameIdx;

        const dobIdx = headerParts.findIndex(p => p.includes("ngày sinh") || p.includes("gày sinh") || p.includes("dob"));
        if (dobIdx !== -1) dobCol = dobIdx;

        // Find subjects
        const subjectsMapping = [
          { id: "toan", keywords: ["toán", "toán học", "math", "mon toan", "toan"] },
          { id: "ly_dia", keywords: ["lịch sử và địa", "sử địa", "sử & địa", "lịch sử", "địa lý", "địa lí", "ly_dia", "sử và địa", "sử", "địa", "sửđịa"] },
          { id: "khtn", keywords: ["khoa học tự nhiên", "khtn", "tự nhiên", "khoa học", "khoahọctựnhiên"] },
          { id: "tin", keywords: ["tin học", "tin", "cntt", "tin hoc", "tinhọc"] },
          { id: "van", keywords: ["ngữ văn", "văn", "ngữ văn học", "tiếng việt", "mon van", "ngữvăn"] },
          { id: "anh", keywords: ["ngoại ngữ", "tiếng anh", "anh", "english", "anh văn", "n.ngữ", "ngoạingữ", "tiếnganh"] },
          { id: "gdcd", keywords: ["gdcd", "giáo dục công dân", "gd công dân"] },
          { id: "cong_nghe", keywords: ["công nghệ", "kỹ thuật", "c.nghệ", "côngnghệ", "congnghe"] },
          { id: "the_duc", keywords: ["thể chất", "thể dục", "giáo dục thể chất", "thể dục thể thao", "gd tc", "gdtc", "thểchất"] },
          { id: "nghe_thuat", keywords: ["nghệ thuật", "âm nhạc", "mỹ thuật", "am nhac", "my thuat", "n.thuật", "n nghệ thuật", "nghệthuật"] },
          { id: "gd_dia_phuong", keywords: ["địa phương", "giáo dục địa phương", "gd địa phương", "nội dung giáo dục của địa phương", "gd đf", "địaphương"] },
          { id: "trai_nghiem", keywords: ["trải nghiệm", "hoạt động trải nghiệm", "hướng nghiệp", "trai nghiem", "hđtn", "trảinghiệm"] }
        ];

        subjectsMapping.forEach(sub => {
          // Find index excluding identity columns to prevent false positives (like CCCD matching "công dân")
          const idx = headerParts.findIndex((p, pIdx) => 
            pIdx !== cccdCol && pIdx !== nameCol && pIdx !== dobCol &&
            // Additional safety: skip columns that obviously look like identity data
            !p.includes("định danh") && !p.includes("căn cước") && !p.includes("cccd") && !p.includes("mã số") &&
            sub.keywords.some(kw => p.includes(kw))
          );
          if (idx !== -1) {
            subjCols[sub.id] = idx;
          }
        });

        const academicIdx = headerParts.findIndex(p => 
          p.includes("kết quả học tập") || p.includes("học lực") || p.includes("loại học tập") || 
          p.includes("kq học tập") || p.includes("kqht") || p === "học tập" || p.includes("h.tập") ||
          p.includes("xếp loại") || p.includes("xloại")
        );
        if (academicIdx !== -1) academicCol = academicIdx;

        const behaviorIdx = headerParts.findIndex(p => 
          p.includes("kết quả rèn luyện") || p.includes("hạnh kiểm") || p.includes("loại rèn luyện") || 
          p.includes("kq rèn luyện") || p.includes("kqrl") || p === "rèn luyện" || p.includes("r.luyện") ||
          p.includes("đạo đức") || p.includes("hạnh kiểm")
        );
        if (behaviorIdx !== -1) behaviorCol = behaviorIdx;

        const summerIdx = headerParts.findIndex(p => p.includes("sau hè") || p.includes("hè") || p.includes("sau he"));
        if (summerIdx !== -1) behaviorSummerCol = summerIdx;

        const dpIdx = headerParts.findIndex(p => (p.includes("vắng") || p.includes("nghỉ")) && (p.includes("phép") || p.includes("có phép")) && !p.includes("không"));
        if (dpIdx !== -1) absentPCol = dpIdx;

        const dkIdx = headerParts.findIndex(p => (p.includes("vắng") || p.includes("nghỉ")) && p.includes("không"));
        if (dkIdx !== -1) absentKCol = dkIdx;

        const skipIdx = headerParts.findIndex(p => p.includes("bỏ tiết") || p.includes("skipped") || p.includes("bỏ tiết"));
        if (skipIdx !== -1) skippedPeriodsCol = skipIdx;

        const distIdx = headerParts.findIndex(p => p.includes("danh hiệu") || p.includes("khen thưởng") || p.includes("tiêu biểu"));
        if (distIdx !== -1) distinctionCol = distIdx;

        const nIdx = headerParts.findIndex(p => p.includes("ghi chú") || p.includes("nhận xét") || p.includes("notes"));
        if (nIdx !== -1) notesCol = nIdx;
      }

      lines.forEach((line, idx) => {
        if (!line.trim()) return;
        
        // If this is the detected header line, skip it
        if (idx === headerLineIdx) return;

        const parts = line.split("\t");
        const rowNum = idx + 1;

        // Skip header row if matches STT, CCCD, Mã học sinh
        if (parts.length >= 2) {
          const rawCode = parts[1]?.trim() || "";
          if (rawCode === "Mã học sinh" || 
              rawCode === "Số CCCD" || 
              rawCode === "CCCD" ||
              rawCode === "Số căn cước công dân" ||
              rawCode.toLowerCase().includes("mã") || 
              rawCode.toLowerCase().includes("căn cước") || 
              rawCode.toLowerCase().includes("stt") ||
              rawCode === "12 số") {
            return;
          }
        }

        // We process rows with some integrity
        if (parts.length > nameCol && nameCol !== -1) {
          const rawCode = cccdCol !== -1 && cccdCol < parts.length ? parts[cccdCol]?.trim() || "" : "";
          const fullName = parts[nameCol]?.trim() || "";
          const dob = dobCol !== -1 && dobCol < parts.length ? parts[dobCol]?.trim() || "" : "";

          // Clean names checking for safe mapping
          const cleanString = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
          const rowNameClean = cleanString(fullName);
          const rowDobClean = dob.trim();

          const removeDiacritics = (str: string): string => {
            return str
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/đ/g, "d")
              .replace(/Đ/g, "D");
          };

          const rowClass = importClass;

          if (!fullName) {
            collectedErrors.push(`Dòng ${rowNum}: Chưa nhập họ tên của học sinh. Bỏ qua dòng này.`);
            return;
          }

          // Priority 1: Match by Student Code (CCCD) if provided in Excel
          const cleanedInputCode = rawCode.replace(/[^0-9A-Za-z-]/g, "").toUpperCase();
          let existing = students.find(
            s => cleanedInputCode && s.studentCode === cleanedInputCode
          );

          // Priority 2: Fallback to Name + Class matching
          if (!existing) {
            existing = students.find(
              s => cleanString(s.fullName) === rowNameClean && 
                   s.className.trim().toUpperCase() === rowClass.trim().toUpperCase()
            );
          }

          let studentCode = "";
          if (existing) {
            studentCode = existing.studentCode;
          } else if (cleanedInputCode) {
            studentCode = cleanedInputCode;
            if (studentCode.length === 11 && /^[0-9]+$/.test(studentCode)) {
              studentCode = "0" + studentCode;
            }
          } else {
            // Auto-generate standard deterministic student code based on name and class
            const cleanNameNoSign = removeDiacritics(fullName).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
            studentCode = `HS-${rowClass.toUpperCase()}-${cleanNameNoSign}`;
          }

          let finalDob = dob.trim();
          if (!finalDob) {
            finalDob = existing?.dateOfBirth || existing?.dob || "";
          } else {
            const dobRegex = /^([0-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/[0-9]{4}$/;
            const alternativeDbRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/; // YYYY-MM-DD
            if (finalDob !== "" && !dobRegex.test(finalDob) && !alternativeDbRegex.test(finalDob)) {
              collectedErrors.push(`Dòng ${rowNum} (${fullName}): Ngày sinh "${dob}" không đúng định dạng. Yêu cầu nhập DD/MM/YYYY (ví dụ: 15/05/2011) hoặc YYYY-MM-DD.`);
            }
          }

          // Subject score and grade validations
          const subjNames = [
            "Toán học", "Lịch sử và Địa lí", "Khoa học tự nhiên", "Tin học", "Ngữ văn", "Ngoại ngữ", "GDCD", "Công nghệ",
            "Giáo dục thể chất", "Nghệ thuật", "Nội dung giáo dục của địa phương", "Hoạt động trải nghiệm, hướng nghiệp"
          ];

          subjNames.forEach((sName, subIdx) => {
            const defSubjectId = ["toan", "ly_dia", "khtn", "tin", "van", "anh", "gdcd", "cong_nghe", "the_duc", "nghe_thuat", "gd_dia_phuong", "trai_nghiem"][subIdx];
            const colIndex = subjCols[defSubjectId] !== undefined ? subjCols[defSubjectId] : (4 + subIdx);
            const rawVal = colIndex < parts.length ? parts[colIndex]?.trim() || "" : "";
            
            // Treat isolated dashes as explicitly empty values to avoid numeric errors
            const isExplicitPlaceholder = rawVal === "-" || rawVal === "—" || rawVal === "_";

            if (subIdx < 8) {
              // Evaluated by float score
              if (rawVal && !isExplicitPlaceholder) {
                const cleanRaw = rawVal.trim();
                if (/\s+/.test(cleanRaw)) {
                  const partsScore = cleanRaw.split(/\s+/).map(p => p.trim());
                  partsScore.forEach(pScore => {
                    const clean = pScore.replace(",", ".");
                    const parsed = parseFloat(clean);
                    if (isNaN(parsed) || parsed < 0 || parsed > 10) {
                      collectedErrors.push(`Dòng ${rowNum} (${fullName || "Học sinh"}): Điểm số môn ${sName} "${pScore}" trong chuỗi "${rawVal}" không hợp lệ (Phải từ 0 đến 10).`);
                    }
                  });
                } else {
                  const clean = rawVal.replace(",", ".");
                  const parsed = parseFloat(clean);
                  if (isNaN(parsed) || parsed < 0 || parsed > 10) {
                    collectedErrors.push(`Dòng ${rowNum} (${fullName || "Học sinh"}): Điểm số môn ${sName} "${rawVal}" không hợp lệ (Phải từ 0 đến 10).`);
                  }
                }
              }
            } else {
              // Evaluated by check comment "Đạt" or "Chưa đạt"
              if (rawVal && !isExplicitPlaceholder) {
                const cleanRaw = rawVal.trim();
                const comments = cleanRaw.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean);
                comments.forEach(comment => {
                  const cleanLower = comment.toLowerCase();
                  const isValidComment = 
                    cleanLower === "đạt" || cleanLower === "chưa đạt" || 
                    cleanLower === "đ" || cleanLower === "cd" || 
                    cleanLower === "cđ" || cleanLower === "d" || 
                    cleanLower === "dat" || cleanLower.includes("chưa") ||
                    cleanLower === "kđ" || cleanLower === "kd" || cleanLower === "không đạt" || cleanLower === "chua";
                  
                  if (!isValidComment) {
                    collectedErrors.push(`Dòng ${rowNum} (${fullName || "Học sinh"}): Nhận xét môn ${sName} "${comment}" không đúng chuẩn quy định (Nhập "Đ", "CĐ", "Đạt" hoặc "Chưa đạt").`);
                  }
                });
              }
            }
          });

          // Helper definitions
          const parseScore = (val: string): number | "" => {
            if (!val || val.trim() === "" || val.trim() === "-" || val.trim() === "—" || val.trim() === "_" || val.trim() === "...") return "";
            const clean = val.trim().replace(",", ".");
            const parsed = parseFloat(clean);
            return isNaN(parsed) ? "" : parsed;
          };

          const parseComment = (val: string): "Đạt" | "Chưa đạt" | "" => {
            if (!val || val.trim() === "" || val.trim() === "-" || val.trim() === "—" || val.trim() === "_" || val.trim() === "...") return "";
            const clean = val?.trim()?.toLowerCase() || "";
            // Priority: shorthand checks
            if (clean === "đ" || clean === "d" || clean === "đạt" || clean === "dat") {
              return "Đạt";
            }
            if (clean === "cđ" || clean === "cd" || clean === "chưa đạt" || clean.includes("chưa")) {
              return "Chưa đạt";
            }
            return "";
          };

          const parseAcademic = (val: string): "Tốt" | "Khá" | "Đạt" | "Chưa đạt" | "" => {
            const clean = val?.trim()?.toLowerCase() || "";
            if (!clean || clean === "-" || clean === "—" || clean === "_") return "";
            if (clean.includes("tốt") || clean.includes("giỏi") || clean === "t" || clean === "g") return "Tốt";
            if (clean.includes("khá") || clean === "k") return "Khá";
            if (clean.includes("trung bình") || clean === "tb" || clean.includes("đạt")) {
               if (clean.includes("chưa đạt")) return "Chưa đạt";
               return "Đạt";
            }
            if (clean.includes("chưa đạt") || clean === "cd" || clean === "cđ" || clean.includes("chưa")) return "Chưa đạt";
            if (clean.includes("đạt") || clean === "đ" || clean === "d") return "Đạt";
            // Check for explicit "Chưa" or failing indicators if no other match
            if (clean.length > 0 && (clean.includes("yếu") || clean.includes("kém"))) return "Chưa đạt";
            return "";
          };

          const parseBehavior = (val: string): "Tốt" | "Khá" | "Đạt" | "Chưa đạt" | "" => {
            const clean = val?.trim()?.toLowerCase() || "";
            if (!clean || clean === "-" || clean === "—" || clean === "_") return "";
            if (clean.includes("tốt") || clean === "t") return "Tốt";
            if (clean.includes("khá") || clean === "k") return "Khá";
            if (clean.includes("trung bình") || clean === "tb" || clean.includes("đạt")) {
               if (clean.includes("chưa đạt")) return "Chưa đạt";
               return "Đạt";
            }
            if (clean.includes("chưa đạt") || clean === "cd" || clean === "cđ" || clean.includes("chưa")) return "Chưa đạt";
            if (clean.includes("đạt") || clean === "đ" || clean === "d") return "Đạt";
            return "";
          };

          const parseDistinction = (val: string): "Học sinh Xuất sắc" | "Học sinh Giỏi" | "Không" | "" => {
            const clean = val?.trim()?.toLowerCase() || "";
            if (!clean || clean === "-" || clean === "—" || clean === "_") return "";
            if (clean.includes("xuất sắc") || clean.includes("xs")) return "Học sinh Xuất sắc";
            if (clean.includes("giỏi") || clean.includes("g")) return "Học sinh Giỏi";
            if (clean.includes("không") || clean === "k") return "Không";
            return "";
          };

          // Student matching has already been computed cleanly based on Name and Class above
          // Build/Merge Subjects list with absolute cell alignment
          const mockSubjects: SubjectResult[] = [
            { subjectId: "toan", subjectName: "Toán học", isEvaluatedByScore: true },
            { subjectId: "ly_dia", subjectName: "Lịch sử và Địa lí", isEvaluatedByScore: true },
            { subjectId: "khtn", subjectName: "Khoa học tự nhiên", isEvaluatedByScore: true },
            { subjectId: "tin", subjectName: "Tin học", isEvaluatedByScore: true },
            { subjectId: "van", subjectName: "Ngữ văn", isEvaluatedByScore: true },
            { subjectId: "anh", subjectName: "Ngoại ngữ", isEvaluatedByScore: true },
            { subjectId: "gdcd", subjectName: "GDCD", isEvaluatedByScore: true },
            { subjectId: "cong_nghe", subjectName: "Công nghệ", isEvaluatedByScore: true },
            { subjectId: "the_duc", subjectName: "Giáo dục thể chất", isEvaluatedByScore: false },
            { subjectId: "nghe_thuat", subjectName: "Nghệ thuật", isEvaluatedByScore: false },
            { subjectId: "gd_dia_phuong", subjectName: "Nội dung giáo dục của địa phương", isEvaluatedByScore: false },
            { subjectId: "trai_nghiem", subjectName: "Hoạt động trải nghiệm, hướng nghiệp", isEvaluatedByScore: false }
          ].map(def => {
            const existingSub = existing ? existing.subjects.find(s => s.subjectId === def.subjectId) : null;
            const targetSub = { ...def, ...existingSub };

            // Find matching index in columns
            const colIndex = subjCols[def.subjectId] !== undefined ? subjCols[def.subjectId] : -1;
            const rawVal = colIndex !== -1 && colIndex < parts.length ? parts[colIndex]?.trim() || "" : "";
            
            const isPlaceholder = rawVal === "-" || rawVal === "—" || rawVal === "_" || rawVal === "...";

            if (rawVal !== "" && !isPlaceholder) {
              if (def.isEvaluatedByScore) {
                let txVal: string = "";
                let midVal: number | "" = "";
                let endVal: number | "" = "";
                let avgVal: number | "" = "";

                if (rawVal.includes("/") || rawVal.includes(";")) {
                  const partsScore = rawVal.split(/[\/;]/).map(p => p.trim());
                  if (partsScore.length >= 1) {
                    txVal = cleanSpaceSeparatedScores(partsScore[0]);
                  }
                  if (partsScore.length >= 2) {
                    const parsedMid = parseFloat(partsScore[1].replace(",", "."));
                    midVal = isNaN(parsedMid) ? "" : parsedMid;
                  }
                  if (partsScore.length >= 3) {
                    const parsedEnd = parseFloat(partsScore[2].replace(",", "."));
                    endVal = isNaN(parsedEnd) ? "" : parsedEnd;
                  }
                  if (partsScore.length >= 4) {
                    const parsedAvg = parseFloat(partsScore[3].replace(",", "."));
                    avgVal = isNaN(parsedAvg) ? "" : parsedAvg;
                  } else {
                    // Auto calculate average
                    if (txVal && midVal !== "" && endVal !== "") {
                      const txParts = txVal.split(/\s+/).map(p => parseFloat(p.replace(",", "."))).filter(num => !isNaN(num));
                      if (txParts.length > 0) {
                        const sumTx = txParts.reduce((sum, val) => sum + val, 0);
                        avgVal = parseFloat(((sumTx + (midVal as number) * 2 + (endVal as number) * 3) / (txParts.length + 5)).toFixed(1));
                      } else {
                        avgVal = parseFloat((((midVal as number) * 2 + (endVal as number) * 3) / 5).toFixed(1));
                      }
                    } else if (midVal !== "") {
                      avgVal = midVal;
                    } else if (endVal !== "") {
                      avgVal = endVal;
                    }
                  }
                } else {
                  const cleanRaw = rawVal.trim();
                  const hasSpaces = /\s+/.test(cleanRaw);
                  if (hasSpaces) {
                    txVal = cleanSpaceSeparatedScores(cleanRaw);
                  } else {
                    const score = parseScore(rawVal);
                    if (score !== "") {
                      avgVal = score;
                      midVal = score;
                      endVal = score;
                      txVal = score.toString();
                    }
                  }
                }

                if (avgVal !== "" || txVal !== "") {
                  if (importTerm === "hk1") {
                    if (txVal) targetSub.tx1 = txVal;
                    if (midVal !== "") targetSub.mid1 = midVal;
                    if (endVal !== "") targetSub.end1 = endVal;
                    if (avgVal !== "") targetSub.semester1 = avgVal;
                  } else if (importTerm === "hk2") {
                    if (txVal) targetSub.tx2 = txVal;
                    if (midVal !== "") targetSub.mid2 = midVal;
                    if (endVal !== "") targetSub.end2 = endVal;
                    if (avgVal !== "") targetSub.semester2 = avgVal;
                  } else {
                    if (avgVal !== "") targetSub.yearAvg = avgVal;
                  }
                }
              } else {
                const cleanRaw = rawVal.trim();
                const hasSpaces = /\s+/.test(cleanRaw);
                if (hasSpaces) {
                  if (importTerm === "hk1") {
                    targetSub.tx1 = cleanSpaceSeparatedComments(cleanRaw);
                    const comm = parseComment(cleanRaw);
                    if (comm) targetSub.semester1 = comm;
                  } else if (importTerm === "hk2") {
                    targetSub.tx2 = cleanSpaceSeparatedComments(cleanRaw);
                    const comm = parseComment(cleanRaw);
                    if (comm) targetSub.semester2 = comm;
                  }
                } else {
                  const comment = parseComment(rawVal);
                  if (comment !== "") {
                    if (importTerm === "hk1") {
                      targetSub.semester1 = comment;
                      targetSub.tx1 = "Đ";
                    } else if (importTerm === "hk2") {
                      targetSub.semester2 = comment;
                      targetSub.tx2 = "Đ";
                    } else {
                      targetSub.yearAvg = comment;
                    }
                  } else {
                    if (importTerm === "hk1") {
                      targetSub.tx1 = cleanSpaceSeparatedComments(cleanRaw);
                    } else if (importTerm === "hk2") {
                      targetSub.tx2 = cleanSpaceSeparatedComments(cleanRaw);
                    }
                  }
                }
              }
            }

            // Auto-calculate yearAvg ONLY if both semesters are available
            if (def.isEvaluatedByScore) {
              const s1 = typeof targetSub.semester1 === "number" ? targetSub.semester1 : null;
              const s2 = typeof targetSub.semester2 === "number" ? targetSub.semester2 : null;
              
              if (importTerm !== "canam") {
                if (s1 !== null && s2 !== null) {
                  targetSub.yearAvg = parseFloat(((s2 * 2 + s1) / 3).toFixed(1));
                }
              }
            } else {
               const s1 = targetSub.semester1;
               const s2 = targetSub.semester2;
               if (importTerm !== "canam") {
                 if (s1 === "Chưa đạt" || s2 === "Chưa đạt") {
                   targetSub.yearAvg = "Chưa đạt";
                 } else if (s1 === "Đạt" && s2 === "Đạt") {
                   targetSub.yearAvg = "Đạt";
                 }
               }
            }

            return targetSub;
          });

          // Overall attributes depending on selected Term
          let academicGrade: any = existing?.academicGrade || "";
          let academicGradeHK1: any = existing?.academicGradeHK1 || "";
          let academicGradeHK2: any = existing?.academicGradeHK2 || "";
          
          let behaviorGrade: any = existing?.behaviorGrade || "Tốt";
          let behaviorGradeHK1: any = existing?.behaviorGradeHK1 || "";
          let behaviorGradeHK2: any = existing?.behaviorGradeHK2 || "";
          
          let behaviorGradeSummer: any = existing?.behaviorGradeSummer || "Không";
          let daysAbsent = existing?.daysAbsent || 0;
          let daysAbsentUnexcused = existing?.daysAbsentUnexcused || 0;
          let skippedPeriods = existing?.skippedPeriods || 0;
          let distinction: any = existing?.distinction || "Không";
          let notes = existing?.notes || "";

          const academicVal = (academicCol !== -1 && academicCol < parts.length) ? (parts[academicCol] || "") : "";
          const behaviorVal = (behaviorCol !== -1 && behaviorCol < parts.length) ? (parts[behaviorCol] || "") : "";

          if (academicVal) {
            const cleanAc = academicVal.trim().toLowerCase();
            if (cleanAc !== "tốt" && cleanAc !== "khá" && cleanAc !== "đạt" && cleanAc !== "chưa đạt" && cleanAc !== "t" && cleanAc !== "k" && cleanAc !== "đ" && cleanAc !== "cd") {
              collectedErrors.push(`Dòng ${rowNum} (${fullName}): Học lực "${academicVal}" không hợp lệ (Phải là Tốt, Khá, Đạt hoặc Chưa đạt).`);
            }
          }

          if (behaviorVal) {
            const cleanBe = behaviorVal.trim().toLowerCase();
            if (cleanBe !== "tốt" && cleanBe !== "khá" && cleanBe !== "đạt" && cleanBe !== "chưa đạt" && cleanBe !== "t" && cleanBe !== "k" && cleanBe !== "đ" && cleanBe !== "cd") {
              collectedErrors.push(`Dòng ${rowNum} (${fullName}): Hạnh kiểm "${behaviorVal}" không hợp lệ (Phải là Tốt, Khá, Đạt hoặc Chưa đạt).`);
            }
          }

          if (importTerm === "hk1") {
            const ac = (academicCol !== -1 && academicCol < parts.length) ? parseAcademic(parts[academicCol]) : "";
            if (ac) {
              academicGradeHK1 = ac;
              // If only editing HK1, we might not want to overwrite academicGrade, 
              // but for backward compatibility we keep it.
              academicGrade = ac;
            }
            
            const be = (behaviorCol !== -1 && behaviorCol < parts.length) ? parseBehavior(parts[behaviorCol]) : "";
            if (be) {
              behaviorGradeHK1 = be;
              behaviorGrade = be;
            }
            
            daysAbsent = (absentPCol !== -1 && absentPCol < parts.length) ? (parseInt(parts[absentPCol]) || 0) : daysAbsent;
            daysAbsentUnexcused = (absentKCol !== -1 && absentKCol < parts.length) ? (parseInt(parts[absentKCol]) || 0) : daysAbsentUnexcused;
            skippedPeriods = (skippedPeriodsCol !== -1 && skippedPeriodsCol < parts.length) ? (parseInt(parts[skippedPeriodsCol]) || 0) : skippedPeriods;
            notes = (notesCol !== -1 && notesCol < parts.length) ? (parts[notesCol]?.trim() || "Nhập từ Excel HK1") : notes;
          } else if (importTerm === "hk2") {
            const ac = (academicCol !== -1 && academicCol < parts.length) ? parseAcademic(parts[academicCol]) : "";
            if (ac) {
              academicGradeHK2 = ac;
              academicGrade = ac;
            }
            
            const be = (behaviorCol !== -1 && behaviorCol < parts.length) ? parseBehavior(parts[behaviorCol]) : "";
            if (be) {
              behaviorGradeHK2 = be;
              behaviorGrade = be;
            }
            
            daysAbsent = (absentPCol !== -1 && absentPCol < parts.length) ? (parseInt(parts[absentPCol]) || 0) : daysAbsent;
            daysAbsentUnexcused = (absentKCol !== -1 && absentKCol < parts.length) ? (parseInt(parts[absentKCol]) || 0) : daysAbsentUnexcused;
            skippedPeriods = (skippedPeriodsCol !== -1 && skippedPeriodsCol < parts.length) ? (parseInt(parts[skippedPeriodsCol]) || 0) : skippedPeriods;
            notes = (notesCol !== -1 && notesCol < parts.length) ? (parts[notesCol]?.trim() || "Nhập từ Excel HK2") : notes;
          } else if (importTerm === "canam") {
            const ac = (academicCol !== -1 && academicCol < parts.length) ? parseAcademic(parts[academicCol]) : "";
            if (ac) academicGrade = ac;
            
            const be = (behaviorCol !== -1 && behaviorCol < parts.length) ? parseBehavior(parts[behaviorCol]) : "";
            if (be) behaviorGrade = be;
            
            behaviorGradeSummer = (behaviorSummerCol !== -1 && behaviorSummerCol < parts.length) ? (parseBehavior(parts[behaviorSummerCol]) as any || behaviorGradeSummer) : behaviorGradeSummer;
            daysAbsent = (absentPCol !== -1 && absentPCol < parts.length) ? (parseInt(parts[absentPCol]) || 0) : daysAbsent;
            daysAbsentUnexcused = (absentKCol !== -1 && absentKCol < parts.length) ? (parseInt(parts[absentKCol]) || 0) : daysAbsentUnexcused;
            skippedPeriods = (skippedPeriodsCol !== -1 && skippedPeriodsCol < parts.length) ? (parseInt(parts[skippedPeriodsCol]) || 0) : skippedPeriods;
            
            const di = (distinctionCol !== -1 && distinctionCol < parts.length) ? parseDistinction(parts[distinctionCol]) : "";
            if (di) distinction = di;
            
            notes = (notesCol !== -1 && notesCol < parts.length) ? (parts[notesCol]?.trim() || "Nhập từ Excel Cả năm") : notes;
          }

          // Finalizing overall summary if scores were updated but summary columns were empty
          // This ensures that importing sem2 scores updates the yearly result if not explicitly provided
          const validScoreSubjects = mockSubjects.filter(s => s.isEvaluatedByScore && typeof s.yearAvg === "number");
          const totalYearScore = validScoreSubjects.reduce((sum, s) => sum + (s.yearAvg as number), 0);
          const calculatedYearGpa = validScoreSubjects.length > 0 ? (totalYearScore / validScoreSubjects.length) : 0;
          
          // Check if there are ANY scores at all in this row (to identify exempt/disabled/empty rows)
          const hasAnyScoreInRow = mockSubjects.some(s => 
            (typeof s.semester1 === "number") || (typeof s.semester2 === "number") || (typeof s.yearAvg === "number") ||
            (s.semester1 === "Đạt" || s.semester1 === "Chưa đạt") ||
            (s.semester2 === "Đạt" || s.semester2 === "Chưa đạt") ||
            (s.yearAvg === "Đạt" || s.yearAvg === "Chưa đạt")
          );

          // Special handling for students without scores (Exempt/Disabled)
          if (!hasAnyScoreInRow) {
            academicGrade = "Chưa đạt"; // Default to lowest grade if no scores
            distinction = "Không";
            
            // If they are explicitly mentioned as exempt in notes, we can keep it as is but ensure no high honors
            if (notes.toLowerCase().includes("khuyết tật") || notes.toLowerCase().includes("miễn")) {
               // Stay as "Không"
            }
          } else {
            // Recalculate academic grade if scores are present
            if (!academicVal.trim() && validScoreSubjects.length > 0) {
               const currentScores = mockSubjects
                 .filter(s => s.isEvaluatedByScore)
                 .map(s => {
                   const val = importTerm === "hk1" ? s.semester1 : importTerm === "hk2" ? s.semester2 : s.yearAvg;
                   return typeof val === "number" ? val : null;
                 })
                 .filter(v => v !== null) as number[];
               const currentComments = mockSubjects
                 .filter(s => !s.isEvaluatedByScore)
                 .map(s => {
                   const val = importTerm === "hk1" ? s.semester1 : importTerm === "hk2" ? s.semester2 : s.yearAvg;
                   return (val === "Đạt" || val === "Chưa đạt") ? val : null;
                 })
                 .filter(v => v !== null) as string[];
               
               const calculatedAcad = evaluateTT22(currentScores, currentComments);
               if (calculatedAcad) {
                 academicGrade = calculatedAcad;
                 if (importTerm === "hk1") {
                   academicGradeHK1 = calculatedAcad;
                 } else if (importTerm === "hk2") {
                   academicGradeHK2 = calculatedAcad;
                 }
               }
            }

            const rawDistinctionVal = (distinctionCol !== -1 && distinctionCol < parts.length) ? (parts[distinctionCol] || "") : "";
            if (!rawDistinctionVal.trim() && (!distinction || distinction === "Không")) {
              const currentScores = mockSubjects
                .filter(s => s.isEvaluatedByScore && typeof s.yearAvg === "number")
                .map(s => s.yearAvg as number);
              distinction = evaluateDistinctionTT22(academicGrade, behaviorGrade, currentScores);
            } else if (academicGrade === "Khá" && (distinction === "Học sinh Giỏi" || distinction === "Học sinh Xuất sắc")) {
              // Forced correction for existing inconsistent data during import/update
              distinction = "Không";
            } else if ((academicGrade === "Đạt" || academicGrade === "Chưa đạt") && distinction !== "Không") {
              distinction = "Không";
            }
          }

          parsedResults.push({
            ...existing, // Preserve all existing fields
            id: existing?.id || `student_${studentCode}`,
            studentCode: existing?.studentCode || studentCode,
            fullName,
            dob: finalDob,
            gender: existing?.gender || "Nam",
            school: existing?.school || "Trường PTDTBT Tiểu Học và THCS Suối Lư",
            className: importClass,
            gradeLevel: gradeLvl as any,
            academicYear: existing?.academicYear || "2025-2026",
            academicGrade,
            academicGradeHK1,
            academicGradeHK2,
            behaviorGrade,
            behaviorGradeHK1,
            behaviorGradeHK2,
            behaviorGradeSummer,
            daysAbsent,
            daysAbsentUnexcused,
            skippedPeriods,
            distinction,
            notes,
            verificationToken: existing?.verificationToken || `VERIFY-CCCD-${studentCode}-${importClass}`,
            subjects: mockSubjects
          });
        }
      });

      setImportErrors(collectedErrors);

      if (parsedResults.length > 0) {
        // Sort alphabetically by full name (Vietnamese Standard)
        parsedResults.sort((a, b) => compareVietnameseNames(a.fullName, b.fullName));
        setImportPreview(parsedResults);
        let statusMsg = `Phân tích thành công ${parsedResults.length} dòng dữ liệu học sinh lớp ${importClass} (${importTerm === "hk1" ? "Học kỳ I" : importTerm === "hk2" ? "Học kỳ II" : "Cả năm"}).`;
        if (collectedErrors.length > 0) {
          statusMsg += ` Chú ý: Phát hiện ${collectedErrors.length} lỗi/cảnh báo định dạng. Xem chi tiết bên dưới.`;
        }
        setImportStatus(statusMsg);
      } else {
        setImportStatus("Không tìm thấy dòng dữ liệu hợp lệ. Vui lòng kiểm tra lại cấu trúc hàng cột.");
      }
    } catch (e: any) {
      setImportStatus("Lỗi phân tích: " + e.message);
    }
  };

  // Excel Copy-Paste Tabular Grid parser
  const handleParseExcelText = () => {
    parseDataAndPreview(importText);
  };

  // Generate and download a proper styled XLSX spreadsheet workbook pre-populated with currently enrolled student names so teachers don't have to re-type credentials
  const handleDownloadXlsxTemplate = () => {
    try {
      const termLabel = importTerm === "hk1" ? "HocKy1" : importTerm === "hk2" ? "HocKy2" : "CaNam";
      const enrolled = students.filter(s => s.className === importClass);
      
      const listToRender = enrolled.length > 0 ? enrolled : [
        {
          studentCode: "230793038",
          fullName: "Nguyễn Bảo An",
          className: importClass,
          subjects: [
            { subjectId: "toan", semester1: 9, semester2: 8, yearAvg: 8.1, tx1: "9 8 7 9", mid1: 8, end1: 8.0 },
            { subjectId: "ly_dia", semester1: 10, semester2: 9, yearAvg: 8.9, tx1: "10 9 9 8", mid1: 9.5, end1: 8.3 },
            { subjectId: "khtn", semester1: 9, semester2: 8, yearAvg: 8.1, tx1: "9 8 7 9", mid1: 10, end1: 6.5 },
            { subjectId: "tin", semester1: 9, semester2: 9, yearAvg: 8.8, tx1: "9 9", mid1: 9, end1: 8.5 },
            { subjectId: "van", semester1: 8.5, semester2: 7, yearAvg: 8.0, tx1: "8 5 7 9", mid1: 8, end1: 9.0 },
            { subjectId: "anh", semester1: 9, semester2: 8, yearAvg: 8.0, tx1: "9 8 8 8.5", mid1: 8.8, end1: 7.0 },
            { subjectId: "gdcd", semester1: 9, semester2: 8, yearAvg: 8.3, tx1: "9 8", mid1: 8, end1: 8.3 },
            { subjectId: "cong_nghe", semester1: 8, semester2: 9, yearAvg: 7.7, tx1: "8 9", mid1: 8, end1: 7.0 },
            { subjectId: "the_duc", semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" },
            { subjectId: "nghe_thuat", semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" },
            { subjectId: "gd_dia_phuong", semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" },
            { subjectId: "trai_nghiem", semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" }
          ],
          academicGrade: "Tốt",
          behaviorGrade: "Tốt",
          daysAbsent: 0,
          daysAbsentUnexcused: 0
        },
        {
          studentCode: "251486884",
          fullName: "Lô Thị Kỳ Anh",
          className: importClass,
          subjects: [
            { subjectId: "toan", semester1: 7, semester2: 7, yearAvg: 7.3, tx1: "7 7 6 8", mid1: 6.8, end1: 8.0 },
            { subjectId: "ly_dia", semester1: 7, semester2: 7, yearAvg: 7.2, tx1: "7 7 8 7", mid1: 7, end1: 7.3 },
            { subjectId: "khtn", semester1: 8, semester2: 8, yearAvg: 7.5, tx1: "8 8 9 8", mid1: 8.8, end1: 5.5 },
            { subjectId: "tin", semester1: 8, semester2: 7, yearAvg: 5.7, tx1: "8 7", mid1: 5, end1: 5.0 },
            { subjectId: "van", semester1: 9, semester2: 8, yearAvg: 7.2, tx1: "9 8 8 7", mid1: 9, end1: 5.0 },
            { subjectId: "anh", semester1: 9, semester2: 8, yearAvg: 8.0, tx1: "9 8 9 7", mid1: 8.5, end1: 7.3 },
            { subjectId: "gdcd", semester1: 8, semester2: 8, yearAvg: 7.8, tx1: "8 8", mid1: 8, end1: 7.5 },
            { subjectId: "cong_nghe", semester1: 6, semester2: 8, yearAvg: 6.8, tx1: "6 8", mid1: 7, end1: 6.5 },
            { subjectId: "the_duc", semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" },
            { subjectId: "nghe_thuat", semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" },
            { subjectId: "gd_dia_phuong", semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" },
            { subjectId: "trai_nghiem", semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" }
          ],
          academicGrade: "Khá",
          behaviorGrade: "Tốt",
          daysAbsent: 0,
          daysAbsentUnexcused: 0
        }
      ];

      const totalBlocks = Math.ceil(listToRender.length / 2);
      const rows: any[][] = [];

      // Initialize empty cells
      for (let r = 0; r < totalBlocks * 36; r++) {
        rows.push(Array(15).fill(""));
      }

      const topParts = headerTop.split("•").map(p => p.trim());
      const headerT1 = topParts[0] || "ỦY BAN NHÂN DÂN";
      const headerT2 = topParts[1] || "TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ";

      // Populate cards side-by-side (2 cards per block row)
      for (let i = 0; i < listToRender.length; i++) {
        const s = listToRender[i];
        const isRightCard = i % 2 !== 0;
        const blockIndex = Math.floor(i / 2);
        
        const colOffset = isRightCard ? 7 : 0;
        const rowOffset = blockIndex * 36;

        rows[rowOffset + 0][colOffset + 0] = headerT1;
        rows[rowOffset + 1][colOffset + 0] = headerT2;
        rows[rowOffset + 3][colOffset + 1] = "KẾT QUẢ HỌC TẬP";
        
        const termNameStr = importTerm === "hk1" ? "Học kỳ 1" : importTerm === "hk2" ? "Học kỳ 2" : "Cả năm";
        rows[rowOffset + 4][colOffset + 1] = `${termNameStr}, Năm học 2025 - 2026`;

        rows[rowOffset + 6][colOffset + 0] = "Mã HS :";
        rows[rowOffset + 6][colOffset + 2] = s.studentCode || "";

        rows[rowOffset + 7][colOffset + 0] = "Họ và tên:";
        rows[rowOffset + 7][colOffset + 2] = s.fullName || "";
        rows[rowOffset + 7][colOffset + 4] = "Lớp: " + (s.className || importClass);

        rows[rowOffset + 9][colOffset + 0] = "TT";
        rows[rowOffset + 9][colOffset + 1] = "Môn học";
        if (importTerm === "canam") {
          rows[rowOffset + 9][colOffset + 2] = "ĐTBmhk I";
          rows[rowOffset + 9][colOffset + 3] = "ĐTBmhk II";
          rows[rowOffset + 9][colOffset + 4] = "";
          rows[rowOffset + 9][colOffset + 5] = "ĐTBmcn";
        } else {
          rows[rowOffset + 9][colOffset + 2] = "ĐĐGtx";
          rows[rowOffset + 9][colOffset + 3] = "ĐĐGgk";
          rows[rowOffset + 9][colOffset + 4] = "ĐĐGck";
          rows[rowOffset + 9][colOffset + 5] = "TB";
        }

        const subDefs = [
          { id: "toan", name: "Toán học", isScore: true },
          { id: "ly_dia", name: "Lịch sử và Địa lí", isScore: true },
          { id: "khtn", name: "Khoa học tự nhiên", isScore: true },
          { id: "tin", name: "Tin học", isScore: true },
          { id: "van", name: "Ngữ văn", isScore: true },
          { id: "anh", name: "Ngoại ngữ", isScore: true },
          { id: "gdcd", name: "GDCD", isScore: true },
          { id: "cong_nghe", name: "Công nghệ", isScore: true },
          { id: "the_duc", name: "Giáo dục thể chất", isScore: false },
          { id: "nghe_thuat", name: "Nghệ thuật", isScore: false },
          { id: "gd_dia_phuong", name: "Nội dung giáo dục của địa phương", isScore: false },
          { id: "trai_nghiem", name: "Hoạt động trải nghiệm, hướng nghiệp", isScore: false }
        ];

        subDefs.forEach((def, subIdx) => {
          const sSub = s.subjects?.find(sub => sub.subjectId === def.id);
          const rI = rowOffset + 10 + subIdx;
          
          rows[rI][colOffset + 0] = subIdx + 1;
          rows[rI][colOffset + 1] = def.name;

          if (importTerm === "hk1") {
            if (def.isScore) {
              rows[rI][colOffset + 2] = sSub?.tx1 !== undefined ? sSub.tx1 : "";
              rows[rI][colOffset + 3] = sSub?.mid1 !== undefined ? sSub.mid1 : "";
              rows[rI][colOffset + 4] = sSub?.end1 !== undefined ? sSub.end1 : "";
              rows[rI][colOffset + 5] = sSub?.semester1 !== undefined ? sSub.semester1 : "";
            } else {
              const res = sSub?.semester1 || "Đạt";
              rows[rI][colOffset + 2] = res === "Đạt" ? "Đ" : "CĐ";
              rows[rI][colOffset + 3] = res === "Đạt" ? "Đ" : "CĐ";
              rows[rI][colOffset + 4] = res === "Đạt" ? "Đ" : "CĐ";
              rows[rI][colOffset + 5] = res === "Đạt" ? "Đ" : "CĐ";
            }
          } else if (importTerm === "hk2") {
            if (def.isScore) {
              rows[rI][colOffset + 2] = sSub?.tx2 !== undefined ? sSub.tx2 : "";
              rows[rI][colOffset + 3] = sSub?.mid2 !== undefined ? sSub.mid2 : "";
              rows[rI][colOffset + 4] = sSub?.end2 !== undefined ? sSub.end2 : "";
              rows[rI][colOffset + 5] = sSub?.semester2 !== undefined ? sSub.semester2 : "";
            } else {
              const res = sSub?.semester2 || "Đạt";
              rows[rI][colOffset + 2] = res === "Đạt" ? "Đ" : "CĐ";
              rows[rI][colOffset + 3] = res === "Đạt" ? "Đ" : "CĐ";
              rows[rI][colOffset + 4] = res === "Đạt" ? "Đ" : "CĐ";
              rows[rI][colOffset + 5] = res === "Đạt" ? "Đ" : "CĐ";
            }
          } else if (importTerm === "canam") {
            if (def.isScore) {
              rows[rI][colOffset + 2] = sSub?.semester1 !== undefined ? sSub.semester1 : "";
              rows[rI][colOffset + 3] = sSub?.semester2 !== undefined ? sSub.semester2 : "";
              rows[rI][colOffset + 4] = "";
              rows[rI][colOffset + 5] = sSub?.yearAvg !== undefined ? sSub.yearAvg : "";
            } else {
              const res1 = sSub?.semester1 || "Đạt";
              const res2 = sSub?.semester2 || "Đạt";
              const resY = sSub?.yearAvg || "Đạt";
              rows[rI][colOffset + 2] = res1 === "Đạt" ? "Đ" : "CĐ";
              rows[rI][colOffset + 3] = res2 === "Đạt" ? "Đ" : "CĐ";
              rows[rI][colOffset + 4] = "";
              rows[rI][colOffset + 5] = resY === "Đạt" ? "Đ" : "CĐ";
            }
          }
        });

        const currentAcad = s.academicGrade || "";
        const currentBehav = s.behaviorGrade || "Tốt";
        
        rows[rowOffset + 22][colOffset + 1] = `Đánh giá KQ học tập: ${currentAcad}`;
        rows[rowOffset + 22][colOffset + 3] = `Đánh giá KQ rèn luyện: ${currentBehav}`;
        
        rows[rowOffset + 23][colOffset + 1] = `Số ngày nghỉ học: ${s.daysAbsent || 0}`;
        rows[rowOffset + 23][colOffset + 3] = `K.p: ${s.daysAbsentUnexcused || 0}, Bỏ tiết: ${s.skippedPeriods || 0}`;

        rows[rowOffset + 25][colOffset + 1] = "Ý kiến của phụ huynh học sinh";
        rows[rowOffset + 25][colOffset + 3] = "Nhận xét của GVCN";
        
        // Blank spaces for signatures
        rows[rowOffset + 30][colOffset + 1] = ".......................................................";
        rows[rowOffset + 30][colOffset + 3] = ".......................................................";
        rows[rowOffset + 31][colOffset + 1] = ".......................................................";
        rows[rowOffset + 31][colOffset + 3] = ".......................................................";
        
        const teacherName = importTerm === "hk1" ? "Giáo viên chủ nhiệm" : "Giáo viên chủ nhiệm (ký, ghi rõ họ tên)";
        rows[rowOffset + 34][colOffset + 1] = "(Ký, ghi rõ họ tên)";
        rows[rowOffset + 34][colOffset + 3] = teacherName;
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Create cell merges to maintain high-fidelity school card look
      const merges: XLSX.Range[] = [];
      for (let b = 0; b < totalBlocks; b++) {
        const rOff = b * 36;
        for (const cOff of [0, 7]) {
          merges.push({ s: { r: rOff + 0, c: cOff }, e: { r: rOff + 0, c: cOff + 5 } });
          merges.push({ s: { r: rOff + 1, c: cOff }, e: { r: rOff + 1, c: cOff + 5 } });
          merges.push({ s: { r: rOff + 3, c: cOff + 1 }, e: { r: rOff + 3, c: cOff + 5 } });
          merges.push({ s: { r: rOff + 4, c: cOff + 1 }, e: { r: rOff + 4, c: cOff + 5 } });
          merges.push({ s: { r: rOff + 6, c: cOff + 2 }, e: { r: rOff + 6, c: cOff + 5 } });
          merges.push({ s: { r: rOff + 7, c: cOff + 2 }, e: { r: rOff + 7, c: cOff + 3 } });
          merges.push({ s: { r: rOff + 7, c: cOff + 4 }, e: { r: rOff + 7, c: cOff + 5 } });
          
          merges.push({ s: { r: rOff + 22, c: cOff + 1 }, e: { r: rOff + 22, c: cOff + 2 } });
          merges.push({ s: { r: rOff + 22, c: cOff + 3 }, e: { r: rOff + 22, c: cOff + 5 } });
          merges.push({ s: { r: rOff + 23, c: cOff + 1 }, e: { r: rOff + 23, c: cOff + 2 } });
          merges.push({ s: { r: rOff + 23, c: cOff + 3 }, e: { r: rOff + 23, c: cOff + 5 } });
          
          merges.push({ s: { r: rOff + 25, c: cOff + 1 }, e: { r: rOff + 25, c: cOff + 2 } });
          merges.push({ s: { r: rOff + 25, c: cOff + 3 }, e: { r: rOff + 25, c: cOff + 5 } });
          
          merges.push({ s: { r: rOff + 30, c: cOff + 1 }, e: { r: rOff + 30, c: cOff + 2 } });
          merges.push({ s: { r: rOff + 30, c: cOff + 3 }, e: { r: rOff + 30, c: cOff + 5 } });
          merges.push({ s: { r: rOff + 31, c: cOff + 1 }, e: { r: rOff + 31, c: cOff + 2 } });
          merges.push({ s: { r: rOff + 31, c: cOff + 3 }, e: { r: rOff + 31, c: cOff + 5 } });
          
          merges.push({ s: { r: rOff + 34, c: cOff + 1 }, e: { r: rOff + 34, c: cOff + 2 } });
          merges.push({ s: { r: rOff + 34, c: cOff + 3 }, e: { r: rOff + 34, c: cOff + 5 } });
        }
      }
      ws["!merges"] = merges;

      // Adjust column widths beautifully
      ws["!cols"] = [
        { wch: 6 },  // TT
        { wch: 20 }, // Môn học
        { wch: 10 }, // ĐĐGtx / ĐTBmhkI
        { wch: 10 }, // ĐĐGgk / ĐTBmhkII
        { wch: 10 }, // ĐĐGck / Empty
        { wch: 10 }, // TB / ĐTBmcn
        { wch: 6 },  // separator (G)
        { wch: 6 },  // TT (H)
        { wch: 20 }, // Môn học (I)
        { wch: 10 }, // ĐĐGtx (J)
        { wch: 10 }, // ĐĐGgk (K)
        { wch: 10 }, // ĐĐGck (L)
        { wch: 10 }, // TB (M)
        { wch: 6 }   // separator (N)
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `HocBa_${importClass}`);
      XLSX.writeFile(wb, `Mau_Hoc_Ba_Lop_${importClass}_${termLabel}.xlsx`);
      setImportStatus(`Đã kết xuất thành công tệp .xlsx mẫu học bạ song song khớp 100% hình gốc cho lớp ${importClass} (${importTerm === "hk1" ? "Học kỳ I" : importTerm === "hk2" ? "Học kỳ II" : "Cả năm"}).`);
    } catch (err: any) {
      console.error(err);
      setImportStatus("Lỗi xuất excel: " + err.message);
    }
  };

  // Upload and parse physical binary (.xlsx, .xls) files directly
  const handleUploadXlsx = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value to allow re-selecting the same file if needed
    e.target.value = "";

    setImportStatus(`Đang đọc tệp "${file.name}"...`);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) {
          setImportStatus("Mở tệp Excel thất bại, dữ liệu trống.");
          return;
        }

        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to arrays
        const rawJson = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rawJson.length <= 1) {
          setImportStatus("File Excel tải lên rỗng hoặc thiếu dòng tiêu đề.");
          return;
        }

        const formattedRows: string[] = [];
        rawJson.forEach((row, idx) => {
          if (idx === 0) {
            // Reconstruct original header cells exactly so the dynamic parser can read them
            const headerCells = Array.from(row).map(val => val === undefined || val === null ? "" : String(val).trim());
            formattedRows.push(headerCells.join("\t"));
            return;
          }

          // Force formatting each cell securely matching the actual row length
          const cells = Array.from({ length: row.length }, (_, cIdx) => {
            const val = row[cIdx];
            if (val === undefined || val === null) return "";
            return String(val).trim();
          });

          // Check if any significant info is present
          if (cells.some(c => c !== "")) {
            formattedRows.push(cells.join("\t"));
          }
        });

        const reconstructedText = formattedRows.join("\n");
        setImportText(reconstructedText);
        setImportStatus(`Tải tệp "${file.name}" thành công! Đã tự động kích hoạt bộ lọc xem trước.`);
        
        // Pipeline the reconstructed tabular data immediately into the preview parser!
        parseDataAndPreview(reconstructedText);
      } catch (err: any) {
        console.error("Reader XLSX failed:", err);
        setImportStatus("Lỗi khi phân tích tệp Excel: " + err.message);
      }
    };

    reader.onerror = () => {
      setImportStatus("Môi trường đọc file gặp lỗi hệ thống.");
    };

    reader.readAsArrayBuffer(file);
  };

  const handleRecalculateAll = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn TỰ ĐỘNG TÍNH LẠI kết quả học tập cho TẤT CẢ học sinh dựa trên điểm số hiện có? Thao tác này sẽ cập nhật lại Xếp loại và Danh hiệu theo đúng Thông tư 22.")) return;
    
    setAuthIsLoading(true);
    try {
      let updatedCount = 0;
      
      for (const student of students) {
        let hasChange = false;
        let updatedStudent = { ...student };
        
        // 1. First, recalculate yearAvg for all subjects if semester1 and semester2 exist
        const updatedSubjects = (student.subjects || []).map(subj => {
          if (subj.isEvaluatedByScore) {
            const s1 = typeof subj.semester1 === "number" ? subj.semester1 : null;
            const s2 = typeof subj.semester2 === "number" ? subj.semester2 : null;
            if (s1 !== null && s2 !== null) {
              const newYearAvg = parseFloat(((s1 + 2 * s2) / 3).toFixed(1));
              if (newYearAvg !== subj.yearAvg) {
                hasChange = true;
                return { ...subj, yearAvg: newYearAvg };
              }
            }
          } else {
            const s1 = subj.semester1;
            const s2 = subj.semester2;
            if (s1 && s2) {
              // For comments, usually Year = S2 if S2 is achieved
              const newYearAvg = s2 === "Đạt" ? "Đạt" : s2;
              if (newYearAvg !== subj.yearAvg) {
                hasChange = true;
                return { ...subj, yearAvg: newYearAvg };
              }
            }
          }
          return subj;
        });
        
        if (hasChange) updatedStudent.subjects = updatedSubjects;

        const scoreSubjects = updatedStudent.subjects.filter(s => s.isEvaluatedByScore);
        const commentSubjects = updatedStudent.subjects.filter(s => !s.isEvaluatedByScore);
        
        // Semester 1 Calculation
        const s1Scores = scoreSubjects.map(s => typeof s.semester1 === "number" ? s.semester1 : null).filter(v => v !== null) as number[];
        const s1Comments = commentSubjects.map(s => (s.semester1 === "Đạt" || s.semester1 === "Chưa đạt") ? s.semester1 : "Đạt") as string[];
        const calculatedHK1 = s1Scores.length > 0 ? evaluateTT22(s1Scores, s1Comments) : "";

        // Semester 2 Calculation
        const s2Scores = scoreSubjects.map(s => typeof s.semester2 === "number" ? s.semester2 : null).filter(v => v !== null) as number[];
        const s2Comments = commentSubjects.map(s => (s.semester2 === "Đạt" || s.semester2 === "Chưa đạt") ? s.semester2 : "Đạt") as string[];
        const calculatedHK2 = s2Scores.length > 0 ? evaluateTT22(s2Scores, s2Comments) : "";

        // Year Calculation
        const yearScores = scoreSubjects.map(s => typeof s.yearAvg === "number" ? s.yearAvg : null).filter(v => v !== null) as number[];
        const yearComments = commentSubjects.map(s => (s.yearAvg === "Đạt" || s.yearAvg === "Chưa đạt") ? s.yearAvg : "Đạt") as string[];
        let calculatedYearAcad = yearScores.length > 0 ? evaluateTT22(yearScores, yearComments) : "";

        // Applying the "S2 overrides Year if better" rule (Khoản 4 Điều 9 TT22)
        const levels: Record<string, number> = { "Tốt": 4, "Khá": 3, "Đạt": 2, "Chưa đạt": 1, "": 0 };
        if (levels[calculatedHK2] > levels[calculatedYearAcad]) {
          calculatedYearAcad = calculatedHK2;
        }

        if (calculatedHK1 !== student.academicGradeHK1) {
          updatedStudent.academicGradeHK1 = calculatedHK1;
          hasChange = true;
        }
        if (calculatedHK2 !== student.academicGradeHK2) {
          updatedStudent.academicGradeHK2 = calculatedHK2;
          hasChange = true;
        }

        const finalDistinction = evaluateDistinctionTT22(calculatedYearAcad, student.behaviorGrade, yearScores);

        if (calculatedYearAcad !== student.academicGrade || finalDistinction !== student.distinction) {
          updatedStudent.academicGrade = calculatedYearAcad;
          updatedStudent.distinction = finalDistinction as any;
          hasChange = true;
        }

        // Fix Behavior Grade if missing HK1
        if (!student.behaviorGradeHK1 && student.behaviorGradeHK2) {
          updatedStudent.behaviorGradeHK1 = ""; // Explicitly empty
          if (!student.behaviorGrade || student.behaviorGrade === "Chưa có") {
            updatedStudent.behaviorGrade = student.behaviorGradeHK2;
            hasChange = true;
          }
        }

        if (hasChange) {
          await dbService.upsertStudent(updatedStudent);
          updatedCount++;
        }
      }
      
      alert(`Hoàn thành! Đã cập nhật lại kết quả cho ${updatedCount} học sinh có sai lệch.`);
      loadStudents();
    } catch (err: any) {
      console.error("Recalculate error:", err);
      alert("Có lỗi xảy ra trong quá trình tính toán lại: " + (err.message || err));
    } finally {
      setAuthIsLoading(false);
    }
  };

  const handleApplyImport = async () => {
    if (importPreview.length === 0) return;
    setAuthIsLoading(true);
    let successfullySaved = 0;
    const errors: string[] = [];

    for (const student of importPreview) {
      const res = await dbService.upsertStudent(student);
      if (res) {
        successfullySaved++;
      } else {
        if (dbService.lastError) {
          errors.push(dbService.lastError);
        }
      }
    }
    setAuthIsLoading(false);

    if (successfullySaved === importPreview.length) {
      alert(`Hoàn thành! Đã nhập thành công ${successfullySaved} học sinh mới vào cơ sở dữ liệu học tịch.`);
    } else {
      const uniqueErrors = Array.from(new Set(errors));
      let specificTip = "Đảm bảo bạn đã cấu hình đúng kết nối trong tab Cấu hình hệ thống, và đã thực thi câu lệnh SQL khởi tạo bảng \"students\" trên Supabase Dashboard.";
      
      const errorMsgText = uniqueErrors.join(", ");
      if (errorMsgText.includes("column") || errorMsgText.includes("schema cache")) {
        let missingCol = "";
        if (errorMsgText.includes("'id'")) missingCol = "(cột 'id')";
        else if (errorMsgText.includes("'academic_grade'")) missingCol = "(cột 'academic_grade')";
        
        specificTip = `Hệ thống phát hiện Cấu trúc bảng Students của bạn đã CŨ hoặc thiếu cột ${missingCol}. \n\n👉 CÁCH SỬA: Bạn hãy vào tab 'Supabase & Database' trong Cài đặt, COPY đoạn mã ở phần "0. NÂNG CẤP BẢNG CŨ" và CHẠY trên SQL Editor của Supabase để cập nhật các cột còn thiếu, sau đó thử nhập lại.`;
      }

      const errorMsg = uniqueErrors.length > 0 ? `\nChi tiết lỗi từ Supabase: ${errorMsgText}` : "";
      alert(`Đăng ký không thành công trọn vẹn!\n- Đã nhập thành công: ${successfullySaved}/${importPreview.length} học sinh.${errorMsg}\n\nGợi ý khắc phục: ${specificTip}`);
    }

    setImportPreview([]);
    setImportErrors([]);
    setImportText("");
    loadStudents();
    setActiveTab("students");
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.className.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = selectedClass === "all" || student.className === selectedClass;
    const matchesGrade = selectedGrade === "all" || student.gradeLevel === selectedGrade;

    return matchesSearch && matchesClass && matchesGrade;
  }).sort((a, b) => {
    // Primary sort by Class Name
    const classCompare = (a.className || "").localeCompare(b.className || "", "vi");
    if (classCompare !== 0) return classCompare;
    
    // Secondary sort by Full Name (Vietnamese Standard)
    return compareVietnameseNames(a.fullName, b.fullName);
  });

  const uniqueClasses = Array.from(new Set(students.map(s => s.className)));

  // STATISTICS CALCULATOR
  const totalStudentsCount = students.length;
  const goodBehaviorCount = students.filter(s => s.behaviorGrade === "Tốt").length;
  const badBehaviorCount = students.filter(s => s.behaviorGrade === "Chưa đạt").length;
  
  const gotExcellentTitle = students.filter(s => {
    const scoredCount = (s.subjects || []).filter(sub => {
      const hasS1 = (typeof sub.semester1 === "number") || (sub.semester1 === "Đạt" || sub.semester1 === "Chưa đạt");
      const hasS2 = (typeof sub.semester2 === "number") || (sub.semester2 === "Đạt" || sub.semester2 === "Chưa đạt");
      const hasAvg = (typeof sub.yearAvg === "number") || (sub.yearAvg === "Đạt" || sub.yearAvg === "Chưa đạt");
      return hasS1 || hasS2 || hasAvg;
    }).length;
    if (scoredCount === 0) return false;
    return s.distinction === "Học sinh Xuất sắc";
  }).length;
  
  const gotGoodTitle = students.filter(s => {
    const scoredCount = (s.subjects || []).filter(sub => {
      const hasS1 = (typeof sub.semester1 === "number") || (sub.semester1 === "Đạt" || sub.semester1 === "Chưa đạt");
      const hasS2 = (typeof sub.semester2 === "number") || (sub.semester2 === "Đạt" || sub.semester2 === "Chưa đạt");
      const hasAvg = (typeof sub.yearAvg === "number") || (sub.yearAvg === "Đạt" || sub.yearAvg === "Chưa đạt");
      return hasS1 || hasS2 || hasAvg;
    }).length;
    if (scoredCount === 0) return false;
    return s.distinction === "Học sinh Giỏi";
  }).length;
  
  const gotNoneTitle = students.length - gotExcellentTitle - gotGoodTitle;

  const academicTốtCount = students.filter(s => s.academicGrade === "Tốt").length;
  const academicKháCount = students.filter(s => s.academicGrade === "Khá").length;
  const academicĐạtCount = students.filter(s => s.academicGrade === "Đạt").length;
  const academicChuaDatCount = students.filter(s => s.academicGrade === "Chưa đạt").length;

  return (
    <div className="w-full min-h-screen bg-sky-50 flex flex-col" id="admin-dashboard-container">
      
      {/* Admin Logged-In Top Navigation Bar */}
      <nav className="bg-[#0055A5] text-white px-6 py-4 flex items-center justify-between border-b-2 border-amber-500 shadow-md">
        <div className="flex items-center gap-3">
          <School className="w-6 h-6 text-amber-400" />
          <div>
            <h2 className="text-base font-bold uppercase tracking-tight">Khu Vực Quản Lý Học Vụ & Học Tịch THCS</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-blue-200">
              <span className={`h-2.5 w-2.5 rounded-full ${supabaseStatus.isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
              <span>{supabaseStatus.mode}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToPortal}
            id="btn-back-to-portal"
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-300 font-medium transition cursor-pointer"
          >
            Về Cổng Tra Cứu
          </button>
          
          {isAuthenticated && (
            <button
              onClick={() => setIsAuthenticated(false)}
              id="btn-logout-admin"
              className="flex items-center gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" /> Đăng Xuất
            </button>
          )}
        </div>
      </nav>

      {/* Auth Screen (Login Screen) if not authenticated */}
      {!isAuthenticated ? (
        <div className="flex-1 flex items-center justify-center py-16 px-4 bg-sky-100">
          <div className="w-full max-w-md bg-white border border-sky-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="h-2 bg-[#E53935]" />
            <div className="p-6 md:p-8">
              
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center border border-rose-200 text-[#E53935]">
                  <Lock className="w-6 h-6" />
                </div>
              </div>

              <h2 className="text-lg font-black text-[#0055A5] uppercase text-center mb-1">
                Xét duyệt cán bộ học tịch
              </h2>
              <p className="text-xs text-slate-500 text-center mb-6">
                Nhập tài khoản định danh để thực hiện quản lý điểm số học bạ.
              </p>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Email hành chính (.vn)
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Ví dụ: admin@edu.vn"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-[#0055A5] bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Mật khẩu tác vụ
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Nhập mật khẩu tác vụ"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-[#0055A5] bg-slate-50 focus:bg-white"
                  />
                </div>

                {authError && (
                  <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded text-xs">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authIsLoading}
                  className="w-full bg-[#E53935] hover:bg-rose-700 text-white font-bold py-3 px-5 rounded-lg uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  {authIsLoading ? "Đang xác thực..." : "ĐĂNG NHẬP HỆ THỐNG"}
                </button>
              </form>

            </div>
          </div>
        </div>
      ) : (
        
        /* Logged In Dashboard Interface */
        <div className="flex-1 flex flex-col md:flex-row">
          
          {/* Left Tabbar rail */}
          <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-4 shrink-0 space-y-1.5 text-sm">
            <button
              onClick={() => setActiveTab("students")}
              className={`w-full flex items-center gap-2.5 font-bold px-4 py-2.5 rounded-lg text-left transition cursor-pointer ${
                activeTab === "students" ? "bg-[#0055A5]/10 text-[#0055A5]" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users className="w-4 h-4" /> Danh Sách Học Sinh
            </button>
            <button
              onClick={() => setActiveTab("grades")}
              className={`w-full flex items-center gap-2.5 font-bold px-4 py-2.5 rounded-lg text-left transition cursor-pointer ${
                activeTab === "grades" ? "bg-[#0055A5]/10 text-[#0055A5]" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Keyboard className="w-4 h-4" /> Bảng Sổ Điểm Nhanh
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`w-full flex items-center gap-2.5 font-bold px-4 py-2.5 rounded-lg text-left transition cursor-pointer ${
                activeTab === "import" ? "bg-[#0055A5]/10 text-[#0055A5]" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Upload className="w-4 h-4" /> Nhập Excel / CSV
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`w-full flex items-center gap-2.5 font-bold px-4 py-2.5 rounded-lg text-left transition cursor-pointer ${
                activeTab === "stats" ? "bg-[#0055A5]/10 text-[#0055A5]" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Thống Kê Học Vụ
            </button>
            <button
              onClick={() => setActiveTab("classes")}
              className={`w-full flex items-center gap-2.5 font-bold px-4 py-2.5 rounded-lg text-left transition cursor-pointer ${
                activeTab === "classes" ? "bg-[#0055A5]/10 text-[#0055A5]" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Layers className="w-4 h-4" /> Cấu hình lớp học
            </button>
            <button
              onClick={() => setActiveTab("supabase")}
              className={`w-full flex items-center gap-2.5 font-bold px-4 py-2.5 rounded-lg text-left transition cursor-pointer ${
                activeTab === "supabase" ? "bg-[#0055A5]/10 text-[#0055A5]" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Database className="w-4 h-4" /> Thiết lập Supabase
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-2.5 font-bold px-4 py-2.5 rounded-lg text-left transition cursor-pointer ${
                activeTab === "settings" ? "bg-[#0055A5]/10 text-[#0055A5]" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <School className="w-4 h-4" /> Cấu hình cổng tra cứu
            </button>

            <div className="pt-6 border-t border-slate-200 mt-6 space-y-2">
              <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Thao tác khẩn cấp
              </div>
              <button
                onClick={handleResetLocalDb}
                className="w-full text-xs font-semibold text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-lg text-left transition cursor-pointer"
              >
                Khôi Phục Dữ Liệu Mẫu
              </button>
              <button
                onClick={handleClearAllData}
                className="w-full text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-left transition cursor-pointer flex items-center gap-1.5 mt-1"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-650" />
                Xóa Sạch Lớp & Học Sinh
              </button>
            </div>
          </aside>

          {/* Right Main Dashboard screen */}
          <main className="flex-1 p-6 overflow-hidden">
            
            {/* TAB 1: STUDENTS LIST MANAGEMENT */}
            {activeTab === "students" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-slate-800">Quản Lý Thông Tin Học Sinh</h1>
                    <p className="text-xs text-slate-500">Chỉnh sửa hồ sơ, lý lịch trích ngang của học sinh trong trường</p>
                  </div>

                  <button
                    onClick={() => openStudentForm("create")}
                    id="btn-add-student"
                    className="flex items-center gap-1.5 bg-[#E53935] hover:bg-[#C62828] text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" /> Thêm Học Sinh Mới
                  </button>
                  
                  {selectedClass !== "all" && filteredStudents.length > 0 && (
                    <button
                      onClick={() => handleDeleteClassStudents(selectedClass)}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <UserX className="w-4 h-4" /> Xóa toàn bộ học sinh lớp {selectedClass}
                    </button>
                  )}

                  <button
                    onClick={handleSortStudentsABC}
                    className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <SortAsc className="w-4 h-4" /> Sắp xếp ABC
                  </button>

                  <button
                    onClick={handleRecalculateAll}
                    disabled={authIsLoading || students.length === 0}
                    className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <RefreshCw className={`w-4 h-4 ${authIsLoading ? "animate-spin" : ""}`} /> Tính lại KQHT (TT22)
                  </button>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white border rounded-lg p-4 flex flex-col sm:flex-row gap-3 items-center">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm theo mã học sinh, họ tên, lớp..."
                    className="w-full sm:flex-1 px-4 py-2 border rounded-lg text-xs text-slate-700 bg-slate-50 focus:ring-2 focus:ring-[#0055A5] outline-none"
                  />

                  <div className="flex gap-2 w-full sm:w-auto">
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="border text-xs px-3 py-2 rounded-lg text-slate-700 bg-white"
                    >
                      <option value="all">Tất cả lớp</option>
                      {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="border text-xs px-3 py-2 rounded-lg text-slate-700 bg-white"
                    >
                      <option value="all">Tất cả khối</option>
                      <option value="6">Khối 6</option>
                      <option value="7">Khối 7</option>
                      <option value="8">Khối 8</option>
                      <option value="9">Khối 9</option>
                    </select>
                  </div>
                </div>

                {/* Students Data Grid Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 uppercase border-b text-[10px] tracking-wider">
                          <th className="px-4 py-3 font-bold w-36">Mã học sinh</th>
                          <th className="px-4 py-3 font-bold">Họ tên học sinh</th>
                          <th className="px-4 py-3 font-bold w-16">Lớp</th>
                          <th className="px-4 py-3 font-bold w-20">Học lực</th>
                          <th className="px-4 py-3 font-bold w-20">Hạnh kiểm</th>
                          <th className="px-4 py-3 font-bold">Danh hiệu</th>
                          <th className="px-4 py-3 font-bold text-right pr-6 w-28">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map(student => (
                            <tr key={student.studentCode} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-3.5 font-mono font-bold text-blue-800">{student.studentCode}</td>
                              <td className="px-4 py-3.5 font-bold text-slate-900">{student.fullName}</td>
                              <td className="px-4 py-3.5 font-bold text-blue-900">{student.className}</td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  student.academicGrade === "Tốt" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                                  student.academicGrade === "Khá" ? "bg-blue-50 text-blue-800 border border-blue-200" :
                                  "bg-amber-50 text-amber-800 border"
                                }`}>
                                  {student.academicGrade}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  student.behaviorGrade === "Tốt" ? "bg-emerald-50 text-emerald-800 border" : "bg-blue-50 text-blue-800"
                                }`}>
                                  {student.behaviorGrade}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-semibold text-amber-700 text-[10px]">
                                {(() => {
                                  const hasAnyScore = (student.subjects || []).some(s => 
                                    (typeof s.semester1 === "number") || (typeof s.semester2 === "number") || (typeof s.yearAvg === "number") ||
                                    (s.semester1 === "Đạt" || s.semester1 === "Chưa đạt") ||
                                    (s.semester2 === "Đạt" || s.semester2 === "Chưa đạt") ||
                                    (s.yearAvg === "Đạt" || s.yearAvg === "Chưa đạt")
                                  );
                                  if (!hasAnyScore && (student.notes?.toLowerCase().includes("khuyết tật") || student.notes?.toLowerCase().includes("miễn"))) {
                                    return <span className="bg-slate-100 text-slate-500 border border-slate-300 px-2 py-0.5 rounded-full uppercase font-black text-[8px]">Khuyết tật (Miễn xét)</span>;
                                  }
                                  return student.distinction;
                                })()}
                              </td>
                              <td className="px-4 py-3.5 text-right pr-6">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => openStudentForm("edit", student)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                      title="Chỉnh sửa lý lịch & điểm số"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                      <span className="text-[10px] font-bold">Sửa</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStudent(student.studentCode)}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="Xóa học sinh"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                              Không tìm thấy học sinh nào phù hợp bộ lọc.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GRADES FAST TRANSCRIPT GRID */}
            {activeTab === "grades" && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Sổ Điểm Điện Tử Trực Quan</h1>
                  <p className="text-xs text-slate-500">
                    Nhấp trực tiếp vào ô điểm để sửa đổi cập nhật kết quả học tập của môn học theo học kỳ tương ứng. Hệ thống sẽ tự động tính toán lại Học lực & Danh hiệu.
                  </p>
                </div>

                <div className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
                  <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chọn Lớp Quản Lý</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="border text-xs px-3 py-2.5 rounded-lg text-slate-700 bg-white hover:border-slate-300 font-bold outline-none cursor-pointer w-full sm:w-48"
                    >
                      <option value="all">Hiển thị toàn trường</option>
                      {uniqueClasses.map(c => <option key={c} value={c}>Lớp {c}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Học Kỳ Khảo Sát</span>
                    <div className="flex bg-slate-100 p-1 rounded-lg border">
                      <button
                        onClick={() => {
                          setGradesTerm("hk1");
                          setEditingStudentCode(null);
                          setEditingSubjectId(null);
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          gradesTerm === "hk1"
                            ? "bg-[#0055A5] text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        Học kỳ I
                      </button>
                      <button
                        onClick={() => {
                          setGradesTerm("hk2");
                          setEditingStudentCode(null);
                          setEditingSubjectId(null);
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          gradesTerm === "hk2"
                            ? "bg-[#0055A5] text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        Học kỳ II
                      </button>
                      <button
                        onClick={() => {
                          setGradesTerm("canam");
                          setEditingStudentCode(null);
                          setEditingSubjectId(null);
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          gradesTerm === "canam"
                            ? "bg-[#0055A5] text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        Cả Năm
                      </button>
                    </div>
                  </div>
                </div>

                {/* Simple Multi-cell sheet */}
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 uppercase border-b text-[9px] text-slate-600 font-bold tracking-widest divide-x divide-slate-200">
                          <th className="px-4 py-3 w-40 sticky left-0 bg-white shadow-md z-10">Mã & Tên Học Sinh</th>
                          
                          {/* Score-based subjects */}
                          <th className="px-1 py-3 text-center w-20">Toán học<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-20">Lịch sử và Địa lí<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-20">Khoa học tự nhiên<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-20">Tin học<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-20">Ngữ văn<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-20">Ngoại ngữ<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-20">GDCD<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-20">Công nghệ<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>

                          {/* Comment-based subjects */}
                          <th className="px-1 py-3 text-center w-20">Giáo dục thể chất<div className="text-[7px] text-slate-400 font-normal method">(N.xét)</div></th>
                          <th className="px-1 py-3 text-center w-20">Nghệ thuật<div className="text-[7px] text-slate-400 font-normal method">(N.xét)</div></th>
                          <th className="px-1 py-3 text-center w-20">GD địa phương<div className="text-[7px] text-slate-400 font-normal method">(N.xét)</div></th>
                          <th className="px-1 py-3 text-center w-20">HĐ trải nghiệm, HN<div className="text-[7px] text-slate-400 font-normal method">(N.xét)</div></th>

                          <th className="px-3 py-3 text-center bg-slate-50 w-24">Kết Quả Chung</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(student => {
                          const getSubjectVal = (id: string) => student.subjects.find(s => s.subjectId === id);
                          
                          // Use stored Academic Grade depending on Term
                          const termAcademicGrade = gradesTerm === "hk1" ? student.academicGradeHK1 : gradesTerm === "hk2" ? student.academicGradeHK2 : student.academicGrade;

                          // Recalculate GPA for display only
                          const scoreSubjects = student.subjects.filter(s => s.isEvaluatedByScore);
                          let scoreCount = 0;
                          let scoreSum = 0;
                          scoreSubjects.forEach(s => {
                            const val = gradesTerm === "hk1" ? s.semester1 : gradesTerm === "hk2" ? s.semester2 : s.yearAvg;
                            if (typeof val === "number") {
                              scoreSum += val;
                              scoreCount++;
                            }
                          });
                          const termGpa = scoreCount > 0 ? (scoreSum / scoreCount) : 0.0;

                          return (
                            <tr key={student.studentCode} className="hover:bg-slate-50/50 divide-x divide-slate-200">
                              
                              {/* Sticky identifier cell */}
                              <td className="px-4 py-2.5 sticky left-0 bg-white shadow-md font-bold z-10 animate-fadeIn">
                                <div className="text-blue-800 font-mono text-[10px]">{student.studentCode}</div>
                                <div className="text-slate-800 text-[11px] truncate w-32">{student.fullName}</div>
                              </td>

                              {/* Score based subjects column rendering */}
                              {["toan", "ly_dia", "khtn", "tin", "van", "anh", "gdcd", "cong_nghe"].map(subjId => {
                                const sub = getSubjectVal(subjId);
                                
                                let tx: string | undefined = undefined;
                                let mid: string | number | undefined = undefined;
                                let end: string | number | undefined = undefined;
                                let avg: string | number = "-";

                                if (sub) {
                                  if (gradesTerm === "hk1") {
                                    tx = sub.tx1;
                                    mid = sub.mid1;
                                    end = sub.end1;
                                    avg = sub.semester1 ?? "-";
                                  } else if (gradesTerm === "hk2") {
                                    tx = sub.tx2;
                                    mid = sub.mid2;
                                    end = sub.end2;
                                    avg = sub.semester2 ?? "-";
                                  } else {
                                    // canam
                                    tx = sub.semester1 !== undefined && sub.semester1 !== "" ? `HK1: ${sub.semester1}` : undefined;
                                    mid = sub.semester2 !== undefined && sub.semester2 !== "" ? `HK2: ${sub.semester2}` : undefined;
                                    if (sub.isEvaluatedByScore && typeof sub.semester1 === "number" && typeof sub.semester2 === "number") {
                                      avg = parseFloat(((sub.semester2 * 2 + sub.semester1) / 3).toFixed(1));
                                    } else {
                                      avg = sub.yearAvg ?? "-";
                                    }
                                  }
                                }

                                const hasDetails = !!(tx || (mid !== undefined && mid !== "") || (end !== undefined && end !== ""));
                                const valToDisplay = avg !== undefined && avg !== null && avg !== "" ? avg : "-";
                                const isEditing = editingStudentCode === student.studentCode && editingSubjectId === subjId;

                                return (
                                  <td key={subjId} className="px-1 py-1.5 text-center font-bold bg-white align-middle relative">
                                    {isEditing ? (
                                      <div className="absolute bg-white border-2 border-[#0055A5] rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2 text-left min-w-[170px] -translate-x-1/2 left-1/2 top-1.5 animate-scaleUp">
                                        <div className="text-[10px] font-extrabold text-[#0055A5] uppercase tracking-wider border-b pb-1 flex items-center justify-between">
                                          <span>Sửa {sub?.subjectName}</span>
                                          <button 
                                            type="button" 
                                            onClick={() => {
                                              setEditingStudentCode(null);
                                              setEditingSubjectId(null);
                                            }}
                                            className="text-slate-400 hover:text-red-500 font-bold px-1"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                        {gradesTerm !== "canam" ? (
                                          <>
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-[8px] text-slate-500 font-black uppercase">Thường xuyên (ĐĐGtx)</span>
                                              <input
                                                type="text"
                                                value={tempTx}
                                                onChange={(e) => setTempTx(e.target.value)}
                                                className="w-full border rounded px-2 py-1 font-bold text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50"
                                                placeholder="9 8 7 9"
                                                title="Nhập các điểm cách nhau bởi dấu cách"
                                              />
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-[8px] text-slate-500 font-black uppercase">Giữa kì (ĐĐGgk)</span>
                                                <input
                                                  type="text"
                                                  value={tempMid}
                                                  onChange={(e) => setTempMid(e.target.value)}
                                                  className="w-full border rounded px-1.5 py-1 text-center font-bold text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                                                  placeholder="-"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-[8px] text-slate-500 font-black uppercase">Cuối kì (ĐĐGck)</span>
                                                <input
                                                  type="text"
                                                  value={tempEnd}
                                                  onChange={(e) => setTempEnd(e.target.value)}
                                                  className="w-full border rounded px-1.5 py-1 text-center font-bold text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                                                  placeholder="-"
                                                />
                                              </div>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-[8px] text-slate-500 font-black uppercase">Trung bình (TB)</span>
                                              <input
                                                type="text"
                                                value={tempGradeValue}
                                                onChange={(e) => setTempGradeValue(e.target.value)}
                                                className="w-full border-2 border-emerald-500 rounded px-2 py-1 font-black text-xs text-emerald-800 bg-emerald-50/50 text-center focus:outline-none"
                                                placeholder="-"
                                              />
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-[8px] text-slate-500 font-black uppercase">Học kỳ I</span>
                                              <input
                                                type="text"
                                                value={tempTx}
                                                onChange={(e) => setTempTx(e.target.value)}
                                                className="w-full border rounded px-2 py-1 text-center font-bold text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                                                placeholder="-"
                                              />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-[8px] text-slate-500 font-black uppercase">Học kỳ II</span>
                                              <input
                                                type="text"
                                                value={tempMid}
                                                onChange={(e) => setTempMid(e.target.value)}
                                                className="w-full border rounded px-2 py-1 text-center font-bold text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                                                placeholder="-"
                                              />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-[8px] text-slate-500 font-black uppercase">Cả năm</span>
                                              <input
                                                type="text"
                                                value={tempGradeValue}
                                                onChange={(e) => setTempGradeValue(e.target.value)}
                                                className="w-full border-2 border-emerald-500 rounded px-2 py-1 text-center font-black text-xs text-emerald-800 bg-emerald-50/50 focus:outline-none"
                                                placeholder="-"
                                              />
                                            </div>
                                          </>
                                        )}
                                        <div className="flex gap-1.5 mt-1 justify-end">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingStudentCode(null);
                                              setEditingSubjectId(null);
                                            }}
                                            className="px-2.5 py-1 text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition cursor-pointer"
                                          >
                                            Hủy
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => saveEditedGrade(student)}
                                            className="px-2.5 py-1 text-[9px] bg-[#0055A5] hover:bg-blue-800 text-white rounded-lg font-bold flex items-center gap-0.5 transition cursor-pointer"
                                          >
                                            Lưu
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => startEditingGrade(student, subjId)}
                                        className="w-full hover:bg-blue-50/40 rounded transition p-1 text-slate-800 flex flex-col items-center justify-center space-y-0.5"
                                      >
                                        {gradesTerm !== "canam" ? (
                                          <div className="flex flex-col items-center justify-center w-full px-0.5">
                                            {/* TX line */}
                                            <div className="text-[10px] text-slate-500 font-medium tracking-normal h-4 overflow-hidden text-center truncate max-w-[80px]" title="Điểm kiểm tra thường xuyên">
                                              {tx || "—"}
                                            </div>
                                            {/* GK & CK line */}
                                            <div className="text-[8px] text-slate-400 font-normal mt-0.5 whitespace-nowrap">
                                              GK: <span className="text-slate-700 font-bold">{mid !== undefined && mid !== "" ? (typeof mid === "number" ? mid.toFixed(1) : mid) : "—"}</span>
                                              {" | "}
                                              CK: <span className="text-slate-700 font-bold">{end !== undefined && end !== "" ? (typeof end === "number" ? end.toFixed(1) : end) : "—"}</span>
                                            </div>
                                            {/* Average line */}
                                            <div className="text-blue-900 font-black text-[11.5px] mt-1 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100/60 min-w-[44px] text-center">
                                              {typeof valToDisplay === "number" ? valToDisplay.toFixed(1) : valToDisplay}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center w-full px-0.5">
                                            {/* HK1 average */}
                                            <div className="text-[8.5px] text-slate-400 font-normal">
                                              HK1: <span className="text-slate-700 font-bold">{sub?.semester1 !== undefined && sub?.semester1 !== "" ? (typeof sub.semester1 === "number" ? sub.semester1.toFixed(1) : sub.semester1) : "—"}</span>
                                            </div>
                                            {/* HK2 average */}
                                            <div className="text-[8.5px] text-slate-400 font-normal mt-0.5">
                                              HK2: <span className="text-slate-700 font-bold">{sub?.semester2 !== undefined && sub?.semester2 !== "" ? (typeof sub.semester2 === "number" ? sub.semester2.toFixed(1) : sub.semester2) : "—"}</span>
                                            </div>
                                            {/* Year Average line */}
                                            <div className="text-emerald-900 font-black text-[11.5px] mt-1 bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-100/60 min-w-[44px] text-center">
                                              {typeof valToDisplay === "number" ? valToDisplay.toFixed(1) : valToDisplay}
                                            </div>
                                          </div>
                                        )}
                                      </button>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Comment Subjects based column rendering */}
                              {["the_duc", "nghe_thuat", "gd_dia_phuong", "trai_nghiem"].map(subjId => {
                                const sub = getSubjectVal(subjId);
                                const v = sub ? (gradesTerm === "hk1" ? sub.semester1 : gradesTerm === "hk2" ? sub.semester2 : sub.yearAvg) : "";
                                const valToDisplay = v !== undefined && v !== null && v !== "" ? v : "-";
                                const isEditing = editingStudentCode === student.studentCode && editingSubjectId === subjId;

                                return (
                                  <td key={subjId} className="px-1 py-2.5 text-center">
                                    {isEditing ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <select
                                          value={tempGradeValue}
                                          onChange={(e) => setTempGradeValue(e.target.value)}
                                          className="border rounded text-[10px] font-bold"
                                        >
                                          <option value="">-</option>
                                          <option value="Đạt">Đạt</option>
                                          <option value="Chưa đạt">Chưa đạt</option>
                                        </select>
                                        <button
                                          onClick={() => saveEditedGrade(student)}
                                          className="p-0.5 bg-emerald-500 text-white rounded cursor-pointer"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => startEditingGrade(student, subjId)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition hover:scale-105 ${
                                          valToDisplay === "Đạt" ? "bg-emerald-50 text-emerald-800" : valToDisplay === "Chưa đạt" ? "bg-rose-50 text-rose-800" : "text-slate-400 font-normal"
                                        }`}
                                      >
                                        {valToDisplay}
                                      </button>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Dynamic term Academic Grade */}
                              <td className="px-3 py-2.5 bg-slate-50 text-center">
                                <div className={`font-extrabold text-[11px] uppercase ${
                                  termAcademicGrade === "Tốt" ? "text-emerald-700 font-extrabold" :
                                  termAcademicGrade === "Khá" ? "text-blue-700 font-extrabold" :
                                  termAcademicGrade === "Đạt" ? "text-slate-600 font-bold" : "text-rose-600 font-bold"
                                }`}>
                                  {termAcademicGrade}
                                </div>
                                <div className="text-[9px] text-slate-400 font-black tracking-tighter">{student.className}</div>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: EXCEL / CSV DATA BULK IMPORT */}
            {activeTab === "import" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                      <span className="p-1.5 bg-blue-600 text-white rounded-lg"><FileSpreadsheet className="w-5 h-5" /></span>
                      Nhập Dữ Liệu Học Tịch Hàng Loạt từ Excel / Google Sheets
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium">
                      Nhập nhanh hồ sơ, điểm số, rèn luyện và ngày nghỉ của toàn lớp bằng cách copy-paste trực tiếp từ bảng điểm Excel theo cấu trúc chuẩn Thông tư 22/2021/TT-BGDĐT.
                    </p>
                  </div>
                  {/* Quick toggle between terms */}
                  <div className="bg-slate-200/60 p-1 flex rounded-xl border border-slate-300 shadow-sm shrink-0">
                    <button
                      onClick={() => {
                        setImportTerm("hk1");
                        setImportPreview([]);
                        setImportErrors([]);
                        setImportStatus("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        importTerm === "hk1" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Học kỳ I
                    </button>
                    <button
                      onClick={() => {
                        setImportTerm("hk2");
                        setImportPreview([]);
                        setImportErrors([]);
                        setImportStatus("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        importTerm === "hk2" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Học kỳ II
                    </button>
                    <button
                      onClick={() => {
                        setImportTerm("canam");
                        setImportPreview([]);
                        setImportErrors([]);
                        setImportStatus("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        importTerm === "canam" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Cả Năm
                    </button>
                  </div>
                </div>

                {/* VISUAL EXCEL SAMPLE TEMPLATE AS REQUESTED BY USER DESIGN IMAGES */}
                <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h4 className="font-extrabold text-blue-800 text-xs uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <span className="w-2 h-2 rounded-full bg-blue-605 bg-blue-600 inline-block animate-pulse"></span>
                        Cấu trúc cột Excel mẫu ({importTerm === "hk1" ? "HỌC KỲ I" : importTerm === "hk2" ? "HỌC KỲ II" : "CẢ NĂM"})
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        Thiết kế theo mẫu học bạ điện tử nguyên gốc, trong đó <strong className="text-blue-700">Mã học sinh</strong> được thay bằng <strong className="text-indigo-700">Số Căn cước công dân (12 số)</strong>.
                      </p>
                    </div>

                    {/* Class selector */}
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border">
                      <label className="text-xs font-black text-slate-700 whitespace-nowrap">Lớp nhập tịch:</label>
                      <select
                        value={importClass}
                        onChange={(e) => {
                          setImportClass(e.target.value);
                          setImportPreview([]);
                          setImportErrors([]);
                          setImportStatus("");
                        }}
                        className="bg-white cursor-pointer border hover:border-blue-400 font-bold text-xs px-2.5 py-1 rounded-lg outline-none transition text-slate-800"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.className}>Lớp {c.className}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* VISUAL TABLE RENDER matching original style */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-[10px] border-collapse bg-slate-50">
                        <thead>
                          <tr className="bg-slate-200 text-slate-700 font-bold border-b border-slate-300 divide-x divide-slate-300">
                            <th className="px-2 py-3 w-10 shrink-0" rowSpan={2}>STT</th>
                            <th className="px-3 py-3 bg-blue-50/50 text-blue-900 font-bold border-b-2 w-32" rowSpan={2}>Số Căn cước công dân<br/><span className="text-[8px] font-normal text-slate-500">(12 chữ số)</span></th>
                            <th className="px-4 py-3 font-bold text-slate-900" rowSpan={2}>Họ và tên</th>
                            <th className="px-3 py-3" rowSpan={2}>Ngày sinh</th>
                            
                            {/* Score based items */}
                            <th className="px-1 py-1.5 text-center bg-slate-100 font-bold" colSpan={8}>Môn học đánh giá bằng Điểm số</th>
                            
                            {/* Comment based items */}
                            <th className="px-1 py-1.5 text-center bg-amber-50/10 font-bold" colSpan={4}>Môn học đánh giá bằng Nhận xét</th>
                            
                            {/* Academic evaluations and absences */}
                            <th className="px-2 py-1.5 text-center bg-indigo-50/10 font-bold" colSpan={2}>Đánh giá tổng quát</th>
                            {importTerm === "canam" && <th className="px-2 py-3 bg-slate-200 text-center font-bold" rowSpan={2}>KQRL<br/>sau hè</th>}
                            <th className="px-2 py-1.5 text-center bg-slate-150 font-bold" colSpan={3}>Nghỉ</th>
                            {importTerm === "canam" && <th className="px-2 py-3 bg-emerald-50 text-emerald-950 text-center font-bold" rowSpan={2}>Danh hiệu<br/>cả năm</th>}
                            <th className="px-3 py-3 text-center" rowSpan={2}>Ghi chú</th>
                          </tr>
                          <tr className="bg-slate-100 text-slate-600 font-bold text-[9px] border-b border-slate-300 divide-x divide-slate-250">
                            {/* Subjects (HS 1) */}
                            <th className="px-1 py-1 w-12 font-medium">Toán học<div className="text-[8px] text-slate-400 font-normal normales">(HS 1)</div></th>
                            <th className="px-1 py-1 w-12 font-medium">Sử & Địa<div className="text-[8px] text-slate-400 font-normal normales">(HS 1)</div></th>
                            <th className="px-1 py-1 w-12 font-medium">KHTN<div className="text-[8px] text-slate-400 font-normal normales">(HS 1)</div></th>
                            <th className="px-1 py-1 w-12 font-medium">Tin học<div className="text-[8px] text-slate-400 font-normal normales">(HS 1)</div></th>
                            <th className="px-1 py-1 w-12 font-medium">Ngữ văn<div className="text-[8px] text-slate-400 font-normal normales">(HS 1)</div></th>
                            <th className="px-1 py-1 w-12 font-medium">Ngoại ngữ<div className="text-[8px] text-slate-400 font-normal normales">(HS 1)</div></th>
                            <th className="px-1 py-1 w-12 font-medium">GDCD<div className="text-[8px] text-slate-400 font-normal normales">(HS 1)</div></th>
                            <th className="px-1 py-1 w-12 font-medium">Công nghệ<div className="text-[8px] text-slate-400 font-normal normales">(HS 1)</div></th>
                            
                            {/* Comments (N.xét) */}
                            <th className="px-1 py-1 w-14 font-medium bg-amber-50/10">Giáo dục TC<div className="text-[8px] text-slate-400 font-normal normales">(N.xét)</div></th>
                            <th className="px-1 py-1 w-14 font-medium bg-amber-50/10">Nghệ thuật<div className="text-[8px] text-slate-400 font-normal normales">(N.xét)</div></th>
                            <th className="px-1 py-1 w-14 font-medium bg-amber-50/10">GD Đ.phương<div className="text-[8px] text-slate-400 font-normal normales">(N.xét)</div></th>
                            <th className="px-1 py-1 w-14 font-medium bg-amber-50/10">Trải nghiệm<div className="text-[8px] text-slate-400 font-normal normales">(N.xét)</div></th>

                            {/* Overall classification headers */}
                            <th className="px-2 py-1 font-bold text-blue-900 bg-blue-50/30">KQ Học tập<div className="text-[8px] font-normal text-slate-400">({importTerm === "canam" ? "Cả năm" : importTerm === "hk1" ? "Học kỳ 1" : "Học kỳ 2"})</div></th>
                            <th className="px-2 py-1 font-bold text-emerald-900 bg-emerald-50/30">KQ Rèn luyện<div className="text-[8px] font-normal text-slate-400">({importTerm === "canam" ? "Cả năm" : importTerm === "hk1" ? "Học kỳ 1" : "Học kỳ 2"})</div></th>

                            {/* Absences heading details */}
                            <th className="px-1.5 py-1 w-10 font-bold text-slate-600">P</th>
                            <th className="px-1.5 py-1 w-10 font-bold text-slate-600">K</th>
                            <th className="px-1.5 py-1 w-10 font-bold text-red-600 bg-red-50/50">BT</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-slate-50 hover:bg-slate-100 font-mono text-[9px] divide-x divide-slate-200">
                            <td className="px-1.5 py-2.5">1</td>
                            <td className="px-2 py-2.5 text-blue-900 font-bold font-mono">012345678901</td>
                            <td className="px-2 py-2.5 font-sans font-semibold text-slate-800 text-left">Phạm Tuấn Hải</td>
                            <td className="px-2 py-2.5 font-sans text-slate-500">2011-08-30</td>
                            <td className="px-1 py-2.5 font-bold text-indigo-700">9.5</td>
                            <td className="px-1 py-2.5 font-bold text-indigo-700">9.0</td>
                            <td className="px-1 py-2.5 font-bold text-indigo-700">9.2</td>
                            <td className="px-1 py-2.5 font-bold text-indigo-700">10.0</td>
                            <td className="px-1 py-2.5 font-bold text-indigo-700">8.5</td>
                            <td className="px-1 py-2.5 font-bold text-indigo-700">9.5</td>
                            <td className="px-1 py-2.5 font-bold text-indigo-700">9.0</td>
                            <td className="px-1 py-2.5 font-bold text-indigo-700">9.0</td>
                            <td className="px-1 py-2.5 font-sans text-emerald-800 font-semibold bg-emerald-50/20">Đạt</td>
                            <td className="px-1 py-2.5 font-sans text-emerald-800 font-semibold bg-emerald-50/20">Đạt</td>
                            <td className="px-1 py-2.5 font-sans text-emerald-800 font-semibold bg-emerald-50/20">Đạt</td>
                            <td className="px-1 py-2.5 font-sans text-emerald-800 font-semibold bg-emerald-50/20">Đạt</td>
                            <td className="px-2 py-2.5 font-sans font-bold bg-blue-50/30 text-blue-800">Tốt</td>
                            <td className="px-2 py-2.5 font-sans font-bold bg-emerald-50/30 text-emerald-800">Tốt</td>
                            {importTerm === "canam" && <td className="px-2 py-2.5 font-sans font-medium text-slate-400 bg-slate-50">Không</td>}
                            <td className="px-1 py-2.5 text-slate-600">1</td>
                            <td className="px-1 py-2.5 text-slate-600">0</td>
                            <td className="px-1 py-2.5 bg-slate-100 font-extrabold text-slate-800">1</td>
                            {importTerm === "canam" && <td className="px-2 py-2.5 font-sans font-extrabold bg-emerald-100 text-emerald-850 text-[8px] whitespace-nowrap">Học sinh Giỏi</td>}
                            <td className="px-3 py-2.5 font-sans text-slate-500 italic max-w-[80px] truncate">Học tốt kì vữa</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Left Column COPY FORM / FILE Uploader */}
                  <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
                    {/* Method Selector Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-205 gap-1 mb-2 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setImportMethod("paste");
                          setImportStatus("");
                        }}
                        className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition duration-200 cursor-pointer ${
                          importMethod === "paste"
                            ? "bg-blue-600 text-white shadow-md font-black"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                      >
                        🚀 Dán Clipboard nhanh
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportMethod("upload");
                          setImportStatus("");
                        }}
                        className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition duration-200 cursor-pointer ${
                          importMethod === "upload"
                            ? "bg-blue-600 text-white shadow-md font-black"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                      >
                        📁 Tải Tệp Excel (.xlsx, .xls)
                      </button>
                    </div>

                    {importMethod === "paste" ? (
                      <div className="space-y-4 animate-fadeIn">
                        <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                          <Keyboard className="w-5 h-5 text-blue-600" />
                          Dán dữ liệu từ bảng điểm Excel tương ứng
                        </h3>

                        <div className="space-y-3">
                          <label className="block text-xs font-bold text-slate-700">
                            Bản copy dán các cột ngăn cách bởi tab từ Excel ({importTerm === "canam" ? "Cả năm" : importTerm === "hk1" ? "Học kỳ I" : "Học kỳ II"}):
                          </label>
                          <textarea
                            rows={11}
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder={
                              importTerm === "canam"
                                ? "STT\tCCCD\tHọ tên\tNgày sinh\tToán\tSửĐịa\tKHTN\tTin\tVăn\tAnh\tGDCD\tCôngNghệ\tThểChất\tNghệThuật\tĐịaPhương\tTrảiNghiệm\tKQ H.tập\tKQ R.luyện\tKQRL Sau Hè\tVắng P\tVắng K\tBỏ tiết\tDanh hiệu\tGhi chú\n1\t012345678901\tPhạm Tuấn Hải\t2011-08-30\t9.8\t9.3\t9.6\t9.9\t8.8\t9.8\t9.4\t9.2\tĐạt\tĐạt\tĐạt\tĐạt\tTốt\tTốt\tKhông\t1\t0\t2\tHọc sinh Giỏi\tHọc sinh Xuất sắc cả năm"
                                : "STT\tCCCD\tHọ tên\tNgày sinh\tToán\tSửĐịa\tKHTN\tTin\tVăn\tAnh\tGDCD\tCôngNghệ\tThểChất\tNghệThuật\tĐịaPhương\tTrảiNghiệm\tKQ H.tập\tKQ R.luyện\tVắng P\tVắng K\tBỏ tiết\tGhi chú\n1\t012345678901\tPhạm Tuấn Hải\t2011-08-30\t9.5\t9.0\t9.2\t10.0\t8.5\t9.5\t9.0\t9.0\tĐạt\tĐạt\tĐạt\tĐạt\tTốt\tTốt\t1\t0\t2\tHoàn thành tốt nhất"
                            }
                            className="w-full text-xs font-mono p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition"
                          />
                          <div className="text-[11px] text-slate-400 leading-normal flex gap-1.5 items-center bg-slate-50 p-2.5 rounded-lg border">
                            <Info className="w-4 h-4 text-blue-500 shrink-0" />
                            <span>Mẹo: Quét chọn các dòng trong bảng Excel của bạn, bấm <strong className="text-blue-700">Ctrl + C</strong> rồi click vào khung trên nhấn <strong className="text-blue-700">Ctrl + V</strong>! Hệ thống sẽ xử lý tab-separated tự động.</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t text-xs">
                          <button
                            onClick={handleParseExcelText}
                            className="bg-blue-600 hover:bg-blue-800 text-white font-extrabold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-sm"
                          >
                            PHÂN TÍCH BẢNG EXCEL
                          </button>

                          <button
                            onClick={() => {
                              if (importTerm === "hk1") {
                                setImportText(
                                  "STT\tCCCD\tHọ và tên\tNgày sinh\tToán\tSửĐịa\tKHTN\tTin\tVăn\tAnh\tGDCD\tCôngNghệ\tThểChất\tNghệThuật\tĐịaPhương\tTrảiNghiệm\tKQ H.tập\tKQ R.luyện\tVắng P\tVắng K\tTổng vắng\tGhi chú\n" +
                                  "1\t012345678901\tPhạm Tuấn Hải\t2011-08-30\t9.5\t9.0\t9.2\t10.0\t8.5\t9.5\t9.0\t9.0\tĐạt\tĐạt\tĐạt\tĐạt\tTốt\tTốt\t1\t0\t1\tPhấn đấu tốt HK1\n" +
                                  "2\t012345678902\tTrương Mỹ Linh\t2011-12-11\t7.5\t8.0\t7.8\t8.0\t8.0\t8.5\t8.5\t8.0\tĐạt\tĐạt\tĐạt\tĐạt\tKhá\tTốt\t0\t0\t0\tKhá tốt HK1"
                                );
                              } else if (importTerm === "hk2") {
                                setImportText(
                                  "STT\tCCCD\tHọ và tên\tNgày sinh\tToán\tSửĐịa\tKHTN\tTin\tVăn\tAnh\tGDCD\tCôngNghệ\tThểChất\tNghệThuật\tĐịaPhương\tTrảiNghiệm\tKQ H.tập\tKQ R.luyện\tVắng P\tVắng K\tTổng vắng\tGhi chú\n" +
                                  "1\t012345678901\tPhạm Tuấn Hải\t2011-08-30\t10.0\t9.5\t9.5\t9.5\t8.5\t9.5\t9.5\t9.0\tĐạt\tĐạt\tĐạt\tĐạt\tTốt\tTốt\t0\t0\t0\tBản kiểm điểm sáng kì 2\n" +
                                  "2\t012345678902\tTrương Mỹ Linh\t2011-12-11\t8.0\t8.0\t8.0\t9.0\t8.5\t8.5\t9.0\t8.5\tĐạt\tĐạt\tĐạt\tĐạt\tTốt\tTốt\t1\t0\t1\tCó tiến bộ vượt bậc"
                                );
                              } else {
                                setImportText(
                                  "STT\tCCCD\tHọ và tên\tNgày sinh\tToán\tSửĐịa\tKHTN\tTin\tVăn\tAnh\tGDCD\tCôngNghệ\tThểChất\tNghệThuật\tĐịaPhương\tTrảiNghiệm\tKQ H.tập\tKQ R.luyện\tKQRL Sau Hè\tVắng P\tVắng K\tTổng vắng\tDanh hiệu\tGhi chú\n" +
                                  "1\t012345678901\tPhạm Tuấn Hải\t2011-08-30\t9.8\t9.3\t9.6\t9.9\t8.8\t9.8\t9.4\t9.2\tĐạt\tĐạt\tĐạt\tĐạt\tTốt\tTốt\tKhông\t1\t0\t1\tHọc sinh Giỏi\tHọc tập chăm ngoan cả năm\n" +
                                  "2\t012345678902\tTrương Mỹ Linh\t2011-12-11\t8.1\t7.9\t8.1\t8.7\t8.4\t8.5\t8.9\t8.1\tĐạt\tĐạt\tĐạt\tĐạt\tKhá\tTốt\tKhông\t1\t0\t1\tKhông\tĐạt danh hiệu học sinh khá"
                                );
                              }
                              setImportStatus("Mẫu Excel tương ứng đã được nạp thành công!");
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
                          >
                            Nạp mẫu Excel nhanh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5 animate-fadeIn">
                        {/* Step 1: Download Dynamic Template */}
                        <div className="bg-slate-50 border rounded-xl p-4 space-y-2">
                          <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                            <span className="p-1 bg-emerald-500 text-white rounded-full"><Download className="w-3.5 h-3.5" /></span>
                            BƯỚC 1: XUẤT TỆP EXCEL .XLSX CỦA LỚP {importClass}
                          </h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                            Kết xuất tệp bảng mẫu có sẵn mã CCCD và Tên của <strong>{students.filter(s => s.className === importClass).length} học sinh</strong> đang thuộc lớp {importClass} hiện tại. Giáo viên chỉ cần mở điền điểm trực tuyến và tải lên lại!
                          </p>
                          <button
                            type="button"
                            onClick={handleDownloadXlsxTemplate}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-200 cursor-pointer shadow-sm hover:scale-[1.01]"
                          >
                            <FileSpreadsheet className="w-4 h-4 shrink-0" />
                            XUẤT FILE MẪU LỚP {importClass} ({importTerm === "canam" ? "Học kỳ I & II (Cả năm)" : importTerm === "hk1" ? "Học kỳ I" : "Học kỳ II"})
                          </button>
                        </div>

                        {/* Step 2: Upload Excel File */}
                        <div className="space-y-2">
                          <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                            <span className="p-1 bg-blue-600 text-white rounded-full"><Upload className="w-3.5 h-3.5" /></span>
                            BƯỚC 2: TẢI LÊN TỆP SỔ ĐIỂM ĐÃ HOÀN THIỆN
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Chọn tệp dữ liệu dạng <strong>Excel</strong> (.xlsx hoặc .xls) bạn vừa điền để hệ thống cập nhật tự động toàn bộ lớp.
                          </p>
                          
                          <label 
                            htmlFor="xlsx-file-upload"
                            className="border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 active:bg-blue-50/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition text-center"
                          >
                            <FileSpreadsheet className="w-12 h-12 text-blue-500 mb-2 animate-bounce" />
                            <span className="text-xs font-black text-slate-800">Nhấp để mở tệp hoặc kéo thả file Excel vào đây</span>
                            <span className="text-[10px] text-slate-400 mt-1.5">Hỗ trợ định dạng tệp Excel (.xlsx, .xls) thuộc Học tịch lớp {importClass}</span>
                            <input
                              type="file"
                              id="xlsx-file-upload"
                              accept=".xlsx, .xls"
                              onChange={handleUploadXlsx}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {importStatus && (
                      <div className="p-3 bg-blue-50 border-l-4 border-blue-600 text-blue-900 rounded-xl text-xs font-semibold leading-relaxed">
                        {importStatus}
                      </div>
                    )}
                  </div>

                  {/* Right Column PREVIEW */}
                  <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-emerald-600" />
                      Xem Trước Dữ Liệu Đồng Bộ ({importPreview.length} dòng)
                    </h3>

                    {importErrors.length > 0 && (
                      <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl space-y-2">
                        <span className="font-extrabold text-xs text-red-800 flex items-center gap-1.5 uppercase">
                          <X className="w-4 h-4 text-red-500 shrink-0" />
                          Phát hiện {importErrors.length} lỗi/cảnh báo dữ liệu:
                        </span>
                        <div className="max-h-[160px] overflow-y-auto divide-y divide-red-100 text-[10px] text-red-700 font-medium space-y-1 pr-1 font-mono">
                          {importErrors.map((err, errIdx) => (
                            <div key={errIdx} className="pt-1.5 first:pt-0">
                              ⚠️ {err}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-red-500 leading-relaxed font-semibold">
                          * Lưu ý: Mặc dù chương trình vẫn tự động làm sạch & nạp dữ liệu đi kèm giá trị mặc định, bạn nên rà soát lại định dạng để đảm bảo độ chính xác tuyệt đối.
                        </p>
                      </div>
                    )}
                    
                    {importPreview.length > 0 ? (
                      <div className="space-y-4">
                        <div className="border rounded-xl max-h-[310px] overflow-y-auto divide-y divide-slate-150 text-[11px] bg-slate-50/50">
                          {importPreview.map((stud) => (
                            <div key={stud.studentCode} className="p-3 hover:bg-slate-100/50 flex justify-between items-center bg-white transition">
                              <div>
                                <span className="font-mono font-bold text-blue-850 text-blue-800">{stud.studentCode}</span> - <span className="font-bold text-slate-900">{stud.fullName}</span>
                                <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                  <span>Lớp: <strong className="text-slate-700">{stud.className}</strong></span>
                                  <span>Buổi nghỉ: <strong className="text-slate-700">{stud.daysAbsent} buổi</strong></span>
                                </div>
                              </div>
                              <div className="text-right space-y-1 shrink-0">
                                <div className="text-[9px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg inline-block">
                                  Học lực: {importTerm === "hk1" ? stud.academicGradeHK1 : importTerm === "hk2" ? stud.academicGradeHK2 : stud.academicGrade}
                                </div>
                                <div className="text-[9px] font-bold uppercase block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg">
                                  Rèn luyện: {importTerm === "hk1" ? stud.behaviorGradeHK1 : importTerm === "hk2" ? stud.behaviorGradeHK2 : stud.behaviorGrade}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={handleApplyImport}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs uppercase shadow transition duration-200 cursor-pointer flex items-center justify-center gap-2"
                        >
                          ĐĂNG KÝ VÀO CHƯƠNG TRÌNH HỌC TỊCH
                        </button>
                      </div>
                    ) : (
                      <div className="h-[370px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                        <Upload className="w-12 h-12 text-slate-300 animate-bounce mb-3" />
                        <span className="font-bold text-slate-700 text-xs">Đang chờ nạp phân tích Excel...</span>
                        <p className="text-[10px] text-slate-400 mt-2 max-w-xs leading-relaxed">
                          Hãy dán dữ liệu điểm vào trường bên trái và nhấp "PHÂN TÍCH BẢNG EXCEL" để xem trước kiểm nghiệm dữ liệu trước khi đăng ký chính thức.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: STATISTICS & ACADEMIC AUDIT */}
            {activeTab === "stats" && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Thống Kê Tổng Hợp Kết Quả Học Tập THCS</h1>
                  <p className="text-xs text-slate-500">Phân tích chuyên sâu về chỉ số học lực, rèn luyện trên Toàn Trường, Khối lớp và từng Lớp học sinh.</p>
                </div>

                {/* KPI stats section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border rounded-xl p-5 shadow-sm space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng số học sinh THCS</span>
                    <div className="text-3xl font-black text-blue-900">{totalStudentsCount}</div>
                    <div className="text-[11px] text-slate-500">đáp ứng chỉ tiêu kết quả học tập</div>
                  </div>
                  <div className="bg-white border rounded-xl p-5 shadow-sm space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#E53935] tracking-wider">Học sinh Xuất sắc / Giỏi</span>
                    <div className="text-3xl font-black text-emerald-600">{gotExcellentTitle + gotGoodTitle}</div>
                    <div className="text-[11px] text-slate-500">tỷ lệ đạt {totalStudentsCount > 0 ? (( (gotExcellentTitle + gotGoodTitle) / totalStudentsCount) * 100).toFixed(1) : 0}% cả trường</div>
                  </div>
                  <div className="bg-white border rounded-xl p-5 shadow-sm space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rèn luyện đạt (Tốt)</span>
                    <div className="text-3xl font-black text-blue-700">{goodBehaviorCount}</div>
                    <div className="text-[11px] text-slate-500">tỷ lệ đạt {totalStudentsCount > 0 ? ((goodBehaviorCount / totalStudentsCount) * 100).toFixed(1) : 0}% học sinh</div>
                  </div>
                  <div className="bg-white border rounded-xl p-5 shadow-sm space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lượng Truy Cập Hệ Thống</span>
                    <div className="text-3xl font-black text-indigo-700">{totalVisitors}</div>
                    <div className="text-[11px] text-slate-500">lượt tra cứu học tịch trực tuyến</div>
                  </div>
                </div>

                {/* Render Custom visual charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Chart 1: Academic Distribution */}
                  <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
                     <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 border-b pb-2">
                       <School className="w-5 h-5 text-blue-700" /> Thống kê phân loại Học lực (Toàn trường)
                     </h3>

                     <div className="space-y-3.5 pt-2">
                       {/* Tốt */}
                       <div>
                         <div className="flex justify-between items-center text-xs font-bold mb-1">
                           <span className="text-emerald-700">Học lực Tốt</span>
                           <span>{academicTốtCount} em ({totalStudentsCount > 0 ? ((academicTốtCount / totalStudentsCount)*100).toFixed(1) : 0}%)</span>
                         </div>
                         <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                           <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${totalStudentsCount > 0 ? (academicTốtCount / totalStudentsCount)*100 : 0}%` }}></div>
                         </div>
                       </div>

                       {/* Khá */}
                       <div>
                         <div className="flex justify-between items-center text-xs font-bold mb-1">
                           <span className="text-blue-700">Học lực Khá</span>
                           <span>{academicKháCount} em ({totalStudentsCount > 0 ? ((academicKháCount / totalStudentsCount)*100).toFixed(1) : 0}%)</span>
                         </div>
                         <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                           <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${totalStudentsCount > 0 ? (academicKháCount / totalStudentsCount)*100 : 0}%` }}></div>
                         </div>
                       </div>

                       {/* Đạt */}
                       <div>
                         <div className="flex justify-between items-center text-xs font-bold mb-1">
                           <span className="text-amber-700">Học lực Đạt</span>
                           <span>{academicĐạtCount} em ({totalStudentsCount > 0 ? ((academicĐạtCount / totalStudentsCount)*100).toFixed(1) : 0}%)</span>
                         </div>
                         <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                           <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${totalStudentsCount > 0 ? (academicĐạtCount / totalStudentsCount)*100 : 0}%` }}></div>
                         </div>
                       </div>

                       {/* Chưa đạt */}
                       <div>
                         <div className="flex justify-between items-center text-xs font-bold mb-1">
                           <span className="text-rose-700">Chưa đạt chính chỉ tiêu</span>
                           <span>{academicChuaDatCount} em ({totalStudentsCount > 0 ? ((academicChuaDatCount / totalStudentsCount)*100).toFixed(1) : 0}%)</span>
                         </div>
                         <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                           <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${totalStudentsCount > 0 ? (academicChuaDatCount / totalStudentsCount)*100 : 0}%` }}></div>
                         </div>
                       </div>
                     </div>
                  </div>

                  {/* Chart 2: Stats by Grade level comparatives (Khối lớp) */}
                  <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
                    <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 border-b pb-2">
                       <Layers className="w-5 h-5 text-amber-500" /> Thống kê phân loại kết quả theo Khối Học (6, 7, 8, 9)
                    </h3>
                    
                    <div className="divide-y divide-slate-100 pt-1 text-xs">
                      {["6", "7", "8", "9"].map((lvl) => {
                        const sameLvl = students.filter(s => s.gradeLevel === lvl);
                        const excCount = sameLvl.filter(s => s.academicGrade === "Tốt" || s.academicGrade === "Khá").length;
                        const pct = sameLvl.length > 0 ? ((excCount / sameLvl.length) * 100).toFixed(1) : "0";
                        
                        return (
                          <div key={lvl} className="py-2.5 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-800">Khối Lớp {lvl} THCS</span>
                              <div className="text-[10px] text-slate-500">Tổng: {sameLvl.length} học sinh tham gia</div>
                            </div>
                            <div className="text-right">
                              <span className="font-extrabold text-emerald-700">{pct}% Tốt / Khá</span>
                              <div className="text-[9px] text-slate-400">Hiệu năng học tịch xuất sắc</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chart 3: Visitor Statistics by Month */}
                  <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4 lg:col-span-2">
                    <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 border-b pb-2">
                       <BarChart3 className="w-5 h-5 text-indigo-600" /> Biểu đồ lưu lượng truy cập cổng điện tử (Tổng hợp theo tháng)
                    </h3>
                    
                    {visitorMonthlyStats.length > 0 ? (
                      <div className="space-y-4 pt-2">
                        {visitorMonthlyStats.map((stat, idx) => {
                          const maxCount = Math.max(...visitorMonthlyStats.map(s => s.count)) || 1;
                          const width = (stat.count / maxCount) * 100;
                          
                          return (
                            <div key={idx}>
                              <div className="flex justify-between items-center text-xs font-bold mb-1">
                                <span className="text-slate-600">Tháng {stat.month}</span>
                                <span className="font-black text-indigo-700">{stat.count} lượt truy cập</span>
                              </div>
                              <div className="w-full bg-slate-50 rounded-full h-4 overflow-hidden border border-slate-100">
                                <div 
                                  className="bg-indigo-500 h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end px-2" 
                                  style={{ width: `${width}%` }}
                                >
                                  {width > 15 && <span className="text-[8px] text-white font-bold">{stat.count}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed rounded-xl">
                        <Users className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-[10px]">Chưa có dữ liệu truy cập từ hệ thống Supabase.</p>
                      </div>
                    )}
                    <p className="text-[9px] text-slate-400 italic mt-2">* Dữ liệu được tổng hợp theo thời gian thực từ đám mây cơ sở dữ liệu.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: SUPABASE INTEGRATION CONSOLE */}
            {activeTab === "supabase" && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Cấu Hình Kết Nối Supabase Cloud Database</h1>
                  <p className="text-xs text-slate-500">Mã hóa đồng bộ kết quả dữ liệu học bạ bảo mật lên hệ thống đám mây Supabase PostgreSQL của Sở Giáo dục.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  
                  {/* Left Form: Edit Connection details */}
                  <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2 text-sm font-bold text-[#0055A5]">
                      <Database className="w-5 h-5" />
                      <span>Thông tin đăng kiểm quyền lực đám mây</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Supabase Project API URL (VITE_SUPABASE_URL)
                        </label>
                        <input
                          type="text"
                          value={supabaseUrl}
                          onChange={(e) => setSupabaseUrl(e.target.value)}
                          placeholder="https://your-project-id.supabase.co"
                          className="w-full text-xs font-mono px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Supabase API Anon Key (VITE_SUPABASE_ANON_KEY)
                        </label>
                        <input
                          type="password"
                          value={supabaseKey}
                          onChange={(e) => setSupabaseKey(e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YourAnonKeyHere..."
                          className="w-full text-xs font-mono px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveSupabaseConfig}
                          className="bg-[#0055A5] hover:bg-blue-800 text-white font-bold px-4 py-2 text-xs rounded-lg transition cursor-pointer"
                        >
                          KẾT NỐI & KIỂM TRA
                        </button>
                        
                        {supabaseStatus.isConnected && (
                          <button
                            onClick={handleDisconnectSupabase}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-4 py-2 text-xs rounded-lg transition cursor-pointer"
                          >
                            Đóng kết nối (Quay về Offline)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Instruction box for the user */}
                  <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2 text-sm font-bold text-emerald-800">
                      <Check className="w-5 h-5 text-emerald-500" />
                      <span>Hướng dẫn chuẩn bị SQL Schema Supabase</span>
                    </div>
                    
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Để kết nối được ứng dụng này lên Supabase của bạn, bạn chỉ cần mở <strong>SQL Editor</strong> trên Supabase Dashboard và thực thi đoạn truy vấn khởi tạo bảng dữ liệu sau. 
                      <br />
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1 py-0.5 rounded mt-1 inline-block">
                        💡 Ứng dụng THCS Suối Lư đã thông minh tự động hỗ trợ cả 2 định dạng Snake Case và Camel Case. Hãy lựa chọn mẫu truy vấn phù hợp rồi nhấn Run!
                      </span>
                    </p>

                    {/* SQL View Switcher */}
                    <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border">
                      <button
                        type="button"
                        id="sql_tab_snake"
                        onClick={() => {
                          const snakeEl = document.getElementById("sql_snake_case");
                          const camelEl = document.getElementById("sql_camel_case");
                          const tSnake = document.getElementById("sql_tab_snake");
                          const tCamel = document.getElementById("sql_tab_camel");
                          if (snakeEl && camelEl && tSnake && tCamel) {
                            snakeEl.classList.remove("hidden");
                            camelEl.classList.add("hidden");
                            tSnake.classList.add("bg-white", "text-slate-800", "shadow-sm");
                            tSnake.classList.remove("text-slate-500");
                            tCamel.classList.remove("bg-white", "text-slate-800", "shadow-sm");
                            tCamel.classList.add("text-slate-500");
                          }
                        }}
                        className="flex-1 text-[11px] font-bold py-1.5 px-3 rounded-md transition cursor-pointer bg-white text-slate-800 shadow-sm"
                      >
                        Mẫu 1: Snake Case (Khuyên dùng)
                      </button>
                      <button
                        type="button"
                        id="sql_tab_camel"
                        onClick={() => {
                          const snakeEl = document.getElementById("sql_snake_case");
                          const camelEl = document.getElementById("sql_camel_case");
                          const tSnake = document.getElementById("sql_tab_snake");
                          const tCamel = document.getElementById("sql_tab_camel");
                          if (snakeEl && camelEl && tSnake && tCamel) {
                            snakeEl.classList.add("hidden");
                            camelEl.classList.remove("hidden");
                            tCamel.classList.add("bg-white", "text-slate-800", "shadow-sm");
                            tCamel.classList.remove("text-slate-500");
                            tSnake.classList.remove("bg-white", "text-slate-800", "shadow-sm");
                            tSnake.classList.add("text-slate-500");
                          }
                        }}
                        className="flex-1 text-[11px] font-bold py-1.5 px-3 rounded-md transition cursor-pointer text-slate-500 hover:text-slate-800"
                      >
                        Mẫu 2: Camel Case
                      </button>
                    </div>

                    <div className="relative group">
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-lg border border-slate-750 transition duration-150 active:scale-95 cursor-pointer backdrop-blur-xs select-none"
                        title="Sao chép toàn bộ mã SQL"
                      >
                        {copiedSql ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            <span className="text-emerald-400">Đã sao chép!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Sao chép toàn bộ SQL</span>
                          </>
                        )}
                      </button>

                      {/* SNAKE CASE SQL */}
                      <div id="sql_snake_case" className="block">
                        <pre className="text-[10px] font-mono bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto leading-normal selection:bg-blue-800 max-h-[350px] overflow-y-auto">
{`-- [MẪU 1] TẠO 6 BẢNG SỬ DỤNG SNAKE_CASE (CHẰN CHẶN CHUẨN POSTGRES)

-- 0. NÂNG CẤP BẢNG CŨ (Nếu bạn đã có bảng students nhưng thiếu cột, hãy chạy đoạn này trước)
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS id TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT DEFAULT 'Trường PTDTBT Tiểu Học và THCS Suối Lư';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_grade TEXT DEFAULT 'Tốt';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_grade_hk1 TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_grade_hk2 TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade TEXT DEFAULT 'Tốt';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade_hk1 TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade_hk2 TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_grade_summer TEXT DEFAULT 'Không';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS days_absent INTEGER DEFAULT 0;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS days_absent_unexcused INTEGER DEFAULT 0;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS distinction TEXT DEFAULT 'Không';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS verification_token TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher TEXT;
-- NOTIFY pgrst, 'reload schema';

-- 1. Tạo bảng học sinh (students)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT NOT NULL,
  school TEXT NOT NULL,
  class_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  academic_grade TEXT NOT NULL,
  academic_grade_hk1 TEXT,
  academic_grade_hk2 TEXT,
  behavior_grade TEXT NOT NULL,
  behavior_grade_hk1 TEXT,
  behavior_grade_hk2 TEXT,
  behavior_grade_summer TEXT,
  days_absent INTEGER NOT NULL,
  days_absent_unexcused INTEGER NOT NULL,
  distinction TEXT NOT NULL,
  notes TEXT,
  verification_token TEXT NOT NULL,
  teacher TEXT,
  subjects JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo bảng danh sách lớp học (portal_classes)
CREATE TABLE IF NOT EXISTS portal_classes (
  id TEXT PRIMARY KEY,
  class_name TEXT UNIQUE NOT NULL,
  grade_level TEXT NOT NULL,
  advisor_name TEXT,
  room_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo bảng lưu trữ cấu hình cổng tra cứu (portal_settings)
CREATE TABLE IF NOT EXISTS portal_settings (
  id TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tạo bảng thống kê truy cập (visitor_stats & visitor_counts)
CREATE TABLE IF NOT EXISTS visitor_stats (
  id BIGSERIAL PRIMARY KEY,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitor_counts (
  visit_date DATE PRIMARY KEY,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tạo bảng nhật ký tìm kiếm (search_activity)
CREATE TABLE IF NOT EXISTS search_activity (
  id BIGSERIAL PRIMARY KEY,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  queried_at TIMESTAMPTZ DEFAULT NOW(),
  count INTEGER DEFAULT 1
);

-- BẬT CHÍNH SÁCH BẢO MẬT ROW LEVEL SECURITY (RLS) & CHO PHÉP ĐỌC GHI CÔNG KHAI
-- A. Áp dụng cho bảng học sinh (students)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai students" ON students;
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác students" ON students;
CREATE POLICY "Cho phép đọc công khai students" ON students FOR SELECT USING (true);
CREATE POLICY "Cho phép thực hiện mọi thao tác students" ON students FOR ALL USING (true) WITH CHECK (true);

-- B. Áp dụng cho bảng lớp học (portal_classes)
ALTER TABLE portal_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai portal_classes" ON portal_classes;
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác portal_classes" ON portal_classes;
CREATE POLICY "Cho phép đọc công khai portal_classes" ON portal_classes FOR SELECT USING (true);
CREATE POLICY "Cho phép thực hiện mọi thao tác portal_classes" ON portal_classes FOR ALL USING (true) WITH CHECK (true);

-- C. Áp dụng cho bảng cấu hình (portal_settings)
ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai portal_settings" ON portal_settings;
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác portal_settings" ON portal_settings;
CREATE POLICY "Cho phép đọc công khai portal_settings" ON portal_settings FOR SELECT USING (true);
CREATE POLICY "Cho phép thực hiện mọi thao tác portal_settings" ON portal_settings FOR ALL USING (true) WITH CHECK (true);

-- D. Áp dụng cho bảng thống kê truy cập (visitor_stats & visitor_counts)
ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai visitor_stats" ON visitor_stats;
DROP POLICY IF EXISTS "Cho phép ghi công khai visitor_stats" ON visitor_stats;
CREATE POLICY "Cho phép đọc công khai visitor_stats" ON visitor_stats FOR SELECT USING (true);
CREATE POLICY "Cho phép ghi công khai visitor_stats" ON visitor_stats FOR INSERT WITH CHECK (true);

ALTER TABLE visitor_counts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai visitor_counts" ON visitor_counts;
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác visitor_counts" ON visitor_counts;
CREATE POLICY "Cho phép đọc công khai visitor_counts" ON visitor_counts FOR SELECT USING (true);
CREATE POLICY "Cho phép thực hiện mọi thao tác visitor_counts" ON visitor_counts FOR ALL USING (true) WITH CHECK (true);

-- E. Áp dụng cho bảng nhật ký tìm kiếm (search_activity)
ALTER TABLE search_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai search_activity" ON search_activity;
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác search_activity" ON search_activity;
CREATE POLICY "Cho phép đọc công khai search_activity" ON search_activity FOR SELECT USING (true);
CREATE POLICY "Cho phép thực hiện mọi thao tác search_activity" ON search_activity FOR ALL USING (true) WITH CHECK (true);

-- F. Báo cho Supabase làm mới schema cache (khắc phục lỗi không tìm thấy cột)
NOTIFY pgrst, 'reload schema';`}
                        </pre>
                      </div>

                      {/* CAMEL CASE SQL */}
                      <div id="sql_camel_case" className="hidden">
                        <pre className="text-[10px] font-mono bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto leading-normal selection:bg-blue-800 max-h-[350px] overflow-y-auto">
{`-- [MẪU 2] TẠO 6 BẢNG SỬ DỤNG CAMELCASE (SỬ DỤNG DẤU NHÁY ĐỒNG BỘ NGUYÊN BẢN)

-- 0. NÂNG CẤP BẢNG CŨ (Nếu bạn đã có bảng students nhưng thiếu cột, hãy chạy đoạn này trước)
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS id TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT DEFAULT 'Trường PTDTBT Tiểu Học và THCS Suối Lư';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicYear" TEXT DEFAULT '2025-2026';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicGrade" TEXT DEFAULT 'Tốt';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicGradeHK1" TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "academicGradeHK2" TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGrade" TEXT DEFAULT 'Tốt';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGradeHK1" TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGradeHK2" TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "behaviorGradeSummer" TEXT DEFAULT 'Không';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "daysAbsent" INTEGER DEFAULT 0;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "daysAbsentUnexcused" INTEGER DEFAULT 0;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS distinction TEXT DEFAULT 'Không';
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher TEXT;
-- NOTIFY pgrst, 'reload schema';

-- 1. Tạo bảng học sinh (students)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  "studentCode" TEXT UNIQUE NOT NULL,
  "fullName" TEXT NOT NULL,
  dob TEXT NOT NULL,
  gender TEXT NOT NULL,
  school TEXT NOT NULL,
  "className" TEXT NOT NULL,
  "gradeLevel" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  "academicGrade" TEXT NOT NULL,
  "academicGradeHK1" TEXT,
  "academicGradeHK2" TEXT,
  "behaviorGrade" TEXT NOT NULL,
  "behaviorGradeHK1" TEXT,
  "behaviorGradeHK2" TEXT,
  "behaviorGradeSummer" TEXT,
  "daysAbsent" INTEGER NOT NULL,
  "daysAbsentUnexcused" INTEGER NOT NULL,
  distinction TEXT NOT NULL,
  notes TEXT,
  "verificationToken" TEXT NOT NULL,
  teacher TEXT,
  subjects JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo bảng danh sách lớp học (portal_classes)
CREATE TABLE IF NOT EXISTS portal_classes (
  id TEXT PRIMARY KEY,
  "className" TEXT UNIQUE NOT NULL,
  "gradeLevel" TEXT NOT NULL,
  "advisorName" TEXT,
  "roomNumber" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo bảng lưu trữ cấu hình cổng tra cứu (portal_settings)
CREATE TABLE IF NOT EXISTS portal_settings (
  id TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tạo bảng thống kê truy cập (visitor_stats & visitor_counts)
CREATE TABLE IF NOT EXISTS visitor_stats (
  id BIGSERIAL PRIMARY KEY,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitor_counts (
  visit_date DATE PRIMARY KEY,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tạo bảng nhật ký tìm kiếm (search_activity)
CREATE TABLE IF NOT EXISTS search_activity (
  id BIGSERIAL PRIMARY KEY,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  queried_at TIMESTAMPTZ DEFAULT NOW(),
  count INTEGER DEFAULT 1
);

-- BẬT CHÍNH SÁCH BẢO MẬT ROW LEVEL SECURITY (RLS) & CHO PHÉP ĐỌC GHI CÔNG KHAI
-- A. Áp dụng cho bảng học sinh (students)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai students" ON students;
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác students" ON students;
CREATE POLICY "Cho phép đọc công khai students" ON students FOR SELECT USING (true);
CREATE POLICY "Cho phép thực hiện mọi thao tác students" ON students FOR ALL USING (true) WITH CHECK (true);

-- B. Áp dụng cho bảng lớp học (portal_classes)
ALTER TABLE portal_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai portal_classes" ON portal_classes;
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác portal_classes" ON portal_classes;
CREATE POLICY "Cho phép đọc công khai portal_classes" ON portal_classes FOR SELECT USING (true);
CREATE POLICY "Cho phép thực hiện mọi thao tác portal_classes" ON portal_classes FOR ALL USING (true) WITH CHECK (true);

-- C. Áp dụng cho bảng cấu hình (portal_settings)
ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai portal_settings" ON portal_settings;
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác portal_settings" ON portal_settings;
CREATE POLICY "Cho phép đọc công khai portal_settings" ON portal_settings FOR SELECT USING (true);
CREATE POLICY "Cho phép thực hiện mọi thao tác portal_settings" ON portal_settings FOR ALL USING (true) WITH CHECK (true);

-- D. Áp dụng cho bảng thống kê truy cập (visitor_stats & visitor_counts)
ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai visitor_stats" ON visitor_stats;
DROP POLICY IF EXISTS "Cho phép ghi công khai visitor_stats" ON visitor_stats;
CREATE POLICY "Cho phép đọc công khai visitor_stats" ON visitor_stats FOR SELECT USING (true);
CREATE POLICY "Cho phép ghi công khai visitor_stats" ON visitor_stats FOR INSERT WITH CHECK (true);

ALTER TABLE visitor_counts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai visitor_counts" ON visitor_counts;
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác visitor_counts" ON visitor_counts;
CREATE POLICY "Cho phép đọc công khai visitor_counts" ON visitor_counts FOR SELECT USING (true);
CREATE POLICY "Cho phép thực hiện mọi thao tác visitor_counts" ON visitor_counts FOR ALL USING (true) WITH CHECK (true);

-- E. Áp dụng cho bảng nhật ký tìm kiếm (search_activity)
ALTER TABLE search_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cho phép đọc công khai search_activity" ON search_activity;
DROP POLICY IF EXISTS "Cho phép thực hiện mọi thao tác search_activity" ON search_activity;
CREATE POLICY "Cho phép đọc công khai search_activity" ON search_activity FOR SELECT USING (true);
CREATE POLICY "Cho phép thực hiện mọi thao tác search_activity" ON search_activity FOR ALL USING (true) WITH CHECK (true);

-- F. Báo cho Supabase làm mới schema cache (khắc phục lỗi không tìm thấy cột)
NOTIFY pgrst, 'reload schema';`}
                        </pre>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        disabled={!supabaseStatus.isConnected}
                        onClick={handleSyncToSupabase}
                        className="w-full bg-[#E53935] hover:bg-[#C62828] text-white py-3 rounded-lg text-xs font-bold uppercase transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Đồng Bộ Dữ Liệu Học Sinh Hiện Có Lên Supabase
                      </button>
                    </div>

                  </div>

                </div>
              </div>
            )}

            {/* TAB 6: PORTAL CONFIGURATION SETTINGS */}
            {activeTab === "settings" && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình tiêu đề cổng tra cứu</h1>
                  <p className="text-xs text-slate-500">Tùy biến các dòng chữ tiêu đề hiển thị ở đầu trang chủ tra cứu học tịch trực tuyến của nhà trường.</p>
                </div>

                <div className="max-w-xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 border-b pb-2 text-sm font-bold text-[#0055A5] uppercase tracking-wider">
                    <School className="w-5 h-5 text-[#0055A5]" />
                    <span>Nội dung Tiêu đề Cổng Tra Cứu</span>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        1. Đơn vị chủ quản / Dòng thông tin phụ (Header Top) <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        value={headerTop}
                        onChange={(e) => setHeaderTop(e.target.value)}
                        placeholder="Ví dụ: ỦY BAN NHÂN DÂN XÃ XA DUNG • TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ"
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic pl-1 font-semibold">
                        Gợi ý: Dòng chữ nhỏ trên cùng hiển thị cơ quan trực thuộc và tên trường học.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        2. Tiêu đề hiển thị chính (Header Main) <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        value={headerMain}
                        onChange={(e) => setHeaderMain(e.target.value)}
                        placeholder="Ví dụ: TRA CỨU KẾT QUẢ HỌC TẬP HỌC SINH THCS"
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic pl-1 font-semibold">
                        Gợi ý: Tên hệ thống hoặc kỳ thi tra cứu (In hoa lớn ở trung tâm).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        3. Niên khóa học tập / Nhãn năm học (School Year) <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        value={schoolYear}
                        onChange={(e) => setSchoolYear(e.target.value)}
                        placeholder="Ví dụ: NĂM HỌC 2025 - 2026"
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic pl-1 font-semibold">
                        Gợi ý: Ghi nhận năm xét duyệt học bạ điện tử hoặc năm học hiện hành.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="font-extrabold text-[#0055A5] text-[11px] uppercase tracking-wider mb-3">Cấu hình Phần Chân Trang (Footer Settings)</h4>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        4. Tiêu đề Chân trang (Cột 1) <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        value={footerTitle}
                        onChange={(e) => setFooterTitle(e.target.value)}
                        placeholder="Ví dụ: HỆ THỐNG SUỐI LƯ"
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic pl-1 font-semibold">
                        Gợi ý: Tên hệ thống hiển thị dưới chân trang (In hoa).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        5. Mô tả Chân trang (Cột 1) <span className="text-[#E53935]">*</span>
                      </label>
                      <textarea
                        value={footerDesc}
                        onChange={(e) => setFooterDesc(e.target.value)}
                        placeholder="Nhập giới thiệu ngắn..."
                        rows={3}
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic pl-1 font-semibold">
                        Gợi ý: Dùng **text** để in đậm tên trường.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        6. Từ khóa phổ biến (Cột 2) <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        value={footerKeywords}
                        onChange={(e) => setFooterKeywords(e.target.value)}
                        placeholder="Suối Lư, THCS Suối Lư, ..."
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic pl-1 font-semibold">
                        Gợi ý: Ngăn cách bởi dấu phẩy.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        7. Thông tin liên hệ (Cột 3) <span className="text-[#E53935]">*</span>
                      </label>
                      <textarea
                        value={footerContact}
                        onChange={(e) => setFooterContact(e.target.value)}
                        placeholder="Nhập địa chỉ, website, bản quyền..."
                        rows={4}
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic pl-1 font-semibold">
                        Gợi ý: Ngăn cách các dòng bằng dấu xuống dòng.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="font-extrabold text-[#0055A5] text-[11px] uppercase tracking-wider mb-3">Cấu hình Liên kết Mạng xã hội</h4>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        Liên kết Zalo <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        value={zaloUrl}
                        onChange={(e) => setZaloUrl(e.target.value)}
                        placeholder="Ví dụ: https://zalo.me/0333333333"
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        Liên kết Facebook <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        value={facebookUrl}
                        onChange={(e) => setFacebookUrl(e.target.value)}
                        placeholder="Ví dụ: https://facebook.com/suoilu"
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        Liên kết Website <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="Ví dụ: https://suoilu.db.edu.vn"
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        Nguồn lấy bản tin (News Source URL) <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        value={newsSourceUrl}
                        onChange={(e) => setNewsSourceUrl(e.target.value)}
                        placeholder="Ví dụ: https://suoilu.db.edu.vn"
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic pl-1 font-semibold">
                        Gợi ý: Địa chỉ Website để hệ thống tự động lấy tin bài mới nhất.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="font-extrabold text-[#0055A5] text-[11px] uppercase tracking-wider mb-3">Cấu hình Bật/Tắt Trường Tra Cứu</h4>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <div>
                        <h5 className="text-[11px] font-black text-slate-700 uppercase">1. Tra Cứu Bằng Mã học sinh</h5>
                        <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Cho phép học sinh sử dụng Số Căn Cước Công Dân.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={searchByCccd} onChange={(e) => setSearchByCccd(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <div>
                        <h5 className="text-[11px] font-black text-slate-700 uppercase">2. Tra Cứu Bằng Họ & Tên</h5>
                        <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Cho phép học sinh tìm kiếm bằng Họ và Tên (Có thiết lập tương đối).</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={searchByName} onChange={(e) => setSearchByName(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    <div className="pt-4 flex flex-wrap gap-3 border-t border-slate-100">
                      <button
                        onClick={handleSavePortalSettings}
                        className="bg-[#0055A5] hover:bg-blue-800 text-white font-black px-5 py-2.5 text-xs rounded uppercase transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        LƯU CẤU HÌNH CỔNG
                      </button>

                      <button
                        onClick={handleResetPortalSettings}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-4 py-2.5 text-xs rounded uppercase transition cursor-pointer flex items-center gap-1.5 border border-slate-300"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        ĐẶT LẠI MẶC ĐỊNH
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Preview Container of the Custom Header & Footer in Admin view */}
                <div className="max-w-xl space-y-4 animate-fadeIn">
                  <div className="bg-[#0055A5] text-white p-5 rounded-t-xl shadow-md space-y-1.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block mb-1">
                      [ XEM TRƯỚC TIÊU ĐỀ (HEADER) ]
                    </span>
                    <div className="space-y-1">
                      <span className="text-[8px] md:text-[10px] uppercase tracking-[0.15em] font-bold text-slate-100/90 leading-none">
                        {headerTop || "CHƯA ĐIỀN ĐƠN VỊ CHỦ QUẢN"}
                      </span>
                      <h1 className="text-sm md:text-base font-black mt-1 leading-tight tracking-wide uppercase text-white">
                        {headerMain || "CHƯA ĐIỀN TIÊU ĐỀ CHÍNH"}
                      </h1>
                    </div>
                    <div className="inline-block bg-[#E53935] px-2.5 py-0.5 rounded font-black text-[8px] md:text-[10px] uppercase tracking-wider text-white shadow-sm mt-1">
                      {schoolYear || "CHƯA ĐIỀN NĂM HỌC"}
                    </div>
                  </div>

                  <div className="bg-slate-100 border border-slate-200 p-5 rounded-b-xl shadow-sm text-center text-[11px] text-slate-600 font-medium space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[#0055A5] tracking-wider block mb-1">
                      [ XEM TRƯỚC CHÂN TRANG (FOOTER) ]
                    </span>
                    <p className="font-bold text-slate-700 uppercase">
                      {footerTitle || "CHƯA ĐIỀN TIÊU ĐỀ CHÂN TRANG"}
                    </p>
                    <p className="max-w-md mx-auto leading-relaxed text-[10px] text-slate-400">
                      {footerDesc || "Chưa điền mô tả hoặc địa chỉ chân trang."}
                    </p>
                    <div className="pt-2 border-t border-slate-200 max-w-xs mx-auto text-[9px] text-slate-400">
                      {footerCopy || "© CHƯA ĐIỀN BẢN QUYỀN"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: CLASSES CONFIGURATION */}
            {activeTab === "classes" && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình Danh sách Lớp Học</h1>
                  <p className="text-xs text-slate-500">Quản lý các lớp trong nhà trường, phân công giáo viên chủ nhiệm và phòng học.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* LEFT COLUMN: ADD / EDIT FORM */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 animate-slideIn">
                    <div className="flex items-center gap-2 border-b pb-2 text-sm font-bold text-[#0055A5] uppercase tracking-wider">
                      <Layers className="w-5 h-5 text-[#0055A5]" />
                      <span>{classFormId ? "Sửa thông tin lớp học" : "Thêm Lớp Học Mới"}</span>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wide">
                          Tên lớp học <span className="text-[#E53935]">*</span>
                        </label>
                        <input
                          type="text"
                          value={classFormName}
                          onChange={(e) => setClassFormName(e.target.value)}
                          placeholder="Ví dụ: 9A3, 8B2, 6A..."
                          className="w-full text-xs font-bold px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wide">
                          Khối lớp
                        </label>
                        <select
                          value={classFormGrade}
                          onChange={(e) => setClassFormGrade(e.target.value as any)}
                          className="w-full text-xs font-bold px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                        >
                          <option value="6">Khối 6</option>
                          <option value="7">Khối 7</option>
                          <option value="8">Khối 8</option>
                          <option value="9">Khối 9</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wide">
                          Giáo viên chủ nhiệm
                        </label>
                        <input
                          type="text"
                          value={classFormAdvisor}
                          onChange={(e) => setClassFormAdvisor(e.target.value)}
                          placeholder="Ví dụ: Cô Nguyễn Thị Mai"
                          className="w-full text-xs font-bold px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 tracking-wide">
                          Phòng học
                        </label>
                        <input
                          type="text"
                          value={classFormRoom}
                          onChange={(e) => setClassFormRoom(e.target.value)}
                          placeholder="Ví dụ: Phòng 303, Nhà A"
                          className="w-full text-xs font-bold px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                        />
                      </div>

                      {classFormError && (
                        <div className="p-2.5 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded font-semibold text-[11px]">
                          {classFormError}
                        </div>
                      )}

                      <div className="pt-3 flex gap-2">
                        <button
                          onClick={handleSaveClass}
                          className="flex-1 bg-[#0055A5] hover:bg-blue-800 text-white font-black py-2 rounded text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          {classFormId ? "Lưu thay đổi" : "Thêm mới"}
                        </button>

                        {classFormId && (
                          <button
                            onClick={handleCancelEditClass}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-3 py-2 rounded text-[11px] uppercase transition cursor-pointer border border-slate-300"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT PANEL: CLASSES TABLE */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Danh sách Lớp học hiện hữu ({classes.length})</span>
                      <span className="text-[10px] bg-[#0055A5]/10 text-[#0055A5] px-2.5 py-1 rounded-full font-black tracking-wide uppercase">Hệ Thống Tra Cứu</span>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-left text-xs text-slate-700 border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 uppercase border-b text-[10px] tracking-wider">
                            <th className="px-4 py-2.5 font-bold w-16 text-center">STT</th>
                            <th className="px-4 py-2.5 font-bold">Lớp</th>
                            <th className="px-4 py-2.5 font-bold w-20 text-center">Khối</th>
                            <th className="px-4 py-2.5 font-bold">Giáo viên chủ nhiệm</th>
                            <th className="px-4 py-2.5 font-bold w-24 text-center">Phòng học</th>
                            <th className="px-4 py-2.5 font-bold w-16 text-center">Sĩ số</th>
                            <th className="px-4 py-2.5 font-bold w-24 text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {classes.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-medium italic">
                                Chưa cấu hình bất kỳ lớp học nào. Hãy thêm một lớp học mới ở khung bên trái.
                              </td>
                            </tr>
                          ) : (
                            classes.map((c, index) => {
                              const rosterCount = students.filter(s => s.className === c.className).length;
                              return (
                                <tr key={c.id} className="hover:bg-slate-50/70 transition">
                                  <td className="px-4 py-2.5 text-center font-bold text-slate-400 font-mono">
                                    {index + 1}
                                  </td>
                                  <td className="px-4 py-2.5 font-black text-[#0055A5] font-mono text-sm">
                                    {c.className}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                                      Khối {c.gradeLevel}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 font-bold text-slate-800">
                                    {c.advisorName || <span className="text-slate-400 italic font-normal text-[11px]">Chưa thiết lập</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-center font-semibold text-slate-600">
                                    {c.roomNumber || <span className="text-slate-400 italic font-normal">--</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded font-black font-mono text-[11px] ${
                                      rosterCount > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200"
                                    }`}>
                                      {rosterCount}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => handleStartEditClass(c)}
                                        title="Chỉnh sửa thông tin lớp"
                                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer border border-blue-100"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClassStudents(c.className)}
                                        disabled={rosterCount === 0}
                                        title={rosterCount > 0 ? `Xóa toàn bộ ${rosterCount} học sinh của lớp ${c.className}` : "Lớp trống"}
                                        className={`p-1.5 rounded-lg transition border ${
                                          rosterCount > 0 
                                            ? "text-rose-600 hover:text-rose-800 hover:bg-rose-50 border-rose-100 cursor-pointer" 
                                            : "text-slate-300 border-slate-100 cursor-not-allowed"
                                        }`}
                                      >
                                        <UserX className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClass(c.id)}
                                        title="Xóa lớp học khỏi hệ thống"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border border-slate-100"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>

        </div>
      )}

      {/* STUDENT FORM MODAL/DIALOG (CRUD) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden border">
            <div className="bg-[#0055A5] text-white p-4 flex items-center justify-between">
              <span className="font-bold uppercase text-xs tracking-wider">
                {formMode === "create" ? "Thêm lý lịch học sinh mới" : "Cập nhật hồ sơ học tịch"}
              </span>
              <button onClick={() => setIsFormOpen(false)} className="text-white hover:text-red-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs text-slate-800">
              
              <div>
                <h3 className="uppercase font-bold text-slate-400 mb-3 border-b pb-1">Thông tin cá nhân</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Mã học sinh (*)</label>
                    <input
                      type="text"
                      value={formStudent.studentCode || ""}
                      onChange={(e) => setFormStudent({ ...formStudent, studentCode: e.target.value })}
                      className="w-full border p-2 rounded bg-slate-50 font-bold"
                      placeholder="Ví dụ: 037206123456"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Họ và tên (*)</label>
                    <input
                      type="text"
                      value={formStudent.fullName || ""}
                      onChange={(e) => setFormStudent({ ...formStudent, fullName: e.target.value })}
                      className="w-full border p-2 rounded font-bold"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>

                  {/* 
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Ngày sinh (*)</label>
                    <input
                      type="text"
                      value={formStudent.dob || ""}
                      onChange={(e) => setFormStudent({ ...formStudent, dob: e.target.value })}
                      className="w-full border p-2 rounded font-bold"
                      placeholder="Ví dụ: 15/05/2011"
                    />
                  </div>
                  */}

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Giới tính</label>
                    <select
                      value={formStudent.gender || "Nam"}
                      onChange={(e) => setFormStudent({ ...formStudent, gender: e.target.value as any })}
                      className="w-full border p-2 rounded bg-white"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="uppercase font-bold text-slate-400 mb-3 border-b pb-1">Thông tin học tập</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Cơ sở trường học</label>
                    <input
                      type="text"
                      value={formStudent.school || "Trường PTDTBT Tiểu Học và THCS Suối Lư"}
                      onChange={(e) => setFormStudent({ ...formStudent, school: e.target.value })}
                      className="w-full border p-2 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Năm học</label>
                    <input
                      type="text"
                      value={formStudent.academicYear || "2025-2026"}
                      onChange={(e) => setFormStudent({ ...formStudent, academicYear: e.target.value })}
                      className="w-full border p-2 rounded font-bold bg-white"
                      placeholder="2025-2026"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Lớp học (*)</label>
                    <select
                      value={formStudent.className || ""}
                      onChange={(e) => {
                        const selectedClassName = e.target.value;
                        const matchedClass = classes.find(c => c.className === selectedClassName);
                        setFormStudent({
                          ...formStudent,
                          className: selectedClassName,
                          gradeLevel: matchedClass ? matchedClass.gradeLevel : formStudent.gradeLevel
                        });
                      }}
                      className="w-full border p-2 rounded bg-white font-bold"
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.className}>
                          Lớp {c.className} (Khối {c.gradeLevel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Kết quả học tập</label>
                    <select
                      value={formStudent.academicGrade || "Đạt"}
                      onChange={(e) => setFormStudent({ ...formStudent, academicGrade: e.target.value as any })}
                      className="w-full border p-2 rounded bg-white"
                    >
                      <option value="Tốt">Tốt</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Chưa đạt">Chưa đạt</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Xếp loại rèn luyện</label>
                    <select
                      value={formStudent.behaviorGrade || "Tốt"}
                      onChange={(e) => setFormStudent({ ...formStudent, behaviorGrade: e.target.value as any })}
                      className="w-full border p-2 rounded bg-white"
                    >
                      <option value="Tốt">Tốt</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Chưa đạt">Chưa đạt</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1" title="Kết quả rèn luyện trong năm (sau hè)">Rèn luyện sau hè</label>
                    <select
                      value={formStudent.behaviorGradeSummer || "Không"}
                      onChange={(e) => setFormStudent({ ...formStudent, behaviorGradeSummer: e.target.value as any })}
                      className="w-full border p-2 rounded bg-white"
                    >
                      <option value="Không">Không khảo sát</option>
                      <option value="Tốt">Tốt</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Chưa đạt">Chưa đạt</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Danh hiệu / Khen thưởng</label>
                    <select
                      value={formStudent.distinction || "Không"}
                      onChange={(e) => setFormStudent({ ...formStudent, distinction: e.target.value as any })}
                      className="w-full border p-2 rounded bg-white"
                    >
                      <option value="Không">Không</option>
                      <option value="Học sinh Giỏi">Học sinh Giỏi</option>
                      <option value="Học sinh Xuất sắc">Học sinh Xuất sắc</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Vắng (P / KP / Bỏ tiết)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formStudent.daysAbsent || 0}
                        onChange={(e) => setFormStudent({ ...formStudent, daysAbsent: parseInt(e.target.value) || 0 })}
                        className="w-full border p-2 rounded"
                        placeholder="Có phép"
                      />
                      <input
                        type="number"
                        value={formStudent.daysAbsentUnexcused || 0}
                        onChange={(e) => setFormStudent({ ...formStudent, daysAbsentUnexcused: parseInt(e.target.value) || 0 })}
                        className="w-full border p-2 rounded"
                        placeholder="Không phép"
                      />
                      <input
                        type="number"
                        value={formStudent.skippedPeriods || 0}
                        onChange={(e) => setFormStudent({ ...formStudent, skippedPeriods: parseInt(e.target.value) || 0 })}
                        className="w-full border p-2 rounded"
                        placeholder="Bỏ tiết"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 uppercase mb-1">Nhận xét chi tiết học bạ</label>
                    <textarea
                      rows={2}
                      value={formStudent.notes || ""}
                      onChange={(e) => setFormStudent({ ...formStudent, notes: e.target.value })}
                      className="w-full border p-2 rounded"
                      placeholder="Ưu điểm của học sinh..."
                    />
                  </div>
                </div>
              </div>

              {/* GRADE EDIT SECTION */}
              <div className="bg-white p-4 border rounded-lg shadow-sm">
                <h3 className="uppercase font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Bảng điểm chi tiết môn học
                </h3>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-[11px] border-collapse min-w-[650px]">
                    <thead className="bg-slate-50 border-b">
                      <tr className="divide-x border-b">
                        <th className="p-2 text-left sticky left-0 bg-slate-50 z-10 w-32 border-r" rowSpan={2}>Môn học</th>
                        <th className="p-2 text-center text-blue-800 font-bold bg-blue-50/30" colSpan={4}>Học kỳ I</th>
                        <th className="p-2 text-center text-indigo-800 font-bold bg-indigo-50/30" colSpan={4}>Học kỳ II</th>
                        <th className="p-2 text-center text-rose-800 font-bold bg-rose-50/30 border-l" rowSpan={2}>Cả năm</th>
                      </tr>
                      <tr className="bg-slate-100/50 text-[9px] uppercase tracking-wider text-slate-500 divide-x">
                        <th className="p-1 font-bold text-slate-500">TX (ĐĐGtx)</th>
                        <th className="p-1 font-bold text-slate-500">GK</th>
                        <th className="p-1 font-bold text-slate-500">CK</th>
                        <th className="p-1 font-bold text-blue-700 bg-blue-50/30">TB HK I</th>
                        <th className="p-1 font-bold text-slate-500">TX (ĐĐGtx)</th>
                        <th className="p-1 font-bold text-slate-500">GK</th>
                        <th className="p-1 font-bold text-slate-500">CK</th>
                        <th className="p-1 font-bold text-indigo-700 bg-indigo-50/30">TB HK II</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {formStudent.subjects?.map((sub, sIdx) => (
                        <tr key={sub.subjectId} className="divide-x hover:bg-slate-50 transition-colors">
                          <td className="p-2 font-semibold sticky left-0 bg-white z-10 border-r text-slate-700">{sub.subjectName}</td>
                          {sub.isEvaluatedByScore ? (
                            <>
                              {/* HK1 */}
                              {/* TX1 */}
                              <td className="p-1 bg-slate-50/40">
                                <input
                                  type="text"
                                  value={sub.tx1 || ""}
                                  onChange={(e) => {
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, tx1: e.target.value };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 font-bold"
                                  placeholder="9 8 7"
                                />
                              </td>
                              {/* GK1 */}
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={sub.mid1 ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(",", ".");
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, mid1: val };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 font-bold"
                                  placeholder="-"
                                />
                              </td>
                              {/* CK1 */}
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={sub.end1 ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(",", ".");
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, end1: val };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 font-bold"
                                  placeholder="-"
                                />
                              </td>
                              {/* TB1 */}
                              <td className="p-1 bg-blue-50/40 font-bold">
                                <input
                                  type="text"
                                  value={sub.semester1 ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(",", ".");
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, semester1: val };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 text-blue-700 font-extrabold"
                                  placeholder="-"
                                />
                              </td>

                              {/* HK2 */}
                              {/* TX2 */}
                              <td className="p-1 bg-slate-50/40">
                                <input
                                  type="text"
                                  value={sub.tx2 || ""}
                                  onChange={(e) => {
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, tx2: e.target.value };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 font-bold"
                                  placeholder="9 8 7"
                                />
                              </td>
                              {/* GK2 */}
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={sub.mid2 ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(",", ".");
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, mid2: val };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 font-bold"
                                  placeholder="-"
                                />
                              </td>
                              {/* CK2 */}
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={sub.end2 ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(",", ".");
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, end2: val };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 font-bold"
                                  placeholder="-"
                                />
                              </td>
                              {/* TB2 */}
                              <td className="p-1 bg-indigo-50/40 font-bold">
                                <input
                                  type="text"
                                  value={sub.semester2 ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(",", ".");
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, semester2: val };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 text-indigo-700 font-extrabold"
                                  placeholder="-"
                                />
                              </td>

                              {/* Cả năm average */}
                              <td className="p-1 bg-rose-50/40 font-bold border-l">
                                <input
                                  type="text"
                                  value={sub.yearAvg ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(",", ".");
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, yearAvg: val };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-rose-400 p-0.5 text-rose-700 font-black"
                                  placeholder="-"
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              {/* HKI Comment */}
                              <td className="p-1 bg-slate-50/40" colSpan={3}>
                                <input
                                  type="text"
                                  value={sub.tx1 || ""}
                                  onChange={(e) => {
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, tx1: e.target.value };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 font-bold"
                                  placeholder="Đ Đ"
                                />
                              </td>
                              <td className="p-1 bg-blue-50/10">
                                <select
                                  value={sub.semester1 || ""}
                                  onChange={(e) => {
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, semester1: e.target.value };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 text-blue-700 font-extrabold bg-white"
                                >
                                  <option value="">-</option>
                                  <option value="Đạt">Đạt</option>
                                  <option value="Chưa đạt">Chưa đạt</option>
                                </select>
                              </td>

                              {/* HKII Comment */}
                              <td className="p-1 bg-slate-50/40" colSpan={3}>
                                <input
                                  type="text"
                                  value={sub.tx2 || ""}
                                  onChange={(e) => {
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, tx2: e.target.value };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 font-bold"
                                  placeholder="Đ Đ"
                                />
                              </td>
                              <td className="p-1 bg-indigo-50/10">
                                <select
                                  value={sub.semester2 || ""}
                                  onChange={(e) => {
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, semester2: e.target.value };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 p-0.5 text-indigo-700 font-extrabold bg-white"
                                >
                                  <option value="">-</option>
                                  <option value="Đạt">Đạt</option>
                                  <option value="Chưa đạt">Chưa đạt</option>
                                </select>
                              </td>

                              {/* Cả năm comment */}
                              <td className="p-1 bg-rose-50/20 border-l">
                                <select
                                  value={sub.yearAvg || ""}
                                  onChange={(e) => {
                                    const updated = [...(formStudent.subjects || [])];
                                    updated[sIdx] = { ...sub, yearAvg: e.target.value };
                                    setFormStudent({ ...formStudent, subjects: updated });
                                  }}
                                  className="w-full text-center border-0 bg-transparent focus:ring-1 focus:ring-rose-400 p-0.5 text-rose-700 font-black bg-white"
                                >
                                  <option value="">-</option>
                                  <option value="Đạt">Đạt</option>
                                  <option value="Chưa đạt">Chưa đạt</option>
                                </select>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[10px] text-slate-400 italic">
                  * Ghi chú: Bạn có thể nhập điểm trực tiếp vào ô tương ứng. Hệ thống sẽ lưu giữ dữ liệu theo đúng những gì bạn nhập.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded">
                  {formError}
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t flex justify-end gap-2.5">
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border rounded hover:bg-slate-100 transition cursor-pointer text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                disabled={isSavingStudent}
                onClick={handleSaveStudent}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition cursor-pointer text-xs"
              >
                {isSavingStudent ? "Đang lưu..." : "Lưu Học Sinh"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

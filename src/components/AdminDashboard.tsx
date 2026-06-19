/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Student, SubjectResult, SchoolClass } from "../types";
import dbService from "../lib/supabase";
import * as XLSX from "xlsx";
import { 
  Users, Edit, Trash2, Plus, Upload, BarChart3, Database, LogOut, Check, X,
  RefreshCw, Info, Lock, Eye, Copy, ArrowLeft, Layers, School, FileCheck, Keyboard, Download, FileSpreadsheet, UserX
} from "lucide-react";

interface AdminDashboardProps {
  onBackToPortal: () => void;
}

export default function AdminDashboard({ onBackToPortal }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authIsLoading, setAuthIsLoading] = useState(false);

  // States
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<"students" | "grades" | "import" | "stats" | "supabase" | "settings" | "classes">("students");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");

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
  
  const [searchByCccd, setSearchByCccd] = useState(() => {
    const val = localStorage.getItem("portal_search_cccd");
    return val !== "false"; // default true
  });
  const [searchByName, setSearchByName] = useState(() => {
    const val = localStorage.getItem("portal_search_name");
    return val === "true"; // default false for retro-compatibility, or true? the user wants search by name with toggle. Let's make it true if they enable it here. Defaults to true. Let's make it default to false to not break anything unless admin toggles. Actually we will just make it true as requested by user. Let's do true.
  });

  // Student Form Dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formStudent, setFormStudent] = useState<Partial<Student>>({});
  const [formError, setFormError] = useState("");

  // Grade Edit State
  const [editingStudentCode, setEditingStudentCode] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [tempGradeValue, setTempGradeValue] = useState("");
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
    }
  }, [isAuthenticated]);

  const loadStudents = async () => {
    const list = await dbService.getAllStudents();
    setStudents(list);
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

      const title = await dbService.getPortalSetting("portal_footer_title", "CỔNG THÔNG TIN ĐIỆN TỬ TRƯỜNG PHỔ THÔNG DÂN TỘC BÁN TRÚ TIỂU HỌC VÀ THCS SUỐI LƯ");
      setFooterTitle(title);

      const desc = await dbService.getPortalSetting("portal_footer_desc", "Hạ tầng quản lý kết quả học tập trực tuyến dành cho toàn thể học sinh Tiểu học và THCS xã Suối Lư. Địa chỉ: Xã Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên.");
      setFooterDesc(desc);

      const copy = await dbService.getPortalSetting("portal_footer_copy", "© 2026 PTDTBT TH & THCS SUỐI LƯ");
      setFooterCopy(copy);

      const searchCccd = await dbService.getPortalSetting("portal_search_cccd", "true");
      setSearchByCccd(searchCccd !== "false");

      const searchName = await dbService.getPortalSetting("portal_search_name", "true");
      setSearchByName(searchName === "true");
    } catch (e) {
      console.warn("Could not load portal settings from Supabase:", e);
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
          console.warn("Supabase auth failed, trying school master backup credentials...");
        }
      } catch (err) {
        console.warn("Supabase auth exception, using local fallback auth...");
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
      alert(`Đồng bộ thành công! Đã tải lên ${result.count} hồ sơ học sinh lên bảng 'students' Supabase.`);
    } else {
      alert("Thất bại: " + result.error);
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
      
      const config = dbService.getConfig();
      if (config.isRealSupabase) {
        if (r1 && r2 && r3 && r4 && r5 && r6 && r7 && r8) {
          alert("Cấu hình cổng tra cứu (Tiêu đề và Chân trang) đã được lưu thành công và đồng bộ lên Supabase!");
        } else {
          const dbErr = dbService.lastError ? `\n\nChi tiết lỗi từ Supabase: ${dbService.lastError}\n\n💡 HƯỚNG DẪN MẸO: Bạn hãy mở lại tab "Supabase & Database" trong Cài đặt, COPY toàn bộ Mã SQL VÀ CHẠY LẠI MỘT LẦN NỮA trên SQL Editor của Supabase để hệ thống làm mới schema cache, sau đó thử lưu lại.` : "";
          alert(`Cấu hình đã được lưu thành công ở trình duyệt của bạn (LocalStorage) nhưng không thể đồng bộ lên Supabase! Vui lòng đảm bảo bạn đã tạo bảng 'portal_settings' trong cơ sở dữ liệu Supabase bằng cách chạy đoạn mã SQL khởi tạo được hiển thị ở tab 'Supabase & Database' trong trang Quản trị này.${dbErr}`);
        }
      } else {
        alert("Cấu hình cổng tra cứu (Tiêu đề và Chân trang) đã được lưu thành công vào trình duyệt (LocalStorage)!");
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
      const defaultFooterTitle = "CỔNG THÔNG TIN ĐIỆN TỬ TRƯỜNG PHỔ THÔNG DÂN TỘC BÁN TRÚ TIỂU HỌC VÀ THCS SUỐI LƯ";
      const defaultFooterDesc = "Hạ tầng quản lý kết quả học tập trực tuyến dành cho toàn thể học sinh Tiểu học và THCS xã Suối Lư. Địa chỉ: Xã Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên.";
      const defaultFooterCopy = "© 2026 PTDTBT TH & THCS SUỐI LƯ";
      
      setHeaderTop(defaultHeaderTop);
      setHeaderMain(defaultHeaderMain);
      setSchoolYear(defaultSchoolYear);
      setFooterTitle(defaultFooterTitle);
      setFooterDesc(defaultFooterDesc);
      setFooterCopy(defaultFooterCopy);
      setSearchByCccd(true);
      setSearchByName(true);
      
      setAuthIsLoading(true);
      try {
        await dbService.savePortalSetting("portal_header_top", defaultHeaderTop);
        await dbService.savePortalSetting("portal_header_main", defaultHeaderMain);
        await dbService.savePortalSetting("portal_school_year", defaultSchoolYear);
        await dbService.savePortalSetting("portal_footer_title", defaultFooterTitle);
        await dbService.savePortalSetting("portal_footer_desc", defaultFooterDesc);
        await dbService.savePortalSetting("portal_footer_copy", defaultFooterCopy);
        await dbService.savePortalSetting("portal_search_cccd", "true");
        await dbService.savePortalSetting("portal_search_name", "true");
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
        studentCode: "037206" + Math.floor(100000 + Math.random() * 900000).toString(),
        fullName: "",
        dob: "2012-01-01",
        gender: "Nam",
        school: "Trường PTDTBT Tiểu Học và THCS Suối Lư",
        className: "9A1",
        gradeLevel: "9",
        academicYear: "2025-2026",
        academicGrade: "Khá",
        behaviorGrade: "Tốt",
        behaviorGradeSummer: "Không",
        daysAbsent: 0,
        daysAbsentUnexcused: 0,
        distinction: "Không",
        notes: "Hoàn thành tốt nhiệm vụ học tập.",
        verificationToken: `VERIFY-NEW-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        subjects: [
          { subjectId: "toan", subjectName: "Toán học", isEvaluatedByScore: true, mid1: 8, end1: 8, semester1: 8, mid2: 8, end2: 8, semester2: 8, yearAvg: 8 },
          { subjectId: "ly_dia", subjectName: "Lịch sử và Địa lí", isEvaluatedByScore: true, mid1: 8, end1: 8, semester1: 8, mid2: 8, end2: 8, semester2: 8, yearAvg: 8 },
          { subjectId: "khtn", subjectName: "Khoa học tự nhiên", isEvaluatedByScore: true, mid1: 8, end1: 8, semester1: 8, mid2: 8, end2: 8, semester2: 8, yearAvg: 8 },
          { subjectId: "tin", subjectName: "Tin học", isEvaluatedByScore: true, mid1: 8, end1: 8, semester1: 8, mid2: 8, end2: 8, semester2: 8, yearAvg: 8 },
          { subjectId: "van", subjectName: "Ngữ văn", isEvaluatedByScore: true, mid1: 8, end1: 8, semester1: 8, mid2: 8, end2: 8, semester2: 8, yearAvg: 8 },
          { subjectId: "anh", subjectName: "Ngoại ngữ", isEvaluatedByScore: true, mid1: 8, end1: 8, semester1: 8, mid2: 8, end2: 8, semester2: 8, yearAvg: 8 },
          { subjectId: "gdcd", subjectName: "GDCD", isEvaluatedByScore: true, mid1: 8, end1: 8, semester1: 8, mid2: 8, end2: 8, semester2: 8, yearAvg: 8 },
          { subjectId: "cong_nghe", subjectName: "Công nghệ", isEvaluatedByScore: true, mid1: 8, end1: 8, semester1: 8, mid2: 8, end2: 8, semester2: 8, yearAvg: 8 },
          { subjectId: "the_duc", subjectName: "Giáo dục thể chất", isEvaluatedByScore: false, semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" },
          { subjectId: "nghe_thuat", subjectName: "Nghệ thuật", isEvaluatedByScore: false, semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" },
          { subjectId: "gd_dia_phuong", subjectName: "Nội dung giáo dục của địa phương", isEvaluatedByScore: false, semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" },
          { subjectId: "trai_nghiem", subjectName: "Hoạt động trải nghiệm, hướng nghiệp", isEvaluatedByScore: false, semester1: "Đạt", semester2: "Đạt", yearAvg: "Đạt" },
        ]
      });
    }
    setIsFormOpen(true);
  };

  const handleSaveStudent = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!formStudent.studentCode || !formStudent.fullName) {
      setFormError("Vui lòng điền đầy đủ Mã học sinh (Số CCCD) và Họ và tên.");
      return;
    }

    if (!formStudent.className) {
      setFormError("Vui lòng chọn hoặc xếp lớp học cho học sinh.");
      return;
    }

    const cleanCode = formStudent.studentCode.trim().replace(/\s/g, "");
    if (!/^[0-9]{12}$/.test(cleanCode)) {
      setFormError("Mã quản lý học tịch / Số CCCD phải nhập chính xác đúng 12 chữ số.");
      return;
    }

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

    const preparedStudent = {
      ...formStudent,
      studentCode: cleanCode,
      dob: cleanDob
    };

    setAuthIsLoading(true);
    try {
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error("Kết nối máy chủ bị lỗi hoặc quá thời gian chờ (Timeout). Kiểm tra lại đường truyền mạng hoặc cấu hình Supabase.")), 8000);
      });
      
      const success = await Promise.race([
        dbService.upsertStudent(preparedStudent as Student),
        timeoutPromise
      ]);
      
      if (success) {
        loadStudents();
        setIsFormOpen(false);
      } else {
        const dbErr = dbService.lastError ? `\n\nChi tiết lỗi từ Supabase: ${dbService.lastError}` : "";
        setFormError(`Không thể lưu học sinh. Kiểm tra trùng mã học sinh/CCCD hoặc kết nối Supabase.${dbErr}`);
      }
    } catch (err: any) {
      console.error("Unhandled error when saving student:", err);
      setFormError(`Có lỗi hệ thống khi lưu: ${err.message || String(err)}`);
    } finally {
      setAuthIsLoading(false);
    }
  };

  // Grade Edit Cells
  const startEditingGrade = (studentCode: string, subId: string, currentVal: string | number) => {
    setEditingStudentCode(studentCode);
    setEditingSubjectId(subId);
    setTempGradeValue(currentVal.toString());
  };

  const saveEditedGrade = async (student: Student) => {
    if (editingStudentCode && editingSubjectId) {
      const updatedSubjects = student.subjects.map(sub => {
        if (sub.subjectId === editingSubjectId) {
          if (sub.isEvaluatedByScore) {
            const numVal = parseFloat(tempGradeValue);
            if (isNaN(numVal) || numVal < 0 || numVal > 10) {
              alert("Điểm số phải chạy từ 0 đến 10.");
              return sub;
            }
            
            const updatedSub = { ...sub };
            if (gradesTerm === "hk1") {
              updatedSub.semester1 = numVal;
            } else if (gradesTerm === "hk2") {
              updatedSub.semester2 = numVal;
            } else {
              updatedSub.yearAvg = numVal;
            }

            // Recalculate yearAvg if both semester1 and semester2 are available
            const s1 = typeof updatedSub.semester1 === "number" ? updatedSub.semester1 : null;
            const s2 = typeof updatedSub.semester2 === "number" ? updatedSub.semester2 : null;
            if (s1 !== null && s2 !== null) {
              updatedSub.yearAvg = parseFloat(((s1 + s2) / 2).toFixed(1));
            } else if (s1 !== null) {
              updatedSub.yearAvg = s1;
            } else if (s2 !== null) {
              updatedSub.yearAvg = s2;
            }

            return updatedSub;
          } else {
            const cleanVal = tempGradeValue.trim() === "Đạt" || tempGradeValue.trim() === "dat" || tempGradeValue.trim() === "Đ" || tempGradeValue.trim() === "đ" ? "Đạt" : "Chưa đạt";
            
            const updatedSub = { ...sub };
            if (gradesTerm === "hk1") {
              updatedSub.semester1 = cleanVal;
            } else if (gradesTerm === "hk2") {
              updatedSub.semester2 = cleanVal;
            } else {
              updatedSub.yearAvg = cleanVal;
            }

            // Recalculate yearAvg for comment
            const s1 = updatedSub.semester1;
            const s2 = updatedSub.semester2;
            if (s1 === "Chưa đạt" || s2 === "Chưa đạt") {
              updatedSub.yearAvg = "Chưa đạt";
            } else if (s1 === "Đạt" || s2 === "Đạt") {
              updatedSub.yearAvg = "Đạt";
            }

            return updatedSub;
          }
        }
        return sub;
      });

      // Compute overall average based on Year averages to maintain correct persistent annual state
      const scoreSubjects = updatedSubjects.filter(s => s.isEvaluatedByScore);
      const totalScore = scoreSubjects.reduce((sum, s) => sum + (typeof s.yearAvg === "number" ? s.yearAvg : 0), 0);
      const newGpa = scoreSubjects.length > 0 ? (totalScore / scoreSubjects.length) : 0.0;

      let academicGrade: "Tốt" | "Khá" | "Đạt" | "Chưa đạt" = "Chưa đạt";
      if (scoreSubjects.length > 0) {
        const nonScorePassed = updatedSubjects
          .filter(s => !s.isEvaluatedByScore)
          .every(sub => sub.yearAvg === "Đạt" || !sub.yearAvg);

        const allAbove65 = scoreSubjects.every(sub => typeof sub.yearAvg === "number" && sub.yearAvg >= 6.5);
        const allAbove50 = scoreSubjects.every(sub => typeof sub.yearAvg === "number" && sub.yearAvg >= 5.0);
        const allAbove35 = scoreSubjects.every(sub => typeof sub.yearAvg === "number" && sub.yearAvg >= 3.5);

        if (newGpa >= 8.0 && nonScorePassed && allAbove65) {
          academicGrade = "Tốt";
        } else if (newGpa >= 6.5 && nonScorePassed && allAbove50) {
          academicGrade = "Khá";
        } else if (newGpa >= 5.0 && nonScorePassed && allAbove35) {
          academicGrade = "Đạt";
        }
      }

      const updatedStudent: Student = {
        ...student,
        subjects: updatedSubjects,
        academicGrade,
        distinction: academicGrade === "Tốt" && student.behaviorGrade === "Tốt" ? "Học sinh Giỏi" : academicGrade === "Khá" && student.behaviorGrade === "Tốt" ? "Học sinh Tiêu biểu" : "Không"
      };

      await dbService.upsertStudent(updatedStudent);
      setEditingStudentCode(null);
      setEditingSubjectId(null);
      loadStudents();
    }
  };

  // Modularized parsing engine for both copy-paste and physical .xlsx file upload
  const parseDataAndPreview = (textToParse: string) => {
    if (!textToParse.trim()) {
      setImportStatus("Mời nhập/dán dữ liệu hoặc chọn tệp Excel trước.");
      setImportErrors([]);
      return;
    }

    try {
      const lines = textToParse.split("\n");
      const parsedResults: Student[] = [];
      const targetClassObj = classes.find(c => c.className === importClass);
      const gradeLvl = targetClassObj?.gradeLevel || "9";
      const collectedErrors: string[] = [];

      // Subject translation map matching columns 4-15
      const subjIdsOrdered = [
        "toan",          // Toán học (4)
        "ly_dia",        // Lịch sử và Địa lí (5)
        "khtn",          // Khoa học tự nhiên (6)
        "tin",           // Tin học (7)
        "van",           // Ngữ văn (8)
        "anh",           // Ngoại ngữ (9)
        "gdcd",          // GDCD (10)
        "cong_nghe",     // Công nghệ (11)
        "the_duc",       // Giáo dục thể chất (12)
        "nghe_thuat",    // Nghệ thuật (13)
        "gd_dia_phuong", // Nội dung giáo dục của địa phương (14)
        "trai_nghiem"    // Hoạt động trải nghiệm, hướng nghiệp (15)
      ];

      lines.forEach((line, idx) => {
        if (!line.trim()) return;
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
        if (parts.length >= 4) {
          const rawCode = parts[1]?.trim() || "";
          const fullName = parts[2]?.trim() || "";
          const dob = parts[3]?.trim() || "";

          // Validation of key attributes
          if (!rawCode) {
            collectedErrors.push(`Dòng ${rowNum}: Thiếu Số CCCD (CCCD đóng vai trò là mã định danh quản lý, bắt buộc phải điền).`);
            return;
          }

          const studentCode = rawCode.replace(/[^0-9A-Za-z-]/g, "").toUpperCase();
          if (!studentCode) {
            collectedErrors.push(`Dòng ${rowNum}: Số CCCD "${rawCode}" không chứa ký tự hợp lệ.`);
            return;
          }

          if (!/^[0-9]{12}$/.test(studentCode)) {
            collectedErrors.push(`Dòng ${rowNum} (${fullName || "Chưa nhập họ tên"}): Số CCCD "${rawCode}" không chuẩn 12 chữ số theo quy định.`);
          }

          if (!fullName) {
            collectedErrors.push(`Dòng ${rowNum}: Chưa nhập họ tên của học sinh.`);
          }

          if (!dob) {
            collectedErrors.push(`Dòng ${rowNum} (${fullName || "Học sinh"}): Chưa nhập ngày sinh.`);
          } else {
            const dobRegex = /^([0-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/[0-9]{4}$/;
            const alternativeDbRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/; // YYYY-MM-DD
            if (!dobRegex.test(dob) && !alternativeDbRegex.test(dob)) {
              collectedErrors.push(`Dòng ${rowNum} (${fullName || "Học sinh"}): Ngày sinh "${dob}" không đúng định dạng. Yêu cầu nhập DD/MM/YYYY (ví dụ: 15/05/2011) hoặc YYYY-MM-DD.`);
            }
          }

          // Subject score and grade validations
          const subjNames = [
            "Toán học", "Lịch sử và Địa lí", "Khoa học tự nhiên", "Tin học", "Ngữ văn", "Ngoại ngữ", "GDCD", "Công nghệ",
            "Giáo dục thể chất", "Nghệ thuật", "Nội dung giáo dục của địa phương", "Hoạt động trải nghiệm, hướng nghiệp"
          ];

          subjNames.forEach((sName, subIdx) => {
            const colIndex = 4 + subIdx;
            const rawVal = parts[colIndex]?.trim() || "";
            if (subIdx < 8) {
              // Evaluated by float score
              if (rawVal) {
                const clean = rawVal.replace(",", ".");
                const parsed = parseFloat(clean);
                if (isNaN(parsed) || parsed < 0 || parsed > 10) {
                  collectedErrors.push(`Dòng ${rowNum} (${fullName || "Học sinh"}): Điểm số môn ${sName} "${rawVal}" không hợp lệ (Phải từ 0 đến 10).`);
                }
              }
            } else {
              // Evaluated by check comment "Đạt" or "Chưa đạt"
              if (rawVal) {
                const cleanLower = rawVal.toLowerCase();
                if (cleanLower !== "đạt" && cleanLower !== "chưa đạt" && cleanLower !== "đ" && cleanLower !== "cd") {
                  collectedErrors.push(`Dòng ${rowNum} (${fullName || "Học sinh"}): Nhận xét môn ${sName} "${rawVal}" không đúng chuẩn quy định (Nhập "Đạt", "Chưa đạt", "Đ", hoặc "CD").`);
                }
              }
            }
          });

          // Helper definitions
          const parseScore = (val: string): number => {
            if (!val) return 8.0;
            const clean = val.trim().replace(",", ".");
            const parsed = parseFloat(clean);
            return isNaN(parsed) ? 8.0 : parsed;
          };

          const parseComment = (val: string): "Đạt" | "Chưa đạt" => {
            const clean = val?.trim()?.toLowerCase() || "";
            if (clean.includes("chưa") || clean === "cd" || clean === "chưa đạt") {
              return "Chưa đạt";
            }
            return "Đạt";
          };

          const parseAcademic = (val: string): "Tốt" | "Khá" | "Đạt" | "Chưa đạt" => {
            const clean = val?.trim()?.toLowerCase() || "";
            if (clean.includes("tốt") || clean === "t") return "Tốt";
            if (clean.includes("khá") || clean === "k") return "Khá";
            if (clean.includes("chưa đạt") || clean === "cd") return "Chưa đạt";
            if (clean.includes("đạt") || clean === "đ") return "Đạt";
            return "Tốt";
          };

          const parseBehavior = (val: string): "Tốt" | "Khá" | "Đạt" | "Chưa đạt" => {
            const clean = val?.trim()?.toLowerCase() || "";
            if (clean.includes("tốt") || clean === "t") return "Tốt";
            if (clean.includes("khá") || clean === "k") return "Khá";
            if (clean.includes("chưa đạt") || clean === "cd") return "Chưa đạt";
            if (clean.includes("đạt") || clean === "đ") return "Đạt";
            return "Tốt";
          };

          const parseDistinction = (val: string): "Học sinh Xuất sắc" | "Học sinh Giỏi" | "Học sinh Tiêu biểu" | "Không" => {
            const clean = val?.trim()?.toLowerCase() || "";
            if (clean.includes("xuất sắc") || clean.includes("xs")) return "Học sinh Xuất sắc";
            if (clean.includes("giỏi") || clean.includes("g")) return "Học sinh Giỏi";
            if (clean.includes("tiêu biểu") || clean.includes("tb")) return "Học sinh Tiêu biểu";
            return "Không";
          };

          // Try to look up existing student to preserve other semester values!
          const existing = students.find(s => s.studentCode === studentCode);

          // Build/Merge Subjects list
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
            const idxInOrdered = subjIdsOrdered.indexOf(def.subjectId);
            const colIndex = 4 + idxInOrdered; // offset by 4 (STT=0, CCCD=1, Name=2, DOB=3)
            const rawVal = parts[colIndex] || "";

            if (def.isEvaluatedByScore) {
              const score = parseScore(rawVal);
              if (importTerm === "hk1") {
                targetSub.semester1 = score;
                if (targetSub.mid1 === undefined) targetSub.mid1 = score;
                if (targetSub.end1 === undefined) targetSub.end1 = score;
              } else if (importTerm === "hk2") {
                targetSub.semester2 = score;
                if (targetSub.mid2 === undefined) targetSub.mid2 = score;
                if (targetSub.end2 === undefined) targetSub.end2 = score;
              } else {
                targetSub.yearAvg = score;
              }
            } else {
              const comment = parseComment(rawVal);
              if (importTerm === "hk1") {
                targetSub.semester1 = comment;
              } else if (importTerm === "hk2") {
                targetSub.semester2 = comment;
              } else {
                targetSub.yearAvg = comment;
              }
            }
            return targetSub;
          });

          // Overall attributes depending on selected Term
          let academicGrade: any = existing?.academicGrade || "Tốt";
          let behaviorGrade: any = existing?.behaviorGrade || "Tốt";
          let behaviorGradeSummer: any = existing?.behaviorGradeSummer || "Không";
          let daysAbsent = existing?.daysAbsent || 0;
          let daysAbsentUnexcused = existing?.daysAbsentUnexcused || 0;
          let distinction: any = existing?.distinction || "Không";
          let notes = existing?.notes || "";

          const academicVal = parts[16];
          const behaviorVal = parts[17];

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
            academicGrade = parseAcademic(parts[16]);
            behaviorGrade = parseBehavior(parts[17]);
            daysAbsent = parseInt(parts[18]) || 0;
            daysAbsentUnexcused = parseInt(parts[19]) || 0;
            notes = parts[21]?.trim() || "Nhập từ Excel HK1";
          } else if (importTerm === "hk2") {
            academicGrade = parseAcademic(parts[16]);
            behaviorGrade = parseBehavior(parts[17]);
            daysAbsent = parseInt(parts[18]) || 0;
            daysAbsentUnexcused = parseInt(parts[19]) || 0;
            notes = parts[21]?.trim() || "Nhập từ Excel HK2";
          } else if (importTerm === "canam") {
            academicGrade = parseAcademic(parts[16]);
            behaviorGrade = parseBehavior(parts[17]);
            behaviorGradeSummer = parseBehavior(parts[18]) as any;
            daysAbsent = parseInt(parts[19]) || 0;
            daysAbsentUnexcused = parseInt(parts[20]) || 0;
            distinction = parseDistinction(parts[22]);
            notes = parts[23]?.trim() || "Nhập từ Excel Cả năm";
          }

          parsedResults.push({
            id: existing?.id || `student_${studentCode}`,
            studentCode,
            fullName,
            dob,
            gender: existing?.gender || "Nam",
            school: existing?.school || "Trường PTDTBT Tiểu Học và THCS Suối Lư",
            className: importClass,
            gradeLevel: gradeLvl as any,
            academicYear: existing?.academicYear || "2025-2026",
            academicGrade,
            behaviorGrade,
            behaviorGradeSummer,
            daysAbsent,
            daysAbsentUnexcused,
            distinction,
            notes,
            verificationToken: existing?.verificationToken || `VERIFY-CCCD-${studentCode}-${importClass}`,
            subjects: mockSubjects
          });
        }
      });

      setImportErrors(collectedErrors);

      if (parsedResults.length > 0) {
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
      
      const fileHeaders = importTerm === "canam" ? [
        "STT", "Số Căn cước công dân (12 chữ số)", "Họ và tên học sinh", "Ngày sinh (YYYY-MM-DD)",
        "Toán học", "Lịch sử và Địa lí", "Khoa học tự nhiên", "Tin học", "Ngữ văn", "Ngoại ngữ", "GDCD", "Công nghệ",
        "Giáo dục thể chất", "Nghệ thuật", "Nội dung giáo dục của địa phương", "Hoạt động trải nghiệm, hướng nghiệp",
        "Kết quả học tập (Tốt/Khá/Đạt/Chưa đạt)", "Kết quả rèn luyện (Tốt/Khá/Đạt/Chưa đạt)", "Kết quả rèn luyện sau hè",
        "Vắng có phép", "Vắng không phép", "Tổng số vắng (Tự động cộng)", "Danh hiệu cả năm (Học sinh Giỏi / Học sinh Xuất sắc / Không)", "Ghi chú"
      ] : [
        "STT", "Số Căn cước công dân (12 chữ số)", "Họ và tên học sinh", "Ngày sinh (YYYY-MM-DD)",
        "Toán học", "Lịch sử và Địa lí", "Khoa học tự nhiên", "Tin học", "Ngữ văn", "Ngoại ngữ", "GDCD", "Công nghệ",
        "Giáo dục thể chất", "Nghệ thuật", "Nội dung giáo dục của địa phương", "Hoạt động trải nghiệm, hướng nghiệp",
        "Kết quả học tập (Tốt/Khá/Đạt/Chưa đạt)", "Kết quả rèn luyện (Tốt/Khá/Đạt/Chưa đạt)",
        "Vắng có phép", "Vắng không phép", "Tổng số vắng (Tự động cộng)", "Ghi chú"
      ];

      const rows: any[] = [fileHeaders];

      if (enrolled.length > 0) {
        enrolled.forEach((s, idx) => {
          const getSubjectGrade = (stud: Student, subId: string) => {
            const sSub = stud.subjects.find(sub => sub.subjectId === subId);
            if (!sSub) return "";
            if (importTerm === "hk1") return sSub.semester1 !== undefined ? sSub.semester1 : "";
            if (importTerm === "hk2") return sSub.semester2 !== undefined ? sSub.semester2 : "";
            return sSub.yearAvg !== undefined ? sSub.yearAvg : "";
          };

          const sRow = importTerm === "canam" ? [
            idx + 1,
            s.studentCode,
            s.fullName,
            s.dob,
            getSubjectGrade(s, "toan"),
            getSubjectGrade(s, "ly_dia"),
            getSubjectGrade(s, "khtn"),
            getSubjectGrade(s, "tin"),
            getSubjectGrade(s, "van"),
            getSubjectGrade(s, "anh"),
            getSubjectGrade(s, "gdcd"),
            getSubjectGrade(s, "cong_nghe"),
            getSubjectGrade(s, "the_duc") || "Đạt",
            getSubjectGrade(s, "nghe_thuat") || "Đạt",
            getSubjectGrade(s, "gd_dia_phuong") || "Đạt",
            getSubjectGrade(s, "trai_nghiem") || "Đạt",
            s.academicGrade || "Tốt",
            s.behaviorGrade || "Tốt",
            s.behaviorGradeSummer || "Không",
            s.daysAbsent || 0,
            s.daysAbsentUnexcused || 0,
            (s.daysAbsent || 0) + (s.daysAbsentUnexcused || 0),
            s.distinction || "Không",
            s.notes || ""
          ] : [
            idx + 1,
            s.studentCode,
            s.fullName,
            s.dob,
            getSubjectGrade(s, "toan"),
            getSubjectGrade(s, "ly_dia"),
            getSubjectGrade(s, "khtn"),
            getSubjectGrade(s, "tin"),
            getSubjectGrade(s, "van"),
            getSubjectGrade(s, "anh"),
            getSubjectGrade(s, "gdcd"),
            getSubjectGrade(s, "cong_nghe"),
            getSubjectGrade(s, "the_duc") || "Đạt",
            getSubjectGrade(s, "nghe_thuat") || "Đạt",
            getSubjectGrade(s, "gd_dia_phuong") || "Đạt",
            getSubjectGrade(s, "trai_nghiem") || "Đạt",
            s.academicGrade || "Tốt",
            s.behaviorGrade || "Tốt",
            s.daysAbsent || 0,
            s.daysAbsentUnexcused || 0,
            (s.daysAbsent || 0) + (s.daysAbsentUnexcused || 0),
            s.notes || ""
          ];
          rows.push(sRow);
        });
      } else {
        // Sample rows to show proper structure to teachers when the database is empty
        const sampleRows = importTerm === "canam" ? [
          [
            1, "012345678901", "Phạm Tuấn Hải", "2011-08-30",
            9.8, 9.3, 9.6, 9.9, 8.8, 9.8, 9.4, 9.2,
            "Đạt", "Đạt", "Đạt", "Đạt",
            "Tốt", "Tốt", "Không",
            1, 0, 1, "Học sinh Giỏi", "Gương mẫu hoàn thiện học bạ cả năm"
          ],
          [
            2, "012345678902", "Trương Mỹ Linh", "2011-12-11",
            8.1, 7.9, 8.1, 8.7, 8.4, 8.5, 8.9, 8.1,
            "Đạt", "Đạt", "Đạt", "Đạt",
            "Khá", "Tốt", "Không",
            1, 0, 1, "Không", "Đạt học sinh tiến biểu tốt"
          ]
        ] : [
          [
            1, "012345678901", "Phạm Tuấn Hải", "2011-08-30",
            9.5, 9.0, 9.2, 10.0, 8.5, 9.5, 9.0, 9.0,
            "Đạt", "Đạt", "Đạt", "Đạt",
            "Tốt", "Tốt",
            1, 0, 1, "Học tập tiến bộ rõ nét kì này"
          ],
          [
            2, "012345678902", "Trương Mỹ Linh", "2011-12-11",
            7.5, 8.0, 7.8, 8.0, 8.0, 8.5, 8.5, 8.0,
            "Đạt", "Đạt", "Đạt", "Đạt",
            "Khá", "Tốt",
            0, 0, 0, "Chăm chỉ hoàn thiện tốt"
          ]
        ];
        sampleRows.forEach(sr => rows.push(sr));
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      // Give some safe default column widths
      ws["!cols"] = [
        { wch: 6 },  // STT
        { wch: 18 }, // CCCD 
        { wch: 22 }, // Name
        { wch: 14 }, // DOB
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // Scores
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, // Comments
        { wch: 15 }, { wch: 15 }, // Eval
        ...(importTerm === "canam" ? [{ wch: 15 }] : []), // Summer behav
        { wch: 12 }, { wch: 12 }, { wch: 12 }, // Absent
        ...(importTerm === "canam" ? [{ wch: 20 }] : []), // Distinction
        { wch: 25 }, // Notes
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `DS_Lop_${importClass}`);
      XLSX.writeFile(wb, `Mau_Hoc_Ba_Lop_${importClass}_${termLabel}.xlsx`);
      setImportStatus(`Đã kết xuất thành công tệp .xlsx mẫu lớp ${importClass} (${importTerm === "hk1" ? "Học kỳ I" : importTerm === "hk2" ? "Học kỳ II" : "Cả năm"}) chứa ${enrolled.length} hồ sơ mẫu.`);
    } catch (err: any) {
      console.error(err);
      setImportStatus("Lỗi xuất excel: " + err.message);
    }
  };

  // Upload and parse physical binary .xlsx file directly
  const handleUploadXlsx = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          // Skip or format custom header row
          if (idx === 0) {
            const headerLine = importTerm === "canam" 
              ? "STT\tCCCD\tHọ tên\tNgày sinh\tToán\tSửĐịa\tKHTN\tTin\tVăn\tAnh\tGDCD\tCôngNghệ\tThểChất\tNghệThuật\tĐịaPhương\tTrảiNghiệm\tKQ H.tập\tKQ R.luyện\tKQRL Sau Hè\tVắng P\tVắng K\tTổng vắng\tDanh hiệu\tGhi chú"
              : "STT\tCCCD\tHọ tên\tNgày sinh\tToán\tSửĐịa\tKHTN\tTin\tVăn\tAnh\tGDCD\tCôngNghệ\tThểChất\tNghệThuật\tĐịaPhương\tTrảiNghiệm\tKQ H.tập\tKQ R.luyện\tVắng P\tVắng K\tTổng vắng\tGhi chú";
            formattedRows.push(headerLine);
            return;
          }

          // Force formatting each cell securely
          const cells = Array.from({ length: importTerm === "canam" ? 24 : 22 }, (_, cIdx) => {
            const val = row[cIdx];
            if (val === undefined || val === null) return "";
            return String(val).trim();
          });

          // Check if CCCD or Name is filled
          if (cells[1] || cells[2]) {
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
      const errorMsg = uniqueErrors.length > 0 ? `\nChi tiết lỗi từ Supabase: ${uniqueErrors.join(", ")}` : "";
      alert(`Đăng ký không thành công trọn vẹn!\n- Đã nhập thành công: ${successfullySaved}/${importPreview.length} học sinh.${errorMsg}\n\nGợi ý khắc phục: Đảm bảo bạn đã cấu hình đúng kết nối trong tab Cấu hình hệ thống, và đã thực thi câu lệnh SQL khởi tạo bảng "students" trên Supabase Dashboard.`);
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
  });

  const uniqueClasses = Array.from(new Set(students.map(s => s.className)));

  // STATISTICS CALCULATOR
  const totalStudentsCount = students.length;
  const goodBehaviorCount = students.filter(s => s.behaviorGrade === "Tốt").length;
  const badBehaviorCount = students.filter(s => s.behaviorGrade === "Chưa đạt").length;
  
  const gotExcellentTitle = students.filter(s => s.distinction === "Học sinh Xuất sắc").length;
  const gotGoodTitle = students.filter(s => s.distinction === "Học sinh Giỏi").length;
  const gotNoneTitle = students.filter(s => s.distinction === "Không").length;

  const academicTốtCount = students.filter(s => s.academicGrade === "Tốt").length;
  const academicKháCount = students.filter(s => s.academicGrade === "Khá").length;
  const academicĐạtCount = students.filter(s => s.academicGrade === "Đạt").length;
  const academicChuaDatCount = students.filter(s => s.academicGrade === "Chưa đạt").length;

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col" id="admin-dashboard-container">
      
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
        <div className="flex-1 flex items-center justify-center py-16 px-4 bg-slate-100">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
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
                    className="flex items-center gap-1.5 bg-[#E53935] hover:bg-[#C62828] text-white px-4 py-2   rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm Học Sinh Mới
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
                          <th className="px-4 py-3 font-bold w-36">Số CCCD (12 số)</th>
                          <th className="px-4 py-3 font-bold">Họ tên học sinh</th>
                          <th className="px-4 py-3 font-bold">Ngày sinh</th>
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
                              <td className="px-4 py-3.5 italic text-slate-500">{student.dob}</td>
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
                              <td className="px-4 py-3.5 font-semibold text-amber-700 text-[10px]">{student.distinction}</td>
                              <td className="px-4 py-3.5 text-right pr-6">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => openStudentForm("edit", student)}
                                    className="p-1 text-slate-500 hover:text-[#0055A5] hover:bg-blue-50 rounded transition cursor-pointer"
                                    title="Sửa lý lịch"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStudent(student.studentCode)}
                                    className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                    title="Mút xóa"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
                          <th className="px-1 py-3 text-center w-16">Toán<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-16">Sử & Địa<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-16">KHTN<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-16">Tin Học<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-16">Ngữ Văn<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-16">Ngoại Ngữ<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-16">GDCD<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>
                          <th className="px-1 py-3 text-center w-16">Công Nghệ<div className="text-[7px] text-slate-400 font-normal method">(HS 1)</div></th>

                          {/* Comment-based subjects */}
                          <th className="px-1 py-3 text-center w-20">Giáo dục TC<div className="text-[7px] text-slate-400 font-normal method">(N.xét)</div></th>
                          <th className="px-1 py-3 text-center w-20">Nghệ Thuật<div className="text-[7px] text-slate-400 font-normal method">(N.xét)</div></th>
                          <th className="px-1 py-3 text-center w-20">GD Địa Phương<div className="text-[7px] text-slate-400 font-normal method">(N.xét)</div></th>
                          <th className="px-1 py-3 text-center w-20">Trải Nghiệm HN<div className="text-[7px] text-slate-400 font-normal method">(N.xét)</div></th>

                          <th className="px-2 py-3 text-center bg-amber-50 text-amber-800 w-20 font-black">
                            {gradesTerm === "hk1" ? "ĐTB HK I" : gradesTerm === "hk2" ? "ĐTB HK II" : "ĐTB Cả Năm"}
                          </th>
                          <th className="px-3 py-3 text-center bg-slate-50 w-24">Kết Quả Chung</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(student => {
                          const getSubjectVal = (id: string) => student.subjects.find(s => s.subjectId === id);
                          
                          // Calculate live Term GPA and Classification
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

                          let termAcademicGrade = "Chưa đạt";
                          if (scoreCount > 0) {
                            const nonScorePassed = student.subjects
                              .filter(s => !s.isEvaluatedByScore)
                              .every(s => {
                                const val = gradesTerm === "hk1" ? s.semester1 : gradesTerm === "hk2" ? s.semester2 : s.yearAvg;
                                return val === "Đạt" || !val;
                              });

                            const allAbove65 = scoreSubjects.every(s => {
                              const val = gradesTerm === "hk1" ? s.semester1 : gradesTerm === "hk2" ? s.semester2 : s.yearAvg;
                              return typeof val === "number" && val >= 6.5;
                            });
                            const allAbove50 = scoreSubjects.every(s => {
                              const val = gradesTerm === "hk1" ? s.semester1 : gradesTerm === "hk2" ? s.semester2 : s.yearAvg;
                              return typeof val === "number" && val >= 5.0;
                            });
                            const allAbove35 = scoreSubjects.every(s => {
                              const val = gradesTerm === "hk1" ? s.semester1 : gradesTerm === "hk2" ? s.semester2 : s.yearAvg;
                              return typeof val === "number" && val >= 3.5;
                            });

                            if (termGpa >= 8.0 && nonScorePassed && allAbove65) {
                              termAcademicGrade = "Tốt";
                            } else if (termGpa >= 6.5 && nonScorePassed && allAbove50) {
                              termAcademicGrade = "Khá";
                            } else if (termGpa >= 5.0 && nonScorePassed && allAbove35) {
                              termAcademicGrade = "Đạt";
                            }
                          }

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
                                const v = sub ? (gradesTerm === "hk1" ? sub.semester1 : gradesTerm === "hk2" ? sub.semester2 : sub.yearAvg) : "-";
                                const valToDisplay = v !== undefined && v !== null ? v : "-";
                                const isEditing = editingStudentCode === student.studentCode && editingSubjectId === subjId;
                                
                                return (
                                  <td key={subjId} className="px-1 py-2.5 text-center font-bold">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1 justify-center z-50">
                                        <input
                                          type="text"
                                          value={tempGradeValue}
                                          onChange={(e) => setTempGradeValue(e.target.value)}
                                          className="w-10 text-center border-2 border-blue-500 rounded font-bold text-xs"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => saveEditedGrade(student)}
                                          className="p-0.5 bg-emerald-500 text-white rounded cursor-pointer"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => startEditingGrade(student.studentCode, subjId, valToDisplay)}
                                        className="w-full text-slate-800 hover:text-blue-700 hover:scale-115 font-extrabold text-[11px] transition"
                                      >
                                        {typeof valToDisplay === "number" ? valToDisplay.toFixed(1) : valToDisplay}
                                      </button>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Comment Subjects based column rendering */}
                              {["the_duc", "nghe_thuat", "gd_dia_phuong", "trai_nghiem"].map(subjId => {
                                const sub = getSubjectVal(subjId);
                                const v = sub ? (gradesTerm === "hk1" ? sub.semester1 : gradesTerm === "hk2" ? sub.semester2 : sub.yearAvg) : "Đạt";
                                const valToDisplay = v !== undefined && v !== null && v !== "" ? v : "Đạt";
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
                                        onClick={() => startEditingGrade(student.studentCode, subjId, valToDisplay.toString())}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition hover:scale-105 ${
                                          valToDisplay === "Đạt" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                                        }`}
                                      >
                                        {valToDisplay}
                                      </button>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Dynamic term GPA */}
                              <td className="px-2 py-2.5 bg-amber-50/20 text-center font-black text-amber-900 text-xs border-x border-slate-200">
                                {scoreCount > 0 ? termGpa.toFixed(1) : "-"}
                              </td>

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
                            <th className="px-1.5 py-1 w-10 font-bold text-slate-800 bg-slate-200/50">Tổng</th>
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
                        📁 Tải Tệp Excel .xlsx
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
                                ? "STT\tCCCD\tHọ tên\tNgày sinh\tToán\tSửĐịa\tKHTN\tTin\tVăn\tAnh\tGDCD\tCôngNghệ\tThểChất\tNghệThuật\tĐịaPhương\tTrảiNghiệm\tKQ H.tập\tKQ R.luyện\tKQRL Sau Hè\tVắng P\tVắng K\tTổng vắng\tDanh hiệu\tGhi chú\n1\t012345678901\tPhạm Tuấn Hải\t2011-08-30\t9.8\t9.3\t9.6\t9.9\t8.8\t9.8\t9.4\t9.2\tĐạt\tĐạt\tĐạt\tĐạt\tTốt\tTốt\tKhông\t1\t0\t1\tHọc sinh Giỏi\tHọc sinh Xuất sắc cả năm"
                                : "STT\tCCCD\tHọ tên\tNgày sinh\tToán\tSửĐịa\tKHTN\tTin\tVăn\tAnh\tGDCD\tCôngNghệ\tThểChất\tNghệThuật\tĐịaPhương\tTrảiNghiệm\tKQ H.tập\tKQ R.luyện\tVắng P\tVắng K\tTổng vắng\tGhi chú\n1\t012345678901\tPhạm Tuấn Hải\t2011-08-30\t9.5\t9.0\t9.2\t10.0\t8.5\t9.5\t9.0\t9.0\tĐạt\tĐạt\tĐạt\tĐạt\tTốt\tTốt\t1\t0\t1\tHoàn thành tốt nhất"
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
                            Chọn tệp dữ liệu dạng <strong>.xlsx</strong> bạn vừa điền để hệ thống cập nhật tự động toàn bộ lớp.
                          </p>
                          
                          <label 
                            htmlFor="xlsx-file-upload"
                            className="border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 active:bg-blue-50/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition text-center"
                          >
                            <FileSpreadsheet className="w-12 h-12 text-blue-500 mb-2 animate-bounce" />
                            <span className="text-xs font-black text-slate-800">Nhấp để mở tệp hoặc kéo thả file Excel vào đây</span>
                            <span className="text-[10px] text-slate-400 mt-1.5">Hỗ trợ duy nhất tệp Excel .xlsx thuộc Học tịch lớp {importClass}</span>
                            <input
                              type="file"
                              id="xlsx-file-upload"
                              accept=".xlsx"
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
                                  <span>Ngày sinh: <strong className="text-slate-700">{stud.dob}</strong></span>
                                  <span>Buổi nghỉ: <strong className="text-slate-700">{stud.daysAbsent} buổi</strong></span>
                                </div>
                              </div>
                              <div className="text-right space-y-1 shrink-0">
                                <div className="text-[9px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg inline-block">
                                  Học lực: {stud.academicGrade}
                                </div>
                                <div className="text-[9px] font-bold uppercase block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg">
                                  Rèn luyện: {stud.behaviorGrade}
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
                    <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Chưa hoàn thành chỉ tiêu</span>
                    <div className="text-3xl font-black text-rose-600">{academicChuaDatCount}</div>
                    <div className="text-[11px] text-slate-500">đang bổ sung kế hoạch khảo sát hè</div>
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
{`-- [MẪU 1] TẠO 3 BẢNG SỬ DỤNG SNAKE_CASE (CHẰN CHẶN CHUẨN POSTGRES)

-- 1. Tạo bảng học sinh (students)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT NOT NULL,
  class_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
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
DROP TABLE IF EXISTS portal_settings;
CREATE TABLE IF NOT EXISTS portal_settings (
  id TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- D. Báo cho Supabase làm mới schema cache (khắc phục lỗi không tìm thấy cột)
NOTIFY pgrst, 'reload schema';`}
                        </pre>
                      </div>

                      {/* CAMEL CASE SQL */}
                      <div id="sql_camel_case" className="hidden">
                        <pre className="text-[10px] font-mono bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto leading-normal selection:bg-blue-800 max-h-[350px] overflow-y-auto">
{`-- [MẪU 2] TẠO 3 BẢNG SỬ DỤNG CAMELCASE (SỬ DỤNG DẤU NHÁY ĐỒNG BỘ NGUYÊN BẢN)

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
  "behaviorGrade" TEXT NOT NULL,
  "behaviorGradeSummer" TEXT,
  "daysAbsent" INTEGER NOT NULL,
  "daysAbsentUnexcused" INTEGER NOT NULL,
  distinction TEXT NOT NULL,
  notes TEXT,
  "verificationToken" TEXT NOT NULL,
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
DROP TABLE IF EXISTS portal_settings;
CREATE TABLE IF NOT EXISTS portal_settings (
  id TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- D. Báo cho Supabase làm mới schema cache (khắc phục lỗi không tìm thấy cột)
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
                        4. Tiêu đề chân trang (Footer Title) <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        value={footerTitle}
                        onChange={(e) => setFooterTitle(e.target.value)}
                        placeholder="Ví dụ: CỔNG THÔNG TIN ĐIỆN TỬ TRƯỜNG PHỔ THÔNG DÂN TỘC BÁN TRÚ TIỂU HỌC VÀ THCS SUỐI LƯ"
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic pl-1 font-semibold">
                        Gợi ý: Tên hệ thống hiển thị dưới chân trang (In hoa).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        5. Nội dung mô tả / Địa chỉ chân trang (Footer Description) <span className="text-[#E53935]">*</span>
                      </label>
                      <textarea
                        value={footerDesc}
                        onChange={(e) => setFooterDesc(e.target.value)}
                        placeholder="Nhập địa chỉ, số điện thoại hoặc mô tả hệ thống..."
                        rows={3}
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic pl-1 font-semibold">
                        Gợi ý: Giới thiệu ngắn về nhà trường hoặc cơ quan chủ quản, kèm thông tin liên hệ.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">
                        6. Bản quyền sở hữu (Footer Copyright) <span className="text-[#E53935]">*</span>
                      </label>
                      <input
                        type="text"
                        value={footerCopy}
                        onChange={(e) => setFooterCopy(e.target.value)}
                        placeholder="Ví dụ: © 2026 PTDTBT TH & THCS SUỐI LƯ"
                        className="w-full text-xs font-bold px-4 py-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0055A5] focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic pl-1 font-semibold">
                        Gợi ý: Thông tin bảo lưu quyền sở hữu trí tuệ hoặc niên khóa ở đáy cổng.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="font-extrabold text-[#0055A5] text-[11px] uppercase tracking-wider mb-3">Cấu hình Bật/Tắt Trường Tra Cứu</h4>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <div>
                        <h5 className="text-[11px] font-black text-slate-700 uppercase">1. Tra Cứu Bằng Số CCCD</h5>
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
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleStartEditClass(c)}
                                        title="Chỉnh sửa thông tin lớp"
                                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClassStudents(c.className)}
                                        disabled={rosterCount === 0}
                                        title={rosterCount > 0 ? "Xóa toàn bộ học sinh của lớp này" : "Lớp trống"}
                                        className={`p-1 rounded transition ${
                                          rosterCount > 0 
                                            ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50 cursor-pointer" 
                                            : "text-slate-300 cursor-not-allowed"
                                        }`}
                                      >
                                        <UserX className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClass(c.id)}
                                        title="Xóa lớp học"
                                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition cursor-pointer"
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
            
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Số Căn cước công dân (12 số) (*)</label>
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

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Ngày sinh (DD/MM/YYYY) (*)</label>
                  <input
                    type="text"
                    value={formStudent.dob || ""}
                    onChange={(e) => setFormStudent({ ...formStudent, dob: e.target.value })}
                    className="w-full border p-2 rounded font-bold"
                    placeholder="Ví dụ: 15/05/2011"
                  />
                </div>

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
                  <label className="block font-bold text-slate-700 uppercase mb-1">Xếp loại rèn luyện (Hạnh kiểm)</label>
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
                  <label className="block font-bold text-slate-700 uppercase mb-1">Vắng có phép / không phép</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={formStudent.daysAbsent || 0}
                      onChange={(e) => setFormStudent({ ...formStudent, daysAbsent: parseInt(e.target.value) || 0 })}
                      className="w-full border p-2 rounded"
                      placeholder="Tổng phép"
                    />
                    <input
                      type="number"
                      value={formStudent.daysAbsentUnexcused || 0}
                      onChange={(e) => setFormStudent({ ...formStudent, daysAbsentUnexcused: parseInt(e.target.value) || 0 })}
                      className="w-full border p-2 rounded"
                      placeholder="Không phép"
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
                disabled={authIsLoading}
                onClick={handleSaveStudent}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition cursor-pointer text-xs"
              >
                {authIsLoading ? "Đang lưu..." : "Lưu Học Sinh"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

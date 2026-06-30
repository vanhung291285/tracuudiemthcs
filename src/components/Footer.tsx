import React, { useState, useEffect } from "react";
import dbService from "../lib/supabase";

export default function Footer() {
  const [footerTitle, setFooterTitle] = useState(() => {
    const val = localStorage.getItem("portal_footer_title");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "HỆ THỐNG SUỐI LƯ";
  });
  const [footerDesc, setFooterDesc] = useState(() => {
    const val = localStorage.getItem("portal_footer_desc");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "Cổng tra cứu kết quả học tập và học bạ điện tử chính thức của **Trường PTDTBT TH & THCS Suối Lư**. Hệ thống cung cấp dữ liệu số hóa chính xác từ sổ bộ gốc của nhà trường, phục vụ học sinh và phụ huynh.";
  });
  const [footerKeywords, setFooterKeywords] = useState(() => {
    const val = localStorage.getItem("portal_footer_keywords");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "Suối Lư, THCS Suối Lư, Tiểu học Suối Lư, Học bạ điện tử, Tra cứu điểm, Điện Biên";
  });
  const [footerContact, setFooterContact] = useState(() => {
    const val = localStorage.getItem("portal_footer_contact");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "• Địa chỉ: Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên\n• Website gốc: https://suoilu.db.edu.vn\n• Bản quyền © 2026 PTDTBT TH & THCS Suối Lư";
  });
  const [headerTop, setHeaderTop] = useState(() => {
    const val = localStorage.getItem("portal_header_top");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "ỦY BAN NHÂN DÂN XÃ XA DUNG • TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ";
  });
  const [headerMain, setHeaderMain] = useState(() => {
    const val = localStorage.getItem("portal_header_main");
    return (val !== null && val !== "null" && val !== "undefined") ? val : "TRA CỨU KẾT QUẢ HỌC TẬP HỌC SINH THCS";
  });

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const title = await dbService.getPortalSetting("portal_footer_title", "HỆ THỐNG SUỐI LƯ");
        if (active && title !== null && title !== undefined && title !== "null" && title !== "undefined") setFooterTitle(title);
        
        const desc = await dbService.getPortalSetting("portal_footer_desc", "Cổng tra cứu kết quả học tập và học bạ điện tử chính thức của **Trường PTDTBT TH & THCS Suối Lư**. Hệ thống cung cấp dữ liệu số hóa chính xác từ sổ bộ gốc của nhà trường, phục vụ học sinh và phụ huynh.");
        if (active && desc !== null && desc !== undefined && desc !== "null" && desc !== "undefined") setFooterDesc(desc);
        
        const key = await dbService.getPortalSetting("portal_footer_keywords", "Suối Lư, THCS Suối Lư, Tiểu học Suối Lư, Học bạ điện tử, Tra cứu điểm, Điện Biên");
        if (active && key !== null && key !== undefined && key !== "null" && key !== "undefined") setFooterKeywords(key);
        
        const con = await dbService.getPortalSetting("portal_footer_contact", "• Địa chỉ: Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên\n• Website gốc: https://suoilu.db.edu.vn\n• Bản quyền © 2026 PTDTBT TH & THCS Suối Lư");
        if (active && con !== null && con !== undefined && con !== "null" && con !== "undefined") setFooterContact(con);
        
        const hTop = await dbService.getPortalSetting("portal_header_top", "ỦY BAN NHÂN DÂN XÃ XA DUNG • TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ");
        if (active && hTop !== null && hTop !== undefined && hTop !== "null" && hTop !== "undefined") setHeaderTop(hTop);
        
        const hMain = await dbService.getPortalSetting("portal_header_main", "TRA CỨU KẾT QUẢ HỌC TẬP HỌC SINH THCS");
        if (active && hMain !== null && hMain !== undefined && hMain !== "null" && hMain !== "undefined") setHeaderMain(hMain);
      } catch (err) { }
    };
    loadSettings();
    return () => { active = false; };
  }, []);

  return (
    <footer className="w-full bg-slate-50 border-t border-slate-200 no-print mt-auto">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 pt-12 pb-12">
        <div className="space-y-5">
          <h3 className="text-[15px] font-black text-[#0055A5] uppercase tracking-wider leading-tight">{footerTitle}</h3>
          <p className="text-[13px] leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">
            {(footerDesc || "").split("**").map((part, i) => i % 2 === 1 ? <strong key={i} className="text-slate-800 font-black">{part}</strong> : part)}
          </p>
        </div>
        
        <div className="space-y-5">
          <h3 className="text-[15px] font-black text-[#0055A5] uppercase tracking-wider">TỪ KHÓA PHỔ BIẾN</h3>
          <div className="flex flex-wrap gap-2.5">
            {(footerKeywords || "").split(",").map((tag, idx) => {
              const cleanTag = (tag || "").trim();
              if (!cleanTag) return null;
              return (
                <span key={idx} className="text-[12px] bg-white border border-slate-200 px-3 py-1.5 rounded-md text-slate-600 font-bold shadow-sm hover:border-[#0055A5] transition-colors cursor-default">
                  {cleanTag}
                </span>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="text-[15px] font-black text-[#0055A5] uppercase tracking-wider">THÔNG TIN LIÊN HỆ</h3>
          <ul className="text-[13px] space-y-3 text-slate-600 font-medium">
            {(footerContact || "").split("\n").map((line, i) => {
              if (!line) return null;
              if (line.includes("http")) {
                const parts = line.split(": ");
                const label = parts[0];
                const url = parts.slice(1).join(": ");
                const displayUrl = url ? url.replace("https://", "").replace("http://", "") : "";
                return (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="shrink-0">{label}:</span>
                    <a href={url || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">{displayUrl || url}</a>
                  </li>
                );
              }
              return <li key={i}>{line}</li>;
            })}
          </ul>
        </div>
      </div>

      {/* Blue Bottom Bar */}
      <div className="w-full bg-[#0055A5] py-10 px-4 flex flex-col items-center text-center text-white">
        <h4 className="text-[14px] md:text-[16px] font-black uppercase tracking-[0.05em] mb-3 max-w-3xl">
          {headerMain} CỦA {(headerTop || "").split("•").pop()?.trim() || "TRƯỜNG"}
        </h4>
        <p className="text-[11px] md:text-[12px] opacity-80 font-medium max-w-4xl leading-relaxed mb-6">
          {footerDesc ? footerDesc.replace(/\*\*/g, "") : "Hệ thống quản lý kết quả học tập trực tuyến dành cho toàn thể học sinh Tiểu học và THCS xã Suối Lư. Địa chỉ: Bản Suối Lư - xã Xa Dung - tỉnh Điện Biên"}
        </p>
        <div className="w-24 h-px bg-white/20 mb-6" />
        <p className="text-[10px] md:text-[11px] font-black italic tracking-wider opacity-90">
          Phát triển ứng dụng bởi: Vũ Văn Hùng - Email: vuhung@db.edu.vn
        </p>
      </div>
    </footer>
  );
}

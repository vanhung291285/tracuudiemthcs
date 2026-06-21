import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import dbService from "../lib/supabase";

export default function Footer() {
  const [visitorOverview, setVisitorOverview] = useState({ online: 0, today: 0, thisMonth: 0, total: 0 });
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
    let active = true;
    const loadVisitorStats = async () => {
      try {
        const overview = await dbService.getVisitorOverview();
        if (active) {
          setVisitorOverview(overview);
        }
      } catch (err) {
        // Silent skip
      }
    };
    
    const loadSettings = async () => {
      try {
        const title = await dbService.getPortalSetting("portal_footer_title", "CỔNG THÔNG TIN ĐIỆN TỬ TRƯỜNG PHỔ THÔNG DÂN TỘC BÁN TRÚ TIỂU HỌC VÀ THCS SUỐI LƯ");
        if (active) setFooterTitle(title);
        const desc = await dbService.getPortalSetting("portal_footer_desc", "Hạ tầng quản lý kết quả học tập trực tuyến dành cho toàn thể học sinh Tiểu học và THCS xã Suối Lư. Địa chỉ: Xã Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên.");
        if (active) setFooterDesc(desc);
        const copy = await dbService.getPortalSetting("portal_footer_copy", "© 2026 PTDTBT TH & THCS SUỐI LƯ");
        if (active) setFooterCopy(copy);
      } catch (err) { }
    };

    loadVisitorStats();
    loadSettings();
    
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="bg-white border-t border-slate-200 pt-8 pb-10 text-center no-print">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Visitor Statistics in Footer */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mb-8 bg-slate-50 py-4 px-6 rounded-2xl border border-slate-100 shadow-sm max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thống kê:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-500 uppercase">Đang online:</span>
            <span className="text-sm font-black text-emerald-700">{visitorOverview.online}</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Hôm nay:</span>
            <span className="text-sm font-black text-slate-800">{visitorOverview.today.toLocaleString()}</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Tháng này:</span>
            <span className="text-sm font-black text-slate-800">{visitorOverview.thisMonth.toLocaleString()}</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng lượt xem:</span>
            <span className="text-sm font-black text-slate-800">{visitorOverview.total.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-3 font-serif">
          <p className="font-bold text-slate-800 uppercase text-xs md:text-sm tracking-wide">
            {footerTitle}
          </p>
          <p className="max-w-3xl mx-auto leading-relaxed text-[10px] md:text-[11px] text-slate-500 px-4">
            {footerDesc}
          </p>
          <div className="flex flex-col items-center gap-2 pt-4 border-t border-slate-100 max-w-sm mx-auto">
            <span className="text-[10px] font-bold text-slate-400 italic font-sans">{footerCopy}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

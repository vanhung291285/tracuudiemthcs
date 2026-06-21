import React, { useState, useEffect } from "react";
import dbService from "../lib/supabase";

export default function Footer() {
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

    loadSettings();
    
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="bg-[#0055A5] pt-6 pb-8 text-center no-print">
      <div className="max-w-6xl mx-auto px-4">
        <div className="space-y-4 font-serif">
          <p className="font-black text-white uppercase text-xs md:text-sm tracking-[0.1em]">
            {footerTitle}
          </p>
          <p className="max-w-3xl mx-auto leading-relaxed text-[10px] md:text-[11px] text-slate-100/80 px-4">
            {footerDesc}
          </p>
          <div className="flex flex-col items-center gap-2 pt-5 border-t border-white/30 max-w-md mx-auto">
            <span className="text-[10px] font-bold text-slate-200/60 italic font-sans">{footerCopy}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

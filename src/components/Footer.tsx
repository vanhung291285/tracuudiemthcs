/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Facebook, Globe, Mail, Phone, MapPin, ExternalLink, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import dbService from "../lib/supabase";

const ZaloIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M12 2C6.477 2 2 6.136 2 11.25c0 3.012 1.583 5.711 4.1 7.378-.124.786-.607 2.195-.732 2.535-.145.41.134.4.284.298.118-.08 1.884-1.285 2.637-1.808.558.129 1.144.197 1.741.197 5.523 0 10-4.136 10-9.25C22 6.136 17.523 2 12 2z"/>
    <path d="M15.5 13.5h-4.31l3.52-4.04c.16-.18.16-.46 0-.64l-.36-.36c-.18-.18-.46-.18-.64 0l-4.5 5.16c-.11.12-.11.3 0 .42l.36.36c.12.12.3.12.42 0l.5-.58h5.01c.25 0 .45-.2.45-.45v-.45c0-.25-.2-.42-.45-.42z" fill="white"/>
  </svg>
);

export default function Footer() {
  const [footerTitle, setFooterTitle] = useState("HỆ THỐNG SUỐI LƯ");
  const [footerDesc, setFooterDesc] = useState("Cổng tra cứu kết quả học tập và học bạ điện tử chính thức của Trường PTDTBT TH & THCS Suối Lư. Hệ thống cung cấp dữ liệu số hóa chính xác từ sổ bộ gốc của nhà trường.");
  const [footerKeywords, setFooterKeywords] = useState("Suối Lư, THCS Suối Lư, Tiểu học Suối Lư, Học bạ điện tử, Tra cứu điểm, Điện Biên");
  const [footerContact, setFooterContact] = useState("Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên");
  const [footerCopy, setFooterCopy] = useState("© 2026 PTDTBT TH & THCS Suối Lư");
  const [zaloUrl, setZaloUrl] = useState("https://zalo.me/0333333333");
  const [facebookUrl, setFacebookUrl] = useState("https://facebook.com/suoilu");
  const [websiteUrl, setWebsiteUrl] = useState("https://suoilu.db.edu.vn");

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const title = await dbService.getPortalSetting("portal_footer_title", "HỆ THỐNG SUỐI LƯ");
        const desc = await dbService.getPortalSetting("portal_footer_desc", "Cổng tra cứu kết quả học tập và học bạ điện tử chính thức của Trường PTDTBT TH & THCS Suối Lư. Hệ thống cung cấp dữ liệu số hóa chính xác từ sổ bộ gốc của nhà trường.");
        const keywords = await dbService.getPortalSetting("portal_footer_keywords", "Suối Lư, THCS Suối Lư, Tiểu học Suối Lư, Học bạ điện tử, Tra cứu điểm, Điện Biên");
        const contact = await dbService.getPortalSetting("portal_footer_contact", "Suối Lư, Huyện Điện Biên Đông, Tỉnh Điện Biên");
        const copy = await dbService.getPortalSetting("portal_footer_copy", "© 2026 PTDTBT TH & THCS Suối Lư");
        const zalo = await dbService.getPortalSetting("portal_zalo_url", "https://zalo.me/0333333333");
        const fb = await dbService.getPortalSetting("portal_facebook_url", "https://facebook.com/suoilu");
        const web = await dbService.getPortalSetting("portal_website_url", "https://suoilu.db.edu.vn");

        setFooterTitle(title);
        setFooterDesc(desc);
        setFooterKeywords(keywords);
        setFooterContact(contact);
        setFooterCopy(copy);
        setZaloUrl(zalo);
        setFacebookUrl(fb);
        setWebsiteUrl(web);
      } catch (err) {
        console.warn("Could not load footer config:", err);
      }
    };
    loadConfig();

    const handleStorage = () => loadConfig();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const keywordsArray = footerKeywords.split(",").map(k => k.trim()).filter(Boolean);
  const contactLines = footerContact.split("\n").map(l => l.trim()).filter(Boolean);

  return (
    <footer className="w-full bg-gradient-to-br from-[#003366] to-[#337819] text-slate-100 pt-10 pb-6 px-6 mt-auto border-t border-white/10 no-print relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400/5 blur-[60px] rounded-full -ml-24 -mb-24 pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          
          {/* Column 1: Brand & Description */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2.5 group cursor-default">
              <div className="w-9 h-9 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/20 group-hover:rotate-12 transition-transform duration-500">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-black text-white tracking-tight uppercase">
                {footerTitle}
              </h3>
            </div>
            <p className="text-[13px] leading-relaxed text-blue-100/80 font-medium">
              {footerDesc.split("**").map((part, i) => 
                i % 2 === 1 ? <strong key={i} className="text-white">{part}</strong> : part
              )}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <motion.a whileHover={{ scale: 1.1, y: -2 }} href={facebookUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/10 hover:bg-[#1877F2] text-white rounded-lg transition-all duration-300 shadow-sm border border-white/5">
                <Facebook className="w-4.5 h-4.5" />
              </motion.a>
              <motion.a whileHover={{ scale: 1.1, y: -2 }} href={zaloUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/10 hover:bg-[#0068ff] text-white rounded-lg transition-all duration-300 shadow-sm border border-white/5">
                <ZaloIcon className="w-4.5 h-4.5" />
              </motion.a>
              <motion.a whileHover={{ scale: 1.1, y: -2 }} href={websiteUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/10 hover:bg-emerald-500 text-white rounded-lg transition-all duration-300 shadow-sm border border-white/5">
                <Globe className="w-4.5 h-4.5" />
              </motion.a>
            </div>
          </motion.div>

          {/* Column 2: Quick Tags / Keywords */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <h4 className="text-[10px] font-black text-blue-200 uppercase tracking-widest border-l-2 border-amber-400 pl-2.5">
              Từ khóa phổ biến
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {keywordsArray.map((tag, idx) => (
                <motion.span 
                  key={idx} 
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                  className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-blue-100 hover:text-white transition-all cursor-default"
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Column 3: Contact Info */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h4 className="text-[10px] font-black text-blue-200 uppercase tracking-widest border-l-2 border-rose-400 pl-2.5">
              Thông tin liên hệ
            </h4>
            <ul className="space-y-3">
              {contactLines.map((line, idx) => {
                let Icon = MapPin;
                if (line.toLowerCase().includes("website")) Icon = Globe;
                if (line.toLowerCase().includes("điện thoại") || line.toLowerCase().includes("phone")) Icon = Phone;
                if (line.toLowerCase().includes("email")) Icon = Mail;

                return (
                  <motion.li 
                    key={idx} 
                    whileHover={{ x: 3 }}
                    className="flex items-start gap-2.5 text-[12px] group"
                  >
                    <Icon className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 group-hover:text-white transition-colors" />
                    <span className="text-blue-100/90 font-medium leading-snug group-hover:text-white transition-colors">
                      {line.replace(/^•\s*/, "")}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>

          {/* Column 4: Quick Links & Help */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h4 className="text-[10px] font-black text-blue-200 uppercase tracking-widest border-l-2 border-emerald-400 pl-2.5">
              Hệ thống xác thực
            </h4>
            <div className="space-y-2">
              <motion.a whileHover={{ x: 3 }} href="#" className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition group">
                <span className="text-[11px] font-bold text-blue-100 group-hover:text-white">Hướng dẫn tra cứu</span>
                <ExternalLink className="w-3 h-3 text-blue-300 group-hover:text-white" />
              </motion.a>
              <motion.a whileHover={{ x: 3 }} href="#" className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition group">
                <span className="text-[11px] font-bold text-blue-100 group-hover:text-white">Tra soát học tịch số</span>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300 group-hover:text-amber-400" />
              </motion.a>
              <div className="pt-1">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">Dữ liệu thời gian thực</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar: Copyright */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold text-blue-200/60 tracking-wider"
        >
          <p className="uppercase text-center md:text-left">
            {footerCopy}
          </p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-white transition-colors">Bảo mật</a>
            <span className="px-1.5 py-0.5 bg-white/10 rounded text-[8px] text-blue-100">v2.1.5-stable</span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}

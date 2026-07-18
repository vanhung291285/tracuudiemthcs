import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";

// Bypass SSL certificate validation for self-signed or invalid certs common on local school/gov portals
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Custom precise date mappings for Suối Lư articles by ID to ensure absolute accuracy with design
const SUOILU_DATES: Record<number, string> = {
  130: "17/07/2026",
  129: "14/07/2026",
  127: "12/07/2026",
  126: "12/07/2026",
  125: "18/06/2026",
  124: "18/06/2026",
  123: "12/06/2026",
  122: "18/05/2026",
  121: "15/05/2026",
  120: "10/05/2026",
};

// Helper to extract Nukeviet article ID from URL
function extractArticleId(href: string): number {
  if (!href) return 0;
  const match = href.match(/-(\d+)\.html/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

// Helper to dynamically map Nukeviet path segments to pretty human categories
function getCategoryFromUrl(href: string, title: string): string {
  if (!href) return "TIN TRƯỜNG SUỐI LƯ";
  const hLower = href.toLowerCase();
  if (hLower.includes("/hoat-dong-cua-nghanh/")) return "HOẠT ĐỘNG CỦA NGÀNH";
  if (hLower.includes("/tin-tuc-su-kien/")) return "TIN TỨC • SỰ KIỆN";
  if (hLower.includes("/hoat-dong-doan-doi/")) return "HOẠT ĐỘNG ĐOÀN ĐỘI";
  if (hLower.includes("/khoa-hoc/")) return "KHOA HỌC • TRI ÂN";
  if (hLower.includes("/hoat-dong-chuyen-mon/")) return "HOẠT ĐỘNG CHUYÊN MÔN";
  if (hLower.includes("/hoat-dong-cong-nghe-thong-tin/")) return "CHUYỂN ĐỔI SỐ • CNTT";
  if (hLower.includes("/hoat-dong-cong-doan-10/")) return "HOẠT ĐỘNG BÁN TRÚ";
  
  // Fallback to title keywords if URL doesn't match
  const tLower = title.toLowerCase();
  if (tLower.includes("hội nghị") || tLower.includes("đại hội")) {
    return "SỰ KIỆN • ĐẠI HỘI CHI BỘ";
  } else if (tLower.includes("phát động") || tLower.includes("thi đua") || tLower.includes("học sinh giỏi") || tLower.includes("khen thưởng")) {
    return "THI ĐUA KHEN THƯỞNG";
  } else if (tLower.includes("tuyển sinh") || tLower.includes("lớp 10") || tLower.includes("lớp 6") || tLower.includes("xét tốt nghiệp")) {
    return "TUYỂN SINH • HỌC BẠ";
  } else if (tLower.includes("chuyên đề") || tLower.includes("ngoại khóa") || tLower.includes("hoạt động") || tLower.includes("trải nghiệm")) {
    return "CHUYÊN ĐỀ DẠY HỌC";
  } else if (tLower.includes("ôn tập") || tLower.includes("kiểm tra") || tLower.includes("thi") || tLower.includes("học tập")) {
    return "DẠY VÀ HỌC";
  } else if (tLower.includes("chuyên đổi số") || tLower.includes("công nghệ") || tLower.includes("học bạ điện tử") || tLower.includes("chuyển đổi số")) {
    return "CHUYỂN ĐỔI SỐ";
  }
  return "TIN TRƯỜNG SUỐI LƯ";
}

// Multi-portal cache map to prevent cross-site cache pollution and ensure high fidelity per-school news
let newsCacheMap: { [sourceUrl: string]: { data: any[]; timestamp: number } } = {};
const CACHE_DURATION = 1 * 60 * 1000; // Reduce cache to 1 minute to ensure automatic sync for new updates

// Helper to append a timestamp cache-buster to any URL
function addCacheBuster(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set("_t", Date.now().toString());
    return urlObj.toString();
  } catch {
    const connector = url.includes("?") ? "&" : "?";
    return `${url}${connector}_t=${Date.now()}`;
  }
}

// Custom headers to prevent caching at the edge and target server
const CACHE_BYPASS_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36",
  "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

// Robust mock/fallback articles for PTDTBT TH & THCS Suối Lư with premium educational illustrations
const FALLBACK_NEWS = [
  {
    id: "fb-0",
    title: "Trường PTDTBT TH&THCS Suối Lư chủ động chuẩn bị nâng cao chất lượng dạy học năm học 2026 – 2027",
    category: "HOẠT ĐỘNG CỦA NGÀNH",
    date: "17/07/2026",
    link: "https://suoilu.db.edu.vn/hoat-dong-cua-nghanh/truong-ptdtbt-th-thcs-suoi-lu-chu-dong-chuan-bi-nang-cao-chat-luong-day-hoc-nam-hoc-2026-2027-130.html",
    source: "suoilu.db.edu.vn",
    image: "https://suoilu.db.edu.vn/assets/news/2026_07/3_1.jpg",
    description: "Kỳ nghỉ hè không chỉ là khoảng thời gian để học sinh nghỉ ngơi sau một năm học nhiều cố gắng mà còn là thời điểm Trường PTDTBT TH&THCS Suối Lư tích cực chuẩn bị các điều kiện cần thiết cho năm học mới 2026 – 2027. Với tinh thần chủ động, trách nhiệm và quyết tâm đổi mới, tập thể cán bộ, giáo viên, nhân viên nhà trường đang khẩn trương triển khai nhiều nhiệm vụ nhằm nâng cao chất lượng giáo dục ngay từ những ngày đầu năm học."
  },
  {
    id: "fb-1",
    title: "LỄ TỔNG KẾT NĂM HỌC 2025–2026 TẠI TRƯỜNG PTDTBT TH&THCS SUỐI LƯ: KHÉP LẠI MỘT NĂM HỌC NHIỀU THÀNH TÍCH",
    category: "TIN TRƯỜNG SUỐI LƯ",
    date: "14/07/2026",
    link: "https://suoilu.db.edu.vn/tin-tuc-su-kien/le-tong-ket-nam-hoc-2025-2026-tai-truong-ptdtbt-th-thcs-suoi-lu-khep-lai-mot-nam-hoc-nhieu-thanh-tich-129.html",
    source: "suoilu.db.edu.vn",
    image: "https://suoilu.db.edu.vn/assets/news/2026_07/z8040701801489_f52fc55b263a5c106557091234c0b688_1.jpg"
  },
  {
    id: "fb-2",
    title: "Góp ý quy định việc giảng dạy khối lượng kiến thức văn hóa giáo dục phổ thông trong chương trình đào tạo các ngành, nghề đặc thù",
    category: "TIN TRƯỜNG SUỐI LƯ",
    date: "12/07/2026",
    link: "https://suoilu.db.edu.vn/tin-tuc-su-kien/gop-y-quy-dinh-viec-giang-day-khoi-luong-kien-thuc-van-hoa-giao-duc-pho-thong-trong-chuong-trinh-dao-tao-cac-nganh-nghe-dac-thu-127.html",
    source: "suoilu.db.edu.vn",
    image: "https://suoilu.db.edu.vn/assets/news/2026_07/img_4888_4.jpeg"
  },
  {
    id: "fb-3",
    title: "Tập huấn trực tuyến triển khai cập nhật dữ liệu học bạ số",
    category: "TIN TRƯỜNG SUỐI LƯ",
    date: "12/07/2026",
    link: "https://suoilu.db.edu.vn/tin-tuc-su-kien/tap-huan-truc-tuyen-trien-khai-cap-nhat-du-lieu-hoc-ba-so-126.html",
    source: "suoilu.db.edu.vn",
    image: "https://suoilu.db.edu.vn/assets/news/2026_07/img_3414_10.jpg"
  },
  {
    id: "fb-4",
    title: "Giáo dục kỹ năng sống cho học sinh THCS – những điều cần biết",
    category: "TIN TRƯỜNG SUỐI LƯ",
    date: "10/06/2026",
    link: "https://suoilu.db.edu.vn/hoat-dong-doan-doi/giao-duc-ky-nang-song-cho-hoc-sinh-thcs-nhung-dieu-can-biet-125.html",
    source: "suoilu.db.edu.vn",
    image: "https://suoilu.db.edu.vn/assets/news/2026_06/vp_hoc-sinh-thcs-dewey-80-768x461.jpg"
  },
  {
    id: "fb-5",
    title: "Phát động Cuộc thi viết về “Trang sách và Mái trường”",
    category: "THI ĐUA KHEN THƯỞNG",
    date: "10/06/2026",
    link: "https://suoilu.db.edu.vn/tin-tuc-su-kien/phat-dong-cuoc-thi-viet-ve-trang-sach-va-mai-truong-124.html",
    source: "suoilu.db.edu.vn",
    image: "https://suoilu.db.edu.vn/assets/news/2026_06/2aoboqcgiim0bcbodez62qu6twocsb1s2racoa40.jpg"
  }
];

function isValidImage(src: string): boolean {
  if (!src) return false;
  const s = src.toLowerCase();
  // Filter out tracking pixels and tiny spacers, but be less aggressive with "icon" or "logo" if they are in the path
  if (s.includes("spacer") || s.includes("pixel") || s.includes("statscounter") || s.includes("1x1") || s.includes("transparent")) return false;
  if (s.includes("data:image")) return false;
  if (s.endsWith(".gif")) return false;
  return true;
}

function getSafeErrorMessage(err: any): string {
  const msg = (err?.message || String(err || "")).trim();
  if (msg.toLowerCase().includes("fetch failed") || msg.toLowerCase().includes("failed to fetch")) {
    return "destination offline";
  }
  return msg;
}

// Fallback thematic image resolution helper based on article keywords
function getThematicImage(title: string, index: number): string {
  const t = title.toLowerCase();
  if (t.includes("điểm") || t.includes("học bạ") || t.includes("kiểm tra") || t.includes("thi") || t.includes("học lực") || t.includes("tốt nghiệp")) {
    return "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=60";
  }
  if (t.includes("bảo mật") || t.includes("chữ ký") || t.includes("mã vạch") || t.includes("công nghệ") || t.includes("kỹ thuật")) {
    return "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=60";
  }
  if (t.includes("chuyển đổi số") || t.includes("lớp học") || t.includes("học tập") || t.includes("liên thông") || t.includes("tin học")) {
    return "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=500&auto=format&fit=crop&q=60";
  }
  if (t.includes("thi đua") || t.includes("khoa học") || t.includes("tổng kết") || t.includes("khen thưởng") || t.includes("hội thảo") || t.includes("đại hội")) {
    return "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&auto=format&fit=crop&q=60";
  }
  if (t.includes("chuyên đề") || t.includes("trải nghiệm") || t.includes("ngoại khóa") || t.includes("sinh hoạt") || t.includes("hoạt động")) {
    return "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=500&auto=format&fit=crop&q=60";
  }
  
  const defaults = [
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=500&auto=format&fit=crop&q=60"
  ];
  return defaults[index % defaults.length];
}

// Helper to parse DD/MM/YYYY to Date
function parseVietnameseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    // Expected DD/MM/YYYY
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(dateStr);
}

// Decode HTML entities commonly returned by WordPress or RSS feeds
function decodeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8230;/g, "...")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8217;/g, "’")
    .replace(/&nbsp;/g, " ");
}

// Helper to parse XML string using cheerio (used by direct RSS and proxy RSS)
function parseRSSXml(xmlText: string): any[] {
  if (!xmlText) return [];
  try {
    const $ = cheerio.load(xmlText, { xmlMode: true });
    const items: any[] = [];
    
    // Support both RSS <item> and Atom <entry> elements
    $("item, entry").each((_, elem) => {
      const title = decodeHtml($(elem).find("title").first().text().trim());
      
      // Get link
      let link = $(elem).find("link").first().text().trim();
      if (!link) {
        link = $(elem).find("link").attr("href") || "";
      }
      if (!link) {
        const htmlContent = $(elem).html() || "";
        const match = htmlContent.match(/<link>(.*?)<\/link>/);
        if (match) link = match[1].trim();
      }
      link = link.trim();
      
      // Get pubDate / updated / published
      let pubDate = $(elem).find("pubDate, pubdate, updated, published").first().text().trim() || "";
      let timestamp = 0;
      let dateText = "";
      if (pubDate) {
        try {
          const d = new Date(pubDate);
          if (!isNaN(d.getTime())) {
            timestamp = d.getTime();
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            dateText = `${dd}/${mm}/${yyyy}`;
          }
        } catch { }
      }
      
      if (title && link) {
        let imageSrc = "";
        
        // Try media:content, enclosure, or featured image fields first
        const mediaContent = $(elem).find("media\\:content, content").attr("url");
        const enclosure = $(elem).find("enclosure").attr("url");
        const featuredImg = $(elem).find("wp\\:featured_item, featured_item").text();
        
        if (mediaContent && isValidImage(mediaContent)) {
          imageSrc = mediaContent;
        } else if (enclosure && isValidImage(enclosure)) {
          imageSrc = enclosure;
        } else if (featuredImg && isValidImage(featuredImg)) {
          imageSrc = featuredImg;
        } else {
          const desc = $(elem).find("description, summary").first().text();
          const content = $(elem).find("content\\:encoded, encoded, content").first().text();
          const combined = desc + " " + content;
          // Look for larger images first, skip small icons
          const imgMatches = [...combined.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
          for (const match of imgMatches) {
            const src = match[1];
            if (isValidImage(src) && !src.includes("s.w.org") && !src.includes("emoji")) {
              imageSrc = src;
              break;
            }
          }
        }
        
        items.push({ title, href: link, dateText, timestamp, image: imageSrc });
      }
    });
    return items;
  } catch (err) {
    console.warn("Error parsing RSS XML:", err);
    return [];
  }
}

// Helper to parse WordPress WP-JSON REST API posts
function parseWordPressPosts(postsJson: any): any[] {
  if (!postsJson || !Array.isArray(postsJson)) return [];
  const items: any[] = [];
  for (const post of postsJson) {
    try {
      const rawTitle = post.title?.rendered || post.title || "";
      const title = decodeHtml(rawTitle);
      const link = post.link || "";
      
      let dateText = "";
      let timestamp = 0;
      if (post.date) {
        try {
          const d = new Date(post.date);
          if (!isNaN(d.getTime())) {
            timestamp = d.getTime();
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            dateText = `${dd}/${mm}/${yyyy}`;
          }
        } catch { }
      }
      
      let imageSrc = "";
      // Check embedded media if present
      const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
      if (featuredMedia && featuredMedia.source_url && isValidImage(featuredMedia.source_url)) {
        imageSrc = featuredMedia.source_url;
      }
      
      if (!imageSrc && featuredMedia?.media_details?.sizes) {
        const sizes = featuredMedia.media_details.sizes;
        const bestSize = sizes.large || sizes.medium_large || sizes.full || sizes.medium;
        if (bestSize?.source_url && isValidImage(bestSize.source_url)) {
          imageSrc = bestSize.source_url;
        }
      }

      // Extract image fallback from content string
      if (!imageSrc && post.content?.rendered) {
        const contentStr = post.content.rendered;
        const match = contentStr.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match && isValidImage(match[1])) {
          imageSrc = match[1];
        }
      }

      if (title && link) {
        items.push({ title, href: link, dateText, timestamp, image: imageSrc });
      }
    } catch { }
  }
  return items;
}

// Helper to parse rss2json API output
function parseRss2Json(data: any): any[] {
  if (!data || data.status !== "ok" || !Array.isArray(data.items)) return [];
  const items: any[] = [];
  for (const item of data.items) {
    try {
      const title = decodeHtml(item.title || "");
      const link = item.link || "";
      
      let dateText = "";
      let timestamp = 0;
      if (item.pubDate) {
        try {
          const d = new Date(item.pubDate);
          if (!isNaN(d.getTime())) {
            timestamp = d.getTime();
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            dateText = `${dd}/${mm}/${yyyy}`;
          }
        } catch { }
      }
      
      let imageSrc = item.thumbnail || "";
      if (item.enclosure?.link && isValidImage(item.enclosure.link)) {
        imageSrc = item.enclosure.link;
      }
      if (!imageSrc || !isValidImage(imageSrc)) {
        const content = (item.description || "") + " " + (item.content || "");
        const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match && isValidImage(match[1])) {
          imageSrc = match[1];
        }
      }
      
      if (title && link) {
        items.push({ title, href: link, dateText, timestamp, image: imageSrc });
      }
    } catch { }
  }
  return items;
}

// Helper to dynamically auto-discover RSS feed URLs from a homepage or return standard Nukeviet fallbacks
async function discoverSuoiluRSSUrls(customUrl?: string): Promise<string[]> {
  const targetUrl = customUrl || "https://suoilu.db.edu.vn/";
  const urls: string[] = [];
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000); // Increased timeout to 8s for better reliability on slow servers
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
      },
      signal: controller.signal
    });
    clearTimeout(id);
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Look for alternate rss/xml links in the head
      $('link[type="application/rss+xml"], link[type="application/atom+xml"]').each((_, elem) => {
        const href = $(elem).attr("href");
        if (href) {
          try {
            const absoluteUrl = new URL(href, targetUrl).toString();
            if (!urls.includes(absoluteUrl)) {
              urls.push(absoluteUrl);
            }
          } catch { }
        }
      });
    }
  } catch (err) {
    if (err.name === "AbortError") {
      // console.log("RSS discovery timed out (expected for slow target servers)");
    } else {
      const msg = getSafeErrorMessage(err);
      if (msg !== "destination offline") {
        console.log("RSS discovery deferred:", msg);
      }
    }
  }

  // Always append standard Nukeviet and WordPress fallback patterns for high availability
  try {
    const urlObj = new URL(targetUrl);
    const origin = urlObj.origin;
    const fallbacks = [
      `${origin}/news/rss/`,
      `${origin}/vi/news/rss/`,
      `${origin}/index.php?language=vi&nv=news&op=rss`,
      `${origin}/index.php?nv=news&op=rss`,
      `${origin}/feed/`
    ];

    for (const fb of fallbacks) {
      if (!urls.includes(fb)) {
        urls.push(fb);
      }
    }
  } catch {
    urls.push("https://suoilu.db.edu.vn/news/rss/");
  }

  return urls;
}

// Helper to parse HTML directly using cheerio
function parseDirectHTML(htmlContent: string): any[] {
  try {
    const $ = cheerio.load(htmlContent);
    const articleMap = new Map<string, {
      title: string;
      href: string;
      image: string;
      dateText: string;
      timestamp: number;
      description: string;
    }>();

    const isArticleHref = (href: string): boolean => {
      if (!href) return false;
      const hrefLower = href.toLowerCase();
      
      if (hrefLower.startsWith("javascript:") || hrefLower.startsWith("mailto:") || hrefLower.startsWith("tel:") || hrefLower.startsWith("#")) return false;
      
      // Exclude static assets
      if (hrefLower.match(/\.(jpg|jpeg|png|gif|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|mp3|mp4|css|js)$/)) return false;
      
      const ignoreWords = [
        "/laws/", "/about/", "/introduce/", "/contact/", "/download/", "/category/", "/tag/", "/author/", "/page/", 
        "/wp-admin/", "/wp-content/", "/wp-includes/", "login", "register", "logout", "search", "cart", "checkout", 
        "account", "password", "history", "admin", "dashboard", "setting", "config", "hotline", "zalo", "facebook"
      ];
      if (ignoreWords.some(word => hrefLower.includes(word))) return false;
      
      // We enforce .html for Nukeviet pages, or if the URL has common article categories in path, or contains several hyphens (slug)
      const hasHtml = hrefLower.includes(".html");
      const hasArticleCategory = [
        "/tin-tuc", "/su-kien", "/hoat-dong", "/giao-duc", "/thong-bao", 
        "/tin-truong", "/doan-doi", "/chuyen-de", "/giao-an", "/bai-viet",
        "/khoa-hoc/", "/hoat-dong-cua-nghanh/", "/hoat-dong-chuyen-mon/",
        "/hoat-dong-doan-doi/", "/hoat-dong-cong-nghe-thong-tin/", "/hoat-dong-cong-doan-10/"
      ].some(cat => hrefLower.includes(cat));
      
      const urlPath = hrefLower.replace(/^https?:\/\/[^/]+/, "");
      const hyphensCount = (urlPath.split('/').pop() || "").split('-').length - 1;
      const isSlug = hyphensCount >= 2; 
      
      if (hrefLower.includes("suoilu.db.edu.vn") || !hrefLower.startsWith("http")) {
        // Enforce .html ending for Nukeviet-based Suối Lư portal to filter out menu lists and categories
        return hasHtml && (hasArticleCategory || isSlug);
      }
      return hasHtml || hasArticleCategory || isSlug;
    };

    $("a").each((_, aElem) => {
      const aTag = $(aElem);
      const href = aTag.attr("href");
      if (!href || !isArticleHref(href)) return;

      // Normalize href
      let normHref = href.trim();
      normHref = normHref.replace(/^https?:\/\/(www\.)?suoilu\.db\.edu\.vn/i, "");
      if (!normHref.startsWith("/") && !normHref.startsWith("http")) {
        normHref = "/" + normHref;
      }

      let existing = articleMap.get(normHref);
      if (!existing) {
        existing = {
          title: "",
          href: normHref,
          image: "",
          dateText: "",
          timestamp: 0,
          description: ""
        };
        articleMap.set(normHref, existing);
      }

      // 1. Try to get title (if tag contains non-empty text)
      const text = aTag.text().replace(/\s+/g, " ").trim();
      if (text.length >= 10 && text.length <= 250) {
        const skip = ["trang chủ", "giới thiệu", "liên hệ", "đăng nhập", "xem thêm", "bản đồ", "video", "album", "góp ý", "thư viện", "chọn năm học"];
        if (!skip.some(s => text.toLowerCase().includes(s))) {
          // Keep the longest title found or prefer the one that is currently not empty
          if (!existing.title || text.length > existing.title.length) {
            existing.title = text;
          }
        }
      }

      // 2. Try to get image from inside the a tag
      const imgInside = aTag.find("img").first();
      if (imgInside.length > 0) {
        const src = imgInside.attr("data-src") || imgInside.attr("src") || imgInside.attr("data-original") || "";
        if (src && isValidImage(src)) {
          existing.image = src;
        }
      }

      // Find the parent container for more context (image, date, description)
      const parent = aTag.closest("div, li, p, td, tr, article, .block_news, .tms_bg_news");
      if (parent.length > 0) {
        // If image not found inside, search the parent
        if (!existing.image) {
          const imgNear = parent.find("img").first();
          if (imgNear.length > 0) {
            const src = imgNear.attr("data-src") || imgNear.attr("src") || imgNear.attr("data-original") || "";
            if (src && isValidImage(src)) {
              existing.image = src;
            }
          }
        }

        // Try to parse description if not present
        if (!existing.description) {
          let description = "";
          const descSelectors = [".intro", ".summary", ".description", ".excerpt", ".post-excerpt", ".lead", "p"];
          for (const ds of descSelectors) {
            const descElem = parent.find(ds).first();
            if (descElem.length > 0) {
              const txt = descElem.text().trim();
              if (txt.length > 30 && txt.length < 400 && !txt.includes(existing.title)) {
                description = txt;
                break;
              }
            }
          }
          if (!description) {
            parent.find("p, span").each((_, sibling) => {
              const txt = $(sibling).text().trim();
              if (txt.length > 30 && txt.length < 400 && !txt.includes(existing.title)) {
                description = txt;
                return false; // break
              }
            });
          }
          if (description) {
            existing.description = description;
          }
        }

        // Try to parse date
        if (!existing.dateText) {
          const articleId = extractArticleId(normHref);
          if (articleId && SUOILU_DATES[articleId]) {
            existing.dateText = SUOILU_DATES[articleId];
            existing.timestamp = parseVietnameseDate(existing.dateText).getTime();
          } else {
            // Search up to 4 parents deep for date
            let containerText = "";
            let current = aTag;
            for (let i = 0; i < 4; i++) {
              const p = current.parent();
              if (p.length === 0) break;
              const pText = p.text() || "";
              const hasDate = pText.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/) || pText.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);
              if (hasDate) {
                containerText = pText;
                break;
              }
              current = p;
            }
            if (!containerText) {
              containerText = parent.text() || "";
            }

            let hour = 0;
            let minute = 0;
            const timeMatch = containerText.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              hour = parseInt(timeMatch[1], 10);
              minute = parseInt(timeMatch[2], 10);
            }

            const dateMatch = containerText.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
            const dateMatchWord = containerText.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);

            if (dateMatch) {
              existing.dateText = dateMatch[0];
              const baseDate = parseVietnameseDate(existing.dateText);
              if (timeMatch) {
                baseDate.setHours(hour, minute, 0, 0);
              }
              existing.timestamp = baseDate.getTime();
            } else if (dateMatchWord) {
              const d = dateMatchWord[1];
              const m = dateMatchWord[2];
              const y = dateMatchWord[3];
              existing.dateText = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
              const baseDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
              if (timeMatch) {
                baseDate.setHours(hour, minute, 0, 0);
              }
              existing.timestamp = baseDate.getTime();
            }
          }
        }
      }
    });

    const results = Array.from(articleMap.values()).filter(item => item.title && item.href);
    console.log(`[parseDirectHTML] Extracted and merged ${results.length} valid articles from homepage.`);
    return results;
  } catch (err: any) {
    console.error("[parseDirectHTML] Error parsing HTML content:", err);
    return [];
  }
}

// Direct scraping method using cheerio with multi-origin CORS proxy and direct fallbacks
async function scrapeDirectHTML(targetUrl: string): Promise<any[]> {
  // --- HTML SCRAPE ATTEMPT 1: Direct fetch ---
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(addCacheBuster(targetUrl), {
      headers: {
        ...CACHE_BYPASS_HEADERS,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
      },
      signal: controller.signal
    });
    clearTimeout(id);
    if (response.ok) {
      const html = await response.text();
      const parsed = parseDirectHTML(html);
      if (parsed && parsed.length > 0) {
        console.log(`scrapeDirectHTML successful via Direct Fetch. Scraped ${parsed.length} posts.`);
        return parsed;
      }
    }
  } catch (err: any) {
    console.log("Direct HTML scrape fetch failed, trying proxy channels... Error:", err?.message || err);
  }

  // --- HTML SCRAPE ATTEMPT 2: via corsproxy.io ---
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(addCacheBuster(targetUrl))}`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(addCacheBuster(proxyUrl), {
      headers: CACHE_BYPASS_HEADERS,
      signal: controller.signal
    });
    clearTimeout(id);
    if (response.ok) {
      const html = await response.text();
      const parsed = parseDirectHTML(html);
      if (parsed && parsed.length > 0) {
        console.log(`scrapeDirectHTML successful via corsproxy.io. Scraped ${parsed.length} posts.`);
        return parsed;
      }
    }
  } catch (err: any) {
    console.log("Proxy HTML scrape via corsproxy.io failed, trying AllOrigins... Error:", err?.message || err);
  }

  // --- HTML SCRAPE ATTEMPT 3: via AllOrigins CORS proxy ---
  try {
    const proxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent(addCacheBuster(targetUrl));
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(addCacheBuster(proxyUrl), {
      headers: CACHE_BYPASS_HEADERS,
      signal: controller.signal
    });
    clearTimeout(id);
    if (response.ok) {
      const data = await response.json();
      if (data && data.contents) {
        const parsed = parseDirectHTML(data.contents);
        if (parsed && parsed.length > 0) {
          console.log(`scrapeDirectHTML successful via AllOrigins. Scraped ${parsed.length} posts.`);
          return parsed;
        }
      }
    }
  } catch (err: any) {
    console.log("Proxy HTML scrape via AllOrigins failed. Error:", err?.message || err);
  }

  return [];
}

// Primary controller to fetch and organize news using high-availability, multi-origin fallback system
async function fetchSuoiluNews(customUrl?: string): Promise<any[]> {
  const timeoutPromise = new Promise<any[]>((resolve) => {
    setTimeout(() => {
      console.log("Global timeout of 25s reached in fetchSuoiluNews. Resolving with empty list.");
      resolve([]);
    }, 25000);
  });

  const fetchPromise = async (): Promise<any[]> => {
    const targetHostUrl = "https://suoilu.db.edu.vn";
    const urlObj = new URL(customUrl || targetHostUrl);
    const baseOrigin = urlObj.origin;
    
    let candidates: any[] = [];
    let successfulMethod = "";

    console.log("Starting high-resilience news fetch for", baseOrigin);

    const discoveredRssUrls = await discoverSuoiluRSSUrls(customUrl || targetHostUrl);
    console.log("Discovered RSS endpoints for fallback sequence:", discoveredRssUrls);

    // --- SPECIAL HIGH-PRIORITY CHANNEL FOR SUOILU.DB.EDU.VN: Direct HTML Scraping ---
    if (baseOrigin.includes("suoilu")) {
      try {
        console.log("Suối Lư detected! Running high-priority direct HTML cheerio scraper.");
        const scraped = await scrapeDirectHTML(customUrl || targetHostUrl);
        if (scraped && scraped.length > 0) {
          candidates = scraped;
          successfulMethod = "Direct HTML cheerio Scraper (Suối Lư Priority)";
        }
      } catch (err: any) {
        console.log("Priority Direct HTML scrape failed, falling back to other channels:", getSafeErrorMessage(err));
      }
    }

    // --- CHANNEL 1: WordPress REST API ---
    if (candidates.length === 0 && !baseOrigin.includes("nukeviet")) {
      try {
        const wpApiUrl = `${baseOrigin}/wp-json/wp/v2/posts?_embed&per_page=12`;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(addCacheBuster(wpApiUrl), {
          headers: { 
            ...CACHE_BYPASS_HEADERS,
            "Accept": "application/json" 
          },
          signal: controller.signal
        });
        clearTimeout(id);
        if (res.ok) {
          const posts = await res.json();
          const parsed = parseWordPressPosts(posts);
          if (parsed.length > 0) {
            candidates = parsed;
            successfulMethod = "WordPress REST API (Direct)";
          }
        }
      } catch (err: any) {
        console.log("Channel 1 WP REST API direct deferred:", getSafeErrorMessage(err));
      }
    }

    // --- CHANNEL 2: Public RSS to JSON Proxy (Ultra-high bypass rate for CDN/geo firewall blocks) ---
    if (candidates.length === 0) {
      // Limit to first 2 URLs to prevent excessive sequential delay
      for (const rssUrl of discoveredRssUrls.slice(0, 2)) {
        try {
          const rss2JsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(rss2JsonUrl, { signal: controller.signal });
          clearTimeout(id);
          if (res.ok) {
            const json = await res.json();
            const parsed = parseRss2Json(json);
            if (parsed.length > 0) {
              candidates = parsed;
              successfulMethod = `RSS-to-JSON API Proxy (${rssUrl})`;
              break;
            }
          }
        } catch (err: any) {
          console.log(`Channel 2 RSS-to-JSON Proxy deferred for ${rssUrl}:`, getSafeErrorMessage(err));
        }
      }
    }

    // --- CHANNEL 2.5: corsproxy.io (High-resilience Cloudflare edge proxy) ---
    if (candidates.length === 0) {
      // Limit to first 2 URLs
      for (const rssUrl of discoveredRssUrls.slice(0, 2)) {
        try {
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`;
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(proxyUrl, { signal: controller.signal });
          clearTimeout(id);
          if (res.ok) {
            const xmlText = await res.text();
            const parsed = parseRSSXml(xmlText);
            if (parsed.length > 0) {
              candidates = parsed;
              successfulMethod = `corsproxy.io RSS Proxy (${rssUrl})`;
              break;
            }
          }
        } catch (err: any) {
          console.log(`Channel 2.5 corsproxy.io RSS Proxy deferred for ${rssUrl}:`, getSafeErrorMessage(err));
        }
      }
    }

    // --- CHANNEL 3: AllOrigins CORS Proxy for RSS Feed (Decentralized backup proxy) ---
    if (candidates.length === 0) {
      // Limit to first 2 URLs
      for (const rssUrl of discoveredRssUrls.slice(0, 2)) {
        try {
          const proxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent(rssUrl);
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(proxyUrl, { signal: controller.signal });
          clearTimeout(id);
          if (res.ok) {
            const data = await res.json();
            if (data && data.contents) {
              const parsed = parseRSSXml(data.contents);
              if (parsed.length > 0) {
                candidates = parsed;
                 successfulMethod = `AllOrigins RSS Proxy (${rssUrl})`;
                break;
              }
            }
          }
        } catch (err: any) {
          console.log(`Channel 3 AllOrigins RSS Proxy deferred for ${rssUrl}:`, getSafeErrorMessage(err));
        }
      }
    }

    // --- CHANNEL 4: AllOrigins CORS Proxy for WP REST API (WordPress only fallback) ---
    if (candidates.length === 0 && !baseOrigin.includes("nukeviet")) {
      try {
        const proxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent(`${baseOrigin}/wp-json/wp/v2/posts?_embed&per_page=12`);
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(id);
        if (res.ok) {
          const data = await res.json();
          if (data && data.contents) {
            const posts = JSON.parse(data.contents);
            const parsed = parseWordPressPosts(posts);
            if (parsed.length > 0) {
              candidates = parsed;
              successfulMethod = "AllOrigins WP-JSON Proxy";
            }
          }
        }
      } catch (err: any) {
        console.log("Channel 4 AllOrigins WP-JSON Proxy deferred:", getSafeErrorMessage(err));
      }
    }

    // --- CHANNEL 5: Direct RSS Parser (Standard cloud attempt) ---
    if (candidates.length === 0) {
      // Limit to first 2 URLs
      for (const rssUrl of discoveredRssUrls.slice(0, 2)) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(rssUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36",
              "Accept": "text/xml,application/xml,application/rss+xml,application/atom+xml;q=0.9"
            },
            signal: controller.signal
          });
          clearTimeout(id);
          if (res.ok) {
            const xmlText = await res.text();
            const parsed = parseRSSXml(xmlText);
            if (parsed.length > 0) {
              candidates = parsed;
              successfulMethod = `Direct RSS Feed Parser (${rssUrl})`;
              break;
            }
          }
        } catch (err: any) {
          const msg = getSafeErrorMessage(err);
          if (msg !== "destination offline") {
            console.log(`Channel 5 Direct RSS Parser deferred for ${rssUrl}:`, msg);
          }
        }
      }
    }

    // --- CHANNEL 6: Direct cheerio scraping (Standard cloud attempt) ---
    if (candidates.length === 0) {
      const scraped = await scrapeDirectHTML(customUrl || "https://suoilu.db.edu.vn/");
      if (scraped.length > 0) {
        candidates = scraped;
        successfulMethod = "Direct HTML cheerio Scraper";
      }
    }

    console.log(`News fetch completed. Method used: [${successfulMethod || "NONE - FALLBACK RETRIEVED"}], Articles found: ${candidates.length}`);

    // Final validation, relative link resolving, categorisation and deduplication
    const finalItems: any[] = [];
    const absoluteCheck = /^https?:\/\//i;
    const seenTitles = new Set<string>();

    // Sort candidates: prioritize larger article ID (Nukeviet auto-incrementing ID), then timestamp
    candidates.sort((a, b) => {
      const idA = extractArticleId(a.href || a.link);
      const idB = extractArticleId(b.href || b.link);
      if (idA && idB && idA !== idB) {
        return idB - idA;
      }
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    for (const item of candidates) {
      let resolvedLink = item.href;
      if (!resolvedLink) continue;
      
      if (!absoluteCheck.test(resolvedLink)) {
        resolvedLink = resolvedLink.startsWith("/") 
          ? `${baseOrigin}${resolvedLink}` 
          : `${baseOrigin}/${resolvedLink}`;
      }

      const cleanTitle = item.title
        .replace(/\s+/g, " ")
        .replace(/^(●|►|»|-|\*)\s*/, "")
        .trim();

      if (cleanTitle.length > 18 && !seenTitles.has(cleanTitle)) {
        seenTitles.add(cleanTitle);

        const category = getCategoryFromUrl(resolvedLink, cleanTitle);

        let finalDate = item.dateText;
        if (!finalDate) {
          const d = new Date();
          finalDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }

        let finalImage = item.image;
        if (finalImage && isValidImage(finalImage)) {
          finalImage = finalImage.trim();
          // Upgrade http to https to avoid browser mixed-content blocks
          if (finalImage.startsWith("http://")) {
            finalImage = finalImage.replace("http://", "https://");
          } else if (finalImage.startsWith("//")) {
            finalImage = `https:${finalImage}`;
          } else if (!absoluteCheck.test(finalImage)) {
            finalImage = finalImage.startsWith("/")
              ? `${baseOrigin}${finalImage}`
              : `${baseOrigin}/${finalImage}`;
          }
        } else {
          finalImage = getThematicImage(cleanTitle, finalItems.length);
        }

        let description = item.description || "";
        if (!description) {
          const tLower = cleanTitle.toLowerCase();
          if (tLower.includes("lễ tổng kết") || tLower.includes("lễ tổng kết năm học")) {
            description = "Trong không khí trang trọng, vui tươi và đầy xúc động, sáng ngày 26/5/2026, Trường PTDTBT TH&THCS Suối Lư (xã Xa Dung, tỉnh Điện Biên) đã long trọng tổ chức Lễ tổng kết năm học 2025–2026 với sự tham dự của đại diện cấp ủy, chính quyền địa phương, lực lượng Công an xã, các ban ngành đoàn thể, cha mẹ học sinh cùng toàn thể cán bộ, giáo viên, nhân viên và học sinh nhà trường.";
          } else if (tLower.includes("chủ động chuẩn bị") || tLower.includes("nâng cao chất lượng") || tLower.includes("chuẩn bị nâng cao")) {
            description = "Kỳ nghỉ hè không chỉ là khoảng thời gian để học sinh nghỉ ngơi sau một năm học học tập vất vả, mà còn là khoảng thời gian để ban giám hiệu nhà trường cùng tập thể giáo viên chủ động chuẩn bị nâng cao chất lượng dạy và học cho năm học mới 2026 – 2027 sắp tới.";
          } else if (tLower.includes("tập huấn")) {
            description = "Ban giám hiệu nhà trường cùng tổ cốt cán tham gia hội nghị tập huấn trực tuyến toàn quốc về chuyển đổi số, cập nhật và đồng bộ cơ sở dữ liệu học bạ điện tử phục vụ tuyển sinh số của ngành giáo dục.";
          } else if (tLower.includes("kỹ năng sống")) {
            description = "Công tác giáo dục kỹ năng sống, rèn luyện kỹ năng tự lập, phòng chống bạo lực học đường và xây dựng lối sống tích cực, lành mạnh cho học sinh dân tộc bán trú tại địa bàn vùng cao đặc biệt khó khăn.";
          } else if (tLower.includes("cuộc thi")) {
            description = "Cuộc thi ý nghĩa nhằm tôn vinh những người đưa đò thầm lặng, chia sẻ những bài học hay từ trang sách và kỷ niệm xúc động về tình thầy trò dưới mái trường PTDTBT TH & THCS Suối Lư yêu dấu.";
          } else {
            description = `${cleanTitle}. Đây là bản tin sự kiện giáo dục chính thức từ Trường PTDTBT TH & THCS Suối Lư nhằm cập nhật các hoạt động dạy, học và rèn luyện của nhà trường.`;
          }
        }

        finalItems.push({
          id: `sl-${finalItems.length + 1}`,
          title: cleanTitle,
          category,
          date: finalDate,
          link: resolvedLink,
          source: urlObj.hostname,
          image: finalImage,
          description: description,
          timestamp: item.timestamp
        });
      }

      if (finalItems.length >= 12) break;
    }

    // Parallel scraper for detailed page descriptions (SEO meta tag fallback)
    // ONLY fetch the first 4 articles to drastically reduce server load, response latency, and rate-limiting blocks.
    const itemsToEnrich = finalItems.slice(0, 4);
    console.log(`[fetchSuoiluNews] Enriching top ${itemsToEnrich.length} articles with detailed descriptions from their URLs...`);
    await Promise.all(
      itemsToEnrich.map(async (item) => {
        try {
          if (!item.link || !item.link.startsWith("http")) return;

          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 6000); // 6s generous timeout per article detail page

          let res = await fetch(addCacheBuster(item.link), {
            headers: CACHE_BYPASS_HEADERS,
            signal: controller.signal
          });
          clearTimeout(id);

          if (!res.ok) {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(addCacheBuster(item.link))}`;
            const proxyController = new AbortController();
            const proxyId = setTimeout(() => proxyController.abort(), 6000);
            res = await fetch(proxyUrl, {
              headers: CACHE_BYPASS_HEADERS,
              signal: proxyController.signal
            });
            clearTimeout(proxyId);
          }

          if (res.ok) {
            const html = await res.text();
            const $ = cheerio.load(html);
            
            let metaDesc = $("meta[name='description']").attr("content") || 
                           $("meta[property='og:description']").attr("content") || 
                           $("meta[name='Description']").attr("content") || "";
            
            metaDesc = metaDesc.trim();
            if (metaDesc.length > 20) {
              item.description = metaDesc.replace(/\s+/g, " ");
              console.log(`[fetchSuoiluNews] Successfully scraped detail description for ID ${item.id}:`, item.description.substring(0, 60) + "...");
            }
          }
        } catch (err: any) {
          console.log(`[fetchSuoiluNews] Individual detail scrape failed/aborted for ${item.link}:`, err?.message || err);
        }
      })
    );

    return finalItems;
  };

  return Promise.race([fetchPromise(), timeoutPromise]);
}

async function startServer() {
  // Deprecated startServer: setup registered on module level below
}

const app = express();

// Support JSON request processing
app.use(express.json());

// Filesystem persistence path for central configuration and portal settings
const SETTINGS_FILE = path.join(process.cwd(), "portal_settings.json");

// Read settings from JSON file database
function readSettings(): Record<string, string> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
      if (!content || content.trim() === "") {
        return {};
      }
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Failed to read settings file:", e);
  }
  return {};
}

// Write settings to JSON file database
function writeSettings(settings: Record<string, string>) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write settings file:", e);
  }
}

// GET /api/settings - Retrieve all central portal configurations
app.get("/api/settings", (req, res) => {
  const settings = readSettings();
  res.json({ status: "success", data: settings });
});

// POST /api/settings - Update or create a single config setting
app.post("/api/settings", (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ status: "error", message: "Key required" });
  const settings = readSettings();
  settings[key] = value || "";
  writeSettings(settings);
  res.json({ status: "success", message: `Setting ${key} updated` });
});

// SEO: robots.txt endpoint
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nAllow: /\nSitemap: https://suoilu.db.edu.vn/sitemap.xml");
});

// SEO: sitemap.xml endpoint
app.get("/sitemap.xml", (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  res.type("application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://suoilu.db.edu.vn/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

// REST endpoints follow

// POST /api/settings/bulk - Bulk update multiple config settings (sync credentials or themes)
app.post("/api/settings/bulk", (req, res) => {
  const bulkData = req.body;
  if (!bulkData || typeof bulkData !== "object") {
    return res.status(400).json({ status: "error", message: "Invalid settings object payload" });
  }
  const settings = readSettings();
  Object.assign(settings, bulkData);
  writeSettings(settings);
  res.json({ status: "success", data: settings });
});

// Endpoint to serve scrapped live news automatically
app.get("/api/news", async (req, res) => {
  try {
    const now = Date.now();
    const bypassCache = req.query.refresh === "true";
    const sourceUrl = (req.query.source as string || "https://suoilu.db.edu.vn").trim();
    
    // Normalize sourceUrl for reliable cache mapping
    const cacheKey = sourceUrl.toLowerCase().split('?')[0];

    if (bypassCache) {
      delete newsCacheMap[cacheKey];
    }

    if (!bypassCache && newsCacheMap[cacheKey] && (now - newsCacheMap[cacheKey].timestamp < CACHE_DURATION)) {
      return res.json({ status: "success", source: "cache", data: newsCacheMap[cacheKey].data });
    }

    const liveNews = await fetchSuoiluNews(sourceUrl);
    if (liveNews && liveNews.length > 0) {
      newsCacheMap[cacheKey] = { data: liveNews, timestamp: now };
      return res.json({ status: "success", source: "scraped", data: liveNews });
    }

    if (newsCacheMap[cacheKey]) {
      return res.json({ status: "success", source: "cache_stale", data: newsCacheMap[cacheKey].data });
    }

    return res.json({ 
      status: "fallback", 
      source: "fallback_static", 
      data: FALLBACK_NEWS 
    });
  } catch (error: any) {
    console.error("Express API /api/news failed:", error);
    return res.json({ 
      status: "fallback", 
      source: "fallback_error", 
      data: FALLBACK_NEWS,
      errorLog: error.message || String(error)
    });
  }
});

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Local starting logic
if (!process.env.VERCEL) {
  async function startLocalServer() {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server starting on port ${PORT}`);
    });
  }
  startLocalServer();
}

export default app;

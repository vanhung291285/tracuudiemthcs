import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";

// Bypass SSL certificate validation for self-signed or invalid certs common on local school/gov portals
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Cache for news to reduce requests and speed up response times
let newsCache: any[] = [];
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // Reduce to 5 minutes cache

// Robust mock/fallback articles for PTDTBT TH & THCS Suối Lư with premium educational illustrations
const FALLBACK_NEWS = [
  {
    id: "fb-1",
    title: "Giáo dục kỹ năng sống cho học sinh THCS – những điều cần biết",
    category: "TIN TRƯỜNG SUỐI LƯ",
    date: "10/06/2026",
    link: "https://suoilu.db.edu.vn/",
    source: "Hệ thống",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "fb-2",
    title: "Công tác ôn tập, củng cố và tổ chức Kỳ kiểm tra học kỳ II bậc THCS nghiêm túc, đúng quy chế tại nhà trường.",
    category: "HỌC BẠ ĐIỆN TỬ • TIN NHÀ TRƯỜNG",
    date: "17/06/2026",
    link: "https://suoilu.db.edu.vn/",
    source: "Hệ thống",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "fb-3",
    title: "Nâng cấp kỹ thuật và cải cách phương thức sinh chữ ký công nghệ bảo mật chống làm giả học bạ điện tử học sinh.",
    category: "CÔNG NGHỆ THÔNG TIN",
    date: "14/06/2026",
    link: "https://suoilu.db.edu.vn/",
    source: "Hệ thống",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "fb-4",
    title: "PTDTBT TH & THCS Suối Lư đẩy mạnh phong trào chuyển đổi số toàn diện trong công tác dạy học và chuyển giao sổ điểm số năm học 2025-2026.",
    category: "CHUYỂN ĐỔI SỐ",
    date: "10/06/2026",
    link: "https://suoilu.db.edu.vn/",
    source: "Hệ thống",
    image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "fb-5",
    title: "Tổng kết thi đua chào mừng ngày Khoa học Công nghệ lớp học thông minh tại địa bàn xã Suối Lư.",
    category: "THI ĐUA KHEN THƯỞNG",
    date: "28/05/2026",
    link: "https://suoilu.db.edu.vn/",
    source: "Hệ thống",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&auto=format&fit=crop&q=60"
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
    const id = setTimeout(() => controller.abort(), 5000); // Increased timeout to 5s for better reliability on slow servers
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
    console.warn("Failed to dynamically auto-discover RSS feeds:", err);
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

// Direct scraping method using cheerio as a fallback option, enhanced for Nukeviet CSS structures
async function scrapeDirectHTML(targetUrl: string): Promise<any[]> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
      },
      signal: controller.signal
    });
    
    clearTimeout(id);

    if (!response.ok) return [];
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const candidates: any[] = [];

    // Comprehensive selector list supporting Nukeviet templates and traditional frameworks
    const itemSelector = [
      "article", 
      ".news_column", 
      ".news-item", 
      ".post-item", 
      ".tin-tuc-item", 
      ".news-box", 
      ".post-block", 
      ".item-news", 
      ".views-row", 
      ".wp-block-post", 
      ".grid-item", 
      ".entry-item", 
      ".td-block-span4", 
      ".td-block-span6", 
      ".td-block-span12", 
      ".post-column", 
      ".panel-body", 
      ".content-box", 
      ".main-show"
    ].join(", ");

    $(itemSelector).each((_, elem) => {
      // Find all anchors inside this matched container/element that can be articles
      const aTags = $(elem).find("a");
      aTags.each((_, aElem) => {
        const aTag = $(aElem);
        const href = aTag.attr("href");
        if (!href) return;
        
        let title = aTag.text().trim();
        // Skip tiny text (e.g. "Chi tiết", "Xem thêm") or huge paragraphs
        if (title.length < 18 || title.length > 180) return;
        
        const lowerText = title.toLowerCase();
        const skipPatterns = [
          "trang chủ", "giới thiệu", "liên hệ", "đăng nhập", "xem thêm", "bản đồ",
          "sơ đồ", "thư viện", "góp ý", "điều khoản", "chính sách", "lịch công tác",
          "tài khoản", "quên mật khẩu", "hướng dẫn", "thông báo chung", "văn bản",
          "cơ cấu tổ chức", "ban giám hiệu", "kết quả tìm kiếm", "chọn năm học",
          "tra cứu điểm", "đăng ký", "phân hiệu", "lớp học", "trực tuyến", "video",
          "album ảnh", "thư viện ảnh", "lịch thi", "thời khóa biểu", "thực đơn",
          "hỏi đáp", "đăng ký", "bản quyền", "hướng dẫn sử dụng", "chi tiết", "xem chi tiết"
        ];
        if (skipPatterns.some(p => lowerText.includes(p))) return;
        
        const parent = aTag.closest("div, li, p, td, tr, article");
        let dateText = "";
        let timestamp = 0;
        const parentText = parent.text() || "";
        const dateMatch = parentText.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (dateMatch) {
          dateText = dateMatch[0];
          timestamp = parseVietnameseDate(dateText).getTime();
        }
        
        let imageSrc = "";
        const imgSelectors = [
          "img.img-thumbnail",
          "img.img-responsive",
          "img.wp-post-image",
          "img.attachment-post-thumbnail",
          "img"
        ];
        let imgElem = parent.find(imgSelectors.join(", ")).first();
        if (imgElem.length === 0) {
          imgElem = aTag.parent().find("img").first();
        }
        if (imgElem.length === 0) {
          imgElem = parent.prev().find("img").first();
        }
        if (imgElem.length > 0) {
          imageSrc = imgElem.attr("data-orig-file") || 
                     imgElem.attr("data-large-file") ||
                     imgElem.attr("data-src") || 
                     imgElem.attr("src") || "";
        }
        
        candidates.push({ title, href, dateText, timestamp, image: imageSrc });
      });
    });

    // If no candidates found from the main grid selectors, run the generic "all anchors" fallback
    if (candidates.length === 0) {
      $("a").each((_, aElem) => {
        const aTag = $(aElem);
        const href = aTag.attr("href");
        if (!href) return;
        
        let title = aTag.text().trim();
        if (title.length < 18 || title.length > 180) return;
        
        const lowerText = title.toLowerCase();
        const skipPatterns = [
          "trang chủ", "giới thiệu", "liên hệ", "đăng nhập", "xem thêm", "bản đồ",
          "sơ đồ", "thư viện", "góp ý", "điều khoản", "chính sách", "lịch công tác",
          "tài khoản", "quên mật khẩu", "hướng dẫn", "thông báo chung", "văn bản",
          "cơ cấu tổ chức", "ban giám hiệu", "kết quả tìm kiếm", "chọn năm học",
          "tra cứu điểm", "đăng ký", "phân hiệu", "lớp học", "trực tuyến", "video",
          "album ảnh", "thư viện ảnh", "lịch thi", "thời khóa biểu", "thực đơn",
          "hỏi đáp", "đăng ký", "bản quyền", "hướng dẫn sử dụng", "chi tiết", "xem chi tiết"
        ];
        if (skipPatterns.some(p => lowerText.includes(p))) return;
        
        const parent = aTag.closest("div, li, p, td, tr, article");
        let dateText = "";
        let timestamp = 0;
        const parentText = parent.text() || "";
        const dateMatch = parentText.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (dateMatch) {
          dateText = dateMatch[0];
          timestamp = parseVietnameseDate(dateText).getTime();
        }
        
        let imageSrc = "";
        const imgSelectors = [
          "img.img-thumbnail",
          "img.img-responsive",
          "img.wp-post-image",
          "img.attachment-post-thumbnail",
          "img"
        ];
        let imgElem = parent.find(imgSelectors.join(", ")).first();
        if (imgElem.length === 0) {
          imgElem = aTag.parent().find("img").first();
        }
        if (imgElem.length === 0) {
          imgElem = parent.prev().find("img").first();
        }
        if (imgElem.length > 0) {
          imageSrc = imgElem.attr("data-orig-file") || 
                     imgElem.attr("data-large-file") ||
                     imgElem.attr("data-src") || 
                     imgElem.attr("src") || "";
        }
        
        candidates.push({ title, href, dateText, timestamp, image: imageSrc });
      });
    }

    return candidates;
  } catch {
    return [];
  }
}

// Helper to scrape RSS/XML news feed as a robust fallback
async function fetchSuoiluRSS(): Promise<any[]> {
  // Deprecated in favor of multi-origin discovery fallback mechanism, but kept as a simple fallback
  const targetUrl = "https://suoilu.db.edu.vn/news/rss/";
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000); 

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36",
        "Accept": "text/xml,application/xml,application/rss+xml,application/atom+xml;q=0.9"
      },
      signal: controller.signal
    });
    
    clearTimeout(id);

    if (response.ok) {
      const xmlText = await response.text();
      return parseRSSXml(xmlText);
    }
  } catch (err) {
    console.warn("Direct RSS fetch failed:", err);
  }
  return [];
}

// Primary controller to fetch and organize news using high-availability, multi-origin fallback system
// Primary controller to fetch and organize news using high-availability, multi-origin fallback system
async function fetchSuoiluNews(customUrl?: string): Promise<any[]> {
  // Wrap the entire fetching process in a global timeout to avoid Vercel 504 Gateway Timeout
  const timeoutPromise = new Promise<any[]>((resolve) => {
    setTimeout(() => {
      console.warn("Global timeout of 12s reached in fetchSuoiluNews. Resolving with empty list to fallback to static news.");
      resolve([]);
    }, 12000);
  });

  const fetchPromise = async (): Promise<any[]> => {
    const targetHostUrl = "https://suoilu.db.edu.vn";
    const urlObj = new URL(customUrl || targetHostUrl);
    const baseOrigin = urlObj.origin;
    
    let candidates: any[] = [];
    let successfulMethod = "";

    console.log("Starting high-resilience news fetch for", baseOrigin);

    // Discover feed URLs (highly compatible with NukeViet, WordPress, etc.)
    const discoveredRssUrls = await discoverSuoiluRSSUrls(customUrl || targetHostUrl);
    console.log("Discovered RSS endpoints for fallback sequence:", discoveredRssUrls);

    // --- CHANNEL 1: WordPress REST API (Usually skipped if Nukeviet, but checked for completeness) ---
    if (baseOrigin.includes("suoilu") && !baseOrigin.includes("nukeviet")) {
      try {
        const wpApiUrl = "https://suoilu.db.edu.vn/wp-json/wp/v2/posts?_embed&per_page=12";
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(wpApiUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows; U; Windows NT 6.1; vi-VN) AppleWebKit/534.31" },
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
        console.log("Channel 1 WP REST API direct deferred:", err.message);
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
          console.log(`Channel 2 RSS-to-JSON Proxy deferred for ${rssUrl}:`, err.message);
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
          console.log(`Channel 2.5 corsproxy.io RSS Proxy deferred for ${rssUrl}:`, err.message);
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
          console.log(`Channel 3 AllOrigins RSS Proxy deferred for ${rssUrl}:`, err.message);
        }
      }
    }

    // --- CHANNEL 4: AllOrigins CORS Proxy for WP REST API (WordPress only fallback) ---
    if (candidates.length === 0 && !baseOrigin.includes("nukeviet")) {
      try {
        const proxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent("https://suoilu.db.edu.vn/wp-json/wp/v2/posts?_embed&per_page=12");
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
        console.log("Channel 4 AllOrigins WP-JSON Proxy deferred:", err.message);
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
          console.log(`Channel 5 Direct RSS Parser failed for ${rssUrl}:`, err.message);
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

    // Sort by timestamp descending
    candidates.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

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

        let category = "TIN TRƯỜNG SUỐI LƯ";
        const titleLower = cleanTitle.toLowerCase();
        if (titleLower.includes("hội nghị") || titleLower.includes("đại hội")) {
          category = "SỰ KIỆN • ĐẠI HỘI CHI BỘ";
        } else if (titleLower.includes("phát động") || titleLower.includes("thi đua") || titleLower.includes("học sinh giỏi") || titleLower.includes("khen thưởng")) {
          category = "THI ĐUA KHEN THƯỞNG";
        } else if (titleLower.includes("tuyển sinh") || titleLower.includes("lớp 10") || titleLower.includes("lớp 6") || titleLower.includes("xét tốt nghiệp")) {
          category = "TUYỂN SINH • HỌC BẠ";
        } else if (titleLower.includes("chuyên đề") || titleLower.includes("ngoại khóa") || titleLower.includes("hoạt động") || titleLower.includes("trải nghiệm")) {
          category = "CHUYÊN ĐỀ DẠY HỌC";
        } else if (titleLower.includes("ôn tập") || titleLower.includes("kiểm tra") || titleLower.includes("thi") || titleLower.includes("học tập")) {
          category = "DẠY VÀ HỌC";
        } else if (titleLower.includes("chuyên đổi số") || titleLower.includes("công nghệ") || titleLower.includes("học bạ điện tử") || titleLower.includes("chuyển đổi số")) {
          category = "CHUYỂN ĐỔI SỐ";
        }

        let finalDate = item.dateText;
        if (!finalDate) {
          // Only use current date if no date found, but marked as news
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

        finalItems.push({
          id: `sl-${finalItems.length + 1}`,
          title: cleanTitle,
          category,
          date: finalDate,
          link: resolvedLink,
          source: urlObj.hostname,
          image: finalImage,
          timestamp: item.timestamp
        });
      }

      if (finalItems.length >= 5) break; // Return exactly about 5 news items as requested
    }

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
  const bypassCache = req.query.refresh === "true";
  const sourceUrl = req.query.source as string;
  const now = Date.now();
  
  // If we have a custom source and it's different from the one used for cache, bypass cache
  const isDifferentSource = sourceUrl && newsCache.length > 0 && !newsCache[0].link.startsWith(sourceUrl.split('?')[0]);

  if (!bypassCache && !isDifferentSource && newsCache.length > 0 && (now - lastCacheTime < CACHE_DURATION)) {
    return res.json({ status: "success", source: "cache", data: newsCache });
  }

  const liveNews = await fetchSuoiluNews(sourceUrl);
  if (liveNews && liveNews.length > 0) {
    newsCache = liveNews;
    lastCacheTime = now;
    return res.json({ status: "success", source: "scraped", data: newsCache });
  }

  // If scraping failed but we have cache, return it even if expired
  if (newsCache.length > 0) {
    return res.json({ status: "success", source: "cache_stale", data: newsCache });
  }

  // fallback gracefully
  return res.json({ 
    status: "fallback", 
    source: "fallback_static", 
    data: FALLBACK_NEWS 
  });
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

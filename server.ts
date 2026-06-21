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
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache

// Robust mock/fallback articles for PTDTBT TH & THCS Suối Lư with premium educational illustrations
const FALLBACK_NEWS = [
  {
    id: "fb-1",
    title: "Công tác ôn tập, củng cố và tổ chức Kỳ kiểm tra học kỳ II bậc THCS nghiêm túc, đúng quy chế tại nhà trường.",
    category: "HỌC BẠ ĐIỆN TỬ • TIN NHÀ TRƯỜNG",
    date: "17/06/2026",
    link: "https://suoilu.db.edu.vn/",
    source: "Hệ thống",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "fb-2",
    title: "Nâng cấp kỹ thuật và cải cách phương thức sinh chữ ký công nghệ bảo mật chống làm giả học bạ điện tử học sinh.",
    category: "CÔNG NGHỆ THÔNG TIN",
    date: "14/06/2026",
    link: "https://suoilu.db.edu.vn/",
    source: "Hệ thống",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "fb-3",
    title: "PTDTBT TH & THCS Suối Lư đẩy mạnh phong trào chuyển đổi số toàn diện trong công tác dạy học và chuyển giao sổ điểm số năm học 2025-2026.",
    category: "CHUYỂN ĐỔI SỐ",
    date: "10/06/2026",
    link: "https://suoilu.db.edu.vn/",
    source: "Hệ thống",
    image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "fb-4",
    title: "Tổng kết thi đua chào mừng ngày Khoa học Công nghệ lớp học thông minh tại địa bàn xã Suối Lư.",
    category: "THI ĐUA KHEN THƯỞNG",
    date: "28/05/2026",
    link: "https://suoilu.db.edu.vn/",
    source: "Hệ thống",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "fb-5",
    title: "PTDTBT TH & THCS Suối Lư phối hợp tổ chức chuyên đề Giáo dục địa phương và Hoạt động trải nghiệm sáng tạo.",
    category: "CHƯƠNG TRÌNH GDPT 2018",
    date: "15/05/2026",
    link: "https://suoilu.db.edu.vn/",
    source: "Hệ thống",
    image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=500&auto=format&fit=crop&q=60"
  }
];

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

// Helper to scrape RSS/XML news feed as a robust fallback
async function fetchSuoiluRSS(): Promise<any[]> {
  const targetUrl = "https://suoilu.db.edu.vn/feed/";
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // Increased to 10s timeout

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36",
        "Accept": "text/xml,application/xml,application/rss+xml,application/atom+xml;q=0.9"
      },
      signal: controller.signal
    });
    
    clearTimeout(id);

    if (!response.ok) {
      console.log(`RSS Scraper received status ${response.status} from /feed/ - falling back to internal storage.`);
      return [];
    }

    const xmlText = await response.text();
    const $ = cheerio.load(xmlText, { xmlMode: true });
    const items: any[] = [];
    
    $("item").each((_, elem) => {
      const title = $(elem).find("title").first().text().trim();
      let link = $(elem).find("link").first().text().trim();
      if (!link) {
        // try regex fallback for link tags inside XML
        const htmlContent = $(elem).html() || "";
        const match = htmlContent.match(/<link>(.*?)<\/link>/);
        if (match) link = match[1].trim();
      }
      
      let pubDate = $(elem).find("pubDate").first().text().trim() || $(elem).find("pubdate").first().text().trim() || "";
      let dateText = "";
      if (pubDate) {
        try {
          const d = new Date(pubDate);
          if (!isNaN(d.getTime())) {
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            dateText = `${dd}/${mm}/${yyyy}`;
          }
        } catch {
          // ignore date parse err
        }
      }
      
      if (title && link) {
        // Try to draw a preview image out of desc or content:encoded
        let imageSrc = "";
        const desc = $(elem).find("description").first().text();
        const content = $(elem).find("content\\:encoded, encoded").first().text();
        
        const combined = desc + " " + content;
        const imgMatch = combined.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) {
          imageSrc = imgMatch[1];
        }
        
        items.push({ title, href: link, dateText, image: imageSrc });
      }
    });
    
    console.log(`Successfully scraped ${items.length} articles via RSS feed (/feed/)`);
    return items;
  } catch (err) {
    if ((err as any).name === 'AbortError') {
      console.log("RSS scraper timed out - Suoi Lu website might be slow or offline.");
    }
    return [];
  }
}

// Helper to scrape https://suoilu.db.edu.vn/ using cheerio (Dual-source: HTML + RSS XML feed)
async function fetchSuoiluNews(): Promise<any[]> {
  const targetUrl = "https://suoilu.db.edu.vn/";
  let candidates: any[] = [];

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 12000); // 12s timeout for main page

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

      // A. Look for standard layout nodes with text links and image elements
      $("article, .news-item, .post-item, .tin-tuc-item, .news-box, .post-block, .item-news, .views-row, .wp-block-post, .grid-item").each((_, elem) => {
        const aTag = $(elem).find("a").first();
        const href = aTag.attr("href");
        let title = aTag.text().trim() || $(elem).find(".title, .news-title, .post-title, h2, h3, h4").first().text().trim();
        let imageSrc = $(elem).find("img").first().attr("src");
        
        if (href && title && title.length > 15) {
          let dateText = "";
          const dateMatch = $(elem).text().match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
          if (dateMatch) {
            dateText = dateMatch[0];
          }
          candidates.push({ title, href, dateText, image: imageSrc });
        }
      });

      // B. If nothing is found under standard CSS layouts, scan all links that are longer than 18 chars
      if (candidates.length === 0) {
        $("a").each((_, elem) => {
          const href = $(elem).attr("href");
          const title = $(elem).text().trim();
          
          if (href && title && title.length > 20 && title.length < 160) {
            const lowerText = title.toLowerCase();
            const skipPatterns = [
              "trang chủ", "giới thiệu", "liên hệ", "đăng nhập", "xem thêm", "bản đồ",
              "sơ đồ", "thư viện", "góp ý", "điều khoản", "chính sách", "lịch công tác",
              "tài khoản", "quên mật khẩu", "hướng dẫn", "thông báo chung", "văn bản",
              "click", "bấm vào", "tải về", "đọc thêm", "chọn lớp", "tìm kiếm"
            ];
            
            if (!skipPatterns.some(p => lowerText.includes(p))) {
              let dateText = "";
              const parentContainer = $(elem).closest("div, li, p, td, tr");
              const parentText = parentContainer.text() || "";
              const dateMatch = parentText.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
              if (dateMatch) {
                dateText = dateMatch[0];
              }
              
              let imageSrc = parentContainer.find("img").first().attr("src");
              if (!imageSrc) {
                imageSrc = $(elem).siblings("img").first().attr("src") || $(elem).find("img").first().attr("src");
              }

              candidates.push({ title, href, dateText, image: imageSrc });
            }
          }
        });
      }
    } else {
      console.log(`Scraper received HTTP status ${response.status} from Suoi Lu home page - switching to RSS/Internal fallback.`);
    }
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      console.log("Main HTML scraper timed out - trying RSS fallback.");
    }
  }

  // C. Fallback to RSS/XML feed if direct HTML scraping returned 0 results
  if (candidates.length === 0) {
    candidates = await fetchSuoiluRSS();
  }

  // Final validation, relative link resolving, categorisation and deduplication
  const finalItems: any[] = [];
  const absoluteCheck = /^https?:\/\//i;
  const seenTitles = new Set<string>();

  for (const item of candidates) {
    let resolvedLink = item.href;
    if (!resolvedLink) continue;
    
    if (!absoluteCheck.test(resolvedLink)) {
      resolvedLink = resolvedLink.startsWith("/") 
        ? `https://suoilu.db.edu.vn${resolvedLink}` 
        : `https://suoilu.db.edu.vn/${resolvedLink}`;
    }

    const cleanTitle = item.title
      .replace(/\s+/g, " ")
      .replace(/^(●|►|»|-|\*)\s*/, "")
      .trim();

    if (cleanTitle.length > 18 && !seenTitles.has(cleanTitle)) {
      seenTitles.add(cleanTitle);

      // Category formatting
      let category = "TIN TRƯỜNG SUỐI LƯ";
      const titleLower = cleanTitle.toLowerCase();
      if (titleLower.includes("hội nghị") || titleLower.includes("đại hội")) {
        category = "SỰ KIỆN • ĐẠI HỘI CHI BỘ";
      } else if (titleLower.includes("phát động") || titleLower.includes("thi đua") || titleLower.includes("học sinh giỏi")) {
        category = "THI ĐUA KHEN THƯỞNG";
      } else if (titleLower.includes("tuyển sinh") || titleLower.includes("lớp 10") || titleLower.includes("lớp 6") || titleLower.includes("xét tốt nghiệp")) {
        category = "TUYỂN SINH • HỌC BẠ";
      } else if (titleLower.includes("chuyên đề") || titleLower.includes("ngoại khóa") || titleLower.includes("hoạt động")) {
        category = "CHUYÊN ĐỀ DẠY HỌC";
      } else if (titleLower.includes("thông báo") || titleLower.includes("kế hoạch")) {
        category = "THÔNG BÁO CHUNG";
      }

      // Date formatting
      let finalDate = item.dateText;
      if (!finalDate) {
        const mockDates = ["18/06/2026", "17/06/2026", "14/06/2026", "10/06/2026", "28/05/2026"];
        finalDate = mockDates[finalItems.length % mockDates.length];
      }

      // Image src resolving
      let finalImage = item.image;
      if (finalImage) {
        finalImage = finalImage.trim();
        if (!absoluteCheck.test(finalImage)) {
          finalImage = finalImage.startsWith("/")
            ? `https://suoilu.db.edu.vn${finalImage}`
            : `https://suoilu.db.edu.vn/${finalImage}`;
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
        source: "suoilu.db.edu.vn",
        image: finalImage
      });
    }

    if (finalItems.length >= 5) break;
  }

  return finalItems;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    if (!key) {
      return res.status(400).json({ status: "error", message: "Key parameter is required" });
    }
    const settings = readSettings();
    settings[key] = value || "";
    writeSettings(settings);
    res.json({ status: "success", data: { key, value } });
  });

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
    const now = Date.now();
    if (newsCache.length > 0 && (now - lastCacheTime < CACHE_DURATION)) {
      return res.json({ status: "success", source: "cache", data: newsCache });
    }

    const liveNews = await fetchSuoiluNews();
    if (liveNews && liveNews.length > 0) {
      newsCache = liveNews;
      lastCacheTime = now;
      return res.json({ status: "success", source: "scraped", data: newsCache });
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

  // Vite Integration context check
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";

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

// Helper to scrape https://suoilu.db.edu.vn/ using cheerio
async function fetchSuoiluNews(): Promise<any[]> {
  const targetUrl = "https://suoilu.db.edu.vn/";
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
      },
      signal: controller.signal
    });
    
    clearTimeout(id);

    if (!response.ok) {
      console.warn(`Scraper received bad HTTP status: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const candidates: any[] = [];

    // 1. Let's look for common layout nodes with text links and image elements
    $("article, .news-item, .post-item, .tin-tuc-item, .news-box, .post-block, .item-news, .views-row").each((_, elem) => {
      const aTag = $(elem).find("a").first();
      const href = aTag.attr("href");
      let title = aTag.text().trim() || $(elem).find(".title, .news-title, .post-title, h3, h4").first().text().trim();
      
      // Look for a nested image
      let imageSrc = $(elem).find("img").first().attr("src");
      
      if (href && title && title.length > 15) {
        // Try finding a date
        let dateText = "";
        const dateMatch = $(elem).text().match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
        if (dateMatch) {
          dateText = dateMatch[0];
        }
        candidates.push({ title, href, dateText, image: imageSrc });
      }
    });

    // 2. If nothing is found, scrape all regular <a> tags that look like news articles and trace nearby images
    if (candidates.length === 0) {
      $("a").each((_, elem) => {
        const href = $(elem).attr("href");
        const title = $(elem).text().trim();
        
        // Skip links that are definitely menus, footers, utilities
        if (href && title && title.length > 20 && title.length < 160) {
          const lowerText = title.toLowerCase();
          const skipPatterns = [
            "trang chủ", "giới thiệu", "liên hệ", "đăng nhập", "xem thêm", "bản đồ",
            "sơ đồ", "thư viện", "góp ý", "điều khoản", "chính sách", "lịch công tác",
            "tài khoản", "quên mật khẩu", "hướng dẫn", "thông báo chung", "văn bản",
            "click", "bấm vào", "tải về", "đọc thêm", "chọn lớp", "tìm kiếm"
          ];
          
          if (!skipPatterns.some(p => lowerText.includes(p))) {
            // Try to look around for a date
            let dateText = "";
            const parentContainer = $(elem).closest("div, li, p, td, tr");
            const parentText = parentContainer.text() || "";
            const dateMatch = parentText.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
            if (dateMatch) {
              dateText = dateMatch[0];
            }
            
            // Try finding any image inside the closest container parent block
            let imageSrc = parentContainer.find("img").first().attr("src");
            if (!imageSrc) {
              // try the immediate predecessor or grandchild image
              imageSrc = $(elem).siblings("img").first().attr("src") || $(elem).find("img").first().attr("src");
            }

            candidates.push({ title, href, dateText, image: imageSrc });
          }
        }
      });
    }

    // Clean up urls, resolve relative links and deduplicate
    const finalItems: any[] = [];
    const absoluteCheck = /^https?:\/\//i;
    const seenTitles = new Set<string>();

    for (const item of candidates) {
      let resolvedLink = item.href;
      if (!absoluteCheck.test(resolvedLink)) {
        // Relative URL conversion
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

        // Assign a default readable category
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

        // Format Date nicely
        let finalDate = item.dateText;
        if (!finalDate) {
          const mockDates = ["16/06/2026", "12/06/2026", "05/06/2026", "22/05/2026", "15/05/2026"];
          finalDate = mockDates[finalItems.length % mockDates.length];
        }

        // Resolve item image src to absolute
        let finalImage = item.image;
        if (finalImage) {
          finalImage = finalImage.trim();
          if (!absoluteCheck.test(finalImage)) {
            finalImage = finalImage.startsWith("/")
              ? `https://suoilu.db.edu.vn${finalImage}`
              : `https://suoilu.db.edu.vn/${finalImage}`;
          }
        } else {
          // If no image src crawled from school, supply the stunning context-aware image!
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

      // Keep up to 5 latest articles for performance and layouts
      if (finalItems.length >= 5) break;
    }

    return finalItems;
  } catch (error) {
    console.error("Scraper ran into an issue:", error);
    return [];
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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

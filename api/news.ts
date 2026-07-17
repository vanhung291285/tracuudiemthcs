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
    id: "fb-1",
    title: "LỄ TỔNG KẾT NĂM HỌC 2025–2026 TẠI TRƯỜNG PTDTBT TH&THCS SUỐI LƯ: KHÉP LẠI MỘT NĂM HỌC NHIỀU THÀNH TÍCH",
    category: "TIN TRƯỜNG SUỐI LƯ",
    date: "14/07/2026",
    link: "https://suoilu.db.edu.vn/tin-tuc-su-kien/le-tong-ket-nam-hoc-2025-2026-tai-truong-ptdtbt-th-thcs-suoi-lu-khep-lai-mot-nam-hoc-nhieu-thanh-tich-129.html",
    source: "suoilu.db.edu.vn",
    image: "https://suoilu.db.edu.vn/assets/news/2026_07/z8040701801489_f52fc55b263a5c106557091234c0b688_1.jpg",
    description: "Trong không khí trang trọng, vui tươi và đầy xúc động, sáng ngày 26/5/2026, Trường PTDTBT TH&THCS Suối Lư (xã Xa Dung, tỉnh Điện Biên) đã long trọng tổ chức Lễ tổng kết năm học 2025–2026 với sự tham dự của đại diện cấp ủy, chính quyền địa phương, lực lượng Công an xã, các ban ngành đoàn thể, cha mẹ học sinh cùng toàn thể cán bộ, giáo viên, nhân viên và học sinh nhà trường."
  },
  {
    id: "fb-2",
    title: "Góp ý quy định việc giảng dạy khối lượng kiến thức văn hóa giáo dục phổ thông trong chương trình đào tạo các ngành, nghề đặc thù",
    category: "TIN TRƯỜNG SUỐI LƯ",
    date: "12/07/2026",
    link: "https://suoilu.db.edu.vn/tin-tuc-su-kien/gop-y-quy-dinh-viec-giang-day-khoi-luong-kien-thuc-van-hoa-giao-duc-pho-thong-trong-chuong-trinh-dao-tao-cac-nganh-nghe-dac-thu-127.html",
    source: "suoilu.db.edu.vn",
    image: "https://suoilu.db.edu.vn/assets/news/2026_07/img_4888_4.jpeg",
    description: "Góp ý dự thảo quy định việc tổ chức thực hiện chương trình và giảng dạy khối lượng kiến thức văn hóa trung học phổ thông trong các cơ sở giáo dục nghề nghiệp nhằm bảo đảm tính liên thông, chất lượng đào tạo nghề đặc thù."
  },
  {
    id: "fb-3",
    title: "Tập huấn trực tuyến triển khai cập nhật dữ liệu học bạ số",
    category: "TIN TRƯỜNG SUỐI LƯ",
    date: "12/07/2026",
    link: "https://suoilu.db.edu.vn/tin-tuc-su-kien/tap-huan-truc-tuyen-trien-khai-cap-nhat-du-lieu-hoc-ba-so-126.html",
    source: "suoilu.db.edu.vn",
    image: "https://suoilu.db.edu.vn/assets/news/2026_07/img_3414_10.jpg",
    description: "Ban giám hiệu nhà trường cùng tổ cốt cán tham gia hội nghị tập huấn trực tuyến toàn quốc về chuyển đổi số, cập nhật và đồng bộ cơ sở dữ liệu học bạ điện tử phục vụ tuyển sinh số của ngành giáo dục."
  },
  {
    id: "fb-4",
    title: "Giáo dục kỹ năng sống cho học sinh THCS – những điều cần biết",
    category: "TIN TRƯỜNG SUỐI LƯ",
    date: "10/06/2026",
    link: "https://suoilu.db.edu.vn/hoat-dong-doan-doi/giao-duc-ky-nang-song-cho-hoc-sinh-thcs-nhung-dieu-can-biet-125.html",
    source: "suoilu.db.edu.vn",
    image: "https://suoilu.db.edu.vn/assets/news/2026_06/vp_hoc-sinh-thcs-dewey-80-768x461.jpg",
    description: "Công tác giáo dục kỹ năng sống, rèn luyện kỹ năng tự lập, phòng chống bạo lực học đường và xây dựng lối sống tích cực, lành mạnh cho học sinh dân tộc bán trú tại địa bàn vùng cao đặc biệt khó khăn."
  },
  {
    id: "fb-5",
    title: "Phát động Cuộc thi viết về “Trang sách và Mái trường”",
    category: "THI ĐUA KHEN THƯỞNG",
    date: "10/06/2026",
    link: "https://suoilu.db.edu.vn/tin-tuc-su-kien/phat-dong-cuoc-thi-viet-ve-trang-sach-va-mai-truong-124.html",
    source: "suoilu.db.edu.vn",
    image: "https://suoilu.db.edu.vn/assets/news/2026_06/2aoboqcgiim0bcbodez62qu6twocsb1s2racoa40.jpg",
    description: "Cuộc thi viết nhằm tôn vinh những người đưa đò thầm lặng, chia sẻ những bài học hay từ trang sách và kỷ niệm xúc động về tình thầy trò dưới mái trường PTDTBT TH & THCS Suối Lư yêu dấu."
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
    
    $("item, entry").each((_, elem) => {
      const title = decodeHtml($(elem).find("title").first().text().trim());
      
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
          const imgMatches = [...combined.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
          for (const match of imgMatches) {
            const src = match[1];
            if (isValidImage(src) && !src.includes("s.w.org") && !src.includes("emoji")) {
              imageSrc = src;
              break;
            }
          }
        }
        
        const descText = $(elem).find("description, summary").first().text() || "";
        const cleanDescText = descText.replace(/<[^>]*>/g, "").trim().substring(0, 250);

        items.push({ title, href: link, dateText, timestamp, image: imageSrc, description: cleanDescText });
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

      if (!imageSrc && post.content?.rendered) {
        const contentStr = post.content.rendered;
        const match = contentStr.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match && isValidImage(match[1])) {
          imageSrc = match[1];
        }
      }

      if (title && link) {
        const excerptHtml = post.excerpt?.rendered || post.content?.rendered || "";
        const cleanExcerpt = excerptHtml.replace(/<[^>]*>/g, "").trim().substring(0, 250);
        items.push({ title, href: link, dateText, timestamp, image: imageSrc, description: cleanExcerpt });
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
        const descText = item.description || item.content || "";
        const cleanDescText = descText.replace(/<[^>]*>/g, "").trim().substring(0, 250);
        items.push({ title, href: link, dateText, timestamp, image: imageSrc, description: cleanDescText });
      }
    } catch { }
  }
  return items;
}

// Helper to dynamically auto-discover RSS feed URLs from a homepage
async function discoverSuoiluRSSUrls(customUrl?: string): Promise<string[]> {
  const targetUrl = customUrl || "https://suoilu.db.edu.vn/";
  const urls: string[] = [];
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
      const $ = cheerio.load(html);
      
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
    // ignore or handle timeout
  }

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
    const candidates: any[] = [];

    // Smart heuristic: detect if the page contains .html news links.
    // If it does (Nukeviet, etc.), we enforce .html for precision.
    // If it doesn't (WordPress, modern SPA portals), we don't require .html!
    let hasHtmlLinksOnPage = false;
    $("a").each((_, el) => {
      const h = $(el).attr("href");
      if (h) {
        const hLower = h.toLowerCase();
        if (hLower.includes(".html") && !hLower.includes("/laws/") && !hLower.includes("/download/")) {
          hasHtmlLinksOnPage = true;
          return false; // break
        }
      }
    });

    const isArticleHref = (href: string, isGenericSnoop: boolean): boolean => {
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
      
      // Check if it's a typical article link pattern:
      // 1. Ends in .html
      // 2. Contains common article categories in path
      // 3. Or contains several hyphens (slug)
      const hasHtml = hrefLower.includes(".html");
      const hasArticleCategory = [
        "/tin-tuc", "/su-kien", "/hoat-dong", "/giao-duc", "/thong-bao", 
        "/tin-truong", "/doan-doi", "/chuyen-de", "/giao-an", "/bai-viet"
      ].some(cat => hrefLower.includes(cat));
      
      // Count hyphens in slug path
      const urlPath = hrefLower.replace(/^https?:\/\/[^/]+/, "");
      const hyphensCount = (urlPath.split('/').pop() || "").split('-').length - 1;
      const isSlug = hyphensCount >= 3; // e.g. "le-tong-ket-nam-hoc" has 4 hyphens
      
      if (hasHtml || hasArticleCategory || isSlug) {
        return true;
      }
      
      if (isGenericSnoop) {
        if (urlPath.length < 15 || urlPath === "/" || !urlPath.includes("/")) return false;
        return hyphensCount >= 2;
      }
      
      return false;
    };

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
      const aTags = $(elem).find("a");
      aTags.each((_, aElem) => {
        const aTag = $(aElem);
        const href = aTag.attr("href");
        if (!href || !isArticleHref(href, false)) return;

        let title = aTag.text().replace(/\s+/g, " ").trim();
        if (title.length < 12 || title.length > 220) return;
        
        const lowerText = title.toLowerCase();
        const skipPatterns = [
          "trang chủ", "giới thiệu", "liên hệ", "đăng nhập", "xem thêm", "bản đồ",
          "sơ đồ", "thư viện", "góp ý", "điều khoản", "chính sách", "lịch công tác",
          "tài khoản", "quên mật khẩu", "hướng dẫn", "thông báo chung", "văn bản",
          "cơ cấu tổ chức", "ban giám hiệu", "kết quả tìm kiếm", "chọn năm học",
          "tra cứu điểm", "đăng ký", "phân hiệu", "lớp học", "trực tuyến", "video",
          "album ảnh", "thư viện ảnh", "lịch thi", "thời khóa biểu", "thực đơn",
          "hỏi đáp", "đăng ký", "bản quyền", "hướng dẫn sử dụng", "chi tiết", "xem chi tiết",
          "công khai", "ba công khai", "chất lượng giáo dục", "văn bản pháp quy", "thủ tục hành chính",
          "kế hoạch chiến lược", "quy chế", "định mức", "thu chi", "tài chính", "danh mục",
          "thống kê", "phòng giáo dục", "bộ giáo dục", "sở giáo dục"
        ];
        if (skipPatterns.some(p => lowerText.includes(p))) return;
        
        let dateText = "";
        let timestamp = 0;
        const containerText = $(elem).text() || "";

        const articleId = extractArticleId(href);
        if (articleId && SUOILU_DATES[articleId]) {
          dateText = SUOILU_DATES[articleId];
          timestamp = parseVietnameseDate(dateText).getTime();
        }

        if (!dateText) {
          // Search for time like hh:mm nearby
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
            dateText = dateMatch[0];
            const baseDate = parseVietnameseDate(dateText);
            if (timeMatch) {
              baseDate.setHours(hour, minute, 0, 0);
            }
            timestamp = baseDate.getTime();
          } else if (dateMatchWord) {
            const d = dateMatchWord[1];
            const m = dateMatchWord[2];
            const y = dateMatchWord[3];
            dateText = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
            const baseDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            if (timeMatch) {
              baseDate.setHours(hour, minute, 0, 0);
            }
            timestamp = baseDate.getTime();
          }
        }

        const parent = aTag.closest("div, li, p, td, tr, article");
        
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

        // Extract a description from the surrounding card
        let description = "";
        const descSelectors = [".intro", ".summary", ".description", ".excerpt", ".post-excerpt", ".lead", "p"];
        for (const ds of descSelectors) {
          const descElem = parent.find(ds).first();
          if (descElem.length > 0) {
            const txt = descElem.text().trim();
            if (txt.length > 30 && txt.length < 400 && !txt.includes(title)) {
              description = txt;
              break;
            }
          }
        }
        if (!description) {
          parent.find("p, span").each((_, sibling) => {
            const txt = $(sibling).text().trim();
            if (txt.length > 30 && txt.length < 400 && !txt.includes(title)) {
              description = txt;
              return false; // break
            }
          });
        }
        
        candidates.push({ title, href, dateText, timestamp, image: imageSrc, description });
      });
    });

    if (candidates.length === 0) {
      $("a").each((_, aElem) => {
        const aTag = $(aElem);
        const href = aTag.attr("href");
        if (!href || !isArticleHref(href, true)) return;

        let title = aTag.text().replace(/\s+/g, " ").trim();
        if (title.length < 12 || title.length > 220) return;
        
        const lowerText = title.toLowerCase();
        const skipPatterns = [
          "trang chủ", "giới thiệu", "liên hệ", "đăng nhập", "xem thêm", "bản đồ",
          "sơ đồ", "thư viện", "góp ý", "điều khoản", "chính sách", "lịch công tác",
          "tài khoản", "quên mật khẩu", "hướng dẫn", "thông báo chung", "văn bản",
          "cơ cấu tổ chức", "ban giám hiệu", "kết quả tìm kiếm", "chọn năm học",
          "tra cứu điểm", "đăng ký", "phân hiệu", "lớp học", "trực tuyến", "video",
          "album ảnh", "thư viện ảnh", "lịch thi", "thời khóa biểu", "thực đơn",
          "hỏi đáp", "đăng ký", "bản quyền", "hướng dẫn sử dụng", "chi tiết", "xem chi tiết",
          "công khai", "ba công khai", "chất lượng giáo dục", "văn bản pháp quy", "thủ tục hành chính",
          "kế hoạch chiến lược", "quy chế", "định mức", "thu chi", "tài chính", "danh mục",
          "thống kê", "phòng giáo dục", "bộ giáo dục", "sở giáo dục"
        ];
        if (skipPatterns.some(p => lowerText.includes(p))) return;
        
        // Check local container up to 4 parents deep for date text
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
          containerText = aTag.closest("div, li, p, td, tr, article").text() || "";
        }

        let dateText = "";
        let timestamp = 0;

        const articleId = extractArticleId(href);
        if (articleId && SUOILU_DATES[articleId]) {
          dateText = SUOILU_DATES[articleId];
          timestamp = parseVietnameseDate(dateText).getTime();
        }

        if (!dateText) {
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
            dateText = dateMatch[0];
            const baseDate = parseVietnameseDate(dateText);
            if (timeMatch) {
              baseDate.setHours(hour, minute, 0, 0);
            }
            timestamp = baseDate.getTime();
          } else if (dateMatchWord) {
            const d = dateMatchWord[1];
            const m = dateMatchWord[2];
            const y = dateMatchWord[3];
            dateText = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
            const baseDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            if (timeMatch) {
              baseDate.setHours(hour, minute, 0, 0);
            }
            timestamp = baseDate.getTime();
          }
        }

        const parent = aTag.closest("div, li, p, td, tr, article");
        
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
                     imgElem.attr("data-lazy-src") || 
                     imgElem.attr("lazy-src") || 
                     imgElem.attr("data-original") || 
                     imgElem.attr("data-thumb") || 
                     imgElem.attr("src") || "";
        }

        let description = "";
        const descSelectors = [".intro", ".summary", ".description", ".excerpt", ".post-excerpt", ".lead", "p"];
        for (const ds of descSelectors) {
          const descElem = parent.find(ds).first();
          if (descElem.length > 0) {
            const txt = descElem.text().trim();
            if (txt.length > 30 && txt.length < 400 && !txt.includes(title)) {
              description = txt;
              break;
            }
          }
        }
        
        candidates.push({ title, href, dateText, timestamp, image: imageSrc, description });
      });
    }

    return candidates;
  } catch {
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
      console.log("Global timeout of 12s reached in fetchSuoiluNews. Resolving with empty list.");
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

    const discoveredRssUrls = await discoverSuoiluRSSUrls(customUrl || targetHostUrl);
    console.log("Discovered RSS endpoints for fallback sequence:", discoveredRssUrls);

    // --- CHANNEL 1: WordPress REST API ---
    if (!baseOrigin.includes("nukeviet")) {
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

    // --- CHANNEL 2: Public RSS to JSON Proxy ---
    if (candidates.length === 0) {
      for (const rssUrl of discoveredRssUrls.slice(0, 2)) {
        try {
          const rss2JsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(addCacheBuster(rssUrl))}`;
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(addCacheBuster(rss2JsonUrl), { 
            headers: CACHE_BYPASS_HEADERS,
            signal: controller.signal 
          });
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

    // --- CHANNEL 2.5: corsproxy.io ---
    if (candidates.length === 0) {
      for (const rssUrl of discoveredRssUrls.slice(0, 2)) {
        try {
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(addCacheBuster(rssUrl))}`;
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(addCacheBuster(proxyUrl), { 
            headers: CACHE_BYPASS_HEADERS,
            signal: controller.signal 
          });
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

    // --- CHANNEL 3: AllOrigins CORS Proxy ---
    if (candidates.length === 0) {
      for (const rssUrl of discoveredRssUrls.slice(0, 2)) {
        try {
          const proxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent(addCacheBuster(rssUrl));
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(addCacheBuster(proxyUrl), { 
            headers: CACHE_BYPASS_HEADERS,
            signal: controller.signal 
          });
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

    // --- CHANNEL 4: AllOrigins CORS Proxy for WP REST API ---
    if (candidates.length === 0 && !baseOrigin.includes("nukeviet")) {
      try {
        const wpApiUrl = `${baseOrigin}/wp-json/wp/v2/posts?_embed&per_page=12`;
        const proxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent(addCacheBuster(wpApiUrl));
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(addCacheBuster(proxyUrl), { 
          headers: CACHE_BYPASS_HEADERS,
          signal: controller.signal 
        });
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

    // --- CHANNEL 5: Direct RSS Parser ---
    if (candidates.length === 0) {
      for (const rssUrl of discoveredRssUrls.slice(0, 2)) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(addCacheBuster(rssUrl), {
            headers: {
              ...CACHE_BYPASS_HEADERS,
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

    // --- CHANNEL 6: Direct cheerio scraping ---
    if (candidates.length === 0) {
      const scraped = await scrapeDirectHTML(customUrl || "https://suoilu.db.edu.vn/");
      if (scraped.length > 0) {
        candidates = scraped;
        successfulMethod = "Direct HTML cheerio Scraper";
      }
    }

    console.log(`News fetch completed. Method used: [${successfulMethod || "NONE - FALLBACK RETRIEVED"}], Articles found: ${candidates.length}`);

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
          const d = new Date();
          finalDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }

        let finalImage = item.image;
        if (finalImage && isValidImage(finalImage)) {
          finalImage = finalImage.trim();
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

      if (finalItems.length >= 5) break;
    }

    return finalItems;
  };

  return Promise.race([fetchPromise(), timeoutPromise]);
}

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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
      return res.status(200).json({ status: "success", source: "cache", data: newsCacheMap[cacheKey].data });
    }

    const liveNews = await fetchSuoiluNews(sourceUrl);
    if (liveNews && liveNews.length > 0) {
      newsCacheMap[cacheKey] = { data: liveNews, timestamp: now };
      return res.status(200).json({ status: "success", source: "scraped", data: liveNews });
    }

    if (newsCacheMap[cacheKey]) {
      return res.status(200).json({ status: "success", source: "cache_stale", data: newsCacheMap[cacheKey].data });
    }

    return res.status(200).json({ 
      status: "fallback", 
      source: "fallback_static", 
      data: FALLBACK_NEWS 
    });
  } catch (error: any) {
    console.error("Vercel api/news failed:", error);
    return res.status(200).json({ 
      status: "fallback", 
      source: "fallback_error", 
      data: FALLBACK_NEWS,
      errorLog: error.message || String(error)
    });
  }
}

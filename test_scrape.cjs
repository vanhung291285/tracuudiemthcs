const cheerio = require("cheerio");

async function test() {
  try {
    const res = await fetch("https://suoilu.db.edu.vn/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36"
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Let's implement the exact isArticleHref and parsing logic from news.ts
    const isArticleHref = (href) => {
      if (!href) return false;
      const hrefLower = href.toLowerCase();
      
      const ignoreWords = [
        "/laws/", "/download/", "/category/", "/tag/", "javascript:", "mailto:", "tel:", "#",
        "uploads/", "/themes/", "/js/", "/css/", "/assets/", "/uploads/", "facebook.com", "zalo.me",
        "/about", "/contact", "/search", "/rss", "/feed", "/sitemap", "/user/", "/login", "/register",
        "/admin", "/cart", "/checkout", "/product", "/shop"
      ];
      if (ignoreWords.some(word => hrefLower.includes(word))) return false;
      
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
        return hasHtml && (hasArticleCategory || isSlug);
      }
      return hasHtml || hasArticleCategory || isSlug;
    };

    const articleMap = new Map();
    const isValidImage = (src) => {
      return src && !src.includes("logo") && !src.includes("icon") && !src.includes("banner");
    };

    const extractArticleId = (url) => {
      if (!url) return null;
      const match = url.match(/-(\d+)\.html/);
      return match ? match[1] : null;
    };

    $("a").each((_, aElem) => {
      const aTag = $(aElem);
      const href = aTag.attr("href");
      if (!href || !isArticleHref(href)) return;

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

      const text = aTag.text().replace(/\s+/g, " ").trim();
      if (text.length >= 10 && text.length <= 250) {
        const skip = ["trang chủ", "giới thiệu", "liên hệ", "đăng nhập", "xem thêm", "bản đồ", "video", "album", "góp ý", "thư viện", "chọn năm học"];
        if (!skip.some(s => text.toLowerCase().includes(s))) {
          if (!existing.title || text.length > existing.title.length) {
            existing.title = text;
          }
        }
      }

      const imgInside = aTag.find("img").first();
      if (imgInside.length > 0) {
        const src = imgInside.attr("data-src") || imgInside.attr("src") || imgInside.attr("data-original") || "";
        if (src && isValidImage(src)) {
          existing.image = src;
        }
      }

      const parent = aTag.closest("div, li, p, td, tr, article, .block_news, .tms_bg_news");
      if (parent.length > 0) {
        if (!existing.image) {
          const imgNear = parent.find("img").first();
          if (imgNear.length > 0) {
            const src = imgNear.attr("data-src") || imgNear.attr("src") || imgNear.attr("data-original") || "";
            if (src && isValidImage(src)) {
              existing.image = src;
            }
          }
        }

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
                return false;
              }
            });
          }
          if (description) {
            existing.description = description;
          }
        }

        if (!existing.dateText) {
          const articleId = extractArticleId(normHref);
          if (articleId && false) { // disable fallback dates check here
          } else {
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
            } else if (dateMatchWord) {
              const d = dateMatchWord[1];
              const m = dateMatchWord[2];
              const y = dateMatchWord[3];
              existing.dateText = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
            }
          }
        }
      }
    });

    const list = Array.from(articleMap.values()).filter(item => item.title && item.href);
    console.log("Found total items:", list.length);
    console.log("Articles sorted or raw:");
    console.log(JSON.stringify(list.slice(0, 10), null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();

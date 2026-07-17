const cheerio = require('cheerio');

async function test() {
  const targetUrl = "https://suoilu.db.edu.vn/";
  console.log("Fetching", targetUrl);
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/437.36"
      }
    });
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("HTML length:", html.length);
    const $ = cheerio.load(html);
    
    console.log("--- RSS Links ---");
    $('link[type="application/rss+xml"], link[type="application/atom+xml"]').each((_, el) => {
      console.log($(el).attr('href'));
    });

    console.log("--- Some a tags (first 100) ---");
    let count = 0;
    $('a').each((_, el) => {
      if (count++ > 150) return;
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      const parentClass = $(el).parent().attr('class') || '';
      const grandparentClass = $(el).parent().parent().attr('class') || '';
      if (href && (href.includes('.html') || text.length > 15)) {
        console.log(`href: ${href} | text: ${text} | pClass: ${parentClass} | gpClass: ${grandparentClass}`);
      }
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

test();

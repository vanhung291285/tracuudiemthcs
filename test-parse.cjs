const cheerio = require('cheerio');

async function run() {
  const res = await fetch("https://suoilu.db.edu.vn/");
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // Find links containing "130.html" or "129.html"
  const links = $('a[href*="130.html"], a[href*="129.html"]');
  console.log("Found", links.length, "matching links");
  
  links.each((i, el) => {
    console.log(`\n--- Link ${i+1} ---`);
    console.log("href:", $(el).attr('href'));
    console.log("text:", $(el).text().trim());
    console.log("Parent HTML:", $(el).parent().html().substring(0, 300));
    console.log("Grandparent HTML:", $(el).parent().parent().html().substring(0, 500));
  });
}

run();

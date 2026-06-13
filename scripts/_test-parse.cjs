const https = require("https");
https.get("https://searxng.paradigmjp.com/search?q=Google+Analytics+JP&format=json&pageno=1&language=ja", (res) => {
  let body = "";
  res.on("data", d => body += d);
  res.on("end", () => {
    const data = JSON.parse(body);
    console.log("Total results:", data.results?.length);
    if (data.results) {
      // Simulate resultFromRow for first 3
      for (let i = 0; i < Math.min(3, data.results.length); i++) {
        const row = data.results[i];
        const url = String(row.url || "");
        try {
          const parsed = new URL(url);
          const domain = parsed.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
          const blocked = ["www.google.", "www.bing."].some(p => domain.includes(p));
          console.log(`[${i}] ${domain} blocked=${blocked} valid=${domain.includes(".")}`);
        } catch(e) {
          console.log(`[${i}] URL parse failed: ${url.slice(0,50)} - ${e.message}`);
        }
      }
    }
  });
}).on("error", e => console.error(e.message));

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

async function scrapeVidSrc(tmdbId: string, type: 'movie' | 'tv' = 'movie', season = 1, ep = 1) {
  try {
    const url = type === 'movie' 
      ? `https://vidsrc.to/embed/movie/${tmdbId}`
      : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${ep}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://vidsrc.to/"
      }
    });
    
    const html = await res.text();
    const match = html.match(/data-id="([^"]+)"/);
    if (!match) return null;
    const dataId = match[1];

    const apiRes = await fetch(`https://vidsrc.to/ajax/embed/source/${dataId}`, {
       headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": url
       }
    });
    
    // Tambahin : any biar TypeScript nggak protes
    const apiData: any = await apiRes.json();
    
    if (!apiData.result || !apiData.result.url) return null;
    
    const m3u8Url = Buffer.from(apiData.result.url, 'base64').toString('utf-8');
    return m3u8Url;

  } catch (e) {
    console.error("VidSrc Error:", e);
    return null;
  }
}

app.get('/v1/movies/:id', async (req, res) => {
  const tmdbId = req.params.id;
  const m3u8 = await scrapeVidSrc(tmdbId, 'movie');
  
  if (!m3u8) {
    return res.status(404).json({ error: "No sources found", provider: "VidSrc" });
  }

  res.json({
    sources: [{ url: m3u8, quality: "1080p", provider: "VidSrc" }]
  });
});

export default app;

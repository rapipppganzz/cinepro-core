import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

// --- PROVIDER VIDSRC (Bawaan CinePro) ---
// Kita nembak API internal VidSrc langsung
async function scrapeVidSrc(tmdbId: string, type: 'movie' | 'tv' = 'movie', season = 1, ep = 1) {
  try {
    const url = type === 'movie' 
      ? `https://vidsrc.to/embed/movie/${tmdbId}`
      : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${ep}`;

    // 1. Ambil halaman HTML VidSrc
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://vidsrc.to/"
      }
    });
    
    const html = await res.text();

    // 2. Ekstrak ID data (VidSrc suka sembunyiin ID di data-attribute)
    const match = html.match(/data-id="([^"]+)"/);
    if (!match) return null;
    const dataId = match[1];

    // 3. Tembak API internal VidSrc buat dapetin link .m3u8
    const apiRes = await fetch(`https://vidsrc.to/ajax/embed/source/${dataId}`, {
       headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": url
       }
    });
    const apiData = await apiRes.json();
    
    if (!apiData.result || !apiData.result.url) return null;
    
    // 4. Decode link (VidSrc suka nge-encode link-nya pakai base64)
    const m3u8Url = Buffer.from(apiData.result.url, 'base64').toString('utf-8');
    return m3u8Url;

  } catch (e) {
    console.error("VidSrc Error:", e);
    return null;
  }
}

// --- ROUTE API ---
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

app.get('/v1/tv/:id/seasons/:s/episodes/:e', async (req, res) => {
  const { id, s, e } = req.params;
  const m3u8 = await scrapeVidSrc(id, 'tv', parseInt(s), parseInt(e));
  
  if (!m3u8) {
    return res.status(404).json({ error: "No sources found", provider: "VidSrc" });
  }

  res.json({
    sources: [{ url: m3u8, quality: "1080p", provider: "VidSrc" }]
  });
});

// Export buat Vercel
export default app;

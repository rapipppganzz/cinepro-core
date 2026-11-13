import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

// --- FUNGSI BANTUAN ---
function extractM3u8(html: string): string | null {
  // Cari link m3u8 di dalam HTML
  const match = html.match(/(https?:\/\/[^"']+\.m3u8[^"']*)/);
  return match ? match[1] : null;
}

// --- PROVIDER 1: VixSrc ---
async function scrapeVixSrc(tmdbId: string, type: 'movie' | 'tv' = 'movie', season = 1, ep = 1) {
  try {
    const url = type === 'movie' 
      ? `https://vixsrc.to/movie/${tmdbId}`
      : `https://vixsrc.to/tv/${tmdbId}/${season}/${ep}`;
      
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const html = await res.text();
    return extractM3u8(html);
  } catch (e) { return null; }
}

// --- PROVIDER 2: VidLink ---
async function scrapeVidLink(tmdbId: string, type: 'movie' | 'tv' = 'movie', season = 1, ep = 1) {
  try {
    const url = type === 'movie' 
      ? `https://vidlink.pro/api/b/movie/${tmdbId}`
      : `https://vidlink.pro/api/b/tv/${tmdbId}/${season}/${ep}`;
      
    const res = await fetch(url, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://vidlink.pro/"
      }
    });
    const data: any = await res.json();
    // VidLink biasanya ngasih balik JSON { source: "url.m3u8" }
    if (data && data.source) return data.source;
    return extractM3u8(JSON.stringify(data));
  } catch (e) { return null; }
}

// --- PROVIDER 3: VidSrc ---
async function scrapeVidSrc(tmdbId: string, type: 'movie' | 'tv' = 'movie', season = 1, ep = 1) {
  try {
    const url = type === 'movie' 
      ? `https://vidsrc.to/embed/movie/${tmdbId}`
      : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${ep}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": "https://vidsrc.to/" }
    });
    const html = await res.text();
    return extractM3u8(html);
  } catch (e) { return null; }
}

// --- ROUTE API ---
app.get('/v1/movies/:id', async (req, res) => {
  const tmdbId = req.params.id;
  
  console.log(`[API] Mencari link untuk Movie ID: ${tmdbId}`);

  // Coba satu-satu
  let m3u8 = await scrapeVixSrc(tmdbId, 'movie');
  let provider = 'VixSrc';

  if (!m3u8) {
    m3u8 = await scrapeVidLink(tmdbId, 'movie');
    provider = 'VidLink';
  }
  if (!m3u8) {
    m3u8 = await scrapeVidSrc(tmdbId, 'movie');
    provider = 'VidSrc';
  }
  
  if (!m3u8) {
    return res.status(404).json({ error: "Semua provider gagal", checked: ["VixSrc", "VidLink", "VidSrc"] });
  }

  res.json({
    sources: [{ url: m3u8, quality: "Auto", provider: provider }]
  });
});

export default app;

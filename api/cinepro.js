export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "TMDB ID required" });

  try {
    // 1. Tembak API CinePro yang ada di Vercel lu
    // (Anggap CinePro lu jalan di /v1/movies/...)
    const cineproUrl = `https://cinepro-core-phi.vercel.app/v1/movies/${id}`;
    
    // 2. Tembak pakai headers browser
    const response = await fetch(cineproUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://cinepro.cc/"
      }
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

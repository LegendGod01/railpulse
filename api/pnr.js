export default async function handler(req, res) {
  const key = process.env.RAPIDAPI_KEY || "26a4b0b475msh19ec367a28a5999p1c0f0cjsn5bdd2a32d2fc";

  const { pnr } = req.query;
  if (!pnr) return res.status(400).json({ error: "Missing PNR number" });

  const host = "irctc-indian-railway-pnr-status.p.rapidapi.com";
  const url = `https://${host}/getPNRStatus/${pnr}`;

  try {
    const upstream = await fetch(url, {
      headers: { "x-rapidapi-key": key, "x-rapidapi-host": host },
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(body);
  } catch (error) {
    return res.status(502).json({ error: `RapidAPI request failed: ${error.message}` });
  }
}

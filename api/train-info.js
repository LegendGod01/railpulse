export default async function handler(req, res) {
  const key = process.env.RAILRADAR_KEY || "rg_8949916f4dce412c907825db35789d7f";

  const { train } = req.query;
  if (!train) return res.status(400).json({ error: "Missing train number" });

  const url = `https://api.railradar.in/v1/trains/${train}?haltsOnly=true`;

  try {
    const upstream = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(body);
  } catch (error) {
    return res.status(502).json({ error: `RailRadar request failed: ${error.message}` });
  }
}

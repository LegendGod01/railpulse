import { configure, getAvailability, fareLookup, searchTrains } from "railkit";

export default async function handler(req, res) {
  const key = process.env.RAILKIT_KEY || "railkit_1aa8673844c151bdcb5fe3649a97ad4afda29d802f38fee7";
  configure(key);

  const { action, train, from, to, date, cls, quota } = req.query;

  try {
    if (action === "seats") {
      const data = await getAvailability(train, from, to, date, cls, quota || "GN");
      return res.status(200).json(data);
    } 
    
    if (action === "fare") {
      const data = await fareLookup(train, from, to, cls, quota || "GN");
      return res.status(200).json(data);
    }

    if (action === "search") {
      // RailKit search function
      const data = await searchTrains(from, to);
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    // Log full detail server-side; return message so the client can show a real reason
    console.error("RailKit error:", error);
    return res.status(500).json({ error: error.message || "RailKit request failed" });
  }
}

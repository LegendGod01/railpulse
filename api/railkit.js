import { configure, getAvailability, fareLookup } from "railkit";

export default async function handler(req, res) {
  // Configure RailKit API Key
  configure("railkit_1aa8673844c151bdcb5fe3649a97ad4afda29d802f38fee7");

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

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

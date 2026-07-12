import { configure, getAvailability, fareLookup, searchTrainBetweenStations } from "railkit";

export default async function handler(req, res) {
  const key = process.env.RAILKIT_KEY || "railkit_1aa8673844c151bdcb5fe3649a97ad4afda29d802f38fee7";
  configure(key);

  const { action, train, from, to, date, cls, quota } = req.query;

  try {
    let data;

    if (action === "seats") {
      // getAvailability(trainNo, fromStnCode, toStnCode, date, coach, quota)
      data = await getAvailability(train, from, to, date, cls, quota || "GN");
    } else if (action === "fare") {
      // fareLookup(trainNo, fromStnCode, toStnCode, date, travelClass, quota)
      data = await fareLookup(train, from, to, date, cls, quota || "GN");
    } else if (action === "search") {
      // searchTrainBetweenStations(from, to, date?)
      data = await searchTrainBetweenStations(from, to, date);
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    // RailKit resolves (doesn't throw) with { success: false, message } on API-level errors
    if (data && data.success === false) {
      return res.status(502).json({ error: data.message || "RailKit request failed" });
    }

    return res.status(200).json(data);
  } catch (error) {
    // Log full detail server-side; return message so the client can show a real reason
    console.error("RailKit error:", error);
    return res.status(500).json({ error: error.message || "RailKit request failed" });
  }
}

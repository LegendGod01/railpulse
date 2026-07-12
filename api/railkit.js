export default async function handler(req, res) {
  const { action, train, from, to, date, cls, quota } = req.query;

  let railkit;
  try {
    railkit = await import("railkit");
  } catch (error) {
    console.error("Failed to load railkit package:", error);
    return res.status(500).json({ error: `Could not load railkit package: ${error.message}` });
  }

  const { configure, getAvailability, fareLookup, searchTrainBetweenStations } = railkit;

  // Defensive check: if the package's real exports don't match what we expect,
  // report exactly what IS available instead of crashing.
  const missing = [];
  if (typeof configure !== "function") missing.push("configure");
  if (action === "seats" && typeof getAvailability !== "function") missing.push("getAvailability");
  if (action === "fare" && typeof fareLookup !== "function") missing.push("fareLookup");
  if (action === "search" && typeof searchTrainBetweenStations !== "function") missing.push("searchTrainBetweenStations");

  if (missing.length) {
    return res.status(500).json({
      error: `railkit package is missing expected export(s): ${missing.join(", ")}`,
      actualExports: Object.keys(railkit),
    });
  }

  try {
    const key = process.env.RAILKIT_KEY || "railkit_1aa8673844c151bdcb5fe3649a97ad4afda29d802f38fee7";
    configure(key);

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
    console.error("RailKit error:", error);
    return res.status(500).json({ error: error.message || "RailKit request failed", stack: error.stack });
  }
}

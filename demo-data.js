/* ============================================================
   Demo data — used when no RapidAPI key is configured, or as a
   graceful fallback if a request fails. Shapes mirror the
   normalized objects produced by api.js.
   ============================================================ */

const DEMO = {
  /* ---- Live train status (normalized shape) ---- */
  liveStatus: {
    trainNumber: "12951",
    trainName: "Mumbai Rajdhani Express",
    source: "MMCT", destination: "NDLS",
    delayMinutes: 12,
    statusText: "Departed BRC · Running late by 12 min",
    currentStationCode: "BRC",
    totalDistance: 1386,
    distanceCovered: 392,
    etaFinal: "08:44",
    speed: 92,
    stations: [
      { code: "MMCT", name: "Mumbai Central",   arr: "--",    dep: "17:00", platform: "3", delay: 0,  distance: 0,    day: 1, passed: true,  current: false },
      { code: "BVI",  name: "Borivali",         arr: "17:25", dep: "17:27", platform: "5", delay: 0,  distance: 29,   day: 1, passed: true,  current: false },
      { code: "ST",   name: "Surat",            arr: "19:38", dep: "19:43", platform: "1", delay: 8,  distance: 263,  day: 1, passed: true,  current: false },
      { code: "BRC",  name: "Vadodara Jn",      arr: "21:01", dep: "21:11", platform: "4", delay: 12, distance: 392,  day: 1, passed: true,  current: true  },
      { code: "RTM",  name: "Ratlam Jn",        arr: "23:57", dep: "00:02", platform: "2", delay: 12, distance: 653,  day: 2, passed: false, current: false },
      { code: "KOTA", name: "Kota Jn",          arr: "02:35", dep: "02:40", platform: "1", delay: 10, distance: 878,  day: 2, passed: false, current: false },
      { code: "NDLS", name: "New Delhi",        arr: "08:32", dep: "--",    platform: "16", delay: 12, distance: 1386, day: 2, passed: false, current: false },
    ],
    coachPosition: ["ENG", "EOG", "H1", "A1", "A2", "A3", "B1", "B2", "B3", "B4", "B5", "B6", "PC", "B7", "B8", "EOG"],
  },

  /* ---- Train info / schedule (normalized shape) ---- */
  trainInfo: {
    trainNumber: "12951",
    trainName: "Mumbai Rajdhani Express",
    source: "MMCT", sourceName: "Mumbai Central", destination: "NDLS", destinationName: "New Delhi",
    departure: "17:00", arrival: "08:32", duration: "15h 32m",
    runDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    classes: ["1A", "2A", "3A"],
    type: "Rajdhani",
    stations: [
      { code: "MMCT", name: "Mumbai Central", arr: "--",    dep: "17:00", distance: 0,    day: 1, platform: "3" },
      { code: "BVI",  name: "Borivali",       arr: "17:25", dep: "17:27", distance: 29,   day: 1, platform: "5" },
      { code: "ST",   name: "Surat",          arr: "19:38", dep: "19:43", distance: 263,  day: 1, platform: "1" },
      { code: "BRC",  name: "Vadodara Jn",    arr: "21:01", dep: "21:11", distance: 392,  day: 1, platform: "4" },
      { code: "RTM",  name: "Ratlam Jn",      arr: "23:57", dep: "00:02", distance: 653,  day: 2, platform: "2" },
      { code: "KOTA", name: "Kota Jn",        arr: "02:35", dep: "02:40", distance: 878,  day: 2, platform: "1" },
      { code: "NDLS", name: "New Delhi",      arr: "08:32", dep: "--",    distance: 1386, day: 2, platform: "16" },
    ],
  },

  /* ---- PNR status (normalized shape) ---- */
  pnr: {
    pnr: "8524567890",
    trainNumber: "12951", trainName: "Mumbai Rajdhani Express",
    doj: "15 Jul 2026", from: "MMCT", to: "NDLS",
    class: "3A", chartStatus: "Chart Not Prepared",
    boarding: "Mumbai Central", platform: "3",
    passengers: [
      { no: 1, booking: "B4 / 32 (LB)", current: "CNF B4 / 32 (LB)", status: "CNF" },
      { no: 2, booking: "B4 / 33 (MB)", current: "CNF B4 / 33 (MB)", status: "CNF" },
      { no: 3, booking: "WL 14",        current: "RAC 6",            status: "RAC" },
    ],
  },

  /* ---- Trains between stations ---- */
  between: [
    { no: "12951", name: "Mumbai Rajdhani",   dep: "17:00", arr: "08:32", dur: "15h 32m", days: "Daily" },
    { no: "12953", name: "August Kranti Rjdh", dep: "17:40", arr: "10:55", dur: "17h 15m", days: "Daily" },
    { no: "12909", name: "NZM Garib Rath",    dep: "17:55", arr: "10:40", dur: "16h 45m", days: "M W F" },
    { no: "22209", name: "Duronto Express",   dep: "23:10", arr: "16:35", dur: "17h 25m", days: "T Th Su" },
  ],

  /* ---- Arrival / departure board ---- */
  board: [
    { no: "12951", name: "Mumbai Rajdhani",  time: "08:32", type: "ARR", platform: "16", delay: 12 },
    { no: "12303", name: "Poorva Express",   time: "08:45", type: "DEP", platform: "9",  delay: 0 },
    { no: "12029", name: "Swarna Shatabdi",  time: "09:05", type: "DEP", platform: "1",  delay: 0 },
    { no: "12417", name: "Prayagraj Exp",    time: "09:20", type: "ARR", platform: "12", delay: 25 },
    { no: "12002", name: "Bhopal Shatabdi",  time: "09:45", type: "DEP", platform: "3",  delay: 5 },
  ],

  /* ---- Nearby stations ---- */
  nearby: [
    { code: "NDLS", name: "New Delhi",        km: 1.2 },
    { code: "DLI",  name: "Old Delhi Jn",     km: 3.8 },
    { code: "NZM",  name: "Hazrat Nizamuddin", km: 6.5 },
    { code: "ANVT", name: "Anand Vihar Term", km: 11.4 },
  ],

  /* ---- Seat availability ---- */
  seats: [
    { date: "15 Jul", status: "AVL 42",  ok: true },
    { date: "16 Jul", status: "AVL 18",  ok: true },
    { date: "17 Jul", status: "RAC 12",  ok: true },
    { date: "18 Jul", status: "WL 24",   ok: false },
    { date: "19 Jul", status: "WL 61",   ok: false },
    { date: "20 Jul", status: "AVL 7",   ok: true },
  ],

  /* ---- Fare enquiry ---- */
  fares: [
    { cls: "1A", fare: 4755 },
    { cls: "2A", fare: 2870 },
    { cls: "3A", fare: 2045 },
  ],

  /* ---- Cancelled / diverted / rescheduled ---- */
  alerts: [
    { no: "14033", name: "Jammu Mail",        kind: "CANCELLED",   detail: "Cancelled on 12 Jul due to maintenance block" },
    { no: "12561", name: "Swatantrata Sen.",  kind: "DIVERTED",    detail: "Diverted via Sultanpur between 12–14 Jul" },
    { no: "12801", name: "Purushottam Exp",   kind: "RESCHEDULED", detail: "Rescheduled by 2h 30m on 12 Jul" },
  ],
};

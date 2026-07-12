/* ============================================================
   API layer — wraps the endpoints with the Fetch API and 
   normalizes responses for the UI.

   All requests go to our own /api/* serverless functions (see
   /api). Those functions hold the real API keys server-side, via
   Vercel environment variables, and forward the request upstream.
   The browser never sees a key.
   ============================================================ */

function extractErrorMessage(body, status) {
  const e = body?.error;
  if (!e) return `Request failed (status ${status})`;
  if (typeof e === "string") return e;
  if (typeof e === "object") return e.message || e.code || JSON.stringify(e);
  return String(e);
}

async function apiFetch(url) {
  const res = await fetch(url);
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Bad response from ${url} (status ${res.status})`);
  }
  if (!res.ok || body?.success === false) {
    throw new Error(extractErrorMessage(body, res.status));
  }
  return body;
}

function pick(...vals) {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v;
  return undefined;
}

/** Tag a fallback result so the UI can show an honest "sample data" notice
 *  only when it's actually showing sample data. */
function tagDemo(value, isDemo) {
  if (Array.isArray(value)) value.demo = isDemo;
  else if (value && typeof value === "object") value.demo = isDemo;
  return value;
}

/* ------------------------------------------------------------
   Live train status (RailRadar)
   ------------------------------------------------------------ */
async function getLiveStatus(trainNumber, dateYYYYMMDD) {
  const raw = await apiFetch(CONFIG.ENDPOINTS.trainStatus(trainNumber, dateYYYYMMDD));
  return tagDemo(normalizeLiveStatus(raw, trainNumber), false);
}

function normalizeLiveStatus(raw, trainNumber) {
  const body = raw?.body ?? raw?.data ?? raw ?? {};
  const stationsRaw = pick(body.route, body.stations, body.station_list, body.stationList, raw?.stations) || [];
  const currentCode = pick(body.currentLocation?.station?.code, body.currentLocation?.stationCode, body.current_station_code, body.currentStationCode, body.current_station);
  
  const delayVal = pick(body.currentLocation?.delay, body.delay, body.train_status_message, "");
  const delayStr = String(delayVal || "");
  const delayMatch = delayStr.match(/(\d+)\s*min/i);
  const numericDelay = typeof delayVal === "number" ? delayVal : (delayMatch ? parseInt(delayMatch[1], 10) : 0);

  let seenCurrent = false;
  const stations = stationsRaw.map((s) => {
    const stn = s.station || s;
    const code = pick(stn.code, stn.stationCode, stn.station_code, "?");
    const isCurrent = currentCode ? code === currentCode : false;
    if (isCurrent) seenCurrent = true;
    
    return {
      code,
      name: pick(stn.name, stn.stationName, stn.station_name, code),
      arr: pick(s.arrivalTime, s.arrival_time, s.sta, "--"),
      dep: pick(s.departureTime, s.departure_time, s.std, "--"),
      platform: pick(s.platform, s.expected_platform, s.platformNumber, "-"),
      delay: parseInt(pick(s.delay, s.arrivalDelay, 0), 10) || 0,
      distance: parseInt(pick(s.distance, s.distance_from_source, 0), 10) || 0,
      day: parseInt(pick(s.dayCount, s.day, 1), 10) || 1,
      passed: Boolean(pick(s.hasArrived, s.has_arrived, s.departed, false)) || (!seenCurrent && Boolean(currentCode)),
      current: isCurrent,
    };
  });

  const last = stations[stations.length - 1];
  const currentIdx = stations.findIndex((s) => s.current);
  const covered = currentIdx >= 0 ? stations[currentIdx].distance : 0;

  return {
    trainNumber,
    trainName: pick(body.train?.name, body.train_name, body.trainName, raw?.train_name, `Train ${trainNumber}`),
    source: pick(body.train?.source?.code, stations[0]?.code, "-"),
    destination: pick(body.train?.destination?.code, last?.code, "-"),
    delayMinutes: numericDelay || (stations[currentIdx]?.delay ?? 0),
    statusText: pick(body.status, body.train_status_message, "Running"),
    currentStationCode: currentCode || stations[currentIdx]?.code,
    totalDistance: last?.distance || 0,
    distanceCovered: covered,
    etaFinal: last?.arr || "--",
    speed: parseInt(pick(body.currentLocation?.speed, body.speed, body.avg_speed, 0), 10) || null,
    stations,
    coachPosition: DEMO.liveStatus.coachPosition, 
  };
}

/* ------------------------------------------------------------
   Train search / schedule (RailRadar)
   ------------------------------------------------------------ */
async function getTrainInfo(trainNumber) {
  const raw = await apiFetch(CONFIG.ENDPOINTS.trainSearch(trainNumber));
  return tagDemo(normalizeTrainInfo(raw, trainNumber), false);
}

function normalizeTrainInfo(raw, trainNumber) {
  const body = raw?.body ?? raw?.data ?? raw ?? {};
  const trains = pick(body.trains, body.train_list, []) || [];
  const t = Array.isArray(trains) && trains.length ? trains[0] : body;

  const schedRaw = pick(t.route, t.schedule, t.stations, []) || [];
  const stations = schedRaw.map((s) => {
    const stn = s.station || s;
    return {
      code: pick(stn.code, stn.stationCode, stn.station_code, "?"),
      name: pick(stn.name, stn.stationName, stn.station_name, "?"),
      arr: pick(s.arrivalTime, s.arrival_time, s.sta, "--"),
      dep: pick(s.departureTime, s.departure_time, s.std, "--"),
      distance: parseInt(pick(s.distance, 0), 10) || 0,
      day: parseInt(pick(s.day, s.dayCount, 1), 10) || 1,
      platform: pick(s.platform, s.expected_platform, "-"),
    };
  });

  return {
    trainNumber,
    trainName: pick(t.train?.name, t.trainName, t.train_name, `Train ${trainNumber}`),
    source: pick(t.train?.source?.code, t.origin, t.source, t.from, stations[0]?.code, "-"),
    sourceName: pick(t.train?.source?.name, t.originName, stations[0]?.name, "-"),
    destination: pick(t.train?.destination?.code, t.destination, t.to, stations[stations.length - 1]?.code, "-"),
    destinationName: pick(t.train?.destination?.name, t.destinationName, stations[stations.length - 1]?.name, "-"),
    departure: pick(t.departureTime, t.departure_time, stations[0]?.dep, "--"),
    arrival: pick(t.arrivalTime, t.arrival_time, stations[stations.length - 1]?.arr, "--"),
    duration: pick(t.duration, t.travel_time, "--"),
    runDays: pick(t.train?.runDays, t.runningDays, t.run_days, t.days, []) || [],
    classes: pick(t.train?.classes, t.availableClasses, t.classes, []) || [],
    type: pick(t.train?.type, t.trainType, t.train_type, ""),
    stations,
  };
}

/* ------------------------------------------------------------
   PNR status (RapidAPI)
   ------------------------------------------------------------ */
async function getPNRStatus(pnr) {
  const raw = await apiFetch(CONFIG.ENDPOINTS.pnrStatus(pnr));
  return tagDemo(normalizePNR(raw, pnr), false);
}

function normalizePNR(raw, pnr) {
  const d = raw?.data ?? raw ?? {};
  const paxRaw = pick(d.passengerList, d.passengers, []) || [];
  return {
    pnr,
    trainNumber: pick(d.trainNumber, d.train_number, "-"),
    trainName: pick(d.trainName, d.train_name, "-"),
    doj: pick(d.dateOfJourney, d.doj, "-"),
    from: pick(d.sourceStation, d.boardingPoint, d.from, "-"),
    to: pick(d.destinationStation, d.to, "-"),
    class: pick(d.journeyClass, d.class, "-"),
    chartStatus: pick(d.chartStatus, d.chart_status, "-"),
    boarding: pick(d.boardingPoint, d.sourceStation, "-"),
    platform: pick(d.expectedPlatformNo, d.platform, "-"),
    passengers: paxRaw.map((p, i) => {
      const current = pick(p.currentStatusDetails, p.currentStatus, p.current_status, "-");
      return {
        no: i + 1,
        booking: pick(p.bookingStatusDetails, p.bookingStatus, p.booking_status, "-"),
        current,
        status: /CNF|CONFIRM/i.test(current) ? "CNF" : /RAC/i.test(current) ? "RAC" : /WL/i.test(current) ? "WL" : "-",
      };
    }),
  };
}

/* ------------------------------------------------------------
   Live Station Board (RapidAPI)
   ------------------------------------------------------------ */
async function getStationBoard(code) {
  try {
    const raw = await apiFetch(CONFIG.ENDPOINTS.stationBoard(code));
    return tagDemo(normalizeStationBoard(raw), false);
  } catch (error) {
    console.error("Station Board API failed:", error);
    lastApiError = error.message;
    return tagDemo([...DEMO.board], true);
  }
}

function normalizeStationBoard(raw) {
  const dataArray = raw?.data ?? raw ?? [];
  return dataArray.map((t) => ({
    trainNumber: pick(t.train_number, t.trainNumber, "-"),
    trainName: pick(t.train_name, t.trainName, "Train"),
    arr: pick(t.arrival_time, t.arrivalTime, t.sta, "--:--"),
    dep: pick(t.departure_time, t.departureTime, t.std, "--:--"),
  }));
}

/* ------------------------------------------------------------
   Trains Between Stations (RailKit via Vercel API)
   ------------------------------------------------------------ */
async function getTrainsBetween(from, to) {
  try {
    const res = await fetch(`/api/railkit?action=search&from=${from}&to=${to}`);
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error || `RailKit search failed (status ${res.status})`);
    const data = raw?.data || raw || [];
    return tagDemo(data.map((t) => ({
      trainNumber: pick(t.trainNumber, t.number, "-"),
      trainName: pick(t.trainName, t.name, "Unknown Train"),
      departure: pick(t.departureTime, t.dep, "--:--"),
      arrival: pick(t.arrivalTime, t.arr, "--:--"),
      duration: pick(t.duration, "--h --m"),
      runDays: pick(t.runDays, t.days, []),
    })), false);
  } catch (error) {
    console.error("RailKit Search failed:", error);
    lastApiError = error.message;
    return tagDemo([...DEMO.between], true);
  }
}

/* ------------------------------------------------------------
   Seat Availability & Fare (Powered by RailKit API)
   ------------------------------------------------------------ */
async function getSeatAvailability(train, cls) {
  try {
    // UI does not have From, To, and Date inputs.
    // Fetching train route to set tomorrow's date dynamically.
    const info = await getTrainInfo(train);
    const from = info.source;
    const to = info.destination;
    
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const date = `${String(tmrw.getDate()).padStart(2, '0')}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${tmrw.getFullYear()}`;

    const res = await fetch(`/api/railkit?action=seats&train=${train}&from=${from}&to=${to}&date=${date}&cls=${cls}&quota=GN`);
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error || `RailKit seats failed (status ${res.status})`);
    
    const data = raw?.data || raw || [];
    if (!Array.isArray(data)) return tagDemo([], false);
    
    return tagDemo(data.map(item => ({
      date: pick(item.date, item.journeyDate, "--"),
      status: pick(item.status, item.currentStatus, "N/A"),
      chance: pick(item.probability, item.confirmationChance, ""),
    })), false);
  } catch (error) {
    console.error("Seats API failed:", error);
    lastApiError = error.message;
    return tagDemo([...DEMO.seats], true);
  }
}

async function getFares(train) {
  try {
    const info = await getTrainInfo(train);
    const from = info.source;
    const to = info.destination;
    const cls = "3A"; // Default class
    
    const res = await fetch(`/api/railkit?action=fare&train=${train}&from=${from}&to=${to}&cls=${cls}&quota=GN`);
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error || `RailKit fare failed (status ${res.status})`);
    
    const d = raw?.data || raw || {};
    return tagDemo([
      { label: "Base Fare", value: `₹${pick(d.baseFare, d.base_fare, 0)}` },
      { label: "Reservation", value: `₹${pick(d.reservationCharge, d.reservation_charge, 0)}` },
      { label: "Superfast", value: `₹${pick(d.superfastCharge, d.superfast_charge, 0)}` },
      { label: "GST", value: `₹${pick(d.gst, d.tax, 0)}` },
      { label: "Total", value: `₹${pick(d.totalFare, d.total_fare, d.total, 0)}`, isTotal: true }
    ], false);
  } catch (error) {
    console.error("Fare API failed:", error);
    lastApiError = error.message;
    return tagDemo([...DEMO.fares], true);
  }
}

async function getAlerts() { return DEMO.alerts; }

/** Holds the message from the most recent failed live request, so the UI
 *  can show *why* it fell back to sample data instead of staying silent. */
let lastApiError = null;

/** Small artificial latency so loading skeletons are visible. */
function fakeDelay(ms = 650) {
  return new Promise((r) => setTimeout(r, ms));
}

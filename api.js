/* ============================================================
   API layer — wraps the existing RapidAPI endpoints with the
   Fetch API and normalizes responses into simple objects that
   the UI can render. Falls back to demo data when no key is
   configured or a request fails.
   ============================================================ */

/** Perform a RapidAPI GET request with the required headers. */
async function rapidFetch(url, host) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-key": CONFIG.RAPIDAPI_KEY,
      "x-rapidapi-host": host,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

/** Safely pick the first defined value from a list of candidates. */
function pick(...vals) {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v;
  return undefined;
}

/* ------------------------------------------------------------
   Live train status
   GET /api/trains/v1/train/status?train_number=&departure_date=&isH5=true&client=web
   ------------------------------------------------------------ */
async function getLiveStatus(trainNumber, dateYYYYMMDD) {
  if (IS_DEMO) {
    await fakeDelay();
    return { ...DEMO.liveStatus, trainNumber, demo: true };
  }
  const raw = await rapidFetch(
    CONFIG.ENDPOINTS.trainStatus(trainNumber, dateYYYYMMDD),
    CONFIG.HOSTS.LIVE_STATUS
  );
  return normalizeLiveStatus(raw, trainNumber);
}

/**
 * Normalize the live-status payload. The IRCTC h5 API nests data
 * under `body`; we defensively probe common field names so minor
 * upstream shape changes don't break the UI.
 */
function normalizeLiveStatus(raw, trainNumber) {
  const body = raw?.body ?? raw?.data ?? raw ?? {};
  const stationsRaw =
    pick(body.stations, body.station_list, body.stationList, raw?.stations) || [];

  const currentCode = pick(
    body.current_station_code, body.currentStationCode, body.current_station
  );
  const delayStr = String(pick(body.train_status_message, body.delay, "") || "");
  const delayMatch = delayStr.match(/(\d+)\s*min/i);

  let seenCurrent = false;
  const stations = stationsRaw.map((s) => {
    const code = pick(s.stationCode, s.station_code, s.code, "?");
    const isCurrent = currentCode ? code === currentCode : false;
    if (isCurrent) seenCurrent = true;
    return {
      code,
      name: pick(s.stationName, s.station_name, s.name, code),
      arr: pick(s.arrivalTime, s.arrival_time, s.sta, "--"),
      dep: pick(s.departureTime, s.departure_time, s.std, "--"),
      platform: pick(s.expected_platform, s.platform, s.platformNumber, "-"),
      delay: parseInt(pick(s.arrivalDelay, s.delay, 0), 10) || 0,
      distance: parseInt(pick(s.distance, s.distance_from_source, 0), 10) || 0,
      day: parseInt(pick(s.dayCount, s.day, 1), 10) || 1,
      passed: Boolean(pick(s.hasArrived, s.has_arrived, false)) || (!seenCurrent && Boolean(currentCode)),
      current: isCurrent,
    };
  });

  const last = stations[stations.length - 1];
  const currentIdx = stations.findIndex((s) => s.current);
  const covered = currentIdx >= 0 ? stations[currentIdx].distance : 0;

  return {
    trainNumber,
    trainName: pick(body.train_name, body.trainName, raw?.train_name, `Train ${trainNumber}`),
    source: stations[0]?.code || "-",
    destination: last?.code || "-",
    delayMinutes: delayMatch ? parseInt(delayMatch[1], 10) : (stations[currentIdx]?.delay ?? 0),
    statusText: pick(body.train_status_message, body.status, "Running"),
    currentStationCode: currentCode || stations[currentIdx]?.code,
    totalDistance: last?.distance || 0,
    distanceCovered: covered,
    etaFinal: last?.arr || "--",
    speed: parseInt(pick(body.speed, body.avg_speed, 0), 10) || null,
    stations,
    coachPosition: DEMO.liveStatus.coachPosition, // rake layout (typical composition)
  };
}

/* ------------------------------------------------------------
   Train search / schedule
   GET /api/trains-search/v1/train/{train_number}?isH5=true&client=web
   ------------------------------------------------------------ */
async function getTrainInfo(trainNumber) {
  if (IS_DEMO) {
    await fakeDelay();
    return { ...DEMO.trainInfo, trainNumber, demo: true };
  }
  const raw = await rapidFetch(
    CONFIG.ENDPOINTS.trainSearch(trainNumber),
    CONFIG.HOSTS.LIVE_STATUS
  );
  return normalizeTrainInfo(raw, trainNumber);
}

function normalizeTrainInfo(raw, trainNumber) {
  const body = raw?.body ?? raw?.data ?? raw ?? {};
  const trains = pick(body.trains, body.train_list, []) || [];
  const t = Array.isArray(trains) ? (trains[0] ?? body) : body;

  const schedRaw = pick(t.schedule, t.stations, t.route, []) || [];
  const stations = schedRaw.map((s) => ({
    code: pick(s.stationCode, s.station_code, s.code, "?"),
    name: pick(s.stationName, s.station_name, s.name, "?"),
    arr: pick(s.arrivalTime, s.arrival_time, s.sta, "--"),
    dep: pick(s.departureTime, s.departure_time, s.std, "--"),
    distance: parseInt(pick(s.distance, 0), 10) || 0,
    day: parseInt(pick(s.dayCount, s.day, 1), 10) || 1,
    platform: pick(s.platform, s.expected_platform, "-"),
  }));

  return {
    trainNumber,
    trainName: pick(t.trainName, t.train_name, `Train ${trainNumber}`),
    source: pick(t.origin, t.source, t.from, stations[0]?.code, "-"),
    sourceName: pick(t.originName, stations[0]?.name, "-"),
    destination: pick(t.destination, t.to, stations[stations.length - 1]?.code, "-"),
    destinationName: pick(t.destinationName, stations[stations.length - 1]?.name, "-"),
    departure: pick(t.departureTime, t.departure_time, stations[0]?.dep, "--"),
    arrival: pick(t.arrivalTime, t.arrival_time, stations[stations.length - 1]?.arr, "--"),
    duration: pick(t.duration, t.travel_time, "--"),
    runDays: pick(t.runningDays, t.run_days, t.days, []) || [],
    classes: pick(t.availableClasses, t.classes, []) || [],
    type: pick(t.trainType, t.train_type, ""),
    stations,
  };
}

/* ------------------------------------------------------------
   PNR status
   GET /getPNRStatus/{pnr}
   ------------------------------------------------------------ */
async function getPNRStatus(pnr) {
  if (IS_DEMO) {
    await fakeDelay();
    return { ...DEMO.pnr, pnr, demo: true };
  }
  const raw = await rapidFetch(CONFIG.ENDPOINTS.pnrStatus(pnr), CONFIG.HOSTS.PNR);
  return normalizePNR(raw, pnr);
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
   Features without a dedicated API on the current plan —
   served from the bundled dataset (clearly labeled in the UI).
   ------------------------------------------------------------ */
async function getTrainsBetween() { await fakeDelay(); return DEMO.between; }
async function getStationBoard()  { await fakeDelay(); return DEMO.board; }
async function getNearbyStations(){ await fakeDelay(); return DEMO.nearby; }
async function getSeatAvailability() { await fakeDelay(); return DEMO.seats; }
async function getFares() { await fakeDelay(); return DEMO.fares; }
async function getAlerts() { return DEMO.alerts; }

/** Small artificial latency so loading skeletons are visible. */
function fakeDelay(ms = 650) {
  return new Promise((r) => setTimeout(r, ms));
}

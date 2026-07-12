/* ============================================================
   API layer — wraps the endpoints with the Fetch API and 
   normalizes responses for the UI.
   ============================================================ */

async function rapidFetch(url, host) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-key": CONFIG.RAPIDAPI_KEY,
      "x-rapidapi-host": host,
    },
  });
  if (!res.ok) throw new Error(`RapidAPI error ${res.status}`);
  return res.json();
}

async function railRadarFetch(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${CONFIG.RAILRADAR_KEY}`
    },
  });
  if (!res.ok) throw new Error(`RailRadar error ${res.status}`);
  return res.json();
}

function pick(...vals) {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v;
  return undefined;
}

/* ------------------------------------------------------------
   Live train status (RailRadar)
   ------------------------------------------------------------ */
async function getLiveStatus(trainNumber, dateYYYYMMDD) {
  if (IS_DEMO) {
    await fakeDelay();
    return { ...DEMO.liveStatus, trainNumber, demo: true };
  }
  const raw = await railRadarFetch(CONFIG.ENDPOINTS.trainStatus(trainNumber, dateYYYYMMDD));
  return normalizeLiveStatus(raw, trainNumber);
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
  if (IS_DEMO) {
    await fakeDelay();
    return { ...DEMO.trainInfo, trainNumber, demo: true };
  }
  const raw = await railRadarFetch(CONFIG.ENDPOINTS.trainSearch(trainNumber));
  return normalizeTrainInfo(raw, trainNumber);
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
   Live Station Board (New - RapidAPI)
   ------------------------------------------------------------ */
async function getStationBoard(code) {
  if (IS_DEMO) {
    await fakeDelay();
    return DEMO.board;
  }
  try {
    const raw = await rapidFetch(CONFIG.ENDPOINTS.stationBoard(code), CONFIG.HOSTS.STATION_BOARD);
    return normalizeStationBoard(raw);
  } catch (error) {
    console.error("Station Board API failed:", error);
    return DEMO.board;
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
   Trains Between Stations (RailRadar)
   ------------------------------------------------------------ */
async function getTrainsBetween(from, to) {
  if (IS_DEMO) {
    await fakeDelay();
    return DEMO.between;
  }
  try {
    const raw = await railRadarFetch(CONFIG.ENDPOINTS.trainsBetween(from, to));
    return normalizeTrainsBetween(raw);
  } catch (error) {
    console.error("Trains Between API failed:", error);
    return DEMO.between; 
  }
}

function normalizeTrainsBetween(raw) {
  const body = raw?.body ?? raw?.data ?? raw ?? {};
  const trainsList = pick(body.trains, body.trainList, body.train_list, []) || [];

  return trainsList.map((t) => ({
    trainNumber: pick(t.trainNumber, t.train_number, t.train?.number, "-"),
    trainName: pick(t.trainName, t.train_name, t.train?.name, "Unknown Train"),
    departure: pick(t.departureTime, t.departure_time, t.dep, "--:--"),
    arrival: pick(t.arrivalTime, t.arrival_time, t.arr, "--:--"),
    duration: pick(t.duration, t.travelTime, t.travel_time, "--h --m"),
    runDays: pick(t.runDays, t.runningDays, t.run_days, t.train?.runDays, []) || [],
  }));
}

/* ------------------------------------------------------------
   Features without a dedicated API on the current plan —
   served from the bundled dataset.
   ------------------------------------------------------------ */
async function getNearbyStations(){ await fakeDelay(); return DEMO.nearby; }
async function getSeatAvailability() { await fakeDelay(); return DEMO.seats; }
async function getFares() { await fakeDelay(); return DEMO.fares; }
async function getAlerts() { return DEMO.alerts; }

/** Small artificial latency so loading skeletons are visible. */
function fakeDelay(ms = 650) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ============================================================
   RailPulse configuration
   ------------------------------------------------------------
   Live Status & Search: RailRadar
   PNR Status: RapidAPI (irctc-indian-railway-pnr-status)
   Station Board: RapidAPI (irctc-api5)
   ============================================================ */

const CONFIG = {
  RAILRADAR_KEY: "rg_8949916f4dce412c907825db35789d7f",
  RAPIDAPI_KEY: "26a4b0b475msh19ec367a28a5999p1c0f0cjsn5bdd2a32d2fc",

  HOSTS: {
    LIVE_STATUS: "api.railradar.in",
    PNR: "irctc-indian-railway-pnr-status.p.rapidapi.com",
    STATION_BOARD: "irctc-api5.p.rapidapi.com",
  },

  ENDPOINTS: {
    trainStatus: (trainNumber, dateYYYYMMDD) => {
      const date = dateYYYYMMDD.length === 8 
        ? `${dateYYYYMMDD.slice(0,4)}-${dateYYYYMMDD.slice(4,6)}-${dateYYYYMMDD.slice(6,8)}` 
        : dateYYYYMMDD;
      return `https://api.railradar.in/v1/trains/${trainNumber}/live?date=${date}`;
    },
    
    trainSearch: (trainNumber) =>
      `https://api.railradar.in/v1/trains/${trainNumber}?haltsOnly=true`,
      
    trainsBetween: (from, to) => 
      `https://api.railradar.in/v1/trains/between?source=${from}&destination=${to}`,
      
    pnrStatus: (pnr) =>
      `https://irctc-indian-railway-pnr-status.p.rapidapi.com/getPNRStatus/${pnr}`,
      
    stationBoard: (code) => 
      `https://irctc-api5.p.rapidapi.com/station-live/${code}`,
  },
};

const IS_DEMO = !CONFIG.RAILRADAR_KEY || !CONFIG.RAPIDAPI_KEY;

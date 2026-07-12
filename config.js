/* ============================================================
   RailPulse configuration
   ------------------------------------------------------------
   Updated to use RailRadar for Train Status & Search,
   while keeping RapidAPI for PNR (RailRadar doesn't support PNR yet).
   ============================================================ */

const CONFIG = {
  // New RailRadar Key for Live Status & Search
  RAILRADAR_KEY: "rg_8949916f4dce412c907825db35789d7f",
  
  // Old RapidAPI Key for PNR Status only
  RAPIDAPI_KEY: "26a4b0b475msh19ec367a28a5999p1c0f0cjsn5bdd2a32d2fc",

  HOSTS: {
    LIVE_STATUS: "api.railradar.in",
    PNR: "irctc-indian-railway-pnr-status.p.rapidapi.com",
  },

  ENDPOINTS: {
    // RailRadar Live Status (Auto-formats YYYYMMDD to YYYY-MM-DD)
    trainStatus: (trainNumber, dateYYYYMMDD) => {
      const date = dateYYYYMMDD.length === 8 
        ? `${dateYYYYMMDD.slice(0,4)}-${dateYYYYMMDD.slice(4,6)}-${dateYYYYMMDD.slice(6,8)}` 
        : dateYYYYMMDD;
      return `https://api.railradar.in/v1/trains/${trainNumber}/live?date=${date}`;
    },
    
    // RailRadar Train Schedule/Search
    trainSearch: (trainNumber) =>
      `https://api.railradar.in/v1/trains/${trainNumber}?haltsOnly=true`,
      
    // RapidAPI PNR Status (Unchanged)
    pnrStatus: (pnr) =>
      `https://irctc-indian-railway-pnr-status.p.rapidapi.com/getPNRStatus/${pnr}`,
  },
};

// True when no real keys have been configured
const IS_DEMO = !CONFIG.RAILRADAR_KEY || !CONFIG.RAPIDAPI_KEY;

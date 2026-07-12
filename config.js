/* ============================================================
   RailPulse configuration
   ------------------------------------------------------------
   1. Paste your RapidAPI key below (between the quotes).
   2. That's it — the app automatically switches from DEMO
      mode to LIVE mode when a real key is present.
   ============================================================ */

const CONFIG = {
  // <<< PASTE YOUR KEY HERE >>>
  RAPIDAPI_KEY: "YOUR_RAPIDAPI_KEY_HERE",

  // Existing RapidAPI hosts — do not change
  HOSTS: {
    LIVE_STATUS: "indian-railway-irctc.p.rapidapi.com",
    PNR: "irctc-indian-railway-pnr-status.p.rapidapi.com",
  },

  // Existing endpoints — do not change
  ENDPOINTS: {
    trainStatus: (trainNumber, dateYYYYMMDD) =>
      `https://indian-railway-irctc.p.rapidapi.com/api/trains/v1/train/status?train_number=${trainNumber}&departure_date=${dateYYYYMMDD}&isH5=true&client=web`,
    trainSearch: (trainNumber) =>
      `https://indian-railway-irctc.p.rapidapi.com/api/trains-search/v1/train/${trainNumber}?isH5=true&client=web`,
    pnrStatus: (pnr) =>
      `https://irctc-indian-railway-pnr-status.p.rapidapi.com/getPNRStatus/${pnr}`,
  },
};

// True when no real key has been configured — the app then
// serves realistic demo data so every feature is explorable.
const IS_DEMO = !CONFIG.RAPIDAPI_KEY || CONFIG.RAPIDAPI_KEY === "YOUR_RAPIDAPI_KEY_HERE";

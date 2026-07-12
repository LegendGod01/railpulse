/* ============================================================
   RailPulse configuration
   ------------------------------------------------------------
   Live Status & Search: RailRadar (proxied via /api)
   PNR Status: RapidAPI (proxied via /api)
   Station Board: RapidAPI (proxied via /api)

   No API keys live here anymore — they're read from Vercel
   environment variables inside the /api/* serverless functions,
   so they're never shipped to the browser.
   ============================================================ */

const CONFIG = {
  ENDPOINTS: {
    trainStatus: (trainNumber, dateYYYYMMDD) =>
      `/api/live-status?train=${trainNumber}&date=${dateYYYYMMDD}`,

    trainSearch: (trainNumber) =>
      `/api/train-info?train=${trainNumber}`,

    pnrStatus: (pnr) =>
      `/api/pnr?pnr=${pnr}`,

    stationBoard: (code) =>
      `/api/station-board?code=${code}`,
  },
};

// Demo mode is now toggled per-request based on whether a call actually
// fails, not on whether a key string is present client-side (see api.js).
const IS_DEMO = false;

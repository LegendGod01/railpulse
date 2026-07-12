/* ============================================================
   RailPulse — main application logic
   Navigation · theme · storage · rendering for every feature.
   ============================================================ */

/* ---------------- Helpers ---------------- */
const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function skeletons(target, sizes = ["lg", "md", "md"]) {
  target.innerHTML = sizes.map((s) => `<div class="skeleton sk-${s}"></div>`).join("");
}

function errorNotice(target, msg) {
  target.innerHTML = `<div class="notice error">${esc(msg)}</div>`;
}

function demoNotice(isDemo) {
  return isDemo
    ? `<div class="notice">Showing demo data — add your RapidAPI key in <b>config.js</b> for live results.</div>`
    : "";
}

/* ---------------- Local storage (favorites / recents / theme) ---------------- */
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
};

function addRecent(entry) {
  const list = store.get("recents", []).filter((r) => r.label !== entry.label);
  list.unshift(entry);
  store.set("recents", list.slice(0, 8));
  renderRecents();
}

function toggleFavorite(entry) {
  let list = store.get("favs", []);
  const exists = list.some((f) => f.label === entry.label);
  list = exists ? list.filter((f) => f.label !== entry.label) : [entry, ...list].slice(0, 10);
  store.set("favs", list);
  renderFavorites();
  toast(exists ? "Removed from favorites" : "Added to favorites");
  return !exists;
}

function isFavorite(label) {
  return store.get("favs", []).some((f) => f.label === label);
}

/* ---------------- Theme ---------------- */
function initTheme() {
  const saved = store.get("theme", "dark");
  document.documentElement.dataset.theme = saved;
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
  });
}

/* ---------------- Navigation ---------------- */
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("is-active"));
  $(`#view-${name}`)?.classList.add("is-active");
  document.querySelector(`.nav-item[data-view="${name}"]`)?.classList.add("is-active");
  window.scrollTo({ top: 0 });
}

function initNav() {
  document.querySelectorAll(".nav-item").forEach((btn) =>
    btn.addEventListener("click", () => showView(btn.dataset.view)));
  document.querySelectorAll("[data-goto]").forEach((btn) =>
    btn.addEventListener("click", () => showView(btn.dataset.goto)));

  // Station tool tabs
  document.querySelectorAll(".tool-tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tool-tab").forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tool-panel").forEach((p) => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      $(`#tool-${tab.dataset.tool}`).classList.add("is-active");
    }));
}

/* ================= LIVE TRAIN STATUS ================= */
function initLive() {
  // Default date = today
  $("#liveDate").value = new Date().toISOString().slice(0, 10);

  $("#liveForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const trainNo = $("#liveTrainNo").value.trim();
    const date = $("#liveDate").value.replaceAll("-", ""); // YYYYMMDD
    const out = $("#liveResult");
    skeletons(out, ["lg", "lg", "md"]);
    try {
      const data = await getLiveStatus(trainNo, date);
      addRecent({ type: "live", label: `${trainNo} · Live`, trainNo });
      renderLive(out, data);
    } catch (err) {
      console.error(err);
      errorNotice(out, "Could not fetch live status. Check the train number, date and your API key.");
    }
  });
}

function renderLive(out, d) {
  const pct = d.totalDistance ? Math.min(100, Math.round((d.distanceCovered / d.totalDistance) * 100)) : 0;
  const favLabel = `${d.trainNumber} · ${d.trainName}`;
  const delayBadge =
    d.delayMinutes > 0
      ? `<span class="badge badge-warn">+${d.delayMinutes} min late</span>`
      : `<span class="badge badge-ok">On time</span>`;

  const trainSVG = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 15.5V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9.5a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 0 1 4 15.5Z" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16" stroke="currentColor" stroke-width="1.8"/><circle cx="8.5" cy="14.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="14.5" r="1.2" fill="currentColor"/></svg>`;

  out.innerHTML = `
    ${demoNotice(d.demo)}
    <div class="glass-card train-head">
      <div class="train-head-top">
        <div>
          <h2 class="train-title">${esc(d.trainNumber)} · ${esc(d.trainName)}</h2>
          <p class="train-sub">${esc(d.source)} → ${esc(d.destination)}</p>
        </div>
        <button class="icon-btn fav-btn ${isFavorite(favLabel) ? "is-fav" : ""}" id="liveFav" aria-label="Toggle favorite">
          <svg viewBox="0 0 24 24" fill="${isFavorite(favLabel) ? "currentColor" : "none"}"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17l-5.4 2.8 1.1-6.1L3.2 9.4l6.1-.8L12 3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="status-line">
        ${delayBadge}
        <span class="badge badge-muted">${esc(d.statusText)}</span>
      </div>
      <div class="progress-wrap">
        <span class="progress-train" style="left:${pct}%">${trainSVG}</span>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-meta">
          <span>${d.distanceCovered} km covered</span>
          <span>${Math.max(0, d.totalDistance - d.distanceCovered)} km left</span>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat"><b>${esc(d.etaFinal)}</b><span>ETA ${esc(d.destination)}</span></div>
        <div class="stat"><b>${pct}%</b><span>Journey</span></div>
        <div class="stat"><b>${d.speed ? d.speed + " km/h" : "—"}</b><span>Speed</span></div>
      </div>
    </div>

    <div class="glass-card">
      <h3 class="section-title" style="margin:0 0 0.8rem">Route timeline</h3>
      <ol class="timeline">
        ${d.stations.map((s) => `
          <li class="tl-item ${s.passed ? "is-passed" : ""} ${s.current ? "is-current" : ""}">
            <div class="tl-body">
              <div class="tl-row">
                <span class="tl-name">${esc(s.name)} <span style="color:var(--muted);font-weight:600">· ${esc(s.code)}</span></span>
                <span class="tl-time">${esc(s.arr)} → ${esc(s.dep)}</span>
              </div>
              <div class="tl-meta">
                <span>PF ${esc(s.platform)}</span>
                <span>${s.distance} km</span>
                <span>Day ${s.day}</span>
                ${s.delay > 0 ? `<span style="color:var(--accent);font-weight:700">+${s.delay} min</span>` : ""}
              </div>
              ${s.current ? `<span class="tl-here">${trainSVG} Train is here</span>` : ""}
            </div>
          </li>`).join("")}
      </ol>
    </div>

    <div class="glass-card">
      <h3 class="section-title" style="margin:0 0 0.4rem">Coach position</h3>
      <p class="muted" style="margin-bottom:0.3rem">Typical rake composition · engine on the left</p>
      <div class="coach-strip">
        ${d.coachPosition.map((c) => `
          <div class="coach ${c === "ENG" ? "engine" : /^(A|B|H|E)/.test(c) && c !== "EOG" ? "ac" : ""}">${esc(c)}</div>`).join("")}
      </div>
    </div>`;

  $("#liveFav").addEventListener("click", (e) => {
    const nowFav = toggleFavorite({ type: "live", label: favLabel, trainNo: d.trainNumber });
    e.currentTarget.classList.toggle("is-fav", nowFav);
    e.currentTarget.querySelector("svg").setAttribute("fill", nowFav ? "currentColor" : "none");
  });
}

/* ================= PNR STATUS ================= */
function initPNR() {
  $("#pnrForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pnr = $("#pnrInput").value.trim();
    const out = $("#pnrResult");
    skeletons(out, ["lg", "md"]);
    try {
      const d = await getPNRStatus(pnr);
      addRecent({ type: "pnr", label: `PNR ${pnr}`, pnr });
      renderPNR(out, d);
    } catch (err) {
      console.error(err);
      errorNotice(out, "Could not fetch PNR status. Check the PNR number and your API key.");
    }
  });
}

function renderPNR(out, d) {
  const chip = (status) =>
    status === "CNF" ? "badge-ok" : status === "RAC" ? "badge-warn" : "badge-danger";
  out.innerHTML = `
    ${demoNotice(d.demo)}
    <div class="glass-card train-head">
      <div>
        <h2 class="train-title">PNR ${esc(d.pnr)}</h2>
        <p class="train-sub">${esc(d.trainNumber)} · ${esc(d.trainName)}</p>
      </div>
      <div class="stat-grid">
        <div class="stat"><b>${esc(d.from)} → ${esc(d.to)}</b><span>Journey</span></div>
        <div class="stat"><b>${esc(d.doj)}</b><span>Date</span></div>
        <div class="stat"><b>${esc(d.class)}</b><span>Class</span></div>
      </div>
      <div class="status-line">
        <span class="badge badge-muted">${esc(d.chartStatus)}</span>
        <span class="badge badge-muted">Boarding: ${esc(d.boarding)}</span>
        <span class="badge badge-muted">PF ${esc(d.platform)}</span>
      </div>
    </div>
    <div class="glass-card">
      <h3 class="section-title" style="margin:0 0 0.7rem">Passengers</h3>
      <div class="pax-list">
        ${d.passengers.map((p) => `
          <div class="pax">
            <div>
              <b>Passenger ${p.no}</b>
              <div style="color:var(--muted);font-size:0.72rem">Booked: ${esc(p.booking)}</div>
            </div>
            <div style="text-align:right">
              <span class="badge ${chip(p.status)}">${esc(p.status)}</span>
              <div style="color:var(--muted);font-size:0.72rem;margin-top:0.2rem">${esc(p.current)}</div>
            </div>
          </div>`).join("")}
      </div>
    </div>`;
}

/* ================= TRAIN SEARCH / SCHEDULE / ROUTE ================= */
function initTrains() {
  $("#trainForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const no = $("#trainNoInput").value.trim();
    const out = $("#trainResult");
    skeletons(out, ["lg", "lg"]);
    try {
      const d = await getTrainInfo(no);
      addRecent({ type: "train", label: `${no} · Schedule`, trainNo: no });
      renderTrainInfo(out, d);
    } catch (err) {
      console.error(err);
      errorNotice(out, "Could not fetch train details. Check the train number and your API key.");
    }
  });
}

function renderTrainInfo(out, d) {
  const favLabel = `${d.trainNumber} · ${d.trainName}`;
  out.innerHTML = `
    ${demoNotice(d.demo)}
    <div class="glass-card train-head">
      <div class="train-head-top">
        <div>
          <h2 class="train-title">${esc(d.trainNumber)} · ${esc(d.trainName)}</h2>
          <p class="train-sub">${esc(d.sourceName)} → ${esc(d.destinationName)}</p>
        </div>
        <button class="icon-btn fav-btn ${isFavorite(favLabel) ? "is-fav" : ""}" id="trainFav" aria-label="Toggle favorite">
          <svg viewBox="0 0 24 24" fill="${isFavorite(favLabel) ? "currentColor" : "none"}"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17l-5.4 2.8 1.1-6.1L3.2 9.4l6.1-.8L12 3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="stat-grid">
        <div class="stat"><b>${esc(d.departure)}</b><span>Departs</span></div>
        <div class="stat"><b>${esc(d.arrival)}</b><span>Arrives</span></div>
        <div class="stat"><b>${esc(d.duration)}</b><span>Duration</span></div>
      </div>
      <div class="status-line">
        ${d.type ? `<span class="badge badge-ok">${esc(d.type)}</span>` : ""}
        ${(d.classes || []).map((c) => `<span class="badge badge-muted">${esc(c)}</span>`).join("")}
      </div>
      ${d.runDays?.length ? `<div class="status-line">${d.runDays.map((day) => `<span class="badge badge-muted">${esc(day)}</span>`).join("")}</div>` : ""}
    </div>
    <div class="glass-card">
      <h3 class="section-title" style="margin:0 0 0.8rem">Schedule &amp; route</h3>
      <ol class="timeline">
        ${d.stations.map((s, i) => `
          <li class="tl-item ${i === 0 ? "is-passed" : ""}">
            <div class="tl-body">
              <div class="tl-row">
                <span class="tl-name">${esc(s.name)} <span style="color:var(--muted);font-weight:600">· ${esc(s.code)}</span></span>
                <span class="tl-time">${esc(s.arr)} → ${esc(s.dep)}</span>
              </div>
              <div class="tl-meta">
                <span>PF ${esc(s.platform)}</span><span>${s.distance} km</span><span>Day ${s.day}</span>
              </div>
            </div>
          </li>`).join("")}
      </ol>
    </div>`;

  $("#trainFav").addEventListener("click", (e) => {
    const nowFav = toggleFavorite({ type: "train", label: favLabel, trainNo: d.trainNumber });
    e.currentTarget.classList.toggle("is-fav", nowFav);
    e.currentTarget.querySelector("svg").setAttribute("fill", nowFav ? "currentColor" : "none");
  });
}

/* ================= STATION TOOLS ================= */
function initStations() {
  // Trains between stations
  $("#swapStations").addEventListener("click", () => {
    const a = $("#fromStation"), b = $("#toStation");
    [a.value, b.value] = [b.value, a.value];
  });
  $("#betweenForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const from = $("#fromStation").value.trim().toUpperCase();
    const to = $("#toStation").value.trim().toUpperCase();
    const out = $("#betweenResult");
    skeletons(out, ["md", "md", "md"]);
    const list = await getTrainsBetween(from, to);
    addRecent({ type: "between", label: `${from} → ${to}` });
    out.innerHTML = `
      ${list.demo ? `<div class="notice">Sample results for ${esc(from)} → ${esc(to)} — live search unavailable${lastApiError ? ` (${esc(lastApiError)})` : ""}.</div>` : ""}
      ${list.map((t) => `
        <div class="row-card">
          <div class="row-main">
            <div class="row-title">${esc(t.no)} · ${esc(t.name)}</div>
            <div class="row-sub">${esc(t.dep)} → ${esc(t.arr)} · ${esc(t.days)}</div>
          </div>
          <div class="row-end"><b>${esc(t.dur)}</b><span>duration</span></div>
        </div>`).join("")}`;
  });

  // Arrival/departure board
  $("#boardForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = $("#boardStation").value.trim().toUpperCase();
    const out = $("#boardResult");
    skeletons(out, ["md", "md", "md"]);
    const list = await getStationBoard(code);
    out.innerHTML = `
      ${list.demo ? `<div class="notice">Sample board for ${esc(code)} — live board unavailable${lastApiError ? ` (${esc(lastApiError)})` : ""}.</div>` : ""}
      ${list.map((t) => `
        <div class="row-card">
          <div class="row-main">
            <div class="row-title">${esc(t.no)} · ${esc(t.name)}</div>
            <div class="row-sub">
              <span class="badge ${t.type === "ARR" ? "badge-ok" : "badge-muted"}">${esc(t.type)}</span>
              PF ${esc(t.platform)} ${t.delay > 0 ? `· <span style="color:var(--accent)">+${t.delay} min</span>` : ""}
            </div>
          </div>
          <div class="row-end"><b>${esc(t.time)}</b><span>${t.type === "ARR" ? "arrives" : "departs"}</span></div>
        </div>`).join("")}`;
  });

  // Nearby stations (geolocation)
  $("#nearbyBtn").addEventListener("click", async () => {
    const out = $("#nearbyResult");
    skeletons(out, ["md", "md"]);
    const render = async () => {
      const list = await getNearbyStations();
      out.innerHTML = list.map((s) => `
        <div class="row-card">
          <div class="row-main">
            <div class="row-title">${esc(s.name)}</div>
            <div class="row-sub">${esc(s.code)}</div>
          </div>
          <div class="row-end"><b>${s.km} km</b><span>away</span></div>
        </div>`).join("");
    };
    if (!navigator.geolocation) { await render(); return; }
    navigator.geolocation.getCurrentPosition(
      async () => { await render(); toast("Showing stations near you"); },
      async () => { await render(); toast("Location unavailable — showing sample stations"); },
      { timeout: 5000 }
    );
  });

  // Seat availability
  $("#seatForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const no = $("#seatTrain").value.trim();
    const cls = $("#seatClass").value;
    const out = $("#seatResult");
    skeletons(out, ["md", "md", "md"]);
    const list = await getSeatAvailability(no, cls);
    out.innerHTML = `
      ${list.demo ? `<div class="notice">Sample availability for ${esc(no)} · ${esc(cls)} — live data unavailable${lastApiError ? ` (${esc(lastApiError)})` : ""}.</div>` : ""}
      ${list.map((s) => `
        <div class="row-card">
          <div class="row-main"><div class="row-title">${esc(s.date)}</div></div>
          <div class="row-end"><span class="badge ${s.ok ? "badge-ok" : "badge-danger"}">${esc(s.status)}</span></div>
        </div>`).join("")}`;
  });

  // Fare enquiry
  $("#fareForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const no = $("#fareTrain").value.trim();
    const out = $("#fareResult");
    skeletons(out, ["md", "md"]);
    const list = await getFares(no);
    out.innerHTML = `
      ${list.demo ? `<div class="notice">Sample fares for ${esc(no)} — live fares unavailable${lastApiError ? ` (${esc(lastApiError)})` : ""}.</div>` : ""}
      ${list.map((f) => `
        <div class="row-card">
          <div class="row-main"><div class="row-title">${esc(f.cls)} class</div></div>
          <div class="row-end"><b>&#8377;${f.fare.toLocaleString("en-IN")}</b><span>per adult</span></div>
        </div>`).join("")}`;
  });
}

/* ================= HOME: favorites / recents / alerts ================= */
function renderFavorites() {
  const list = store.get("favs", []);
  $("#favList").innerHTML = list.length
    ? list.map((f) => `
        <button class="chip" data-fav='${esc(JSON.stringify(f))}'>
          <span class="star">&#9733;</span>${esc(f.label)}
        </button>`).join("")
    : `<span class="empty-hint">Star a train from Live or Trains to pin it here.</span>`;
  $("#favList").querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => openEntry(JSON.parse(c.dataset.fav))));
}

function renderRecents() {
  const list = store.get("recents", []);
  $("#recentList").innerHTML = list.length
    ? list.map((r) => `<button class="chip" data-rec='${esc(JSON.stringify(r))}'>${esc(r.label)}</button>`).join("")
    : `<span class="empty-hint">Your searches will appear here.</span>`;
  $("#recentList").querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => openEntry(JSON.parse(c.dataset.rec))));
}

/** Re-open a favorite / recent search in the right view. */
function openEntry(entry) {
  if (entry.type === "pnr") {
    showView("pnr");
    $("#pnrInput").value = entry.pnr || "";
    if (entry.pnr) $("#pnrForm").requestSubmit();
  } else if (entry.type === "train") {
    showView("trains");
    $("#trainNoInput").value = entry.trainNo || "";
    if (entry.trainNo) $("#trainForm").requestSubmit();
  } else if (entry.type === "between") {
    showView("stations");
  } else {
    showView("live");
    $("#liveTrainNo").value = entry.trainNo || "";
    if (entry.trainNo) $("#liveForm").requestSubmit();
  }
}

async function renderAlerts() {
  const list = await getAlerts();
  const kindBadge = { CANCELLED: "badge-danger", DIVERTED: "badge-warn", RESCHEDULED: "badge-muted" };
  $("#alertsList").innerHTML = list.map((a) => `
    <div class="row-card">
      <div class="row-main">
        <div class="row-title">${esc(a.no)} · ${esc(a.name)}</div>
        <div class="row-sub">${esc(a.detail)}</div>
      </div>
      <div class="row-end"><span class="badge ${kindBadge[a.kind] || "badge-muted"}">${esc(a.kind)}</span></div>
    </div>`).join("");
}

/* ================= BOOT ================= */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNav();
  initLive();
  initPNR();
  initTrains();
  initStations();
  renderFavorites();
  renderRecents();
  renderAlerts();

  // API mode badge
  const badge = $("#apiModeBadge");
  if (!IS_DEMO) {
    badge.textContent = "LIVE";
    badge.classList.replace("badge-warn", "badge-ok");
    badge.title = "Using your RapidAPI key";
  }

  // Clear buttons
  $("#clearFavs").addEventListener("click", () => { store.set("favs", []); renderFavorites(); });
  $("#clearRecents").addEventListener("click", () => { store.set("recents", []); renderRecents(); });
});

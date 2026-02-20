const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const STORE_KEY = "lota.espresso.shots.v1";

function uid() { return Math.random().toString(16).slice(2) + Date.now().toString(16); }

function loadShots(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return seedShots();
    const data = JSON.parse(raw);
    if(!Array.isArray(data)) return seedShots();
    return data;
  }catch(e){
    return seedShots();
  }
}
function saveShots(shots){
  localStorage.setItem(STORE_KEY, JSON.stringify(shots));
}

function seedShots(){
  const today = new Date();
  const d = today.toISOString().slice(0,10);
  const shots = [
    { id: uid(), date: d, bean: "Mt Apo", type: "Arabica", roast: "Medium", grind: 35, dose_g: 18.0, yield_g: 30.0, time_s: 25, rating: "Great", notes: "Clean, sweet finish."},
    { id: uid(), date: d, bean: "Mt Apo", type: "Arabica", roast: "Medium", grind: 35, dose_g: 18.0, yield_g: 30.0, time_s: 25, rating: "Good", notes: "Slightly fast; adjust finer next pull."},
  ];
  saveShots(shots);
  return shots;
}

const RATING_STARS = {
  "Great":  "★★★★★",
  "Good":   "★★★★☆",
  "Okay":   "★★★☆☆",
  "Bad":    "★★☆☆☆",
  "Off":    "☆☆☆☆☆",
};

function fmtDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" });
  }catch(e){ return iso; }
}

function avg(arr){
  if(!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function computeKPIs(shots){
  const total = shots.length;
  const goodCount = shots.filter(s => ["Good","Great"].includes(s.rating)).length;
  const avgTime = Math.round(avg(shots.map(s => Number(s.time_s)||0)));
  const lastBean = shots[0]?.bean || "—";
  return { total, goodCount, avgTime, lastBean };
}

function setActiveNav(){
  const route = location.hash.replace("#","") || "home";
  $$(".nav a").forEach(a => {
    const to = a.getAttribute("href").replace("#","");
    if(to === route){
      a.setAttribute("aria-current","page");
    }else{
      a.removeAttribute("aria-current");
    }
  });
}

function render(){
  const route = location.hash.replace("#","") || "home";
  setActiveNav();

  const shots = loadShots().sort((a,b)=> (b.date||"").localeCompare(a.date||""));
  const kpis = computeKPIs(shots);

  // Update top bar pills
  $("#pill-total").textContent = kpis.total;
  $("#pill-lastbean").textContent = kpis.lastBean;

  // Pages
  $$(".page").forEach(p => p.hidden = true);
  const page = $(`[data-route="${route}"]`);
  if(page) page.hidden = false;

  if(route === "home") renderHome(shots, kpis);
  if(route === "new") renderNewLanding(shots);
  if(route === "newform") renderNew(shots);
  if(route === "recent") renderRecent(shots);
  if(route === "weekly") renderWeekly(shots);
  if(route.startsWith("detail")) {
    const id = route.split("/")[1];
    const page = document.querySelector(`[data-route="detail"]`);
    if(page) page.hidden = false;
    renderDetail(shots, id);
  }
}

function renderHome(shots, kpis){
  $("#kpi-total").textContent = kpis.total;
  $("#kpi-good").textContent = kpis.goodCount;
  $("#kpi-avgtime").textContent = kpis.avgTime ? `${kpis.avgTime}s` : "—";

  const recent = shots.slice(0,5);
  const list = $("#home-recent");
  list.innerHTML = "";
  if(!recent.length){
    list.innerHTML = `<div class="card-pad"><p style="margin:0;color:var(--muted)">No shots yet. Tap “New Shot” to log your first pull.</p></div>`;
    return;
  }
  recent.forEach(s => {
    const badgeClass = s.rating === "Great" ? "great" : (s.rating === "Good" ? "good" : (s.rating === "Bad" ? "bad" : ""));
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="meta">
        <b>${s.bean} · ${s.yield_g ?? "—"}g</b>
        <span>${fmtDate(s.date)} · grind ${s.grind} · ${s.time_s}s</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="badge ${badgeClass}">${s.rating} <span class="stars">${RATING_STARS[s.rating] || ""}</span></span>
        <a class="btn small" href="#detail/${s.id}" aria-label="Open shot detail">Open</a>
      </div>
    `;
    list.appendChild(row);
  });
}


function renderNewLanding(shots){
  const kpis = computeKPIs(shots);
  const sumShots = document.getElementById("sum-shots");
  const sumBean  = document.getElementById("sum-bean");
  const sumGood  = document.getElementById("sum-good");
  const sumAve   = document.getElementById("sum-avetime");
  if(sumShots) sumShots.textContent = kpis.total;
  if(sumBean) sumBean.textContent = kpis.lastBean || "—";
  if(sumGood) sumGood.textContent = kpis.goodCount;
  if(sumAve)  sumAve.textContent = kpis.avgTime ? `${kpis.avgTime}s` : "—";
}

function renderNew(shots){
  const form = $("#shot-form");
  form.reset();
  // defaults
  const today = new Date().toISOString().slice(0,10);
  $("#f-date").value = today;
  $("#f-bean").value = shots[0]?.bean || "Mt Apo";
  $("#f-type").value = shots[0]?.type || "Arabica";
  $("#f-roast").value = shots[0]?.roast || "Medium";
  $("#f-grind").value = shots[0]?.grind ?? 35;
  $("#f-dose").value = shots[0]?.dose_g ?? 18;
  $("#f-yield").value = shots[0]?.yield_g ?? 30;
  $("#f-time").value = shots[0]?.time_s ?? 25;
  $("#f-notes").value = "";
  setRating("Great");

  $("#shot-form").onsubmit = (e) => {
    e.preventDefault();
    const rating = $("#f-rating").value || "Off";
    const shot = {
      id: uid(),
      date: $("#f-date").value,
      bean: $("#f-bean").value.trim() || "—",
      type: $("#f-type").value,
      roast: $("#f-roast").value,
      grind: Number($("#f-grind").value),
      dose_g: Number($("#f-dose").value),
      yield_g: Number($("#f-yield").value),
      time_s: Number($("#f-time").value),
      rating,
      notes: $("#f-notes").value.trim(),
    };
    const next = [shot, ...loadShots()];
    saveShots(next);
    location.hash = `detail/${shot.id}`;
  };

  // rating chips
  $$(".chip").forEach(ch => {
    ch.onclick = () => setRating(ch.getAttribute("data-rating"));
  });
}

function setRating(rating){
  $("#f-rating").value = rating;
  $$(".chip").forEach(ch => ch.dataset.active = (ch.getAttribute("data-rating") === rating) ? "true" : "false");
}

function renderRecent(shots){
  const list = $("#recent-list");
  list.innerHTML = "";
  if(!shots.length){
    list.innerHTML = `<div class="card-pad"><p style="margin:0;color:var(--muted)">No shots saved yet.</p></div>`;
    return;
  }
  shots.forEach(s => {
    const badgeClass = s.rating === "Great" ? "great" : (s.rating === "Good" ? "good" : (s.rating === "Bad" ? "bad" : ""));
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="meta">
        <b>${s.bean} · ${s.yield_g ?? "—"}g</b>
        <span>${fmtDate(s.date)} · ${s.rating} · ${s.time_s}s</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="badge ${badgeClass}">${s.rating}</span>
        <a class="btn small" href="#detail/${s.id}">Open</a>
      </div>
    `;
    list.appendChild(row);
  });
}




function renderDetail(shots, id){
  const shot = shots.find(s => s.id === id);
  const wrap = document.getElementById("detail-wrap");
  if(!wrap) return;
  wrap.innerHTML = "";
  if(!shot){
    wrap.innerHTML = `<div class="card card-pad"><p style="margin:0;color:var(--muted)">Shot not found.</p></div>`;
    return;
  }

  const badgeClass = shot.rating === "Great" ? "great" : (shot.rating === "Good" ? "good" : (shot.rating === "Bad" ? "bad" : ""));
  const chips = [
    ["TODAY", fmtDate(shot.date)],
    ["BEAN", shot.bean || "—"],
    ["TYPE", shot.type || "—"],
    ["ROAST", shot.roast || "—"],
  ];

  const art = document.createElement("div");
  art.className = "media-card";
  art.innerHTML = `<img src="./assets/cover-man.png" alt="Lota Kopi character illustration" style="height:300px;object-fit:cover" />`;
  wrap.appendChild(art);

  const chipCard = document.createElement("div");
  chipCard.className = "card";
  chipCard.innerHTML = `
    <div class="card-pad">
      <div class="chipgrid">
        ${chips.map(([k,v]) => `<div class="chipbox">${k} · ${escapeHtml(v)}</div>`).join("")}
      </div>
    </div>
  `;
  wrap.appendChild(chipCard);

  const details = document.createElement("div");
  details.className = "card";
  details.innerHTML = `
    <div class="card-pad">
      <div class="section-title">DETAILS</div>
      <div class="kpis sketch">
        <div class="kpi sketch">
          <div class="label">GRIND</div>
          <div class="value small">${shot.grind ?? "—"}</div>
        </div>
        <div class="kpi sketch">
          <div class="label">DOSE (g)</div>
          <div class="value small">${shot.dose_g ?? "—"}</div>
        </div>
        <div class="kpi sketch">
          <div class="label">YIELD (g)</div>
          <div class="value small">${shot.yield_g ?? "—"}</div>
        </div>
        <div class="kpi sketch">
          <div class="label">TIME (sec)</div>
          <div class="value small">${shot.time_s ?? "—"}</div>
        </div>
      </div>

      <div style="margin-top:16px" class="rating-row">
        <b>RATINGS:</b>
        <span class="badge ${badgeClass}">${shot.rating} <span class="stars">${RATING_STARS[shot.rating] || ""}</span></span>
      </div>

      <div class="field full" style="margin-top:16px">
        <label>NOTES:</label>
        <textarea id="detail-notes" class="notesbox" placeholder="Add tasting notes…">${escapeHtml(shot.notes || "")}</textarea>
      </div>

      <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap">
        <button class="btn primary" id="btn-save">Save</button>
        <button class="btn" id="btn-duplicate">Duplicate</button>
        <button class="btn" id="btn-delete" style="border-color: rgba(179,64,64,.30); color: var(--danger)">Delete</button>
      </div>

      <div style="margin-top:12px">
        <a class="btn block" href="#weekly">WEEK SUMMARY</a>
      </div>
    </div>
  `;
  wrap.appendChild(details);

  document.getElementById("btn-save").onclick = () => {
    const updated = loadShots().map(s => s.id === id ? {...s, notes: document.getElementById("detail-notes").value.trim()} : s);
    saveShots(updated);
    toast("Saved");
  };
  document.getElementById("btn-duplicate").onclick = () => {
    const dupe = {...shot, id: uid(), date: new Date().toISOString().slice(0,10)};
    const updated = [dupe, ...loadShots()];
    saveShots(updated);
    location.hash = `detail/${dupe.id}`;
  };
  document.getElementById("btn-delete").onclick = () => {
    const updated = loadShots().filter(s => s.id !== id);
    saveShots(updated);
    location.hash = "recent";
  };
}


function renderWeekly(shots){
  // group by ISO week (simple: last 7 days)
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  const inRange = shots.filter(s => {
    const d = new Date(s.date);
    return d >= new Date(start.toDateString()) && d <= new Date(now.toDateString());
  });

  $("#week-range").textContent = `${start.toLocaleDateString(undefined,{month:"short",day:"numeric"})} – ${now.toLocaleDateString(undefined,{month:"short",day:"numeric"})}`;

  $("#wk-total").textContent = inRange.length;
  $("#wk-avgtime").textContent = inRange.length ? `${Math.round(avg(inRange.map(s=>Number(s.time_s)||0)))}s` : "—";
  const best = inRange.filter(s=>s.rating==="Great").length;
  $("#wk-great").textContent = best;

  // mini bars per day
  const bars = $("#wk-bars");
  bars.innerHTML = "";
  const days = [];
  for(let i=0;i<7;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    const iso = d.toISOString().slice(0,10);
    const count = inRange.filter(s => s.date === iso).length;
    days.push({d, iso, count});
  }
  const max = Math.max(1, ...days.map(x=>x.count));
  days.forEach(({d,count})=>{
    const item = document.createElement("div");
    item.style.display="grid";
    item.style.gap="6px";
    item.style.alignItems="end";
    item.innerHTML = `
      <div style="height:${Math.max(8, (count/max)*74)}px; border-radius:10px; background: rgba(178,106,60,.22); border:1px solid rgba(178,106,60,.25)"></div>
      <div style="font-size:12px;color:var(--muted); text-align:center">${d.toLocaleDateString(undefined,{weekday:"short"}).slice(0,2)}</div>
    `;
    bars.appendChild(item);
  });
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// simple toast
let toastTimer = null;
function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  t.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{
    t.style.opacity = "0";
    setTimeout(()=>{ t.hidden = true; }, 250);
  }, 1200);
}

window.addEventListener("hashchange", render);
window.addEventListener("load", () => {
  // register service worker
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
  // first route
  if(!location.hash) location.hash = "home";
  render();
});

// ---------- Clash-style menus (October 2026 layout) ----------
// Battle hub (bottom left): Play · Army · Recipes · Log.  Build hub (bottom right): Buildings · Heroes · Research · Shop.
// Builder Menu (tap 👷), Profile (tap your badge) with Achievements + Settings, Pass, Events tray,
// weekly Ranked leagues, saved army Recipes. Graphics are placeholders: Codex swaps them in via art/ui/ (see uiArt below).

// ---------- placeholder art hook ----------
// uiArt("battle","⚔️") draws the emoji now; when art/ui/battle.webp is in art/manifest.json the picture replaces it.
const uiArtFiles = new Set();
const uiArt = (name, fallback) => `<i class="uia" data-ui="${name}">${fallback}</i>`;
// Light mode (default): bright Clash-style "colour pop". Dark mode: Codex's dark "Scoreboard" style with his dark button tiles.
const DARK_ONLY = new Set(["profile-badge", "profile-banner"]);
const getTheme = () => { try { return localStorage.getItem("ffTheme") === "dark" ? "dark" : "light"; } catch (e) { return "light"; } };
function applyTheme() {
  const dark = getTheme() === "dark" && uiArtFiles.has("art/ui/ff-panel-tile.webp");
  document.body.classList.toggle("ffui", dark);
  document.querySelectorAll("[data-uibg]").forEach(el => { delete el.dataset.uiDone; el.style.backgroundImage = ""; el.classList.remove("uibg"); });
  applyUiArt();
}
function setTheme(t) { try { localStorage.setItem("ffTheme", t); } catch (e) {} applyTheme(); }
// Reuse existing art in new spots until Codex paints their own (their own file wins when it exists)
const UI_ALIAS = { "vem-wrench": "ico-build", "vem-pencil": "ico-recipes", "ico-layouts": "ico-recipes", "ico-copy": "ico-recipes", "ico-search": "ico-battle" };
const uiFile = n => { const f = "art/ui/" + n + ".webp"; return uiArtFiles.has(f) || !UI_ALIAS[n] ? f : "art/ui/" + UI_ALIAS[n] + ".webp"; };
function applyUiArt(root = document) {
  if (!uiArtFiles.size) return;
  const dark = document.body.classList.contains("ffui");
  root.querySelectorAll("[data-ui]:not([data-ui-done])").forEach(el => {
    const f = uiFile(el.dataset.ui); el.dataset.uiDone = 1;
    if (uiArtFiles.has(f)) el.innerHTML = `<img src="${f}" alt="">`;
  });
  root.querySelectorAll("[data-uibg]:not([data-ui-done])").forEach(el => {
    const f = "art/ui/" + el.dataset.uibg + ".webp"; el.dataset.uiDone = 1;
    if (DARK_ONLY.has(el.dataset.uibg) && !dark) return;
    if (uiArtFiles.has(f)) { el.style.backgroundImage = `url("${f}")`; el.classList.add("uibg"); }
  });
}
(function loadUiArt() {
  artManifest.then(m => {
    for (const f of (m && m.files) || []) if (typeof f === "string" && f.startsWith("art/ui/")) uiArtFiles.add(f);
    applyTheme();
    new MutationObserver(() => applyUiArt()).observe(document.body, { childList: true, subtree: true });
  }).catch(() => {});
})();

// ---------- hubs: a row of big tabs on top of the existing screens ----------
let hubCtx = null;
const HUBS = {
  battle: { title: "Battle", tabs: [["Play", "⚔️", () => openMatch(), "ico-battle"], ["Army", "🏉", () => openSquad("Train"), "ico-army"], ["Recipes", "📋", () => openRecipes(), "ico-recipes"], ["Log", "🛡️", () => openLog(), "ico-log"]] },
  build: { title: "Build", tabs: [["Buildings", "🏗️", () => openShop(shopTab === "Deals" ? "Resources" : shopTab), "ico-build"], ["Heroes", "⭐", () => openSquad("Heroes"), "tab-heroes"], ["Research", "🔬", () => openSquad("Coaching"), "tab-research"], ["Shop", "🛒", () => openShop("Deals"), "ico-shop"]] },
};
function openHub(kind, tab) { menuBack = null;
  const H = HUBS[kind]; tab = tab || H.tabs[0][0];
  hubCtx = { kind, tab };
  H.tabs.find(t => t[0] === tab)[2]();
}
function hubBarHTML() {
  if (!hubCtx) return "";
  const H = HUBS[hubCtx.kind];
  const unread = unreadRaids(), dark = getTheme() === "dark";
  return `<div class="hubbar menu-banner" data-uibg="hub-${hubCtx.kind}"><b class="hubtitle">${H.title}</b></div><div class="hubtabs">${H.tabs.map(([k, e, , icon]) => {
    const on = k === hubCtx.tab, count = k === "Log" ? unread : 0;
    return `<button class="${on ? "on" : ""}" aria-pressed="${on}" ${count ? `aria-label="Log, ${count} unread"` : ""} data-hub="${k}">${uiArt(dark ? "tab-" + k.toLowerCase() : icon, e)}<span>${k}</span>${count ? `<i class="dot" aria-hidden="true">${count}</i>` : ""}</button>`;
  }).join("")}</div>`;
}
// the inner tabs each screen shows inside a hub (so the same tab isn't offered twice)
const squadTabsFor = () => !hubCtx ? ["Train", "Spells", "Heroes", "Coaching"] : hubCtx.kind === "battle" ? ["Train", "Spells", "Heroes"] : [];
const shopTabsFor = () => !hubCtx ? Object.keys(SHOP_TABS) : hubCtx.tab === "Shop" ? [] : Object.keys(SHOP_TABS).filter(t => t !== "Deals");
function bindHubBar() {
  document.querySelectorAll("[data-hub]").forEach(b => b.onclick = () => { sfx("tap", .4); openHub(hubCtx.kind, b.dataset.hub); });
}

// ---------- Builder Menu: every job your groundskeepers are on, and what to do next ----------
function openBuilders() { menuBack = null;
  hubCtx = null;
  const now = Date.now(), jobs = [];
  for (const b of S.buildings) if (b.busy && b.busy.total > 0) jobs.push({ name: BLD[b.t].name, what: b.busy.kind === "build" ? "Building" : `Upgrading to level ${b.lv + 1}`, end: b.busy.end, go: b });
  for (const [h, st] of Object.entries(S.heroes)) if (st.busy) jobs.push({ name: heroStats(h).name, what: `Training to level ${st.lv + 1}`, end: st.busy.end, hero: h });
  for (const o of S.obstacles) if (o.busy) jobs.push({ name: obsInfo(o).name, what: "Clearing", end: o.busy.end, go: o });
  const free = sheds() - busyBuilders();
  const sugg = S.buildings.filter(b => !b.busy && BLD[b.t] && !BLD[b.t].trap && b.t !== "fence").map(b => ({ b, u: upgradeInfo(b) }))
    .filter(x => x.u.ok).sort((a, c) => (a.b.t === "clubhouse") - (c.b.t === "clubhouse") || a.u.cost - c.u.cost).slice(0, 6);
  let h = `<h2>Groundskeepers</h2><div class="center">👷 <b>${free}</b> free of ${sheds()}</div>`;
  h += `<h3>Working on</h3>` + (jobs.length ? `<div class="fixture">${jobs.map((j, i) => `<div class="fx bjob" data-job="${i}"><span class="nm"><b>${j.name}</b><br><small>${j.what} · ${fmtTime(Math.max(0, (j.end - now) / 1000))}</small></span><button class="btn green" data-speed="${i}">Finish · ${speedCost(j.end)} 🏅</button></div>`).join("")}</div>` : `<p class="center tiny">Nobody's working. Get them busy!</p>`);
  if (S.research) h += `<div class="fx"><span class="nm"><b>Coaches Box</b><br><small>Researching ${UNITS[S.research.u].name} · ${fmtTime(Math.max(0, (S.research.end - now) / 1000))}</small></span></div>`;
  h += `<h3>Suggested upgrades</h3>` + (sugg.length ? `<div class="fixture">${sugg.map((x, i) => `<div class="fx bsug" data-sug="${i}"><img class="bthumb" src="${thumb(x.b.t, myClub(), x.b.lv).toDataURL()}" alt=""><span class="nm"><b>${BLD[x.b.t].name}</b><br><small>Level ${x.b.lv} → ${x.b.lv + 1}${x.u.time ? " · " + fmtTime(x.u.time) : ""}</small></span><span class="cost ${S[x.u.res] >= x.u.cost ? "" : "bad"}">${fmt(x.u.cost)} ${resIcon(x.u.res)}</span></div>`).join("")}</div>` : `<p class="center tiny">Everything is maxed for your Clubhouse. Upgrade the Clubhouse!</p>`);
  h += `<div class="center"><button class="btn gold" id="hireMore">👷 Hire another (Build → Buildings)</button></div>`;
  modal(h, { tick: () => { if ($("modal").classList.contains("show") && document.querySelector(".bjob")) openBuilders(); } });
  const goTo = o => { closeModal(); selected = o; const s = o.s || (BLD[o.t] ? BLD[o.t].size : 1); centreOn(o.x + s / 2, o.y + s / 2); refreshUI(); };
  document.querySelectorAll("[data-job]").forEach(el => el.onclick = e => { if (e.target.closest("[data-speed]")) return; const j = jobs[+el.dataset.job]; if (j.go) goTo(j.go); else { closeModal(); openHub("build", "Heroes"); } });
  document.querySelectorAll("[data-speed]").forEach(b => b.onclick = () => { const j = jobs[+b.dataset.speed], c = speedCost(j.end);
    if (!pay("medals", c)) return toast("Not enough Brownlow votes 🏅");
    if (j.go) j.go.busy.end = Date.now(); else S.heroes[j.hero].busy.end = Date.now(); processTimers(); save(); openBuilders(); });
  document.querySelectorAll("[data-sug]").forEach(el => el.onclick = () => goTo(sugg[+el.dataset.sug].b));
  $("hireMore").onclick = () => { closeModal(); openHub("build", "Buildings"); };
}

// ---------- stats + achievements ----------
function bumpStat(k, n) { S.stats = S.stats || {}; S.stats[k] = (S.stats[k] || 0) + n; }
const ACH = [
  { k: "win", name: "Sweet Victory", desc: n => `Win ${fmt(n)} matches`, goals: [10, 100, 1000] },
  { k: "destroy", name: "Wrecking Ball", desc: n => `Knock down ${fmt(n)} buildings`, goals: [100, 1000, 10000] },
  { k: "stars", name: "Star Player", desc: n => `Win ${fmt(n)} stars`, goals: [25, 250, 2500] },
  { k: "defend", name: "Home Ground Advantage", desc: n => `Hold off ${fmt(n)} attacks`, goals: [5, 50, 500] },
  { k: "upgrade", name: "Builder", desc: n => `Finish ${fmt(n)} upgrades`, goals: [10, 100, 500] },
  { k: "clear", name: "Groundskeeper", desc: n => `Clear ${fmt(n)} obstacles`, goals: [10, 50, 200] },
  { k: "pack", name: "Pack Rat", desc: n => `Open ${fmt(n)} card packs`, goals: [5, 50, 200] },
  { k: "cards", name: "Card Collector", desc: n => `Collect ${n} different cards`, goals: [25, 100, 198], val: () => albumCount(c => !c.special)[0] },
  { k: "th", name: "Clubhouse Pride", desc: n => `Reach Clubhouse level ${n}`, goals: [3, 5, 8], val: () => th() },
  { k: "prem", name: "Premiers", desc: n => `Win ${n} premiership${n > 1 ? "s" : ""}`, goals: [1, 3, 10], val: () => S.premierships || 0 },
];
const ACH_VOTES = [5, 10, 20];
const achVal = a => a.val ? a.val() : ((S.stats || {})[a.k] || 0);
const achDone = a => { const v = achVal(a); return a.goals.filter(g => v >= g).length; };
const achClaimed = a => (S.ach || {})[a.k] || 0;
const achReady = () => ACH.filter(a => achDone(a) > achClaimed(a)).length;
function claimAch(a) {
  S.ach = S.ach || {}; const t = achClaimed(a); if (achDone(a) <= t) return;
  S.ach[a.k] = t + 1; S.medals += ACH_VOTES[t]; addXP(10 * (t + 1)); sfx("cheer"); toast(`+${ACH_VOTES[t]} 🏅 · ${a.name} ${"★".repeat(t + 1)}`); save();
}

// ---------- Profile: tap your club badge ----------
function openProfile(tab = "Profile") { menuBack = null;
  hubCtx = null;
  const c = myClub(), st = S.stats || {}, online = typeof signedIn === "function" && signedIn();
  const header = `<div class="profhead menu-banner" data-uibg="profile-banner">${badgeImg(c)}<div><b>${online ? esc(NET.user.name) : c.name}</b><small>${c.name} · Level ${S.lvl}</small></div></div>${tabsHTML(["Profile", "Achievements", "Settings"], tab)}`;
  let h = "";
  if (tab === "Profile") {
    ensureRanked();
    h += `<div class="xpbar"><span>⭐ Level ${S.lvl}</span><i><b style="width:${100 * (S.xp || 0) / xpNeed(S.lvl)}%"></b></i><span>${S.xp || 0}/${xpNeed(S.lvl)} XP</span></div>
      <div class="profgrid">
        <div><b>🏆 ${S.trophies}</b><small>Trophies</small></div><div><b>${rkBadge(S.rk.tier)} ${rkName(S.rk.tier)}</b><small>Ranked league</small></div>
        <div><b>${fmt(st.win || 0)}</b><small>Matches won</small></div><div><b>${fmt(st.stars || 0)}</b><small>Stars won</small></div>
        <div><b>${fmt(st.defend || 0)}</b><small>Defences won</small></div><div><b>${fmt(st.destroy || 0)}</b><small>Buildings knocked down</small></div>
        <div><b>${albumCount(x => !x.special)[0]}/198</b><small>Cards</small></div><div><b>${S.premierships || 0}</b><small>Premierships</small></div>
      </div>
      <div class="center"><button class="btn blue" id="pLog">🛡️ Battle Log</button> <button class="btn ${online ? "" : "green"}" id="pAcct">${online ? "🏟️ Online" : "Play online"}</button></div>`;
  } else if (tab === "Achievements") {
    h += `<div class="achlist">${ACH.map((a, i) => { const done = achDone(a), cl = achClaimed(a), next = a.goals[Math.min(cl, 2)], v = achVal(a);
      return `<div class="ach"><div class="achstars">${[0, 1, 2].map(s => `<i class="${s < cl ? "on" : s < done ? "ready" : ""}">★</i>`).join("")}</div><div class="grow"><b>${a.name}</b><small>${a.desc(next)}</small>
        <div class="bar"><div style="width:${Math.min(100, 100 * v / next)}%"></div></div><small>${fmt(Math.min(v, next))} / ${fmt(next)}</small></div>
        ${cl >= 3 ? "✅" : done > cl ? `<button class="btn green" data-ach="${i}">+${ACH_VOTES[cl]} 🏅</button>` : `<span class="tiny">${ACH_VOTES[cl]} 🏅</span>`}</div>`; }).join("")}</div>`;
  } else { openSettings(header); bindTabs(openProfile); return; }
  modal(h, {header});
  bindTabs(t => openProfile(t));
  document.querySelectorAll("[data-ach]").forEach(b => b.onclick = () => { claimAch(ACH[+b.dataset.ach]); openProfile("Achievements"); });
  const pl = $("pLog"); if (pl) pl.onclick = () => openHub("battle", "Log");
  const pa = $("pAcct"); if (pa) pa.onclick = sub(() => online ? openSocial() : openAccount(), () => openProfile());
}

// ---------- weekly Ranked leagues (like Clash's Ranked Battles) ----------
// Join a group of 30 clubs in your league each week. Limited attacks, trophies can't be lost during the week,
// the top 40% go up a league and the bottom 10% go down. No "Next": confirm your army, then play.
const RK_LEAGUES = [["Auskick", 6], ["Under-12s", 6], ["Under-18s", 8], ["Local Footy", 8], ["State League", 10], ["VFL", 10], ["Reserves", 12], ["AFL", 12], ["All-Australian", 15], ["Hall of Fame", 20]];
const RK_TIERS = RK_LEAGUES.length * 3;
const rkName = t => t >= RK_TIERS - 1 ? "Hall of Fame Legend" : `${RK_LEAGUES[Math.floor(t / 3)][0]} ${t + 1}`;
// League badge: art/ui/league-1..10 when Codex's art is loaded, else a trophy
const rkBadge = (t, cls = "") => `<i class="uia lgb ${cls}" data-ui="league-${Math.min(RK_LEAGUES.length, Math.floor(t / 3) + 1)}">🏆</i>`;
const rkAttacks = t => RK_LEAGUES[Math.min(RK_LEAGUES.length - 1, Math.floor(t / 3))][1];
const rkFloor = () => Math.min(RK_TIERS - 4, Math.max(0, (th() - 1) * 3 - 3)); // your Clubhouse sets your lowest league
const RK_EPOCH = Date.UTC(2026, 0, 5); // a Monday
const weekId = (t = Date.now()) => Math.floor((t - RK_EPOCH) / 6048e5);
const weekEnds = () => RK_EPOCH + (weekId() + 1) * 6048e5;
const RK_NAMES = ["FootyTipsFran", "Sherrin_Sam", "BoundaryBev", "SpeckyKing", "TorpedoTom", "HangerHarry", "BehindPost", "ChewOnIt", "PieFloater", "ThreeQtrTime", "UmpireBait", "ScreamerSue", "MongrelMick", "TaggerTess", "RuckRover", "CrumbingCraig", "GoalSneak", "WingWizard", "FullBackFred", "Banana_Ben", "CheerSquadCass", "SirenSal", "HandballHank", "DropPuntDan", "SpoilSpecialist", "KickOutKev", "BombItBazza", "DoggiesDiehard", "MagpieMarnie"];
function rkGroup(week, tier) {
  const r = rng(week * 131 + tier * 7 + (S.club || 0));
  return RK_NAMES.map(n => ({ name: n, club: r() * 18 | 0, skill: .35 + r() * .75 }));
}
function rkBotTro(b, tier, frac) { return Math.round(b.skill * rkAttacks(tier) * 26 * Math.min(1, Math.max(0, frac))); }
function rkTable(frac) {
  const rk = S.rk, rows = rkGroup(rk.week, rk.tier).map(b => ({ ...b, tro: rkBotTro(b, rk.tier, frac) }));
  rows.push({ name: (typeof signedIn === "function" && signedIn()) ? NET.user.name : myClub().name, club: S.club, tro: rk.tro, me: true });
  return rows.sort((a, b) => b.tro - a.tro || (a.me ? -1 : 1));
}
function ensureRanked() {
  const wk = weekId();
  if (!S.rk) S.rk = { week: wk, tier: rkFloor(), attacks: 0, tro: 0 };
  if (S.rk.tier < rkFloor()) S.rk.tier = rkFloor();
  if (S.rk.week !== wk) { // the week is over: promote or demote
    const tbl = rkTable(1), pos = tbl.findIndex(r => r.me) + 1, n = tbl.length, from = S.rk.tier;
    let to = from;
    if (S.rk.attacks > 0 && pos <= Math.ceil(n * .4)) to = Math.min(RK_TIERS - 1, from + 1);
    else if (pos > n - Math.ceil(n * .1)) to = Math.max(rkFloor(), from - 1);
    S.rk = { week: wk, tier: to, attacks: 0, tro: 0, last: { pos, n, from, to } };
    save();
  }
  return S.rk;
}
// Clash's Ranked trophies: 3 stars = 40, 2 stars 16-32, 1 star 5-15, 0 stars up to 4. Never negative.
function rankedTrophies(stars, pct) {
  if (stars >= 3) return 40;
  if (stars === 2) return Math.min(32, 16 + Math.max(0, Math.floor((pct - 50) / 3)));
  if (stars === 1) return Math.min(15, 5 + Math.floor(pct / 9));
  return pct >= 10 ? Math.min(4, Math.floor(pct / 10)) : 0;
}
function rankedConfirm(go) {
  const rk = ensureRanked(), left = rkAttacks(rk.tier) - rk.attacks;
  if (left <= 0) return toast(`No Ranked attacks left this week. New week in ${fmtTime((weekEnds() - Date.now()) / 1000)}.`);
  const army = Object.entries(S.army).filter(([, n]) => n > 0);
  modal(`<h2>Ranked Battle</h2><div class="center">${rkBadge(rk.tier)} ${rkName(rk.tier)} · attack ${rk.attacks + 1} of ${rkAttacks(rk.tier)}</div>
    <p class="center tiny">There's no Next in Ranked: once you go in, the attack counts. Trophies can't be lost this week.</p>
    <div class="rkarmy">${army.map(([u, n]) => `<span><img src="${playerIcon(u)}" alt="">×${n}</span>`).join("") || "No players!"}</div>
    <div class="center"><button class="btn" id="rkEdit">Edit Army</button> <button class="btn blue big" id="rkGo">🏆 Attack</button></div>`);
  $("rkEdit").onclick = () => openHub("battle", "Army");
  $("rkGo").onclick = () => { if (!army.length) return toast("Train some players first!"); go(); };
}
function openRankedTable() {
  const rk = ensureRanked(), tbl = rkTable((Date.now() - (RK_EPOCH + rk.week * 6048e5)) / 6048e5), n = tbl.length, up = Math.ceil(n * .4), down = n - Math.ceil(n * .1);
  let h = `<div class="center">${rkBadge(rk.tier, "big")}</div><h2>${rkName(rk.tier)}</h2><div class="center tiny">Week ends in ${fmtTime((weekEnds() - Date.now()) / 1000)} · ${rkAttacks(rk.tier) - rk.attacks} of ${rkAttacks(rk.tier)} attacks left</div>
    <div class="ladwrap"><table class="ladder"><tr><th>#</th><th></th><th>Club</th><th>🏆</th></tr>${tbl.map((r, i) =>
    `<tr class="${r.me ? "me" : ""} ${i === up - 1 ? "cut" : ""} ${i === down - 1 ? "cutdn" : ""}"><td>${i + 1}${i < up ? " ⬆" : i >= down ? " ⬇" : ""}</td><td>${badgeImg(CLUBS[r.club], "xs")}</td><td>${esc(r.name)}</td><td><b>${r.tro}</b></td></tr>`).join("")}</table></div>
    <p class="tiny center">Top ${up} move up a league, bottom ${n - down} move down. Each attack earns up to 40 trophies: 3 stars = 40.</p><div class="center"><button class="btn" id="rkBack">Back</button></div>`;
  modal(h); $("rkBack").onclick = () => menuBack ? goBack() : openHub("battle", "Play");
}

// ---------- Army Recipes: save squads and load them in one tap ----------
function openRecipes() {
  S.recipes = S.recipes || [];
  const desc = r => Object.entries(r.army).map(([u, n]) => `<span><img src="${playerIcon(u)}" alt="">×${n}</span>`).join("") + Object.entries(r.spells || {}).map(([s, n]) => `<span><img src="${spellIcon(s)}" alt="">×${n}</span>`).join("");
  let h = `<h2>Army Recipes</h2><p class="center tiny">Save your favourite squads and load them in one tap. Training is free, so a recipe fills your bench instantly.</p>
    <div class="fixture">${S.recipes.map((r, i) => `<div class="fx recipe"><span class="nm"><b>${esc(r.name)}</b><div class="rkarmy">${desc(r)}</div></span><div class="col"><button class="btn green" data-use="${i}">Use</button><button class="btn red" data-del="${i}">✖</button></div></div>`).join("") || `<p class="center">No recipes yet.</p>`}</div>
    <div class="center">${S.recipes.length < 6 ? `<button class="btn gold" id="saveRecipe">💾 Save current army</button>` : `<span class="tiny">6 recipes max. Delete one to save another.</span>`}</div>`;
  modal(h);
  const sv = $("saveRecipe"); if (sv) sv.onclick = () => {
    if (!Object.values(S.army).some(n => n > 0)) return toast("Your army is empty. Add players in Army first.");
    S.recipes.push({ name: "Recipe " + (S.recipes.length + 1), army: { ...S.army }, spells: { ...S.spells }, heroes: heroPicked() }); save(); openRecipes(); };
  document.querySelectorAll("[data-use]").forEach(b => b.onclick = () => { const r = S.recipes[+b.dataset.use];
    S.army = {}; fillSquad(r.army); S.spells = {}; for (const [k, n] of Object.entries(r.spells || {})) for (let i = 0; i < n && spellCount() < spellSlots(); i++) S.spells[k] = (S.spells[k] || 0) + 1;
    if (r.heroes) S.heroPick = r.heroes.filter(hk => heroHome(hk));
    save(); toast(`${r.name} loaded`); sfx("tap"); openRecipes(); });
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Sure?"; return; } S.recipes.splice(+b.dataset.del, 1); save(); openRecipes(); });
}

// ---------- Footy Pass (our Gold Pass: free) ----------
const PASS_TIERS = 30, PASS_PER = 60;
const passId = () => { const d = new Date(); return d.getFullYear() * 100 + d.getMonth() + 1; };
const passEnds = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); };
const PASS_PTS = { win: 10, destroy: 1, upgrade: 5, pack: 5, defend: 5, clear: 2, task: 20 };
function ensurePass() { if (!S.pass || S.pass.id !== passId()) S.pass = { id: passId(), pts: 0, got: [] }; return S.pass; }
function passReward(i) {
  const k = i % 5, m = 1 + Math.floor(i / 5) * .5;
  return [{ pies: Math.round(400 * m * th() * th() * th() + 1000) }, { drink: Math.round(400 * m * th() * th() * th() + 1000) }, { tokens: 1 + (i >= 20 ? 1 : 0) }, { tape: Math.round(60 * m) }, { medals: i === PASS_TIERS - 1 ? 50 : 5 }][k];
}
const rewardText = r => r.pies ? `${fmt(r.pies)} 🥧` : r.drink ? `${fmt(r.drink)} 💧` : r.tokens ? `${r.tokens} 🎟️` : r.tape ? `${r.tape} 🩹` : `${r.medals} 🏅`;
function giveReward(r) { if (r.pies) addRes("pies", r.pies); if (r.drink) addRes("drink", r.drink); if (r.tokens) earnTokens(r.tokens); if (r.tape) addOre({ tape: r.tape }); if (r.medals) S.medals += r.medals; }
const passReady = () => { const p = ensurePass(), t = Math.min(PASS_TIERS, Math.floor(p.pts / PASS_PER)); let n = 0; for (let i = 0; i < t; i++) if (!p.got.includes(i)) n++; return n; };
// Red dots on the Rewards / Challenges tabs, like the Pass button's dot
function passTabDots(){ const n={Rewards:passReady()||0, Challenges:tasksReady()||0};
  for(const [k,v] of Object.entries(n)){ const t=document.querySelector(`[data-tab="${k}"]`); if(t&&v&&!t.querySelector(".dot")){ t.style.position="relative"; t.insertAdjacentHTML("beforeend",`<i class="dot">${v}</i>`); } } }
function openPass(tab) { menuBack = null;
  if (!tab) tab = !passReady() && tasksReady() ? "Challenges" : "Rewards"; // open on whichever tab has something waiting
  hubCtx = null; const p = ensurePass(), tier = Math.min(PASS_TIERS, Math.floor(p.pts / PASS_PER));
  const header = `<div class="passhead menu-banner" data-uibg="pass-banner"><b>Footy Pass</b><small>Ends in ${fmtTime((passEnds() - Date.now()) / 1000)}</small></div>${tabsHTML(["Rewards", "Challenges"], tab)}`;
  if (tab === "Challenges") { openTasks(header); bindTabs(openPass); passTabDots(); return; }
  const h = `<div class="xpbar"><span>Tier ${tier}</span><i><b style="width:${tier >= PASS_TIERS ? 100 : 100 * (p.pts % PASS_PER) / PASS_PER}%"></b></i><span>${p.pts} pts</span></div>
    <p class="tiny center">Earn points from wins (+10), knock-downs (+1), upgrades (+5), packs (+5), defences (+5) and daily challenges (+20).</p>
    <div class="passtrack">${Array.from({ length: PASS_TIERS }, (_, i) => { const r = passReward(i), open = i < tier, got = p.got.includes(i);
      return `<div class="ptier ${open ? "open" : ""} ${got ? "got" : ""}"><small>${i + 1}</small><b>${rewardText(r)}</b>${got ? "✅" : open ? `<button class="btn green" data-pt="${i}">Claim</button>` : `<span class="tiny">${(i + 1) * PASS_PER} pts</span>`}</div>`; }).join("")}</div>`;
  modal(h, {header}); bindTabs(openPass); passTabDots();
  document.querySelectorAll("[data-pt]").forEach(b => b.onclick = () => { const i = +b.dataset.pt; if (p.got.includes(i)) return; p.got.push(i); giveReward(passReward(i)); sfx("collect"); save(); openPass(); });
}
function passPoints(k, n) { const v = PASS_PTS[k]; if (!v || !S) return; ensurePass().pts += v * n; }

// ---------- Events tray ----------
function openEvents() { menuBack = null;
  hubCtx = null; const e = eventNow(), sb = S.starBonus || { stars: 0, until: 0 }, rk = ensureRanked(), p = ensurePass();
  updateEventBadge(true);
  const card = (icon, title, body, btn) => `<div class="evcard">${uiArt(icon, { "ev-today": "🎉", "ev-star": "⭐", "ev-ranked": "🏆", "ev-pass": "🎫", "ev-afl": "🏉" }[icon] || "⏳")}<div class="grow"><b>${title}</b><small>${body}</small></div>${btn || ""}</div>`;
  let h = card("ev-today", e ? "Today: " + e.name : "No event today", e ? e.desc : "Check back tomorrow");
  h += card("ev-star", "Star Bonus", sb.until > Date.now() ? `Ready again in ${fmtTime((sb.until - Date.now()) / 1000)}` : `${Math.min(sb.stars, STAR_GOAL)}/${STAR_GOAL} stars`, `<button class="btn gold" data-go="play">Play</button>`);
  h += card("ev-ranked", rkBadge(rk.tier) + " " + rkName(rk.tier), `${rkAttacks(rk.tier) - rk.attacks} attacks left · week ends in ${fmtTime((weekEnds() - Date.now()) / 1000)}`, `<button class="btn blue" data-go="rk">Table</button>`);
  h += card("ev-pass", "Footy Pass", `Tier ${Math.min(PASS_TIERS, Math.floor(p.pts / PASS_PER))} · ${passReady()} to claim`, `<button class="btn green" data-go="pass">Open</button>`);
  h += card("ev-afl", "AFL season", seasonCountdown().replace("🏉 ", "Starts in "));
  // Timed events: built, switched off for now
  h += `<h3>Special events <span class="soonpill">COMING SOON</span></h3>` + TIMED_EVENTS.map(ev => card("ev-" + ev.id, ev.name, `${ev.desc} · ${ev.days} days`)).join("");
  h += `<h3>This week</h3>${[1, 2, 3, 4, 5, 6, 0].map(d => { const ev = EVENTS[d], nm = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]; return `<div class="stat ${d === new Date().getDay() ? "today" : ""}"><span>${nm}</span><b>${ev ? ev.name + " · " + ev.desc : "–"}</b></div>`; }).join("")}`;
  modal(h, {header:'<div class="menu-banner menu-title">Events</div>'});
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => ({ play: () => openHub("battle", "Play"), rk: sub(() => { hubCtx = null; openRankedTable(); }, openEvents), pass: () => openPass() })[b.dataset.go]());
}

// ---------- rotation: phones stay portrait; tablets and computers stay landscape ----------
const isPhone = () => Math.min(screen.width, screen.height) < 600;
function checkOrientation() {
  const want = isPhone() ? "portrait" : "landscape";
  try { if (screen.orientation?.lock && (isStandalone() || document.fullscreenElement)) screen.orientation.lock(want).catch(() => {}); } catch (e) {}
  const land = innerWidth > innerHeight, wrong = want === "portrait" ? land : (!land && "ontouchstart" in window);
  $("rotateMsg").classList.toggle("hide", !wrong);
  $("rotateMsg").querySelector("b").textContent = want === "portrait" ? "Turn your phone upright" : "Turn your tablet sideways";
}
addEventListener("resize", checkOrientation); addEventListener("orientationchange", () => setTimeout(checkOrientation, 200));
setTimeout(checkOrientation, 50);

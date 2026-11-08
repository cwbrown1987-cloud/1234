// ---------- Online play: accounts, cloud saves, real opponents, Home Games inbox, leaderboard, cheer squads ----------
const NET = { online: location.protocol.startsWith("http"), token: null, user: null, bots: [], syncT: null, lastPush: 0, busy: false };
const TOKEN_KEY = "ffSession";
try { const t = JSON.parse(localStorage.getItem(TOKEN_KEY) || "null"); if (t) { NET.token = t.token; NET.user = t.user; } } catch (e) {}
const signedIn = () => !!(NET.online && NET.token);

async function api(path, opts = {}) {
  const res = await fetch("/api" + path, { method: opts.method || "GET", headers: { "content-type": "application/json", ...(NET.token ? { authorization: "Bearer " + NET.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined, keepalive: !!opts.keepalive });
  let data = {}; try { data = await res.json(); } catch (e) {}
  if (res.status === 401 && NET.token && !opts.noAuthReset) { signOutLocal(); toast("Please sign in again."); }
  if (!res.ok) throw new Error(data.error || "Couldn't reach the server.");
  return data;
}
function storeSession(token, user) { NET.token = token; NET.user = user; try { localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, user })); } catch (e) {} uiDirty = true; }
function signOutLocal() { NET.token = null; NET.user = null; try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} uiDirty = true; }

// ---------- what other players see when they attack you ----------
function publicBase() {
  return homeBattleBase().map(b => { const o = { t: b.t, x: b.x, y: b.y, lv: b.lv, hp: b.hp, max: b.max }; if (b.loot) o.loot = b.loot; if (b.armed) o.armed = true; return o; });
}
function pushSave(opts = {}) {
  if (!signedIn() || !S) return;
  NET.lastPush = Date.now();
  return api("/save", { method: "PUT", keepalive: !!opts.keepalive, body: { data: S, profile: { club: S.club, th: th(), trophies: S.trophies, shield: S.shield || 0, base: publicBase() } } }).catch(() => {});
}
function scheduleSync() { if (!signedIn()) return; clearTimeout(NET.syncT); NET.syncT = setTimeout(pushSave, 15000); }
addEventListener("visibilitychange", () => { if (document.hidden && signedIn() && S) pushSave({ keepalive: true }); });

// ---------- sign in / sign up ----------
function openAccount(tab = "Create account") {
  if (!NET.online) return toast("Online play works on the website: ff.backyardlegendsgames.app");
  const tabs = ["Create account", "Sign in", "Forgot password"];
  let h = `<h2>Play online</h2><p class="center tiny">Save your club to the cloud, play on any device, attack real players and join a Cheer Squad. Free.</p>${tabsHTML(tabs, tab)}<form id="acct" class="acct" autocomplete="on">`;
  if (tab === "Create account") h += `<label>Email<input id="aEmail" type="email" autocomplete="email" required></label>
    <label>Display name <small>(shown on the leaderboard)</small><input id="aName" maxlength="16" autocomplete="nickname" required></label>
    <label>Password <small>(6+ characters)</small><input id="aPass" type="password" autocomplete="new-password" minlength="6" required></label>
    <button class="btn green big" type="submit">Create account</button>`;
  if (tab === "Sign in") h += `<label>Email<input id="aEmail" type="email" autocomplete="email" required></label>
    <label>Password<input id="aPass" type="password" autocomplete="current-password" required></label>
    <button class="btn green big" type="submit">Sign in</button>`;
  if (tab === "Forgot password") h += `<p class="tiny">Use the recovery code you saved when you made your account.</p>
    <label>Email<input id="aEmail" type="email" autocomplete="email" required></label>
    <label>Recovery code<input id="aCode" placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX" required></label>
    <label>New password<input id="aPass" type="password" autocomplete="new-password" minlength="6" required></label>
    <button class="btn green big" type="submit">Reset password</button>`;
  h += `<p class="err" id="aErr"></p></form>`;
  modal(h); bindTabs(openAccount);
  $("acct").onsubmit = async e => {
    e.preventDefault(); const err = $("aErr"); err.textContent = ""; const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      const email = $("aEmail").value.trim(), password = $("aPass").value;
      if (tab === "Create account") {
        const r = await api("/signup", { method: "POST", body: { email, password, name: $("aName").value.trim(), club: S ? S.club : 0, trophies: S ? S.trophies : 0 } });
        storeSession(r.token, r.user); await pushSave(); showRecovery(r.recovery);
      } else if (tab === "Sign in") {
        const r = await api("/login", { method: "POST", body: { email, password } });
        storeSession(r.token, r.user); await afterSignIn();
      } else {
        const r = await api("/recover", { method: "POST", body: { email, recovery: $("aCode").value, password } });
        storeSession(r.token, r.user); await afterSignIn();
      }
    } catch (x) { err.textContent = x.message; btn.disabled = false; }
  };
}
function showRecovery(code) {
  modal(`<h2>You're in, ${NET.user.name}!</h2><p class="center">Your club is saved online. Save this <b>recovery code</b> somewhere safe. It's the only way to reset your password.</p>
    <div class="code" id="rcode">${code}</div><div class="center"><button class="btn blue" id="copyCode">Copy code</button> <button class="btn green" id="codeDone">I've saved it</button></div>`, { noClose: true });
  $("copyCode").onclick = () => { navigator.clipboard?.writeText(code).then(() => toast("Copied"), () => toast("Select the code and copy it")); };
  $("codeDone").onclick = () => { closeModal(); netStart(); };
}
// After signing in on a device: pick which progress to keep if both exist.
async function afterSignIn() {
  const me = await api("/me");
  const cloud = me.save && me.save.data;
  const local = S && S.buildings ? S : null;
  if (!cloud) { closeModal(); await pushSave(); netStart(); return toast(`Signed in as ${NET.user.name}`); }
  if (!local || JSON.stringify(cloud) === JSON.stringify(local)) { useCloud(cloud); return; }
  const sum = s => `${CLUBS[s.club].name} · Clubhouse ${s.buildings.find(b => b.t === "clubhouse").lv} · 🏆 ${s.trophies}`;
  modal(`<h2>Which club do you want?</h2><p class="center tiny">This device and your account have different progress.</p>
    <div class="choice"><button class="btn gold big" id="keepCloud">☁️ Online save<small>${sum(cloud)}</small></button>
    <button class="btn green big" id="keepLocal">📱 This device<small>${sum(local)}</small></button></div>`, { noClose: true });
  $("keepCloud").onclick = () => useCloud(cloud);
  $("keepLocal").onclick = async () => { closeModal(); await pushSave(); netStart(); toast("Kept this device's club"); };
}
function useCloud(data) {
  S = fixup(data); ensureDaily(); save(); selected = null; placing = null; closeModal();
  cam.x = 0; cam.y = 0; setZoom(1); netStart(); refreshUI(); toast(`Welcome back, ${NET.user.name}!`);
}
async function signOut() { try { await pushSave(); await api("/logout", { method: "POST" }); } catch (e) {} signOutLocal(); toast("Signed out. Your club stays on this device."); }

// ---------- Home Games inbox: real attacks on your ground ----------
async function checkInbox() {
  if (!signedIn() || !S || mode !== "home") return;
  let r; try { r = await api("/inbox"); } catch (e) { return; }
  if (!r.attacks.length) return;
  for (const a of r.attacks) {
    const lost = { pies: Math.min(S.pies, Math.floor(a.loot?.pies || 0)), drink: Math.min(S.drink, Math.floor(a.loot?.drink || 0)) };
    if (!a.friendly) { S.pies -= lost.pies; S.drink -= lost.drink; S.trophies = Math.max(0, S.trophies + (a.defTro || 0)); }
    if (!a.friendly && a.magicShield) S.shield = Math.max(S.shield || 0, a.at + MAGIC_SHIELD);
    if (!a.friendly && !a.stars) track("defend", 1);
    S.raids.unshift({ id: "p" + a.id, at: a.at, club: a.atkClub ?? a.club ?? 0, attacker: a.attacker, attackerId: a.attackerId, real: true, friendly: !!a.friendly,
      stars: a.stars, pct: a.pct, sc: a.sc, lost, tro: a.defTro, seen: false, revenged: false,
      base: a.base || [], plan: a.plan || [], endT: a.endT || 0, army: a.army || {}, spells: a.spells || {}, lv: a.lv || 1, heroLv: a.heroLv || 1, bonus: a.bonus || null, d: th() });
  }
  S.raids = S.raids.slice(0, 12);
  try { await api("/inbox/seen", { method: "POST", body: { ids: r.attacks.map(a => a.id) } }); } catch (e) {}
  save(); uiDirty = true; const n = r.attacks.length;
  toast(n === 1 ? `⚠️ ${r.attacks[0].attacker} ${r.attacks[0].friendly ? "played a friendly on" : "attacked"} your ground!` : `⚠️ ${n} clubs came to your ground`);
}

// ---------- real-player matches ----------
function oppBuildings(opp) {
  if (opp.base && opp.base.gen) return genBase(opp.th, opp.base.gen); // bot clubs
  return (opp.base || []).map((b, i) => ({ id: i + 1, t: b.t, x: b.x, y: b.y, lv: b.lv, hp: b.max || b.hp, max: b.max || b.hp, cd: 0, loot: b.loot ? { ...b.loot } : undefined, armed: BLD[b.t] && BLD[b.t].trap ? true : undefined }));
}
async function findOnlineMatch(skip = [], ranked = false) {
  if (!Object.values(S.army).some(n => n > 0)) return toast("Train some players first!");
  const cost = 50 * th(); if (!pay("pies", cost)) return toast("Not enough 🥧");
  toast("Finding an opponent…");
  try {
    await pushSave();
    const r = await api("/match?mode=" + (ranked ? "ranked" : "battle") + (skip.length ? "&skip=" + skip.join(",") : ""));
    const o = r.opponent; closeModal();
    startBattle({ kind: "pvp", ranked, club: o.club, d: o.th, buildings: oppBuildings(o), opp: { id: o.id, name: o.name, bot: o.bot, trophies: o.trophies }, seen: skip.concat(o.id) });
    BT.skip = skip.concat(o.id);
  } catch (e) { S.pies += cost; toast(e.message); }
}
function nextOpponent() { if (!BT || BT.started || BT.kind !== "pvp") return; const skip = BT.skip || [], ranked = BT.ranked; leaveBattle(); findOnlineMatch(skip, ranked); }
async function attackPlayer(id, kind) {
  if (!Object.values(S.army).some(n => n > 0)) return toast("Train some players first!");
  try {
    const p = (await api("/player/" + id)).player;
    if (!p.base) return toast(`${p.name} hasn't set up their ground yet.`);
    if (kind !== "friendly" && p.shield > Date.now()) return toast(`${p.name} is shielded for ${fmtTime((p.shield - Date.now()) / 1000)}.`);
    closeModal();
    startBattle({ kind, club: p.club, d: p.th, buildings: oppBuildings(p), opp: { id: p.id, name: p.name, bot: p.bot, trophies: p.trophies } });
  } catch (e) { toast(e.message); }
}
function netReportAttack(bt, r) {
  if (!signedIn() || !bt.opp) return;
  const avail = bt.lootTotal.pies + bt.lootTotal.drink, share = avail ? (bt.loot.pies + bt.loot.drink) / avail : 0;
  const body = { defender: bt.opp.id, friendly: !!r.friendly, ranked: !!bt.ranked, magicShield: !r.friendly && share >= .3, stars: r.stars, pct: r.p, sc: r.sc, loot: { pies: Math.floor(bt.loot.pies), drink: Math.floor(bt.loot.drink) },
    plan: bt.rec || [], endT: Math.round(bt.elapsed * 1000) / 1000, army: bt.had, spells: bt.hadSpells, lv: { ...S.unitLv }, heroLv: Object.fromEntries(Object.keys(HEROES).map(h => [h, S.heroes[h].lv])),
    bonus: Object.fromEntries(["mid", "fwd", "ruck", "def"].map(p => [p, cardBonus(p)])), base: bt.opp.bot ? [] : (bt.origBase || []).map(b => ({ t: b.t, x: b.x, y: b.y, lv: b.lv, hp: b.max, max: b.max, loot: b.loot, armed: b.armed })),
    atkClub: S.club, myTrophies: S.trophies };
  api("/attack", { method: "POST", body }).then(() => pushSave()).catch(e => toast("Couldn't send the result: " + e.message));
}

// ---------- friends: add mates by name, visit their ground, play a friendly ----------
async function openFriends() {
  if (!NET.online) return toast("Friends work on the website: ff.backyardlegendsgames.app");
  if (!signedIn()) {
    modal(`<h2>Friends</h2><p class="center">Sign in to add friends, visit their grounds and play friendlies against them.</p><div class="center"><button class="btn green big" id="frSign">Play online</button></div>`);
    $("frSign").onclick = () => openAccount(); return;
  }
  modal(`<h2>Friends</h2>
    <form id="frAdd" class="fradd"><input id="frName" placeholder="Friend's player name" maxlength="16" autocomplete="off"><button class="btn green" type="submit">Add</button></form>
    <p class="tiny center">Your player name is <b>${esc(NET.user.name)}</b>. Give it to your mates so they can add you.</p>
    <div id="frList" class="fixture"><p class="center">Loading…</p></div>
    <p class="tiny center">Visit to look around their ground. A Friendly is a practice match: no loot, no trophies, and it doesn't break shields.</p>`);
  $("frAdd").onsubmit = async e => { e.preventDefault(); const name = $("frName").value.trim(); if (!name) return;
    try { const r = await api("/friends", { method: "POST", body: { name } }); toast(`${r.friend.name} added!`); openFriends(); } catch (err) { toast(err.message); } };
  try {
    const r = await api("/friends");
    $("frList").innerHTML = r.friends.length ? r.friends.map(f => `<div class="fx">${badgeImg(CLUBS[f.club] || CLUBS[0], "sm")}<span class="nm">${f.online ? "🟢 " : ""}<b>${esc(f.name)}</b><br><small>Clubhouse ${f.th} · 🏆 ${f.trophies}</small></span>
        <button class="btn blue" data-visit="${f.id}">👀 Visit</button><button class="btn gold" data-fr="${f.id}">⚔️</button><button class="btn red" data-unf="${f.id}" title="Remove">✖</button></div>`).join("")
      : `<p class="center">No friends yet. Add someone by their player name above.</p>`;
    document.querySelectorAll("[data-visit]").forEach(b => b.onclick = () => visitPlayer(b.dataset.visit));
    document.querySelectorAll("[data-fr]").forEach(b => b.onclick = () => attackPlayer(b.dataset.fr, "friendly"));
    document.querySelectorAll("[data-unf]").forEach(b => b.onclick = async () => { if (b.dataset.sure) { await api("/friends/" + b.dataset.unf, { method: "DELETE" }).catch(e => toast(e.message)); openFriends(); } else { b.dataset.sure = 1; b.textContent = "Sure?"; } });
  } catch (e) { $("frList").innerHTML = `<p class="center err">${esc(e.message)}</p>`; }
}
async function visitPlayer(id) {
  try {
    const p = (await api("/player/" + id)).player;
    if (!p.base) return toast(`${p.name} hasn't set up their ground yet.`);
    closeModal();
    BT = makeBattle({ mode: "attack", kind: "visit", visit: true, club: p.club, atkClub: S.club, d: p.th, buildings: oppBuildings(p), army: {}, spells: {}, heroes: {},
      lvOf: () => 1, heroStat: h => heroStats(h), opp: { id: p.id, name: p.name, bot: p.bot, trophies: p.trophies } });
    BT.sel = null; mode = "battle"; selected = null; placing = null; cam.x = 0; cam.y = 0; setZoom(.8); refreshUI();
  } catch (e) { toast(e.message); }
}

// ---------- leaderboard & cheer squads ----------
async function openSocial(tab = "Leaderboard") {
  if (!NET.online) return toast("Online play works on the website: ff.backyardlegendsgames.app");
  const tabs = ["Leaderboard", "Cheer Squad"];
  modal(`<h2>Footy Fortress Online</h2>${tabsHTML(tabs, tab)}<div id="soc"><p class="center">Loading…</p></div>`, { tick: tab === "Cheer Squad" ? refreshChat : null });
  bindTabs(openSocial);
  try { if (tab === "Leaderboard") await renderLeaderboard(); else await renderSquad(); } catch (e) { $("soc").innerHTML = `<p class="center err">${e.message}</p>`; }
}
async function renderLeaderboard() {
  const r = await api("/leaderboard"), meId = NET.user && NET.user.id;
  $("soc").innerHTML = (signedIn() ? "" : `<div class="banner">Sign in to appear on the leaderboard. <button class="btn green" id="lbSign">Play online</button></div>`) +
    `<div class="ladwrap"><table class="ladder"><tr><th>#</th><th></th><th>Player</th><th>Club</th><th>🏆</th></tr>${r.players.map((p, i) =>
      `<tr class="${p.id === meId ? "me" : ""}"><td>${i + 1}</td><td>${badgeImg(CLUBS[p.club] || CLUBS[0], "xs")}</td><td>${esc(p.name)}${p.bot ? ' <span class="tag bot">BOT</span>' : ""}${p.squadName ? `<br><small>${esc(p.squadName)}</small>` : ""}</td><td>CH ${p.th}</td><td><b>${p.trophies}</b></td></tr>`).join("")}</table></div>
    <p class="tiny center">Bots are computer clubs so there's always someone to play while the league fills up.</p>`;
  const b = $("lbSign"); if (b) b.onclick = () => openAccount();
}
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
let chatLast = 0;
async function renderSquad() {
  if (!signedIn()) { $("soc").innerHTML = `<p class="center">Sign in to join a Cheer Squad and chat with your mates.</p><div class="center"><button class="btn green big" id="sqSign">Play online</button></div>`; $("sqSign").onclick = () => openAccount(); return; }
  const r = await api("/squad");
  if (!r.squad) {
    const list = await api("/squads");
    $("soc").innerHTML = `<p class="center">Cheer Squads are clans: chat, friendly matches and a shared trophy total.</p>
      <form id="sqNew" class="acct row"><input id="sqName" maxlength="16" placeholder="New squad name" required><button class="btn gold" type="submit">Create</button></form>
      <h3>Join a squad</h3><div class="fixture">${list.squads.map(s => `<div class="fx">${badgeImg(CLUBS[s.club] || CLUBS[0], "sm")}<span class="nm">${esc(s.name)}<br><small>${s.members}/30 · 🏆 ${s.trophies}${s.motto ? " · " + esc(s.motto) : ""}</small></span>${s.open ? `<button class="btn green" data-join="${s.id}">Join</button>` : "🔒"}</div>`).join("") || "<p class='center tiny'>No squads yet. Start the first one!</p>"}</div>`;
    $("sqNew").onsubmit = async e => { e.preventDefault(); try { await api("/squads", { method: "POST", body: { name: $("sqName").value.trim(), club: S.club } }); openSocial("Cheer Squad"); } catch (x) { toast(x.message); } };
    document.querySelectorAll("[data-join]").forEach(b => b.onclick = async () => { try { await api(`/squads/${b.dataset.join}/join`, { method: "POST" }); openSocial("Cheer Squad"); } catch (x) { toast(x.message); } });
    return;
  }
  chatLast = 0;
  $("soc").innerHTML = `<div class="sqhead">${badgeImg(CLUBS[r.squad.club] || CLUBS[0], "sm")}<b>${esc(r.squad.name)}</b><span class="tiny">${r.members.length}/30</span><button class="btn red" id="sqLeave">Leave</button></div>
    <div class="chat" id="chat"></div><form id="chatForm" class="acct row"><input id="chatIn" maxlength="200" placeholder="Say something…" autocomplete="off"><button class="btn green" type="submit">Send</button></form>
    <h3>Members</h3><div class="fixture">${r.members.map(m => `<div class="fx">${badgeImg(CLUBS[m.club] || CLUBS[0], "sm")}<span class="nm">${esc(m.name)}${m.id === NET.user.id ? " (you)" : ""}<br><small>Clubhouse ${m.th} · 🏆 ${m.trophies}</small></span>${m.id !== NET.user.id ? `<button class="btn blue" data-friendly="${m.id}">Friendly</button>` : ""}</div>`).join("")}</div>
    <p class="tiny center">Friendlies don't cost loot or trophies on either side.</p>`;
  addMessages(r.messages);
  $("sqLeave").onclick = async () => { const b = $("sqLeave"); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Tap to confirm"; return; } await api("/squad/leave", { method: "POST" }); openSocial("Cheer Squad"); };
  $("chatForm").onsubmit = async e => { e.preventDefault(); const t = $("chatIn").value.trim(); if (!t) return; $("chatIn").value = ""; try { await api("/squad/chat", { method: "POST", body: { text: t } }); refreshChat(); } catch (x) { toast(x.message); } };
  document.querySelectorAll("[data-friendly]").forEach(b => b.onclick = () => attackPlayer(b.dataset.friendly, "friendly"));
}
function addMessages(msgs) {
  const box = $("chat"); if (!box || !msgs.length) return;
  for (const m of msgs) { if (m.id <= chatLast) continue; chatLast = m.id; const d = document.createElement("div"); d.className = "msg" + (m.user_id ? "" : " sys") + (NET.user && m.user_id === NET.user.id ? " mine" : "");
    d.innerHTML = m.user_id ? `<b>${esc(m.name)}</b> ${esc(m.text)}` : esc(m.text); box.append(d); }
  box.scrollTop = box.scrollHeight;
}
async function refreshChat() { if (!$("chat")) return; try { const r = await api("/squad?after=" + chatLast); addMessages(r.messages || []); } catch (e) {} }

// ---------- start-up ----------
async function netStart() {
  if (!NET.online) return;
  try { NET.bots = (await api("/bots")).bots; } catch (e) {}
  if (!signedIn()) return;
  try { const me = await api("/me"); if (me.profile && S) { /* server may know about trophy changes from attacks */ } } catch (e) {}
  await checkInbox(); pushSave();
}
setInterval(() => { if (signedIn() && mode === "home") checkInbox(); }, 60000);

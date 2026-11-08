// ---------- Online play: accounts, cloud saves, real opponents, Home Games inbox, leaderboard, cheer squads ----------
const NET = { online: location.protocol.startsWith("http"), token: null, user: null, bots: [], syncT: null, lastPush: 0, busy: false };
const TOKEN_KEY = "ffSession";
try { const t = JSON.parse(localStorage.getItem(TOKEN_KEY) || "null"); if (t) { NET.token = t.token; NET.user = t.user; } } catch (e) {}
const signedIn = () => !!(NET.online && NET.token);

async function api(path, opts = {}) {
  const res = await fetch("/api" + path, { method: opts.method || "GET", headers: { "content-type": "application/json", ...(NET.token ? { authorization: "Bearer " + NET.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined, keepalive: !!opts.keepalive, signal: opts.signal });
  let data = {}; try { data = await res.json(); } catch (e) {}
  if (res.status === 401 && NET.token && !opts.noAuthReset) { signOutLocal(); toast("Please sign in again."); }
  if (!res.ok) throw new Error(data.error || "Couldn't reach the server.");
  return data;
}
function storeSession(token, user) { NET.token = token; NET.user = user; try { localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, user })); } catch (e) {} uiDirty = true; }
function signOutLocal() { NET.token = null; NET.user = null; NET.liveAttacks = []; try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} uiDirty = true; }

// ---------- what other players see when they attack you ----------
function publicBase() {
  return homeBattleBase().map(b => { const o = { t: b.t, x: b.x, y: b.y, lv: b.lv, hp: b.hp, max: b.max }; if (b.loot) o.loot = b.loot; if (b.armed) o.armed = true; return o; });
}
// ---------- cross-device saves: whichever save is newer wins ----------
// Each upload gets a revision number. A device remembers the last revision it synced; if the cloud has a higher one
// from another device, that device played more recently, so we load it instead of overwriting it.
const DEVICE = (() => { try { let d = localStorage.getItem("ffDevice"); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem("ffDevice", d); } return d; } catch (e) { return "x"; } })();
const syncedRev = () => { try { return Number(localStorage.getItem("ffSyncedRev")) || 0; } catch (e) { return 0; } };
const setSyncedRev = n => { try { localStorage.setItem("ffSyncedRev", String(n)); } catch (e) {} };
function pushSave(opts = {}) {
  if (typeof EDIT !== "undefined" && EDIT) return Promise.resolve(); // never upload a half-edited layout
  if (!signedIn() || !S || NET.pulling) return;
  NET.lastPush = Date.now();
  const base = syncedRev(); S.rev = base + 1; S.dev = DEVICE;
  return api("/save", { method: "PUT", keepalive: !!opts.keepalive, body: { baseRev: base, data: S, profile: { club: S.club, th: th(), trophies: S.trophies, shield: S.shield || 0, base: publicBase() } } })
    .then(() => setSyncedRev(S.rev), e => { if (/newer save/i.test(e.message || "")) pullNewer(); });
}
// Load the cloud save if another device has played since this one last synced. Returns true if it switched.
async function pullNewer(bootLast) {
  if (!signedIn() || !S || NET.pulling || mode !== "home" || placing) return false;
  NET.pulling = true;
  try {
    const me = await api("/me"), cloud = me.save && me.save.data;
    if (!cloud || !cloud.buildings || cloud.dev === DEVICE) return false;
    const newer = (cloud.rev || 0) > syncedRev() && (syncedRev() > 0 || (cloud.last || 0) > (bootLast || S.last || 0));
    if (!newer) return false;
    S = fixup(cloud); setSyncedRev(cloud.rev || 0); ensureDaily(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
    selected = null; placing = null; if (typeof closeModal === "function" && $("modal").classList.contains("show") && !(typeof tutActive === "function" && tutActive())) closeModal();
    produce(Math.min(24 * 3600, (Date.now() - (S.last || Date.now())) / 1000)); processTimers(); refreshUI();
    toast("☁️ Loaded your latest save from your other device");
    return true;
  } catch (e) { return false; } finally { NET.pulling = false; }
}
function scheduleSync() { if (!signedIn()) return; clearTimeout(NET.syncT); NET.syncT = setTimeout(pushSave, 15000); }
addEventListener("visibilitychange", async () => { if (!signedIn() || !S) return;
  if (document.hidden) pushSave({ keepalive: true }); else if (!(await pullNewer())) pushSave(); });

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
  $("keepLocal").onclick = async () => { closeModal(); setSyncedRev(cloud.rev || 0); await pushSave(); netStart(); toast("Kept this device's club"); };
}
function useCloud(data) {
  S = fixup(data); setSyncedRev(data.rev || 0); ensureDaily(); save(); selected = null; placing = null; closeModal();
  cam.x = 0; cam.y = 0; setZoom(1); netStart(); refreshUI(); toast(`Welcome back, ${NET.user.name}!`);
}
async function signOut() { try { await pushSave(); await api("/logout", { method: "POST" }); } catch (e) {} signOutLocal(); toast("Signed out. Your club stays on this device."); }

// ---------- Home Games inbox: real attacks on your ground ----------
async function checkInbox() {
  if (!signedIn() || !S || mode !== "home" || document.hidden || NET.checkingInbox) return;
  const token=NET.token, saveGame=S;
  NET.checkingInbox=true;
  try {
    const r=await api("/inbox");
    if(NET.token!==token||S!==saveGame||mode!=="home") return;
    NET.friendNew=r.friendNew||0; showSocialDot();
    const prev=NET.liveAttacks||[], live=r.live||[];
    const fresh=live.filter(a=>!prev.some(p=>p.attackerId===a.attackerId&&p.at===a.at));
    NET.liveAttacks=live;
    if(fresh.length) toast(fresh.length===1?`⚠️ ${fresh[0].name} is attacking your ground!`:`⚠️ ${fresh.length} clubs are attacking your ground!`);
    if(fresh.length||prev.length!==live.length){
      uiDirty=true;
      if($("liveAttacks")&&typeof openLog==="function"&&hubCtx&&hubCtx.tab==="Log") openLog();
    }
    if(!r.attacks.length) return;
    const incoming=r.attacks.filter(a=>!S.raids.some(raid=>raid.id==="p"+a.id));
    for (const a of incoming) {
      const lost = { pies: Math.min(S.pies, Math.floor(a.loot?.pies || 0)), drink: Math.min(S.drink, Math.floor(a.loot?.drink || 0)) };
      if (a.ranked) { lost.pies = 0; lost.drink = 0; }
      if (!a.friendly) { S.pies -= lost.pies; S.drink -= lost.drink; S.trophies = Math.max(0, S.trophies + (a.defTro || 0)); }
      if (!a.friendly && a.magicShield) S.shield = Math.max(S.shield || 0, a.at + MAGIC_SHIELD);
      if (!a.friendly && !a.stars) track("defend", 1);
      S.raids.unshift({ id: "p" + a.id, at: a.at, club: a.atkClub ?? a.club ?? 0, attacker: a.attacker, attackerId: a.attackerId, real: true, friendly: !!a.friendly, friend: !!a.friend, ranked: !!a.ranked,
        stars: a.stars, pct: a.pct, sc: a.sc, lost, tro: a.defTro, seen: false, revenged: false,
        base: a.base || [], plan: a.plan || [], endT: a.endT || 0, army: a.army || {}, spells: a.spells || {}, lv: a.lv || 1, heroLv: a.heroLv || 1, bonus: a.bonus || null, d: th() });
    }
    if(incoming.length){
      S.raids=S.raids.slice(0,12); save(); uiDirty=true;
      if(!fresh.length) toast(incoming.length===1?`New Home Games result from ${incoming[0].attacker}`:`${incoming.length} new Home Games results`);
    }
    await api("/inbox/seen",{method:"POST",body:{ids:r.attacks.map(a=>a.id)}});
  } catch(e) {} finally { NET.checkingInbox=false; }
}
const liveAttackText=()=> (NET.liveAttacks||[]).map(a=>a.name+" is attacking your ground").join(" · ");

// ---------- real-player matches ----------
function oppBuildings(opp) {
  if (opp.base && opp.base.gen) return genBase(opp.th, opp.base.gen, opp.base.tier); // bot clubs
  return (opp.base || []).map((b, i) => ({ id: i + 1, t: b.t, x: b.x, y: b.y, lv: b.lv, hp: b.max || b.hp, max: b.max || b.hp, cd: 0, loot: b.loot ? { ...b.loot } : undefined, armed: BLD[b.t] && BLD[b.t].trap ? true : undefined }));
}
async function findOnlineMatch(skip = [], ranked = false) {
  if (!Object.values(S.army).some(n => n > 0)) return toast("Train some players first!");
  const cost = 50 * th(); if (!pay("pies", cost)) return toast("Not enough 🥧");
  try {
    closeModal();
    const r = await searching(pushSave().catch(() => {}).then(() => api("/match?mode=" + (ranked ? "ranked" : "battle") + (skip.length ? "&skip=" + skip.join(",") : ""))));
    const o = r.opponent;
    startBattle({ kind: "pvp", ranked, club: o.club, d: o.th, buildings: oppBuildings(o), opp: { id: o.id, name: o.name, bot: o.bot, trophies: o.trophies }, seen: skip.concat(o.id) });
    BT.skip = skip.concat(o.id);
    if (o.base && o.base.tier === "hard") toast("💀 Boss ground! Maxed defences, double loot");
    if (o.base && o.base.tier === "boss") toast("💀 Boss battle! Every defence maxed for your level. Big loot if you win");
  } catch (e) { S.pies += cost; if (!e.cancelled) toast(e.message); }
}
function nextOpponent() { if (!BT || BT.started || BT.kind !== "pvp") return; const skip = BT.skip || [], ranked = BT.ranked; leaveBattle(); findOnlineMatch(skip, ranked); }
async function attackPlayer(id, kind) {
  if (!Object.values(S.army).some(n => n > 0)) return toast("Train some players first!");
  try {
    const p = (await api("/player/" + id)).player;
    if (!p.base) return toast(`${p.name} hasn't set up their ground yet.`);
    if (kind !== "friendly" && kind !== "friend" && p.shield > Date.now()) return toast(`${p.name} is shielded for ${fmtTime((p.shield - Date.now()) / 1000)}.`);
    const shielded = kind === "friend" && p.lootShield > Date.now();
    closeModal();
    startBattle({ kind, club: p.club, d: p.th, buildings: oppBuildings(p), lootMul: shielded ? 0 : undefined, opp: { id: p.id, name: p.name, bot: p.bot, trophies: p.trophies } });
    if (shielded) { BT.lootShield = p.lootShield; toast(`🛡️ ${p.name} has a loot shield from you for ${fmtTime((p.lootShield - Date.now()) / 1000)}. Attack for fun, but no loot.`); }
  } catch (e) { toast(e.message); }
}
function netAttackStarted(bt) {
  if(!signedIn()||!bt.opp||bt.opp.bot||bt.kind==="friendly") return;
  bt.attackNotice=api("/attack/start",{method:"POST",keepalive:true,signal:AbortSignal.timeout?.(5000),body:{defender:bt.opp.id,friend:bt.kind==="friend"}}).then(()=>true,()=>false);
}
// Stream the attack every 2 seconds so the defender can watch it live.
setInterval(async () => {
  const bt = typeof BT !== "undefined" && BT;
  if (!bt || bt.mode !== "attack" || bt.visit || !bt.attackNotice || !bt.opp || bt.over || !bt.started || !signedIn()) return;
  if (!(await bt.attackNotice)) return;
  const n = (bt.rec || []).length; if (bt.liveSent === n && bt.liveMeta) return;
  const body = { defender: bt.opp.id, plan: bt.rec || [] };
  if (!bt.liveMeta) body.meta = { atkClub: S.club, base: (bt.origBase || []).map(b => ({ id: b.id, t: b.t, x: b.x, y: b.y, lv: b.lv, hp: b.max, max: b.max, loot: b.loot, armed: b.armed })),
    army: bt.had, spells: bt.hadSpells, heroes: Object.keys(bt.heroesLeft || {}), lv: { ...S.unitLv }, heroLv: Object.fromEntries(Object.keys(HEROES).map(h => [h, S.heroes[h].lv])),
    bonus: Object.fromEntries(["mid", "fwd", "ruck", "def"].map(p => [p, cardBonus(p)])) };
  bt.liveSent = n;
  api("/attack/live", { method: "POST", body }).then(() => { bt.liveMeta = true; }, () => { bt.liveSent = -1; });
}, 2000);
async function watchLive(attackerId) {
  let r; try { r = await api("/attack/live/" + encodeURIComponent(attackerId)); } catch (e) { return toast(e.message); }
  const m = r.meta, raid = { id: "live-" + attackerId, at: Date.now(), club: m.atkClub ?? 0, attacker: r.name, real: true, base: m.base || [], plan: r.plan || [], endT: 0,
    army: m.army || {}, spells: m.spells || {}, lv: m.lv || 1, heroLv: m.heroLv || 1, bonus: m.bonus || null, d: th() };
  closeModal(); if (BT) leaveBattle();
  BT = raidBattle(raid, "replay"); BT.speed = 1; BT.raid = raid;
  for (const h of m.heroes || []) BT.heroesLeft[h] = true;
  BT.live = { name: r.name, id: attackerId, n: (r.plan || []).length, done: r.done };
  BT.live.poll = setInterval(async () => {
    const bt = BT; if (!bt || !bt.live || bt.live.id !== attackerId) return;
    try { const u = await api("/attack/live/" + encodeURIComponent(attackerId)); const add = (u.plan || []).slice(bt.live.n);
      for (const p of add) bt.plan.push({ ...p }); bt.live.n += add.length; if (u.done) bt.live.done = true;
    } catch (e) { bt.live.done = true; }
    if (bt.live.done) clearInterval(bt.live.poll);
  }, 2000);
  mode = "battle"; selected = null; placing = null; cam.x = 0; cam.y = 0; setZoom(.8); refreshUI();
  toast(`🔴 Watching ${r.name} attack your ground live`);
}
async function netReportAttack(bt, r) {
  if (!signedIn() || !bt.opp) return;
  const avail = bt.lootTotal.pies + bt.lootTotal.drink, share = avail ? (bt.loot.pies + bt.loot.drink) / avail : 0;
  const body = { defender: bt.opp.id, friendly: !!r.friendly, friend: bt.kind === "friend", ranked: !!bt.ranked, magicShield: !r.friendly && !bt.ranked && bt.kind !== "friend" && share >= .3, stars: r.stars, pct: r.p, sc: r.sc, loot: { pies: Math.floor(bt.loot.pies * Math.min(1, bt.lootMul ?? 1)), drink: Math.floor(bt.loot.drink * Math.min(1, bt.lootMul ?? 1)) },
    plan: bt.rec || [], endT: Math.round(bt.elapsed * 1000) / 1000, army: bt.had, spells: bt.hadSpells, lv: { ...S.unitLv }, heroLv: Object.fromEntries(Object.keys(HEROES).map(h => [h, S.heroes[h].lv])),
    bonus: Object.fromEntries(["mid", "fwd", "ruck", "def"].map(p => [p, cardBonus(p)])), base: bt.opp.bot ? [] : (bt.origBase || []).map(b => ({ t: b.t, x: b.x, y: b.y, lv: b.lv, hp: b.max, max: b.max, loot: b.loot, armed: b.armed })),
    atkClub: S.club, myTrophies: S.trophies };
  const token=NET.token;
  body.startedNotice=!!(await bt.attackNotice);
  if(NET.token!==token) return;
  api("/attack", { method: "POST", body }).then(x => { if (x && x.lootShield && bt.kind === "friend" && !bt.lootShield) toast(`🛡️ That's 10 attacks in an hour. ${bt.opp.name} has a 2-hour loot shield from you`); return pushSave(); }).catch(e => toast("Couldn't send the result: " + e.message));
}

// ---------- friends: add mates by name, visit their ground, play a friendly ----------
const openFriends = () => openSocial("Friends");
async function renderFriends(soc) {
  if (!signedIn()) {
    $("soc").innerHTML = `<p class="center">Sign in to add friends, visit their grounds and attack them.</p><div class="center"><button class="btn green big" id="frSign">Play online</button></div>`;
    $("frSign").onclick = sub(() => openAccount(), () => openSocial("Friends")); return;
  }
  $("soc").innerHTML = (`
    <form id="frAdd" class="fradd"><input id="frName" placeholder="Friend's player name" maxlength="16" autocomplete="off"><button class="btn green" type="submit">Add</button></form>
    <p class="tiny center">Your player name is <b>${esc(NET.user.name)}</b>. Give it to your mates so they can add you.</p>
    <div id="frList" class="fixture"><p class="center">Loading…</p></div>
    <p class="tiny center">Visit to look around their ground. ⚔️ Attack is a normal match (shields don't stop friends), but you take ⅛ of their loot (rising to ¼ once they have 300,000+ on offer) and no trophies change hands. Attack the same friend 10 times in an hour and they get a 2-hour 🛡️ loot shield from you: you can still attack, but take no loot.</p>`);
  $("frAdd").onsubmit = async e => { e.preventDefault(); const name = $("frName").value.trim(); if (!name) return;
    try { const r = await api("/friends", { method: "POST", body: { name } }); toast(r.mutual ? `You and ${r.friend.name} are now friends!` : `Friend request sent to ${r.friend.name}`); openFriends(); } catch (err) { toast(err.message); } };
  try {
    const r = await api("/friends");
    if(soc!==$("soc")) return;
    const row = (f, extra, btns) => `<div class="fx">${badgeImg(CLUBS[f.club] || CLUBS[0], "sm")}<span class="nm">${f.online ? "🟢 " : ""}<b>${esc(f.name)}</b><br><small>${extra || `Clubhouse ${f.th} · 🏆 ${f.trophies}`}</small></span>${btns}</div>`;
    let h = "";
    if (r.requests.length) h += `<h3>Friend requests</h3>` + r.requests.map(f => row(f, "added you", `<button class="btn green" data-addback="${f.id}">➕ Add</button><button class="btn red" data-unf="${f.id}" title="Ignore">✖</button>`)).join("");
    if (r.suggestions.length) h += `<h3>Suggested by your mates</h3>` + r.suggestions.map(f => row(f, `${esc(f.from)} suggests them`, `<button class="btn green" data-addback="${f.id}">➕ Add</button><button class="btn red" data-unsug="${f.id}" title="Dismiss">✖</button>`)).join("");
    const revOf = id => (S.raids || []).find(x => x.attackerId === id && canRevenge(x));
    h += `<h3>Friends${r.friends.length ? ` (${r.friends.length})` : ""}</h3>` + (r.friends.length ? r.friends.map(f => { const rv = revOf(f.id); return row(f, rv ? `⚔️ attacked you ${fmtTime((Date.now() - rv.at) / 1000)} ago` : f.lootShield > Date.now() ? `🛡️ no loot for ${fmtTime((f.lootShield - Date.now()) / 1000)}` : "", `<button class="btn blue" data-visit="${f.id}">👀</button>${rv ? `<button class="btn red" data-rev="${rv.id}">⚔️ Revenge</button>` : `<button class="btn gold" data-fr="${f.id}">⚔️</button>`}${r.friends.length > 1 ? `<button class="btn" data-sug="${f.id}" title="Suggest a friend to ${esc(f.name)}">💡</button>` : ""}<button class="btn red" data-unf="${f.id}" title="Remove">✖</button>`); }).join("")
      : `<p class="center">No friends yet. Add someone by their player name above.</p>`);
    if (r.sent.length) h += `<h3>Waiting for them to add you back</h3>` + r.sent.map(f => row(f, "request sent", `<button class="btn red" data-unf="${f.id}" title="Cancel">✖</button>`)).join("");
    $("frList").innerHTML = h;
    document.querySelectorAll("[data-visit]").forEach(b => b.onclick = () => visitPlayer(b.dataset.visit));
    document.querySelectorAll("[data-fr]").forEach(b => b.onclick = () => attackPlayer(b.dataset.fr, "friend"));
    document.querySelectorAll("#frList [data-rev]").forEach(b => b.onclick = () => revenge(S.raids.find(x => x.id == b.dataset.rev)));
    // players (not friends) who attacked you: revenge them from here too
    const others = revengeList().filter(x => x.real && x.attackerId && !r.friends.some(f => f.id === x.attackerId));
    if (others.length) { $("frList").insertAdjacentHTML("beforeend", `<h3>Players who attacked you</h3>` + others.map(x => `<div class="fx">${badgeImg(CLUBS[x.club] || CLUBS[0], "sm")}<span class="nm"><b>${esc(x.attacker)}</b><br><small>${fmtTime((Date.now() - x.at) / 1000)} ago · ${x.stars ? "★".repeat(x.stars) : "no stars"}</small></span><button class="btn red" data-rev2="${x.id}">⚔️ Revenge</button><button class="btn green" data-addp="${x.attackerId}" title="Add friend">➕</button></div>`).join(""));
      document.querySelectorAll("[data-rev2]").forEach(b => b.onclick = () => revenge(S.raids.find(x => x.id == b.dataset.rev2)));
      document.querySelectorAll("[data-addp]").forEach(b => b.onclick = async () => { try { const x = await api("/friends", { method: "POST", body: { id: b.dataset.addp } }); toast(x.mutual ? `You and ${x.friend.name} are now friends!` : `Friend request sent to ${x.friend.name}`); } catch (e) { toast(e.message); } openFriends(); }); }
    document.querySelectorAll("[data-addback]").forEach(b => b.onclick = async () => { b.disabled = true;
      try { const x = await api("/friends", { method: "POST", body: { id: b.dataset.addback } }); toast(x.mutual ? `You and ${x.friend.name} are now friends!` : `Friend request sent to ${x.friend.name}`); } catch (e) { toast(e.message); } openFriends(); });
    document.querySelectorAll("[data-unsug]").forEach(b => b.onclick = async () => { await api("/friends/suggest/" + b.dataset.unsug, { method: "DELETE" }).catch(e => toast(e.message)); openFriends(); });
    document.querySelectorAll("[data-sug]").forEach(b => b.onclick = () => { const to = r.friends.find(f => f.id === b.dataset.sug), others = r.friends.filter(f => f.id !== to.id);
      $("frList").innerHTML = `<h3>Suggest a friend to ${esc(to.name)}</h3><p class="tiny center">They'll see it in their Friends list and can add them with one tap.</p>` +
        others.map(f => row(f, "", `<button class="btn green" data-pick="${f.id}">💡 Suggest</button>`)).join("") + `<div class="center"><button class="btn" id="sugBack">Back</button></div>`;
      $("sugBack").onclick = () => openFriends();
      document.querySelectorAll("[data-pick]").forEach(p => p.onclick = async () => { p.disabled = true;
        try { await api("/friends/suggest", { method: "POST", body: { to: to.id, who: p.dataset.pick } }); toast(`Suggested ${others.find(f => f.id === p.dataset.pick).name} to ${to.name}`); p.textContent = "✅ Sent"; } catch (e) { toast(e.message); p.disabled = false; } }); });
    document.querySelectorAll("[data-unf]").forEach(b => b.onclick = async () => { if (b.dataset.sure) { await api("/friends/" + b.dataset.unf, { method: "DELETE" }).catch(e => toast(e.message)); openFriends(); } else { b.dataset.sure = 1; b.textContent = "Sure?"; } });
  } catch (e) { if(soc===$("soc")) $("frList").innerHTML = `<p class="center err">${esc(e.message)}</p>`; }
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
async function openSocial(tab) { if (!tab) tab = NET.friendNew ? "Friends" : "Leaderboard"; menuBack = null; hubCtx=null;
  if (!NET.online) return toast("Online play works on the website: ff.backyardlegendsgames.app");
  const tabs = ["Leaderboard", "Friends", "Cheer Squad"];
  const header=`<div class="social-head"><div class="menu-banner menu-title">Footy Fortress Online</div>${tabsHTML(tabs, tab)}</div>`;
  modal('<div id="soc"><p class="center">Loading…</p></div>', {header, tick: tab === "Cheer Squad" ? refreshChat : null });
  const soc=$("soc");
  bindTabs(openSocial);
  const ft=document.querySelector('[data-tab="Friends"]'); if(ft&&NET.friendNew){ ft.style.position="relative"; ft.insertAdjacentHTML("beforeend",`<i class="dot">${NET.friendNew}</i>`); }
  try { if (tab === "Leaderboard") await renderLeaderboard(soc); else if (tab === "Friends") await renderFriends(soc); else await renderSquad(soc); } catch (e) { if(soc===$("soc")) soc.innerHTML = `<p class="center err">${esc(e.message)}</p>`; }
}
async function renderLeaderboard(soc) {
  const r = await api("/leaderboard"), meId = NET.user && NET.user.id;
  if(soc!==$("soc")) return;
  $("soc").innerHTML = (signedIn() ? "" : `<div class="banner">Sign in to appear on the leaderboard. <button class="btn green" id="lbSign">Play online</button></div>`) +
    `<div class="ladwrap"><table class="ladder"><tr><th>#</th><th></th><th>Player</th><th>Club</th><th>🏆</th></tr>${r.players.map((p, i) =>
      `<tr class="${p.id === meId ? "me" : ""}"><td>${i + 1}</td><td>${badgeImg(CLUBS[p.club] || CLUBS[0], "xs")}</td><td>${esc(p.name)}${p.squadName ? `<br><small>${esc(p.squadName)}</small>` : ""}</td><td>CH ${p.th}</td><td><b>${p.trophies}</b></td></tr>`).join("")}</table></div>
    <p class="tiny center">Bots are computer clubs so there's always someone to play while the league fills up.</p>`;
  const b = $("lbSign"); if (b) b.onclick = sub(() => openAccount(), () => openSocial("Leaderboard"));
}
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
let chatLast = 0, chatMembers = [];
const CHAT_SEEN_KEY = "ffChatSeen";
const chatSeen = () => { try { return Number(localStorage.getItem(CHAT_SEEN_KEY)) || 0; } catch (e) { return 0; } };
function markChatSeen(id) { if (id > chatSeen()) { try { localStorage.setItem(CHAT_SEEN_KEY, String(id)); } catch (e) {} } NET.unread = 0; showSocialDot(); }
function showSocialDot() { const d = $("socialDot"); if (!d) return; const n = (NET.unread || 0) + (NET.friendNew || 0); d.textContent = n > 9 ? "9+" : n; d.classList.toggle("hide", !n); }
async function checkChat() {
  if (!signedIn()) return;
  try {
    const r = await api("/squad?after=" + chatSeen());
    if (!r.squad) { NET.unread = 0; return showSocialDot(); }
    if (!chatSeen() && r.messages.length) return markChatSeen(Math.max(...r.messages.map(m => m.id))); // first run: don't flag old history
    NET.unread = r.messages.filter(m => m.user_id && m.user_id !== NET.user.id).length;
    if ($("chat")) return markChatSeen(Math.max(chatSeen(), ...r.messages.map(m => m.id)));
    showSocialDot();
  } catch (e) {}
}
async function renderSquad(soc) {
  if (!signedIn()) { $("soc").innerHTML = `<p class="center">Sign in to join a Cheer Squad and chat with your mates.</p><div class="center"><button class="btn green big" id="sqSign">Play online</button></div>`; $("sqSign").onclick = sub(() => openAccount(), () => openSocial("Cheer Squad")); return; }
  const r = await api("/squad");
  if(soc!==$("soc")) return;
  if (!r.squad) {
    const list = await api("/squads");
    if(soc!==$("soc")) return;
    $("soc").innerHTML = `<p class="center">Cheer Squads are clans: chat, friendly matches and a shared trophy total.</p>
      <form id="sqNew" class="acct row"><input id="sqName" maxlength="16" placeholder="New squad name" required><button class="btn gold" type="submit">Create</button></form>
      <h3>Join a squad</h3><div class="fixture">${list.squads.map(s => `<div class="fx">${badgeImg(CLUBS[s.club] || CLUBS[0], "sm")}<span class="nm">${esc(s.name)}<br><small>${s.members}/30 · 🏆 ${s.trophies}${s.motto ? " · " + esc(s.motto) : ""}</small></span>${s.open ? `<button class="btn green" data-join="${s.id}">Join</button>` : "🔒"}</div>`).join("") || "<p class='center tiny'>No squads yet. Start the first one!</p>"}</div>`;
    $("sqNew").onsubmit = async e => { e.preventDefault(); try { await api("/squads", { method: "POST", body: { name: $("sqName").value.trim(), club: S.club } }); openSocial("Cheer Squad"); } catch (x) { toast(x.message); } };
    document.querySelectorAll("[data-join]").forEach(b => b.onclick = async () => { try { await api(`/squads/${b.dataset.join}/join`, { method: "POST" }); openSocial("Cheer Squad"); } catch (x) { toast(x.message); } });
    return;
  }
  chatLast = 0; chatMembers = r.members;
  $("soc").innerHTML = `<div class="sqhead">${badgeImg(CLUBS[r.squad.club] || CLUBS[0], "sm")}<b>${esc(r.squad.name)}</b><span class="tiny">${r.members.length}/30</span><button class="btn red" id="sqLeave">Leave</button></div>
    <div class="chat" id="chat"></div><form id="chatForm" class="chatform"><input id="chatIn" maxlength="200" placeholder="Say something…" autocomplete="off" enterkeyhint="send"><button class="btn green" type="submit">➤</button></form>
    <div class="soonrow"><div class="soon">${uiArt("squad-war","⚔️")}<b>Squad War</b><small>Coming soon</small></div><div class="soon">${uiArt("squad-games","🎯")}<b>Squad Games</b><small>Coming soon</small></div><div class="soon">${uiArt("squad-donate","🤝")}<b>Lend Players</b><small>Coming soon</small></div></div>
    <h3>Members</h3><div class="fixture">${r.members.map(m => `<div class="fx">${badgeImg(CLUBS[m.club] || CLUBS[0], "sm")}<span class="nm">${esc(m.name)}${m.id === NET.user.id ? " (you)" : ""}<br><small>Clubhouse ${m.th} · 🏆 ${m.trophies}</small></span>${m.id !== NET.user.id ? `<button class="btn blue" data-friendly="${m.id}">Friendly</button>` : ""}</div>`).join("")}</div>
    <p class="tiny center">Friendlies don't cost loot or trophies on either side.</p>`;
  addMessages(r.messages);
  $("sqLeave").onclick = async () => { const b = $("sqLeave"); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Tap to confirm"; return; } await api("/squad/leave", { method: "POST" }); openSocial("Cheer Squad"); };
  $("chatForm").onsubmit = async e => { e.preventDefault(); const t = $("chatIn").value.trim(); if (!t) return; $("chatIn").value = ""; $("chatIn").focus(); try { await api("/squad/chat", { method: "POST", body: { text: t } }); refreshChat(); } catch (x) { toast(x.message); } };
  document.querySelectorAll("[data-friendly]").forEach(b => b.onclick = () => attackPlayer(b.dataset.friendly, "friendly"));
}
function addMessages(msgs) {
  const box = $("chat"); if (!box || !msgs.length) return;
  const follow=box.scrollHeight-box.clientHeight-box.scrollTop<24;
  for (const m of msgs) { if (m.id <= chatLast) continue; chatLast = m.id; const d = document.createElement("div"); d.className = "msg" + (m.user_id ? "" : " sys") + (NET.user && m.user_id === NET.user.id ? " mine" : "");
    const mine = NET.user && m.user_id === NET.user.id, t = m.at ? new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
    const mem = (chatMembers || []).find(x => x.id === m.user_id), col = mem && CLUBS[mem.club] ? CLUBS[mem.club].b : "#ffd34d";
    markChatSeen(m.id);
    d.innerHTML = m.user_id ? `${mine ? "" : `<b style="color:${col === "#ffffff" || col === "#111111" ? "#ffd34d" : col}">${esc(m.name)}</b>`}<span>${esc(m.text)}</span><i>${t}</i>` : esc(m.text); box.append(d); }
  if(follow) box.scrollTop = box.scrollHeight;
}
let chatRefreshing=false;
async function refreshChat() {
  const chat=$("chat"); if(!chat||chatRefreshing) return;
  chatRefreshing=true;
  try { const r=await api("/squad?after="+chatLast); if(chat===$("chat")) addMessages(r.messages||[]); }
  catch(e) {} finally { chatRefreshing=false; }
}

// ---------- start-up ----------
async function netStart() {
  if (!NET.online) return;
  try { NET.bots = (await api("/bots")).bots; } catch (e) {}
  if (!signedIn()) return;
  const switched = await pullNewer(NET.bootLast); // newer save on another device? load it
  await checkInbox(); if (!switched) pushSave(); checkChat();
}
setInterval(checkInbox,12000);
setInterval(() => { if(signedIn()&&mode==="home"&&!document.hidden) checkChat(); },60000);
addEventListener("visibilitychange",()=>{if(!document.hidden) checkInbox();});

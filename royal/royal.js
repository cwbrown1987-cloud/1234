// ---------- FF: Royal (beta): a real-time footy card battler, our own spin on the lane-battler genre ----------
// One oval, two flank corridors. Each side defends two Goal Towers and its Goalposts. Spend Sports Drink 💧 to send
// players from your Footy Fortress album up the flanks. A tower down is a goal; every quarter of a tower's health
// knocked off is a behind. Knock over the Goalposts and you win on the spot.
// Placeholder art throughout: drop files in royal/art/ and they replace the drawn shapes.

const RW = 18, RH = 30;                 // field in tiles (portrait)
const LANES = [4.5, 13.5];
const R_SAVE = "ffRoyal";
const MATCH = 180, LAST_Q = 60, SIREN = 60;
const R_LEAGUES = [["Auskick",0],["Under-12s",300],["Under-18s",600],["Local Footy",1000],["State League",1500],["VFL",2000],["Reserves",2600],["AFL",3300],["All-Australian",4000],["Hall of Fame",5000]];
// Balance dials. first = first-hit delay (s) after reaching a target; costs rise with rating within each position.
const ROLES = {
  mid:{name:"Rover",    cost:3, hp:210, dmg:48, spd:1.15, range:.9, rate:1,   first:.35, deploy:1, icon:"🏃"},
  fwd:{name:"Forward",  cost:4, hp:240, dmg:78, spd:.9,  range:4.5, rate:1.2, first:.5,  deploy:1, icon:"🎯"},
  ruck:{name:"Ruck",    cost:5, hp:950, dmg:85, spd:.6,  range:.9, rate:1.5, first:.6,  deploy:2.5, icon:"🗼", towersOnly:true},
  def:{name:"Defender", cost:4, hp:420, dmg:70, spd:.85, range:.9, rate:1.1, first:.4,  deploy:1, icon:"🛡️", hunter:true, sweep:1.1},
};
// Building and trap tables (base stats at level 1; levels add ~10% each)
const BUILDS = { bench:{hp:900, life:30}, cannon:{hp:700, life:30, dmg:60, range:5.5, rate:.8},
  goaltower:{hp:800, life:40, dmg:75, range:7, rate:1.1}, catapult:{hp:600, life:40, dmg:130, range:9, min:3, rate:3, splash:1.3} };
const TRAPS = { sprinkler:{r:.9, dmg:180, area:1.4}, sendoff:{r:.8}, streaker:{r:1, stun:3, area:2.4}, gust:{r:1, hold:3, area:2.8}, flooder:{r:1.2, dmg:330, area:2.6} };
const BUMP_DMG = 230, BUMP_TOWER = .3, HUDDLE_HEAL = 220, HAIL_DMG = 380, HAIL_R = 3.5;
const q = v => Math.round(v * 100) / 100; // fixed 1/100-tile precision so ties always break the same way   // spell damage, spells' share of damage to towers, heal
const statMul = r => .7 + .6 * (r - 60) / 39;               // rating 60 → ×0.70, rating 99 → ×1.30
// Levels: cards grow ~10% a level (compounding); towers grow ~7.5% a level so low levels are forgiving. Stats always round down.
const MAX_LV = 14;
const cardM = L => Math.round(100 * 1.1 ** (L - 1)), towerM = L => Math.round(100 * 1.075 ** (L - 1));
const lvStat = (base, L) => Math.floor(base * cardM(L) / 100);
const cardLv = id => (RS.lv && RS.lv[id]) || 1;
const upCost = L => 20 * 2 ** (L - 1);                       // gold to go from level L to L+1
const R_SPELLS = [
  {id:"sp-bump", name:"Hip & Shoulder", cost:3, icon:"💥", desc:"Smashes players in an area and dents towers", spell:"bump"},
  {id:"sp-huddle", name:"Huddle", cost:2, icon:"🤝", desc:"Heals your players in an area", spell:"huddle"},
  {id:"bd-bench", name:"Interchange Bench", cost:3, icon:"🪑", desc:"A decoy. Opposition players and Rucks go for it when it's closer than your tower. Drop it in the middle to drag them into range of both Goal Towers. Wears down over 30s.", spell:"bench", build:true},
  {id:"bd-cannon", name:"Siren Cannon", cost:4, icon:"📣", desc:"Fast shots at the nearest attacker in range. Pulls attackers towards it. Wears down over 30s.", spell:"cannon", build:true},
  {id:"bd-goaltower", name:"Goal Tower", cost:5, icon:"🥅", desc:"Long-range kicks at attackers, steady damage. Pulls attackers. Wears down over 40s.", spell:"goaltower", build:true},
  {id:"bd-catapult", name:"Kick-Out Catapult", cost:6, icon:"🏉", desc:"Lobs a ball that hits a whole pack. Huge range but can't hit anyone right next to it. Wears down over 40s.", spell:"catapult", build:true},
  {id:"tr-sprinkler", name:"Sprinkler Trap", cost:2, icon:"💦", desc:"Hidden. Soaks the first attackers who run over it for a burst of damage.", spell:"sprinkler", trap:true},
  {id:"tr-sendoff", name:"Send-Off Gate", cost:3, icon:"🟥", desc:"Hidden. The umpire sends off the first Rover or Forward who steps on it. Rucks are too big.", spell:"sendoff", trap:true},
  {id:"tr-streaker", name:"Streaker", cost:3, icon:"🏃", desc:"Hidden. A streaker runs on and every attacker nearby stops to watch for 3 seconds.", spell:"streaker", trap:true},
  {id:"tr-gust", name:"Wind Gust", cost:4, icon:"🌪️", desc:"Hidden. A gust drags nearby attackers into one spot and holds them for 3 seconds.", spell:"gust", trap:true},
  {id:"tr-flooder", name:"Pitch Flooder", cost:5, icon:"🌊", desc:"Hidden. A huge soaking for a whole pack of attackers.", spell:"flooder", trap:true},
  {id:"sp-hail", name:"Hail Storm", cost:6, icon:"🌩️", desc:"Three strikes on the three toughest targets in a wide area (towers take 30%). A big body can soak a strike for its mates.", spell:"hail"},
];

// ----- cards from the 2026 player list, rated from real per-game stats -----
const R_CARDS = [], R_BY_ID = {};
(function build(){
  const raw = [];
  CARD_SET.forEach((list, ci) => list.forEach((p, i) => { const s = p[3], g = Math.max(1, s[0]);
    if (s[0] < 3 || !ROLES[p[2]]) return;
    raw.push({id:`${ci}-${i}`, club:ci, name:p[0], no:p[1], pos:p[2], score:(s[1] + 6*s[2] + 2*s[3] + 3*s[4] + s[5]/3 + 3*s[6] + 4*s[7]) / g}); }));
  const sorted = raw.map(c => c.score).sort((a, b) => a - b);
  for (const c of raw) { const pct = sorted.indexOf(c.score) / Math.max(1, sorted.length - 1);
    c.rating = Math.round(60 + pct * 39); const role = ROLES[c.pos]; c.cost = role.cost + (c.rating >= 95 ? 1 : 0) - (c.rating < 72 ? 1 : 0);
    R_CARDS.push(c); R_BY_ID[c.id] = c; }
  for (const s of R_SPELLS) R_BY_ID[s.id] = s;
})();

// ----- saves: our own, plus a read of the Footy Fortress album -----
const RS = (() => { try { return JSON.parse(localStorage.getItem(R_SAVE)) || {}; } catch (e) { return {}; } })();
RS.trophies = RS.trophies || 0; RS.wins = RS.wins || 0; RS.played = RS.played || 0; RS.gold = RS.gold ?? 100; RS.lv = RS.lv || {};
const rsave = () => { try { localStorage.setItem(R_SAVE, JSON.stringify(RS)); } catch (e) {} };
// Its own collection: every player is available; pick your favourite club on first launch (no link to Footy Fortress)
function ownedCards(){ const club = RS.club ?? 0; return {ids:R_CARDS.map(c => c.id), club}; }
function myDeck(){
  const own = ownedCards(); let d = (RS.deck || []).filter(id => R_BY_ID[id]);
  for (const c of R_CARDS.filter(c => c.club === own.club).sort((a, b) => b.rating - a.rating)) { if (d.length >= 6) break; if (!d.includes(c.id)) d.push(c.id); }
  for (const s of R_SPELLS) if (d.length < 8 && !d.includes(s.id)) d.push(s.id);
  return d.slice(0, 8);
}
const leagueOf = t => { let k = 0; R_LEAGUES.forEach((l, i) => { if (t >= l[1]) k = i; }); return k; };

// ----- optional art (placeholders are drawn when a file is missing) -----
const RART = {};
for (const k of ["bld-bench", "bld-cannon", "field", "crowd", "tower-flank", "tower-main", "unit-mid", "unit-fwd", "unit-ruck", "unit-def"]) { const im = new Image(); im.onload = () => RART[k] = im; im.src = `art/${k}.webp`; }

// ----- the match -----
let M = null, last = 0;
const cv = document.getElementById("rc"), ctx = cv.getContext("2d"), ui = document.getElementById("rui");
const $r = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clubOf = i => CLUBS[i] || CLUBS[0];
function towers(side, L){ const y = side === 0 ? RH - 5 : 5, gy = side === 0 ? RH - 2.2 : 2.2, k = towerM(L) / 100;
  const t = (kind, x, yy, hp, dmg, range) => ({side, kind, x, y:yy, hp:Math.floor(hp * k), max:Math.floor(hp * k), dmg:Math.floor(dmg * k), range, cd:0, chunks:0});
  return [t("flank", LANES[0], y, 1400, 90, 6.5), t("flank", LANES[1], y, 1400, 90, 6.5), t("main", RW / 2, gy, 2400, 110, 7)]; }
function startMatch(){
  const deck = myDeck(), streak = (RS.lossStreak || 0) >= 3, lg = Math.max(0, leagueOf(RS.trophies) - (streak ? 2 : 0)), oppClub = (Math.random() * 18) | 0;
  const pool = R_CARDS.filter(c => c.club === oppClub).sort((a, b) => streak ? a.rating - b.rating : b.rating - a.rating);
  const oppDeck = pool.slice(0, 5).map(c => c.id).concat(["sp-bump", "bd-cannon", "sp-huddle"]);
  const shuffle = a => a.map(v => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
  // your tower level = average level of your deck; the opponent's matches your league
  const myL = Math.max(1, Math.floor(deck.reduce((s, id) => s + cardLv(id), 0) / deck.length)), oppL = Math.max(1, Math.min(MAX_LV, 1 + lg + (Math.random() < .3 ? 1 : 0)));
  M = { t:0, over:false, units:[], fx:[], towers:[...towers(0, myL), ...towers(1, oppL)], L:[myL, oppL],
    side:[{club:ownedCards().club, drink:5, deck:shuffle(deck), hand:[], next:null, goals:0, behinds:0, lv:id => cardLv(id)},
          {club:oppClub, drink:5, deck:shuffle(oppDeck), hand:[], next:null, goals:0, behinds:0, lv:() => oppL, think:0}],
    sel:null, siren:false };
  for (const s of M.side) { s.hand = s.deck.slice(0, 4); s.next = s.deck[4]; s.queue = s.deck.slice(5); }
  ui.innerHTML = ""; drawBattleUI(); resize();
}
const rateNow = () => M.siren ? 3 : M.t >= MATCH - LAST_Q ? 2 : 1;
function cycle(s, id){ const i = s.hand.indexOf(id); s.hand[i] = s.next; s.queue.push(id); s.next = s.queue.shift(); }
function play(sideIx, id, x, y){
  const s = M.side[sideIx], c = R_BY_ID[id]; if (!c || s.drink < c.cost) return false;
  if ((!c.spell || c.build || c.trap) && (sideIx === 0 ? y < RH / 2 + .5 : y > RH / 2 - .5)) return false; // players and buildings start on your half
  s.drink -= c.cost; cycle(s, id);
  if (c.spell === "bump") { M.fx.push({k:"boom", x, y, t:0});
    for (const u of M.units) if (u.side !== sideIx && Math.hypot(u.x - x, u.y - y) <= 1.8) u.hp -= lvStat(BUMP_DMG, s.lv(id));
    for (const t of M.towers) if (t.side !== sideIx && t.hp > 0 && Math.hypot(t.x - x, t.y - y) <= 2.2) hurtTower(t, Math.floor(lvStat(BUMP_DMG, s.lv(id)) * BUMP_TOWER)); return true; }
  if (c.build) { const L = s.lv(id), B = BUILDS[c.spell], hp = lvStat(B.hp, L);
    M.towers.push({side:sideIx, kind:"bld", bld:c.spell, x, y, hp, max:hp, life:B.life, dmg:B.dmg ? lvStat(B.dmg, L) : 0, range:B.range || 0, min:B.min || 0, splash:B.splash || 0, rate:B.rate || 1, cd:1, chunks:0}); return true; }
  if (c.trap) { const T = TRAPS[c.spell], L = s.lv(id); (M.traps = M.traps || []).push({side:sideIx, t:c.spell, x, y, ...T, dmg:T.dmg ? lvStat(T.dmg, L) : 0, armed:true}); return true; }
  if (c.spell === "hail") { // sort everything in range by current health (toughest first) and strike the top three
    const hits = [...M.units.filter(u => u.side !== sideIx && u.hp > 0 && u.dep <= 0 || u.side !== sideIx && u.hp > 0), ...M.towers.filter(t => t.side !== sideIx && t.hp > 0)]
      .filter(o => Math.hypot(o.x - x, o.y - y) <= HAIL_R).sort((a, b) => b.hp - a.hp).slice(0, 3);
    const d = lvStat(HAIL_DMG, s.lv(id));
    hits.forEach((o, i) => setTimeout(() => { if (!M || M.over) return; M.fx.push({k:"boom", x:o.x, y:o.y, t:0}); if (o.kind) hurtTower(o, Math.floor(d * BUMP_TOWER)); else o.hp -= d; }, i * 250));
    if (!hits.length) M.fx.push({k:"boom", x, y, t:0}); return true; }
  if (c.spell === "huddle") { M.fx.push({k:"heal", x, y, t:0}); for (const u of M.units) if (u.side === sideIx && Math.hypot(u.x - x, u.y - y) <= 2.2) u.hp = Math.min(u.max, u.hp + HUDDLE_HEAL); return true; }
  s.plays = s.plays || {}; s.plays[id] = (s.plays[id] || 0) + 1; const form = s.plays[id] % 3 === 0;
  const r = ROLES[c.pos], L = s.lv(id), m = statMul(c.rating) * (form ? 1.25 : 1), n = c.pos === "mid" && c.cost <= 3 ? 2 : 1, hp = lvStat(r.hp * m, L);
  for (let k = 0; k < n; k++) M.units.push({side:sideIx, card:c, role:r, x:x + (k ? .6 : 0), y, hp, max:hp, dmg:lvStat(r.dmg * m, L), cd:0, dep:r.deploy, form, lane:q(x) < RW / 2 ? 0 : 1, face:1});
  return true;
}
function hurtTower(t, d){ if (t.hp <= 0) return; if (t.kind === "bld") { t.hp = Math.max(0, t.hp - d); if (t.hp <= 0) M.fx.push({k:"boom", x:t.x, y:t.y, t:0}); return; } const before = t.hp; t.hp = Math.max(0, t.hp - d);
  const s = M.side[1 - t.side], q = t.max / 4; while (t.chunks < 3 && t.max - t.hp >= q * (t.chunks + 1)) { t.chunks++; s.behinds++; }
  if (before > 0 && t.hp <= 0) { s.goals++; M.fx.push({k:"goal", x:t.x, y:t.y, t:0}); if (t.kind === "main") return endMatch(1 - t.side); if (M.siren) endMatch(1 - t.side); } }
const SIGHT = 7, GAP = 1.3; // boards across halfway; players cross only through a gap on each flank
function waypoint(u, tx, ty){ const mid = RH / 2, a = u.y - mid, b = ty - mid;
  if (a * b >= 0 || Math.abs(a) < .25) return [tx, ty];                       // same side, or already in the gap
  const gx = LANES[u.lane]; return Math.abs(u.x - gx) < GAP * .8 ? [gx + (u.x - gx) * .5, mid] : [gx, mid + Math.sign(a) * .6]; }
function nearestTower(u){
  const alive = M.towers.filter(t => t.side !== u.side && t.hp > 0), lane = alive.find(t => t.kind === "flank" && Math.abs(t.x - LANES[u.lane]) < 1);
  const main = lane || alive.find(t => t.kind === "main") || alive.find(t => t.kind !== "bld");
  const dist = t => t ? Math.hypot(t.x - u.x, t.y - u.y) : 1e9;
  const bld = alive.filter(t => t.kind === "bld" && dist(t) <= SIGHT).sort((a, b) => dist(a) - dist(b))[0];
  return bld && dist(bld) < dist(main) ? bld : main; }
function step(dt){
  if (!M || M.over) return; M.t += dt;
  for (const s of M.side) s.drink = Math.min(10, s.drink + dt / 2.8 * rateNow());
  if (M.t >= MATCH && !M.siren) { const [a, b] = M.side; if (a.goals !== b.goals) return endMatch(a.goals > b.goals ? 0 : 1); M.siren = true; toast("📢 Siren time! Next goal wins"); }
  if (M.siren && M.t >= MATCH + SIREN) { const [a, b] = M.side; return endMatch(a.behinds === b.behinds ? -1 : a.behinds > b.behinds ? 0 : 1); }
  ai(dt);
  for (const u of M.units) { if (u.hp <= 0) continue; if (u.dep > 0) { u.dep -= dt; continue; } if (u.stun > 0) { u.stun -= dt; u.moving = false; continue; } u.cd -= dt;
    let tgt = null, td = 1e9;
    if (!u.role.towersOnly) for (const o of M.units) { if (o.side === u.side || o.hp <= 0) continue; const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < td && d <= (u.role.hunter ? 6 : 4)) { td = d; tgt = o; } }
    if (!tgt) { tgt = nearestTower(u); td = tgt ? Math.hypot(tgt.x - u.x, tgt.y - u.y) - (tgt.kind === "main" ? 1.3 : .9) : 1e9; }
    if (!tgt) continue;
    if (td > u.role.range) { u.engaged = null; const [wx, wy] = waypoint(u, tgt.x, tgt.y), dx = wx - u.x, dy = wy - u.y, d = Math.hypot(dx, dy) || 1; u.x += dx / d * u.role.spd * dt; u.y += dy / d * u.role.spd * dt; u.face = dx >= 0 ? 1 : -1; u.moving = true; }
    else { u.moving = false; u.atkT = Math.max(0, (u.atkT || 0) - dt); if (u.engaged !== tgt) { u.engaged = tgt; u.cd = Math.max(u.cd, u.role.first); } if (u.cd <= 0) { u.cd = u.role.rate; u.atkT = .5; const t = tgt;
      if (u.role.range > 2) M.fx.push({k:"kick", x:u.x, y:u.y, tx:t.x, ty:t.y, t:0});
      if (t.max && t.kind) hurtTower(t, u.dmg); else { t.hp -= u.dmg;
        if (u.role.sweep) for (const o of M.units) if (o !== t && o.side !== u.side && o.hp > 0 && Math.hypot(o.x - t.x, o.y - t.y) <= u.role.sweep) o.hp -= u.dmg; } } } }
  for (const tr of M.traps || []) { if (!tr.armed) continue;
    const near = r => M.units.filter(u => u.side !== tr.side && u.hp > 0 && u.dep <= 0 && Math.hypot(u.x - tr.x, u.y - tr.y) <= r);
    const trig = near(tr.r); if (!trig.length) continue; tr.armed = false; tr.sprung = .8;
    if (tr.t === "sprinkler" || tr.t === "flooder") { M.fx.push({k:"heal", x:tr.x, y:tr.y, t:0}); for (const u of near(tr.area)) u.hp -= tr.dmg; }
    if (tr.t === "sendoff") { const v = trig.find(u => !u.role.towersOnly); if (v) { v.hp = 0; M.fx.push({k:"boom", x:v.x, y:v.y, t:0}); } }
    if (tr.t === "streaker") for (const u of near(tr.area)) u.stun = tr.stun;
    if (tr.t === "gust") for (const u of near(tr.area)) { u.x = tr.x + (u.x - tr.x) * .3; u.y = tr.y + (u.y - tr.y) * .3; u.stun = tr.hold; } }
  // pushing: faster teammates crowding a slower player from behind nudge it forward (lighter pushers add less)
  for (const a of M.units) { if (a.hp <= 0 || !a.moving || a.dep > 0) continue; const fwd = a.side === 0 ? -1 : 1;
    for (const b of M.units) { if (b === a || b.side !== a.side || b.hp <= 0 || !b.moving || b.role.spd <= a.role.spd) continue;
      const dy = (a.y - b.y) * fwd, dx = Math.abs(a.x - b.x); if (dy > 0 && dy < .7 && dx < .5) a.y += fwd * (b.role.spd - a.role.spd) * .5 * dt; } }
  // players spread out a little so they don't stack
  for (const a of M.units) for (const b of M.units) { if (a === b || a.hp <= 0 || b.hp <= 0) continue; const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy); if (d > 0 && d < .55) a.x += (dx || (a.side ? .1 : -.1)) / (d || 1) * .02; }
  for (const t of M.towers) { if (t.hp <= 0) continue; if (t.kind === "bld") { t.hp -= t.max / t.life * dt; if (t.hp <= 0) { t.hp = 0; continue; } if (!t.dmg) continue; }
    t.cd -= dt; if (t.cd > 0) continue;
    let tgt = null, td = t.range; for (const u of M.units) { if (u.side === t.side || u.hp <= 0) continue; const d = Math.hypot(u.x - t.x, u.y - t.y); if (d <= td && d >= (t.min || 0)) { td = d; tgt = u; } }
    if (tgt && t.splash) { t.cd = t.rate; const tx = tgt.x, ty = tgt.y, d = t.dmg; M.fx.push({k:"kick", x:t.x, y:t.y, tx, ty, t:0});
      setTimeout(() => { if (!M || M.over) return; M.fx.push({k:"boom", x:tx, y:ty, t:0}); for (const u of M.units) if (u.side !== t.side && u.hp > 0 && Math.hypot(u.x - tx, u.y - ty) <= t.splash) u.hp -= d; }, 450); continue; }
    if (tgt) { t.cd = t.rate || .9; tgt.hp -= t.dmg; M.fx.push({k:"kick", x:t.x, y:t.y, tx:tgt.x, ty:tgt.y, t:0}); } }
  M.units = M.units.filter(u => u.hp > 0 || (u.dead = (u.dead || 0) + dt) < .4);
  for (const f of M.fx) f.t += dt; M.fx = M.fx.filter(f => f.t < (f.k === "goal" ? 1.6 : .45));
}
function ai(dt){
  const s = M.side[1]; s.think -= dt; if (s.think > 0) return; s.think = .6 + Math.random() * .8;
  const threat = M.units.filter(u => u.side === 0 && u.y < RH * .55).sort((a, b) => a.y - b.y)[0];
  const affordable = s.hand.filter(id => R_BY_ID[id].cost <= s.drink); if (!affordable.length) return;
  if (threat) { const huddle = affordable.find(id => id === "sp-huddle"), bump = affordable.find(id => id === "sp-bump");
    const pack = M.units.filter(u => u.side === 0 && Math.hypot(u.x - threat.x, u.y - threat.y) < 1.8).length;
    if (bump && pack >= 2) return play(1, bump, threat.x, threat.y);
    const bld = affordable.find(i => R_BY_ID[i].build); if (bld && Math.random() < .5) return play(1, bld, RW / 2, 9);
    const id = affordable.find(i => !R_BY_ID[i].spell); if (id) return play(1, id, Math.max(1, Math.min(RW - 1, threat.x)), Math.max(2, threat.y - 2.5));
    return; }
  if (s.drink < 7 && Math.random() < .7) return; // save up for a push, like a real player
  const id = affordable.filter(i => !R_BY_ID[i].spell).sort((a, b) => R_BY_ID[b].cost - R_BY_ID[a].cost)[0]; if (!id) return;
  play(1, id, LANES[Math.random() < .5 ? 0 : 1] + (Math.random() - .5), 3.5 + Math.random() * 3);
}
function endMatch(win){
  if (M.over) return; M.over = true; RS.played++;
  const delta = win === 0 ? 30 : win === 1 ? -15 : 0; RS.trophies = Math.max(0, RS.trophies + delta); const gold = win === 0 ? 40 + 10 * leagueOf(RS.trophies) : win === -1 ? 15 : 5; RS.gold += gold; if (win === 0) RS.wins++; RS.lossStreak = win === 1 ? (RS.lossStreak || 0) + 1 : 0; rsave();
  const [a, b] = M.side, A = clubOf(a.club), B = clubOf(b.club);
  setTimeout(() => { ui.innerHTML = `<div class="rpanel result"><h2>${win === 0 ? "You win! 🏆" : win === 1 ? "Siren. You lost" : "It's a draw"}</h2>
    <div class="score"><b>${A.short} ${a.goals}.${a.behinds} (${a.goals * 6 + a.behinds})</b><span>v</span><b>${B.short} ${b.goals}.${b.behinds} (${b.goals * 6 + b.behinds})</b></div>
    <p>${delta >= 0 ? "+" : ""}${delta} 🏆 · +${gold} 🪙 · ${R_LEAGUES[leagueOf(RS.trophies)][0]} (${RS.trophies} 🏆)</p>
    <button class="rbtn gold big" id="rAgain">Play again</button><button class="rbtn" id="rHome">Home</button></div>`;
    $r("rAgain").onclick = startMatch; $r("rHome").onclick = home; }, 900);
}

// ----- drawing -----
let SC = 20, OX = 0, OY = 0;
function resize(){ const bar = M && !M.over ? 128 : 0, w = innerWidth, h = innerHeight - bar; SC = Math.min(w / RW, h / RH); OX = (w - RW * SC) / 2; OY = Math.max(0, (h - RH * SC) / 2);
  cv.width = w * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cv.style.width = w + "px"; cv.style.height = innerHeight + "px"; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
addEventListener("resize", resize);
const X = x => OX + x * SC, Y = y => OY + y * SC;
function drawField(){
  ctx.fillStyle = "#0d1a24"; ctx.fillRect(0, 0, innerWidth, innerHeight);
  if (RART.crowd) { ctx.save(); ctx.globalAlpha = .55; const cw = 160, ch = 128; for (let y = 0; y < innerHeight; y += ch) for (let x = 0; x < innerWidth; x += cw) ctx.drawImage(RART.crowd, x, y, cw, ch); ctx.restore(); }
  if (RART.field) { ctx.drawImage(RART.field, X(0), Y(0), RW * SC, RH * SC); return; }
  ctx.save(); ctx.beginPath(); ctx.ellipse(X(RW / 2), Y(RH / 2), RW * SC * .62, RH * SC * .52, 0, 0, 7); ctx.fillStyle = "#3f8f3a"; ctx.fill(); ctx.clip();
  for (let i = 0; i < RH; i += 2) { ctx.fillStyle = "#4a9a43"; ctx.fillRect(X(0) - SC * 4, Y(i), RW * SC + SC * 8, SC); }
  ctx.strokeStyle = "#ffffffcc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(X(RW / 2), Y(RH / 2), RW * SC * .6, RH * SC * .5, 0, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X(0), Y(RH / 2)); ctx.lineTo(X(RW), Y(RH / 2)); ctx.stroke();
  // boundary boards across halfway, gaps on each flank
  const segs = [[-2, LANES[0] - GAP], [LANES[0] + GAP, LANES[1] - GAP], [LANES[1] + GAP, RW + 2]], bh = SC * .55;
  for (const [a, b] of segs) { const x0 = X(a), w = (b - a) * SC, y0 = Y(RH / 2) - bh / 2;
    ctx.fillStyle = "#13314d"; ctx.fillRect(x0, y0, w, bh); ctx.fillStyle = "#ffd34d"; ctx.fillRect(x0, y0, w, bh * .22);
    ctx.fillStyle = "#fff"; ctx.font = `bold ${bh * .55}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let x = x0 + SC * 1.6; x < x0 + w - SC; x += SC * 3.2) ctx.fillText("FF ROYAL", x, y0 + bh * .6); }
  ctx.beginPath(); ctx.arc(X(RW / 2), Y(RH / 2), SC * 2.2, 0, 7); ctx.stroke();
  for (const y of [RH * .27, RH * .73]) { ctx.beginPath(); ctx.ellipse(X(RW / 2), Y(y > RH / 2 ? RH : 0), SC * 7, SC * 8, 0, 0, 7); ctx.stroke(); }
  for (const lx of LANES) { ctx.fillStyle = "#ffffff12"; ctx.fillRect(X(lx - 1.4), Y(4), SC * 2.8, SC * (RH - 8)); }
  ctx.restore();
  if (M && M.sel) { ctx.fillStyle = "#ff40401c"; ctx.fillRect(X(0), Y(0), RW * SC, RH / 2 * SC); }
}
const TRAP_ICON = {sprinkler:"💦", sendoff:"🟥", streaker:"🏃", gust:"🌪️", flooder:"🌊"};
function drawTrap(tr){ const show = tr.side === 0 ? (tr.armed ? .45 : 0) : 0; const sprung = tr.sprung > 0 ? tr.sprung : 0;
  if (!show && !sprung) return; ctx.globalAlpha = sprung ? Math.min(1, sprung) : show; ctx.font = `${SC * .9}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(TRAP_ICON[tr.t], X(tr.x), Y(tr.y)); ctx.globalAlpha = 1; }
function drawTower(t){
  if (t.kind === "bld") { if (t.hp <= 0) return; const c = clubOf(M.side[t.side].club), x = X(t.x), y = Y(t.y), s = SC * 1.6, im = RART["bld-" + t.bld];
    ctx.fillStyle = c.a; ctx.beginPath(); ctx.ellipse(x, y, s * .55, s * .22, 0, 0, 7); ctx.fill();
    if (im) { const ih = s * (t.bld === "cannon" || t.bld === "goaltower" ? 1.5 : 1.1), iw = ih * im.width / im.height; ctx.drawImage(im, x - iw / 2, y + s * .15 - ih, iw, ih); }
    else { ctx.font = `${s * .8}px sans-serif`; ctx.textAlign = "center"; ctx.fillText({cannon:"📣", bench:"🪑", catapult:"🏉", goaltower:"🥅"}[t.bld] || "🏗️", x, y); }
    ctx.fillStyle = "#000a"; ctx.fillRect(x - s * .5, y + s * .3, s, 5); ctx.fillStyle = t.side === 0 ? "#3ccf55" : "#ff5a4a"; ctx.fillRect(x - s * .5, y + s * .3, s * t.hp / t.max, 5); return; }
  const c = clubOf(M.side[t.side].club), big = t.kind === "main", w = (big ? 2.4 : 1.7) * SC, h = (big ? 3.1 : 2.4) * SC, x = X(t.x), y = Y(t.y);
  if (t.hp <= 0) { ctx.fillStyle = "#5b5148"; ctx.beginPath(); ctx.ellipse(x, y, w * .45, h * .18, 0, 0, 7); ctx.fill(); return; }
  const im = RART[big ? "tower-main" : "tower-flank"];
  if (im) { const ih = h * (big ? 1.25 : 1.45), iw = ih * im.width / im.height; ctx.fillStyle = c.a; ctx.beginPath(); ctx.ellipse(x, y + h * .12, w * .62, w * .26, 0, 0, 7); ctx.fill(); ctx.drawImage(im, x - iw / 2, y + h * .2 - ih, iw, ih); }
  else { ctx.fillStyle = c.a; ctx.fillRect(x - w / 2, y - h * .55, w, h * .7); ctx.fillStyle = c.b; ctx.fillRect(x - w / 2, y - h * .55, w, h * .16);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; for (const k of big ? [-.32, -.11, .11, .32] : [-.22, .22]) { ctx.beginPath(); ctx.moveTo(x + w * k, y - h * .55); ctx.lineTo(x + w * k, y - h * (big ? 1.05 : .9)); ctx.stroke(); }
    ctx.strokeStyle = "#111"; ctx.lineWidth = 1.5; ctx.strokeRect(x - w / 2, y - h * .55, w, h * .7); }
  const bw = w * 1.1; ctx.fillStyle = "#000a"; ctx.fillRect(x - bw / 2, y + h * .2, bw, 6); ctx.fillStyle = t.side === 0 ? "#3ccf55" : "#ff5a4a"; ctx.fillRect(x - bw / 2, y + h * .2, bw * t.hp / t.max, 6);
}
function drawUnit(u){
  const c = clubOf(M.side[u.side].club), x = X(u.x), y = Y(u.y), r = SC * (u.role.towersOnly ? .5 : .38);
  ctx.globalAlpha = u.hp > 0 ? (u.dep > 0 ? .55 : 1) : Math.max(0, 1 - u.dead / .4);
  const im = RART["unit-" + u.card.pos];
  if (u.form && u.hp > 0) { ctx.fillStyle = "#ffd34d55"; ctx.beginPath(); ctx.arc(x, y - r * .8, r * 1.5, 0, 7); ctx.fill(); }
  if (im) { const dead = u.hp <= 0, row = dead ? 5 : u.moving ? (u.side === 0 ? 1 : 0) : (u.atkT > 0 ? (u.side === 0 ? 3 : 2) : 4),
      n = [8, 8, 6, 6, 4, 4][row], col = dead ? Math.min(3, Math.floor(u.dead / .1)) : Math.floor(performance.now() / 90 + u.x * 7) % n, s = r * 3.4;
    ctx.fillStyle = "#0005"; ctx.beginPath(); ctx.ellipse(x, y + r * .2, r * .9, r * .32, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c.a; ctx.beginPath(); ctx.ellipse(x, y + r * .2, r * .75, r * .26, 0, 0, 7); ctx.fill(); ctx.strokeStyle = u.side === 0 ? "#7fe0ff" : "#ff8a7a"; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.translate(x, y + r * .25); if (u.face < 0) ctx.scale(-1, 1); ctx.drawImage(im, col * 128, row * 128, 128, 128, -s / 2, -s, s, s); ctx.restore(); }
  else { ctx.fillStyle = "#0004"; ctx.beginPath(); ctx.ellipse(x, y + r * .8, r, r * .35, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c.a; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = c.b; ctx.fillRect(x - r * .7, y - r * .25, r * 1.4, r * .5);
    ctx.lineWidth = 2; ctx.strokeStyle = u.side === 0 ? "#7fe0ff" : "#ff8a7a"; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = `bold ${r * .9}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(u.card.no, x, y + 1); }
  if (u.hp > 0 && u.hp < u.max) { ctx.fillStyle = "#000a"; ctx.fillRect(x - r, y - r * 1.6, r * 2, 4); ctx.fillStyle = u.side === 0 ? "#3ccf55" : "#ff5a4a"; ctx.fillRect(x - r, y - r * 1.6, r * 2 * u.hp / u.max, 4); }
  ctx.globalAlpha = 1;
}
function drawFx(f){
  if (f.k === "kick") { const p = f.t / .45, x = X(f.x + (f.tx - f.x) * p), y = Y(f.y + (f.ty - f.y) * p) - Math.sin(p * Math.PI) * SC; ctx.fillStyle = "#b5422a"; ctx.beginPath(); ctx.ellipse(x, y, 5, 3.5, p * 6, 0, 7); ctx.fill(); }
  if (f.k === "boom" || f.k === "heal") { ctx.globalAlpha = 1 - f.t / .45; ctx.fillStyle = f.k === "boom" ? "#ffb347" : "#7dffa0"; ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), SC * 1.8 * (.4 + f.t * 2), 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  if (f.k === "goal") { ctx.fillStyle = "#ffe066"; ctx.font = `900 ${SC * 1.4}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("GOAL!", X(f.x), Y(f.y) - SC * 2 - f.t * SC); }
}
function frame(now){
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  if (M) { step(dt); drawField(); (M.traps || []).forEach(t => { if (t.sprung > 0) t.sprung -= dt; drawTrap(t); }); M.towers.forEach(drawTower); [...M.units].sort((a, b) => a.y - b.y).forEach(drawUnit); M.fx.forEach(drawFx); updateBar(); }
  else drawField();
  requestAnimationFrame(frame);
}

// ----- battle UI: scoreboard on top, card bar at the bottom -----
// Cards use Footy Fortress's card frames (rarity by rating) and the player's sprite as the picture
const tierOf = c => c.spell ? "star-wildcard" : c.rating >= 93 ? "legendary" : c.rating >= 85 ? "epic" : c.rating >= 75 ? "rare" : "common";
function cardTile(id, i){ const c = R_BY_ID[id]; if (!c) return ""; const cl = c.spell ? null : clubOf(c.club);
  const pic = c.spell ? `<span class="ricon">${c.icon}</span>` : `<span class="rpic" style="background-image:url(art/unit-${c.pos}.webp)"></span>`;
  return `<button class="rcard${c.spell ? " spell" : ""}${(M && M.sel) === id ? " on" : ""}" data-rc="${id}" style="--a:${cl ? cl.a : "#5b2d8a"};--b:${cl ? cl.b : "#c9a0ff"};${c.spell ? "" : `;--frame:url(art/cards/frame-${tierOf(c)}.webp)`}"><i class="cost">${c.cost}</i>
    <span class="rinner">${pic}${c.spell ? "" : `<i class="rrate">${c.rating}</i>`}<i class="rlv">Lv${cardLv(id)}</i></span><b>${esc(c.spell ? c.name : c.name.split(" ").slice(-1)[0])}</b><small>${c.build ? "Building" : c.trap ? "Trap" : c.spell ? "Spell" : ROLES[c.pos].name}</small></button>`; }
function drawBattleUI(){
  ui.innerHTML = `<div class="rtop"><span id="rScore"></span><span id="rClock"></span></div>
    <div class="rbar"><div class="rnext"><small>Next</small><div id="rNext"></div></div><div class="rhand" id="rHand"></div>
    <div class="rdrink"><i id="rDrinkFill"></i><b id="rDrinkN"></b><span>💧</span></div></div>`;
  renderHand();
}
function cardWhat(c){ return c.spell ? c.desc : ROLE_TEXT[c.pos]; }
function renderHint(){ let h = $r("rHint"); if (!h) { h = document.createElement("div"); h.id = "rHint"; ui.appendChild(h); }
  const c = M.sel && R_BY_ID[M.sel]; h.hidden = !c; if (c) h.innerHTML = `<b>${esc(c.name)} · ${c.cost} 💧</b> ${esc(cardWhat(c))} <i>Tap your half to place it.</i>`; }
function renderHand(){ const s = M.side[0]; $r("rHand").innerHTML = s.hand.map(id => { const t = cardTile(id), c = R_BY_ID[id]; return !c.spell && ((s.plays || {})[id] || 0) % 3 === 2 ? t.replace('class="rcard', 'class="rcard inform') : t; }).join(""); $r("rNext").innerHTML = cardTile(s.next).replace("rcard", "rcard mini");
  ui.querySelectorAll("#rHand [data-rc]").forEach(b => b.onclick = () => { M.sel = M.sel === b.dataset.rc ? null : b.dataset.rc; renderHand(); }); renderHint(); }
let lastHand = "";
function updateBar(){ if (M.over || !$r("rHand")) return; const s = M.side[0], o = M.side[1], A = clubOf(s.club), B = clubOf(o.club);
  $r("rDrinkFill").style.width = s.drink * 10 + "%"; $r("rDrinkN").textContent = Math.floor(s.drink);
  const left = M.siren ? MATCH + SIREN - M.t : MATCH - M.t, mm = Math.max(0, Math.floor(left / 60)), ss = Math.max(0, Math.floor(left % 60));
  $r("rClock").textContent = `${M.siren ? "📢 Siren time " : rateNow() > 1 ? "Last quarter ×2 · " : ""}${mm}:${String(ss).padStart(2, "0")}`;
  $r("rScore").textContent = `${A.short} ${s.goals}.${s.behinds} (${s.goals * 6 + s.behinds}) v ${B.short} ${o.goals}.${o.behinds} (${o.goals * 6 + o.behinds})`;
  const key = s.hand.join() + s.next + Math.floor(s.drink); if (key !== lastHand) { lastHand = key; renderHand(); ui.querySelectorAll("#rHand .rcard").forEach(b => { const ok = R_BY_ID[b.dataset.rc].cost <= s.drink; b.classList.toggle("poor", !ok); b.classList.toggle("ready", ok); }); } }
cv.addEventListener("pointerdown", e => { if (!M || M.over || !M.sel) return; const x = (e.clientX - OX) / SC, y = (e.clientY - OY) / SC;
  if (x < 0 || x > RW || y < 0 || y > RH) return;
  if (!play(0, M.sel, x, y)) return toast(R_BY_ID[M.sel].cost > M.side[0].drink ? "Not enough 💧 yet" : "Players start on your half");
  M.sel = null; renderHand(); });

// ----- menus -----
function toast(t){ const el = document.createElement("div"); el.className = "rtoast"; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 1800); }
function home(){ M = null; resize(); const lg = leagueOf(RS.trophies), next = R_LEAGUES[lg + 1];
  ui.innerHTML = `<div class="rpanel home"><div class="rhub"><b>FF: <span>Royal</span></b><i class="beta">BETA</i></div>
    <div class="rleague"><b>${R_LEAGUES[lg][0]}</b><span>🏆 ${RS.trophies}${next ? ` · ${next[1] - RS.trophies} to ${next[0]}` : ""} · 🪙 ${RS.gold}</span></div>
    <button class="rbtn battle big" id="rPlay">⚔️ Battle</button><button class="rbtn blue" id="rDeck">🃏 My deck</button><button class="rbtn" id="rHow">❓ How to play</button>
    <button class="rbtn ghost" id="rClub">Club: ${clubOf(RS.club ?? 0).name}</button><p class="tiny">Wins ${RS.wins} / ${RS.played}</p></div>`;
  $r("rPlay").onclick = startMatch; $r("rDeck").onclick = deckScreen; $r("rHow").onclick = howTo;
  $r("rClub").onclick = () => { RS.club = ((RS.club ?? 0) + 1) % CLUBS.length; RS.deck = null; rsave(); home(); }; }
// What a card actually does, with its numbers (same maths as in battle)
const ROLE_TEXT = {mid:"Fast runner who attacks whatever is nearest. Cheaper Rovers (3 💧) run on in pairs.", fwd:"Kicks goals from range. Fragile up close, so protect them.",
  ruck:"A big body that ignores players and marches straight at towers.", def:"Hunts down attacking players from further away, and each hit sweeps through a pack."};
function cardStats(c, L = cardLv(c.id)){
  if (c.build) { const B = BUILDS[c.spell]; return [["Cost", c.cost + " 💧"], ["Hitpoints", lvStat(B.hp, L)], ["Lasts", B.life + "s"], ["Damage", B.dmg ? `${lvStat(B.dmg, L)} every ${B.rate}s` : "None (decoy)"],
    ["Range", B.range ? (B.min ? `${B.min}–${B.range} tiles` : B.range + " tiles") : "–"], ["Area", B.splash ? "Radius " + B.splash : "Single target"], ["Pulls from", SIGHT + " tiles"], ["Level", L]]; }
  if (c.trap) { const T = TRAPS[c.spell]; return [["Cost", c.cost + " 💧"], ["Hidden", "Until sprung"], ["Trigger", "Within " + T.r + " tiles"],
    T.dmg ? ["Damage", lvStat(T.dmg, L)] : T.stun ? ["Stops players", T.stun + "s"] : T.hold ? ["Holds players", T.hold + "s"] : ["Effect", "Sends off 1 player"], ["Area", T.area ? "Radius " + T.area : "One player"], ["Level", L]]; }
  if (c.spell === "hail") return [["Cost", c.cost + " 💧"], ["Area", "Radius " + HAIL_R], ["Strikes", "3 (toughest first)"], ["Damage", lvStat(HAIL_DMG, L) + " each"], ["To towers (30%)", Math.floor(lvStat(HAIL_DMG, L) * BUMP_TOWER)], ["Level", L]];
  if (c.spell) return [["Cost", c.cost + " 💧"], ["Area", c.spell === "bump" ? "Radius 1.8" : "Radius 2.2"], c.spell === "bump" ? ["Damage", lvStat(BUMP_DMG, L)] : ["Heals", HUDDLE_HEAL + " each"], c.spell === "bump" ? ["To towers (30%)", Math.floor(lvStat(BUMP_DMG, L) * BUMP_TOWER)] : ["Targets", "Your players"], ["Level", L]];
  const r = ROLES[c.pos], m = statMul(c.rating), n = c.pos === "mid" && c.cost <= 3 ? 2 : 1, hp = lvStat(r.hp * m, L), dmg = lvStat(r.dmg * m, L), bump = lvStat(BUMP_DMG, L);
  return [["Cost", c.cost + " 💧"], ["Rating", c.rating], ["Level", L], ["Hitpoints", hp], ["Damage", dmg], ["Hit speed", r.rate + "s"], ["Damage/sec", Math.floor(dmg / r.rate)],
    ["Speed", r.spd >= 1.1 ? "Fast" : r.spd >= .85 ? "Medium" : "Slow"], ["Range", r.range > 2 ? r.range + " tiles" : r.sweep ? "Melee, sweeps" : "Melee"], ["Targets", r.towersOnly ? "Towers" : "Players & towers"], ["Count", "×" + n], ["First hit", r.first + "s"], ["Deploy time", r.deploy + "s"], ["Hip & Shoulder", hp > bump ? `Survives (${hp - bump} left)` : "Knocked out"]];
}
function cardInfo(id, onToggle, inDeck){
  const c = R_BY_ID[id], el = document.createElement("div"); el.className = "rinfo";
  el.innerHTML = `<div class="rinfo-box"><div class="rinfo-top">${cardTile(id)}<div><h3>${esc(c.name)}</h3><small>${c.build ? "Building" : c.trap ? "Trap" : c.spell ? "Spell" : `${ROLES[c.pos].name} · ${esc(clubOf(c.club).name)} · #${c.no}`}</small>
    <p>${c.spell ? c.desc : ROLE_TEXT[c.pos]}</p></div></div><div class="rstats">${cardStats(c).map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join("")}</div>
    <div class="rinfo-btns">${cardLv(id) < MAX_LV ? `<button class="rbtn battle" id="rInfoUp">⬆ Level ${cardLv(id) + 1}<small> ${upCost(cardLv(id))} 🪙</small></button>` : ""}<button class="rbtn ${inDeck ? "" : "gold"}" id="rInfoGo">${inDeck ? "Remove from deck" : "Add to deck"}</button><button class="rbtn blue" id="rInfoX">Close</button></div></div>`;
  document.body.appendChild(el); el.onclick = e => { if (e.target === el) el.remove(); };
  el.querySelector("#rInfoX").onclick = () => el.remove();
  const up = el.querySelector("#rInfoUp"); if (up) up.onclick = () => { const L = cardLv(id), cost = upCost(L); if (RS.gold < cost) return toast(`Need ${cost} 🪙. Win matches for gold`);
    RS.gold -= cost; RS.lv[id] = L + 1; rsave(); el.remove(); cardInfo(id, onToggle, inDeck); toast(`${c.name} is now level ${L + 1}`); }; el.querySelector("#rInfoGo").onclick = () => { el.remove(); onToggle(); };
}
function deckScreen(){ M = null; let deck = myDeck(); const own = ownedCards().ids.map(id => R_BY_ID[id]).concat(R_SPELLS);
  const draw = () => { const shown = own.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    ui.innerHTML = `<div class="rpanel deck"><h2>My deck <small>${deck.length}/8</small></h2><div class="rgrid">${deck.map(id => cardTile(id)).join("")}</div>
      <h3>All players <small>2026 season</small></h3><div class="rgrid all">${shown.map(c => cardTile(c.id).replace("rcard", "rcard" + (deck.includes(c.id) ? " in" : ""))).join("")}</div>
      <button class="rbtn gold" id="rSave">Save deck</button></div>`;
    ui.querySelectorAll(".rgrid [data-rc]").forEach(b => b.onclick = () => { const id = b.dataset.rc;
      cardInfo(id, () => { if (deck.includes(id)) deck = deck.filter(x => x !== id); else if (deck.length < 8) deck.push(id); else toast("A deck holds 8 cards. Remove one first"); draw(); }, deck.includes(id)); });
    $r("rSave").onclick = () => { if (deck.length !== 8) return toast("Pick 8 cards"); RS.deck = deck; rsave(); home(); }; };
  M = {sel:null}; draw(); M = null; }
function howTo(){ ui.innerHTML = `<div class="rpanel"><h2>How to play</h2><ul class="rhow">
    <li>🪙 Win matches for gold, then tap a card in My deck to level it up. Each level adds about 10% health and damage. Your Goal Towers level up with your deck's average level.</li>
    <li>⭐ Play a player card twice and its next play comes on <b>in form</b>: 25% stronger, with a gold glow.</li>
    <li>🪑 Buildings go on your half. Opposition players and Rucks walk to a building when it's closer than your tower. Drop one in the middle to pull them into range of both Goal Towers.</li>
    <li>💧 Sports Drink refills over time (up to 10). Tap a card, then tap your half of the ground to send a player.</li>
    <li>Players run up the nearest flank and go for the other team's Goal Towers, then their Goalposts.</li>
    <li>🏃 Rovers come in pairs. 🎯 Forwards kick from range. 🗼 Rucks only go for towers. 🛡️ Defenders hunt down attackers.</li>
    <li>A tower down is a <b>goal</b>. Every quarter of a tower's health knocked off is a <b>behind</b>. Knock over the Goalposts to win straight away.</li>
    <li>The last minute is the last quarter: drink flows twice as fast. Level on goals after 3 minutes? <b>Siren time</b>: next goal wins.</li>
    <li>Build your deck of 8 from any 2026 player. Tap Club on the home screen to change your team.</li></ul><button class="rbtn gold" id="rBack">Got it</button></div>`;
  $r("rBack").onclick = home; }

requestAnimationFrame(frame); home();

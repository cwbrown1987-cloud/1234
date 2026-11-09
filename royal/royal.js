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
const ROLES = {
  mid:{name:"Rover",    cost:3, hp:300, dmg:60, spd:1.15, range:.9, rate:1,   icon:"🏃"},
  fwd:{name:"Forward",  cost:4, hp:220, dmg:70, spd:.9,  range:4.5, rate:1.2, icon:"🎯"},
  ruck:{name:"Ruck",    cost:5, hp:950, dmg:85, spd:.6,  range:.9, rate:1.5, icon:"🗼", towersOnly:true},
  def:{name:"Defender", cost:4, hp:520, dmg:55, spd:.85, range:.9, rate:1,   icon:"🛡️", hunter:true},
};
const R_SPELLS = [
  {id:"sp-bump", name:"Hip & Shoulder", cost:3, icon:"💥", desc:"Smashes players in an area and dents towers", spell:"bump"},
  {id:"sp-huddle", name:"Huddle", cost:2, icon:"🤝", desc:"Heals your players in an area", spell:"huddle"},
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
    c.rating = Math.round(60 + pct * 39); const role = ROLES[c.pos]; c.cost = role.cost + (c.rating >= 92 ? 1 : 0);
    R_CARDS.push(c); R_BY_ID[c.id] = c; }
  for (const s of R_SPELLS) R_BY_ID[s.id] = s;
})();

// ----- saves: our own, plus a read of the Footy Fortress album -----
const RS = (() => { try { return JSON.parse(localStorage.getItem(R_SAVE)) || {}; } catch (e) { return {}; } })();
RS.trophies = RS.trophies || 0; RS.wins = RS.wins || 0; RS.played = RS.played || 0;
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
for (const k of ["field", "crowd", "tower-flank", "tower-main", "unit-mid", "unit-fwd", "unit-ruck", "unit-def"]) { const im = new Image(); im.onload = () => RART[k] = im; im.src = `art/${k}.webp`; }

// ----- the match -----
let M = null, last = 0;
const cv = document.getElementById("rc"), ctx = cv.getContext("2d"), ui = document.getElementById("rui");
const $r = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clubOf = i => CLUBS[i] || CLUBS[0];
function towers(side){ const y = side === 0 ? RH - 5 : 5, gy = side === 0 ? RH - 2.2 : 2.2;
  return [{side, kind:"flank", x:LANES[0], y, hp:1400, max:1400, dmg:90, range:6.5, cd:0, chunks:0},
          {side, kind:"flank", x:LANES[1], y, hp:1400, max:1400, dmg:90, range:6.5, cd:0, chunks:0},
          {side, kind:"main", x:RW/2, y:gy, hp:2400, max:2400, dmg:110, range:7, cd:0, chunks:0}]; }
function startMatch(){
  const deck = myDeck(), lg = leagueOf(RS.trophies), oppClub = (Math.random() * 18) | 0;
  const pool = R_CARDS.filter(c => c.club === oppClub).sort((a, b) => b.rating - a.rating);
  const oppDeck = pool.slice(0, 6).map(c => c.id).concat(R_SPELLS.map(s => s.id));
  const shuffle = a => a.map(v => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
  M = { t:0, over:false, units:[], fx:[], towers:[...towers(0), ...towers(1)],
    side:[{club:ownedCards().club, drink:5, deck:shuffle(deck), hand:[], next:null, goals:0, behinds:0, lvl:1},
          {club:oppClub, drink:5, deck:shuffle(oppDeck), hand:[], next:null, goals:0, behinds:0, lvl:.85 + lg * .04, think:0}],
    sel:null, siren:false };
  for (const s of M.side) { s.hand = s.deck.slice(0, 4); s.next = s.deck[4]; s.queue = s.deck.slice(5); }
  ui.innerHTML = ""; drawBattleUI(); resize();
}
const rateNow = () => M.siren ? 3 : M.t >= MATCH - LAST_Q ? 2 : 1;
function cycle(s, id){ const i = s.hand.indexOf(id); s.hand[i] = s.next; s.queue.push(id); s.next = s.queue.shift(); }
function play(sideIx, id, x, y){
  const s = M.side[sideIx], c = R_BY_ID[id]; if (!c || s.drink < c.cost) return false;
  if (!c.spell && (sideIx === 0 ? y < RH / 2 + .5 : y > RH / 2 - .5)) return false; // players start on your half
  s.drink -= c.cost; cycle(s, id);
  if (c.spell === "bump") { M.fx.push({k:"boom", x, y, t:0});
    for (const u of M.units) if (u.side !== sideIx && Math.hypot(u.x - x, u.y - y) <= 1.8) u.hp -= 220 * s.lvl;
    for (const t of M.towers) if (t.side !== sideIx && t.hp > 0 && Math.hypot(t.x - x, t.y - y) <= 2.2) hurtTower(t, 70 * s.lvl); return true; }
  if (c.spell === "huddle") { M.fx.push({k:"heal", x, y, t:0}); for (const u of M.units) if (u.side === sideIx && Math.hypot(u.x - x, u.y - y) <= 2.2) u.hp = Math.min(u.max, u.hp + 220); return true; }
  const r = ROLES[c.pos], m = (.7 + .6 * (c.rating - 60) / 39) * s.lvl, n = c.pos === "mid" && c.cost <= 3 ? 2 : 1;
  for (let k = 0; k < n; k++) M.units.push({side:sideIx, card:c, role:r, x:x + (k ? .6 : 0), y, hp:r.hp * m, max:r.hp * m, dmg:r.dmg * m, cd:.6, lane:x < RW / 2 ? 0 : 1, face:1});
  return true;
}
function hurtTower(t, d){ if (t.hp <= 0) return; const before = t.hp; t.hp = Math.max(0, t.hp - d);
  const s = M.side[1 - t.side], q = t.max / 4; while (t.chunks < 3 && t.max - t.hp >= q * (t.chunks + 1)) { t.chunks++; s.behinds++; }
  if (before > 0 && t.hp <= 0) { s.goals++; M.fx.push({k:"goal", x:t.x, y:t.y, t:0}); if (t.kind === "main") return endMatch(1 - t.side); if (M.siren) endMatch(1 - t.side); } }
function nearestTower(u){
  const alive = M.towers.filter(t => t.side !== u.side && t.hp > 0), lane = alive.find(t => t.kind === "flank" && Math.abs(t.x - LANES[u.lane]) < 1);
  return lane || alive.find(t => t.kind === "main") || alive[0]; }
function step(dt){
  if (!M || M.over) return; M.t += dt;
  for (const s of M.side) s.drink = Math.min(10, s.drink + dt / 2.8 * rateNow());
  if (M.t >= MATCH && !M.siren) { const [a, b] = M.side; if (a.goals !== b.goals) return endMatch(a.goals > b.goals ? 0 : 1); M.siren = true; toast("📢 Siren time! Next goal wins"); }
  if (M.siren && M.t >= MATCH + SIREN) { const [a, b] = M.side; return endMatch(a.behinds === b.behinds ? -1 : a.behinds > b.behinds ? 0 : 1); }
  ai(dt);
  for (const u of M.units) { if (u.hp <= 0) continue; u.cd -= dt;
    let tgt = null, td = 1e9;
    if (!u.role.towersOnly) for (const o of M.units) { if (o.side === u.side || o.hp <= 0) continue; const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < td && d <= (u.role.hunter ? 6 : 4)) { td = d; tgt = o; } }
    if (!tgt) { tgt = nearestTower(u); td = tgt ? Math.hypot(tgt.x - u.x, tgt.y - u.y) - (tgt.kind === "main" ? 1.3 : .9) : 1e9; }
    if (!tgt) continue;
    if (td > u.role.range) { const dx = tgt.x - u.x, dy = tgt.y - u.y, d = Math.hypot(dx, dy) || 1; u.x += dx / d * u.role.spd * dt; u.y += dy / d * u.role.spd * dt; u.face = dx >= 0 ? 1 : -1; u.moving = true; }
    else { u.moving = false; u.atkT = Math.max(0, (u.atkT || 0) - dt); if (u.cd <= 0) { u.cd = u.role.rate; u.atkT = .5; const t = tgt;
      if (u.role.range > 2) M.fx.push({k:"kick", x:u.x, y:u.y, tx:t.x, ty:t.y, t:0});
      if (t.max && t.kind) hurtTower(t, u.dmg); else t.hp -= u.dmg; } } }
  // players spread out a little so they don't stack
  for (const a of M.units) for (const b of M.units) { if (a === b || a.hp <= 0 || b.hp <= 0) continue; const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy); if (d > 0 && d < .55) { a.x += dx / d * .02; a.y += dy / d * .02; } }
  for (const t of M.towers) { if (t.hp <= 0) continue; t.cd -= dt; if (t.cd > 0) continue;
    let tgt = null, td = t.range; for (const u of M.units) { if (u.side === t.side || u.hp <= 0) continue; const d = Math.hypot(u.x - t.x, u.y - t.y); if (d <= td) { td = d; tgt = u; } }
    if (tgt) { t.cd = .9; tgt.hp -= t.dmg; M.fx.push({k:"kick", x:t.x, y:t.y, tx:tgt.x, ty:tgt.y, t:0}); } }
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
    const id = affordable.find(i => !R_BY_ID[i].spell); if (id) return play(1, id, Math.max(1, Math.min(RW - 1, threat.x)), Math.max(2, threat.y - 2.5));
    return; }
  if (s.drink < 7 && Math.random() < .7) return; // save up for a push, like a real player
  const id = affordable.filter(i => !R_BY_ID[i].spell).sort((a, b) => R_BY_ID[b].cost - R_BY_ID[a].cost)[0]; if (!id) return;
  play(1, id, LANES[Math.random() < .5 ? 0 : 1] + (Math.random() - .5), 3.5 + Math.random() * 3);
}
function endMatch(win){
  if (M.over) return; M.over = true; RS.played++;
  const delta = win === 0 ? 30 : win === 1 ? -15 : 0; RS.trophies = Math.max(0, RS.trophies + delta); if (win === 0) RS.wins++; rsave();
  const [a, b] = M.side, A = clubOf(a.club), B = clubOf(b.club);
  setTimeout(() => { ui.innerHTML = `<div class="rpanel result"><h2>${win === 0 ? "You win! 🏆" : win === 1 ? "Siren. You lost" : "It's a draw"}</h2>
    <div class="score"><b>${A.short} ${a.goals}.${a.behinds} (${a.goals * 6 + a.behinds})</b><span>v</span><b>${B.short} ${b.goals}.${b.behinds} (${b.goals * 6 + b.behinds})</b></div>
    <p>${delta >= 0 ? "+" : ""}${delta} 🏆 · ${R_LEAGUES[leagueOf(RS.trophies)][0]} (${RS.trophies} 🏆)</p>
    <button class="rbtn gold big" id="rAgain">Play again</button><button class="rbtn" id="rHome">Home</button></div>`;
    $r("rAgain").onclick = startMatch; $r("rHome").onclick = home; }, 900);
}

// ----- drawing -----
let SC = 20, OX = 0, OY = 0;
function resize(){ const bar = M && !M.over ? 168 : 0, w = innerWidth, h = innerHeight - bar; SC = Math.min(w / RW, h / RH); OX = (w - RW * SC) / 2; OY = Math.max(0, (h - RH * SC) / 2);
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
  ctx.beginPath(); ctx.arc(X(RW / 2), Y(RH / 2), SC * 2.2, 0, 7); ctx.stroke();
  for (const y of [RH * .27, RH * .73]) { ctx.beginPath(); ctx.ellipse(X(RW / 2), Y(y > RH / 2 ? RH : 0), SC * 7, SC * 8, 0, 0, 7); ctx.stroke(); }
  for (const lx of LANES) { ctx.fillStyle = "#ffffff12"; ctx.fillRect(X(lx - 1.4), Y(4), SC * 2.8, SC * (RH - 8)); }
  ctx.restore();
  if (M && M.sel) { ctx.fillStyle = "#ff40401c"; ctx.fillRect(X(0), Y(0), RW * SC, RH / 2 * SC); }
}
function drawTower(t){
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
  ctx.globalAlpha = u.hp > 0 ? 1 : Math.max(0, 1 - u.dead / .4);
  const im = RART["unit-" + u.card.pos];
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
  if (M) { step(dt); drawField(); M.towers.forEach(drawTower); [...M.units].sort((a, b) => a.y - b.y).forEach(drawUnit); M.fx.forEach(drawFx); updateBar(); }
  else drawField();
  requestAnimationFrame(frame);
}

// ----- battle UI: scoreboard on top, card bar at the bottom -----
// Cards use Footy Fortress's card frames (rarity by rating) and the player's sprite as the picture
const tierOf = c => c.spell ? "star-wildcard" : c.rating >= 93 ? "legendary" : c.rating >= 85 ? "epic" : c.rating >= 75 ? "rare" : "common";
function cardTile(id, i){ const c = R_BY_ID[id]; if (!c) return ""; const cl = c.spell ? null : clubOf(c.club);
  const pic = c.spell ? `<span class="ricon">${c.icon}</span>` : `<span class="rpic" style="background-image:url(art/unit-${c.pos}.webp)"></span>`;
  return `<button class="rcard${(M && M.sel) === id ? " on" : ""}" data-rc="${id}" style="--a:${cl ? cl.a : "#5b2d8a"};--b:${cl ? cl.b : "#c9a0ff"};--frame:url(art/cards/frame-${tierOf(c)}.webp)"><i class="cost">${c.cost}</i>
    <span class="rinner">${pic}${c.spell ? "" : `<i class="rrate">${c.rating}</i>`}</span><b>${esc(c.spell ? c.name : c.name.split(" ").slice(-1)[0])}</b><small>${c.spell ? "Spell" : ROLES[c.pos].name}</small></button>`; }
function drawBattleUI(){
  ui.innerHTML = `<div class="rtop"><span id="rScore"></span><span id="rClock"></span></div>
    <div class="rbar"><div class="rnext"><small>Next</small><div id="rNext"></div></div><div class="rhand" id="rHand"></div>
    <div class="rdrink"><i id="rDrinkFill"></i><b id="rDrinkN"></b><span>💧</span></div></div>`;
  renderHand();
}
function renderHand(){ const s = M.side[0]; $r("rHand").innerHTML = s.hand.map(cardTile).join(""); $r("rNext").innerHTML = cardTile(s.next).replace("rcard", "rcard mini");
  ui.querySelectorAll("#rHand [data-rc]").forEach(b => b.onclick = () => { M.sel = M.sel === b.dataset.rc ? null : b.dataset.rc; renderHand(); }); }
let lastHand = "";
function updateBar(){ if (M.over || !$r("rHand")) return; const s = M.side[0], o = M.side[1], A = clubOf(s.club), B = clubOf(o.club);
  $r("rDrinkFill").style.width = s.drink * 10 + "%"; $r("rDrinkN").textContent = Math.floor(s.drink);
  const left = M.siren ? MATCH + SIREN - M.t : MATCH - M.t, mm = Math.max(0, Math.floor(left / 60)), ss = Math.max(0, Math.floor(left % 60));
  $r("rClock").textContent = `${M.siren ? "📢 Siren time " : rateNow() > 1 ? "Last quarter ×2 · " : ""}${mm}:${String(ss).padStart(2, "0")}`;
  $r("rScore").textContent = `${A.short} ${s.goals}.${s.behinds} (${s.goals * 6 + s.behinds}) v ${B.short} ${o.goals}.${o.behinds} (${o.goals * 6 + o.behinds})`;
  const key = s.hand.join() + s.next + Math.floor(s.drink); if (key !== lastHand) { lastHand = key; renderHand(); ui.querySelectorAll("#rHand .rcard").forEach(b => b.classList.toggle("poor", R_BY_ID[b.dataset.rc].cost > s.drink)); } }
cv.addEventListener("pointerdown", e => { if (!M || M.over || !M.sel) return; const x = (e.clientX - OX) / SC, y = (e.clientY - OY) / SC;
  if (x < 0 || x > RW || y < 0 || y > RH) return;
  if (!play(0, M.sel, x, y)) return toast(R_BY_ID[M.sel].cost > M.side[0].drink ? "Not enough 💧 yet" : "Players start on your half");
  M.sel = null; renderHand(); });

// ----- menus -----
function toast(t){ const el = document.createElement("div"); el.className = "rtoast"; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 1800); }
function home(){ M = null; resize(); const lg = leagueOf(RS.trophies), next = R_LEAGUES[lg + 1];
  ui.innerHTML = `<div class="rpanel home"><div class="rlogo">FF: <span>Royal</span><i class="beta">BETA</i></div>
    <div class="rleague"><b>${R_LEAGUES[lg][0]}</b><span>🏆 ${RS.trophies}${next ? ` · ${next[1] - RS.trophies} to ${next[0]}` : ""}</span></div>
    <button class="rbtn gold big" id="rPlay">⚔️ Battle</button><button class="rbtn blue" id="rDeck">🃏 My deck</button><button class="rbtn" id="rHow">❓ How to play</button>
    <button class="rbtn ghost" id="rClub">Club: ${clubOf(RS.club ?? 0).name}</button><p class="tiny">Wins ${RS.wins} / ${RS.played}</p></div>`;
  $r("rPlay").onclick = startMatch; $r("rDeck").onclick = deckScreen; $r("rHow").onclick = howTo;
  $r("rClub").onclick = () => { RS.club = ((RS.club ?? 0) + 1) % CLUBS.length; RS.deck = null; rsave(); home(); }; }
function deckScreen(){ M = null; let deck = myDeck(); const own = ownedCards().ids.map(id => R_BY_ID[id]).concat(R_SPELLS);
  const draw = () => { const shown = own.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    ui.innerHTML = `<div class="rpanel deck"><h2>My deck <small>${deck.length}/8</small></h2><div class="rgrid">${deck.map(id => cardTile(id)).join("")}</div>
      <h3>All players <small>2026 season</small></h3><div class="rgrid all">${shown.map(c => cardTile(c.id).replace("rcard", "rcard" + (deck.includes(c.id) ? " in" : ""))).join("")}</div>
      <button class="rbtn gold" id="rSave">Save deck</button></div>`;
    ui.querySelectorAll(".rgrid [data-rc]").forEach(b => b.onclick = () => { const id = b.dataset.rc; if (deck.includes(id)) deck = deck.filter(x => x !== id); else if (deck.length < 8) deck.push(id); else toast("A deck holds 8 cards"); draw(); });
    $r("rSave").onclick = () => { if (deck.length !== 8) return toast("Pick 8 cards"); RS.deck = deck; rsave(); home(); }; };
  M = {sel:null}; draw(); M = null; }
function howTo(){ ui.innerHTML = `<div class="rpanel"><h2>How to play</h2><ul class="rhow">
    <li>💧 Sports Drink refills over time (up to 10). Tap a card, then tap your half of the ground to send a player.</li>
    <li>Players run up the nearest flank and go for the other team's Goal Towers, then their Goalposts.</li>
    <li>🏃 Rovers come in pairs. 🎯 Forwards kick from range. 🗼 Rucks only go for towers. 🛡️ Defenders hunt down attackers.</li>
    <li>A tower down is a <b>goal</b>. Every quarter of a tower's health knocked off is a <b>behind</b>. Knock over the Goalposts to win straight away.</li>
    <li>The last minute is the last quarter: drink flows twice as fast. Level on goals after 3 minutes? <b>Siren time</b>: next goal wins.</li>
    <li>Build your deck of 8 from any 2026 player. Tap Club on the home screen to change your team.</li></ul><button class="rbtn gold" id="rBack">Got it</button></div>`;
  $r("rBack").onclick = home; }

requestAnimationFrame(frame); home();

// ---------- Footy Card Album: a collecting side game (no effect on match stats) ----------
// Every player who played in the 2026 AFL season has a base card (real 2026 + career stats from AFL Tables).
// Base cards come in Common, Silver, Gold and Pearl finishes. 3 duplicates of a finish make 1 of the next finish.
// Each pack has 6 base cards + 1 special. Specials and 24K Gold prize cards can't be upgraded.
// Packs cost Footy Tokens 🎟️, earned only by winning matches and from the daily bonus.

const TIERS = {
  c:{name:"Common", frame:["#e8e2d4","#b9b0a0"], next:"s"},
  s:{name:"Silver Foil", frame:["#ffffff","#a9b4bf","#e9eef3","#7e8a96"], next:"g"},
  g:{name:"Gold Foil", frame:["#fff4b8","#e8b021","#fff0a0","#a26d06"], next:"p"},
  p:{name:"Pearl", frame:["#fdf2ff","#c9e9ff","#ffe3f1","#d9fff1","#e8d9ff"], next:null},
};
const TIER_ORDER = ["c","s","g","p"];
const UPGRADE_COST = 3;                  // duplicates of one finish needed for the next finish
const TIER_ODDS = {p:1/360, g:1/90, s:1/24}; // per base card: about 1 Silver in 4 packs, 1 Gold in 15, 1 Pearl in 60
const PACK_COST = 3, WIN_TOKENS = 1, DAILY_TOKENS = 2;
const SPECIALS = {
  SW:{name:"Star Wildcard", col:["#ffd34d","#c1121f"], w:25},
  BF:{name:"Best & Fairest", col:["#1b1b1b","#ffd34d"], w:25},
  GK:{name:"Goal Kicker", col:["#c8102e","#ffffff"], w:30},
  FL:{name:"Future Legend", col:["#2a6fdb","#7be3ff"], w:20},
  PZ:{name:"24K Gold", col:["#fff3b0","#b8860b"], w:0}, // prize cards: only from Prize Packs
};
const POS_FULL = {mid:"Midfielder", fwd:"Forward", ruck:"Ruckman", def:"Defender"};

// ---------- build the card list from CARD_SET ----------
const ALL_CARDS = [], CARD_BY_ID = {};
(function buildCards(){
  let num = 0;
  const add = c => { ALL_CARDS.push(c); CARD_BY_ID[c.id] = c; };
  const findPlayer = name => { for (const [ci, list] of CARD_SET.entries()) { const i = list.findIndex(p => p[0] === name); if (i >= 0) return {ci, i, p:list[i]}; } return null; };
  CARD_SET.forEach((list, ci) => list.forEach((p, i) => add({id:`${ci}-${i}`, kind:"base", club:ci, num:++num, name:p[0], no:p[1], pos:p[2], s:p[3], cr:p[4], born:p[5], ht:p[6]})));
  CLUBS.forEach((club, ci) => {
    const list = CARD_SET[ci] || [];
    const best = key => list.reduce((b, p, i) => (p[3][key] > (b ? list[b.i][3][key] : -1) ? {i} : b), null);
    const hero = findPlayer(club.hero.name);
    const from = (f, kind, tag) => f && add({id:`${kind}-${ci}${tag||""}`, kind, club:ci, name:f.p ? f.p[0] : list[f.i][0], no:(f.p||list[f.i])[1], pos:(f.p||list[f.i])[2], s:(f.p||list[f.i])[3], cr:(f.p||list[f.i])[4], born:(f.p||list[f.i])[5], ht:(f.p||list[f.i])[6], special:true});
    from(hero || (list.length && {p:list[0]}), "SW");
    from(best(7), "BF");     // most 2026 Brownlow votes at the club
    from(best(2), "GK");     // leading 2026 goal kicker
    list.map((p, i) => ({i, yr:+String(p[5]).split("-").pop(), gm:p[3][0]})).filter(x => x.yr >= 2005).sort((a, b) => b.gm - a.gm).slice(0, 2)
      .forEach((x, k) => from({i:x.i}, "FL", "-" + k));
    from(hero || (list.length && {p:list[0]}), "PZ");
  });
})();
const BASE_CARDS = ALL_CARDS.filter(c => c.kind === "base");
const specialsOf = k => ALL_CARDS.filter(c => c.kind === k);

// ---------- collection state ----------
// S.album = { "<cardId>|<tier>": count }, specials use tier "x"
const akey = (id, t) => id + "|" + t;
const have = (id, t) => (S.album[akey(id, t)] || 0);
const ownedTiers = c => c.special ? (have(c.id, "x") ? ["x"] : []) : TIER_ORDER.filter(t => have(c.id, t));
const bestTier = c => c.special ? (have(c.id, "x") ? "x" : null) : [...TIER_ORDER].reverse().find(t => have(c.id, t)) || null;
const cardBonus = () => 0; // cards are a collecting game only: no effect on match stats

function addCard(id, t) { const k = akey(id, t); const isNew = !S.album[k] && !ownedTiers(CARD_BY_ID[id]).length; S.album[k] = (S.album[k] || 0) + 1; return isNew; }
function rollPack(prize) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const c = BASE_CARDS[Math.random() * BASE_CARDS.length | 0], r = Math.random();
    const t = r < TIER_ODDS.p ? "p" : r < TIER_ODDS.p + TIER_ODDS.g ? "g" : r < TIER_ODDS.p + TIER_ODDS.g + TIER_ODDS.s ? "s" : "c";
    out.push({c, t});
  }
  const kinds = Object.entries(SPECIALS).filter(([, v]) => v.w), tot = kinds.reduce((a, [, v]) => a + v.w, 0);
  let x = Math.random() * tot, kind = kinds[0][0];
  for (const [k, v] of kinds) { x -= v.w; if (x <= 0) { kind = k; break; } }
  const pool = specialsOf(kind); out.push({c:pool[Math.random() * pool.length | 0], t:"x", special:true});
  if (prize) { const pz = specialsOf("PZ"), missing = pz.filter(c => !have(c.id, "x")); const pool2 = missing.length ? missing : pz; out.push({c:pool2[Math.random() * pool2.length | 0], t:"x", special:true, prize:true}); }
  out.forEach(o => o.isNew = addCard(o.c.id, o.t));
  return out;
}
function canUpgrade(c, t) { return !c.special && TIERS[t] && TIERS[t].next && have(c.id, t) >= UPGRADE_COST + 1; }
function upgradeCard(c, t) {
  if (!canUpgrade(c, t)) return false;
  S.album[akey(c.id, t)] -= UPGRADE_COST; addCard(c.id, TIERS[t].next); save(); sfx("card"); return true;
}
function earnTokens(n) { S.tokens = (S.tokens || 0) + n; uiDirty = true; }
const dailyReady = () => S.dailyToken !== new Date().toDateString();
function claimDaily() { if (!dailyReady()) return; S.dailyToken = new Date().toDateString(); earnTokens(DAILY_TOKENS); save(); sfx("collect"); toast(`+${DAILY_TOKENS} 🎟️ Footy Tokens`); }
const albumCount = (filter = () => true) => { const cs = ALL_CARDS.filter(filter); return [cs.filter(c => bestTier(c)).length, cs.length]; };

// ---------- Experience Level (like Clash's XP level): every 5 levels gives a Prize Pack ----------
const xpNeed = lv => 30 + lv * 20;
function addXP(n) {
  if (!S || !(n > 0)) return;
  S.xp = (S.xp || 0) + Math.round(n); let up = 0;
  while (S.xp >= xpNeed(S.lvl)) { S.xp -= xpNeed(S.lvl); S.lvl++; up++; if (S.lvl % 5 === 0) { S.prizePacks = (S.prizePacks || 0) + 1; toast(`⭐ Level ${S.lvl}! Prize Pack unlocked 🏆`); } }
  if (up && S.lvl % 5) toast(`⭐ Level ${S.lvl}!`);
  uiDirty = true;
}
const xpForSeconds = s => Math.max(1, Math.floor(Math.sqrt(Math.max(1, s)))); // Clash: XP = square root of the build time

// ---------- card artwork ----------
const roleFor = pos => ({mid:"rover", fwd:"forward", ruck:"ruck", def:"shepherd"})[pos] || "rover";
function frameFill(g, cols, W, H) { const gr = g.createLinearGradient(0, 0, W, H); cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c)); return gr; }
function cardFace(c, t) {
  const key = "cf" + c.id + t; if (iconCache[key]) return iconCache[key];
  const W = 180, H = 252, club = CLUBS[c.club], sp = c.special ? SPECIALS[c.kind] : null;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  // outer frame: finish colour
  const frame = sp ? sp.col.concat(sp.col[0]) : TIERS[t].frame;
  g.fillStyle = frameFill(g, frame, W, H); g.beginPath(); g.roundRect(0, 0, W, H, 12); g.fill();
  // inner photo panel in club colours with a stripe
  const ix = 9, iy = 9, iw = W - 18, ih = H - 18;
  g.save(); g.beginPath(); g.roundRect(ix, iy, iw, ih, 8); g.clip();
  const bg = g.createLinearGradient(0, iy, 0, iy + ih); bg.addColorStop(0, shade(club.a, 1.4)); bg.addColorStop(1, shade(club.a, .65)); g.fillStyle = bg; g.fillRect(ix, iy, iw, ih);
  g.fillStyle = club.b; g.globalAlpha = .28; g.beginPath(); g.moveTo(ix + iw * .55, iy); g.lineTo(ix + iw * .85, iy); g.lineTo(ix + iw * .35, iy + ih); g.lineTo(ix + iw * .05, iy + ih); g.fill(); g.globalAlpha = 1;
  if (sp || t !== "c") { g.globalAlpha = sp ? .22 : .16; for (let i = 0; i < 14; i++) { g.fillStyle = "#fff"; g.beginPath(); g.moveTo(W / 2, 95); g.arc(W / 2, 95, 260, i * Math.PI / 7, i * Math.PI / 7 + .12); g.fill(); } g.globalAlpha = 1; }
  // portrait: the captain likeness where we have one, otherwise role art in the club's guernsey
  const isHero = club.hero.name === c.name, likeness = isHero && namedHeroArt[club.abbr];
  if (!(likeness && drawArtIcon(likeness, g, W / 2, 200, 168, 178)) && !drawArtIcon("portrait-" + roleFor(c.pos), g, W / 2, 200, 168, 178, club)) {
    const sv = {ctx, TW, TH}; ctx = g; TW = 70; TH = 35; drawPlayer(W / 2, 196, 44, club, {kind:c.pos === "ruck" ? "ruck" : null, ranged:c.pos === "fwd", id:c.no}); ctx = sv.ctx; TW = sv.TW; TH = sv.TH;
  }
  // foil sheen
  if (!sp && t !== "c") { const sh = g.createLinearGradient(0, 0, W, H); sh.addColorStop(.25, "#ffffff00"); sh.addColorStop(.45, t === "p" ? "#ffe6ff66" : "#ffffff55"); sh.addColorStop(.55, "#ffffff00"); g.fillStyle = sh; g.fillRect(ix, iy, iw, ih); }
  // name plate
  g.fillStyle = "#000000b8"; g.fillRect(ix, 196, iw, ih - 187);
  g.restore();
  drawBadge(g, 30, 33, 17, club);
  // jumper number
  g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = 3; g.beginPath(); g.arc(W - 30, 33, 17, 0, 7); g.fill(); g.stroke();
  g.font = '18px "Lilita One",sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#111"; g.fillText(c.no || "–", W - 30, 34);
  const parts = c.name.split(" "), last = parts.slice(1).join(" ") || parts[0], first = parts.length > 1 ? parts[0] : "";
  g.fillStyle = "#fff"; g.font = '12px "Lilita One",sans-serif'; g.fillText(first.toUpperCase(), W / 2, 208);
  let fs = 20; g.font = `${fs}px "Lilita One",sans-serif`; while (g.measureText(last.toUpperCase()).width > iw - 10 && fs > 11) { fs--; g.font = `${fs}px "Lilita One",sans-serif`; }
  g.fillText(last.toUpperCase(), W / 2, 225);
  g.font = '10px "Lilita One",sans-serif'; g.fillStyle = sp ? sp.col[0] : t === "c" ? "#ffd34d" : frame[1];
  g.fillText(`${(POS_FULL[c.pos] || "").toUpperCase()} · ${club.short}${c.num ? " · #" + c.num : ""}`, W / 2, 240);
  // special banner
  if (sp) { g.fillStyle = sp.col[1]; g.strokeStyle = "#000"; g.lineWidth = 2; g.beginPath(); g.roundRect(40, 55, W - 80, 20, 6); g.fill(); g.stroke();
    g.font = '12px "Lilita One",sans-serif'; g.fillStyle = sp.col[0] === "#1b1b1b" ? "#ffd34d" : "#fff"; g.fillText(sp.name.toUpperCase(), W / 2, 66); }
  else if (t !== "c") { g.font = '10px "Lilita One",sans-serif'; g.fillStyle = "#000"; g.fillText(TIERS[t].name.toUpperCase(), W / 2, 249); }
  return iconCache[key] = cv.toDataURL("image/webp", .85);
}
function cardBack(c) {
  const [GM, DI, GL, MK, TK, HO, CL, BR] = c.s || [], cr = c.cr || [];
  const row = (l, a, b) => `<tr><td>${l}</td><td>${a ?? "–"}</td><td>${b ?? "–"}</td></tr>`;
  return `<div class="cardback" style="--ca:${CLUBS[c.club].a};--cb:${CLUBS[c.club].b}">
    <div class="cbh">${badgeImg(CLUBS[c.club], "xs")} <b>${c.name}</b> <span>#${c.no || "–"}</span></div>
    <div class="cbm">${POS_FULL[c.pos] || ""} · ${CLUBS[c.club].name}${c.born ? ` · born ${c.born}` : ""}${c.ht ? ` · ${c.ht} cm` : ""}</div>
    <table><tr><th></th><th>2026</th><th>Career</th></tr>
    ${row("Games", GM, cr[0])}${row("Goals", GL, cr[1])}${row("Disposals", DI, cr[2])}${row("Marks", MK, cr[3])}${row("Tackles", TK, cr[4])}${row("Hit-outs", HO, null)}${row("Clearances", CL, null)}${row("Brownlow votes", BR, cr[5])}</table>
    <div class="tiny">Stats: AFL Tables, 2026 season</div></div>`;
}

// ---------- UI ----------
let albumClub = null;
function openAlbum(club) {
  albumClub = club ?? albumClub ?? S.club;
  const [own, tot] = albumCount(), tokens = S.tokens || 0;
  let h = `<h2>Footy Card Album</h2>
    <div class="albumbar"><span>📒 ${own} / ${tot} cards</span><span>🎟️ <b>${tokens}</b> tokens</span><span>⭐ Level ${S.lvl}</span></div>
    <div class="packrow">
      <button class="btn gold" id="openPackBtn" ${tokens >= PACK_COST ? "" : "disabled"}><img class="packmini" src="${packArt("footy")}" alt=""> Open Footy Pack<small>${PACK_COST} 🎟️ · 6 cards + 1 special</small></button>
      ${S.prizePacks ? `<button class="btn red" id="openPrize"><img class="packmini" src="${packArt("prize")}" alt=""> Open Prize Pack ×${S.prizePacks}<small>includes a 24K Gold card</small></button>` : ""}
      <button class="btn ${dailyReady() ? "green" : ""}" id="dailyTok" ${dailyReady() ? "" : "disabled"}>${dailyReady() ? `Daily bonus<small>+${DAILY_TOKENS} 🎟️</small>` : `Daily bonus<small>back tomorrow</small>`}</button>
    </div>
    <p class="tiny center">Win any match for +${WIN_TOKENS} 🎟️. Every 5 levels unlocks a Prize Pack. 3 matching duplicates upgrade a card: Common → Silver → Gold → Pearl.</p>
    <div class="clubtabs">${CLUBS.map((c, i) => { const [o, t] = albumCount(x => x.club === i && !x.special); return `<button class="${i === albumClub ? "on" : ""}" data-club="${i}">${badgeImg(c, "xs")}<small>${o}/${t}</small></button>`; }).join("")}
      <button class="${albumClub === "sp" ? "on" : ""}" data-club="sp">⭐<small>${albumCount(x => x.special)[0]}/${albumCount(x => x.special)[1]}</small></button></div>`;
  const list = albumClub === "sp" ? ALL_CARDS.filter(c => c.special) : ALL_CARDS.filter(c => c.club === albumClub && !c.special);
  if (albumClub === "sp") h += `<h3>Specials</h3>`;
  else { const c = CLUBS[albumClub]; h += `<h3 class="clubh">${badgeImg(c, "sm")} ${c.name} <small>2026 season</small></h3>`; }
  h += `<div class="agrid">${list.map(c => { const t = bestTier(c);
    return t ? `<div class="acard t-${t}" data-ac="${c.id}"><img src="${cardFace(c, t)}" loading="lazy" alt="${c.name}">${dupInfo(c)}</div>`
      : `<div class="acard empty" data-ac="${c.id}"><span>${c.special ? SPECIALS[c.kind].name : "#" + c.num}</span><small>${c.name}</small></div>`; }).join("")}</div>`;
  modal(h); tut("cards");
  document.querySelectorAll("[data-club]").forEach(b => b.onclick = () => { const v = b.dataset.club; openAlbum(v === "sp" ? "sp" : +v); });
  document.querySelectorAll("[data-ac]").forEach(el => el.onclick = () => showAlbumCard(CARD_BY_ID[el.dataset.ac]));
  $("openPackBtn").onclick = () => { if ((S.tokens || 0) < PACK_COST) return toast("Win matches to earn Footy Tokens 🎟️"); S.tokens -= PACK_COST; packReveal(rollPack(false), "Footy Pack"); };
  const pz = $("openPrize"); if (pz) pz.onclick = () => { S.prizePacks--; packReveal(rollPack(true), "Prize Pack"); };
  $("dailyTok").onclick = () => { claimDaily(); openAlbum(); };
}
function dupInfo(c) { if (c.special) return ""; const n = TIER_ORDER.reduce((a, t) => a + Math.max(0, have(c.id, t) - (t === bestTier(c) ? 1 : 0)), 0); return n ? `<span class="dup">+${n}</span>` : ""; }
function showAlbumCard(c) {
  const t = bestTier(c);
  if (!t) return toast(c.special ? `${SPECIALS[c.kind].name}: comes from the special slot in packs` : `Not collected yet. Keep opening packs!`);
  const ups = TIER_ORDER.filter(x => have(c.id, x)).map(x => `<div class="stat"><span>${TIERS[x].name}</span><b>×${have(c.id, x)} ${canUpgrade(c, x) ? `<button class="btn gold" data-up="${x}">Upgrade to ${TIERS[TIERS[x].next].name}</button>` : TIERS[x].next ? `<small>${Math.max(0, UPGRADE_COST + 1 - have(c.id, x))} more to upgrade</small>` : ""}</b></div>`).join("");
  modal(`<div class="cardview"><div class="flipcard" id="flipc"><div class="ff"><img src="${cardFace(c, t)}" alt=""></div><div class="fb">${cardBack(c)}</div></div>
    <p class="tiny center">Tap the card to flip it</p>${c.special ? `<p class="center">${SPECIALS[c.kind].name} cards can't be upgraded.</p>` : ups}
    <div class="center"><button class="btn" id="backAlb">Back to album</button></div></div>`);
  $("flipc").onclick = () => $("flipc").classList.toggle("flipped");
  $("backAlb").onclick = () => openAlbum(c.special ? "sp" : c.club);
  document.querySelectorAll("[data-up]").forEach(b => b.onclick = () => { if (upgradeCard(c, b.dataset.up)) { toast(`Upgraded to ${TIERS[TIERS[b.dataset.up].next].name}!`); showAlbumCard(c); } });
}
function packReveal(got, name) {
  save(); track("pack", 1); uiDirty = true;
  modal(`<h2>${name}</h2><div class="reveal">${got.map((o, i) => `<div class="flip ${o.special ? "spec" : ""}" style="animation-delay:${i * .3}s"><img src="${cardFace(o.c, o.t)}" alt=""><div class="newtag ${o.isNew ? "" : "dupe"}">${o.isNew ? "NEW!" : "Dupe"}</div></div>`).join("")}</div>
    <div class="center"><button class="btn green" id="pk">Done</button></div>`);
  got.forEach((o, i) => setTimeout(() => sfx(o.special || o.t !== "c" ? "cheer" : "card", .6), i * 300));
  tut("pack");
  $("pk").onclick = () => { openAlbum(got[0].c.club); tut("album"); };
}

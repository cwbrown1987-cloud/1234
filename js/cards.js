// ---------- Footy Card Album: a collecting side game (no effect on match stats) ----------
// 198 base cards, 11 per club (the captain + the 10 most-used 2026 players), numbered 001–198 like a real Teamcoach set.
// Each base card comes in Common, Rare, Epic and Legendary. 3 duplicates of a rarity make 1 of the next.
// Each pack has 6 base cards + 1 special. Specials and 24K Gold prize cards can't be upgraded.
// Packs cost Footy Tokens 🎟️, earned only by winning matches and from the daily bonus.
// Ratings and stat bars come from real 2026 stats (AFL Tables). The look follows docs/card-style-reference.png. Art specs: CODEX_HANDOFF.md.

// Save keys stay c/s/g/p so old albums keep working.
const TIERS = {
  c:{name:"Common",    frame:["#f4f6f8","#9aa5b1","#e1e6eb","#5f6a76"], glow:"#d7dde4", tag:"#5f6a76", next:"s"},
  s:{name:"Rare",      frame:["#cfeaff","#2f7fe0","#9fd0ff","#16478e"], glow:"#5fb2ff", tag:"#2468c4", next:"g"},
  g:{name:"Epic",      frame:["#ffc2c2","#e0262f","#ff8a8a","#86101a"], glow:"#ff5a5a", tag:"#c81e28", next:"p"},
  p:{name:"Legendary", frame:["#fff6c2","#f2b51c","#ffe680","#9c6a08"], glow:"#ffd34d", tag:"#d39608", next:null},
};
const TIER_ORDER = ["c","s","g","p"];
const UPGRADE_COST = 3;                  // duplicates of one rarity needed for the next
const TIER_ODDS = {p:1/360, g:1/90, s:1/24}; // per base card: about 1 Rare in 4 packs, 1 Epic in 15, 1 Legendary in 60
const PACK_COST = 3, WIN_TOKENS = 1, DAILY_TOKENS = 2;
const SPECIALS = {
  SW:{name:"Star Wildcard", col:["#ffd34d","#c1121f"], w:25},
  BF:{name:"Best & Fairest", col:["#1b1b1b","#ffd34d"], w:25},
  GK:{name:"Goal Kicker", col:["#c8102e","#ffffff"], w:30},
  FL:{name:"Future Legend", col:["#2a6fdb","#7be3ff"], w:20},
  PZ:{name:"24K Gold", col:["#fff3b0","#b8860b"], w:0}, // prize cards: only from Prize Packs
};
const POS_FULL = {mid:"Midfielder", fwd:"Forward", ruck:"Ruckman", def:"Defender"};
const POS_SHORT = {mid:"MID", fwd:"FWD", ruck:"RUCK", def:"DEF"};
// The 198-card checklist (same order and numbers as CARD_ART_BRIEF.md), by club.
const BASE_SET = [["Ben Keays", "Sam Berry", "Josh Rachele", "Jordan Dawson", "Jake Soligo", "Brayden Cook", "Max Michalanney", "Izak Rankine", "Josh Worrell", "Alex Neal-Bullen", "Lachlan McAndrew"], ["Kai Lohmann", "Jaspa Fletcher", "Josh Dunkley", "Will Ashcroft", "Lachie Neale", "Levi Ashcroft", "Logan Morris", "Cam Rayner", "Charlie Cameron", "Zac Bailey", "Darcy Wilmot"], ["Lachlan Cowan", "Adam Cerra", "Jagga Smith", "Patrick Cripps", "Harry McKay", "Mitch McGovern", "Ben Ainsworth", "Oliver Florent", "Brodie Kemp", "Sam Walsh", "Francis Evans"], ["Jordan de Goey", "Josh Daicos", "Lachie Schultz", "Dan Houston", "Daniel McStay", "Darcy Cameron", "Billy Frampton", "Jack Crisp", "Beau McCreery", "Nick Daicos", "Ned Long"], ["Andrew McGrath", "Jacob Farrow", "Kyle Langford", "Zach Merrett", "Archie Roberts", "Sam Durham", "Jaxon Prior", "Xavier Duursma", "Nate Caddy", "Zach Reid", "Archer Day-Wicks"], ["Caleb Serong", "Jordan Clark", "Andrew Brayshaw", "Luke Jackson", "Shai Bolton", "Luke Ryan", "Karl Worner", "Neil Erasmus", "Josh Treacy", "Isaiah Dudley", "Matthew Johnson"], ["Bailey Smith", "Jeremy Cameron", "Shaun Mannagh", "Connor OSullivan", "Lawson Humphries", "Oliver Dempsey", "Tom Atkins", "Shannon Neale", "Oisin Mullin", "Oliver Henry", "Zach Guthrie"], ["Mac Andrew", "John Noble", "Bodhi Uwland", "Leo Lombard", "Touk Miller", "Noah Anderson", "Joel Jeffrey", "Matt Rowell", "Ben Long", "Sam Collins", "Ben King"], ["Harvey Thomas", "Stephen Coniglio", "Toby Greene", "Lachie Whitfield", "Lachie Ash", "Ryan Angwin", "Clayton Oliver", "Jake Stringer", "Harry Himmelberg", "Joe Fonti", "Connor Idun"], ["Mitch Lewis", "Jai Newcombe", "Jarman Impey", "James Sicily", "Dylan Moore", "Connor Macdonald", "Blake Hardwick", "Massimo DAmbrosio", "Lloyd Meek", "Josh Ward", "Jack Ginnivan"], ["Harvey Langford", "Jake Lever", "Jack Steele", "Max Gawn", "Koltyn Tholstrup", "Ed Langdon", "Harry Sharp", "Bayley Fritsch", "Tom Sparrow", "Kysaiah Pickett", "Kade Chandler"], ["Harry Sheezel", "Caleb Daniel", "Luke Davies-Uniacke", "Colby McKercher", "Jy Simpkin", "Dylan Stephens", "Nick Larkey", "Luke Parker", "Charlie Comben", "Cameron Zurhaar", "Cooper Trembath"], ["Connor Rozee", "Joe Berry", "Jase Burgoyne", "Jack Whitlock", "Jason Horne-Francis", "Mitch Georgiades", "Aliir Aliir", "Jordon Sweet", "Willem Drew", "Darcy Byrne-Jones", "Corey Durdin"], ["Nick Vlastuin", "Jack Ross", "Ben Miller", "Tim Taranto", "Jayden Short", "Sam Grlj", "Patrick Retschko", "Nathan Broad", "Mykelti Lefau", "Seth Campbell", "Steely Green"], ["Marcus Windhager", "Jack Silvagni", "Nasiah Wanganeen-Milera", "Bradley Hill", "Rowan Marshall", "Darcy Wilson", "Mattaes Phillipou", "Hugo Garcia", "Max Hall", "Cooper Sharman", "Callum Wilkie"], ["Chad Warner", "Brodie Grundy", "Isaac Heeney", "Logan McDonald", "James Rowbottom", "Jai Serong", "Callum Mills", "Nick Blakey", "Tom McCartin", "Charlie Curnow", "Jake Lloyd"], ["Willem Duursma", "Jake Waterman", "Elliot Yeo", "Harley Reid", "Tim Kelly", "Liam Duggan", "Tom McCarthy", "Brady Hough", "Tylar Young", "Jobe Shanahan", "Hamish Davis"], ["Marcus Bontempelli", "Cooper Hynes", "Matthew Kennedy", "Ryley Sanders", "Rhylee West", "Ed Richards", "Buku Khamis", "Joel Freijah", "Lachlan Bramble", "Aaron Naughton", "Michael Sellwood"]];

// ---------- build the card list from CARD_SET ----------
const ALL_CARDS = [], CARD_BY_ID = {};
(function buildCards(){
  let num = 0;
  const add = c => { ALL_CARDS.push(c); CARD_BY_ID[c.id] = c; };
  const findPlayer = name => { for (const [ci, list] of CARD_SET.entries()) { const i = list.findIndex(p => p[0] === name); if (i >= 0) return {ci, i, p:list[i]}; } return null; };
  CLUBS.forEach((club, ci) => {
    const list = CARD_SET[ci] || [];
    for (const name of BASE_SET[ci] || []) { const i = list.findIndex(p => p[0] === name); num++; if (i < 0) continue; const p = list[i];
      add({id:`${ci}-${i}`, kind:"base", club:ci, num, name:p[0], no:p[1], pos:p[2], s:p[3], cr:p[4], born:p[5], ht:p[6]}); }
  });
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

// ---------- ratings from real 2026 stats ----------
// Each bar is the player's per-game number ranked against every 2026 player (5+ games), shown as 35–99.
const CARD_STATS = [["Disposals",1,"#f5c242","🏉"],["Marking",3,"#3d8bff","🙌"],["Tackling",4,"#46c9b4","💪"],["Goals",2,"#5fd16b","🥅"],["Clearances",6,"#ff9a3c","⚡"],["Hit-outs",5,"#b06cff","✊"]];
const POS_WEIGHT = {mid:{1:.35,6:.3,4:.2,3:.1,2:.05}, fwd:{2:.45,3:.3,1:.15,4:.1}, ruck:{5:.5,6:.2,3:.15,1:.15}, def:{3:.4,1:.4,4:.2}};
const cardStatPool = (() => { const out = {}; const all = CARD_SET.flat().filter(p => p[3][0] >= 5);
  for (const k of [1,2,3,4,5,6,7]) out[k] = all.map(p => p[3][k] / p[3][0]).sort((a, b) => a - b); return out; })();
const statPct = (k, v) => { const a = cardStatPool[k]; let lo = 0, hi = a.length; while (lo < hi) { const m = lo + hi >> 1; if (a[m] < v) lo = m + 1; else hi = m; } return a.length ? lo / a.length : 0; };
function cardRatings(c) {
  if (c._r) return c._r;
  const gm = Math.max(1, (c.s || [])[0] || 0), pg = k => ((c.s || [])[k] || 0) / gm;
  const bars = CARD_STATS.map(([label, k, col, icon]) => ({label, col, icon, v:Math.round(35 + 64 * statPct(k, pg(k)))}));
  const w = POS_WEIGHT[c.pos] || POS_WEIGHT.mid; let sum = 0; for (const [k, f] of Object.entries(w)) sum += f * statPct(+k, pg(+k));
  const games = Math.min(1, ((c.s || [])[0] || 0) / 20);
  const ovr = Math.min(99, Math.round(58 + 30 * sum + 6 * statPct(7, pg(7)) + 5 * games));
  return c._r = {ovr, bars};
}

// ---------- collection state ----------
// S.album = { "<cardId>|<tier>": count }, specials use tier "x"
const akey = (id, t) => id + "|" + t;
const have = (id, t) => (S.album[akey(id, t)] || 0);
const ownedTiers = c => c.special ? (have(c.id, "x") ? ["x"] : []) : TIER_ORDER.filter(t => have(c.id, t));
const bestTier = c => c.special ? (have(c.id, "x") ? "x" : null) : [...TIER_ORDER].reverse().find(t => have(c.id, t)) || null;
const cardBonus = () => 0; // cards are a collecting game only: no effect on match stats

function addCard(id, t) { const k = akey(id, t); const isNew = !S.album[k] && !ownedTiers(CARD_BY_ID[id]).length; S.album[k] = (S.album[k] || 0) + 1;
  if (!S.album[k] || S.album[k] === 1) { S.albumNew = S.albumNew || {}; S.albumNew[id] = 1; } return isNew; }
const isNewCard = c => !!(S.albumNew && S.albumNew[c.id]);
const clubHasNew = test => !!S.albumNew && Object.keys(S.albumNew).some(id => CARD_BY_ID[id] && test(CARD_BY_ID[id]));
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

// ---------- art from GPT (optional): portraits, frames and packs listed in art/manifest.json ----------
// Until those files exist, cards use the current painted portraits and a drawn frame.
const cardArt = {files:new Set(), imgs:{}, ready:false};
(function loadCardManifest(){
  artManifest.then(m => {
    if (!Array.isArray(m?.files)) return;
    for (const path of m.files) if (typeof path==="string") cardArt.files.add(path);
    cardArt.ready = true;
    ["art/cards/back.webp", "art/packs/footy.webp", "art/packs/prize.webp"].forEach(cardImg);
    for (const k of Object.keys(iconCache)) if (k.startsWith("cf")) delete iconCache[k];
    refreshVisibleCardFaces();
  });
})();
// Returns a loaded image for a file in the manifest, or null (and starts loading it).
function cardImg(path) {
  if (!cardArt.files.has(path)) return null;
  const e = cardArt.imgs[path]; if (e) return e.ok ? e.img : null;
  const img = new Image(), rec = cardArt.imgs[path] = {img, ok:false};
  img.onload = () => {
    rec.ok = true;
    for (const k of Object.keys(iconCache)) if (k.startsWith("cf")) delete iconCache[k];
    if (path.startsWith("art/players/")) refreshVisibleCardFaces(path);
    uiDirty = true;
  };
  img.src = path; return null;
}
const pad3 = n => String(n).padStart(3, "0");
function cardPortraitPath(c) {
  const num = c.num || BASE_CARDS.find(b => b.club === c.club && b.name === c.name)?.num;
  return num ? `art/players/${pad3(num)}.webp` : "";
}
function refreshVisibleCardFaces(path) {
  for (const img of document.querySelectorAll("img[data-card-id]")) {
    const c = CARD_BY_ID[img.dataset.cardId];
    if (c && (!path || cardPortraitPath(c) === path)) img.src = cardFace(c, img.dataset.cardTier);
  }
}
const CARD_TRIBUTES = {
  melb: {name:"Bayley Fritsch", number:31, medallion:"#101b3b", rim:"#ffd978", text:"#fff1b9"},
  coll: {name:"Nick Daicos", number:35, medallion:"#14171b", rim:"#dce7f2", text:"#f6fbff"}
};
function cardTribute(c) {
  const club = CLUBS[c.club].abbr;
  const tribute = CARD_TRIBUTES[club];
  return tribute?.name === c.name ? tribute : null;
}
function cardFaceImage(c, t, className = "") {
  const tribute = cardTribute(c);
  const finish = tribute ? "foil tribute-" + CLUBS[c.club].abbr : c.special || t !== "c" ? "foil" : "";
  return `<span class="card-print ${className}"><img data-card-id="${c.id}" data-card-tier="${t}" src="${cardFace(c, t)}" alt="${c.name}"><span class="card-finish ${finish}" aria-hidden="true"></span></span>`;
}

// ---------- card artwork (layout from docs/card-style-reference.png) ----------
const roleFor = pos => ({mid:"rover", fwd:"forward", ruck:"ruck", def:"shepherd"})[pos] || "rover";
const isLight = hex => { const n = parseInt(hex.slice(1, 7), 16); return ((n >> 16) * .3 + (n >> 8 & 255) * .59 + (n & 255) * .11) > 170; };
function fitText(g, text, maxW, size, min = 9) { let fs = size; g.font = `${fs}px "Lilita One",sans-serif`; while (g.measureText(text).width > maxW && fs > min) { fs--; g.font = `${fs}px "Lilita One",sans-serif`; } }
function drawCollectorBorder(g, club, finish) {
  const metal = {
    c:["#e8e4d7","#a6abb0","#f9f5e9"], s:["#eafaff","#6c90a9","#c1f3ff"],
    g:["#ffdbb1","#9c4d5e","#ffc388"], p:["#fff1b4","#976617","#ffda6d"],
    SW:["#ffe79f","#a83b34","#ff9e65"], BF:["#f9faff","#686e8d","#d5d9ff"],
    GK:["#fff3d8","#a73854","#ff9795"], FL:["#bafcf5","#5164b0","#cbadff"],
    PZ:["#fff8ca","#a36b11","#ffeb9b"]
  }[finish];
  const foil=g.createLinearGradient(0,0,240,336);
  [metal[0],metal[1],metal[2],metal[1],metal[0]].forEach((color,i)=>foil.addColorStop(i/4,color));
  g.save();
  g.lineWidth=10;
  g.strokeStyle=foil;
  g.beginPath(); g.roundRect(9,9,222,318,11); g.stroke();
  g.lineWidth=1.5;
  g.strokeStyle="#101724";
  g.beginPath(); g.roundRect(15,15,210,306,7); g.stroke();
  g.beginPath(); g.roundRect(3,3,234,330,15); g.stroke();
  g.fillStyle=club.b;
  for(const [x,y,dx,dy] of [[9,9,1,1],[231,327,-1,-1]]){
    g.beginPath(); g.moveTo(x+8*dx,y); g.lineTo(x+46*dx,y);
    g.lineTo(x+34*dx,y+5*dy); g.lineTo(x+8*dx,y+5*dy); g.fill();
  }
  g.restore();
}
function cardFace(c, t) {
  const key = "cf" + c.id + t; if (iconCache[key]) return iconCache[key];
  const W = 240, H = 336, club = CLUBS[c.club], sp = c.special ? SPECIALS[c.kind] : null, R = TIERS[t] || TIERS.c;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  const accent = sp ? (c.kind === "PZ" ? "#e0a91a" : sp.col[0] === "#1b1b1b" ? "#ffd34d" : sp.col[0]) : R.frame[1];
  g.fillStyle = "#101724";
  g.beginPath(); g.roundRect(3, 3, W - 6, H - 6, 15); g.fill();
  // 2. window: club colours with a burst of rays
  const ix = 17, iy = 17, iw = W - 34, ih = H - 34;
  g.save(); g.beginPath(); g.roundRect(ix, iy, iw, ih, 12); g.clip();
  const bg = g.createRadialGradient(W / 2, 120, 10, W / 2, 140, 230); bg.addColorStop(0, shade(club.a, 1.45)); bg.addColorStop(.55, shade(club.a, .8)); bg.addColorStop(1, shade(club.a, .35));
  g.fillStyle = bg; g.fillRect(ix, iy, iw, ih);
  g.globalAlpha = .14; g.fillStyle = club.b;
  for (let k = 0; k < 18; k++) { const a = k * Math.PI / 9; g.beginPath(); g.moveTo(W / 2, 130); g.arc(W / 2, 130, 320, a, a + .1); g.fill(); }
  g.globalAlpha = 1;
  // 3. player portrait: GPT's card portrait when it arrives, else the captain likeness or role art in the club guernsey
  const photo = cardImg(cardPortraitPath(c));
  const isHero = club.hero.name === c.name, likeness = isHero && namedHeroArt[club.abbr];
  if (photo) { const s = Math.min(iw / photo.width, 250 / photo.height); g.drawImage(photo, W / 2 - photo.width * s / 2, H - 78 - photo.height * s, photo.width * s, photo.height * s); }
  else if (!(likeness && drawArtIcon(likeness, g, W / 2, H - 70, 220, 236)) && !drawArtIcon("portrait-" + roleFor(c.pos), g, W / 2, H - 70, 220, 236, club)) {
    const sv = {ctx, TW, TH}; ctx = g; TW = 90; TH = 45; drawPlayer(W / 2, H - 80, 58, club, {kind:c.pos === "ruck" ? "ruck" : null, ranged:c.pos === "fwd", id:c.no}); ctx = sv.ctx; TW = sv.TW; TH = sv.TH;
  }
  g.restore();
  drawCollectorBorder(g,club,sp?c.kind:TIERS[t]?t:"c");
  if (!photo) {
    g.save();
    g.translate(W / 2, 148);
    g.rotate(-.19);
    g.fillStyle = "#471f19e8";
    g.strokeStyle = "#ffdb9c";
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(-91, -17, 182, 34, 4);
    g.fill();
    g.stroke();
    g.font = '22px "Lilita One",sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#fff0cb";
    g.fillText("PLACEHOLDER", 0, 1, 166);
    g.restore();
  }
  // 4. small club sticker top-left
  g.save(); g.fillStyle = "#0b0d12"; g.strokeStyle = accent; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 16); g.lineTo(66, 16); g.lineTo(66, 52); g.quadraticCurveTo(41, 72, 16, 52); g.closePath(); g.fill(); g.stroke(); g.restore();
  drawBadge(g, 41, 40, 15, club);
  // 5. rating + rarity tag top-right
  const ovr = cardRatings(c).ovr;
  g.fillStyle = "#16181f"; g.strokeStyle = accent; g.lineWidth = 3; g.beginPath(); g.roundRect(W - 78, 22, 56, 44, 9); g.fill(); g.stroke();
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.font = '32px "Lilita One",sans-serif'; g.fillText(ovr, W - 50, 46);
  const tag = sp ? (c.kind === "PZ" ? "24K GOLD" : "SPECIAL") : R.name.toUpperCase();
  g.fillStyle = sp ? (c.kind === "PZ" ? "#9c6a08" : sp.col[1]) : R.tag; g.strokeStyle = "#000"; g.lineWidth = 2;
  g.beginPath(); g.roundRect(W - 86, 66, 72, 17, 5); g.fill(); g.stroke();
  g.fillStyle = isLight(g.fillStyle) ? "#111" : "#fff"; fitText(g, tag, 66, 11, 7); g.fillText(tag, W - 50, 75);
  // 6. special banner: a ribbon just above the name plate, clear of the player's face
  if (sp) { const by = H - 112, bx = 92, bw = W - 114; g.fillStyle = sp.col[1]; g.strokeStyle = "#000"; g.lineWidth = 2; g.beginPath(); g.roundRect(bx, by, bw, 20, 6); g.fill(); g.stroke();
    g.fillStyle = isLight(sp.col[1]) ? (isLight(sp.col[0]) ? "#111" : sp.col[0]) : "#fff"; fitText(g, sp.name.toUpperCase(), bw - 10, 12); g.fillText(sp.name.toUpperCase(), bx + bw / 2, by + 11); }
  // 7. big club badge, bottom-left over the portrait
  g.save(); g.fillStyle = "#0b0d12cc"; g.strokeStyle = "#ffffffcc"; g.lineWidth = 2.5; g.beginPath(); g.roundRect(22, H - 150, 64, 64, 12); g.fill(); g.stroke(); g.restore();
  drawBadge(g, 54, H - 118, 27, club);
  const tribute = cardTribute(c);
  if (tribute) {
    g.save();
    g.beginPath();
    g.arc(W - 51, H - 124, 20, 0, Math.PI * 2);
    g.fillStyle = tribute.medallion;
    g.fill();
    g.strokeStyle = tribute.rim;
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = tribute.text;
    g.font = '22px "Lilita One",sans-serif';
    g.fillText(String(tribute.number), W - 51, H - 123);
    g.restore();
  }
  // 8. name plate + position strip
  const pl = g.createLinearGradient(0, H - 88, 0, H - 44); pl.addColorStop(0, "#343843"); pl.addColorStop(1, "#14161c");
  g.fillStyle = pl; g.strokeStyle = accent; g.lineWidth = 2.5; g.beginPath(); g.roundRect(22, H - 88, W - 44, 42, 9); g.fill(); g.stroke();
  const nm = c.name.toUpperCase(); g.fillStyle = "#fff"; fitText(g, nm, W - 60, 25, 11);
  g.strokeStyle = "#000"; g.lineWidth = 3; g.strokeText(nm, W / 2, H - 66); g.fillText(nm, W / 2, H - 66);
  g.fillStyle = "#0c0d11"; g.strokeStyle = accent; g.lineWidth = 1.5; g.beginPath(); g.roundRect(W / 2 - 44, H - 46, 88, 20, 6); g.fill(); g.stroke();
  g.fillStyle = "#e9e3cf"; g.font = '13px "Lilita One",sans-serif'; g.fillText(POS_SHORT[c.pos] || "", W / 2, H - 35);
  return iconCache[key] = cv.toDataURL("image/webp", .88);
}
function cardBack(c) {
  const [GM, DI, GL, MK, TK, HO, CL, BR] = c.s || [], cr = c.cr || [];
  const row = (l, a, b) => `<tr><td>${l}</td><td>${a ?? "–"}</td><td>${b ?? "–"}</td></tr>`;
  return `<div class="cardback" style="--ca:${CLUBS[c.club].a};--cb:${CLUBS[c.club].b}">
    <div class="cbh">${badgeImg(CLUBS[c.club], "xs")} <b>${c.name}</b> <span>#${c.no || "–"}</span></div>
    <div class="cbm">${POS_FULL[c.pos] || ""} · ${CLUBS[c.club].name}${c.born ? ` · born ${c.born}` : ""}${c.ht ? ` · ${c.ht} cm` : ""}</div>
    <table><tr><th></th><th>2026</th><th>Career</th></tr>
    ${row("Games", GM, cr[0])}${row("Goals", GL, cr[1])}${row("Disposals", DI, cr[2])}${row("Marks", MK, cr[3])}${row("Tackles", TK, cr[4])}${row("Hit-outs", HO, null)}${row("Clearances", CL, null)}${row("Brownlow votes", BR, cr[5])}</table>
    <div class="tiny">Stats: AFL Tables, 2026 season${c.num ? ` · Card #${pad3(c.num)}` : ""}</div></div>`;
}
// ---------- album: a leather binder like the mock-up ----------
let albumClub = null, albumPage = 0, albumTab = "album";
const ALBUM_SPREAD_SIZE = 8; // Two facing pages of four cards each.
function openAlbum(club) { menuBack = null; hubCtx=null;
  if (club !== undefined && club !== albumClub) albumPage = 0;
  albumClub = club ?? albumClub ?? S.club;
  const tokens = S.tokens || 0, canOpen = tokens >= PACK_COST;
  const list = albumClub === "sp" ? ALL_CARDS.filter(c => c.special) : ALL_CARDS.filter(c => c.club === albumClub && !c.special);
  const spreads = Math.max(1, Math.ceil(list.length / ALBUM_SPREAD_SIZE)); albumPage = Math.min(albumPage, spreads - 1);
  const spread = list.slice(albumPage * ALBUM_SPREAD_SIZE, (albumPage + 1) * ALBUM_SPREAD_SIZE);
  const owned = list.filter(c => bestTier(c)).length;
  const sets = CLUBS.filter((c, i) => { const [o, t] = albumCount(x => x.club === i && !x.special); return t && o === t; }).length;
  const slot = c => { if (!c) return `<div class="aslot blank"></div>`; const t = bestTier(c);
    return t ? `<button type="button" class="aslot acard t-${t}${isNewCard(c) ? " isnew" : ""}" data-ac="${c.id}">${cardFaceImage(c, t)}${dupInfo(c)}${isNewCard(c) ? '<span class="newrib">NEW</span>' : ""}</button>`
      : `<button type="button" class="aslot acard empty" data-ac="${c.id}"><span>${c.special ? SPECIALS[c.kind].name : "#" + pad3(c.num)}</span><small>${c.name}</small></button>`; };
  while (spread.length < ALBUM_SPREAD_SIZE) spread.push(null);
  const clubName = albumClub === "sp" ? "Specials" : CLUBS[albumClub].name;
  const tab = (k, icon, label) => `<button class="atab${albumTab === k ? " on" : ""}" data-tab="${k}" aria-pressed="${albumTab === k}"><b>${icon}</b>${label}${k === "rewards" && (dailyReady() || S.prizePacks) ? '<i class="bang">!</i>' : ""}</button>`;
  let body = "";
  if (albumTab === "album") {
    body = `<div class="fcc-spread">
      <div class="pagehead">${albumClub === "sp" ? "<b class='spstar'>⭐</b>" : badgeImg(CLUBS[albumClub], "sm")}<span>${clubName}<small>${albumClub === "sp" ? "Special cards" : "2026 season"}</small></span>
        ${spreads > 1 ? `<div class="pager"><button class="pg" id="pgPrev" aria-label="Previous spread" ${albumPage ? "" : "disabled"}>‹</button><span>${albumPage + 1}/${spreads}</span><button class="pg" id="pgNext" aria-label="Next spread" ${albumPage < spreads - 1 ? "" : "disabled"}>›</button></div>` : ""}</div>
      <div class="binder"><div class="bpage">${spread.slice(0, ALBUM_SPREAD_SIZE / 2).map(slot).join("")}</div>
        <div class="rings" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="bpage">${spread.slice(ALBUM_SPREAD_SIZE / 2).map(slot).join("")}</div></div>
      <div class="album-progress"><b>${owned}/${list.length} collected</b><progress value="${owned}" max="${list.length || 1}" aria-label="Collection progress"></progress><span>${owned === list.length ? "Set complete" : `${list.length - owned} to go`}</span></div>
    </div>`;
  } else if (albumTab === "sets") {
    body = `<div class="setlist">${CLUBS.map((c, i) => { const [o, t] = albumCount(x => x.club === i && !x.special); return `<button class="setrow${o === t ? " done" : ""}" data-set="${i}">${badgeImg(c, "xs")}<span>${c.name}</span><i><b style="width:${o / t * 100}%"></b></i><em>${o}/${t}</em></button>`; }).join("")}
      <button class="setrow" data-set="sp"><b class="spstar">⭐</b><span>Specials</span><i><b style="width:${albumCount(x => x.special)[0] / albumCount(x => x.special)[1] * 100}%"></b></i><em>${albumCount(x => x.special)[0]}/${albumCount(x => x.special)[1]}</em></button></div>`;
  } else {
    body = `<div class="rewards">
      <div class="rwd"><b>🎟️ ${tokens}</b><span>Footy Tokens. Win any match for +${WIN_TOKENS}. A pack costs ${PACK_COST}.</span></div>
      <button class="btn ${dailyReady() ? "green" : ""}" id="dailyTok" ${dailyReady() ? "" : "disabled"}>${dailyReady() ? `Claim daily bonus<small>+${DAILY_TOKENS} 🎟️</small>` : `Daily bonus<small>back tomorrow</small>`}</button>
      ${S.prizePacks ? `<button class="btn red" id="openPrize"><img class="packmini" src="${packImg("prize")}" alt=""> Open Prize Pack ×${S.prizePacks}<small>includes a 24K Gold card</small></button>` : `<div class="rwd"><b>🏆 Prize Pack</b><span>Every 5 Experience Levels. Includes a 24K Gold card. Next at level ${Math.ceil((S.lvl + 1) / 5) * 5}.</span></div>`}
      <div class="rwd"><b>⬆️ Upgrades</b><span>3 matching duplicates upgrade a card: Common → Rare → Epic → Legendary. Cards are for collecting and don't change match stats.</span></div></div>`;
  }
  const header = `<div class="album-head">
    <div class="fccbanner">${uiArt("ico-cards","🏉")}<div><b>Footy Card Collectors</b><small>Collect · Build your dream team</small></div></div>
    <div class="atabs">${tab("album", '<span class="cicon"><i></i><i></i></span>', "Album")}<button class="atab soon" data-tab="trade"><b>⇄</b>Trade<i class="soontag">Soon</i></button>${tab("sets", "🛡️", "Sets")}${tab("rewards", "🎁", "Rewards")}</div></div>`;
  const clubRail = `<div class="woodbar"><button class="stripnext" id="stripPrev" aria-label="Previous clubs">‹</button><div class="clubstrip">${CLUBS.map((c, i) => { const [o, t] = albumCount(x => x.club === i && !x.special); return `<button aria-label="${c.name}" aria-pressed="${i === albumClub}" class="${i === albumClub ? "on" : ""}${o === t ? " done" : ""}" data-club="${i}">${badgeImg(c, "xs")}${i !== albumClub && clubHasNew(x => x.club === i && !x.special) ? '<i class="ndot"></i>' : ""}</button>`; }).join("")}<button aria-label="Special cards" aria-pressed="${albumClub === "sp"}" class="${albumClub === "sp" ? "on" : ""}" data-club="sp"><b class="spstar">⭐</b>${albumClub !== "sp" && clubHasNew(x => x.special) ? '<i class="ndot"></i>' : ""}</button></div><button class="stripnext" id="stripNext" aria-label="More clubs">›</button></div>`;
  const actions = `<div class="fccfoot">
      <div class="sets"><b class="setsicon"><span class="cicon"><i></i><i></i></span></b><div><span>Sets</span><i><b style="width:${sets / 18 * 100}%"></b></i></div><em>${sets}/18</em></div>
      ${clubRail}
      <button class="btn green openpack" id="openPackBtn" ${canOpen ? "" : "disabled"}><b class="packicon"><span class="cicon"><i></i><i></i></span></b>Open Pack<small>${PACK_COST} 🎟️ · you have ${tokens}</small>${canOpen ? '<span class="bang">!</span>' : ""}</button>
    </div>`;
  modal(`<div class="fcc">${body}</div>`,{header,actions,album:true}); tut("cards");
  if (albumTab === "album" && S.albumNew) { for (const c of spread) if (c && S.albumNew[c.id]) delete S.albumNew[c.id]; save(); }
  document.querySelectorAll("[data-club]").forEach(b => b.onclick = () => { const v = b.dataset.club; albumTab = "album"; openAlbum(v === "sp" ? "sp" : +v); });
  document.querySelectorAll("[data-set]").forEach(b => b.onclick = () => { const v = b.dataset.set; albumTab = "album"; openAlbum(v === "sp" ? "sp" : +v); });
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { if (b.dataset.tab === "trade") return toast("Trading cards with other players is coming soon!"); albumTab = b.dataset.tab; openAlbum(); });
  document.querySelectorAll("[data-ac]").forEach(el => el.onclick = () => { const c = CARD_BY_ID[el.dataset.ac];
    if (!bestTier(c)) return toast(c.special ? `${SPECIALS[c.kind].name}: comes from the special slot in packs` : `#${pad3(c.num)} ${c.name}: not collected yet. Keep opening packs!`);
    showAlbumCard(c);
  });
  const pp = $("pgPrev"), pn = $("pgNext"); if (pp) pp.onclick = () => { albumPage--; openAlbum(); }; if (pn) pn.onclick = () => { albumPage++; openAlbum(); };
  const strip = document.querySelector(".clubstrip"), sc = strip.querySelector(".on"); if (sc) strip.scrollLeft = sc.offsetLeft - strip.clientWidth / 2 + sc.clientWidth / 2;
  $("stripPrev").onclick = () => strip.scrollBy({left:-strip.clientWidth * .7, behavior:"smooth"});
  $("stripNext").onclick = () => strip.scrollBy({left:strip.clientWidth * .7, behavior:"smooth"});
  $("openPackBtn").onclick = () => { if ((S.tokens || 0) < PACK_COST) return toast("Win matches to earn Footy Tokens 🎟️"); S.tokens -= PACK_COST; packTear(rollPack(false), "Footy Pack", "footy"); };
  const pz = $("openPrize"); if (pz) pz.onclick = () => { S.prizePacks--; packTear(rollPack(true), "Prize Pack", "prize"); };
  const dt = $("dailyTok"); if (dt) dt.onclick = () => { claimDaily(); openAlbum(); };
}
const packImg = kind => (cardImg(`art/packs/${kind}.webp`) || {}).src || packArt(kind);
function dupInfo(c) { if (c.special) return ""; const n = TIER_ORDER.reduce((a, t) => a + Math.max(0, have(c.id, t) - (t === bestTier(c) ? 1 : 0)), 0); return n ? `<span class="dup">+${n}</span>` : ""; }
// Full card view: flip for the back, stat bars, and upgrades. back() returns to wherever you came from.
function bindCardTilt(card) {
  let drag=null, didDrag=false;
  const flip=()=>{
    card.setAttribute("aria-pressed",String(card.classList.toggle("flipped")));
  };
  card.onpointerdown=e=>{
    if(!e.isPrimary || e.button!==0) return;
    const bounds=card.getBoundingClientRect();
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,w:bounds.width,h:bounds.height};
    didDrag=false;
    card.classList.add("tilting");
    card.setPointerCapture(e.pointerId);
  };
  card.onpointermove=e=>{
    if(!drag || e.pointerId!==drag.id) return;
    const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(!didDrag && Math.hypot(dx,dy)<5) return;
    didDrag=true;
    const x=Math.max(-1,Math.min(1,dx/(drag.w*.45)));
    const y=Math.max(-1,Math.min(1,dy/(drag.h*.38)));
    card.style.setProperty("--card-rx",`${-y*19}deg`);
    card.style.setProperty("--card-ry",`${x*24}deg`);
    card.style.setProperty("--light-x",`${50+x*49}%`);
    card.style.setProperty("--light-y",`${50+y*49}%`);
    card.style.setProperty("--foil-angle",`${116+x*24-y*12}deg`);
    card.style.setProperty("--foil-opacity",String(.62+Math.min(1,Math.hypot(x,y))*.35));
  };
  const finish=e=>{
    if(!drag || e.pointerId!==drag.id) return;
    drag=null;
    card.classList.remove("tilting");
    for(const prop of ["--card-rx","--card-ry","--light-x","--light-y","--foil-angle","--foil-opacity"]) card.style.removeProperty(prop);
  };
  card.onpointerup=card.onpointercancel=card.onlostpointercapture=finish;
  card.onclick=()=>{ if(!didDrag) flip(); };
  card.onkeydown=e=>{
    if((e.key==="Enter" || e.key===" ") && !e.repeat){ e.preventDefault(); flip(); }
  };
}
function showAlbumCard(c, t, back) {
  t = t || bestTier(c);
  if (!t) return toast(c.special ? `${SPECIALS[c.kind].name}: comes from the special slot in packs` : `Not collected yet. Keep opening packs!`);
  const r = cardRatings(c);
  const tribute = cardTribute(c);
  const ups = c.special ? `<p class="center tiny">${SPECIALS[c.kind].name} cards can't be upgraded.</p>` : TIER_ORDER.filter(x => have(c.id, x)).map(x => `<div class="stat"><span>${TIERS[x].name}</span><b>×${have(c.id, x)} ${canUpgrade(c, x) ? `<button class="btn gold" data-up="${x}">Upgrade to ${TIERS[TIERS[x].next].name}</button>` : TIERS[x].next ? `<small>${Math.max(0, UPGRADE_COST + 1 - have(c.id, x))} more to upgrade</small>` : ""}</b></div>`).join("");
  menuBack = back ? null : () => openAlbum(c.special ? "sp" : c.club);
  modal(`<div class="cardview"><div class="cardview-main"><div class="cardview-front"><div class="flipcard" id="flipc" role="button" tabindex="0" aria-label="Flip ${c.name}'s card" aria-pressed="false"><div class="ff">${cardFaceImage(c, t)}</div><div class="fb">${cardBack(c)}</div></div>
    <p class="tiny center">Drag to tilt · Tap to flip</p>${tribute ? `<p class="card-tribute-label center">No. ${tribute.number} Tribute</p>` : ""}</div>
    <div class="spinfo wide"><h4>Card stats · ${r.ovr} overall</h4>${r.bars.map(b => `<div class="sbar"><span><i class="si">${b.icon}</i>${b.label}</span><i><b style="width:${b.v}%;background:${b.col}"></b></i><em>${b.v}</em></div>`).join("")}</div>
    </div>
    ${back ? "" : ups}
    <div class="center"><button class="btn" id="backAlb">${back ? "Back to pack" : "Back to album"}</button></div></div>`, {noClose:!!back});
  bindCardTilt($("flipc"));
  $("backAlb").onclick = back || goBack;
  document.querySelectorAll("[data-up]").forEach(b => b.onclick = () => { if (upgradeCard(c, b.dataset.up)) { toast(`Upgraded to ${TIERS[TIERS[b.dataset.up].next].name}!`); showAlbumCard(c); } });
}
// ---------- opening a pack: slide your finger across the top to tear it open ----------
function packTear(got, name, kind) {
  save(); track("pack", 1); uiDirty = true;
  const src = packImg(kind);
  modal(`<h2>${name}</h2><p class="center tiny">Slide your finger across the top to tear it open</p>
    <div class="tearwrap" id="packTear"><div class="packbody"><div class="peek"><i></i><i></i><i></i></div><img class="pbot" src="${src}" alt="" draggable="false"><img class="ptop" src="${src}" alt="" draggable="false">
      <div class="tearline"><b id="tearFill"></b></div><div class="tearhand">👆</div></div></div>`, {noClose:true});
  tut("pack");
  const wrap = $("packTear"), fill = $("tearFill"); let start = null, done = false, prog = 0;
  const box = () => wrap.querySelector(".packbody").getBoundingClientRect();
  const finish = () => { if (done) return; done = true; wrap.classList.add("torn"); sfx("card", .9); setTimeout(() => sfx("cheer", .5), 250); setTimeout(() => { tut("torn"); packReveal(got, name); }, 1100); };
  wrap.ondragstart = e => e.preventDefault();
  wrap.onpointerdown = e => { e.preventDefault(); if (done) return; wrap.setPointerCapture(e.pointerId); start = e.clientX; wrap.classList.add("tearing"); };
  wrap.onpointermove = e => { if (start === null || done) return; const b = box(); prog = Math.max(prog, Math.min(1, Math.abs(e.clientX - start) / (b.width * .8)));
    fill.style.width = prog * 100 + "%"; wrap.querySelector(".ptop").style.transform = `rotate(${-prog * 4}deg) translateY(${-prog * 4}px)`; if (prog >= 1) finish(); };
  wrap.onpointerup = wrap.onpointercancel = () => { start = null; wrap.classList.remove("tearing"); if (prog > .75) finish(); };
}
function packReveal(got, name, quiet) {
  const back = !quiet && cardImg("art/cards/back.webp");
  modal(`<h2>${name}</h2><div class="reveal">${got.map((o, i) => `<div class="flip ${back ? "flipb" : ""} ${o.special ? "spec" : ""}" data-pc="${i}" style="${quiet ? "animation:none" : `animation-delay:${i * .3}s;--d:${i * .3}s`}">${back ? `<img class="cbk" src="${back.src}" alt="">` : ""}${cardFaceImage(o.c, o.t, "cfr")}<div class="newtag ${o.isNew ? "" : "dupe"}">${o.isNew ? "NEW!" : "Dupe"}</div></div>`).join("")}</div>
    <p class="tiny center">Tap a card to see its stats</p>
    <div class="center"><button class="btn green" id="pk">Done</button></div>`, {noClose:true});
  if (!quiet) got.forEach((o, i) => setTimeout(() => sfx(o.special || o.t !== "c" ? "cheer" : "card", .6), i * 300));
  document.querySelectorAll("[data-pc]").forEach(el => el.onclick = () => { const o = got[+el.dataset.pc]; showAlbumCard(o.c, o.t, () => packReveal(got, name, true)); });
  $("pk").onclick = () => { albumTab = "album"; const base = got.filter(o => !o.special), mine = base.find(o => o.c.club === S.club) || base[0];
    openAlbum(mine ? mine.c.club : "sp"); tut("album"); };
}

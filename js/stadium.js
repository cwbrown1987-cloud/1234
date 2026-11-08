// ---------- The ground sits inside a giant footy stadium: tiered stands, light towers, boundary boards ----------
// Everything is in world (tile) coordinates around the centre of the map, so it pans and zooms with the ground.
// Stands rake gently outward, so the front stands never rise over the playing area.
const BOWL = { R0: N * 0.74, tiers: 10, step: 1.2, rise: 0.75, seg: 96 };
let crowdPat = null, crowdSrc = null;

function crowdPattern() {
  if (crowdPat && crowdSrc === ctx) return crowdPat;
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  g.fillStyle = "#262b35"; g.fillRect(0, 0, 64, 64);
  const cols = [...CLUBS.flatMap(cl => [cl.a, cl.b]), "#f1c7a0", "#d9a77c", "#8a5a3c", "#ffffff", "#ffd34d"];
  const r = rng(35);
  for (let i = 0; i < 260; i++) {
    const x = r() * 64, y = r() * 64, s = 1.4 + r() * 1.3;
    g.fillStyle = cols[r() * cols.length | 0]; g.fillRect(x, y, s * 1.3, s * 1.6);          // shirt
    g.fillStyle = r() < .5 ? "#f1c7a0" : "#c98a5a"; g.fillRect(x + s * .2, y - s * .9, s * .9, s * .9); // head
  }
  crowdSrc = ctx; crowdPat = ctx.createPattern(c, "repeat");
  return crowdPat;
}
const ringPt = (r, z, a) => P(N / 2 + Math.cos(a) * r, N / 2 + Math.sin(a) * r, z);
function ringPath(r, z, rev) {
  for (let i = 0; i <= BOWL.seg; i++) {
    const a = (rev ? BOWL.seg - i : i) / BOWL.seg * Math.PI * 2;
    const [x, y] = ringPt(r, z, a);
    if (i === 0 && !rev) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
}
function annulus(r1, z1, r2, z2, fill, stroke) {
  ctx.beginPath(); ringPath(r2, z2, false); ringPath(r1, z1, true); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill("evenodd");
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, TW * .02); ctx.stroke(); }
}

function drawStadiumBowl(club) {
  const { R0, tiers, step, rise } = BOWL;
  // night sky behind the stands, lit from the floodlights
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#132440"); sky.addColorStop(.45, "#536782"); sky.addColorStop(1, "#232e42");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // The painted rear stand replaces the far seating. The near seating wraps around the field.
  const stand = artSprites.get("scenery-grandstand");
  if (stand) {
    annulus(R0+1.1,0,R0+3.2,1.15,"#485160","#252b34");
    ctx.save();
    ctx.beginPath(); ctx.rect(-TW,fieldCentreY()-TH,W+TW*2,H); ctx.clip();
  }
  const base = R0 + 1.7;
  annulus(R0 + 1.2, .35, base, .45, "#8b8f97", "#00000055");
  for (let i = 0; i < tiers; i++) {
    const rIn = base + i * step, rOut = rIn + step, zIn = .45 + i * rise, zOut = zIn + rise;
    annulus(rIn, zIn, rOut, zOut, crowdPattern());
    annulus(rIn, zIn, rOut, zOut, i % 2 ? "#00000026" : "#ffffff10", "#00000040");
    if (i === 3 || i === 7) annulus(rOut - .18, zOut - .1, rOut, zOut, "#c9ccd2"); // aisle walkways
  }
  // roof canopy over the top tier
  const rTop = base + tiers * step, zTop = .45 + tiers * rise;
  annulus(rTop - .2, zTop, rTop + 2.6, zTop + 1.4, "#3a4352", "#0008");
  annulus(rTop + 2.4, zTop + 1.35, rTop + 2.7, zTop + 1.5, "#f6c343");

  if (stand) ctx.restore();
  const rear = Math.PI*1.25;
  const [cx, rail] = ringPt(R0+1.2,0,rear);
  if (stand) {
    const w = TW*R0*1.48, h = w*stand.h/stand.w*.55;
    ctx.drawImage(stand.image,stand.x,stand.y,stand.w,stand.h,cx-w/2,rail-h*.69,w,h);
  }

  // Tall perimeter masts, entirely behind the playing surface.
  const mast = artSprites.get("scenery-floodlight");
  for (const offset of [-.88,-.20,.20,.88]) {
    const [bx, by] = ringPt(R0+2.4,0,rear+offset);
    if (mast) {
      const height = TH*(Math.abs(offset)>.5?10.2:8.4), foot = by+TH*2.6, lamp = foot-height*.92;
      const glow = ctx.createRadialGradient(bx,lamp,0,bx,lamp,TW*1.2);
      glow.addColorStop(0,"#fff0bb6b"); glow.addColorStop(1,"#fff0bb00");
      ctx.fillStyle=glow; ctx.fillRect(bx-TW*1.2,lamp-TW*1.2,TW*2.4,TW*2.4);
      paintArt(mast,bx,foot,height/mast.h,1,offset>0?-1:1);
      continue;
    }
    const tx = bx, ty = by - TH*7.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = OUT; ctx.lineWidth = TW * .18; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = "#9aa3ad"; ctx.lineWidth = TW * .1; ctx.stroke();
    const w = TW * 1.6, h = TH * 1.7;
    const glow = ctx.createRadialGradient(tx, ty - h * .3, 0, tx, ty - h * .3, TW * 3);
    glow.addColorStop(0, "#fffbe0aa"); glow.addColorStop(1, "#fffbe000");
    ctx.fillStyle = glow; ctx.fillRect(tx - TW * 3, ty - h * .3 - TW * 3, TW * 6, TW * 6);
    ctx.lineWidth = 2; ctx.strokeStyle = OUT; rr(tx - w / 2, ty - h, w, h, 5, "#2b3038");
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(tx - w / 2 + w * (i + .5) / 5, ty - h + h * (j + .5) / 3, TW * .11, 0, 7); ctx.fillStyle = "#fffbe8"; ctx.fill(); }
  }

  // the playing surface: an oval of grass with mown stripes and a white boundary line, ringed by advertising boards
  annulus(0, 0, R0 + 1.25, 0, "#7f9a3a");
  ctx.save(); ctx.beginPath(); ringPath(R0 + 1.2, 0, false); ctx.closePath(); ctx.clip();
  for (let k = -N; k < N * 2; k += 3) { ctx.fillStyle = "#8eaa45"; ctx.beginPath(); const a = P(k, -N), b = P(k + 1.5, -N), c2 = P(k + 1.5, N * 2), d = P(k, N * 2); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c2); ctx.lineTo(...d); ctx.fill(); }
  ctx.restore();
  ctx.beginPath(); ringPath(R0, 0, false); ctx.closePath(); ctx.strokeStyle = "#f4f1e6"; ctx.lineWidth = Math.max(2, TW * .07); ctx.stroke();
  const boards = 36;
  for (let i = 0; i < boards; i++) {
    const a1 = i / boards * Math.PI * 2, a2 = (i + .92) / boards * Math.PI * 2, r = R0 + 1.25;
    const p = [ringPt(r, 0, a1), ringPt(r, 0, a2), ringPt(r, .42, a2), ringPt(r, .42, a1)];
    const home = i % 3 !== 1;
    poly(p, home ? club.a : "#263444", "#141a23", Math.max(1,TW*.018));
    poly([p[0], p[1], ringPt(r,.09,a2), ringPt(r,.09,a1)],home?club.b:"#e1b658",null);
    const [mx,my] = ringPt(r,.25,(a1+a2)/2);
    const width = Math.abs(p[1][0]-p[0][0]);
    if (width > TW*.6) {
      ctx.save(); ctx.font = `bold ${Math.max(5,TH*.24)}px sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff7e2";
      ctx.shadowColor = "#0a1018"; ctx.shadowBlur = 2;
      ctx.fillText(home?club.short:"FOOTY FORTRESS",mx,my,width*.86);
      ctx.restore();
    }
  }
  drawStadiumBanners(club,rear);
  drawOvalGoals(rear);
}

function drawStadiumBanners(club,rear) {
  for (const offset of [-.57,-.39,-.2,.2,.39,.57]) {
    const [x,y] = ringPt(BOWL.R0+2.4,1.85,rear+offset);
    const w = TW*.7, h = TH*.83;
    ctx.fillStyle = "#121922"; ctx.fillRect(x-w*.57,y-TH*.14,w*1.14,Math.max(2,TH*.12));
    poly([[x-w/2,y],[x+w/2,y],[x+w/2,y+h],[x,y+h*.83],[x-w/2,y+h]],club.a,"#121922",Math.max(1,TW*.035));
    ctx.fillStyle = club.b; ctx.fillRect(x-w*.46,y+h*.18,w*.92,h*.18);
    drawBadge(ctx,x,y+h*.55,w*.27,club);
  }
}

function drawOvalGoals(rear) {
  for (const end of [rear,rear+Math.PI]) {
    for (const offset of [-.13,-.05,.05,.13]) {
      const [x,y] = ringPt(BOWL.R0-.8,0,end+offset);
      const h = TH*(Math.abs(offset)<.1?3.2:2.15);
      ctx.lineCap = "round";
      ctx.strokeStyle = "#3e5143"; ctx.lineWidth = Math.max(2,TW*.072);
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-h); ctx.stroke();
      ctx.strokeStyle = "#faf3df"; ctx.lineWidth = Math.max(1.5,TW*.045); ctx.stroke();
    }
  }
}

// Clash-style footprint under each building: worn turf that stays inside the footprint, plus a soft contact shadow.
function groundPatch(x, y, s) {
  const inset = .1;
  for (const [m, col] of [[0, "#3f4a1c3d"], [.12, "#6e5b3245"], [.26, "#9c835233"]]) {
    poly([P(x + inset + m, y + inset + m), P(x + s - inset - m, y + inset + m), P(x + s - inset - m, y + s - inset - m), P(x + inset + m, y + s - inset - m)], col, null);
  }
  const [cx, cy] = P(x + s * .58, y + s * .6), rx = TW * s * .42, ry = TH * s * .42;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, "#14200a66"); g.addColorStop(.7, "#14200a26"); g.addColorStop(1, "#14200a00");
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore();
}

// ---------- countdown to the next AFL season ----------
const SEASON_STARTS = [Date.parse("2027-03-17T08:30:00Z")]; // 2027 Round 1: Sydney v Geelong, SCG, 7.30pm AEDT
function seasonCountdown() {
  const now = Date.now(), next = SEASON_STARTS.find(t => t > now);
  if (!next) return "🏉 Footy's on!";
  let s = Math.floor((next - now) / 1000);
  const w = Math.floor(s / 604800); s %= 604800; const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60, p = n => String(n).padStart(2, "0");
  return `🏉 ${w}w ${d}d ${p(h)}:${p(m)}:${p(sec)}`;
}

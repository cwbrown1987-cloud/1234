// ---------- The ground sits inside a giant footy stadium: tiered stands, light towers, boundary boards ----------
// Everything is in world (tile) coordinates around the centre of the map, so it pans and zooms with the ground.
// Stands rake gently outward, so the front stands never rise over the playing area.
const BOWL = { R0: N * 0.74, tiers: 10, step: 1.2, rise: 0.75, seg: 96 };
let crowdPat = null, crowdSrc = null;
let paintedBowl;

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

function drawFallbackStands() {
  const { R0, tiers, step, rise } = BOWL;
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
}

function paintBowlLayer(crowd, roof) {
  const inner = BOWL.R0 + 1.2, outer = inner + 11.5;
  const width = Math.ceil((outer+1.5)*Math.SQRT2*TW);
  const height = Math.ceil(width*.5+TH*6);
  const resolution = Math.min(1, 2400/width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width*resolution);
  canvas.height = Math.ceil(height*resolution);
  const g = canvas.getContext("2d");
  const top = height/2+TH*2.25;
  g.setTransform(resolution,0,0,resolution,width/2*resolution,top*resolution);
  const arc = Math.PI*2/48;
  const point = (radius, rise, angle) => [Math.sin(angle)*radius*TW/Math.SQRT2,
    -(Math.cos(angle)*radius/Math.SQRT2+rise)*TH];
  const ellipse = (r,z) => g.ellipse(0,-z*TH,r*TW/Math.SQRT2,r*TH/Math.SQRT2,0,0,Math.PI*2);
  const band = (r0,z0,r1,z1,color) => {
    g.beginPath(); ellipse(r1,z1); g.moveTo(r0*TW/Math.SQRT2,-z0*TH); ellipse(r0,z0);
    g.fillStyle=color; g.fill("evenodd");
  };
  const bays = (art,r0,z0,r1,z1,deck) => {
    for(let i=0;i<48;i++){
      const a=(i+.035)*arc, b=(i+.965)*arc, near=Math.cos((a+b)/2)<0;
      const a0=point(r0,z0,a), a1=point(r0,z0,b), b0=point(r1,z1,a), b1=point(r1,z1,b);
      // The near bays face back toward the turf, so their tops are on the inner edge.
      let [tl,tr,bl,br]=near?[a0,a1,b0,b1]:[b0,b1,a0,a1];
      if(tl[0]>tr[0]) [tl,tr,bl,br]=[tr,tl,br,bl];
      const x=(tr[0]-tl[0]+br[0]-bl[0])/2, y=(tr[1]-tl[1]+br[1]-bl[1])/2;
      const dx=(bl[0]-tl[0]+br[0]-tr[0])/2, dy=(bl[1]-tl[1]+br[1]-tr[1])/2;
      g.save();
      g.beginPath(); g.moveTo(...tl); g.lineTo(...tr); g.lineTo(...br); g.lineTo(...bl); g.closePath();
      g.clip();
      g.transform(x,y,dx,dy,tl[0],tl[1]);
      g.drawImage(art.image,art.x,art.y,art.w,art.h,-.07,0,1.14,1);
      if(deck!==undefined){
        // Aisles and tunnel mouths break up the rows where spectators enter each deck.
        if((i+3)%8===0){
          g.fillStyle="#999da2"; g.fillRect(.37,.20,.26,.8);
          g.fillStyle="#303844"; g.fillRect(.40,.24,.20,.76);
          g.fillStyle="#b9b5a6"; g.fillRect(.40,.25,.20,.065);
          g.fillStyle="#17212d"; g.fillRect(.43,.39,.14,.61);
        }
        g.fillStyle=(i+deck)%3===0?"#142d4138":"#142d411c";
        g.fillRect(0,0,1,1);
      }
      g.restore();
    }
  };
  band(inner,0,outer+.5,-.7,"#182334");                   // exterior base wall
  band(outer+.26,-.49,outer+.5,-.2,"#303d4c");
  band(outer+.12,-.15,outer+.4,.15,"#445160");
  band(inner,0,outer,4.2,"#5b6370");                      // full rake of the bowl
  band(inner,0,inner+1.3,.2,"#697383");                   // field-level concourse
  for(let deck=0;deck<3;deck++){
    const r=inner+1.3+deck*3.5, z=.2+deck*1.4;
    band(r,z,r+3.12,z+1.18,"#333c4c");
    bays(crowd,r,z,r+3.12,z+1.18,deck);
    band(r+3.12,z+1.18,r+3.5,z+1.4,deck===2?"#7b8490":"#9a9893");
  }
  band(outer-.12,4.12,outer+.27,4.34,"#c49a53");          // roofline rail
  // The roof sits on the outside of the seating with the same projected bays.
  band(outer-.22,4.14,outer+1.3,4.72,"#394859");
  bays(roof,outer-.22,4.14,outer+1.3,4.72);
  return {canvas,width,height,top,crowd,roof,tile:TW};
}

function drawStadiumBowl(club) {
  const { R0, tiers, step, rise } = BOWL;
  const crowd = artSprites.get("stadium-crowd"), roof = artSprites.get("stadium-roof");
  const painted = crowd && roof;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0d1730"); sky.addColorStop(.5, painted ? "#354761" : "#1c2c4f"); sky.addColorStop(1, "#141d33");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  if(painted){
    if(paintedBowl?.tile!==TW || paintedBowl.crowd!==crowd || paintedBowl.roof!==roof)
      paintedBowl=paintBowlLayer(crowd,roof);
    const {canvas,width,height,top}=paintedBowl, [cx,cy]=P(N/2,N/2);
    ctx.drawImage(canvas,cx-width/2,cy-top,width,height);
  } else drawFallbackStands();

  // four light towers
  const rear = Math.PI*1.25, rTop = R0+1.7+tiers*step, zTop = .45+tiers*rise;
  const mast = artSprites.get("stadium-light-tower");
  const towers = mast ? [-1.15,-.42,.42,1.15].map(offset=>rear+offset) : [.25,.75,1.25,1.75].map(a=>Math.PI*a);
  for (const a of towers) {
    if (mast) {
      const [x,foot] = ringPt(R0+9,3.3,a), height = TH*(Math.abs(a-rear)>.5?11.5:9.7);
      const lamp = foot-height*.92;
      const glow = ctx.createRadialGradient(x,lamp,0,x,lamp,TW*1.2);
      glow.addColorStop(0,"#fff0bb6b"); glow.addColorStop(1,"#fff0bb00");
      ctx.fillStyle=glow; ctx.fillRect(x-TW*1.2,lamp-TW*1.2,TW*2.4,TW*2.4);
      paintArt(mast,x,foot,height/mast.h,1,a>rear?-1:1);
      continue;
    }
    const [bx, by] = ringPt(rTop + 1.4, zTop + 1.4, a), [tx, ty] = ringPt(rTop + 1.4, zTop + 8.5, a);
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
  const boards = 32;
  const board = artSprites.get("stadium-board");
  for (let i = 0; i < boards; i++) {
    const a1 = i / boards * Math.PI * 2, a2 = (i + .92) / boards * Math.PI * 2, r = R0 + 1.25;
    const p = [ringPt(r, 0, a1), ringPt(r, 0, a2), ringPt(r, .42, a2), ringPt(r, .42, a1)];
    const team = club || CLUBS[i % CLUBS.length];
    if (board) {
      const [left,right] = p[3][0] < p[2][0] ? [p[3],p[2]] : [p[2],p[3]];
      const width = right[0]-left[0];
      if (width < 1) continue;
      ctx.save();
      ctx.transform(width,right[1]-left[1],0,TH*.42,left[0],left[1]);
      ctx.drawImage(board.image,board.x,board.y,board.w,board.h,0,0,1,1);
      ctx.restore();
      if(width>TW*.65){
        ctx.save();
        ctx.font=`bold ${Math.max(5,TH*.23)}px sans-serif`;
        ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle="#fff3dc";
        ctx.fillText(i%3===1?"FOOTY FORTRESS":team.short,(left[0]+right[0])/2,(left[1]+right[1])/2+TH*.21,width*.82);
        ctx.restore();
      }
    } else {
      poly(p, i % 2 ? team.a : "#ffffff", "#0006", 1);
      ctx.save(); ctx.globalAlpha = .9; poly([p[0], p[1], ringPt(r, .14, a2), ringPt(r, .14, a1)], i % 2 ? team.b : team.a, null); ctx.restore();
    }
  }
  if(painted && club){
    for (const offset of [-.57,-.39,-.2,.2,.39,.57]) {
      const [x,y] = ringPt(R0+6,1.95,rear+offset);
      const w = TW*.86, h = TH*.98;
      ctx.fillStyle = "#121922"; ctx.fillRect(x-w*.57,y-TH*.14,w*1.14,Math.max(2,TH*.12));
      poly([[x-w/2,y],[x+w/2,y],[x+w/2,y+h],[x,y+h*.83],[x-w/2,y+h]],club.a,"#121922",Math.max(1,TW*.035));
      ctx.fillStyle = club.b; ctx.fillRect(x-w*.46,y+h*.18,w*.92,h*.18);
      drawBadge(ctx,x,y+h*.55,w*.27,club);
    }
  }
  if(painted){
    for (const end of [rear,rear+Math.PI]) {
      for (const offset of [-.13,-.05,.05,.13]) {
        const [x,y] = ringPt(R0-.8,0,end+offset);
        const h = TH*(Math.abs(offset)<.1?3.2:2.15);
        ctx.lineCap = "round";
        ctx.strokeStyle = "#3e5143"; ctx.lineWidth = Math.max(2,TW*.072);
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-h); ctx.stroke();
        ctx.strokeStyle = "#faf3df"; ctx.lineWidth = Math.max(1.5,TW*.045); ctx.stroke();
      }
    }
  }
}

// Clash-style footprint under each building: worn turf that stays inside the footprint, plus a soft contact shadow.
function groundPatch(x, y, s) {
  const inset = .1;
  for (const [m, col] of [[0, "#2f5a1430"], [.1, "#3e6d1a30"], [.22, "#4f7d2224"]]) {
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

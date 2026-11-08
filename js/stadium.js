// ---------- The ground sits inside a giant footy stadium: tiered stands, light towers, boundary boards ----------
// Everything is in world (tile) coordinates around the centre of the map, so it pans and zooms with the ground.
// Stands rake gently outward, so the front stands never rise over the playing area.
const BOWL = { R0: N * 0.74, tiers: 10, step: 1.2, rise: 0.75, seg: 96 };
let crowdPat = null, crowdSrc = null;
let paintedBowl;
let stadiumCrowdPalette;

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

const STADIUM_REAR = Math.PI*1.25;
const STADIUM_MOUNTS = [-2.12,-.79,.73,2.03];
const STADIUM_SEAT_RECTS = [
  [.438,.158,.112,.134], [.374,.311,.108,.151],
  [.391,.48,.11,.153], [.409,.647,.116,.149]
];
const STADIUM_GUESTS = ["empty","flag","flag-return","binoculars","mascot","gull"];
const stadiumCrowdRandom = rng(Date.now()>>>0);
const stadiumMatchCrowds = new WeakMap();
let stadiumHomeCrowd;
const stadiumOuter = () => BOWL.R0+14;
const stadiumPoint = (radius,z,angle) => ringPt(radius,z,STADIUM_REAR+angle);

function stadiumRig(angle) {
  const radius=stadiumOuter()+.9, aim=2.8;
  const height=Math.cos(angle)>0?14.2:12.4;
  return {angle,radius,height,aim,slope:height/(radius-aim)};
}

// A quad in stadium space becomes two textured triangles in the same projection as the ground.
function stadiumTexture(g,art,points,rect=[0,0,1,1]) {
  for(const [origin,horizontal,vertical,opposite,reverse] of [
    [points[0],points[1],points[3],points[2],false],
    [points[2],points[3],points[1],points[0],true]
  ]){
    g.save();
    g.beginPath(); g.moveTo(...origin); g.lineTo(...horizontal); g.lineTo(...vertical); g.closePath();
    g.clip();
    g.transform(horizontal[0]-origin[0],horizontal[1]-origin[1],vertical[0]-origin[0],vertical[1]-origin[1],origin[0],origin[1]);
    if(reverse){ g.translate(1,1); g.scale(-1,-1); }
    g.drawImage(art.image,art.x,art.y,art.w,art.h,...rect);
    g.restore();
  }
}

function stadiumShape(g,points,fill,stroke,width) {
  g.beginPath();
  g.moveTo(...points[0]);
  for(const p of points.slice(1)) g.lineTo(...p);
  g.closePath();
  if(fill){ g.fillStyle=fill; g.fill(); }
  if(stroke){ g.strokeStyle=stroke; g.lineWidth=width; g.stroke(); }
}

// Red and green mark the two groups of supporters. Blue mixes the two kit colours on their clothing.
function tintStadiumClothing(art,mask,first,second,offset=0) {
  if(!first || !mask || offset+art.x+art.w>mask.w || art.y+art.h>mask.h) return art;
  const canvas=document.createElement("canvas");
  canvas.width=art.w; canvas.height=art.h;
  const g=canvas.getContext("2d",{willReadFrequently:true});
  g.drawImage(mask.image,mask.x+offset+art.x,mask.y+art.y,art.w,art.h,0,0,art.w,art.h);
  const channels=g.getImageData(0,0,art.w,art.h).data;
  g.clearRect(0,0,art.w,art.h);
  g.drawImage(art.image,art.x,art.y,art.w,art.h,0,0,art.w,art.h);
  const paint=g.getImageData(0,0,art.w,art.h), px=paint.data;
  const colors=[first,second||first].map(club=>[rgb(club.a),rgb(club.b)]);
  for(let i=0;i<px.length;i+=4){
    const weight=Math.max(channels[i],channels[i+1])/255;
    if(!weight || !px[i+3]) continue;
    const [primary,accent]=colors[channels[i+1]>channels[i]?1:0];
    const trim=channels[i+2]/255, light=(px[i]*.24+px[i+1]*.65+px[i+2]*.11)/255;
    for(let c=0;c<3;c++){
      const base=primary[c]+(accent[c]-primary[c])*trim;
      const shade=base*(.55+light*.65)+Math.max(0,light-.26)*57;
      px[i+c]+=(shade-px[i+c])*weight*.94;
    }
  }
  g.putImageData(paint,0,0);
  return {...art,image:canvas,x:0,y:0};
}

function stadiumSupporters(crowd,home,away) {
  const mask=artSprites.get("stadium-crowd-palette"), guestMask=artSprites.get("stadium-seat-palette");
  const saved=stadiumCrowdPalette;
  if(saved?.crowd===crowd && saved.mask===mask && saved.guestMask===guestMask && saved.home===home && saved.away===away) return saved;
  const homeTile=tintStadiumClothing(crowd,mask,home,away);
  const awayTile=away && away!==home?tintStadiumClothing(crowd,mask,away,home):homeTile;
  return stadiumCrowdPalette={crowd,mask,guestMask,home,away,homeTile,awayTile,guests:new Map()};
}

function stadiumAwayBay(bay) {
  return (bay>=6 && bay<=11) || (bay>=24 && bay<=26) || (bay>=36 && bay<=39);
}

function paintBowlLayer(supporters, roof, facade) {
  const inner=BOWL.R0+1.25, outer=stadiumOuter();
  const width=Math.ceil((outer+2)*Math.SQRT2*TW), top=(outer/Math.SQRT2+10)*TH;
  const height=Math.ceil(top+(outer/Math.SQRT2+2)*TH);
  const resolution=Math.min(1,2450/width);
  const canvas=document.createElement("canvas");
  canvas.width=Math.ceil(width*resolution);
  canvas.height=Math.ceil(height*resolution);
  const g=canvas.getContext("2d");
  g.setTransform(resolution,0,0,resolution,width/2*resolution,top*resolution);
  const bays=56, arc=2*Math.PI/bays;
  const point=(r,z,a)=>[r*Math.sin(a)*TW/Math.SQRT2,-(r*Math.cos(a)/Math.SQRT2+z)*TH];
  const quad=(a,b,r0,z0,r1,z1)=>[point(r0,z0,a),point(r0,z0,b),point(r1,z1,b),point(r1,z1,a)];
  const section=(points,fill,line)=>stadiumShape(g,points,fill,line,TW*.018);
  const rear=a=>Math.cos(a)>0;
  const covered=a=>a>-1.52 && a<.91 || a>1.78 && a<2.34;
  const upper=a=>a>-1.76 && a<1.17 || a>1.54 && a<2.58;
  const angles=Array.from({length:bays},(_,i)=>[-Math.PI+i*arc,-Math.PI+(i+1)*arc]);
  const crowdBays=new Map();

  // Continuous foundation and a separate exterior wall. Front-facing windows sit below the seats.
  g.beginPath();
  g.ellipse(0,TH*.28,(outer+1.45)*TW/Math.SQRT2,(outer+1.45)*TH/Math.SQRT2,0,0,Math.PI*2);
  g.fillStyle="#152235"; g.fill();
  g.strokeStyle="#34465b"; g.lineWidth=TW*.1; g.stroke();
  for(const [a,b] of angles){
    section(quad(a,b,inner,0,outer,0),"#536174");
    section(quad(a,b,inner,0,inner+1.38,.12),"#78828b");
    section(quad(a,b,inner+.05,.03,inner+.22,.05),"#b7a47b");
  }
  for(const [a,b] of angles){
    const m=(a+b)/2, high=upper(m)?5.7:3.4;
    const wall=quad(a,b,outer,high,outer,0);
    section(wall,rear(m)?"#27364a":"#445165","#192534");
    if(!rear(m)){
      stadiumTexture(g,facade,wall);
      section(wall,"#15263856");
      section(quad(a,b,outer+.04,.38,outer+.04,0),"#273449");
      const deckEdge=inner+(upper(m)?13.02:9.66);
      section(quad(a,b,deckEdge,high+.19,outer,high),"#646f7c","#525c68");
      section(quad(a,b,outer-.06,high+.17,outer+.04,high+.13),"#b59f7a");
    }
  }

  // The lower bowl wraps around the pitch. Taller upper stands have gaps between the pavilions.
  const decks=[[1.38,.12,5.52,1.82],[5.83,2.08,9.34,3.58],[9.60,3.83,12.70,5.75]];
  for(const [i,[a,b]] of angles.entries()){
    const m=(a+b)/2;
    for(const [level,[start,z0,end,z1]] of decks.entries()){
      if(level===2 && !upper(m)) continue;
      const r0=inner+start, r1=inner+end;
      const seats=quad(a,b,r0,z0,r1,z1);
      section(seats,"#424e5c");
      if(i%8===3){
        const tunnel=quad(a+arc*.24,b-arc*.24,r0+.05,z0+.02,r1-.10,z1-.04);
        section(tunnel,"#a19d92");
        for(let stair=1;stair<7;stair++){
          const t=stair/8, z=z0+(z1-z0)*t, r=r0+(r1-r0)*t;
          section(quad(a+arc*.27,b-arc*.27,r,z,r+.12,z+.05),stair%2===0?"#7c858d":"#596673");
        }
        const lip=r0+(r1-r0)*.55, sill=z0+(z1-z0)*.55;
        section(quad(a+arc*.27,b-arc*.27,lip,sill,lip,sill+.53),"#273444","#d2b383");
      } else {
        const patch=quad(a+arc*.035,b-arc*.035,r0,z0,r1,z1);
        // The crowd has an upright silhouette on both sides of the oval.
        let ordered=rear(m)?[patch[3],patch[2],patch[1],patch[0]]:patch;
        if(ordered[0][0]>ordered[1][0]) ordered=[ordered[1],ordered[0],ordered[3],ordered[2]];
        stadiumTexture(g,stadiumAwayBay(i)?supporters.awayTile:supporters.homeTile,ordered);
        section(patch,level===2?"#14264246":"#1d324521");
        if(level<2 && Math.abs(m)<.82) crowdBays.set(i*2+level,ordered);
      }
      section(quad(a,b,r1,z1,r1+.32,z1+.05),"#9a9b96","#69717c");
      section(quad(a,b,r1+.32,z1+.05,r1+.32,z1+.25),"#4d5c6d");
    }
  }

  // Cantilever canopies project over the upper rows. The open terraces expose the bowl on the camera side.
  for(const [a,b] of angles){
    const m=(a+b)/2;
    if(!covered(m)) continue;
    const lip=outer-4.25, roofZ=rear(m)?7.6:6.45;
    const rail=outer-.29;
    section(quad(a,b,rail,5.83,rail,roofZ-.02),"#2c3a4c");
    section(quad(a,a+arc*.17,rail-.11,5.78,rail-.11,roofZ-.01),"#96a4aa","#3c4a55");
    section(quad(a,b,rail-.14,6.05,rail-.14,6.21),"#53677b");
    const canopy=quad(a,b,lip,roofZ,outer+.38,roofZ+.48);
    section(canopy,"#526883","#25364a");
    stadiumTexture(g,roof,[canopy[3],canopy[2],canopy[1],canopy[0]]);
    section(quad(a,b,lip,roofZ-.28,lip,roofZ),"#293548");
    section(quad(a,b,lip-.035,roofZ-.07,lip-.035,roofZ+.02),"#bfa36c");
  }
  return {canvas,width,height,top,supporters,roof,facade,tile:TW,crowdBays};
}

function newStadiumCrowd(bays) {
  const r=stadiumCrowdRandom, available=[...bays.keys()];
  const visitors=["empty","empty","empty","empty","flag","binoculars",r()<.35?"mascot":"gull"];
  return visitors.map(guest=>{
    const [bay]=available.splice(Math.floor(r()*available.length),1);
    return {bay,guest,rect:STADIUM_SEAT_RECTS[Math.floor(r()*STADIUM_SEAT_RECTS.length)],phase:r()*19};
  });
}

function drawStadiumCrowd(layer,match,cx,cy,scale) {
  const art=STADIUM_GUESTS.map(key=>artSprites.get("stadium-seat-"+key));
  if(art.some(sprite=>!sprite)) return;
  let crowd=match?stadiumMatchCrowds.get(match):stadiumHomeCrowd;
  if(!crowd){
    crowd=newStadiumCrowd(layer.crowdBays);
    if(match) stadiumMatchCrowds.set(match,crowd);
    else stadiumHomeCrowd=crowd;
  }
  const time=performance.now()/1000;
  ctx.save();
  ctx.translate(cx,cy); ctx.scale(scale,scale);
  for(const {bay,guest,rect,phase} of crowd){
    const points=layer.crowdBays.get(bay);
    const x=cx+(points[0][0]+points[2][0])*scale/2, y=cy+(points[0][1]+points[2][1])*scale/2;
    if(x<-TW*2 || x>W+TW*2 || y<-TH*2 || y>H+TH*2) continue;
    const beat=(time+phase)%19;
    const frame=guest==="flag" && beat<2.1 && Math.floor(beat*5)%2 ? "flag-return" : guest;
    const i=STADIUM_GUESTS.indexOf(frame);
    const palette=layer.supporters;
    const club=stadiumAwayBay(Math.floor(bay/2)) ? palette.away||palette.home : palette.home;
    let sprite=art[i];
    if(i>0 && i<5 && club && palette.guestMask){
      const key=frame+"-"+club.abbr;
      const cached=palette.guests.get(key);
      if(cached?.source!==sprite){
        const tinted=tintStadiumClothing(sprite,palette.guestMask,club,club,(i-1)*128);
        palette.guests.set(key,{source:sprite,tinted});
        sprite=tinted;
      } else sprite=cached.tinted;
    }
    stadiumTexture(ctx,sprite,points,rect);
  }
  ctx.restore();
}

function drawStadiumRig(rig,lamp) {
  const {angle,radius,height,slope}=rig;
  const [x,foot]=stadiumPoint(radius,0,angle);
  const y=foot-height*TH;
  const taper=TW*.19;
  const steel=ctx.createLinearGradient(x-taper,0,x+taper,0);
  steel.addColorStop(0,"#1b2734"); steel.addColorStop(.38,"#bbc8cd");
  steel.addColorStop(.57,"#859ba8"); steel.addColorStop(1,"#344654");
  stadiumShape(ctx,[[x-taper,foot],[x-taper*.42,y],[x+taper*.49,y],[x+taper,foot]],steel,"#1d2936",TW*.028);
  for(const t of [.23,.49,.75]){
    const yy=foot-height*TH*t, half=taper*(1-t*.54);
    ctx.fillStyle="#455968"; ctx.fillRect(x-half,yy,half*2,TH*.08);
  }
  ctx.fillStyle="#909591"; ctx.fillRect(x-TW*.23,foot-TH*.18,TW*.46,TH*.28);
  ctx.fillStyle="#222d3a"; ctx.fillRect(x-TW*.25,foot+TH*.09,TW*.5,TH*.13);

  // The head is tangent to the bowl. Its emitting surface tilts down to the rig's aim point.
  const facePoint=(t,z,back=0)=>{
    const radial=radius-slope*z+back;
    return [x+(Math.sin(angle)*(radial-radius)+Math.cos(angle)*t)*TW/Math.SQRT2,
      y+(Math.sin(angle)*t-Math.cos(angle)*(radial-radius))*TH/Math.SQRT2-z*TH];
  };
  const frame=back=>[facePoint(-1.82,1.01,back),facePoint(1.82,1.01,back),
    facePoint(1.82,-1.01,back),facePoint(-1.82,-1.01,back)];
  const front=frame(0), back=frame(.39);
  const forward=Math.cos(angle)-slope/Math.SQRT2>0;
  const shell=forward?back:front, visible=forward?front:back;
  stadiumShape(ctx,shell,"#2d3d4f","#1b2532",TW*.04);
  for(let i=0;i<4;i++){
    const j=(i+1)%4;
    stadiumShape(ctx,[shell[i],shell[j],visible[j],visible[i]],i===0?"#798e9c":"#394e5f","#202b3b",TW*.025);
  }
  if(forward){
    const face=front[0][0]<=front[1][0]?front:[front[1],front[0],front[3],front[2]];
    stadiumTexture(ctx,lamp,face);
    const glow=ctx.createRadialGradient(x,y,0,x,y,TW*1.65);
    glow.addColorStop(0,"#ffe8ad56"); glow.addColorStop(.48,"#ffe8ad1e"); glow.addColorStop(1,"#ffe8ad00");
    ctx.fillStyle=glow; ctx.fillRect(x-TW*1.65,y-TW*1.65,TW*3.3,TW*3.3);
  } else {
    stadiumShape(ctx,back,"#506273","#1e2d3b",TW*.045);
    for(const t of [-1,-.34,.34,1]){
      const a=facePoint(t,.79,.40), b=facePoint(t,-.79,.40);
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b);
      ctx.strokeStyle="#84949b"; ctx.lineWidth=TW*.05; ctx.stroke();
    }
  }
}

function stadiumArt() {
  const crowd=artSprites.get("stadium-crowd"), roof=artSprites.get("stadium-roof");
  const facade=artSprites.get("stadium-facade"), lamp=artSprites.get("stadium-lamp");
  return crowd && roof && facade && lamp && {crowd,roof,facade,lamp};
}

function drawStadiumLighting() {
  if(!paintedBowl) return;
  ctx.save();
  ctx.beginPath(); ringPath(BOWL.R0+1.2,0,false); ctx.closePath(); ctx.clip();
  for(const angle of STADIUM_MOUNTS){
    const [x,y]=stadiumPoint(stadiumRig(angle).aim,0,angle), width=TW*13;
    ctx.save(); ctx.translate(x,y); ctx.scale(1,.5);
    const pool=ctx.createRadialGradient(0,0,0,0,0,width);
    pool.addColorStop(0,"#fff0b820"); pool.addColorStop(.65,"#ffefad10"); pool.addColorStop(1,"#ffefad00");
    ctx.fillStyle=pool; ctx.fillRect(-width,-width,width*2,width*2); ctx.restore();
  }
  ctx.restore();
}


function drawStadiumBowl(club,match) {
  const { R0, tiers, step, rise } = BOWL;
  const painted = stadiumArt();
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0d1730"); sky.addColorStop(.5, painted ? "#354761" : "#1c2c4f"); sky.addColorStop(1, "#141d33");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  if(painted){
    const {crowd,roof,facade,lamp}=painted;
    const supporters=stadiumSupporters(crowd,club,match?CLUBS[match.atkClub]:null);
    const zoom=paintedBowl ? TW/paintedBowl.tile : 0;
    // Panning and small zoom steps can reuse the layer without moving it off the oval.
    if(zoom<.8 || zoom>1.25 || paintedBowl.supporters!==supporters || paintedBowl.roof!==roof || paintedBowl.facade!==facade)
      paintedBowl=paintBowlLayer(supporters,roof,facade);
    const {canvas,width,height,top,tile}=paintedBowl, [cx,cy]=P(N/2,N/2), scale=TW/tile;
    for(const angle of STADIUM_MOUNTS) if(Math.cos(angle)>.2) drawStadiumRig(stadiumRig(angle),lamp);
    ctx.drawImage(canvas,cx-width*scale/2,cy-top*scale,width*scale,height*scale);
    drawStadiumCrowd(paintedBowl,match,cx,cy,scale);
    for(const angle of STADIUM_MOUNTS) if(Math.cos(angle)<=.2) drawStadiumRig(stadiumRig(angle),lamp);
  } else {
    paintedBowl=undefined;
    drawFallbackStands();
  }

  // Keep the procedural lights for offline installs with no stadium art.
  const rTop = R0+1.7+tiers*step, zTop = .45+tiers*rise;
  if(!painted) for (const a of [.25,.75,1.25,1.75].map(a=>Math.PI*a)) {
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
      const [x,y] = stadiumPoint(R0+6.77,2.05,offset);
      const w = TW*.86, h = TH*.98;
      ctx.fillStyle = "#121922"; ctx.fillRect(x-w*.57,y-TH*.14,w*1.14,Math.max(2,TH*.12));
      poly([[x-w/2,y],[x+w/2,y],[x+w/2,y+h],[x,y+h*.83],[x-w/2,y+h]],club.a,"#121922",Math.max(1,TW*.035));
      ctx.fillStyle = club.b; ctx.fillRect(x-w*.46,y+h*.18,w*.92,h*.18);
      drawBadge(ctx,x,y+h*.55,w*.27,club);
    }
  }
  if(painted){
    for (const end of [STADIUM_REAR,STADIUM_REAR+Math.PI]) {
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

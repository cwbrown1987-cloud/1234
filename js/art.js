// Transparent sprite sheets. Art reads the game state through the existing draw calls.
const artSprites = new Map();
const namedHeroArt = {
  adel:"dawson", bris:"neale", carl:"cripps", coll:"daicos", ess:"martin", freo:"serong",
  geel:"cameron", gcs:"rowell", gws:"green", haw:"sicily", melb:"gawn", nmfc:"sheezel",
  port:"rozee", rich:"taranto", stk:"wanganeen-milera", syd:"heeney", wce:"reid", wb:"bontempelli"
};
const kitSprites = new Map();

function loadArtSheet(sheet, columns, rows, names, priority = 0, rowStops = null) {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d", {willReadFrequently:true});
    context.drawImage(image,0,0);
    for (const [i,name] of names.entries()) {
      if (!name || (artSprites.get(name)?.priority ?? -1) > priority) continue;
      const x = Math.floor(i % columns * image.width / columns);
      const row = Math.floor(i / columns);
      const y = Math.floor((rowStops?.[row] ?? row/rows) * image.height);
      const w = Math.floor((i % columns + 1) * image.width / columns) - x;
      const h = Math.floor((rowStops?.[row+1] ?? (row+1)/rows) * image.height) - y;
      const pixels = context.getImageData(x,y,w,h).data;
      let left = w, top = h, right = -1, bottom = -1;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        if (pixels[(py*w+px)*4+3] < 85) continue;
        left = Math.min(left,px);
        top = Math.min(top,py);
        right = Math.max(right,px);
        bottom = Math.max(bottom,py);
      }
      if (right < left || bottom < top) continue;
      artSprites.set(name,{image,x:x+left,y:y+top,w:right-left+1,h:bottom-top+1,priority});
    }
    for (const key of Object.keys(iconCache)) delete iconCache[key];
    refreshArtHUD();
    uiDirty = true;
  };
  image.src = sheet;
}

function paintArt(sprite, x, y, scale, anchor, face = 1, tilt = 0) {
  if (!sprite) return false;
  const {image,x:sx,y:sy,w,h} = sprite;
  ctx.save();
  ctx.translate(x,y);
  if (tilt) ctx.rotate(tilt);
  if (face < 0) ctx.scale(-1,1);
  ctx.drawImage(image,sx,sy,w,h,-w*scale/2,-h*scale*anchor,w*scale,h*scale);
  ctx.restore();
  return true;
}

// The front of a building's base must stay inside the logical footprint.
const artBuildings = {
  clubhouse: [.98,.81], pieshop: [.91,.82], drinktap: [.87,.83], piewarmer: [.91,.82],
  esky: [.69,.81], oval: [.93,.54], kitroom: [.89,.82], herohall: [.89,.82], bench: [.91,.78], physio: [.9,.8],
  coachbox: [.9,.84], locker: [.89,.82], office: [.89,.82], shed: [.95,.82],
  goalpost: [.85,.89], siren: [.87,.81], catapult: [.89,.83], floodlight: [.84,.92]
};

function buildingArtScale(type,sprite) {
  const width = artBuildings[type][0];
  const maxHeight = type==="clubhouse"?3.75:type==="floodlight"?3.48:2.8;
  return Math.min(BLD[type].size*width/sprite.w,maxHeight/sprite.h);
}

function drawBuildingArt(b, club, opts) {
  const sprite = artSprites.get(b.t==="kitroom"?"office":b.t==="herohall"?"locker":b.t);
  if (!sprite) return 0;
  const anchor = artBuildings[b.t][1];
  const s = BLD[b.t].size;
  const scale = TW*buildingArtScale(b.t,sprite);
  const [x,y] = P(b.x+s/2,b.y+s/2);
  const face = b.t==="siren" || b.t==="catapult" ? (Math.cos(b.ang??-2.6)<0?-1:1) : 1;
  const recoil = (b.recoil||0)*TW*.13;
  paintArt(sprite,x-face*recoil,y,scale,anchor,b.t==="siren"?-face:face);
  const height = sprite.h*scale*anchor/TH;

  if (b.t==="clubhouse") {
    drawBadge(ctx,x-TW*.42,y-height*TH*.30,TW*.38,club);
    flag(x+TW*.93,y-height*TH*.28,club,.58);
  }
  if (b.t==="herohall") {
    const ks=["vice","star","rleg"];
    ks.forEach((hk,i)=>{ const hc=opts.heroes?.[hk]; const ox=b.x+s*(.35+i*.25), oy=b.y+s*(.85-i*.08);
      if (hc) drawHeroStatue(ox,oy,.08,hc,hk,true); });
    if (!ks.some(hk=>opts.heroes?.[hk])) txt(ks.some(hk=>opts.heroes?.busy?.[hk])?"🔧":"💤",x+TW*.54,y-TH*.35,TH*.7);
  }
  if (b.t==="locker" || b.t==="office") {
    const hero = b.t==="locker"?"captain":"coach";
    const homeClub = opts.heroes?.[hero];
    if (homeClub) drawHeroStatue(b.x+s*.75,b.y+s*.76,.08,homeClub,hero);
    else txt(opts.heroes?.busy?.[hero]?"🔧":"💤",x+TW*.54,y-TH*.35,TH*.7);
  }
  if (b.t==="oval") {
    const phase = performance.now()/2200;
    for (let i=0,n=Math.min(6,b.lv||1); i<n; i++) {
      const a = phase+i*Math.PI*2/n;
      drawPlayer(x+Math.cos(a)*TW*.72,y+Math.sin(a)*TH*.44,TW*.075,club,{moving:true,id:i,face:Math.sin(a)>0?-1:1});
    }
  }
  if (b.t==="bench") {
    const count = Math.min(6,Math.ceil((opts.fill??.5)*6));
    for (let i=0; i<count; i++) drawPlayer(x+(i-(count-1)/2)*TW*.2,y+TH*.24,TW*.07,club,{id:i});
  }
  if (BLD[b.t].stores && opts.fill!==undefined) {
    bar(x,y+TH*.46,opts.fill,b.t==="esky"?"#54cffa":"#f4b84a",TW*.75);
  }
  if (b.t==="floodlight" && (opts.lit || recoil)) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glowY = y-height*TH*.85;
    const glow = ctx.createRadialGradient(x,glowY,0,x,glowY,TW*.62);
    glow.addColorStop(0,"#ffeda98a");
    glow.addColorStop(1,"#ffeda900");
    ctx.fillStyle = glow;
    ctx.fillRect(x-TW*.62,glowY-TW*.62,TW*1.24,TW*1.24);
    ctx.restore();
  }
  if (b.lv>=3) {
    const [px,py] = P(b.x+s-.38,b.y+s-.38);
    ctx.lineWidth = Math.max(1,TW*.026);
    ctx.strokeStyle = "#604422";
    rr(px-TW*.21,py-TH*.49,TW*.42,TH*.46,TW*.12,b.lv>=5?"#ffcd63":"#e1d1a1");
    txt(String(b.lv),px,py-TH*.25,TH*.35,"#fff4c2");
  }
  return height+.45;
}

// Recolour the jersey panel once per pose and club, retaining its sculpted shading.
function clubKit(key, club) {
  const sprite = artSprites.get(key);
  if (!sprite || key==="trainer" || key==="coach") return sprite;
  const cacheKey = key + ":" + club.abbr;
  if (kitSprites.has(cacheKey)) return kitSprites.get(cacheKey);
  const {image,x,y,w,h} = sprite;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d",{willReadFrequently:true});
  context.drawImage(image,x,y,w,h,0,0,w,h);
  const kit = context.getImageData(0,0,w,h);
  const pixels = kit.data;
  const primary = rgb(club.a), accent = rgb(club.b);
  for (let py=Math.floor(h*.29); py<h*.63; py++) for (let px=0; px<w; px++) {
    const i = (py*w+px)*4, r=pixels[i], g=pixels[i+1], b=pixels[i+2];
    if (!pixels[i+3] || r>b+12 && r>g+15) continue;
    const low = Math.min(r,g,b), high = Math.max(r,g,b);
    const navy = b>r+12 && b>g+5 && high<172;
    if (!navy && (high-low>32 || high<72)) continue;
    const color = navy || Math.abs(px/w-.53)<.075 ? accent : primary;
    const light = high/230;
    for (let c=0; c<3; c++) pixels[i+c] = Math.min(255,color[c]*(.48+light*.56)+high*.09);
  }
  context.putImageData(kit,0,0);
  const tinted = {image:canvas,x:0,y:0,w,h};
  kitSprites.set(cacheKey,tinted);
  return tinted;
}

// Placeholder bodies for the Hero Hall heroes until their own sprites arrive (see ART_HANDOFF.md).
const HERO_ART = {captain:"captain", vice:"rover", star:"forward", rleg:"ruck"};
function drawPlayerArt(x,y,k,club,opts) {
  const base = opts.kind==="coach"?"coach":opts.hero?(HERO_ART[opts.heroKey]||"captain"):opts.kind||"rover";
  const phase = performance.now()/95+(opts.id||0);
  const stride = opts.moving && Math.sin(phase)>-.15;
  const action = opts.atk && artSprites.has(base+"-attack");
  const pose = action ? base+"-attack" : stride ? base+"-run" : base;
  const named = base==="captain" && (!opts.heroKey||opts.heroKey==="captain") && namedHeroArt[club.abbr];
  const sprite = (named && artSprites.get(named+(stride||opts.atk?"-run":"-body"))) || clubKit(pose,club) || clubKit(base,club);
  if (!sprite) return false;
  const bob = opts.moving ? Math.abs(Math.sin(phase))*k*.10 : 0;
  const lean = opts.atk ? (opts.face||1)*k*(base==="forward"?.08:.23) : 0;
  ctx.fillStyle = "#142f2452";
  ctx.beginPath();
  ctx.ellipse(x,y,k*.74,k*.26,0,0,Math.PI*2);
  ctx.fill();
  paintArt(sprite,x+lean,y-bob,k*(opts.hero?3.30:3.15)/sprite.h,1,opts.face);
  if (opts.hero) txt(named==="daicos"?"35":"★",x,y-k*3.37,k*.52,GOLD);
  if (opts.rage) {
    if (named==="daicos") drawDaicosBurst(x,y,k,phase);
    else {
      ctx.strokeStyle = "#ff557fb8";
      ctx.lineWidth = Math.max(1,k*.13);
      ctx.beginPath();
      ctx.ellipse(x,y,k*.89,k*.36,0,0,Math.PI*2);
      ctx.stroke();
    }
  }
  return true;
}

function drawDaicosBurst(x,y,k,phase) {
  ctx.save();
  ctx.shadowColor = "#ffd056";
  ctx.shadowBlur = k*.34;
  ctx.lineWidth = Math.max(1,k*.10);
  for (let i=0; i<2; i++) {
    ctx.strokeStyle = i ? "#fff9e7" : "#ffca53";
    ctx.beginPath();
    ctx.ellipse(x,y,k*(.98+i*.15),k*(.35+i*.06),0,phase*.44+i*Math.PI,phase*.44+i*Math.PI+4.4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSceneryArt(t,x,y,k) {
  if (t.k!=="tree" && t.k!=="rock") return false;
  const sprite = artSprites.get(t.k);
  if (!sprite) return false;
  const widths = {tree:2.5,bush:2.0,rock:1.4};
  return paintArt(sprite,x,y,k*widths[t.k]/sprite.w,.92,t.h>.5?-1:1);
}

// Stadium dressing sits on the distant banks and has no gameplay footprint.
function drawStadium() {
  const sprite = artSprites.get("grandstand");
  if (!sprite) return;
  for (const [gx,gy,width,face] of [[-3.1,8,5.8,1],[7,-3.1,5.8,-1],[24,-3.1,5.8,-1],[-3.1,24,5.8,1]]) {
    paintArt(sprite,...P(gx,gy),TW*width/sprite.w,.79,face);
  }
}

function loadFootyArt() {
  loadArtSheet(FOOTY_SHEETS.buildings,4,4,Object.keys(artBuildings));
  loadArtSheet(FOOTY_SHEETS.players,4,4,[
    "rover","rover-run",null,"forward","forward-run","forward-attack","ruck","tagger",
    "shepherd","trainer","captain","coach","seagulls","blimp","tree","rock"
  ],0,[0,.25,.50,.759,1]);
  loadArtSheet(FOOTY_SHEETS.fortress,3,3,[
    "clubhouse","goalpost","siren","catapult","floodlight","fence-post","rubble","grandstand","footy"
  ],1);
  loadArtSheet(FOOTY_SHEETS.interface,4,4,[
    "portrait-rover","portrait-forward","portrait-ruck","portrait-tagger",
    "portrait-shepherd","portrait-trainer","portrait-captain","portrait-coach",
    "icon-oranges","icon-roar","icon-freekick","icon-rain","icon-sub","icon-pies","icon-drink","icon-medals"
  ]);
  if (FOOTY_SHEETS.motion) loadArtSheet(FOOTY_SHEETS.motion,4,3,[
    "rover-attack","ruck-run","ruck-attack","tagger-run","tagger-attack","shepherd-run",
    "shepherd-attack","trainer-run","trainer-attack","coach-run","coach-attack","captain-attack"
  ]);
  loadCaptainSheet("captains",["coll","melb","wb"],[0,.304,.673,1]);
  loadCaptainSheet("captainsA",["adel","bris","carl"]);
  loadCaptainSheet("captainsB",["ess","freo","geel"]);
  loadCaptainSheet("captainsC",["gcs","gws","haw"]);
  loadCaptainSheet("captainsD",["nmfc","port","rich"]);
  loadCaptainSheet("captainsE",["stk","syd","wce"]);
}

function loadCaptainSheet(key,clubs,rowStops) {
  const names = clubs.map(club => namedHeroArt[club]);
  const poses = ["","-body","-run"].flatMap(pose => names.map(name => name+pose));
  loadArtSheet(FOOTY_SHEETS[key],3,3,poses,0,rowStops);
}

function drawFenceArt(x,y,h,lv,joinX,joinY) {
  const post = artSprites.get("fence-post");
  if (!post) return false;
  const slate = lv<3?"#56647b":lv<6?"#495b7b":"#3d5276";
  const cap = lv<3?"#b2a486":lv<6?"#d4a43d":"#ffc954";
  if (joinX) {
    prism(x+.5,y+.33,.99,.34,0,h*.72,slate);
    prism(x+.5,y+.31,.99,.38,h*.72,.1,cap);
  }
  if (joinY) {
    prism(x+.33,y+.5,.34,.99,0,h*.72,slate);
    prism(x+.31,y+.5,.38,.99,h*.72,.1,cap);
  }
  return paintArt(post,...P(x+.5,y+.5),TW*.68/post.w,.89);
}

function drawPitchMarkings() {
  const [cx,cy] = P(N/2,N/2);
  ctx.save();
  ctx.translate(cx,cy);
  ctx.transform(TW/2,TH/2,-TW/2,TH/2,0,0);
  ctx.strokeStyle = "#fff1bf51";
  ctx.lineWidth = .085;
  ctx.beginPath();
  ctx.ellipse(0,0,N*.46,N*.37,0,0,Math.PI*2);
  ctx.rect(-2.2,-2.2,4.4,4.4);
  ctx.moveTo(1.1,0);
  ctx.arc(0,0,1.1,0,Math.PI*2);
  ctx.stroke();
  ctx.restore();
}

function drawFlyerArt(x,y,kind,face) {
  const sprite = artSprites.get(kind);
  if (!sprite) return false;
  const width = kind==="seagulls"?.93:1.9;
  const tilt = Math.sin(performance.now()/(kind==="seagulls"?130:450))*.10;
  return paintArt(sprite,x,y,TW*width/sprite.w,.53,face,tilt);
}

// Portraits come in one kit; repaint the guernsey (lower part, not skin) in the club's colours.
// Darker cloth becomes the club's main colour, lighter cloth its second colour, keeping the shading.
function portraitKit(key, club) {
  const sprite = artSprites.get(key);
  if (!sprite || !club || key==="portrait-coach" || key==="portrait-trainer") return sprite;
  const cacheKey = key + ":" + club.abbr;
  if (kitSprites.has(cacheKey)) return kitSprites.get(cacheKey);
  const {image,x,y,w,h} = sprite;
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  const context = canvas.getContext("2d",{willReadFrequently:true});
  context.drawImage(image,x,y,w,h,0,0,w,h);
  const kit = context.getImageData(0,0,w,h), px = kit.data;
  const primary = rgb(club.a), accent = rgb(club.b);
  const lumA = (primary[0]*.3+primary[1]*.59+primary[2]*.11), lumB = (accent[0]*.3+accent[1]*.59+accent[2]*.11);
  const [dark, light] = lumA <= lumB ? [primary, accent] : [accent, primary];
  // Only the guernsey's own colours are swapped: dark/navy cloth -> main colour, yellow/white/red trim -> second colour.
  const tone=(col,l,mean)=>{ const k=Math.max(.35,Math.min(1.35,.82+(l-mean)/150)); return col.map(c=>Math.max(0,Math.min(255,c*k+(l-mean)*.15))); };
  for (let py=Math.floor(h*.56); py<h; py++) for (let qx=0; qx<w; qx++) {
    const i=(py*w+qx)*4, r=px[i], g=px[i+1], b=px[i+2];
    if (px[i+3] < 40) continue;
    const max=Math.max(r,g,b), min=Math.min(r,g,b), l=r*.3+g*.59+b*.11, sat=max?(max-min)/max:0;
    let hue=0; if(max!==min){ if(max===r) hue=60*(((g-b)/(max-min))%6); else if(max===g) hue=60*((b-r)/(max-min)+2); else hue=60*((r-g)/(max-min)+4); if(hue<0) hue+=360; }
    let out=null;
    if (l<80 && sat<.38) out=tone(dark,l,40);                                   // black cloth
    else if (hue>=195 && hue<=260 && sat>.25) out=tone(dark,l,70);               // navy / blue cloth
    else if (hue>=38 && hue<=68 && sat>.45) out=tone(light,l,185);               // yellow trim
    else if (l>165 && sat<.16) out=tone(light,l,215);                            // white trim
    else if ((hue<12||hue>340) && sat>.6 && b<r*.28 && l>55 && !(key==="portrait-forward" && qx>w*.22 && qx<w*.72 && py>h*.66)) out=tone(light,l,105); // red trim (not the Sherrin)
    if (!out) continue;
    px[i]=out[0]; px[i+1]=out[1]; px[i+2]=out[2];
  }
  context.putImageData(kit,0,0);
  const tinted = {image:canvas,x:0,y:0,w,h};
  kitSprites.set(cacheKey,tinted);
  return tinted;
}

function drawArtIcon(key, context, x, y, width, height, club) {
  const sprite = key.startsWith("portrait-") && club ? portraitKit(key,club) : artSprites.get(key);
  if (!sprite) return false;
  const {image,x:sx,y:sy,w,h} = sprite;
  const scale = Math.min(width/w,height/h);
  context.drawImage(image,sx,sy,w,h,x-w*scale/2,y-h*scale,w*scale,h*scale);
  if (key==="daicos") drawDaicosBadge(context,x+width*.29,y-height*.20,width*.26);
  return true;
}

function drawDaicosBadge(context,x,y,size) {
  context.save();
  context.fillStyle = "#1b1a1c";
  context.strokeStyle = "#f6c343";
  context.lineWidth = Math.max(1,size*.07);
  context.beginPath();
  context.roundRect(x-size/2,y-size*.32,size,size*.64,size*.15);
  context.fill();
  context.stroke();
  context.fillStyle = "#ffe298";
  context.font = `bold ${size*.52}px "Lilita One",sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("35",x,y);
  context.restore();
}

function refreshArtHUD() {
  for (const [selector,key] of [
    ['.res[data-r="pies"] i',"icon-pies"], ['.res[data-r="drink"] i',"icon-drink"],
    ['.res[data-r="medals"] i',"icon-medals"], ["#btnAttack b","footy"],
    ["#btnSquad b","portrait-rover"], ["#btnShop b","icon-pies"]
  ]) {
    const node = document.querySelector(selector);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const club = typeof S!=="undefined" && S ? CLUBS[S.club] : null;
    if (!drawArtIcon(key,canvas.getContext("2d"),32,63,63,62,club)) continue;
    const image = new Image();
    image.alt = "";
    image.className = "hud-icon";
    image.src = canvas.toDataURL();
    node.replaceChildren(image);
  }
}


let turfGrain;
function drawTurfGrain(cx,cy) {
  if (!turfGrain) {
    const tile=document.createElement("canvas");
    tile.width=tile.height=192;
    const turf=tile.getContext("2d");
    const random=rng(5219);
    for (let i=0; i<6700; i++) {
      const x=random()*tile.width, y=random()*tile.height, size=.55+random()*1.6;
      turf.fillStyle=i%3===0?"#f5d57056":i%3===1?"#34462645":"#d8ec8e34";
      turf.fillRect(x,y,size*1.45,size);
    }
    turfGrain=ctx.createPattern(tile,"repeat");
  }
  const scale=Math.max(.68,TW/65);
  turfGrain.setTransform(new DOMMatrix().translate(cx,cy).scale(scale));
  ctx.fillStyle=turfGrain;
  ctx.fillRect(0,0,W,H);
}

function drawImpactSparks(x,y,r,age) {
  const glow=ctx.createRadialGradient(x,y,0,x,y,r);
  glow.addColorStop(0,"#fff3ac");
  glow.addColorStop(.3,"#ffbf43d0");
  glow.addColorStop(1,"#ff852000");
  ctx.fillStyle=glow;
  ctx.fillRect(x-r,y-r,r*2,r*2);
  ctx.lineCap="round";
  ctx.lineWidth=Math.max(1,TW*.025);
  for (let i=0; i<10; i++) {
    const angle=i*2.39996, distance=r*(.25+age*.85+(i%3)*.15);
    const dx=Math.cos(angle), dy=Math.sin(angle);
    ctx.strokeStyle=i%3===0?"#fff0a0":"#ffaf4a";
    ctx.beginPath();
    ctx.moveTo(x+dx*distance,y+dy*distance);
    ctx.lineTo(x+dx*(distance+r*.21),y+dy*(distance+r*.21));
    ctx.stroke();
  }
}

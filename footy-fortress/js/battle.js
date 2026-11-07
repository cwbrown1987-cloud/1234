// ---------- Match engine: used for your attacks, AI raids on you, and replays ----------
let BT = null;
const isDef = t => !!BLD[t].def;
const isRes = t => ["pieshop","drinktap","piewarmer","esky","clubhouse"].includes(t);
const counts = b => b.t!=="fence" && !BLD[b.t].trap;
const C0 = Math.floor(N/2); // map centre

// AI base layout for clubhouse level d. Fence rings around a core, defences in the middle band, collectors outside.
function genBase(d, seed){
  const r=rng(seed), list=[], occ=new Set(), key=(i,j)=>i+","+j;
  const ring=(lo,hi)=>{ const c=[]; for(let i=lo;i<=hi;i++) c.push([i,lo]); for(let j=lo+1;j<=hi;j++) c.push([hi,j]); for(let i=hi-1;i>=lo;i--) c.push([i,hi]); for(let j=hi-1;j>lo;j--) c.push([lo,j]); return c; };
  const R1=ring(C0-6,C0+6), R2=ring(C0-10,C0+10), R3=ring(C0-14,C0+14);
  const rings=[R1,R2,R3];
  rings.flat().forEach(([i,j])=>occ.add(key(i,j)));
  const zone=(i,j)=>{ const m=Math.max(Math.abs(i-C0),Math.abs(j-C0)); return m<=5?"core":m<=9?"mid":m<=13?"out":"edge"; };
  const fits=(x,y,s,z,gap)=>{ if(x<1||y<1||x+s>N-1||y+s>N-1) return false;
    for(let i=x;i<x+s;i++) for(let j=y;j<y+s;j++){ if(occ.has(key(i,j))||zone(i,j)!==z) return false; }
    if(gap) for(let i=x-1;i<=x+s;i++) for(let j=y-1;j<=y+s;j++) if(occ.has("b"+key(i,j))) return false;
    return true; };
  const lvOf=t=>Math.max(1,Math.min(maxLevel(t,d), maxLevel(t,d)-(r()<.5?1:0)-(r()<.2?1:0)));
  const put=(t,x,y)=>{ const s=BLD[t].size, lv=t==="clubhouse"?d:lvOf(t), hp=BLD[t].hp[lv-1];
    for(let i=x;i<x+s;i++) for(let j=y;j<y+s;j++){ occ.add(key(i,j)); occ.add("b"+key(i,j)); }
    const b={id:list.length+1,t,x,y,lv,hp,max:hp,cd:r()}; list.push(b); return b; };
  const place=(t,zones)=>{ const s=BLD[t].size; for(const z of zones) for(let k=0;k<400;k++){ const x=1+(r()*(N-2-s))|0, y=1+(r()*(N-2-s))|0; if(fits(x,y,s,z,z!=="core")) return put(t,x,y); } return null; };
  put("clubhouse",C0-2,C0-2);
  const cnt=t=>MAXC[t][d-1];
  for(const t of ["piewarmer","esky"]) for(let i=0;i<cnt(t);i++) place(t,["core","mid"]);
  if(cnt("catapult")) place("catapult",["core","mid"]);
  if(cnt("floodlight")) place("floodlight",["core","mid"]);
  for(const t of ["goalpost","siren","catapult","floodlight"]) for(let i=list.filter(b=>b.t===t).length;i<cnt(t);i++) place(t,["mid","out","core"]);
  for(const t of ["locker","office","coachbox","physio","oval"]) for(let i=0;i<cnt(t);i++) place(t,["out","mid","edge"]);
  for(const t of ["pieshop","drinktap","bench"]) for(let i=0;i<cnt(t);i++) place(t,["edge","out"]);
  place("shed",["edge"]); place("shed",["edge"]);
  let budget=cnt("fence");
  for(const R of rings){ if(budget<=0) break;
    const take=Math.min(R.length,budget), skip=R.length-take; budget-=take;
    R.forEach(([i,j],n)=>{ const gapHere = skip>0 && (Math.floor(n*skip/R.length)!==Math.floor((n+1)*skip/R.length));
      if(!gapHere && !occ.has("b"+key(i,j))){ const lv=Math.max(1,Math.min(maxLevel("fence",d),d-(r()<.3?1:0))), hp=BLD.fence.hp[lv-1]; list.push({id:list.length+1,t:"fence",x:i,y:j,lv,hp,max:hp}); occ.add("b"+key(i,j)); } }); }
  for(let n=0;n<cnt("sprinkler");n++) for(let k=0;k<200;k++){ const i=C0-9+(r()*19|0), j=C0-9+(r()*19|0); if(zone(i,j)==="mid"&&!occ.has(key(i,j))&&!occ.has("b"+key(i,j))){ occ.add("b"+key(i,j)); list.push({id:list.length+1,t:"sprinkler",x:i,y:j,lv:Math.max(1,Math.min(5,d-2)),hp:1,max:1,armed:true}); break; } }
  const total={pies:Math.round((600+1100*d*d)*(.7+r()*.6)), drink:Math.round((600+1100*d*d)*(.7+r()*.6))};
  const share=(res,types,frac)=>{ const bs=list.filter(b=>types.includes(b.t)); bs.forEach(b=>{ b.loot=b.loot||{pies:0,drink:0}; b.loot[res]+=Math.round(total[res]*frac/bs.length); }); };
  share("pies",["piewarmer"],.6); share("drink",["esky"],.6); share("pies",["pieshop"],.25); share("drink",["drinktap"],.25);
  share("pies",["clubhouse"],.15); share("drink",["clubhouse"],.15);
  return list;
}

// Shared setup for every kind of match.
// o: {mode:"attack"|"raid"|"replay", club (whose base), atkClub, buildings, army, spells, heroes, lvOf, heroStat, plan, bonus}
function makeBattle(o){
  const lootTotal={pies:0,drink:0}; o.buildings.forEach(b=>{ if(b.loot){ lootTotal.pies+=b.loot.pies; lootTotal.drink+=b.loot.drink; } });
  return {...o, units:[], proj:[], fx:[], zones:[], time:180, elapsed:0, started:!!o.plan, over:false,
    left:{...o.army}, had:{...o.army}, spellsLeft:{...(o.spells||{})}, hadSpells:{...(o.spells||{})},
    heroesLeft:{...(o.heroes||{})}, heroU:{}, abilityUsed:{}, loot:{pies:0,drink:0}, lootTotal, uid:0, dirty:true, mask:2, sel:null, destroyed:0};
}
function startBattle(o){
  if(!Object.values(S.army).some(n=>n>0)) return toast("Train some players first!");
  const heroes={}; for(const h of Object.keys(HEROES)) if(heroReady(h)) heroes[h]=true;
  BT=makeBattle({mode:"attack", kind:o.kind, round:o.round, fixture:o.fixture, d:o.d, club:o.club, atkClub:S.club, buildings:o.buildings||genBase(o.d,o.seed),
    army:S.army, spells:S.spells, heroes, lvOf:u=>S.unitLv[u], heroStat:h=>heroStats(h), bonus:cardBonus, lootMul:(eventNow()&&eventNow().loot||1)*(o.lootMul||1), revenge:o.revenge});
  BT.sel = firstSel();
  mode="battle"; selected=null; placing=null; cam.x=0; cam.y=0; setZoom(.8); sfx("whistle"); refreshUI(); tut("battle");
}
function firstSel(){ const u=Object.keys(BT.left).find(u=>BT.left[u]>0); if(u) return {k:"unit",v:u}; const h=Object.keys(BT.heroesLeft).find(h=>BT.heroesLeft[h]); return h?{k:"hero",v:h}:null; }

// ---------- grid / pathfinding ----------
function rebuildGrid(){
  const g=new Array(N*N).fill(null);
  for(const b of BT.buildings){ if(b.hp<=0||BLD[b.t].trap) continue; const s=BLD[b.t].size; for(let i=b.x;i<b.x+s;i++) for(let j=b.y;j<b.y+s;j++) g[j*N+i]=b; }
  BT.grid=g;
  const m=new Uint8Array(N*N);
  for(const b of BT.buildings){ if(b.hp<=0||BLD[b.t].trap) continue; const s=BLD[b.t].size; for(let i=b.x-1;i<=b.x+s;i++) for(let j=b.y-1;j<=b.y+s;j++) if(i>=0&&j>=0&&i<N&&j<N) m[j*N+i]=1; }
  BT.noDeploy=m; BT.dirty=false;
}
function rectDist(px,py,b){ const s=BLD[b.t].size; const dx=Math.max(b.x-px,0,px-(b.x+s)), dy=Math.max(b.y-py,0,py-(b.y+s)); return Math.hypot(dx,dy); }
const cen = b => [b.x+BLD[b.t].size/2, b.y+BLD[b.t].size/2];

function findPath(u, tgt){
  const g=BT.grid, sx=Math.max(0,Math.min(N-1,u.x|0)), sy=Math.max(0,Math.min(N-1,u.y|0)), [tx,ty]=cen(tgt), reach=u.range+.15;
  const G=new Float32Array(N*N).fill(1e9), from=new Int32Array(N*N).fill(-1), closed=new Uint8Array(N*N);
  const heap=[]; const push=(i,f)=>{ heap.push([f,i]); let k=heap.length-1; while(k){ const p=(k-1)>>1; if(heap[p][0]<=heap[k][0]) break; [heap[p],heap[k]]=[heap[k],heap[p]]; k=p; } };
  const pop=()=>{ const top=heap[0], last=heap.pop(); if(heap.length){ heap[0]=last; let k=0; for(;;){ const l=2*k+1, r=l+1; let m=k; if(l<heap.length&&heap[l][0]<heap[m][0]) m=l; if(r<heap.length&&heap[r][0]<heap[m][0]) m=r; if(m===k) break; [heap[m],heap[k]]=[heap[k],heap[m]]; k=m; } } return top; };
  const s0=sy*N+sx; G[s0]=0; push(s0,0); let goal=-1, it=0;
  while(heap.length && it++<5000){
    const [,c]=pop(); if(closed[c]) continue; closed[c]=1;
    const cx=c%N, cy=(c/N)|0;
    if(rectDist(cx+.5,cy+.5,tgt)<=reach){ goal=c; break; }
    for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++){ if(!dx&&!dy) continue;
      const nx=cx+dx, ny=cy+dy; if(nx<0||ny<0||nx>=N||ny>=N) continue; const n=ny*N+nx;
      const occ=g[n]; let cost=dx&&dy?1.414:1;
      if(occ===tgt) continue;
      if(occ){ if(occ.t!=="fence") continue; cost+= 2 + occ.hp/(u.dps+1)*u.spd*.35; }
      if(dx&&dy){ const a=g[cy*N+nx], b=g[ny*N+cx]; if((a&&a.t!=="fence")||(b&&b.t!=="fence")) continue; }
      const ng=G[c]+cost; if(ng<G[n]){ G[n]=ng; from[n]=c; push(n, ng+Math.max(0,Math.hypot(nx+.5-tx,ny+.5-ty)-reach)); }
    }
  }
  if(goal<0) return [[tx,ty]];
  const path=[]; for(let c=goal;c!==s0&&c>=0;c=from[c]) path.push([c%N+.5,((c/N)|0)+.5]); path.reverse(); return path.length?path:[[tx,ty]];
}

// ---------- units ----------
function spawnUnit(kind,x,y){
  let st, m=1, hero=null;
  if(kind.startsWith("hero:")){ hero=kind.slice(5); st=BT.heroStat(hero); }
  else { st=UNITS[kind]; m=unitMul(BT.lvOf(kind)); }
  const b=BT.bonus?BT.bonus(hero?st.pos:UNITS[kind].card):0;
  const tough = !hero && UNITS[kind].card==="ruck" ? 1+b : 1, hit = !hero && UNITS[kind].card!=="ruck" ? 1+b : 1;
  const hp=Math.round(st.hp*m*tough);
  const u={id:++BT.uid,kind:hero?"hero":kind,heroKey:hero,x,y,hp,max:hp,dps:st.dps*m*hit,spd:st.spd,range:st.range,pref:st.pref||"any",ranged:!!st.ranged,air:!!st.air,splash:st.splash||0,
    heal:(st.heal||0)*m, hero:!!hero, pos:st.pos, name:st.name, cd:.3, face:1, rage:0, shield:0, path:null, tgt:null, club:CLUBS[BT.atkClub]};
  BT.units.push(u); return u;
}
function pickTarget(u){
  const alive=BT.buildings.filter(b=>b.hp>0&&!BLD[b.t].trap);
  const by=f=>{ let best=null,bd=1e9; for(const b of alive){ if(!f(b)) continue; const d=rectDist(u.x,u.y,b); if(d<bd){bd=d;best=b;} } return best; };
  let t=null;
  if(u.pref==="defence") t=by(b=>isDef(b.t));
  if(u.pref==="resource") t=by(b=>isRes(b.t));
  if(u.pref==="fence") t=by(b=>b.t==="fence");
  return t||by(b=>b.t!=="fence")||by(()=>true);
}
function hurt(b,dmg){
  if(b.hp<=0) return;
  const done=Math.min(b.hp,dmg); b.hp-=done;
  if(b.loot) for(const r of ["pies","drink"]){ BT.loot[r]+=b.loot[r]*done/b.max; }
  if(b.hp<=0){
    BT.dirty=true; const [x,y]=cen(b);
    if(b.t!=="fence"){ BT.fx.push({k:"boom",x,y,t:0,s:BLD[b.t].size}); shake=Math.max(shake,.25); sfx("boom"); BT.destroyed++; }
    if(b.loot&&(b.loot.pies+b.loot.drink)>0&&BT.mode!=="raid") floatText(x,y,`+${Math.round((b.loot.pies+b.loot.drink)*(BT.lootMul||1))}`);
    for(const u of BT.units) if(u.tgt===b||u.blocker===b){ if(u.tgt===b) u.tgt=null; u.blocker=null; u.path=null; }
  }
}
const healUnit = (u,amt) => { u.hp=Math.min(u.max,u.hp+amt); };
function damageUnit(u,dmg){ if(u.hp<=0) return; if(u.shield>0) dmg*=.5; u.hp-=dmg;
  if(u.hp<=0){ BT.fx.push({k:"poof",x:u.x,y:u.y,t:0,air:u.air}); if(u.hero||(UNITS[u.kind]&&UNITS[u.kind].space>=5)) BT.koBig=(BT.koBig||0)+1; else BT.koSmall=(BT.koSmall||0)+1; } }

function updateUnit(u,dt){
  if(u.hp<=0) return;
  u.cd-=dt; u.rage=Math.max(0,u.rage-dt); u.shield=Math.max(0,u.shield-dt); u.atk=Math.max(0,(u.atk||0)-dt);
  const spd=u.spd*(u.rage>0?1.4:1), mul=u.rage>0?1.6:1;
  if(u.pref==="heal"){
    let best=null,bv=1e9; for(const o of BT.units){ if(o===u||o.hp<=0||o.pref==="heal") continue; const d=Math.hypot(o.x-u.x,o.y-u.y); const v=d-(1-o.hp/o.max)*20; if(v<bv){bv=v;best=o;} }
    if(best){ const d=Math.hypot(best.x-u.x,best.y-u.y); if(d>1.8){ u.x+=(best.x-u.x)/d*spd*dt; u.y+=(best.y-u.y)/d*spd*dt; u.moving=true; u.face=(best.x-u.x)-(best.y-u.y)>=0?1:-1; } else u.moving=false; }
    if(u.cd<=0){ u.cd=.5; let any=false; for(const o of BT.units) if(o.hp>0&&o!==u&&o.hp<o.max&&Math.hypot(o.x-u.x,o.y-u.y)<=3){ healUnit(o,u.heal*.5); any=true; } if(any) BT.fx.push({k:"heal",x:u.x,y:u.y,t:0,r:3}); }
    return;
  }
  if(!u.tgt||u.tgt.hp<=0){ u.tgt=pickTarget(u); u.path=null; u.blocker=null; if(!u.tgt){ u.moving=false; return; } }
  const tgt=u.blocker&&u.blocker.hp>0?u.blocker:u.tgt;
  const [cx,cy]=cen(tgt);
  if(rectDist(u.x,u.y,tgt) <= u.range+.2){
    u.moving=false; u.face=(cx-u.x)-(cy-u.y)>=0?1:-1;
    if(u.cd<=0){ u.cd=1;
      let dmg=u.dps*mul;
      if(u.kind==="tagger"&&isRes(tgt.t)) dmg*=2;
      if(u.kind==="shepherd"){ for(const b of BT.buildings) if(b.hp>0&&!BLD[b.t].trap&&rectDist(u.x,u.y,b)<=1.4) hurt(b,dmg*(b.t==="fence"?40:1)); BT.fx.push({k:"boom",x:u.x,y:u.y,t:0,s:1}); sfx("boom"); u.hp=0; return; }
      u.atk=.25;
      if(u.splash){ u.cd=1.6; BT.proj.push({k:"drop",x0:u.x,y0:u.y,x1:u.x,y1:u.y,z0:2.4,t:0,dur:.35,hit:()=>{ BT.fx.push({k:"boom",x:u.x,y:u.y,t:0,s:1.2}); for(const b of BT.buildings) if(b.hp>0&&!BLD[b.t].trap&&rectDist(u.x,u.y,b)<=u.splash) hurt(b,dmg); }}); }
      else if(u.ranged){ BT.proj.push({k:"footy",x0:u.x,y0:u.y,x1:cx,y1:cy,t:0,dur:.45,hit:()=>hurt(tgt,dmg)}); sfx("kick",.3); }
      else hurt(tgt,dmg);
    }
    return;
  }
  if(u.air){ // fly straight
    const dx=cx-u.x, dy=cy-u.y, d=Math.hypot(dx,dy), st=Math.min(d,spd*dt); u.x+=dx/d*st; u.y+=dy/d*st; u.moving=true; u.face=(dx-dy)>=0?1:-1; return; }
  if(BT.dirty) rebuildGrid();
  if(!u.path||!u.path.length) u.path=findPath(u,u.tgt);
  const [wx,wy]=u.path[0];
  const cell=BT.grid[(wy|0)*N+(wx|0)];
  if(cell&&cell.t==="fence"&&cell!==u.tgt&&cell.hp>0){ u.blocker=cell; return; }
  const dx=wx-u.x, dy=wy-u.y, d=Math.hypot(dx,dy);
  if(d<.15) u.path.shift();
  else { const st=Math.min(d,spd*dt); u.x+=dx/d*st; u.y+=dy/d*st; u.moving=true; u.face=(dx-dy)>=0?1:-1; }
}

// ---------- defences ----------
function updateDefence(b,dt){
  const d=BLD[b.t]; if(!d.def||b.hp<=0) return;
  b.cd-=dt; b.recoil=Math.max(0,(b.recoil||0)-dt*3); b.stun=Math.max(0,(b.stun||0)-dt);
  if(b.stun>0) return;
  const [cx,cy]=cen(b), dist=u=>Math.hypot(u.x-cx,u.y-cy)-d.size*.35;
  const ok=u=>u&&u.hp>0&&(u.air?d.air:d.ground)&&dist(u)<=d.range&&dist(u)>=(d.minr||0);
  if(!ok(b.tgt)){ b.tgt=null; let bd=1e9; for(const u of BT.units){ if(!ok(u)) continue; const dd=dist(u); if(dd<bd){bd=dd;b.tgt=u;} } }
  const t=b.tgt; if(!t) return;
  const p0=P(cx,cy), p1=P(t.x,t.y,t.air?2.4:0); b.ang=Math.atan2(p1[1]-p0[1],p1[0]-p0[0]);
  if(b.cd>0) return;
  b.cd=d.rate; b.recoil=1;
  const dmg=d.dps[b.lv-1]*d.rate;
  if(d.splash){ const tx=t.x, ty=t.y; sfx("kick",.5); BT.proj.push({k:"bomb",x0:cx,y0:cy,x1:tx,y1:ty,t:0,dur:1.3,arc:5,hit:()=>{ BT.fx.push({k:"splash",x:tx,y:ty,t:0,r:d.splash}); for(const u of BT.units) if(u.hp>0&&!u.air&&Math.hypot(u.x-tx,u.y-ty)<=d.splash) damageUnit(u,dmg); }}); }
  else if(d.shot==="beam"){ BT.fx.push({k:"beam",x0:cx,y0:cy,x1:t.x,y1:t.y,t:0}); damageUnit(t,dmg); }
  else { BT.proj.push({k:d.shot,x0:cx,y0:cy,x1:t.x,y1:t.y,z1:t.air?2.4:0,t:0,dur:d.shot==="siren"?.25:.45,arc:d.shot==="footy"?2:.3,tu:t,hit:()=>damageUnit(t,dmg)}); if(d.shot==="siren") sfx("siren",.25); else sfx("kick",.25); }
}
function updateTrap(b,dt){
  if(!b.armed) return;
  if(b.fuse!==undefined){ b.fuse-=dt; if(b.fuse<=0){ b.armed=false; b.hp=0; const x=b.x+.5,y=b.y+.5,r=1.6; BT.fx.push({k:"splash",x,y,t:0,r}); sfx("splash"); for(const u of BT.units) if(u.hp>0&&!u.air&&Math.hypot(u.x-x,u.y-y)<=r) damageUnit(u,BLD.sprinkler.dmg[b.lv-1]); } return; }
  for(const u of BT.units) if(u.hp>0&&!u.air&&Math.hypot(u.x-b.x-.5,u.y-b.y-.5)<.9){ b.sprung=true; b.fuse=.4; break; }
}

// ---------- spells & hero abilities ----------
function castSpell(sp,x,y){
  const s=SPELLS[sp]; sfx(sp==="freekick"?"whistle":"cheer");
  if(sp==="freekick"){ for(let i=0;i<3;i++) BT.zones.push({k:"strike",x,y,t:-i*.35,dmg:s.dmg,r:s.radius,done:false}); }
  else if(sp==="sub"){ for(let i=0;i<6;i++) spawnUnit("rover",x+(i%3-1)*.6,y+(i<3?-.4:.4)); BT.fx.push({k:"heal",x,y,t:0,r:1.5}); }
  else BT.zones.push({k:sp,x,y,r:s.radius,t:0,dur:s.dur});
}
function updateZones(dt){
  for(const z of BT.zones){ z.t+=dt;
    if(z.k==="strike"){ if(z.t>=0&&!z.done){ z.done=true; BT.fx.push({k:"bolt",x:z.x,y:z.y,t:0}); shake=.2; sfx("boom"); for(const b of BT.buildings) if(b.hp>0&&!BLD[b.t].trap&&rectDist(z.x,z.y,b)<=z.r) hurt(b,z.dmg); } continue; }
    if(z.k==="rain"){ for(const b of BT.buildings) if(b.hp>0&&isDef(b.t)&&rectDist(z.x,z.y,b)<=z.r) b.stun=.3; continue; }
    for(const u of BT.units){ if(u.hp<=0||Math.hypot(u.x-z.x,u.y-z.y)>z.r) continue;
      if(z.k==="oranges") healUnit(u,110*dt);
      if(z.k==="roar") u.rage=Math.max(u.rage,.3); }
  }
  BT.zones=BT.zones.filter(z=>z.k==="strike"?z.t<.6:z.t<z.dur);
}
function useAbility(h){
  const u=BT.heroU[h]; if(!u||u.hp<=0||BT.abilityUsed[h]) return;
  BT.abilityUsed[h]=true; const st=BT.heroStat(h), lvm=1+.1*(st.lv-1);
  floatText(u.x,u.y,st.ability+"!","#fff"); sfx("cheer");
  if(u.pos==="mid"){ healUnit(u,u.max*.25); u.rage=8; }
  if(u.pos==="def"){ healUnit(u,u.max*.5); u.shield=8; }
  if(u.pos==="ruck"){ healUnit(u,u.max*.3); BT.fx.push({k:"splash",x:u.x,y:u.y,t:0,r:2.8}); shake=.3; for(const b of BT.buildings) if(b.hp>0&&!BLD[b.t].trap&&rectDist(u.x,u.y,b)<=2.8) hurt(b,260*lvm); }
  if(u.pos==="fwd"){ const ts=BT.buildings.filter(b=>b.hp>0&&counts(b)).sort((a,b)=>rectDist(u.x,u.y,a)-rectDist(u.x,u.y,b)).slice(0,3);
    ts.forEach((b,i)=>{ const [x,y]=cen(b); BT.proj.push({k:"bigfooty",x0:u.x,y0:u.y,x1:x,y1:y,t:-i*.25,dur:.7,arc:3,hit:()=>{ hurt(b,320*lvm); BT.fx.push({k:"boom",x,y,t:0,s:1.5}); }}); }); }
  if(u.pos==="coach"){ BT.fx.push({k:"heal",x:u.x,y:u.y,t:0,r:5}); for(const o of BT.units) if(o.hp>0&&Math.hypot(o.x-u.x,o.y-u.y)<=5){ healUnit(o,o.max*.4); o.rage=Math.max(o.rage,5); } }
  uiDirty=true;
}

// ---------- deploy ----------
function canDeployAt(x,y){ if(x<0||y<0||x>=N||y>=N) return true; if(BT.dirty) rebuildGrid(); return !BT.noDeploy[(y|0)*N+(x|0)]; }
function deployAt(k,v,x,y){ // returns true if something was placed
  if(k==="spell"){ if(!(BT.spellsLeft[v]>0)) return false; BT.spellsLeft[v]--; castSpell(v,x,y); BT.started=true; return true; }
  if(!canDeployAt(x,y)){ BT.mask=1.5; return false; }
  if(k==="unit"){ if(!(BT.left[v]>0)) return false; BT.left[v]--; spawnUnit(v,x,y); }
  if(k==="hero"){ if(!BT.heroesLeft[v]) return false; BT.heroesLeft[v]=false; BT.heroU[v]=spawnUnit("hero:"+v,x,y); sfx("cheer"); }
  BT.started=true; return true;
}
function battleTap(x,y){
  if(!BT||BT.over||!BT.sel||BT.mode!=="attack") return;
  if(x<-1.5||y<-1.5||x>N+1.5||y>N+1.5) return;
  const {k,v}=BT.sel;
  if(deployAt(k,v,x,y)){ if(k==="unit") sfx("tap",.2); autoSel(); uiDirty=true; tut("deploy"); }
}
function autoSel(){ const s=BT.sel; const has = s&&(s.k==="unit"?BT.left[s.v]>0:s.k==="spell"?BT.spellsLeft[s.v]>0:BT.heroesLeft[s.v]); if(!has){ BT.sel=firstSel(); uiDirty=true; } }

// ---------- loop ----------
let shake=0;
function pct(){ const c=BT.buildings.filter(counts); return 100*c.filter(b=>b.hp<=0).length/c.length; }
// Footy scoring. Away team: a goal for every building knocked down, a behind for every one smashed past half.
// Home team: a behind for every building still standing, a behind for each player knocked out (goal for big players and heroes).
function scoreNow(){
  let ag=0, ab=0, hb=0;
  for(const b of BT.buildings){ if(!counts(b)) continue; if(b.hp<=0) ag++; else if(b.hp<=b.max*.5) ab++; else hb++; }
  const hg=BT.koBig||0; hb+=BT.koSmall||0;
  return {a:{g:ag,b:ab,p:ag*6+ab}, h:{g:hg,b:hb,p:hg*6+hb}};
}
// ★ = win, ★★ = win + Clubhouse down, ★★★ = whole ground flattened
function starsNow(){ const sc=scoreNow(); if(sc.a.p<=sc.h.p) return 0; const ch=BT.buildings.find(b=>b.t==="clubhouse"); return 1+(ch&&ch.hp<=0?1:0)+(pct()>=100?1:0); }
function battleStep(dt){
  shake=Math.max(0,shake-dt); BT.mask=Math.max(0,BT.mask-dt);
  if(BT.dirty) rebuildGrid();
  if(BT.started){ BT.time-=dt; BT.elapsed+=dt; }
  if(BT.plan) while(BT.plan.length && BT.plan[0].t<=BT.elapsed){ const p=BT.plan.shift(); deployAt(p.k,p.v,p.x,p.y); if(p.k==="hero"&&p.ability) BT.abilityAt={h:p.v,t:BT.elapsed+p.ability}; }
  if(BT.abilityAt&&BT.elapsed>=BT.abilityAt.t){ useAbility(BT.abilityAt.h); BT.abilityAt=null; }
  for(const u of BT.units) updateUnit(u,dt);
  for(const b of BT.buildings){ if(BLD[b.t].trap) updateTrap(b,dt); else updateDefence(b,dt); }
  updateZones(dt);
  for(const p of BT.proj){ p.t+=dt/p.dur; if(p.tu&&p.tu.hp>0){ p.x1=p.tu.x; p.y1=p.tu.y; } if(p.t>=1&&!p.done){ p.done=true; p.hit(); } }
  BT.proj=BT.proj.filter(p=>!p.done);
  for(const f of BT.fx) f.t+=dt; BT.fx=BT.fx.filter(f=>f.t<.8);
  BT.units=BT.units.filter(u=>u.hp>0||u.hero);
  const alive=BT.units.some(u=>u.hp>0&&u.pref!=="heal");
  const toDeploy=Object.values(BT.left).some(n=>n>0)||Object.values(BT.heroesLeft).some(Boolean)||(BT.plan&&BT.plan.length);
  if(BT.time<=0 || pct()>=100 || (BT.started&&!alive&&!toDeploy&&!BT.proj.length)) return true;
  return false;
}
function battleUpdate(dt){
  if(!BT||BT.over) return;
  const speed=BT.mode==="replay"?(BT.speed||1):1;
  for(let i=0;i<speed;i++) if(battleStep(dt)){ endBattle(); break; }
}
function endBattle(){
  if(BT.over) return; BT.over=true;
  const stars=starsNow(), p=Math.round(pct());
  if(BT.mode==="replay"){ showReplayEnd(); return; }
  const mul=BT.lootMul||1;
  const got={pies:addRes("pies",Math.floor(BT.loot.pies*mul)), drink:addRes("drink",Math.floor(BT.loot.drink*mul))};
  let tro = stars ? Math.round((8+stars*6)*(BT.d>=th()?1.2:.8)) : -10;
  S.trophies=Math.max(0,S.trophies+tro);
  let medals=0, pack=null;
  const sc=scoreNow(); let season=null;
  if(BT.kind==="season"){ season=seasonResult({g:sc.a.g,b:sc.a.b},{g:sc.h.g,b:sc.h.b}); if(season.res==="W"){ medals=10; S.medals+=medals; } }
  if(stars>0){ track("win",1); pack=stars>=3?"gold":stars===2?"silver":"bronze"; if(BT.kind==="match"&&stars<3&&Math.random()<.5) pack=null; if(pack) S.packs[pack]=(S.packs[pack]||0)+1; }
  track("destroy",BT.destroyed);
  if(BT.revenge){ const r=S.raids.find(x=>x.id===BT.revenge); if(r) r.revenged=true; }
  S.army=Object.fromEntries(Object.entries(BT.left).filter(([,n])=>n>0));
  S.spells=Object.fromEntries(Object.entries(BT.spellsLeft).filter(([,n])=>n>0));
  S.shield=0; // attacking breaks your shield
  save(); sfx(stars?"cheer":"siren");
  setTimeout(()=>tut("battleEnd"),50);
  showResult({stars,p,got,tro,medals,pack,sc,season,fixture:BT.fixture,home:CLUBS[BT.club],away:CLUBS[BT.atkClub],club:CLUBS[BT.club].name, full:(got.pies<Math.floor(BT.loot.pies*mul)||got.drink<Math.floor(BT.loot.drink*mul))});
}
function leaveBattle(){ BT=null; mode="home"; cam.x=0; cam.y=0; setZoom(1); refreshUI(); }

// ---------- drawing ----------
function renderBattle(){
  const sx=shake>0?(Math.random()-.5)*shake*30:0, sy=shake>0?(Math.random()-.5)*shake*30:0;
  ctx.save(); ctx.translate(sx,sy);
  drawGround();
  const club=CLUBS[BT.club];
  if(BT.mode==="attack"&&(BT.mask>0||!BT.started)){ if(BT.dirty) rebuildGrid(); ctx.save(); ctx.globalAlpha=Math.min(.35,BT.started?BT.mask*.3:.22);
    for(let j=0;j<N;j++) for(let i=0;i<N;i++) if(BT.noDeploy[j*N+i]) diamond(i,j,1,1,"#e8503a"); ctx.restore(); }
  for(const z of BT.zones){ if(z.k==="strike") continue; const [x,y]=P(z.x,z.y), col=z.k==="oranges"?"#ffa53a":z.k==="rain"?"#4fa3ff":"#ff3b9a";
    ctx.save(); ctx.globalAlpha=.25+.1*Math.sin(performance.now()/120); ctx.beginPath(); ctx.ellipse(x,y,z.r*TW*.72,z.r*TH*.72,0,0,7); ctx.fillStyle=col; ctx.fill(); ctx.globalAlpha=.8; ctx.strokeStyle=col; ctx.lineWidth=3; ctx.stroke(); ctx.restore();
    if(z.k==="rain") rainDrops(z); }
  const ents=[];
  for(const t of deco) ents.push({k:t.x+t.y,f:()=>drawDeco(t)});
  for(const b of BT.buildings) ents.push({k:b.x+b.y+BLD[b.t].size,f:()=>drawBuilding(b,club,BT.buildings,{hideTraps:BT.mode==="attack",fill:.6,heroes:BT.homeHeroes||{captain:club}})});
  for(const u of BT.units) if(u.hp>0) ents.push({k:u.x+u.y+(u.air?40:0),f:()=>drawUnitB(u)});
  ents.sort((a,b)=>a.k-b.k).forEach(e=>e.f());
  for(const p of BT.proj){ if(p.t<0) continue; const x=p.x0+(p.x1-p.x0)*p.t, y=p.y0+(p.y1-p.y0)*p.t;
    const z=p.k==="drop"?(p.z0*(1-p.t)):(1.2+Math.sin(p.t*Math.PI)*(p.arc||1))+(p.z1||0)*p.t, [px,py]=P(x,y,z);
    if(p.k==="siren"){ ctx.strokeStyle="#ff5a3c"; ctx.lineWidth=3; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(px,py,TW*(.08+i*.08),0,7); ctx.stroke(); } }
    else if(p.k==="bomb"||p.k==="drop") footy(px,py,TW*.28,p.t*12);
    else if(p.k==="bigfooty") footy(px,py,TW*.3,p.t*14);
    else footy(px,py,TW*.15,p.t*9); }
  for(const f of BT.fx){ const a=1-f.t/.8;
    ctx.save(); ctx.globalAlpha=Math.max(0,a);
    if(f.k==="beam"){ const [x0,y0]=P(f.x0,f.y0,3.6), [x1,y1]=P(f.x1,f.y1,2.4); const g=ctx.createLinearGradient(x0,y0,x1,y1); g.addColorStop(0,"#ffffffee"); g.addColorStop(1,"#fff7a000"); ctx.strokeStyle=g; ctx.lineWidth=TW*.35*(1-f.t); ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke(); ctx.restore(); continue; }
    const [x,y]=P(f.x,f.y,f.air?2.4:0);
    if(f.k==="boom"){ const r=TW*(.4+f.t*1.2)*(f.s||1)*.6; ctx.fillStyle="#ffb547"; ctx.beginPath(); ctx.arc(x,y-TH,r,0,7); ctx.fill(); ctx.fillStyle="#fff3c4"; ctx.beginPath(); ctx.arc(x,y-TH,r*.5,0,7); ctx.fill(); ctx.fillStyle="#8a7f72"; for(let i=0;i<5;i++){ const an=i*1.3; ctx.beginPath(); ctx.arc(x+Math.cos(an)*r*1.1,y-TH-Math.sin(an)*r*.8-f.t*TH*2,r*.3,0,7); ctx.fill(); } }
    if(f.k==="splash"){ ctx.strokeStyle="#4fc3f7"; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(x,y,f.r*TW*.72*(.3+f.t),f.r*TH*.72*(.3+f.t),0,0,7); ctx.stroke(); ctx.fillStyle="#b3e5fc"; for(let i=0;i<8;i++){ const an=i/8*7; ctx.beginPath(); ctx.arc(x+Math.cos(an)*f.r*TW*.5*f.t*1.4,y+Math.sin(an)*f.r*TH*.5*f.t*1.4-TH*f.t*2,TW*.06,0,7); ctx.fill(); } }
    if(f.k==="heal"){ ctx.strokeStyle="#7CFC00"; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(x,y,f.r*TW*.72*f.t,f.r*TH*.72*f.t,0,0,7); ctx.stroke(); }
    if(f.k==="poof"){ ctx.fillStyle="#ddd"; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(x+(i-1.5)*TW*.15,y-TH*(.5+f.t*2),TW*.15*(1-f.t),0,7); ctx.fill(); } }
    if(f.k==="bolt"){ ctx.strokeStyle="#fff59d"; ctx.lineWidth=TW*.12; ctx.beginPath(); let yy=y-H, xx=x; ctx.moveTo(xx,yy); while(yy<y){ yy+=TH*1.5; xx=x+(Math.random()-.5)*TW*.8; ctx.lineTo(xx,Math.min(y,yy)); } ctx.stroke(); ctx.strokeStyle="#fff"; ctx.lineWidth=TW*.05; ctx.stroke(); ctx.fillStyle="#fff59d"; ctx.beginPath(); ctx.ellipse(x,y,TW*.8,TH*.8,0,0,7); ctx.fill(); }
    ctx.restore(); }
  drawFloaters();
  ctx.restore();
}
function rainDrops(z){ ctx.save(); ctx.strokeStyle="#9fd3ff"; ctx.lineWidth=1.5; const t=performance.now()/200; for(let i=0;i<24;i++){ const a=i*2.4, r=z.r*((i*37%10)/10); const [x,y]=P(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r,3-((t+i*.3)%1)*3); ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-3,y+TH*.4); ctx.stroke(); } ctx.restore(); }
function drawUnitB(u){
  if(u.air) return drawFlyer(u);
  const [x,y]=P(u.x,u.y);
  const k = TW*(u.hero?.5:u.kind==="ruck"?.42:u.kind==="trainer"?.4:u.kind==="tagger"?.3:.33);
  drawPlayer(x,y,k,u.club,{id:u.id,moving:u.moving,face:u.face,atk:u.atk>0,kind:u.pos==="coach"?"coach":u.kind,hero:u.hero,ranged:u.ranged,rage:u.rage>0});
  if(u.shield>0){ ctx.save(); ctx.globalAlpha=.3; ctx.fillStyle="#7fd3ff"; ctx.beginPath(); ctx.ellipse(x,y-k*1.4,k*1.1,k*1.8,0,0,7); ctx.fill(); ctx.restore(); }
  if(u.hp<u.max||u.hero) bar(x,y-k*(u.hero?4:3.5),u.hp/u.max,u.hero?GOLD:"#5fd16b",u.hero?TW*1.3:TW*.8);
  if(u.hero) txt(u.name.split(" ").pop(),x,y-k*4.5,TH*.55,GOLD);
}
function drawFlyer(u){
  const [gx,gy]=P(u.x,u.y), [x,y]=P(u.x,u.y,2.4+Math.sin(performance.now()/300+u.id)*.15);
  ctx.save(); ctx.globalAlpha=.25; ctx.fillStyle="#000"; ctx.beginPath(); ctx.ellipse(gx,gy,TW*.35,TH*.25,0,0,7); ctx.fill(); ctx.restore();
  if(u.kind==="seagulls") seagullFlock(x,y,u);
  else blimp(x,y,u);
  if(u.hp<u.max) bar(x,y-TW*.7,u.hp/u.max,"#5fd16b",TW*.8);
}

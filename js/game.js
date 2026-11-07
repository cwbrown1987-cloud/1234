// ---------- Home base: state, economy, building, training, cards, tasks ----------
const SAVE_KEY = "footyFortress2";
let S = null;
let mode = "home";        // home | battle
let selected = null;
let placing = null;       // {t,x,y, moving:b}
let floaters = [];

// New clubs start like a new Clash village: just the Clubhouse, one groundskeeper and a few obstacles.
// Everything else gets built in the walkthrough (or by the player if they skip it).
function newGame(club){
  const c=C0-2;
  const B=(t,x,y)=>({id:0,t,x,y,lv:1,busy:null,store:0});
  const s={v:3, club, pies:1000, drink:1000, medals:250, trophies:0, nextId:100,
    buildings:[B("clubhouse",c,c),B("shed",c+6,c-3)],
    obstacles:[], army:{}, queue:[], trainAt:Date.now(), spells:{}, squeue:[], spellAt:Date.now(),
    unitLv:{}, research:null, heroes:{captain:{lv:1,busy:null},coach:{lv:1,busy:null}},
    season:null, cards:{}, team:[], packs:{}, daily:null, raids:[], nextRaid:Date.now()+20*60000, shield:0,
    sound:true, last:Date.now()};
  s.buildings.forEach(b=>b.id=s.nextId++);
  const r=rng(club*99+7);
  for(let n=0;n<26;n++){ const x=1+(r()*(N-2)|0), y=1+(r()*(N-2)|0), k=r()<.55?"tree":r()<.6?"bush":"rock"; s.obstacles.push({id:s.nextId++,x,y,k}); }
  S=fixup(s); S.obstacles=S.obstacles.filter(o=>!occupiedHome(o.x-1,o.y-1,3,o)&&Math.max(Math.abs(o.x-C0),Math.abs(o.y-C0))>4);
  save();
}
// Fill in anything missing (older saves) so every field exists.
function fixup(s){
  if(s.v===2){ // map grew from 30 to 34: shift everything to stay centred
    for(const b of s.buildings){ b.x+=2; b.y+=2; } for(const o of s.obstacles){ o.x+=2; o.y+=2; }
    s.heroes={captain:s.hero||{lv:1,busy:null},coach:{lv:1,busy:null}}; delete s.hero; s.v=3;
  }
  s.unitLv=s.unitLv||{}; for(const k of Object.keys(UNITS)) s.unitLv[k]=s.unitLv[k]||1;
  s.heroes=s.heroes||{}; for(const h of Object.keys(HEROES)) s.heroes[h]=s.heroes[h]||{lv:1,busy:null};
  if(!s.season||Array.isArray(s.season)) s.season=newSeason(1); s.premierships=s.premierships||0;
  s.cards=s.cards||{}; s.team=s.team||[]; s.packs=s.packs||{}; s.raids=s.raids||[];
  s.nextRaid=s.nextRaid||Date.now()+8*60000; s.shield=s.shield||0; if(s.sound===undefined) s.sound=true;
  return s;
}
function save(){ if(!S) return; S.last=Date.now(); try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} if(typeof scheduleSync==="function") scheduleSync(); }
function load(){ try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)); return s&&(s.v===2||s.v===3)?fixup(s):null; }catch(e){ return null; } }

const myClub = () => CLUBS[S.club];
const th = () => S.buildings.find(b=>b.t==="clubhouse").lv;
const built = b => !(b.busy && b.busy.kind==="build");
const countOf = t => S.buildings.filter(b=>b.t===t).length;
const sheds = () => S.buildings.filter(b=>b.t==="shed").length;
const busyBuilders = () => S.buildings.filter(b=>b.busy&&b.busy.total>0).length + Object.values(S.heroes).filter(h=>h.busy).length;
const freeBuilder = () => busyBuilders() < sheds();
function capOf(res){
  let c=0; for(const b of S.buildings){ if(!built(b)) continue;
    if(b.t==="clubhouse") c+=BLD.clubhouse.store[b.lv-1];
    if(BLD[b.t].stores===res) c+=BLD[b.t].cap[b.lv-1]; }
  return c;
}
function addRes(res,amt){ if(res==="medals"){ S.medals+=amt; return amt; } const room=Math.max(0,capOf(res)-S[res]); const got=Math.min(room,Math.max(0,amt)); S[res]+=got; return got; }
const canPay = (res,amt) => (res==="medals"?S.medals:S[res])>=amt;
function pay(res,amt){ if(!canPay(res,amt)) return false; S[res]-=amt; return true; }
const resIcon = r => r==="pies"?"🥧":r==="drink"?"💧":"🏅";

function footprintFree(x,y,s,ignore){ if(x<0||y<0||x+s>N||y+s>N) return false; return !occupiedHome(x,y,s,ignore); }
function occupiedHome(x,y,s,ignore){
  for(const b of S.buildings){ if(b===ignore) continue; const bs=BLD[b.t].size; if(x<b.x+bs&&x+s>b.x&&y<b.y+bs&&y+s>b.y) return true; }
  for(const o of S.obstacles){ if(o===ignore) continue; if(x<o.x+1&&x+s>o.x&&y<o.y+1&&y+s>o.y) return true; }
  return false;
}
function findSpot(s){ const c=N/2-s/2|0; for(let r=0;r<N;r++) for(let dx=-r;dx<=r;dx++) for(let dy=-r;dy<=r;dy++){ if(Math.max(Math.abs(dx),Math.abs(dy))!==r) continue; if(footprintFree(c+dx,c+dy,s)) return [c+dx,c+dy]; } return null; }

// ---------- shop / build / upgrade ----------
// Your first Pie Shop and Drink Tap are free, so spending everything can never leave you with no income.
const FREE_FIRST = ["pieshop","drinktap"];
const buildCost = t => t==="shed" ? SHED_COST[Math.min(4,sheds())] : FREE_FIRST.includes(t)&&countOf(t)===0 ? 0 : BLD[t].cost[0];
const missingIncome = () => S ? FREE_FIRST.filter(t=>countOf(t)===0) : [];
function shopStatus(t){
  const lim=MAXC[t][th()-1], have=countOf(t);
  if(have>=lim){ const next=MAXC[t].findIndex(v=>v>have); return {ok:false, why: next<0?"Max built":`Clubhouse ${next+1}`, have, lim}; }
  const cost=buildCost(t), res=BLD[t].res;
  return {ok:true, cost, res, have, lim, afford:canPay(res,cost)};
}
function startPlacing(t){
  const st=shopStatus(t); if(!st.ok) return toast(st.why);
  if(!st.afford) return toast(`Not enough ${resIcon(st.res)}`);
  const s=BLD[t].size; const spot=findSpot(s); if(!spot) return toast("No room left!");
  placing={t,x:spot[0],y:spot[1]}; selected=null; centreOn(spot[0]+s/2,spot[1]+s/2); refreshUI(); tut("placing");
}
function confirmPlace(){
  if(!placing) return;
  const {t,x,y}=placing, d=BLD[t];
  if(!footprintFree(x,y,d.size)) return toast("Can't build there");
  const cost=buildCost(t), time=d.time[0];
  if(time>0 && !freeBuilder()) return toast("All groundskeepers are busy");
  if(!pay(d.res,cost)) return toast(`Not enough ${resIcon(d.res)}`);
  S.buildings.push({id:S.nextId++,t,x,y,lv:1,store:0,busy:time>0?{kind:"build",end:Date.now()+time*1000,total:time}:null});
  sfx("build"); save(); tut("placed");
  if(t==="fence"){
    const st=shopStatus("fence"), nx=[[x+1,y],[x,y+1],[x-1,y],[x,y-1]].find(([a,c])=>footprintFree(a,c,1));
    placing = st.ok&&st.afford&&nx ? {t,x:nx[0],y:nx[1]} : null;
  } else placing=null;
  refreshUI();
}
function upgradeInfo(b){
  const d=BLD[b.t], mx=maxLevel(b.t,th());
  if(b.lv>=levels(b.t)) return {ok:false, why:"Max level"};
  if(b.lv>=mx){ let need=1; while(need<=MAX_TH&&maxLevel(b.t,need)<=b.lv) need++; return {ok:false, why:`Needs Clubhouse ${need}`}; }
  return {ok:true, cost:d.cost[b.lv], res:d.res, time:d.time[b.lv]};
}
function startUpgrade(b){
  const u=upgradeInfo(b); if(!u.ok) return toast(u.why);
  if(u.time>0 && !freeBuilder()) return toast("All groundskeepers are busy");
  if(!pay(u.res,u.cost)) return toast(`Not enough ${resIcon(u.res)}`);
  if(u.time>0) b.busy={kind:"up",end:Date.now()+u.time*1000,total:u.time}; else b.lv++;
  track("upgrade",1); sfx("build"); save(); refreshUI();
}
// Speed-ups are pricey, like Clash gems: about 2 votes a minute, more for long jobs
const speedCost = endMs => { const m=(endMs-Date.now())/60000; return Math.max(2, Math.ceil(2*m+Math.pow(Math.max(0,m),1.15)*.25)); };
function speedUp(b){ const c=speedCost(b.busy.end); if(!pay("medals",c)) return toast("Not enough Brownlow votes 🏅"); b.busy.end=Date.now(); processTimers(); refreshUI(); }
function removeObstacle(o){
  if(!pay("pies",100)) return toast("Clearing costs 100 🥧");
  S.obstacles=S.obstacles.filter(x=>x!==o); const m=Math.random()<.4?0:1+(Math.random()<.2?1:0); S.medals+=m;
  if(m) floatText(o.x+.5,o.y+.5,`+${m} 🏅`); sfx("collect"); selected=null; save(); refreshUI();
}
function collect(b){
  const d=BLD[b.t]; const n=Math.floor(b.store); if(n<1) return;
  const got=addRes(d.makes,n); b.store-=got;
  if(got<n) toast(`${d.makes==="pies"?"Pie Warmers":"Eskies"} are full!`);
  if(got){ floatText(b.x+d.size/2,b.y+d.size/2,`+${got}`); track(d.makes,got); sfx("collect"); tut("collect-"+d.makes); }
  save(); refreshUI();
}

// ---------- squad ----------
function armySpace(){ return S.buildings.filter(b=>b.t==="bench"&&built(b)).reduce((a,b)=>a+BLD.bench.space[b.lv-1],0); }
const spaceOf = obj => Object.entries(obj).reduce((a,[u,n])=>a+(UNITS[u]?UNITS[u].space*n:0),0);
const usedSpace = () => spaceOf(S.army);
const queuedSpace = () => S.queue.reduce((a,u)=>a+UNITS[u].space,0);
function unlockedUnits(){ const best=Math.max(0,...S.buildings.filter(b=>b.t==="oval"&&built(b)).map(b=>b.lv)); return BLD.oval.unlock.slice(0,best); }
const unitCost = u => Math.round(UNITS[u].cost*unitMul(S.unitLv[u]));
function trainUnit(u){
  if(usedSpace()+queuedSpace()+UNITS[u].space>armySpace()) return toast("Bench is full! Build or upgrade a bench.");
  if(!pay("drink",unitCost(u))) return toast("Not enough 💧");
  if(!S.queue.length) S.trainAt=Date.now(); S.queue.push(u); sfx("tap",.3); save(); refreshUI(); tut("train");
}
function untrain(i){ const u=S.queue.splice(i,1)[0]; S.drink+=unitCost(u); if(i===0) S.trainAt=Date.now(); save(); refreshUI(); }
const trainSpeed = () => Math.max(1,S.buildings.filter(b=>b.t==="oval"&&built(b)).length)*((eventNow()&&eventNow().train)||1);
function trainTick(now){
  if(!S.queue.length){ S.trainAt=now; return; }
  const speed=trainSpeed(); let g=0;
  while(S.queue.length && g++<1000){
    const u=S.queue[0], need=UNITS[u].time*1000/speed;
    if(now-S.trainAt<need) break;
    if(usedSpace()+UNITS[u].space>armySpace()){ S.trainAt=now; break; }
    S.army[u]=(S.army[u]||0)+1; S.queue.shift(); S.trainAt+=need; track("train",1); uiDirty=true;
  }
}
const physio = () => S.buildings.find(b=>b.t==="physio"&&built(b));
const spellSlots = () => physio()?BLD.physio.slots[physio().lv-1]:0;
const unlockedSpells = () => physio()?BLD.physio.unlock.slice(0,physio().lv):[];
const spellCount = () => Object.values(S.spells).reduce((a,b)=>a+b,0);
function brewSpell(sp){
  if(spellCount()+S.squeue.length>=spellSlots()) return toast("Physio Room is full");
  if(!pay("drink",SPELLS[sp].cost)) return toast("Not enough 💧");
  if(!S.squeue.length) S.spellAt=Date.now(); S.squeue.push(sp); save(); refreshUI();
}
function spellTick(now){
  if(!S.squeue.length){ S.spellAt=now; return; }
  let g=0; while(S.squeue.length&&g++<50){ const sp=S.squeue[0], need=SPELLS[sp].time*1000; if(now-S.spellAt<need) break;
    S.spells[sp]=(S.spells[sp]||0)+1; S.squeue.shift(); S.spellAt+=need; uiDirty=true; }
}
const coachBox = () => S.buildings.find(b=>b.t==="coachbox"&&built(b));
function researchInfo(u){
  const lv=S.unitLv[u], cb=coachBox();
  if(!cb) return {ok:false, why:"Build a Coaches Box"};
  if(lv>=UNIT_MAX) return {ok:false, why:"Max"};
  if(lv>cb.lv) return {ok:false, why:`Coaches Box ${lv}`};
  return {ok:true, cost:Math.round(RESEARCH_COST[lv]*(UNITS[u].space>4?2:1)), time:RESEARCH_TIME[lv]};
}
function startResearch(u){
  if(S.research) return toast("Already researching");
  const r=researchInfo(u); if(!r.ok) return toast(r.why);
  if(!pay("drink",r.cost)) return toast("Not enough 💧");
  S.research={u,end:Date.now()+r.time*1000,total:r.time}; save(); refreshUI();
}

// ---------- heroes ----------
const heroHome = h => S.buildings.some(b=>b.t===HEROES[h].building&&built(b));
const heroReady = h => heroHome(h)&&!S.heroes[h].busy;
function heroStats(h="captain", club=myClub(), lv=S.heroes[h].lv){
  const H=HEROES[h], pos=H.pos(club), p=HERO_POS[pos], m=1+.1*(lv-1);
  return {...p, hp:Math.round(p.hp*m), dps:Math.round(p.dps*m), name:H.name(club), pos, lv};
}
function upgradeHero(h){
  const hs=S.heroes[h]; if(hs.busy) return;
  if(hs.lv>=heroMax(th(),h)) return toast(`Needs Clubhouse ${th()+1}`);
  if(!freeBuilder()) return toast("All groundskeepers are busy");
  if(!pay("drink",heroCost(hs.lv))) return toast("Not enough 💧");
  const t=heroTime(hs.lv); hs.busy={end:Date.now()+t*1000,total:t}; track("upgrade",1); save(); refreshUI();
}

// ---------- cards ----------
const cardById = id => CARDS.find(c=>c.id===id);
function cardLevel(id){ const n=S.cards[id]||0; if(!n) return 0; let lv=1, need=0; for(const c of CARD_COPIES){ need+=c; if(n>=need+1) lv++; else break; } return Math.min(lv,CARD_COPIES.length+1); }
function cardProgress(id){ const n=S.cards[id]||0, lv=cardLevel(id); let used=1; for(let i=0;i<lv-1;i++) used+=CARD_COPIES[i]; const next=CARD_COPIES[lv-1]; return {have:n-used, need:next||0}; }
const cardPower = id => { const c=cardById(id); return RARITY[c.rarity].bonus*(1+.5*(cardLevel(id)-1)); };
function cardBonus(pos){ return S.team.filter(id=>cardById(id).pos===pos).reduce((a,id)=>a+cardPower(id),0); }
function rollCard(minR, rnd=Math.random){
  const order=["common","rare","epic","legend"], pool=order.slice(order.indexOf(minR));
  const tot=pool.reduce((a,r)=>a+RARITY[r].w,0); let x=rnd()*tot, rar=pool[0];
  for(const r of pool){ x-=RARITY[r].w; if(x<=0){ rar=r; break; } }
  const cs=CARDS.filter(c=>c.rarity===rar); return cs[rnd()*cs.length|0];
}
function openPack(k){
  if(!(S.packs[k]>0)) return null;
  S.packs[k]--; const P=PACKS[k], out=[];
  for(let i=0;i<P.n;i++) out.push(rollCard(i===P.n-1&&P.guarantee?P.guarantee:P.min));
  out.forEach(c=>S.cards[c.id]=(S.cards[c.id]||0)+1);
  track("pack",1); save(); return out;
}
function toggleTeam(id){
  const i=S.team.indexOf(id);
  if(i>=0) S.team.splice(i,1);
  else { if(S.team.length>=teamSlots(th())) return toast(`Team sheet is full (${teamSlots(th())} slots)`); S.team.push(id); }
  save();
}

// ---------- daily tasks ----------
const today = () => new Date().toDateString();
function ensureDaily(){
  if(S.daily&&S.daily.day===today()) return;
  const r=rng([...today()].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7)); const pool=[...TASKS], tasks=[];
  while(tasks.length<3){ const t=pool.splice(r()*pool.length|0,1)[0]; const goal=Math.round(t.goal*(1+(th()-1)*.4)); tasks.push({k:t.k,goal,n:0,claimed:false}); }
  S.daily={day:today(),tasks,bonus:false};
}
function track(k,n){ if(!S) return; ensureDaily(); for(const t of S.daily.tasks) if(t.k===k&&!t.claimed) t.n=Math.min(t.goal,t.n+n); uiDirty=true; }
function claimTask(i){ const t=S.daily.tasks[i]; if(t.claimed||t.n<t.goal) return; t.claimed=true; S.medals+=3; floatText(C0,C0,"+3 🏅");
  if(S.daily.tasks.every(x=>x.claimed)&&!S.daily.bonus){ S.daily.bonus=true; S.packs.silver=(S.packs.silver||0)+1; toast("All tasks done! +1 Silver Pack"); }
  sfx("collect"); save(); }
const tasksReady = () => S.daily&&S.daily.tasks.filter(t=>t.n>=t.goal&&!t.claimed).length;

// ---------- time passing ----------
function processTimers(){
  const now=Date.now();
  for(const b of S.buildings) if(b.busy && b.busy.end<=now){
    if(b.busy.kind==="up"){ b.lv++; toast(`${BLD[b.t].name} upgraded to level ${b.lv}!`); } else toast(`${BLD[b.t].name} finished!`);
    b.busy=null; uiDirty=true; sfx("build"); save();
  }
  if(S.research && S.research.end<=now){ S.unitLv[S.research.u]++; toast(`${UNITS[S.research.u].name} is now level ${S.unitLv[S.research.u]}!`); S.research=null; uiDirty=true; save(); }
  for(const h of Object.keys(HEROES)){ const hs=S.heroes[h]; if(hs.busy && hs.busy.end<=now){ hs.lv++; hs.busy=null; toast(`${heroStats(h).name} is now level ${hs.lv}!`); uiDirty=true; save(); } }
  trainTick(now); spellTick(now);
  if(mode==="home") raidTick(now);
}
function produce(sec){
  const ev=eventNow();
  for(const b of S.buildings){ const d=BLD[b.t]; if(!d.makes||b.busy) continue;
    const boost = d.makes==="pies"&&ev&&ev.pies ? ev.pies : 1;
    b.store=Math.min(d.cap[b.lv-1], (b.store||0)+d.rate[b.lv-1]*boost/60*sec); }
}
function floatText(x,y,s,col){ floaters.push({x,y,s,life:1.4,col}); }

// ---------- home rendering ----------
function renderHome(){
  drawGround();
  if(placing){ ctx.strokeStyle="#ffffff28"; ctx.lineWidth=1; for(let i=0;i<=N;i++){ ctx.beginPath(); ctx.moveTo(...P(i,0)); ctx.lineTo(...P(i,N)); ctx.moveTo(...P(0,i)); ctx.lineTo(...P(N,i)); ctx.stroke(); } }
  const club=myClub(), list=S.buildings, ents=[];
  const heroes={captain:heroReady("captain")?club:null, coach:heroReady("coach")?club:null, busy:{captain:!!S.heroes.captain.busy,coach:!!S.heroes.coach.busy}};
  for(const t of deco) ents.push({k:t.x+t.y,f:()=>drawDeco(t)});
  for(const o of S.obstacles) ents.push({k:o.x+o.y+1,f:()=>{ if(selected===o) selectGlow(o.x,o.y,1);
    const v=(o.id*37%10)/10; drawDeco({x:o.x+.5,y:o.y+.55,k:o.k,s:(o.k==="tree"?.78:o.k==="bush"?.62:.85)*(.92+v*.16),h:v,inGround:true}); }});
  const movingB = placing&&placing.moving;
  for(const b of list){ if(b===movingB) continue; const d=BLD[b.t];
    ents.push({k:b.x+b.y+d.size,f:()=>drawBuilding(b,club,list,{selected:selected===b, fill:fillOf(b), heroes, collect:d.makes&&!b.busy&&b.store>=Math.max(1,d.cap[b.lv-1]*.1)?b.store:0})}); }
  ents.sort((a,b)=>a.k-b.k).forEach(e=>e.f());
  if(placing){ const d=BLD[placing.t], ok=footprintFree(placing.x,placing.y,d.size,placing.moving);
    diamond(placing.x,placing.y,d.size,d.size,ok?"#5fd16b88":"#e8503a99","#fff",2);
    ctx.save(); ctx.globalAlpha=.85; drawBuilding({t:placing.t,x:placing.x,y:placing.y,lv:placing.moving?placing.moving.lv:1},club,list,{fill:.5,heroes}); ctx.restore(); }
  drawSky();
  drawFloaters();
}
function fillOf(b){ const d=BLD[b.t]; if(d.stores) return Math.min(1,S[d.stores]/Math.max(1,capOf(d.stores))); if(b.t==="bench") return Math.min(1,usedSpace()/Math.max(1,armySpace())); return .5; }
function drawFloaters(){ for(const f of floaters){ const [x,y]=P(f.x,f.y,3+(1.4-f.life)*1.5); ctx.globalAlpha=Math.min(1,f.life*1.5); txt(f.s,x,y,TH*.9,f.col||GOLD); ctx.globalAlpha=1; } }
function centreOn(x,y){ const [px,py]=iso(x,y); cam.x+=W/2-px; cam.y+=H/2-py; clampCam(); }

// ---------- main loop ----------
let lastFrame=performance.now(), econ=0, saveT=0, uiDirty=true;
function frame(now){
  const dt=Math.min(.05,(now-lastFrame)/1000); lastFrame=now;
  floaters=floaters.filter(f=>(f.life-=dt)>0);
  if(S){
    econ+=dt; if(econ>=.5){ produce(econ); econ=0; processTimers(); }
    saveT+=dt; if(saveT>5){ saveT=0; if(mode==="home") save(); }
    if(mode==="home") renderHome(); else { battleUpdate(dt); renderBattle(); }
    updateHUD();
  } else { drawGround(); drawSky(); }
  requestAnimationFrame(frame);
}
function boot(){
  resize(); addEventListener("resize",resize);
  S=load();
  if(S){ const away=Math.min(24*3600,(Date.now()-S.last)/1000); produce(away); ensureDaily(); processTimers(); if(away>60&&!S.raids.some(r=>!r.seen)) toast(`Welcome back! You were away ${fmtTime(away)}.`); }
  else showClubPicker();
  if(S&&typeof S.tut==="number") setTimeout(showTutStep,400);
  if(typeof netStart==="function") setTimeout(netStart,800);
  refreshUI(); requestAnimationFrame(frame);
  addEventListener("visibilitychange",()=>{ if(document.hidden&&mode==="home") save(); });
}

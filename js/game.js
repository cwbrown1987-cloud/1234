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
  const s={v:3, club, pies:750, drink:750, medals:500, trophies:0, nextId:100,
    buildings:[B("clubhouse",c,c),B("shed",c+6,c-3)],
    obstacles:[], army:{}, queue:[], trainAt:Date.now(), spells:{}, squeue:[], spellAt:Date.now(),
    unitLv:{}, research:null, heroes:{captain:{lv:1,busy:null},coach:{lv:1,busy:null}},
    season:null, album:{}, tokens:0, xp:0, lvl:1, prizePacks:0, daily:null, raids:[], nextRaid:Date.now()+3*864e5+60000, shield:Date.now()+3*864e5, // 3-day new player shield, like Clash
    sound:true, last:Date.now(), tut:"choose"};
  s.buildings.forEach(b=>b.id=s.nextId++);
  const r=rng(club*99+7);
  s.obsV=2; s.obsAt=Date.now()+OBSTACLE_EVERY;
  S=fixup(s); for(let n=0;n<24;n++) spawnObstacle(r,6);
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
  s.starBonus=s.starBonus||{stars:0,until:0};
  s.raids=s.raids||[];
  // card album (replaced the old team-sheet cards): old cards and packs turn into Footy Tokens
  if(!s.album){ const oldCards=Object.values(s.cards||{}).reduce((a,b)=>a+b,0), oldPacks=Object.values(s.packs||{}).reduce((a,b)=>a+b,0);
    s.album={}; s.tokens=(s.tokens||0)+3+oldPacks*2+Math.floor(oldCards/3); delete s.cards; delete s.team; delete s.packs; }
  if(s.lvl===undefined){ // Experience Level from what's already built, like Clash
    let xp=0; for(const b of s.buildings){ const d=BLD[b.t]; if(!d) continue; for(let l=0;l<b.lv;l++) xp+=Math.max(1,Math.floor(Math.sqrt(Math.max(1,d.time[l]||1)))); }
    s.lvl=1; s.xp=0; s.prizePacks=s.prizePacks||0; let g=0; while(xp>=30+s.lvl*20&&g++<200){ xp-=30+s.lvl*20; s.lvl++; if(s.lvl%5===0) s.prizePacks++; } s.xp=xp; }
  s.tokens=s.tokens||0;
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
const busyBuilders = () => S.buildings.filter(b=>b.busy&&b.busy.total>0).length + Object.values(S.heroes).filter(h=>h.busy).length + S.obstacles.filter(o=>o.busy).length;
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
  for(const o of S.obstacles){ if(o===ignore) continue; const os=o.s||1; if(x<o.x+os&&x+s>o.x&&y<o.y+os&&y+s>o.y) return true; }
  return false;
}
function findSpot(s){ const c=N/2-s/2|0; for(let r=0;r<N;r++) for(let dx=-r;dx<=r;dx++) for(let dy=-r;dy<=r;dy++){ if(Math.max(Math.abs(dx),Math.abs(dy))!==r) continue; if(footprintFree(c+dx,c+dy,s)) return [c+dx,c+dy]; } return null; }

// ---------- shop / build / upgrade ----------
// Your first Pie Shop and Drink Tap are free, so spending everything can never leave you with no income.
const FREE_FIRST = ["pieshop","drinktap"];
const buildCost = t => t==="shed" ? SHED_COST[Math.min(5,sheds())] : FREE_FIRST.includes(t)&&countOf(t)===0 ? 0 : BLD[t].cost[0];
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
// Like Clash: clearing needs a free groundskeeper and takes a few seconds.
function removeObstacle(o){
  const d=obsInfo(o);
  if(o.busy) return;
  if(!freeBuilder()) return toast("All groundskeepers are busy");
  if(!pay(d.res,d.cost)) return toast(`Clearing costs ${fmt(d.cost)} ${resIcon(d.res)}`);
  o.busy={end:Date.now()+d.time*1000,total:d.time}; sfx("tap"); selected=null; save(); refreshUI();
}
function obstacleCleared(o){ track("clear",1);
  const d=obsInfo(o), s=o.s||1;
  S.obstacles=S.obstacles.filter(x=>x!==o); const [lo,hi]=d.votes, m=lo+Math.floor(Math.random()*(hi-lo+1)); S.medals+=m;
  if(typeof addXP==="function") addXP(s*2);
  floatText(o.x+s/2,o.y+s/2,m?`+${m} 🏅`:"Cleared!"); sfx("collect"); selected=null; save(); refreshUI();
}
// Grow a random obstacle on a free spot (with a one-tile gap around it). minC keeps it away from the middle.
function spawnObstacle(r=Math.random, minC=0){
  const ks=Object.keys(OBSTACLES), tot=ks.reduce((a,k)=>a+OBSTACLES[k].w,0);
  let pick=r()*tot, k=ks[0]; for(const kk of ks){ pick-=OBSTACLES[kk].w; if(pick<0){ k=kk; break; } }
  const s=OBSTACLES[k].s;
  for(let t=0;t<80;t++){ const x=1+(r()*(N-1-s)|0), y=1+(r()*(N-1-s)|0);
    if(Math.max(Math.abs(x+s/2-N/2),Math.abs(y+s/2-N/2))<minC) continue;
    if(!footprintFree(x-1,y-1,s+2)) continue;
    const o={id:S.nextId++,x,y,k,s}; S.obstacles.push(o); return o; }
  return null;
}
function growObstacles(){
  const now=Date.now();
  if(!S.obsV){ S.obsV=2; S.obsAt=now+OBSTACLE_EVERY; for(let i=0;i<8;i++) spawnObstacle(Math.random,5); uiDirty=true; save(); }
  let n=0; while(now>=S.obsAt&&n++<3){ S.obsAt+=OBSTACLE_EVERY; if(S.obstacles.length<OBSTACLE_MAX) spawnObstacle(); uiDirty=true; }
  if(now>=S.obsAt) S.obsAt=now+OBSTACLE_EVERY;
}
function collect(b){
  const d=BLD[b.t]; const n=Math.floor(b.store); if(n<1) return;
  const got=addRes(d.makes,n); b.store-=got;
  if(got<n) toast(`${d.makes==="pies"?"Pie Warmers":"Eskies"} are full!`);
  if(got){ floatText(b.x+d.size/2,b.y+d.size/2,`+${got}`); track(d.makes,got); sfx("collect"); }
  tut("collect-"+d.makes);
  save(); refreshUI();
}

// ---------- squad ----------
function armySpace(){ return S.buildings.filter(b=>b.t==="bench"&&built(b)).reduce((a,b)=>a+BLD.bench.space[b.lv-1],0); }
const spaceOf = obj => Object.entries(obj).reduce((a,[u,n])=>a+(UNITS[u]?UNITS[u].space*n:0),0);
const usedSpace = () => spaceOf(S.army);
const queuedSpace = () => S.queue.reduce((a,u)=>a+UNITS[u].space,0);
function unlockedUnits(){ const best=Math.max(0,...S.buildings.filter(b=>b.t==="oval"&&built(b)).map(b=>b.lv)); return BLD.oval.unlock.slice(0,best); }
const unitCost = u => Math.round(UNITS[u].cost*unitMul(S.unitLv[u]));
// Like Clash: training players is free and instant. Your bench (army camp) space is the only limit.
function trainUnit(u){
  if(usedSpace()+UNITS[u].space>armySpace()) return toast("Bench is full! Build or upgrade a bench.");
  S.army[u]=(S.army[u]||0)+1; track("train",1); sfx("tap",.3); save(); refreshUI(); tut("train");
}
function untrain(u){ if(S.army[u]>0){ S.army[u]--; if(!S.army[u]) delete S.army[u]; save(); refreshUI(); } }
function fillSquad(comp){ // re-add the players you last took to a match, as far as the bench allows
  let added=0; for(const [u,n] of Object.entries(comp||{})){ if(!unlockedUnits().includes(u)) continue; while((S.army[u]||0)<n && usedSpace()+UNITS[u].space<=armySpace()){ S.army[u]=(S.army[u]||0)+1; added++; } }
  return added;
}
function trainTick(now){ if(S.queue&&S.queue.length){ for(const u of S.queue.splice(0)) if(usedSpace()+UNITS[u].space<=armySpace()) S.army[u]=(S.army[u]||0)+1; uiDirty=true; } }
const physio = () => S.buildings.find(b=>b.t==="physio"&&built(b));
const spellSlots = () => physio()?BLD.physio.slots[physio().lv-1]:0;
const unlockedSpells = () => physio()?BLD.physio.unlock.slice(0,physio().lv):[];
const spellCount = () => Object.values(S.spells).reduce((a,b)=>a+b,0);
function brewSpell(sp){
  if(spellCount()>=spellSlots()) return toast("Physio Room is full");
  S.spells[sp]=(S.spells[sp]||0)+1; sfx("tap",.3); save(); refreshUI();
}
function unbrew(sp){ if(S.spells[sp]>0){ S.spells[sp]--; if(!S.spells[sp]) delete S.spells[sp]; save(); refreshUI(); } }
function spellTick(now){ if(S.squeue&&S.squeue.length){ for(const sp of S.squeue.splice(0)) if(spellCount()<spellSlots()) S.spells[sp]=(S.spells[sp]||0)+1; uiDirty=true; } }
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
const heroHome = h => S.buildings.some(b=>b.t===HEROES[h].building&&built(b)&&b.lv>=(HEROES[h].hhLv||1));
// The heroes you take into a match: up to HERO_SLOTS, chosen in Squad → Heroes (Clash's Hero Hall).
function heroPicked(){
  const home=Object.keys(HEROES).filter(heroHome);
  S.heroSeen=S.heroSeen||[];
  if(!S.heroPick) S.heroPick=[];
  for(const h of home) if(!S.heroSeen.includes(h)){ S.heroSeen.push(h); if(S.heroPick.length<HERO_SLOTS&&!S.heroPick.includes(h)) S.heroPick.push(h); }
  return S.heroPick.filter(h=>home.includes(h)).slice(0,HERO_SLOTS);
}
function toggleHeroPick(h){
  heroPicked(); const i=S.heroPick.indexOf(h);
  if(i>=0) S.heroPick.splice(i,1);
  else { if(heroPicked().length>=HERO_SLOTS) return toast(`Only ${HERO_SLOTS} heroes per match. Take one off first.`); S.heroPick.push(h); }
  save();
}
const heroReady = h => heroHome(h)&&!S.heroes[h].busy;
function heroStats(h="captain", club, lv){
  const own=club===undefined; club=club||myClub(); lv=lv||S.heroes[h].lv;
  const H=HEROES[h], pos=H.pos(club), p=HERO_POS[pos], m=1+.1*(lv-1), g=own&&typeof gearFx==="function"?gearFx(h):{hp:0,dps:0,spd:0,ability:0,armor:0,heal:0,rage:0,shield:0};
  return {...p, hp:Math.round(p.hp*m*(1+g.hp)), dps:Math.round(p.dps*m*(1+g.dps)), spd:p.spd*(1+g.spd), name:H.name(club), pos, lv, gear:g};
}
function upgradeHero(h){
  const hs=S.heroes[h]; if(hs.busy) return;
  if(hs.lv>=heroMax(th(),h)) return toast(`Needs Clubhouse ${th()+1}`);
  if(!freeBuilder()) return toast("All groundskeepers are busy");
  if(!pay("drink",heroCost(hs.lv))) return toast("Not enough 💧");
  const t=heroTime(hs.lv); hs.busy={end:Date.now()+t*1000,total:t}; track("upgrade",1); save(); refreshUI();
}

// ---------- cards ----------
// ---------- daily tasks ----------
const today = () => new Date().toDateString();
function ensureDaily(){
  if(S.daily&&S.daily.day===today()) return;
  const r=rng([...today()].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7)); const pool=[...TASKS], tasks=[];
  while(tasks.length<3){ const t=pool.splice(r()*pool.length|0,1)[0]; const goal=Math.round(t.goal*(1+(th()-1)*.4)); tasks.push({k:t.k,goal,n:0,claimed:false}); }
  S.daily={day:today(),tasks,bonus:false};
}
function track(k,n){ if(!S) return; if(typeof bumpStat==="function"){ bumpStat(k,n); passPoints(k,n); } ensureDaily(); for(const t of S.daily.tasks) if(t.k===k&&!t.claimed) t.n=Math.min(t.goal,t.n+n); uiDirty=true; }
function claimTask(i){ const t=S.daily.tasks[i]; if(t.claimed||t.n<t.goal) return; t.claimed=true; if(typeof passPoints==="function") passPoints("task",1); S.medals+=3; floatText(C0,C0,"+3 🏅");
  if(S.daily.tasks.every(x=>x.claimed)&&!S.daily.bonus){ S.daily.bonus=true; earnTokens(2); toast("All tasks done! +2 🎟️ Footy Tokens"); }
  sfx("collect"); save(); }
const tasksReady = () => S.daily&&S.daily.tasks.filter(t=>t.n>=t.goal&&!t.claimed).length;

// ---------- time passing ----------
function processTimers(){
  if(S&&S.tut==="done") growObstacles();
  const now=Date.now();
  for(const o of [...S.obstacles]) if(o.busy&&o.busy.end<=now) obstacleCleared(o);
  for(const b of S.buildings) if(b.busy && b.busy.end<=now){
    if(b.busy.kind==="up"){ b.lv++; toast(`${BLD[b.t].name} upgraded to level ${b.lv}!`); } else toast(`${BLD[b.t].name} finished!`);
    addXP(xpForSeconds(b.busy.total||1));
    b.busy=null; uiDirty=true; sfx("build"); save();
  }
  if(S.research && S.research.end<=now){ addXP(xpForSeconds(S.research.total||1)); S.unitLv[S.research.u]++; toast(`${UNITS[S.research.u].name} is now level ${S.unitLv[S.research.u]}!`); S.research=null; uiDirty=true; save(); }
  for(const h of Object.keys(HEROES)){ const hs=S.heroes[h]; if(hs.busy && hs.busy.end<=now){ addXP(xpForSeconds(hs.busy.total||1)); hs.lv++; hs.busy=null; toast(`${heroStats(h).name} is now level ${hs.lv}!`); uiDirty=true; save(); } }
  trainTick(now); spellTick(now);
  if(mode==="home") raidTick(now);
}
function produce(sec){
  const ev=eventNow();
  for(const b of S.buildings){ const d=BLD[b.t]; if(!d.makes||b.busy) continue;
    const boost = d.makes==="pies"&&ev&&ev.pies ? ev.pies : 1;
    b.store=Math.min(d.cap[b.lv-1], (b.store||0)+d.rate[b.lv-1]*boost/60*sec); }
}
// Star Bonus (like Clash): earn 5 stars in Battles or Ranked, collect bonus pies and drink, then it resets 24 hours later.
const STAR_GOAL = 5;
const starBonusLoot = () => ({pies:1500*th(), drink:1500*th()});
function addStars(n){
  S.starBonus=S.starBonus||{stars:0,until:0};
  S.starBonus.stars=Math.min(STAR_GOAL*2,S.starBonus.stars+n); // up to two bonuses can bank, like Clash
  return claimStarBonus();
}
function claimStarBonus(){
  const sb=S.starBonus; if(!sb||sb.stars<STAR_GOAL||Date.now()<sb.until) return null;
  const l=starBonusLoot(), got={pies:addRes("pies",l.pies), drink:addRes("drink",l.drink)};
  const ore={tape:120*th(), lin:3*th()}; if(typeof addOre==="function") addOre(ore);
  sb.stars-=STAR_GOAL; sb.until=Date.now()+864e5; save(); sfx("cheer"); toast(`⭐ Star Bonus! +${fmt(got.pies)} 🥧 +${fmt(got.drink)} 💧 +${ore.tape} 🩹 +${ore.lin} 🧴`);
  return got;
}
// Magic Shield (like Clash): lose 30% or more of what could be stolen and you get 8 hours of peace
const MAGIC_SHIELD = 8*3600e3;
function floatText(x,y,s,col){ floaters.push({x,y,s,life:1.4,col}); }

// ---------- home rendering ----------
function renderHome(){
  drawGround();
  if(placing){ ctx.strokeStyle="#ffffff28"; ctx.lineWidth=1; for(let i=0;i<=N;i++){ ctx.beginPath(); ctx.moveTo(...P(i,0)); ctx.lineTo(...P(i,N)); ctx.moveTo(...P(0,i)); ctx.lineTo(...P(N,i)); ctx.stroke(); } }
  const club=myClub(), list=S.buildings, ents=[];
  const heroes={busy:{}}; for(const h of Object.keys(HEROES)){ heroes[h]=heroReady(h)?club:null; heroes.busy[h]=!!S.heroes[h].busy; }
  for(const t of deco) ents.push({k:t.x+t.y,f:()=>drawDeco(t)});
  for(const o of S.obstacles) ents.push({k:o.x+o.y+(o.s||1),f:()=>{ if(selected===o) selectGlow(o.x,o.y,o.s||1); drawObstacle(o); }});
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
  resize(); addEventListener("resize",resize); addEventListener("orientationchange",()=>setTimeout(resize,250));
  if(window.visualViewport) visualViewport.addEventListener("resize",resize);
  S=load();
  if(S){ const away=Math.min(24*3600,(Date.now()-S.last)/1000); produce(away); ensureDaily(); processTimers(); if(away>60&&!S.raids.some(r=>!r.seen)) toast(`Welcome back! You were away ${fmtTime(away)}.`); }
  else showClubPicker();
  if(S&&typeof S.tut==="number") setTimeout(showTutStep,400);
  else if(S&&S.tut==="choose") setTimeout(showTutorialChoice,400); // closed the app before picking: ask again
  if(typeof netStart==="function") setTimeout(netStart,800);
  refreshUI(); requestAnimationFrame(frame);
  addEventListener("visibilitychange",()=>{ if(document.hidden&&mode==="home") save(); });
}

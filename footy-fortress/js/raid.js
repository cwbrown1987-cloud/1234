// ---------- Getting attacked: AI clubs raid your ground, with replays and revenge ----------
let simulating = false;

function raidTick(now){
  if(!S.nextRaid || now<S.nextRaid || placing) return;
  if(S.shield>now){ S.nextRaid=S.shield+(3+Math.random()*7)*60000; return; }
  if(th()<2 && S.trophies<30){ S.nextRaid=now+10*60000; return; } // go easy on brand-new clubs
  runRaid(); S.nextRaid=now+(8+Math.random()*12)*60000; save();
}

// Snapshot your ground as a battle map, with what an attacker could steal.
function homeBattleBase(){
  const tough=1+cardBonus("def");
  const list=S.buildings.filter(built).map(b=>{ const d=BLD[b.t], hp=Math.round(d.hp[b.lv-1]*(d.trap?1:tough)); return {id:b.id,t:b.t,x:b.x,y:b.y,lv:b.lv,hp,max:hp,cd:0,armed:d.trap?true:undefined}; });
  const pw=list.filter(b=>b.t==="piewarmer"), es=list.filter(b=>b.t==="esky"), ch=list.find(b=>b.t==="clubhouse");
  pw.forEach(b=>b.loot={pies:Math.floor(S.pies*.2/pw.length),drink:0});
  es.forEach(b=>b.loot={pies:0,drink:Math.floor(S.drink*.2/es.length)});
  if(ch) ch.loot={pies:Math.floor(S.pies*.05),drink:Math.floor(S.drink*.05)};
  for(const b of list){ const home=S.buildings.find(x=>x.id===b.id), d=BLD[b.t]; if(d.makes&&home) b.loot={pies:d.makes==="pies"?Math.floor(home.store*.5):0, drink:d.makes==="drink"?Math.floor(home.store*.5):0}; }
  return list;
}
function raidArmy(d,r){
  const pool=BLD.oval.unlock.slice(0,Math.min(8,d+1)).filter(u=>u!=="trainer");
  const army={}; let space=12+7*d;
  const heavy=pool.filter(u=>UNITS[u].space>=5);
  for(const u of heavy){ const n=Math.floor(space*.35/UNITS[u].space); if(n>0){ army[u]=n; space-=n*UNITS[u].space; } }
  let g=0; while(space>0&&g++<200){ const u=pool[r()*pool.length|0]; if(UNITS[u].space>space||UNITS[u].space>=5) continue; army[u]=(army[u]||0)+1; space-=UNITS[u].space; }
  return army;
}
function raidPlan(army,d,r){
  const sides=[0,1,2,3].sort(()=>r()-.5).slice(0,1+(r()*2|0)), plan=[];
  const spot=()=>{ const s=sides[r()*sides.length|0], a=4+r()*(N-8); return s===0?[-.6,a]:s===1?[N+.6,a]:s===2?[a,-.6]:[a,N+.6]; };
  let t=.5;
  const order=Object.keys(army).sort((a,b)=>UNITS[b].space-UNITS[a].space);
  for(const u of order){ const [x,y]=spot(); for(let i=0;i<army[u];i++){ plan.push({t,k:"unit",v:u,x:x+(r()-.5)*1.5,y:y+(r()-.5)*1.5}); t+=.15; } t+=1.5+r()*2; }
  if(d>=2){ const [x,y]=spot(); plan.push({t:4,k:"hero",v:"captain",x,y,ability:10}); }
  plan.sort((a,b)=>a.t-b.t);
  return plan;
}
function raidBattle(raid, mode){
  return makeBattle({mode, club:S.club, atkClub:raid.club, buildings:raid.base.map(b=>({...b,loot:b.loot?{...b.loot}:undefined})),
    army:raid.army, spells:{}, heroes:raid.plan.some(p=>p.k==="hero")?{captain:true}:{}, plan:raid.plan.map(p=>({...p})),
    lvOf:()=>raid.lv, heroStat:h=>heroStats(h,CLUBS[raid.club],raid.heroLv), bonus:null, homeHeroes:{captain:heroHome("captain")?CLUBS[S.club]:null, coach:heroHome("coach")?CLUBS[S.club]:null}});
}
function runRaid(){
  const r=rng(Date.now()%1e9), d=Math.max(1,Math.min(MAX_TH,th()+(r()<.3?1:0)-(r()<.3?1:0)));
  let club; do{ club=r()*18|0; }while(club===S.club);
  const army=raidArmy(d,r);
  const raid={id:Date.now(), at:Date.now(), club, d, lv:Math.max(1,Math.min(UNIT_MAX,d-2)), heroLv:Math.max(1,d*2-3), army, plan:raidPlan(army,d,r), base:homeBattleBase()};
  // play the whole match out instantly
  const saved=BT, sm=shake; simulating=true; BT=raidBattle(raid,"raid");
  let steps=0; while(steps++<4000 && !battleStep(1/20)){}
  const stars=starsNow(), p=Math.round(pct());
  // what was taken from each building
  const lost={pies:0,drink:0};
  for(const b of BT.buildings){ if(!b.loot) continue; const f=1-Math.max(0,b.hp)/b.max; const tp=Math.floor(b.loot.pies*f), td=Math.floor(b.loot.drink*f);
    const home=S.buildings.find(x=>x.id===b.id);
    if(home&&BLD[home.t].makes){ home.store=Math.max(0,home.store-(tp+td)); } else { lost.pies+=tp; lost.drink+=td; } }
  BT=saved; shake=sm; simulating=false; floaters=[];
  S.pies=Math.max(0,S.pies-lost.pies); S.drink=Math.max(0,S.drink-lost.drink);
  const tro = stars ? -(5+stars*5) : 8;
  S.trophies=Math.max(0,S.trophies+tro);
  if(p>=90) S.shield=Date.now()+60*60000; else if(p>=40) S.shield=Date.now()+30*60000;
  if(!stars) track("defend",1);
  Object.assign(raid,{stars,pct:p,lost,tro,seen:false,revenged:false});
  S.raids.unshift(raid); S.raids=S.raids.slice(0,8);
  uiDirty=true; save();
  toast(stars?`⚠️ ${CLUBS[club].name} raided your ground! ${"★".repeat(stars)}`:`🛡️ You held off ${CLUBS[club].name}!`);
  sfx(stars?"siren":"cheer");
}
function watchReplay(raid){
  raid.seen=true; save(); closeModal();
  BT=raidBattle(raid,"replay"); BT.speed=1; BT.raid=raid;
  mode="battle"; selected=null; placing=null; cam.x=0; cam.y=0; setZoom(.8); refreshUI();
}
function revenge(raid){
  if(raid.revenged) return toast("You already got them back!");
  closeModal(); startBattle({kind:"revenge", club:raid.club, d:raid.d, seed:raid.id%1e9, lootMul:1.5, revenge:raid.id});
}

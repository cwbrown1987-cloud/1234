// ---------- HUD, menus and touch controls ----------
const $ = id => document.getElementById(id);
const fmt = n => n>=100000 ? Math.round(n/1000)+"k" : Math.floor(n).toLocaleString();
let tt; function toast(s){ const t=$("toast"); t.textContent=s; t.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove("show"),1800); }
const jersey = c => `linear-gradient(90deg,${c.a} 0 34%,${c.b} 34% 66%,${c.a} 66%)`;

// Small player portraits for cards and queues
const iconCache={};
function playerIcon(kind, club){
  const key=kind+(club?club.a+club.b:"");
  if(iconCache[key]) return iconCache[key];
  const c=document.createElement("canvas"); c.width=c.height=96;
  const save={ctx,TW,TH}; ctx=c.getContext("2d"); TW=60; TH=30;
  const cl=club||myClub(), st=kind==="hero"?heroStats():null;
  drawPlayer(48,90,kind==="hero"?26:kind==="ruck"||kind==="trainer"?27:23,cl,{kind,hero:kind==="hero",ranged:st&&st.ranged,id:3});
  ctx=save.ctx; TW=save.TW; TH=save.TH;
  return iconCache[key]=c.toDataURL();
}
const SPELL_ICON={oranges:"🍊",roar:"📣",freekick:"🟨"};
function spellIcon(sp){
  if(iconCache[sp]) return iconCache[sp];
  const c=document.createElement("canvas"); c.width=c.height=96; const g=c.getContext("2d");
  g.font="56px serif"; g.textAlign="center"; g.textBaseline="middle"; g.fillText(SPELL_ICON[sp],48,52);
  return iconCache[sp]=c.toDataURL();
}

// ---------- HUD ----------
function refreshUI(){
  const home=mode==="home", bat=mode==="battle";
  $("homeBtns").classList.toggle("hide",!home||!!placing);
  $("top").classList.toggle("hide",!home);
  $("btnSettings").classList.toggle("hide",!home);
  ["battleTop","battleBottom"].forEach(id=>$(id).style.display=bat?"flex":"none");
  if(S){ const c=myClub(); $("clubName").textContent=c.name; $("g").style.background=jersey(c); }
  // placing
  $("placePanel").style.display=home&&placing&&!placing.moving?"flex":"none";
  if(placing&&!placing.moving){ const d=BLD[placing.t]; $("placeName").textContent=`${d.name} · ${buildCost(placing.t)} ${resIcon(d.res)}`; }
  // selection panel
  const sp=$("selPanel"); sp.innerHTML="";
  if(home&&selected&&!placing){ sp.style.display="flex"; buildSelPanel(sp); } else sp.style.display="none";
  if(bat) buildCards();
  updateHUD(true);
}
function updateHUD(force){
  if(uiDirty&&!force){ uiDirty=false; refreshUI(); return; }
  if(!S) return;
  if(mode==="home"){
    for(const el of document.querySelectorAll(".res")){ const r=el.dataset.r; const v=r==="medals"?S.medals:S[r];
      el.querySelector(".v").textContent=fmt(v);
      if(r!=="medals"){ const cap=capOf(r); el.querySelector(".fill").style.width=Math.min(100,100*v/Math.max(1,cap))+"%"; el.querySelector(".cap").textContent="Max: "+fmt(cap); } }
    $("tro").textContent=S.trophies; $("lg").textContent=league(S.trophies);
    $("builders").textContent=`👷 ${sheds()-busyBuilders()}/${sheds()}`;
    const tm=document.querySelector("#selPanel .timer"); if(tm&&selected&&selected.busy){ tm.textContent=fmtTime((selected.busy.end-Date.now())/1000); const sb=document.querySelector("#selPanel .speed small"); if(sb) sb.textContent=speedCost(selected.busy.end)+" 🏅"; }
  } else if(BT){
    $("bVs").textContent="vs "+CLUBS[BT.club].name;
    $("bLoot").textContent=(BT.kind==="season"?roundName(BT.round)+" · ":"")+`🥧 ${fmt(Math.max(0,BT.lootTotal.pies-BT.loot.pies))}  💧 ${fmt(Math.max(0,BT.lootTotal.drink-BT.loot.drink))}`;
    const s=starsNow(); $("bStars").textContent="★".repeat(s)+"☆".repeat(3-s);
    $("bPct").textContent=Math.floor(pct())+"%";
    const t=Math.max(0,Math.ceil(BT.time)); $("bTime").textContent=Math.floor(t/60)+":"+String(t%60).padStart(2,"0");
    $("battleHint").style.display=BT.started?"none":"block";
    const ab=$("bAbility"); const h=BT.hero; ab.style.display=h&&h.hp>0&&!BT.abilityUsed?"block":"none"; if(h) ab.textContent="⚡ "+heroStats().ability;
  }
}

function buildSelPanel(sp){
  const o=selected;
  if(!BLD[o.t]){ // obstacle
    sp.innerHTML=`<div class="title">${o.k==="rock"?"Rock":o.k==="bush"?"Bush":"Gum Tree"}</div><div class="acts"></div>`;
    addBtn(sp,"btn gold",`Clear<small>100 🥧</small>`,()=>removeObstacle(o)); return; }
  const d=BLD[o.t];
  sp.innerHTML=`<div class="title">${d.name} <span style="color:var(--gold)">Lv ${o.lv}</span>${o.busy?` · <span class="timer"></span>`:""}</div><div class="acts"></div>`;
  addBtn(sp,"btn blue","ℹ️<small>Info</small>",()=>openInfo(o));
  if(o.busy) addBtn(sp,"btn green speed",`Finish<small>${speedCost(o.busy.end)} 🏅</small>`,()=>speedUp(o));
  else if(o.t!=="shed"){ const u=upgradeInfo(o);
    if(u.ok) addBtn(sp,"btn gold",`⬆ Upgrade<small>${fmt(u.cost)} ${resIcon(u.res)}</small>`,()=>startUpgrade(o),!canPay(u.res,u.cost));
    else addBtn(sp,"btn",`⬆<small>${u.why}</small>`,()=>toast(u.why),true); }
  if(d.makes&&!o.busy) addBtn(sp,"btn green",`Collect<small>${Math.floor(o.store)} ${resIcon(d.makes)}</small>`,()=>collect(o),o.store<1);
  if(o.t==="oval"||o.t==="bench") addBtn(sp,"btn","🏉<small>Train</small>",()=>openSquad("Train"));
  if(o.t==="physio") addBtn(sp,"btn","🍊<small>Spells</small>",()=>openSquad("Spells"));
  if(o.t==="coachbox") addBtn(sp,"btn","📋<small>Research</small>",()=>openSquad("Coaching"));
  if(o.t==="locker") addBtn(sp,"btn","⭐<small>Captain</small>",()=>openSquad("Captain"));
}
function addBtn(sp,cls,html,fn,dis){ const b=document.createElement("button"); b.className=cls; b.innerHTML=html; b.onclick=e=>{e.stopPropagation(); fn();}; if(dis) b.setAttribute("disabled",""); sp.querySelector(".acts").append(b); return b; }

function buildCards(){
  const box=$("cards"); box.innerHTML="";
  const card=(cls,img,n,label,sel,on,empty)=>{ const b=document.createElement("button"); b.className="cardbtn "+cls+(sel?" sel":"")+(empty?" empty":""); b.innerHTML=`<img src="${img}"><span class="n">${n}</span><span class="l">${label}</span>`; b.onclick=on; box.append(b); };
  for(const u of Object.keys(UNITS)){ const n=BT.left[u]||0, had=(BT.had[u]||0); if(!had) continue;
    card("",playerIcon(u),"x"+n,UNITS[u].name,BT.sel&&BT.sel.k==="unit"&&BT.sel.v===u,()=>{BT.sel={k:"unit",v:u};buildCards();},!n); }
  if(hasLocker()) card("hero",playerIcon("hero"),S.hero.busy?"🔧":"",myClub().hero.name.split(" ").pop(),BT.sel&&BT.sel.k==="hero",()=>{ if(BT.heroLeft){BT.sel={k:"hero"};buildCards();} },!BT.heroLeft);
  for(const sp of Object.keys(SPELLS)){ const had=BT.hadSpells[sp]||0; if(!had) continue; const n=BT.spellsLeft[sp]||0;
    card("spell",spellIcon(sp),"x"+n,SPELLS[sp].name.split(" ").pop(),BT.sel&&BT.sel.k==="spell"&&BT.sel.v===sp,()=>{BT.sel={k:"spell",v:sp};buildCards();},!n); }
}

// ---------- modals ----------
function modal(html, opts={}){ $("modalBody").innerHTML=html; $("modal").classList.add("show"); $("modalX").style.display=opts.noClose?"none":"block"; modalTick=opts.tick||null; }
function closeModal(){ $("modal").classList.remove("show"); modalTick=null; }
let modalTick=null; setInterval(()=>{ if(modalTick&&$("modal").classList.contains("show")) modalTick(); },1000);
$("modalX").onclick=closeModal;
$("modal").addEventListener("pointerdown",e=>{ if(e.target.id==="modal"&&$("modalX").style.display!=="none") closeModal(); });

function showClubPicker(){
  modal(`<h2>Pick your club</h2><p style="text-align:center;margin:0 0 10px">Build your ground, train your squad and take on the rest of the league.</p><div class="clubs" id="clubList"></div>`,{noClose:true});
  CLUBS.forEach((c,i)=>{ const b=document.createElement("button"); b.innerHTML=`<span class="guernsey" style="background:${jersey(c)}"></span><span>${c.name}<small>⭐ ${c.hero.name}</small></span>`;
    b.onclick=()=>{ newGame(i); closeModal(); cam.x=0; cam.y=0; setZoom(1); refreshUI(); toast(`Welcome to Footy Fortress, ${c.name}!`); }; $("clubList").append(b); });
}

let shopTab="Resources";
function openShop(tab){
  shopTab=tab||shopTab;
  modal(`<h2>Shop</h2><div class="tabs">${Object.keys(SHOP_TABS).map(t=>`<button class="${t===shopTab?"on":""}" data-t="${t}">${t}</button>`).join("")}</div><div class="grid" id="shopGrid"></div>`);
  document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>openShop(b.dataset.t));
  const g=$("shopGrid");
  for(const t of SHOP_TABS[shopTab]){
    const d=BLD[t], st=shopStatus(t);
    const it=document.createElement("div"); it.className="item"+(st.ok?"":" off");
    it.append(thumb(t,myClub()));
    it.insertAdjacentHTML("beforeend",`<div class="nm">${d.name}</div><div class="meta">Built ${st.have}/${st.lim||MAXC[t][th()-1]}${d.time[0]?" · ⏱ "+fmtTime(d.time[0]):""}</div>`+
      (st.ok?`<div class="cost ${st.afford?"":"bad"}">${fmt(st.cost)} ${resIcon(st.res)}</div>`:`<div class="cost bad">${st.why}</div>`));
    it.onclick=()=>{ if(!st.ok) return toast(st.why); closeModal(); startPlacing(t); };
    g.append(it);
  }
}

let squadTab="Train";
function openSquad(tab){
  squadTab=tab||squadTab;
  const tabs=["Train","Spells","Captain","Coaching"];
  const render=()=>{
    let h=`<h2>Squad</h2><div class="tabs">${tabs.map(t=>`<button class="${t===squadTab?"on":""}" data-t="${t}">${t}</button>`).join("")}</div>`;
    if(squadTab==="Train"){
      const cap=armySpace(), used=usedSpace(), q=queuedSpace();
      h+=`<div>Squad size: <b>${used}</b> / ${cap} ${q?`(+${q} training)`:""}</div><div class="bar"><div style="width:${100*used/Math.max(1,cap)}%"></div></div>`;
      h+=`<div class="armyrow">${Object.entries(S.army).filter(([,n])=>n>0).map(([u,n])=>`<span class="chip"><img src="${playerIcon(u)}">${n}</span>`).join("")||"<i>No players yet</i>"}</div>`;
      h+=`<h3>Training ${S.queue.length?`· next in ${fmtTime(Math.max(0,UNITS[S.queue[0]].time/Math.max(1,S.buildings.filter(b=>b.t==="oval"&&built(b)).length)-(Date.now()-S.trainAt)/1000))}`:""}</h3><div class="queue" id="q">${S.queue.map((u,i)=>`<div class="q" data-i="${i}"><img src="${playerIcon(u)}"><span>✖</span></div>`).join("")}</div>`;
      h+=`<h3>Train players</h3><div class="grid">`;
      const un=unlockedUnits();
      for(const [k,u] of Object.entries(UNITS)){ const ok=un.includes(k), lv=S.unitLv[k], c=Math.round(u.cost*unitMul(lv));
        h+=`<div class="item ${ok?"":"off"}" data-u="${k}"><img src="${playerIcon(k)}"><div class="nm">${u.name} <small>Lv${lv}</small></div><div class="meta">${u.desc}</div><div class="meta">👥 ${u.space} · ⏱ ${u.time}s</div>${ok?`<div class="cost ${S.drink>=c?"":"bad"}">${c} 💧</div>`:`<div class="cost bad">Training Oval ${BLD.oval.unlock.indexOf(k)+1}</div>`}</div>`; }
      h+="</div>";
    }
    if(squadTab==="Spells"){
      const slots=spellSlots();
      if(!slots) h+=`<p>Build a <b>Physio Room</b> (Clubhouse 3) to brew spells.</p>`;
      else{
        h+=`<div>Spells: <b>${spellCount()}</b> / ${slots}</div><div class="armyrow">${Object.entries(S.spells).filter(([,n])=>n>0).map(([s,n])=>`<span class="chip"><img src="${spellIcon(s)}">${n}</span>`).join("")}</div>`;
        h+=`<h3>Brewing</h3><div class="queue">${S.squeue.map(s=>`<div class="q"><img src="${spellIcon(s)}"></div>`).join("")}</div><h3>Brew</h3><div class="grid">`;
        const un=unlockedSpells();
        for(const [k,s] of Object.entries(SPELLS)){ const ok=un.includes(k); h+=`<div class="item ${ok?"":"off"}" data-s="${k}"><img src="${spellIcon(k)}"><div class="nm">${s.name}</div><div class="meta">${s.desc}</div>${ok?`<div class="cost ${S.drink>=s.cost?"":"bad"}">${s.cost} 💧</div>`:`<div class="cost bad">Physio Room ${BLD.physio.unlock.indexOf(k)+1}</div>`}</div>`; }
        h+="</div>";
      }
    }
    if(squadTab==="Captain"){
      const hs=heroStats(), c=myClub();
      h+=`<div style="display:flex;gap:12px;align-items:center"><img src="${playerIcon("hero")}" style="width:110px;height:110px;background:${jersey(c)};border:3px solid #000;border-radius:16px"><div>
        <div style="font-size:22px">${hs.name}</div><div>${c.name} · ${({mid:"Midfielder",fwd:"Forward",ruck:"Ruckman",def:"Defender"})[hs.pos]}</div>
        <div>Level <b>${S.hero.lv}</b> / ${heroMax(th())}</div><div>❤️ ${hs.hp} · 💥 ${hs.dps}/s</div></div></div>
        <h3>⚡ ${hs.ability}</h3><div>${hs.desc}</div>`;
      if(!hasLocker()) h+=`<p><b>Build a Captain's Locker</b> (Clubhouse 2) to bring ${hs.name.split(" ")[0]} onto the ground.</p>`;
      else if(S.hero.busy) h+=`<p>Training hard… ${fmtTime((S.hero.busy.end-Date.now())/1000)} left. Can't play until done.</p><button class="btn green" id="heroSpeed">Finish now · ${speedCost(S.hero.busy.end)} 🏅</button>`;
      else h+=`<p><button class="btn gold" id="heroUp">⬆ Upgrade · ${fmt(heroCost(S.hero.lv))} 💧 · ⏱ ${fmtTime(heroTime(S.hero.lv))}</button></p>`;
    }
    if(squadTab==="Coaching"){
      if(!coachBox()) h+=`<p>Build a <b>Coaches Box</b> (Clubhouse 3) to research better players.</p>`;
      else{
        if(S.research) h+=`<p>Researching <b>${UNITS[S.research.u].name}</b> · ${fmtTime((S.research.end-Date.now())/1000)} left</p>`;
        h+=`<div class="grid">`;
        for(const [k,u] of Object.entries(UNITS)){ const r=researchInfo(k);
          h+=`<div class="item ${r.ok&&!S.research?"":"off"}" data-r="${k}"><img src="${playerIcon(k)}"><div class="nm">${u.name}</div><div class="meta">Level ${S.unitLv[k]}${r.ok?" → "+(S.unitLv[k]+1):""}</div>${r.ok?`<div class="cost ${S.drink>=r.cost?"":"bad"}">${fmt(r.cost)} 💧 · ${fmtTime(r.time)}</div>`:`<div class="cost bad">${r.why}</div>`}</div>`; }
        h+="</div>";
      }
    }
    const scroll=$("modalBody").parentElement.scrollTop;
    modal(h,{tick:render}); $("modalBody").parentElement.scrollTop=scroll;
    document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{ squadTab=b.dataset.t; render(); });
    document.querySelectorAll("[data-u]").forEach(el=>el.onclick=()=>{ const k=el.dataset.u; if(!unlockedUnits().includes(k)) return toast(`Upgrade your Training Oval to unlock`); trainUnit(k); render(); });
    document.querySelectorAll("#q .q").forEach(el=>el.onclick=()=>{ untrain(+el.dataset.i); render(); });
    document.querySelectorAll("[data-s]").forEach(el=>el.onclick=()=>{ if(!unlockedSpells().includes(el.dataset.s)) return toast("Upgrade your Physio Room"); brewSpell(el.dataset.s); render(); });
    document.querySelectorAll("[data-r]").forEach(el=>el.onclick=()=>{ startResearch(el.dataset.r); render(); });
    const hu=$("heroUp"); if(hu) hu.onclick=()=>{ upgradeHero(); render(); };
    const hsb=$("heroSpeed"); if(hsb) hsb.onclick=()=>{ if(pay("medals",speedCost(S.hero.busy.end))){ S.hero.busy.end=Date.now(); processTimers(); } else toast("Not enough medals 🏅"); render(); };
  };
  render();
}

// Season: play every other club, then a Grand Final
function seasonClub(r){ const others=CLUBS.map((_,i)=>i).filter(i=>i!==S.club); return r<17?others[r]:others[(S.club*7)%17]; }
const roundName = r => r<17?`Round ${r+1}`:"Grand Final";
const roundDiff = r => r<17?Math.min(5,1+Math.floor(r*5/17)):5;
function openMatch(){
  let h=`<h2>Match Day</h2><div style="text-align:center">🏆 ${S.trophies} · ${league(S.trophies)}</div>`;
  const cost=50*th();
  h+=`<div style="text-align:center;margin:10px 0"><button class="btn gold" id="findMatch" style="font-size:20px">🔎 Find a Match<small>${cost} 🥧 · random club, win trophies & loot</small></button></div>`;
  h+=`<h3>Season Fixture</h3><div class="fixture">`;
  for(let r=0;r<18;r++){ const c=CLUBS[seasonClub(r)], st=S.season[r], open=r===0||S.season[r-1]>0;
    h+=`<div class="fx ${open?"":"locked"}"><span class="rd">${r<17?"R"+(r+1):"🏆 GF"}</span><span class="guernsey" style="width:24px;height:28px;background:${jersey(c)}"></span><span class="nm">${c.name}<br><small style="color:#6b5434">Clubhouse ${roundDiff(r)}</small></span><span class="st">${"★".repeat(st)}${"☆".repeat(3-st)}</span>${open?`<button class="btn green" data-r="${r}">Play</button>`:"🔒"}</div>`; }
  h+="</div>";
  modal(h);
  $("findMatch").onclick=()=>{ if(!Object.values(S.army).some(n=>n>0)) return toast("Train some players first!"); if(!pay("pies",cost)) return toast("Not enough 🥧");
    let c; do{ c=Math.random()*18|0; }while(c===S.club); const d=Math.max(1,Math.min(5,th()+(Math.random()*3|0)-1));
    closeModal(); startBattle({kind:"match",club:c,d,seed:Math.random()*1e9|0}); };
  document.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{ const r=+b.dataset.r; if(!Object.values(S.army).some(n=>n>0)) return toast("Train some players first!"); closeModal(); startBattle({kind:"season",round:r,club:seasonClub(r),d:roundDiff(r),seed:1000+r*77+S.club}); });
}
function openInfo(b){
  const d=BLD[b.t], i=b.lv-1;
  const rows=[["Hitpoints",d.hp[i]]];
  if(d.rate&&d.makes) rows.push(["Makes",`${d.rate[i]} ${resIcon(d.makes)}/min`],["Holds",d.cap[i]]);
  if(d.stores) rows.push(["Storage",`${fmt(d.cap[i])} ${resIcon(d.stores)}`]);
  if(d.store) rows.push(["Storage",`${fmt(d.store[i])} each`]);
  if(d.dps) rows.push(["Damage/sec",d.dps[i]],["Range",`${d.minr?d.minr+"–":""}${d.range} tiles`]);
  if(d.space) rows.push(["Squad space",d.space[i]]);
  if(d.unlock) rows.push(["Unlocks",d.unlock.slice(0,b.lv).map(u=>(UNITS[u]||SPELLS[u]).name).join(", ")]);
  if(d.dmg) rows.push(["Damage",d.dmg[i]]);
  modal(`<h2>${d.name}</h2><p style="text-align:center">${d.desc}</p>${rows.map(([a,v])=>`<div class="stat"><span>${a}</span><b>${v}</b></div>`).join("")}<div class="stat"><span>Level</span><b>${b.lv} / ${d.hp.length}</b></div>`);
}
function showResult(r){
  const win=r.stars>0;
  modal(`<div class="result"><h2>${win?"Victory!":"Siren! Defeat"}</h2><div class="stars">${"★".repeat(r.stars)}<span style="color:#0004;text-shadow:none">${"★".repeat(3-r.stars)}</span></div>
    <div>vs ${r.club} · ${r.p}% destroyed</div><br>
    <div class="stat"><span>Pies</span><b>+${fmt(r.got.pies)} 🥧</b></div><div class="stat"><span>Drink</span><b>+${fmt(r.got.drink)} 💧</b></div>
    <div class="stat"><span>Trophies</span><b>${r.tro>=0?"+":""}${r.tro} 🏆</b></div>${r.medals?`<div class="stat"><span>Season reward</span><b>+${r.medals} 🏅</b></div>`:""}
    ${r.full?`<p>Some loot didn't fit. Build more storage!</p>`:""}<br><button class="btn green" id="goHome" style="font-size:20px">Return Home</button></div>`,{noClose:true});
  $("goHome").onclick=()=>{ closeModal(); leaveBattle(); };
}
function openSettings(){
  modal(`<h2>Settings</h2><p>Your club: <b>${myClub().name}</b></p><p>Progress saves on this device automatically.</p><button class="btn red" id="reset">Start over (new club)</button>`);
  $("reset").onclick=()=>{ if(confirm("Wipe your ground and start again?")){ try{localStorage.removeItem(SAVE_KEY);}catch(e){} S=null; selected=null; closeModal(); showClubPicker(); } };
}

$("btnShop").onclick=()=>openShop();
$("btnSquad").onclick=()=>openSquad();
$("btnAttack").onclick=openMatch;
$("btnSettings").onclick=openSettings;
$("placeYes").onclick=confirmPlace;
$("placeNo").onclick=()=>{ placing=null; refreshUI(); };
$("bEnd").onclick=()=>{ if(!BT.started||confirm("End the match now?")) endBattle(); };
$("bAbility").onclick=useAbility;

// ---------- touch / mouse ----------
const ptrs=new Map(); let gesture=null;
const toCanvas = e => [e.clientX*W/innerWidth, e.clientY*H/innerHeight];
function hitHome(gx,gy){
  const x=Math.floor(gx), y=Math.floor(gy);
  for(const b of S.buildings){ const s=BLD[b.t].size; if(x>=b.x&&x<b.x+s&&y>=b.y&&y<b.y+s) return b; }
  return S.obstacles.find(o=>o.x===x&&o.y===y)||null;
}
cv.addEventListener("pointerdown",e=>{
  cv.setPointerCapture(e.pointerId); const [px,py]=toCanvas(e); ptrs.set(e.pointerId,{x:px,y:py,sx:px,sy:py,t:performance.now()});
  if(ptrs.size===2){ const [a,b]=[...ptrs.values()]; gesture={k:"pinch",d:Math.hypot(a.x-b.x,a.y-b.y),z:cam.z}; return; }
  const [gx,gy]=unIso(px,py);
  gesture={k:"tap",gx,gy};
  if(mode==="home"&&S){
    if(placing&&!placing.moving){ const s=BLD[placing.t].size; if(gx>=placing.x&&gx<placing.x+s&&gy>=placing.y&&gy<placing.y+s) gesture={k:"ghost",ox:gx-placing.x,oy:gy-placing.y}; }
    else if(selected&&BLD[selected.t]&&hitHome(gx,gy)===selected) gesture={k:"maybeMove",b:selected,ox:gx-selected.x,oy:gy-selected.y};
  }
  if(mode==="battle"){ gesture.hold=setTimeout(()=>{ if(gesture&&gesture.k==="tap"){ gesture.k="spam"; spamLoop(); } },280); }
});
function spamLoop(){ if(!gesture||gesture.k!=="spam") return; const p=[...ptrs.values()][0]; if(p){ const [gx,gy]=unIso(p.x,p.y); battleTap(gx+(Math.random()-.5)*.6,gy+(Math.random()-.5)*.6); } setTimeout(spamLoop,110); }
cv.addEventListener("pointermove",e=>{
  const p=ptrs.get(e.pointerId); if(!p) return; const [px,py]=toCanvas(e); const dx=px-p.x, dy=py-p.y; p.x=px; p.y=py;
  if(!gesture) return;
  if(gesture.k==="pinch"&&ptrs.size===2){ const [a,b]=[...ptrs.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); zoomAt((a.x+b.x)/2,(a.y+b.y)/2,gesture.z*d/gesture.d); return; }
  const moved=Math.hypot(px-p.sx,py-p.sy)>10*(W/innerWidth);
  if(gesture.k==="spam") return;
  if(gesture.k==="ghost"){ const [gx,gy]=unIso(px,py); placing.x=Math.round(gx-gesture.ox); placing.y=Math.round(gy-gesture.oy); return; }
  if(gesture.k==="maybeMove"&&moved){ const b=gesture.b; placing={t:b.t,x:b.x,y:b.y,moving:b}; gesture.k="move"; refreshUI(); }
  if(gesture.k==="move"){ const [gx,gy]=unIso(px,py); placing.x=Math.round(gx-gesture.ox); placing.y=Math.round(gy-gesture.oy); return; }
  if(gesture.k==="tap"&&moved){ clearTimeout(gesture.hold); gesture.k="pan"; }
  if(gesture.k==="pan"){ cam.x+=dx; cam.y+=dy; clampCam(); }
});
function endPtr(e){
  const p=ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if(!gesture) return;
  if(gesture.k==="pinch"){ if(ptrs.size===0) gesture=null; return; }
  clearTimeout(gesture.hold);
  if(gesture.k==="tap"){ if(mode==="home") homeTap(gesture.gx,gesture.gy); else battleTap(gesture.gx,gesture.gy); }
  if(gesture.k==="move"){ const b=gesture.b; if(footprintFree(placing.x,placing.y,BLD[b.t].size,b)){ b.x=placing.x; b.y=placing.y; save(); } else toast("Can't move it there"); placing=null; refreshUI(); }
  gesture=null;
}
cv.addEventListener("pointerup",endPtr); cv.addEventListener("pointercancel",endPtr);
cv.addEventListener("wheel",e=>{ e.preventDefault(); const [px,py]=toCanvas(e); zoomAt(px,py,cam.z*(e.deltaY<0?1.12:1/1.12)); },{passive:false});
function zoomAt(px,py,z){ const [wx,wy]=unIso(px,py); setZoom(z); const [sx,sy]=iso(wx,wy); cam.x+=px-sx; cam.y+=py-sy; clampCam(); }
function homeTap(gx,gy){
  if(!S) return;
  if(placing){ const s=BLD[placing.t].size; placing.x=Math.round(gx-s/2); placing.y=Math.round(gy-s/2); return; }
  const h=hitHome(gx,gy);
  if(h&&BLD[h.t]&&BLD[h.t].makes&&!h.busy&&h.store>=1&&selected!==h){ collect(h); }
  selected = h===selected?null:h; refreshUI();
}

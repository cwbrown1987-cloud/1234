// ---------- HUD, menus and touch controls ----------
const $ = id => document.getElementById(id);
const fmt = n => n>=1e6 ? (n/1e6).toFixed(n>=1e7?0:1)+"M" : n>=100000 ? Math.round(n/1000)+"k" : Math.floor(n).toLocaleString();
let tt; function toast(s){ const t=$("toast"); t.textContent=s; t.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove("show"),2200); }
const jersey = c => `linear-gradient(90deg,${c.a} 0 34%,${c.b} 34% 66%,${c.a} 66%)`;
const badgeImg = (c,cls="") => `<img class="badgeimg ${cls}" src="${badgeURL(c,96)}" alt="">`;

// ---------- icons ----------
const iconCache={};
// Gold star in the corner so placeholder Hero Hall heroes stand out from normal players.
function heroStarBadge(g,hk){ if(!hk||hk==="captain"||hk==="coach") return;
  g.save(); g.font="bold 26px sans-serif"; g.textAlign="center"; g.textBaseline="middle"; g.lineWidth=4; g.strokeStyle="#000a"; g.strokeText("★",80,16); g.fillStyle="#ffd34d"; g.fillText("★",80,16); g.restore(); }
function playerIcon(kind, club){
  club=club||myClub(); const key=kind+club.abbr;
  if(iconCache[key]) return iconCache[key];
  const c=document.createElement("canvas"); c.width=c.height=96;
  const hk0=kind.startsWith("hero:")?kind.slice(5):null;
  const role=hk0==="coach"?"coach":hk0?HERO_ART[hk0]:kind;
  const likeness=role==="captain" && namedHeroArt[club.abbr];
  const icon=c.getContext("2d");
  if ((likeness && drawArtIcon(likeness,icon,48,96,96,92)) || drawArtIcon("portrait-"+role,icon,48,96,96,92,club) || (UNITS[role]?.air && drawArtIcon(role,icon,48,83,90,76))){ heroStarBadge(icon,hk0); return iconCache[key]=c.toDataURL(); }
  const save={ctx,TW,TH}; ctx=icon; TW=60; TH=30;
  if(kind==="seagulls"){ for(const [dx,dy] of [[0,0],[-14,10],[14,12],[-4,-14]]) gull(48+dx,52+dy,14,dx,1); }
  else if(kind==="blimp") blimp(48,50,{club,face:1,id:0});
  else { const hk=kind.startsWith("hero:")?kind.slice(5):null, pos=hk?HEROES[hk].pos(club):null;
    drawPlayer(48,90,hk?26:kind==="ruck"||kind==="trainer"?27:23,club,{kind:pos==="coach"?"coach":hk?null:kind,hero:!!hk,heroKey:hk,ranged:pos&&HERO_POS[pos].ranged,id:3}); }
  ctx=save.ctx; TW=save.TW; TH=save.TH; heroStarBadge(icon,hk0);
  return iconCache[key]=c.toDataURL();
}
const SPELL_ICON={oranges:"🍊",roar:"📣",freekick:"🟨",rain:"🌧️",sub:"🔁"};
function spellIcon(sp){
  if(iconCache[sp]) return iconCache[sp];
  const c=document.createElement("canvas"); c.width=c.height=96; const g=c.getContext("2d");
  if (!drawArtIcon("icon-"+sp,g,48,91,90,87)) {
    g.font="56px serif"; g.textAlign="center"; g.textBaseline="middle"; g.fillText(SPELL_ICON[sp],48,52);
  }
  return iconCache[sp]=c.toDataURL();
}
// ---------- HUD ----------
function refreshUI(){
  const home=mode==="home", bat=mode==="battle", replay=bat&&BT&&BT.mode==="replay";
  $("homeBtns").classList.toggle("hide",!home||!!placing);
  $("side").classList.toggle("hide",!home||!!placing);
  $("top").classList.toggle("hide",!home);
  $("battleTop").style.display=bat?"flex":"none";
  $("battleBottom").style.display=bat&&!replay?"flex":"none";
  $("replayBar").style.display=replay?"flex":"none";
  if(S){ const c=myClub(); $("clubName").textContent=c.name; $("g").src=badgeURL(c,96); if(refreshUI.hudClub!==S.club&&typeof refreshArtHUD==="function"&&artSprites.size){ refreshUI.hudClub=S.club; refreshArtHUD(); } }
  // weekly events live under Tasks; the banner spot only nags when you have no way to earn pies or drink
  const miss=S&&home&&!placing&&!(typeof tutActive==="function"&&tutActive())?missingIncome():[];
  $("eventBanner").classList.toggle("hide",!miss.length);
  if(miss.length){ $("eventBanner").innerHTML=`⚠️ Build your first <b>${miss.map(t=>BLD[t].name).join(" and ")}</b>, it's free! Tap here`; $("eventBanner").onclick=()=>openShop("Resources"); }
  $("placePanel").style.display=home&&placing&&!placing.moving?"flex":"none";
  if(placing&&!placing.moving){ const d=BLD[placing.t]; $("placeName").textContent=`${d.name} · ${fmt(buildCost(placing.t))} ${resIcon(d.res)}`; }
  const sp=$("selPanel"); sp.innerHTML="";
  if(home&&selected&&!placing){ sp.style.display="flex"; buildSelPanel(sp); } else sp.style.display="none";
  if(bat&&!replay) buildCards();
  if(S&&home){ const u=S.raids.filter(r=>!r.seen).length, tr=tasksReady()||0;
    $("logDot").textContent=u; $("logDot").classList.toggle("hide",!u);
    $("taskDot").textContent=tr; $("taskDot").classList.toggle("hide",!tr);
    const pk=Math.floor((S.tokens||0)/PACK_COST)+(S.prizePacks||0)+(dailyReady()?1:0); $("cardDot").textContent=pk; $("cardDot").classList.toggle("hide",!pk);
    $("lvlBadge").textContent=S.lvl; }
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
    $("seasonCd").textContent=seasonCountdown();
    const sh=S.shield-Date.now(); $("shield").classList.toggle("hide",sh<=0); if(sh>0) $("shield").textContent="🛡️ "+fmtTime(sh/1000);
    const tm=document.querySelector("#selPanel .timer"); if(tm&&selected&&selected.busy){ tm.textContent=fmtTime((selected.busy.end-Date.now())/1000); const sb=document.querySelector("#selPanel .speed small"); if(sb) sb.textContent=speedCost(selected.busy.end)+" 🏅"; }
  } else if(BT){
    const replay=BT.mode==="replay";
    $("bBadge").src=badgeURL(CLUBS[replay?BT.atkClub:BT.club],96);
    $("bVs").textContent=replay?`${BT.raid&&BT.raid.attacker?BT.raid.attacker+" · ":""}${CLUBS[BT.atkClub].name}`:BT.opp?`vs ${BT.opp.name}${BT.opp.bot?" (bot)":""} · ${CLUBS[BT.club].short}`:"vs "+CLUBS[BT.club].name;
    const nx=$("bNext"); if(nx){ nx.style.display=(BT.kind==="pvp"||BT.visit)&&!BT.started&&!replay?"block":"none"; nx.textContent=BT.visit?"⚔️ Attack":"Next ⏭"; }
    $("bEnd").textContent=BT.visit?"🏠 Home":$("bEnd").dataset.sure?"Tap to confirm":"End Match";
    $("cards").style.display=BT.visit?"none":"";
    const clk=document.querySelector(".battleClock"); if(clk) clk.style.visibility=BT.visit?"hidden":"";
    $("bLoot").textContent=BT.visit?"Visiting · tap Attack to take on your mate (¼ loot)":replay?"Replay":(BT.ranked&&BT.fixture?"🏆 "+BT.fixture+" · ":BT.kind==="revenge"?"Revenge! · ":"")+`🥧 ${fmt(Math.max(0,BT.lootTotal.pies-BT.loot.pies)*(BT.lootMul||1))}  💧 ${fmt(Math.max(0,BT.lootTotal.drink-BT.loot.drink)*(BT.lootMul||1))}`;
    const s=starsNow(), sc=scoreNow(), A=CLUBS[BT.atkClub], Hm=CLUBS[BT.club];
    $("bScore").innerHTML=`<div class="${sc.a.p>sc.h.p?"lead":""}">${A.short} <b>${fmtScore(sc.a)}</b></div><div class="${sc.h.p>=sc.a.p?"lead":""}">${Hm.short} <b>${fmtScore(sc.h)}</b></div>`;
    $("bStars").innerHTML="★".repeat(s)+`<span class="dim">${"★".repeat(3-s)}</span>`;
    const t=Math.max(0,Math.ceil(BT.time)); $("bTime").textContent=Math.floor(t/60)+":"+String(t%60).padStart(2,"0");
    $("battleHint").style.display=BT.started||replay||BT.visit||tutActive()?"none":"block";
    const ab=$("abilities"); const want=replay?[]:Object.keys(BT.heroU).filter(h=>BT.heroU[h].hp>0&&!BT.abilityUsed[h]);
    if(ab.dataset.k!==want.join()){ ab.dataset.k=want.join(); ab.innerHTML=""; for(const h of want){ const b=document.createElement("button"); b.className="btn gold"; b.textContent="⚡ "+BT.heroStat(h).ability; b.onclick=()=>useAbility(h); ab.append(b); } }
  }
}

function buildSelPanel(sp){
  const o=selected;
  if(!BLD[o.t]){ const d=obsInfo(o); sp.innerHTML=`<div class="title">${d.name}${o.busy?" · clearing…":""}</div><div class="acts"></div>`; if(o.busy) return; addBtn(sp,"btn gold",`Clear<small>${fmt(d.cost)} ${resIcon(d.res)}</small>`,()=>removeObstacle(o)); return; }
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
  if(o.t==="locker"||o.t==="office"||o.t==="herohall") addBtn(sp,"btn","⭐<small>Heroes</small>",()=>openSquad("Heroes"));
}
function addBtn(sp,cls,html,fn,dis){ const b=document.createElement("button"); b.className=cls; b.innerHTML=html; b.onclick=e=>{e.stopPropagation(); sfx("tap",.4); fn();}; if(dis) b.setAttribute("disabled",""); sp.querySelector(".acts").append(b); return b; }

function buildCards(){
  const box=$("cards"); box.innerHTML="";
  const card=(cls,img,n,label,sel,on,empty)=>{ const b=document.createElement("button"); b.className="cardbtn "+cls+(sel?" sel":"")+(empty?" empty":""); b.innerHTML=`<img src="${img}"><span class="n">${n}</span><span class="l">${label}</span>`; b.onclick=on; box.append(b); };
  const isSel=(k,v)=>BT.sel&&BT.sel.k===k&&BT.sel.v===v;
  for(const u of Object.keys(UNITS)){ const had=BT.had[u]||0; if(!had) continue; const n=BT.left[u]||0;
    card(UNITS[u].air?"air":"",playerIcon(u),"x"+n,UNITS[u].name,isSel("unit",u),()=>{BT.sel={k:"unit",v:u};buildCards();},!n); }
  for(const h of heroPicked()){ const st=heroStats(h);
    card("hero",playerIcon("hero:"+h),S.heroes[h].busy?"🔧":"",st.name.split(" ").pop(),isSel("hero",h),()=>{ if(BT.heroesLeft[h]){BT.sel={k:"hero",v:h};buildCards();} },!BT.heroesLeft[h]); }
  for(const sp of Object.keys(SPELLS)){ const had=BT.hadSpells[sp]||0; if(!had) continue; const n=BT.spellsLeft[sp]||0;
    card("spell",spellIcon(sp),"x"+n,SPELLS[sp].name.split(" ").pop(),isSel("spell",sp),()=>{BT.sel={k:"spell",v:sp};buildCards();},!n); }
}

// ---------- modals ----------
let modalTick=null;
function modal(html, opts={}){ $("modal").querySelector(".card").classList.remove("albummode"); $("modalBody").innerHTML=html; $("modal").classList.add("show"); $("modalX").style.display=opts.noClose?"none":"block"; modalTick=opts.tick||null; }
function closeModal(){ $("modal").classList.remove("show"); modalTick=null; refreshUI(); }
setInterval(()=>{ if(modalTick&&$("modal").classList.contains("show")) modalTick(); },1000);
$("modalX").onclick=closeModal;
$("modal").addEventListener("pointerdown",e=>{ if(e.target.id==="modal"&&$("modalX").style.display!=="none") closeModal(); });
const tabsHTML=(tabs,on)=>`<div class="tabs">${tabs.map(t=>`<button class="${t===on?"on":""}" data-tab="${t}">${t}</button>`).join("")}</div>`;
const bindTabs=fn=>document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{ sfx("tap",.4); fn(b.dataset.tab); });

function showClubPicker(){
  modal(`<h2>Pick your club</h2><p class="center">Build your ground, train your squad and take on the rest of the league.</p><p class="center tiny">Unofficial fan game. Not affiliated with the AFL or its clubs.</p><div class="clubs" id="clubList"></div>`,{noClose:true});
  CLUBS.forEach((c,i)=>{ const b=document.createElement("button"); b.innerHTML=`${badgeImg(c)}<span>${c.name}<small>⭐ ${c.hero.name}</small></span>`;
    b.onclick=()=>{ newGame(i); closeModal(); cam.x=0; cam.y=0; setZoom(1); refreshUI(); sfx("cheer"); showTutorialChoice(); }; $("clubList").append(b); });
}

let shopTab="Resources";
function openShop(tab){
  shopTab=tab||shopTab;
  modal(`<h2>Shop</h2>${tabsHTML(Object.keys(SHOP_TABS),shopTab)}<div class="grid" id="shopGrid"></div>`);
  bindTabs(openShop); tut("shop"); tut("tab-"+shopTab);
  const g=$("shopGrid");
  if(shopTab==="Deals") return shopDeals(g);
  for(const t of SHOP_TABS[shopTab]){
    const d=BLD[t], st=shopStatus(t);
    const it=document.createElement("div"); it.className="item"+(st.ok?"":" off"); it.dataset.t=t;
    it.append(thumb(t,myClub()));
    it.insertAdjacentHTML("beforeend",`<button class="ibtn" aria-label="What is the ${d.name}?">i</button><div class="nm">${d.name}</div><div class="clash">(${CLASH_NAME[t]})</div><div class="meta">Built ${st.have}/${st.lim||MAXC[t][th()-1]}${d.time[0]?" · ⏱ "+fmtTime(d.time[0]):""}</div>`+
      (st.ok?(st.cost===0?`<div class="cost free">FREE</div>`:`<div class="cost ${st.afford?"":"bad"}">${fmt(st.cost)} ${resIcon(st.res)}</div>`):`<div class="cost bad">${st.why}</div>`));
    it.onclick=()=>{ if(!st.ok) return toast(st.why); closeModal(); startPlacing(t); };
    it.querySelector(".ibtn").onclick=e=>{ e.stopPropagation(); shopInfo(t); };
    g.append(it);
  }
}
function shopDeals(g){
  for(const r of ["pies","drink"]){
    const it=document.createElement("div"); it.className="item"; const room=Math.max(0,capOf(r)-S[r]), amt=Math.floor(room*.25), cost=Math.max(15,Math.ceil(amt/120));
    it.innerHTML=`<div class="pack" style="--pc:${r==="pies"?"#e9a92a":"#1aa3d6"}">${resIcon(r)}</div><div class="nm">Top up ${r==="pies"?"pies":"drink"}</div><div class="meta">+${fmt(amt)} (a quarter of your free space)</div><div class="cost ${S.medals>=cost?"":"bad"}">${cost} 🏅</div>`;
    it.onclick=()=>{ if(amt<1) return toast("Storage is already full"); if(!pay("medals",cost)) return toast("Not enough Brownlow votes 🏅"); addRes(r,amt); sfx("collect"); save(); openShop("Deals"); };
    g.append(it);
  }
}

let squadTab="Train";
function openSquad(tab){
  squadTab=tab||squadTab;
  const render=()=>{
    let h=`<h2>Squad</h2>${tabsHTML(["Train","Spells","Heroes","Coaching"],squadTab)}`;
    if(squadTab==="Train"){
      const cap=armySpace(), used=usedSpace();
      h+=`<div>Squad size: <b>${used}</b> / ${cap} <span class="tiny">· training is free and instant, like Clash</span></div><div class="bar"><div style="width:${100*used/Math.max(1,cap)}%"></div></div>`;
      h+=`<div class="armyrow" id="q">${Object.entries(S.army).filter(([,n])=>n>0).map(([u,n])=>`<span class="chip q" data-rm="${u}"><img src="${playerIcon(u)}">${n} ✖</span>`).join("")||"<i>No players yet. Tap a player below to add them.</i>"}</div>`;
      h+=`<h3>Train players</h3><div class="grid">`;
      const un=unlockedUnits();
      for(const [k,u] of Object.entries(UNITS)){ const ok=un.includes(k), lv=S.unitLv[k], c=unitCost(k);
        h+=`<div class="item ${ok?"":"off"}" data-u="${k}"><img src="${playerIcon(k)}"><div class="nm">${u.name} <small>Lv${lv}</small>${u.air?' <span class="tag">AIR</span>':""}</div><div class="meta">${u.desc}</div><div class="meta">👥 ${u.space} bench space</div>${ok?`<div class="cost free">FREE</div>`:`<div class="cost bad">Training Oval ${BLD.oval.unlock.indexOf(k)+1}</div>`}</div>`; }
      h+="</div>";
    }
    if(squadTab==="Spells"){
      const slots=spellSlots();
      if(!slots) h+=`<p>Build a <b>Physio Room</b> (Clubhouse 3) to brew spells.</p>`;
      else{
        h+=`<div>Spells: <b>${spellCount()}</b> / ${slots}</div><div class="armyrow">${Object.entries(S.spells).filter(([,n])=>n>0).map(([s,n])=>`<span class="chip q" data-unbrew="${s}"><img src="${spellIcon(s)}">${n} ✖</span>`).join("")}</div>`;
        h+=`<p class="tiny">Tap a spell to remove it. Brewing is free and instant.</p><h3>Brew</h3><div class="grid">`;
        const un=unlockedSpells();
        for(const [k,s] of Object.entries(SPELLS)){ const ok=un.includes(k); h+=`<div class="item ${ok?"":"off"}" data-s="${k}"><img src="${spellIcon(k)}"><div class="nm">${s.name}</div><div class="meta">${s.desc}</div>${ok?`<div class="cost free">FREE</div>`:`<div class="cost bad">Physio Room ${BLD.physio.unlock.indexOf(k)+1}</div>`}</div>`; }
        h+="</div>";
      }
    }
    if(squadTab==="Heroes"){
      if(typeof kitRoom==="function"&&kitRoom()) h+=oreBar();
      const picked=heroPicked();
      h+=`<div class="tiny">Pick up to <b>${HERO_SLOTS}</b> heroes to take into each match (${picked.length}/${HERO_SLOTS} picked).</div>`;
      for(const hk of Object.keys(HEROES)){
        const hs=heroStats(hk), c=myClub(), st=S.heroes[hk], H=HEROES[hk];
        h+=`<div class="herocard"><img src="${playerIcon("hero:"+hk)}" style="background:${jersey(c)}"><div>
          <div style="font-size:20px">${hs.name}</div><div class="tiny">${POS_NAME[hs.pos]} · Level <b>${st.lv}</b> / ${Math.max(1,heroMax(th(),hk))}</div>
          <div>❤️ ${hs.hp} · 💥 ${hs.dps}/s</div><div class="tiny">⚡ <b>${hs.ability}</b>: ${hs.desc}</div>`;
        if(heroHome(hk)) h+=`<button class="btn ${picked.includes(hk)?"green":""}" data-hpick="${hk}">${picked.includes(hk)?"✅ In the team":"Pick for matches"}</button> `;
        if(!heroHome(hk)) h+=`<div class="tiny bad">${H.hhLv>1?`Upgrade your ${BLD[H.building].name} to level ${H.hhLv}`:`Build a ${BLD[H.building].name}`} (Clubhouse ${H.th}) to unlock.</div>`;
        else if(st.busy) h+=`<div>Training… ${fmtTime((st.busy.end-Date.now())/1000)}</div><button class="btn green" data-hs="${hk}">Finish now · ${speedCost(st.busy.end)} 🏅</button>`;
        else if(st.lv>=heroMax(th(),hk)) h+=`<div class="tiny">Upgrade your Clubhouse to train further.</div>`;
        else h+=`<button class="btn gold" data-hu="${hk}">⬆ ${fmt(heroCost(st.lv))} 💧 · ${fmtTime(heroTime(st.lv))}</button>`;
        h+=`</div></div>`;
        if(heroHome(hk)&&Object.values(GEAR).some(g=>g.hero===hk)) h+=`<h3>${H.name(c).split(" ").pop()}'s gear <small class="tiny">(2 at a time)</small></h3>`+gearHTML(hk);
      }
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
    const sc=$("modalBody").parentElement.scrollTop;
    modal(h,{tick:render}); $("modalBody").parentElement.scrollTop=sc;
    bindTabs(t=>{ squadTab=t; render(); }); tut("squad");
    document.querySelectorAll("[data-u]").forEach(el=>el.onclick=()=>{ const k=el.dataset.u; if(!unlockedUnits().includes(k)) return toast("Upgrade your Training Oval to unlock"); trainUnit(k); render(); });
    document.querySelectorAll("[data-rm]").forEach(el=>el.onclick=()=>{ untrain(el.dataset.rm); render(); });
    document.querySelectorAll("[data-unbrew]").forEach(el=>el.onclick=()=>{ unbrew(el.dataset.unbrew); render(); });
    document.querySelectorAll("[data-s]").forEach(el=>el.onclick=()=>{ if(!unlockedSpells().includes(el.dataset.s)) return toast("Upgrade your Physio Room"); brewSpell(el.dataset.s); render(); });
    document.querySelectorAll("[data-r]").forEach(el=>el.onclick=()=>{ startResearch(el.dataset.r); render(); });
    if(typeof bindGear==="function") bindGear(render);
    document.querySelectorAll("[data-hu]").forEach(el=>el.onclick=()=>{ upgradeHero(el.dataset.hu); render(); });
    document.querySelectorAll("[data-hpick]").forEach(el=>el.onclick=()=>{ toggleHeroPick(el.dataset.hpick); render(); });
    document.querySelectorAll("[data-hs]").forEach(el=>el.onclick=()=>{ const st=S.heroes[el.dataset.hs]; if(pay("medals",speedCost(st.busy.end))){ st.busy.end=Date.now(); processTimers(); } else toast("Not enough Brownlow votes 🏅"); render(); });
  };
  render();
}

// ---------- tasks / log / match ----------
function openTasks(){
  ensureDaily();
  let h=`<h2>Daily Tasks</h2><p class="center tiny">New tasks every day. Finish all three for a bonus Silver Pack.</p>`;
  S.daily.tasks.forEach((t,i)=>{ const T=TASKS.find(x=>x.k===t.k), done=t.n>=t.goal;
    h+=`<div class="task"><div class="grow"><div>${T.text(t.goal)}</div><div class="bar"><div style="width:${100*t.n/t.goal}%"></div></div><div class="tiny">${fmt(t.n)} / ${fmt(t.goal)}</div></div>${t.claimed?"✅":`<button class="btn ${done?"green":""}" data-claim="${i}" ${done?"":"disabled"}>+3 🏅</button>`}</div>`; });
  h+=`<h3>This week</h3>${[1,2,3,4,5,6,0].map(d=>{ const e=EVENTS[d], nm=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]; return `<div class="stat ${d===new Date().getDay()?"today":""}"><span>${nm}</span><b>${e?e.name+" · "+e.desc:"–"}</b></div>`; }).join("")}`;
  modal(h);
  document.querySelectorAll("[data-claim]").forEach(b=>b.onclick=()=>{ claimTask(+b.dataset.claim); openTasks(); });
}
function openLog(){
  let h=`<h2>Home Games</h2><p class="center tiny">Clubs that came to your ground while you were away.</p>`;
  if(!S.raids.length) h+=`<p class="center">No visitors yet. They will come…</p>`;
  for(const r of S.raids){ const c=CLUBS[r.club]||CLUBS[0], ago=fmtTime((Date.now()-r.at)/1000);
    const who=r.attacker?`${esc(r.attacker)}${r.real?"":' <span class="tag bot">BOT</span>'} <small>${c.short}</small>`:c.name;
    h+=`<div class="raid ${r.stars?"lost":"won"}">${badgeImg(c)}<div class="grow"><div><b>${who}</b> ${r.friendly?'<span class="tag fr">FRIENDLY</span>':r.friend?'<span class="tag fr">FRIEND</span>':""} ${r.seen?"":'<span class="tag">NEW</span>'}</div>
      <div class="tiny">${ago} ago · ${r.sc?`${c.short} ${fmtScore(r.sc.a)} v ${myClub().short} ${fmtScore(r.sc.h)}`:r.pct+"% destroyed"} · <span class="stars">${"★".repeat(r.stars)}<span class="dim">${"★".repeat(3-r.stars)}</span></span></div>
      <div class="tiny">${r.stars?`Lost 🥧 ${fmt(r.lost.pies)} 💧 ${fmt(r.lost.drink)}`:"Defence win!"} · ${r.tro>0?"+":""}${r.tro} 🏆</div></div>
      <div class="col"><button class="btn blue" data-replay="${r.id}">▶ Replay</button>${r.stars&&!r.revenged&&!r.friendly&&!r.friend?`<button class="btn red" data-rev="${r.id}">Revenge</button>`:""}</div></div>`; }
  modal(h);
  S.raids.forEach(r=>r.seen=true); save(); uiDirty=true;
  document.querySelectorAll("[data-replay]").forEach(b=>b.onclick=()=>watchReplay(S.raids.find(r=>r.id==b.dataset.replay)));
  document.querySelectorAll("[data-rev]").forEach(b=>b.onclick=()=>{ if(!Object.values(S.army).some(n=>n>0)) return toast("Train some players first!"); revenge(S.raids.find(r=>r.id==b.dataset.rev)); });
}
function showReplayEnd(){
  const r=BT.raid; modal(`<div class="result"><h2>${r.stars?"They got you":"You held them off"}</h2><div class="stars">${"★".repeat(r.stars)}<span class="dim">${"★".repeat(3-r.stars)}</span></div><div>${CLUBS[r.club].name} · ${r.pct}% destroyed</div><br>${r.stars&&!r.revenged?`<button class="btn red" id="rv2">Get Revenge</button> `:""}<button class="btn green" id="goHome">Back Home</button></div>`,{noClose:true});
  $("goHome").onclick=()=>{ closeModal(); leaveBattle(); };
  const rv=$("rv2"); if(rv) rv.onclick=()=>{ closeModal(); leaveBattle(); revenge(r); };
}
function openMatch(){
  let h=`<h2>Match Day</h2><div class="center">🏆 ${S.trophies} · ${league(S.trophies)}${S.shield>Date.now()?` · <span class="tiny">attacking ends your shield</span>`:""}</div>`;
  const cost=50*th();
  const online=typeof signedIn==="function"&&signedIn();
  const sb=S.starBonus||{stars:0,until:0}, sbWait=sb.until>Date.now();
  h+=`<div class="starbonus"><span>⭐ Star Bonus</span><div class="bar"><div style="width:${Math.min(100,100*sb.stars/STAR_GOAL)}%"></div></div><span>${Math.min(sb.stars,STAR_GOAL)}/${STAR_GOAL}${sbWait?` · ready in ${fmtTime((sb.until-Date.now())/1000)}`:""}</span></div>
    <p class="tiny center">Win 5 stars in Battles or Ranked for +${fmt(starBonusLoot().pies)} 🥧 and +${fmt(starBonusLoot().drink)} 💧. Resets 24 hours after you collect.</p>`;
  h+=`<div class="modes"><button class="btn gold big" id="findMatch">⚔️ Battle<small>${cost} 🥧 · loot and Star Bonus, no trophies</small></button>
    <button class="btn blue big" id="findRanked">🏆 Ranked<small>${cost} 🥧 · trophies, and it counts on the Season ladder</small></button></div>`;
  if(typeof NET!=="undefined"&&NET.online) h+= online?`<div class="center tiny">Playing online as <b>${esc(NET.user.name)}</b> · <a href="#" id="lbLink">Leaderboard</a></div>`:`<div class="banner">Play real people and climb the leaderboard. <button class="btn green" id="goOnline">Play online</button></div>`;
  ensureSeason(); const s=S.season, f=nextFixture(), pos=ladderPos(S.club), L=s.ladder[S.club];
  h+=`<h3>Season ${s.year}${S.premierships?` · 🏆×${S.premierships}`:""}</h3><div class="seasonbar"><span>${s.finals?"Finals":`Round ${Math.min(s.round+1,ROUNDS)} of ${ROUNDS}`}</span><span>${L.w+L.l+L.d?`${ordinal(pos)} on the ladder · ${L.w}W ${L.l}L${L.d?" "+L.d+"D":""}`:"First bounce coming up"}</span><button class="btn blue" id="ladder">Ladder</button></div>`;
  if(f) h+=`<div class="fx next"><span class="nm"><small>Next Ranked match is</small><br><b>${f.name}${f.final?" 🔥":""}</b><br><small>Only Ranked matches count on the ladder. Battles don't.</small></span><button class="btn blue big" id="playRound">🏆 Play</button></div>`;
  else h+=`<div class="fx next"><span class="nm">${s.premiers?"🏆 <b>Premiers!</b> What a season.":`Season over. You finished ${ordinal(s.place||pos)}.`}</span><button class="btn gold" id="newSeason">Start Season ${s.year+1}</button></div>`;
  if(s.results.length) h+=`<div class="fixture">${[...s.results].reverse().slice(0,6).map(r=>`<div class="fx"><span class="wl ${r.res}">${r.res}</span>${badgeImg(CLUBS[r.club],"sm")}<span class="nm"><small>${r.name}</small><br>${fmtScore(r.my)} – ${fmtScore(r.their)}</span></div>`).join("")}</div>`;
  modal(h); tut("match");
  const lb=$("lbLink"); if(lb) lb.onclick=e=>{ e.preventDefault(); openSocial("Leaderboard"); };
  const go=$("goOnline"); if(go) go.onclick=()=>openAccount();
  const find=ranked=>{ if(online) return findOnlineMatch([],ranked);
    if(!Object.values(S.army).some(n=>n>0)) return toast("Train some players first!"); if(!tutActive()&&!pay("pies",cost)) return toast("Not enough 🥧");
    let c; do{ c=Math.random()*18|0; }while(c===S.club); const d=Math.max(1,Math.min(MAX_TH,th()+(tutActive()?-1:ranked?(Math.random()*3|0)-1:0)));
    closeModal(); startBattle({kind:"match",ranked,club:c,d,seed:Math.random()*1e9|0}); };
  $("findMatch").onclick=()=>find(false); $("findRanked").onclick=()=>find(true);
  const pr=$("playRound"); if(pr) pr.onclick=()=>find(true);
  $("ladder").onclick=openLadder; const ns=$("newSeason"); if(ns) ns.onclick=startNextSeason;
}
function openInfo(b){
  const d=BLD[b.t], i=b.lv-1;
  const rows=[["Hitpoints",fmt(d.hp[i])]];
  if(d.makes) rows.push(["Makes",`${d.rate[i]} ${resIcon(d.makes)}/min`],["Holds",fmt(d.cap[i])]);
  if(d.stores) rows.push(["Storage",`${fmt(d.cap[i])} ${resIcon(d.stores)}`]);
  if(d.store) rows.push(["Storage",`${fmt(d.store[i])} each`]);
  if(d.dps) rows.push(["Damage/sec",d.dps[i]],["Range",`${d.minr?d.minr+"–":""}${d.range} tiles`],["Targets",[d.ground&&"Ground",d.air&&"Air"].filter(Boolean).join(" & ")]);
  if(d.space) rows.push(["Squad space",d.space[i]]);
  if(d.unlock) rows.push(["Unlocks",d.unlock.slice(0,b.lv).map(u=>(UNITS[u]||SPELLS[u]).name).join(", ")]);
  if(d.dmg) rows.push(["Damage",d.dmg[i]]);
  modal(`<h2>${d.name}</h2><p class="center">${d.desc}</p>${rows.map(([a,v])=>`<div class="stat"><span>${a}</span><b>${v}</b></div>`).join("")}<div class="stat"><span>Level</span><b>${b.lv} / ${levels(b.t)}</b></div>`);
}
function scoreboard(away,home,sc){ return `<div class="board"><div class="${sc.a.p>sc.h.p?"won":""}">${badgeImg(away,"sm")}<span>${away.short}</span><b>${fmtScore(sc.a)}</b></div><div class="${sc.h.p>=sc.a.p?"won":""}">${badgeImg(home,"sm")}<span>${home.short}</span><b>${fmtScore(sc.h)}</b></div></div>`; }
function showResult(r){
  const win=r.stars>0, margin=Math.abs(r.sc.a.p-r.sc.h.p), draw=r.sc.a.p===r.sc.h.p;
  modal(`<div class="result"><h2>${draw?"It's a draw!":win?"You win!":"Siren. You lost"}</h2>${r.opp?`<div class="tiny">${r.friendly?"Friendly ":BT&&BT.kind==="friend"?"Friend match (¼ loot) ":""}vs ${esc(r.opp.name)}${r.opp.bot?" (bot)":""}</div>`:""}
    <div class="tiny">${r.fixture?r.fixture+" · ":""}${draw?"Scores level":"by "+margin+" point"+(margin===1?"":"s")} · ${r.p}% knocked down</div>
    ${scoreboard(r.away,r.home,r.sc)}
    <div class="stars">${"★".repeat(r.stars)}<span class="dim">${"★".repeat(3-r.stars)}</span></div>
    ${r.season&&r.season.note?`<p class="note">${r.season.note}</p>`:""}
    <div class="stat"><span>Pies</span><b>+${fmt(r.got.pies)} 🥧</b></div><div class="stat"><span>Drink</span><b>+${fmt(r.got.drink)} 💧</b></div>
    ${r.ranked?`<div class="stat"><span>Trophies</span><b>${r.tro>=0?"+":""}${r.tro} 🏆</b></div>`:""}
    ${r.starRes?`<div class="stat"><span>⭐ Star Bonus</span><b>+${fmt(r.starRes.pies)} 🥧 +${fmt(r.starRes.drink)} 💧</b></div>`:r.stars&&["match","pvp","revenge"].includes(BT&&BT.kind)?`<div class="stat"><span>⭐ Star Bonus</span><b>${Math.min(S.starBonus.stars,STAR_GOAL)}/${STAR_GOAL} stars</b></div>`:""}${r.medals?`<div class="stat"><span>Win bonus</span><b>+${r.medals} 🏅</b></div>`:""}
    ${r.tokens?`<div class="stat"><span>Reward</span><b>+${r.tokens} 🎟️ Footy Token · ${S.tokens||0} total</b></div>`:""}
    ${r.full?`<p>Some loot didn't fit. Build more storage!</p>`:""}<br>
    ${(S.tokens||0)>=PACK_COST?`<button class="btn gold" id="openNow">Card Album</button> `:""}<button class="btn green" id="goHome">Return Home</button></div>`,{noClose:true});
  $("goHome").onclick=()=>{ closeModal(); leaveBattle(); tut("home"); };
  const on=$("openNow"); if(on) on.onclick=()=>{ closeModal(); leaveBattle(); openAlbum(); };
}
function openSettings(){
  const acct = !NET.online ? `<div class="stat"><span>Online play</span><span class="tiny">on footy-fortress.pages.dev</span></div>`
    : signedIn() ? `<div class="stat"><span>Signed in as <b>${esc(NET.user.name)}</b><br><small>${esc(NET.user.email||"")}</small></span><button class="btn" id="signOut">Sign out</button></div>`
    : `<div class="stat"><span>Save online · play real people</span><button class="btn green" id="signIn">Sign in / Sign up</button></div>`;
  modal(`<h2>Settings</h2><p>Your club: <b>${myClub().name}</b></p>${acct}
    <div class="stat"><span>Sound effects</span><button class="btn ${S.sound?"green":""}" id="snd">${S.sound?"On":"Off"}</button></div>
    <p class="tiny">Club logos: put PNG files named after each club (for example <code>coll.png</code> or <code>wb.png</code>) in the <code>logos</code> folder next to the game and they replace the badges.</p>
    <div class="stat"><span>Tutorials</span><span><button class="btn green" id="tutAgain">Walkthrough</button> <button class="btn gold" id="clashG">Clash guide</button></span></div>
    <div class="stat"><span>Play it like an app</span><button class="btn blue" id="instBtn">Install</button></div>
    <div class="stat"><span>Version ${VERSION}</span><button class="btn gold" id="updBtn">Check for updates</button></div>
    <p class="tiny">Progress saves on this device automatically.</p><button class="btn red" id="reset">Start over (new club)</button>`);
  const so=$("signOut"); if(so) so.onclick=async()=>{ await signOut(); openSettings(); };
  const si=$("signIn"); if(si) si.onclick=()=>openAccount();
  $("updBtn").onclick=()=>{ $("updBtn").textContent="Updating…"; forceUpdate(); };
  $("instBtn").onclick=()=>{ closeModal(); if(isStandalone()) return toast("Already installed!"); showInstall(true); };
  $("tutAgain").onclick=()=>{ closeModal(); TUT.forEach(s=>delete s._prepped); startTutorial(); };
  $("clashG").onclick=()=>showClashGuide(false);
  $("snd").onclick=()=>{ S.sound=!S.sound; save(); audioCtx(); sfx("collect"); openSettings(); };
  $("reset").onclick=()=>{ const b=$("reset"); if(!b.dataset.sure){ b.dataset.sure="1"; b.textContent="Tap again to wipe everything"; return; }
    try{localStorage.removeItem(SAVE_KEY);}catch(e){} S=null; selected=null; closeModal(); showClubPicker(); };
}

$("btnShop").onclick=()=>openShop();
$("btnSquad").onclick=()=>openSquad();
$("btnAttack").onclick=openMatch;
$("btnSettings").onclick=openSettings;
$("btnCards").onclick=()=>openAlbum();
$("btnTasks").onclick=openTasks;
$("btnLog").onclick=openLog;
$("btnSocial").onclick=()=>openSocial();
// (buttons below are optional: a missing one must never stop touch controls from loading)

$("cardsIco").src=cardsButtonIcon();
$("bNext").onclick=()=>{ if(BT&&BT.visit){ const id=BT.opp.id; leaveBattle(); attackPlayer(id,"friend"); } else nextOpponent(); };
$("placeYes").onclick=confirmPlace;
$("placeNo").onclick=()=>{ placing=null; refreshUI(); };
$("bEnd").onclick=()=>{ const b=$("bEnd"); if(BT&&BT.visit){ leaveBattle(); openFriends(); return; }
  if(BT.started&&!b.dataset.sure){ b.dataset.sure="1"; b.textContent="Tap to confirm"; setTimeout(()=>{ delete b.dataset.sure; b.textContent="End Match"; },2500); return; }
  delete b.dataset.sure; b.textContent="End Match"; endBattle(); };
$("rSpeed").onclick=()=>{ BT.speed=BT.speed>=4?1:BT.speed*2; $("rSpeed").textContent=BT.speed+"×"; };
$("rExit").onclick=()=>{ leaveBattle(); openLog(); };

// ---------- touch / mouse ----------
const ptrs=new Map(); let gesture=null;
const toCanvas = e => [e.clientX*W/innerWidth, e.clientY*H/innerHeight];
// What did you tap? Anything whose picture covers the tap counts (like Clash), not just the ground tiles under it.
// The front-most one wins, because it's drawn on top.
function hitHome(gx,gy){
  const [sx,sy]=P(gx,gy); let best=null, bk=-1e9;
  const test=(o,s,h)=>{ const x=o.x,y=o.y, left=P(x,y+s)[0], right=P(x+s,y)[0], bottom=P(x+s,y+s)[1], top=P(x,y)[1]-h*TH;
    const inFoot=gx>=x&&gx<x+s&&gy>=y&&gy<y+s, inPic=sx>=left+TW*.12&&sx<=right-TW*.12&&sy>=top&&sy<=bottom;
    if((inFoot||inPic)&&x+y+s>bk){ bk=x+y+s; best=o; } };
  for(const b of S.buildings){ const s=BLD[b.t].size; test(b,s,b.t==="fence"?.6:BLD[b.t].trap?0:b.t==="clubhouse"?s*1.15:s*.85); }
  for(const o of S.obstacles){ const s=o.s||1; test(o,s,s*.6); }
  return best;
}
cv.addEventListener("pointerdown",e=>{
  cv.setPointerCapture(e.pointerId); const [px,py]=toCanvas(e); ptrs.set(e.pointerId,{x:px,y:py,sx:px,sy:py});
  if(ptrs.size===2){ clearTimeout(gesture&&gesture.hold); const [a,b]=[...ptrs.values()]; gesture={k:"pinch",d:Math.hypot(a.x-b.x,a.y-b.y),z:cam.z}; return; }
  const [gx,gy]=unIso(px,py);
  gesture={k:"tap",gx,gy};
  if(mode==="home"&&S){
    if(placing&&!placing.moving){ const s=BLD[placing.t].size; if(gx>=placing.x&&gx<placing.x+s&&gy>=placing.y&&gy<placing.y+s) gesture={k:"ghost",ox:gx-placing.x,oy:gy-placing.y}; }
    else if(selected&&BLD[selected.t]&&hitHome(gx,gy)===selected) gesture={k:"maybeMove",b:selected,ox:gx-selected.x,oy:gy-selected.y,t0:performance.now()};
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
  // A tap (even a wobbly one) never moves a building: it needs a proper drag, or a short hold then a drag.
  const far=Math.hypot(px-p.sx,py-p.sy)>26*(W/innerWidth);
  if(gesture.k==="maybeMove"&&(far||(moved&&performance.now()-gesture.t0>300))){ const b=gesture.b; placing={t:b.t,x:b.x,y:b.y,moving:b}; gesture.k="move"; refreshUI(); }
  if(gesture.k==="move"){ const [gx,gy]=unIso(px,py); placing.x=Math.round(gx-gesture.ox); placing.y=Math.round(gy-gesture.oy); return; }
  if(gesture.k==="tap"&&moved){ clearTimeout(gesture.hold); gesture.k="pan"; }
  if(gesture.k==="pan"){ cam.x+=dx; cam.y+=dy; clampCam(); }
});
function endPtr(e){
  ptrs.delete(e.pointerId); if(!gesture) return;
  if(gesture.k==="pinch"){ if(ptrs.size===0) gesture=null; return; }
  clearTimeout(gesture.hold);
  if(gesture.k==="tap"){ if(mode==="home") homeTap(gesture.gx,gesture.gy); else battleTap(gesture.gx,gesture.gy); }
  if(gesture.k==="move"){ const b=gesture.b; if(footprintFree(placing.x,placing.y,BLD[b.t].size,b)){ b.x=placing.x; b.y=placing.y; sfx("tap"); save(); } else toast("Can't move it there"); placing=null; refreshUI(); }
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
  else if(h) sfx("tap",.3);
  selected = h===selected?null:h; refreshUI();
}

// ---------- card pack artwork: a foil footy-card pack in bronze, silver or gold ----------
const PACK_FOIL = {footy:["#ffffff","#b9c4cf","#5d6875"], prize:["#fff3b0","#f2b51f","#8a5a06"]};
function packArt(kind, W=180, H=240){
  const key="pack"+kind+W; if(iconCache[key]) return iconCache[key];
  const c=document.createElement("canvas"); c.width=W; c.height=H; const g=c.getContext("2d"), P=PACKS[kind], [hi,mid,lo]=PACK_FOIL[kind];
  const crimp=y=>{ for(let x=0;x<=W;x+=W/18) g.lineTo(x,y+((x/(W/18))%2?6:0)); };
  // pouch with crimped (zig-zag) top and bottom seals
  g.beginPath(); g.moveTo(0,10); crimp(4); g.lineTo(W,H-10); for(let x=W;x>=0;x-=W/18) g.lineTo(x,H-4-((x/(W/18))%2?6:0)); g.closePath();
  const foil=g.createLinearGradient(0,0,W,H); foil.addColorStop(0,hi); foil.addColorStop(.35,mid); foil.addColorStop(.55,hi); foil.addColorStop(.75,mid); foil.addColorStop(1,lo);
  g.fillStyle=foil; g.fill(); g.lineWidth=4; g.strokeStyle="#1b1206"; g.stroke();
  g.save(); g.clip();
  // seal bands
  g.fillStyle="#0000002e"; g.fillRect(0,0,W,22); g.fillRect(0,H-22,W,22);
  for(let x=4;x<W;x+=6){ g.fillStyle="#ffffff30"; g.fillRect(x,3,2,16); g.fillRect(x,H-19,2,16); }
  // diagonal shine
  g.globalAlpha=.35; g.fillStyle="#fff"; g.beginPath(); g.moveTo(W*.15,0); g.lineTo(W*.32,0); g.lineTo(W*.02,H); g.lineTo(-W*.15,H); g.fill();
  g.globalAlpha=.18; g.beginPath(); g.moveTo(W*.55,0); g.lineTo(W*.62,0); g.lineTo(W*.32,H); g.lineTo(W*.25,H); g.fill(); g.globalAlpha=1;
  // stadium-lights burst behind the footy
  g.save(); g.translate(W/2,H*.47); g.globalAlpha=.28; g.fillStyle="#fff";
  for(let i=0;i<14;i++){ g.rotate(Math.PI/7); g.beginPath(); g.moveTo(0,0); g.lineTo(W*.9,-10); g.lineTo(W*.9,10); g.fill(); } g.restore();
  g.restore();
  // big Sherrin in the middle
  if(!drawArtIcon("footy",g,W/2,H*.62,W*.78,H*.36)){ const sv={ctx}; ctx=g; footy(W/2,H*.47,W*.28,-.5); ctx=sv.ctx; }
  // title
  const word=(t,y,sz,fill)=>{ g.font=`${sz}px "Lilita One","Trebuchet MS",sans-serif`; g.textAlign="center"; g.textBaseline="middle"; g.lineJoin="round"; g.lineWidth=sz*.28; g.strokeStyle="#1b1206"; g.strokeText(t,W/2,y); g.fillStyle=fill; g.fillText(t,W/2,y); };
  word("FOOTY",H*.17,W*.2,"#fff");
  word("FORTRESS",H*.27,W*.15,"#ffd34d");
  // ribbon with pack name and card count
  g.fillStyle="#1b1206"; g.beginPath(); g.roundRect(W*.08,H*.66,W*.84,H*.19,10); g.fill();
  g.fillStyle=kind==="prize"?"#c8102e":kind==="footy"?"#0b2a6f":"#5a2a0c"; g.beginPath(); g.roundRect(W*.1,H*.67,W*.8,H*.17,8); g.fill();
  word(P.name.toUpperCase(),H*.725,W*.105,"#fff");
  g.font=`${W*.085}px "Lilita One","Trebuchet MS",sans-serif`; g.textAlign="center"; g.textBaseline="middle"; g.fillStyle="#ffe07a"; g.fillText(`${P.n} PLAYER CARDS`,W/2,H*.795);
  if(kind==="prize"){ for(const [x,y] of [[.18,.42],[.84,.36],[.8,.6]]){ g.fillStyle="#fff"; g.beginPath(); for(let i=0;i<8;i++){ const r=i%2?3:10, a=i*Math.PI/4; g.lineTo(W*x+Math.cos(a)*r,H*y+Math.sin(a)*r); } g.fill(); } }
  return iconCache[key]=c.toDataURL();
}
// side button: a little fan of player cards instead of the joker emoji
function cardsButtonIcon(){
  const c=document.createElement("canvas"); c.width=c.height=64; const g=c.getContext("2d");
  const card=(rot,col,stripe)=>{ g.save(); g.translate(32,40); g.rotate(rot); g.fillStyle="#1b1206"; g.beginPath(); g.roundRect(-13,-24,26,36,4); g.fill(); g.fillStyle=col; g.beginPath(); g.roundRect(-11,-22,22,32,3); g.fill(); g.fillStyle=stripe; g.fillRect(-3,-22,6,32); g.restore(); };
  card(-.35,"#c8102e","#111"); card(.35,"#0b2a6f","#fff"); card(0,"#f6c343","#111");
  return c.toDataURL();
}

// Shop "i": what a building is and does, before you buy it
function shopInfo(t){
  const d=BLD[t], rows=[];
  if(d.makes) rows.push(["Makes",`${d.rate[0]} ${resIcon(d.makes)} a minute (level 1)`]);
  if(d.stores) rows.push(["Holds",`${fmt(d.cap[0])} ${resIcon(d.stores)} (level 1)`]);
  if(d.dps) rows.push(["Damage",`${d.dps[0]} a second`],["Range",`${d.minr?d.minr+"–":""}${d.range} tiles`],["Hits",[d.ground&&"Ground",d.air&&"Air"].filter(Boolean).join(" & ")]);
  if(d.space) rows.push(["Squad space",d.space[0]]);
  if(d.unlock) rows.push(["Unlocks first",(UNITS[d.unlock[0]]||SPELLS[d.unlock[0]]).name]);
  if(d.dmg) rows.push(["Damage",d.dmg[0]]);
  rows.push(["Size",`${d.size}×${d.size} tiles`],["Max levels",levels(t)]);
  modal(`<h2>${d.name}</h2><div class="cmp"><div>${clashPic(CLASH_NAME[t])}<small><a href="${clashWiki(CLASH_NAME[t])}" target="_blank" rel="noopener">${CLASH_NAME[t]} ↗</a><br>Clash of Clans</small></div><span class="arrow">→</span><div><img class="cpic" src="${thumb(t,myClub()).toDataURL()}" alt=""><small><b>${d.name}</b><br>Footy Fortress</small></div></div><p class="center">${d.desc}</p>
    ${rows.map(([a,v])=>`<div class="stat"><span>${a}</span><b>${v}</b></div>`).join("")}${SUPERCELL_NOTE}<div class="center"><button class="btn" id="infoBack">Back to Shop</button></div>`);
  $("infoBack").onclick=()=>openShop();
}

// Link to the Clash of Clans wiki page for a Clash name (opens in a new tab)
// Small Clash of Clans pictures for the guide, loaded straight from the Clash wiki (not stored in this game)
const CLASH_PIC = {"Blacksmith":"https://static.wikia.nocookie.net/clashofclans/images/1/18/Blacksmith1.png/revision/latest/scale-to-width-down/96?cb=20231213085709",
  "Shiny Ore":"https://static.wikia.nocookie.net/clashofclans/images/d/da/Shiny_Ore.png/revision/latest/scale-to-width-down/96?cb=20231214003018",
  "Glowy Ore":"https://static.wikia.nocookie.net/clashofclans/images/7/72/Glowy_Ore.png/revision/latest/scale-to-width-down/96?cb=20231214002947",
  "Starry Ore":"https://static.wikia.nocookie.net/clashofclans/images/0/07/Starry_Ore.png/revision/latest/scale-to-width-down/96?cb=20231214002537",
  "Gold": "https://static.wikia.nocookie.net/clashofclans/images/1/10/Gold.png/revision/latest?cb=20180110234054", "Elixir": "https://static.wikia.nocookie.net/clashofclans/images/4/43/Elixir.png/revision/latest?cb=20180110233824", "Gems": "https://static.wikia.nocookie.net/clashofclans/images/a/aa/Gem.png/revision/latest?cb=20171212061908", "Town Hall": "https://static.wikia.nocookie.net/clashofclans/images/f/fd/Town_Hall1.png/revision/latest/scale-to-width-down/96?cb=20170827034930", "Gold Mine": "https://static.wikia.nocookie.net/clashofclans/images/7/76/Gold_Mine_level5_info.png/revision/latest/scale-to-width-down/96?cb=20260105014345", "Elixir Collector": "https://static.wikia.nocookie.net/clashofclans/images/5/5e/Elixir_Collector1.png/revision/latest/scale-to-width-down/96?cb=20180109122134", "Gold Storage": "https://static.wikia.nocookie.net/clashofclans/images/d/d8/Gold_Storage_level8_info.png/revision/latest/scale-to-width-down/96?cb=20250318144108", "Elixir Storage": "https://static.wikia.nocookie.net/clashofclans/images/f/f6/Elixir_Storage1.png/revision/latest/scale-to-width-down/96?cb=20230515070132", "Barracks": "https://static.wikia.nocookie.net/clashofclans/images/2/25/Barracks_level3_info.png/revision/latest/scale-to-width-down/96?cb=20250318150026", "Army Camp": "https://static.wikia.nocookie.net/clashofclans/images/7/79/Army_Camp1.png/revision/latest/scale-to-width-down/96?cb=20171221130243", "Spell Factory": "https://static.wikia.nocookie.net/clashofclans/images/c/ca/Spell_Factory1.png/revision/latest/scale-to-width-down/96?cb=20210116211444", "Laboratory": "https://static.wikia.nocookie.net/clashofclans/images/0/04/Laboratory1_ChiefJourney.png/revision/latest/scale-to-width-down/96?cb=20250604094404", "Builder's Hut": "https://static.wikia.nocookie.net/clashofclans/images/a/ac/BuilderHut4_ChiefJourney.png/revision/latest/scale-to-width-down/96?cb=20250604094448", "Hero Hall": "https://static.wikia.nocookie.net/clashofclans/images/5/57/Hero_Hall1.png/revision/latest/scale-to-width-down/96?cb=20241124131309", "Cannon": "https://static.wikia.nocookie.net/clashofclans/images/c/ce/Cannon_level6_info.png/revision/latest/scale-to-width-down/96?cb=20250318143532", "Archer Tower": "https://static.wikia.nocookie.net/clashofclans/images/7/79/Archer_Tower_level5_info.png/revision/latest/scale-to-width-down/96?cb=20250318143236", "Mortar": "https://static.wikia.nocookie.net/clashofclans/images/7/7c/Mortar_level3_info.png/revision/latest/scale-to-width-down/96?cb=20250316151117", "Air Defense": "https://static.wikia.nocookie.net/clashofclans/images/0/02/Air_Defence_level3_info.png/revision/latest/scale-to-width-down/96?cb=20250316151153", "Bomb": "https://static.wikia.nocookie.net/clashofclans/images/2/24/Bomb_info.png/revision/latest/scale-to-width-down/96?cb=20221122073915", "Walls": "https://static.wikia.nocookie.net/clashofclans/images/7/74/Wall1.png/revision/latest/scale-to-width-down/96?cb=20171205125404", "Wall": "https://static.wikia.nocookie.net/clashofclans/images/7/74/Wall1.png/revision/latest/scale-to-width-down/96?cb=20171205125404", "Barbarian": "https://static.wikia.nocookie.net/clashofclans/images/4/4e/Barbarian_info.png/revision/latest/scale-to-width-down/96?cb=20260130234555", "Archer": "https://static.wikia.nocookie.net/clashofclans/images/3/34/Archer_info.png/revision/latest/scale-to-width-down/96?cb=20170927230509", "Giant": "https://static.wikia.nocookie.net/clashofclans/images/3/35/Giant_info.png/revision/latest/scale-to-width-down/96?cb=20170927232347", "Goblin": "https://static.wikia.nocookie.net/clashofclans/images/f/fa/Goblin_info.png/revision/latest/scale-to-width-down/96?cb=20260131015403", "Wall Breaker": "https://static.wikia.nocookie.net/clashofclans/images/6/60/Wall_Breaker.png/revision/latest/scale-to-width-down/96?cb=20251025221847", "Minion": "https://static.wikia.nocookie.net/clashofclans/images/a/a4/Minion_info.png/revision/latest/scale-to-width-down/96?cb=20260215122203", "Balloon": "https://static.wikia.nocookie.net/clashofclans/images/2/2f/Balloon_info.png/revision/latest/scale-to-width-down/96?cb=20260206010350", "Healer": "https://static.wikia.nocookie.net/clashofclans/images/c/ca/Healer_info.png/revision/latest/scale-to-width-down/96?cb=20260401174037", "Healing": "https://static.wikia.nocookie.net/clashofclans/images/1/18/Healing_SpellC_info.png/revision/latest/scale-to-width-down/96?cb=20220506091527", "Rage": "https://static.wikia.nocookie.net/clashofclans/images/d/d3/Rage_SpellC_info.png/revision/latest/scale-to-width-down/96?cb=20220506091530", "Lightning": "https://static.wikia.nocookie.net/clashofclans/images/7/72/Lightning_SpellC_info.png/revision/latest/scale-to-width-down/96?cb=20220506091529", "Freeze": "https://static.wikia.nocookie.net/clashofclans/images/e/ef/Freeze_Spell_info.png/revision/latest/scale-to-width-down/96?cb=20180627210930", "Barbarian King": "https://static.wikia.nocookie.net/clashofclans/images/2/26/Barbarian_King_3D_preview.png/revision/latest/scale-to-width-down/96?cb=20221212143240", "Archer Queen": "https://static.wikia.nocookie.net/clashofclans/images/5/5a/Archer_Queen_3D_preview.png/revision/latest/scale-to-width-down/96?cb=20230612145438"};
const clashPic = n => { const u=CLASH_PIC[n]; return u?`<img class="cpic" src="${u}" referrerpolicy="no-referrer" loading="lazy" alt="${n} in Clash of Clans" onerror="this.style.visibility='hidden'">`:`<span class="cpic"></span>`; };
const SUPERCELL_NOTE = `<p class="tiny center">Clash of Clans pictures are shown from the Clash of Clans wiki for comparison. This guide is unofficial and is not endorsed by Supercell.</p>`;
const clashWiki = n => "https://clashofclans.fandom.com/wiki/"+encodeURIComponent(n.replace(/ altar$/,"").replace(/ /g,"_"));

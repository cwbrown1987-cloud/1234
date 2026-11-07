// ---------- HUD, menus and touch controls ----------
const $ = id => document.getElementById(id);
const fmt = n => n>=1e6 ? (n/1e6).toFixed(n>=1e7?0:1)+"M" : n>=100000 ? Math.round(n/1000)+"k" : Math.floor(n).toLocaleString();
let tt; function toast(s){ const t=$("toast"); t.textContent=s; t.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove("show"),2200); }
const jersey = c => `linear-gradient(90deg,${c.a} 0 34%,${c.b} 34% 66%,${c.a} 66%)`;
const badgeImg = (c,cls="") => `<img class="badgeimg ${cls}" src="${badgeURL(c,96)}" alt="">`;

// ---------- icons ----------
const iconCache={};
function playerIcon(kind, club){
  club=club||myClub(); const key=kind+club.abbr;
  if(iconCache[key]) return iconCache[key];
  const c=document.createElement("canvas"); c.width=c.height=96;
  const role=kind==="hero:captain"?"captain":kind==="hero:coach"?"coach":kind;
  const likeness=role==="captain" && namedHeroArt[club.abbr];
  const icon=c.getContext("2d");
  if ((likeness && drawArtIcon(likeness,icon,48,96,96,92)) || drawArtIcon("portrait-"+role,icon,48,96,96,92,club) || (UNITS[role]?.air && drawArtIcon(role,icon,48,83,90,76))) return iconCache[key]=c.toDataURL();
  const save={ctx,TW,TH}; ctx=icon; TW=60; TH=30;
  if(kind==="seagulls"){ for(const [dx,dy] of [[0,0],[-14,10],[14,12],[-4,-14]]) gull(48+dx,52+dy,14,dx,1); }
  else if(kind==="blimp") blimp(48,50,{club,face:1,id:0});
  else { const hk=kind.startsWith("hero:")?kind.slice(5):null, pos=hk?HEROES[hk].pos(club):null;
    drawPlayer(48,90,hk?26:kind==="ruck"||kind==="trainer"?27:23,club,{kind:pos==="coach"?"coach":hk?null:kind,hero:!!hk,ranged:pos&&HERO_POS[pos].ranged,id:3}); }
  ctx=save.ctx; TW=save.TW; TH=save.TH;
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
// Player card art
function cardArt(card){
  const key="card"+card.id; if(iconCache[key]) return iconCache[key];
  const club=CLUBS[card.club], R=RARITY[card.rarity];
  const c=document.createElement("canvas"); c.width=180; c.height=240; const g=c.getContext("2d");
  const bg=g.createLinearGradient(0,0,0,240); bg.addColorStop(0,shade(club.a,1.35)); bg.addColorStop(1,shade(club.a,.7)); g.fillStyle=bg; g.fillRect(0,0,180,240);
  g.fillStyle=club.b; g.globalAlpha=.25; g.fillRect(66,0,48,240); g.globalAlpha=1;
  if(card.rarity==="legend"){ g.save(); g.globalAlpha=.25; for(let i=0;i<12;i++){ g.fillStyle="#fff"; g.beginPath(); g.moveTo(90,110); g.arc(90,110,200,i*Math.PI/6,i*Math.PI/6+.18); g.fill(); } g.restore(); }
  const role=card.rarity==="legend"?"captain":({mid:"rover",fwd:"forward",ruck:"ruck",def:"shepherd"})[card.pos];
  const likeness=card.name===club.hero.name && namedHeroArt[club.abbr];
  if (!(likeness && drawArtIcon(likeness,g,90,193,174,184)) && !drawArtIcon("portrait-"+role,g,90,193,174,184,club)) {
    const save={ctx,TW,TH}; ctx=g; TW=70; TH=35;
    drawPlayer(90,190,46,club,{kind:card.pos==="ruck"?"ruck":null,hero:card.rarity==="legend",ranged:card.pos==="fwd",id:card.club});
    ctx=save.ctx; TW=save.TW; TH=save.TH;
  }

  drawBadge(g,30,32,20,club);
  g.fillStyle="#000a"; g.fillRect(0,192,180,48);
  g.font='20px "Lilita One",sans-serif'; g.textAlign="center"; g.fillStyle="#fff"; g.textBaseline="middle";
  const nm=card.name.length>18?card.name.split(" ").pop():card.name; g.fillText(nm,90,207,162);
  g.font='13px "Lilita One",sans-serif'; g.fillStyle=R.col; g.fillText(`${R.name} · ${POS_NAME[card.pos]}`,90,227);
  g.lineWidth=8; g.strokeStyle=R.col; g.strokeRect(4,4,172,232); g.lineWidth=2; g.strokeStyle="#000"; g.strokeRect(1,1,178,238);
  return iconCache[key]=c.toDataURL();
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
  const ev=S&&eventNow(); $("eventBanner").classList.toggle("hide",!home||!ev||!!placing||(typeof tutActive==="function"&&tutActive())); if(ev) $("eventBanner").innerHTML=`🎉 <b>${ev.name}</b> · ${ev.desc}`;
  $("placePanel").style.display=home&&placing&&!placing.moving?"flex":"none";
  if(placing&&!placing.moving){ const d=BLD[placing.t]; $("placeName").textContent=`${d.name} · ${fmt(buildCost(placing.t))} ${resIcon(d.res)}`; }
  const sp=$("selPanel"); sp.innerHTML="";
  if(home&&selected&&!placing){ sp.style.display="flex"; buildSelPanel(sp); } else sp.style.display="none";
  if(bat&&!replay) buildCards();
  if(S&&home){ const u=S.raids.filter(r=>!r.seen).length, tr=tasksReady()||0;
    $("logDot").textContent=u; $("logDot").classList.toggle("hide",!u);
    $("taskDot").textContent=tr; $("taskDot").classList.toggle("hide",!tr);
    const pk=Object.values(S.packs).reduce((a,b)=>a+b,0); $("cardDot").textContent=pk; $("cardDot").classList.toggle("hide",!pk); }
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
    const sh=S.shield-Date.now(); $("shield").classList.toggle("hide",sh<=0); if(sh>0) $("shield").textContent="🛡️ "+fmtTime(sh/1000);
    const tm=document.querySelector("#selPanel .timer"); if(tm&&selected&&selected.busy){ tm.textContent=fmtTime((selected.busy.end-Date.now())/1000); const sb=document.querySelector("#selPanel .speed small"); if(sb) sb.textContent=speedCost(selected.busy.end)+" 🏅"; }
  } else if(BT){
    const replay=BT.mode==="replay";
    $("bBadge").src=badgeURL(CLUBS[replay?BT.atkClub:BT.club],96);
    $("bVs").textContent=replay?`${CLUBS[BT.atkClub].name} attack`:"vs "+CLUBS[BT.club].name;
    $("bLoot").textContent=replay?"Replay":(BT.kind==="season"&&BT.fixture?BT.fixture+" · ":BT.kind==="revenge"?"Revenge! · ":"")+`🥧 ${fmt(Math.max(0,BT.lootTotal.pies-BT.loot.pies)*(BT.lootMul||1))}  💧 ${fmt(Math.max(0,BT.lootTotal.drink-BT.loot.drink)*(BT.lootMul||1))}`;
    const s=starsNow(), sc=scoreNow(), A=CLUBS[BT.atkClub], Hm=CLUBS[BT.club];
    $("bScore").innerHTML=`<div class="${sc.a.p>sc.h.p?"lead":""}">${A.short} <b>${fmtScore(sc.a)}</b></div><div class="${sc.h.p>=sc.a.p?"lead":""}">${Hm.short} <b>${fmtScore(sc.h)}</b></div>`;
    $("bStars").innerHTML="★".repeat(s)+`<span class="dim">${"★".repeat(3-s)}</span>`;
    const t=Math.max(0,Math.ceil(BT.time)); $("bTime").textContent=Math.floor(t/60)+":"+String(t%60).padStart(2,"0");
    $("battleHint").style.display=BT.started||replay||tutActive()?"none":"block";
    const ab=$("abilities"); const want=replay?[]:Object.keys(BT.heroU).filter(h=>BT.heroU[h].hp>0&&!BT.abilityUsed[h]);
    if(ab.dataset.k!==want.join()){ ab.dataset.k=want.join(); ab.innerHTML=""; for(const h of want){ const b=document.createElement("button"); b.className="btn gold"; b.textContent="⚡ "+BT.heroStat(h).ability; b.onclick=()=>useAbility(h); ab.append(b); } }
  }
}

function buildSelPanel(sp){
  const o=selected;
  if(!BLD[o.t]){ sp.innerHTML=`<div class="title">${o.k==="rock"?"Rock":o.k==="bush"?"Bush":"Gum Tree"}</div><div class="acts"></div>`; addBtn(sp,"btn gold",`Clear<small>100 🥧</small>`,()=>removeObstacle(o)); return; }
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
  if(o.t==="locker"||o.t==="office") addBtn(sp,"btn","⭐<small>Heroes</small>",()=>openSquad("Heroes"));
}
function addBtn(sp,cls,html,fn,dis){ const b=document.createElement("button"); b.className=cls; b.innerHTML=html; b.onclick=e=>{e.stopPropagation(); sfx("tap",.4); fn();}; if(dis) b.setAttribute("disabled",""); sp.querySelector(".acts").append(b); return b; }

function buildCards(){
  const box=$("cards"); box.innerHTML="";
  const card=(cls,img,n,label,sel,on,empty)=>{ const b=document.createElement("button"); b.className="cardbtn "+cls+(sel?" sel":"")+(empty?" empty":""); b.innerHTML=`<img src="${img}"><span class="n">${n}</span><span class="l">${label}</span>`; b.onclick=on; box.append(b); };
  const isSel=(k,v)=>BT.sel&&BT.sel.k===k&&BT.sel.v===v;
  for(const u of Object.keys(UNITS)){ const had=BT.had[u]||0; if(!had) continue; const n=BT.left[u]||0;
    card(UNITS[u].air?"air":"",playerIcon(u),"x"+n,UNITS[u].name,isSel("unit",u),()=>{BT.sel={k:"unit",v:u};buildCards();},!n); }
  for(const h of Object.keys(HEROES)){ if(!heroHome(h)) continue; const st=heroStats(h);
    card("hero",playerIcon("hero:"+h),S.heroes[h].busy?"🔧":"",st.name.split(" ").pop(),isSel("hero",h),()=>{ if(BT.heroesLeft[h]){BT.sel={k:"hero",v:h};buildCards();} },!BT.heroesLeft[h]); }
  for(const sp of Object.keys(SPELLS)){ const had=BT.hadSpells[sp]||0; if(!had) continue; const n=BT.spellsLeft[sp]||0;
    card("spell",spellIcon(sp),"x"+n,SPELLS[sp].name.split(" ").pop(),isSel("spell",sp),()=>{BT.sel={k:"spell",v:sp};buildCards();},!n); }
}

// ---------- modals ----------
let modalTick=null;
function modal(html, opts={}){ $("modalBody").innerHTML=html; $("modal").classList.add("show"); $("modalX").style.display=opts.noClose?"none":"block"; modalTick=opts.tick||null; }
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
    it.insertAdjacentHTML("beforeend",`<div class="nm">${d.name}</div><div class="meta">Built ${st.have}/${st.lim||MAXC[t][th()-1]}${d.time[0]?" · ⏱ "+fmtTime(d.time[0]):""}</div>`+
      (st.ok?`<div class="cost ${st.afford?"":"bad"}">${fmt(st.cost)} ${resIcon(st.res)}</div>`:`<div class="cost bad">${st.why}</div>`));
    it.onclick=()=>{ if(!st.ok) return toast(st.why); closeModal(); startPlacing(t); };
    g.append(it);
  }
}
function shopDeals(g){
  for(const [k,p] of Object.entries(PACKS)){
    const it=document.createElement("div"); it.className="item";
    it.innerHTML=`<div class="pack" style="--pc:${p.col}">🃏<b>${p.n}</b></div><div class="nm">${p.name}</div><div class="meta">${p.n} player cards${p.guarantee?` · 1 ${RARITY[p.guarantee].name}+`:""}</div><div class="cost ${S.medals>=p.cost?"":"bad"}">${p.cost} 🏅</div>`;
    it.onclick=()=>{ if(!pay("medals",p.cost)) return toast("Not enough Brownlow votes 🏅"); S.packs[k]=(S.packs[k]||0)+1; save(); openPackFlow(k); };
    g.append(it);
  }
  for(const r of ["pies","drink"]){
    const it=document.createElement("div"); it.className="item"; const room=Math.max(0,capOf(r)-S[r]), amt=Math.floor(room*.25), cost=Math.max(5,Math.ceil(amt/400));
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
      const cap=armySpace(), used=usedSpace(), q=queuedSpace();
      h+=`<div>Squad size: <b>${used}</b> / ${cap} ${q?`(+${q} training)`:""}</div><div class="bar"><div style="width:${100*used/Math.max(1,cap)}%"></div></div>`;
      h+=`<div class="armyrow">${Object.entries(S.army).filter(([,n])=>n>0).map(([u,n])=>`<span class="chip"><img src="${playerIcon(u)}">${n}</span>`).join("")||"<i>No players yet</i>"}</div>`;
      h+=`<h3>Training ${S.queue.length?`· next in ${fmtTime(Math.max(0,UNITS[S.queue[0]].time/trainSpeed()-(Date.now()-S.trainAt)/1000))}`:""}</h3><div class="queue" id="q">${S.queue.map((u,i)=>`<div class="q" data-i="${i}"><img src="${playerIcon(u)}"><span>✖</span></div>`).join("")}</div>`;
      h+=`<h3>Train players</h3><div class="grid">`;
      const un=unlockedUnits();
      for(const [k,u] of Object.entries(UNITS)){ const ok=un.includes(k), lv=S.unitLv[k], c=unitCost(k);
        h+=`<div class="item ${ok?"":"off"}" data-u="${k}"><img src="${playerIcon(k)}"><div class="nm">${u.name} <small>Lv${lv}</small>${u.air?' <span class="tag">AIR</span>':""}</div><div class="meta">${u.desc}</div><div class="meta">👥 ${u.space} · ⏱ ${u.time}s</div>${ok?`<div class="cost ${S.drink>=c?"":"bad"}">${c} 💧</div>`:`<div class="cost bad">Training Oval ${BLD.oval.unlock.indexOf(k)+1}</div>`}</div>`; }
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
    if(squadTab==="Heroes"){
      for(const hk of Object.keys(HEROES)){
        const hs=heroStats(hk), c=myClub(), st=S.heroes[hk], H=HEROES[hk];
        h+=`<div class="herocard"><img src="${playerIcon("hero:"+hk)}" style="background:${jersey(c)}"><div>
          <div style="font-size:20px">${hs.name}</div><div class="tiny">${POS_NAME[hs.pos]} · Level <b>${st.lv}</b> / ${Math.max(1,heroMax(th(),hk))}</div>
          <div>❤️ ${hs.hp} · 💥 ${hs.dps}/s</div><div class="tiny">⚡ <b>${hs.ability}</b>: ${hs.desc}</div>`;
        if(!heroHome(hk)) h+=`<div class="tiny bad">Build a ${BLD[H.building].name} (Clubhouse ${H.th}) to unlock.</div>`;
        else if(st.busy) h+=`<div>Training… ${fmtTime((st.busy.end-Date.now())/1000)}</div><button class="btn green" data-hs="${hk}">Finish now · ${speedCost(st.busy.end)} 🏅</button>`;
        else if(st.lv>=heroMax(th(),hk)) h+=`<div class="tiny">Upgrade your Clubhouse to train further.</div>`;
        else h+=`<button class="btn gold" data-hu="${hk}">⬆ ${fmt(heroCost(st.lv))} 💧 · ${fmtTime(heroTime(st.lv))}</button>`;
        h+=`</div></div>`;
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
    document.querySelectorAll("#q .q").forEach(el=>el.onclick=()=>{ untrain(+el.dataset.i); render(); });
    document.querySelectorAll("[data-s]").forEach(el=>el.onclick=()=>{ if(!unlockedSpells().includes(el.dataset.s)) return toast("Upgrade your Physio Room"); brewSpell(el.dataset.s); render(); });
    document.querySelectorAll("[data-r]").forEach(el=>el.onclick=()=>{ startResearch(el.dataset.r); render(); });
    document.querySelectorAll("[data-hu]").forEach(el=>el.onclick=()=>{ upgradeHero(el.dataset.hu); render(); });
    document.querySelectorAll("[data-hs]").forEach(el=>el.onclick=()=>{ const st=S.heroes[el.dataset.hs]; if(pay("medals",speedCost(st.busy.end))){ st.busy.end=Date.now(); processTimers(); } else toast("Not enough Brownlow votes 🏅"); render(); });
  };
  render();
}

// ---------- cards ----------
let cardTab="Team Sheet";
function cardHTML(c,opts={}){
  const lv=cardLevel(c.id), owned=lv>0, pr=cardProgress(c.id), inTeam=S.team.includes(c.id);
  return `<div class="pcard ${owned?"":"locked"} ${inTeam&&!opts.noTick?"inteam":""}" data-card="${c.id}"><img src="${cardArt(c)}">${owned?`<span class="lv">Lv ${lv}</span>`:""}${inTeam&&!opts.noTick?'<span class="tick">✔</span>':""}
    ${owned&&!opts.noBar&&pr.need?`<div class="cbar"><div style="width:${Math.min(100,100*pr.have/pr.need)}%"></div><span>${pr.have}/${pr.need}</span></div>`:""}</div>`;
}
function openCards(tab){
  cardTab=tab||cardTab;
  let h=`<h2>Player Cards</h2>${tabsHTML(["Team Sheet","Collection","Packs"],cardTab)}`;
  const owned=CARDS.filter(c=>cardLevel(c.id)>0);
  if(cardTab==="Team Sheet"){
    const slots=teamSlots(th());
    h+=`<p class="center">Pick up to <b>${slots}</b> card${slots>1?"s":""}. Each one boosts your squad by position.</p><div class="sheet">`;
    for(let i=0;i<slots;i++){ const id=S.team[i]; h+= id?cardHTML(cardById(id),{noBar:true,noTick:true}):`<div class="pcard empty">+</div>`; }
    h+=`</div><div class="effects">${Object.keys(POS_EFFECT).map(p=>{ const b=cardBonus(p); return `<div class="stat"><span>${POS_EFFECT[p]}</span><b>${b?"+"+Math.round(b*100)+"%":"–"}</b></div>`; }).join("")}</div>`;
    h+=`<h3>Your cards (tap to add or remove)</h3><div class="cgrid">${owned.sort((a,b)=>cardPower(b.id)-cardPower(a.id)).map(c=>cardHTML(c)).join("")||"<i>No cards yet. Open a pack!</i>"}</div>`;
  }
  if(cardTab==="Collection"){
    h+=`<p class="center">${owned.length} / ${CARDS.length} collected</p>`;
    for(const [ci,c] of CLUBS.entries()) h+=`<h3 class="clubh">${badgeImg(c,"sm")} ${c.name}</h3><div class="cgrid">${CARDS.filter(x=>x.club===ci).map(x=>cardHTML(x)).join("")}</div>`;
  }
  if(cardTab==="Packs"){
    h+=`<div class="grid">`;
    for(const [k,p] of Object.entries(PACKS)){ const n=S.packs[k]||0;
      h+=`<div class="item ${n?"":"off"}" data-pack="${k}"><div class="pack" style="--pc:${p.col}">🃏<b>${p.n}</b></div><div class="nm">${p.name}</div><div class="meta">You have ${n}</div><div class="cost">${n?"Open":"Win matches or visit the shop"}</div></div>`; }
    h+=`</div>`;
  }
  modal(h); bindTabs(openCards); tut("cards"); tut("tab-"+cardTab);
  document.querySelectorAll("[data-card]").forEach(el=>el.onclick=()=>{ const id=el.dataset.card; if(!cardLevel(id)) return; if(cardTab!=="Team Sheet") return showCard(id); toggleTeam(id); sfx("tap",.4); openCards(); tut("team"); });
  document.querySelectorAll("[data-pack]").forEach(el=>el.onclick=()=>{ if(S.packs[el.dataset.pack]>0) openPackFlow(el.dataset.pack); });
}
function showCard(id){ const c=cardById(id); modal(`<div class="center"><div class="sheet">${cardHTML(c)}</div><h2>${c.name}</h2><div>${CLUBS[c.club].name} · ${RARITY[c.rarity].name} ${POS_NAME[c.pos]}</div><div class="stat"><span>${POS_EFFECT[c.pos]}</span><b>+${Math.round(cardPower(id)*100)}%</b></div><br><button class="btn" id="back">Back</button></div>`); $("back").onclick=()=>openCards(); }
function openPackFlow(k){
  const got=openPack(k); if(!got) return;
  modal(`<h2>${PACKS[k].name}</h2><div class="reveal">${got.map((c,i)=>`<div class="flip" style="animation-delay:${i*.35}s">${cardHTML(c,{noBar:true,noTick:true})}<div class="newtag">${S.cards[c.id]===1?"NEW!":"+1"}</div></div>`).join("")}</div><div class="center"><button class="btn green" id="pk">Nice!</button></div>`);
  got.forEach((c,i)=>setTimeout(()=>sfx(c.rarity==="legend"||c.rarity==="epic"?"cheer":"card",.6),i*350)); tut("pack");
  $("pk").onclick=()=>openCards("Team Sheet"); uiDirty=true;
}

// ---------- tasks / log / match ----------
function openTasks(){
  ensureDaily();
  let h=`<h2>Daily Tasks</h2><p class="center tiny">New tasks every day. Finish all three for a bonus Silver Pack.</p>`;
  S.daily.tasks.forEach((t,i)=>{ const T=TASKS.find(x=>x.k===t.k), done=t.n>=t.goal;
    h+=`<div class="task"><div class="grow"><div>${T.text(t.goal)}</div><div class="bar"><div style="width:${100*t.n/t.goal}%"></div></div><div class="tiny">${fmt(t.n)} / ${fmt(t.goal)}</div></div>${t.claimed?"✅":`<button class="btn ${done?"green":""}" data-claim="${i}" ${done?"":"disabled"}>+15 🏅</button>`}</div>`; });
  h+=`<h3>This week</h3>${[1,2,3,4,5,6,0].map(d=>{ const e=EVENTS[d], nm=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]; return `<div class="stat ${d===new Date().getDay()?"today":""}"><span>${nm}</span><b>${e?e.name+" · "+e.desc:"–"}</b></div>`; }).join("")}`;
  modal(h);
  document.querySelectorAll("[data-claim]").forEach(b=>b.onclick=()=>{ claimTask(+b.dataset.claim); openTasks(); });
}
function openLog(){
  let h=`<h2>Home Games</h2><p class="center tiny">Clubs that came to your ground while you were away.</p>`;
  if(!S.raids.length) h+=`<p class="center">No visitors yet. They will come…</p>`;
  for(const r of S.raids){ const c=CLUBS[r.club], ago=fmtTime((Date.now()-r.at)/1000);
    h+=`<div class="raid ${r.stars?"lost":"won"}">${badgeImg(c)}<div class="grow"><div><b>${c.name}</b> ${r.seen?"":'<span class="tag">NEW</span>'}</div>
      <div class="tiny">${ago} ago · ${r.sc?`${c.short} ${fmtScore(r.sc.a)} v ${myClub().short} ${fmtScore(r.sc.h)}`:r.pct+"% destroyed"} · <span class="stars">${"★".repeat(r.stars)}<span class="dim">${"★".repeat(3-r.stars)}</span></span></div>
      <div class="tiny">${r.stars?`Lost 🥧 ${fmt(r.lost.pies)} 💧 ${fmt(r.lost.drink)}`:"Defence win!"} · ${r.tro>0?"+":""}${r.tro} 🏆</div></div>
      <div class="col"><button class="btn blue" data-replay="${r.id}">▶ Replay</button>${r.stars&&!r.revenged?`<button class="btn red" data-rev="${r.id}">Revenge</button>`:""}</div></div>`; }
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
  h+=`<div class="center" style="margin:10px 0"><button class="btn gold big" id="findMatch">🔎 Find a Match<small>${cost} 🥧 · random club, trophies, loot & packs</small></button></div>`;
  ensureSeason(); const s=S.season, f=nextFixture(), pos=ladderPos(S.club), L=s.ladder[S.club];
  h+=`<h3>Season ${s.year}${S.premierships?` · 🏆×${S.premierships}`:""}</h3><div class="seasonbar"><span>${s.finals?"Finals":`Round ${Math.min(s.round+1,ROUNDS)} of ${ROUNDS}`}</span><span>${L.w+L.l+L.d?`${ordinal(pos)} on the ladder · ${L.w}W ${L.l}L${L.d?" "+L.d+"D":""}`:"First bounce coming up"}</span><button class="btn blue" id="ladder">Ladder</button></div>`;
  if(f){ const c=CLUBS[f.club]; h+=`<div class="fx next">${badgeImg(c)}<span class="nm"><small>${f.name}${f.final?" 🔥":""}</small><br>vs ${c.name}<br><small>Clubhouse ${f.d}${s.round||s.finals?` · ${ordinal(ladderPos(f.club))} on the ladder`:""}</small></span><button class="btn green big" data-r="${s.round}">Play</button></div>`; }
  else h+=`<div class="fx next"><span class="nm">${s.premiers?"🏆 <b>Premiers!</b> What a season.":`Season over. You finished ${ordinal(s.place||pos)}.`}</span><button class="btn gold" id="newSeason">Start Season ${s.year+1}</button></div>`;
  if(s.results.length) h+=`<div class="fixture">${[...s.results].reverse().slice(0,6).map(r=>`<div class="fx"><span class="wl ${r.res}">${r.res}</span>${badgeImg(CLUBS[r.club],"sm")}<span class="nm"><small>${r.name}</small><br>${fmtScore(r.my)} – ${fmtScore(r.their)}</span></div>`).join("")}</div>`;
  modal(h); tut("match");
  $("findMatch").onclick=()=>{ if(!Object.values(S.army).some(n=>n>0)) return toast("Train some players first!"); if(!pay("pies",cost)) return toast("Not enough 🥧");
    let c; do{ c=Math.random()*18|0; }while(c===S.club); const d=Math.max(1,Math.min(MAX_TH,th()+(Math.random()*3|0)-1));
    closeModal(); startBattle({kind:"match",club:c,d,seed:Math.random()*1e9|0}); };
  document.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{ if(!Object.values(S.army).some(n=>n>0)) return toast("Train some players first!"); closeModal(); playSeasonMatch(); });
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
  modal(`<div class="result"><h2>${draw?"It's a draw!":win?"You win!":"Siren. You lost"}</h2>
    <div class="tiny">${r.fixture?r.fixture+" · ":""}${draw?"Scores level":"by "+margin+" point"+(margin===1?"":"s")} · ${r.p}% knocked down</div>
    ${scoreboard(r.away,r.home,r.sc)}
    <div class="stars">${"★".repeat(r.stars)}<span class="dim">${"★".repeat(3-r.stars)}</span></div>
    ${r.season&&r.season.note?`<p class="note">${r.season.note}</p>`:""}
    <div class="stat"><span>Pies</span><b>+${fmt(r.got.pies)} 🥧</b></div><div class="stat"><span>Drink</span><b>+${fmt(r.got.drink)} 💧</b></div>
    <div class="stat"><span>Trophies</span><b>${r.tro>=0?"+":""}${r.tro} 🏆</b></div>${r.medals?`<div class="stat"><span>Win bonus</span><b>+${r.medals} 🏅</b></div>`:""}
    ${r.pack?`<div class="stat"><span>Reward</span><b>${PACKS[r.pack].name} 🃏</b></div>`:""}
    ${r.full?`<p>Some loot didn't fit. Build more storage!</p>`:""}<br>
    ${r.pack?`<button class="btn gold" id="openNow">Open Pack</button> `:""}<button class="btn green" id="goHome">Return Home</button></div>`,{noClose:true});
  $("goHome").onclick=()=>{ closeModal(); leaveBattle(); tut("home"); };
  const on=$("openNow"); if(on) on.onclick=()=>{ leaveBattle(); openPackFlow(r.pack); };
}
function openSettings(){
  modal(`<h2>Settings</h2><p>Your club: <b>${myClub().name}</b></p>
    <div class="stat"><span>Sound effects</span><button class="btn ${S.sound?"green":""}" id="snd">${S.sound?"On":"Off"}</button></div>
    <p class="tiny">Club logos: put PNG files named after each club (for example <code>coll.png</code> or <code>wb.png</code>) in the <code>logos</code> folder next to the game and they replace the badges.</p>
    <div class="stat"><span>Tutorials</span><span><button class="btn green" id="tutAgain">Walkthrough</button> <button class="btn gold" id="clashG">Clash guide</button></span></div>
    <div class="stat"><span>Play it like an app</span><button class="btn blue" id="instBtn">Install</button></div>
    <div class="stat"><span>Version ${VERSION}</span><button class="btn gold" id="updBtn">Check for updates</button></div>
    <p class="tiny">Progress saves on this device automatically.</p><button class="btn red" id="reset">Start over (new club)</button>`);
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
$("btnCards").onclick=()=>openCards();
$("btnTasks").onclick=openTasks;
$("btnLog").onclick=openLog;
$("placeYes").onclick=confirmPlace;
$("placeNo").onclick=()=>{ placing=null; refreshUI(); };
$("bEnd").onclick=()=>{ const b=$("bEnd");
  if(BT.started&&!b.dataset.sure){ b.dataset.sure="1"; b.textContent="Tap to confirm"; setTimeout(()=>{ delete b.dataset.sure; b.textContent="End Match"; },2500); return; }
  delete b.dataset.sure; b.textContent="End Match"; endBattle(); };
$("rSpeed").onclick=()=>{ BT.speed=BT.speed>=4?1:BT.speed*2; $("rSpeed").textContent=BT.speed+"×"; };
$("rExit").onclick=()=>{ leaveBattle(); openLog(); };

// ---------- touch / mouse ----------
const ptrs=new Map(); let gesture=null;
const toCanvas = e => [e.clientX*W/innerWidth, e.clientY*H/innerHeight];
function hitHome(gx,gy){
  const x=Math.floor(gx), y=Math.floor(gy);
  for(const b of S.buildings){ const s=BLD[b.t].size; if(x>=b.x&&x<b.x+s&&y>=b.y&&y<b.y+s) return b; }
  return S.obstacles.find(o=>o.x===x&&o.y===y)||null;
}
cv.addEventListener("pointerdown",e=>{
  cv.setPointerCapture(e.pointerId); const [px,py]=toCanvas(e); ptrs.set(e.pointerId,{x:px,y:py,sx:px,sy:py});
  if(ptrs.size===2){ clearTimeout(gesture&&gesture.hold); const [a,b]=[...ptrs.values()]; gesture={k:"pinch",d:Math.hypot(a.x-b.x,a.y-b.y),z:cam.z}; return; }
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

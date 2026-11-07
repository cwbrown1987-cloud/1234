// ---------- Tutorials: a quick "Clash players" cheat sheet, and a guided walkthrough for new players ----------

const CLASH_MAP = [
  ["Resources", [["Gold","Pies 🥧"],["Elixir","Sports Drink 💧"],["Gems","Brownlow votes 🏅"]]],
  ["Buildings", [["Town Hall","Clubhouse"],["Gold Mine","Pie Shop"],["Elixir Collector","Drink Tap"],["Gold Storage","Pie Warmer"],["Elixir Storage","Esky"],
    ["Barracks","Training Oval"],["Army Camp","Interchange Bench"],["Spell Factory","Physio Room"],["Laboratory","Coaches Box"],["Builder's Hut","Groundskeeper Shed"],["Hero altars","Captain's Locker & Coach's Office"]]],
  ["Defences", [["Cannon","Siren Cannon"],["Archer Tower","Goal Tower"],["Mortar","Kick-Out Catapult"],["Air Defense","Floodlight Tower"],["Bomb","Sprinkler Trap"],["Walls","Fences"]]],
  ["Troops", [["Barbarian","Rover"],["Archer","Full-Forward"],["Giant","Ruckman"],["Goblin","Crumber"],["Wall Breaker","Shepherd"],["Minion","Seagulls"],["Balloon","Blimp"],["Healer","Trainer"]]],
  ["Spells", [["Healing","Half-time Oranges"],["Rage","Crowd Roar"],["Lightning","Umpire's Free Kick"],["Freeze","Rain Delay"],["(new)","Late Sub: drops 6 Rovers"]]],
  ["Heroes & modes", [["Barbarian King","Your club's real captain"],["Archer Queen","Head Coach (Clubhouse 5)"],["Goblin campaign","The Season: 17 rounds, ladder, finals"],["Stars","★ win, ★★ + Clubhouse, ★★★ flatten it"]]],
];
const CLASH_DIFFS = [
  "<b>Your hero is your club's star player</b> (e.g. Daicos, Gawn, Bontempelli) with a position-based ability.",
  "<b>Player cards are new.</b> Win packs, level duplicates, and put up to 5 on your Team Sheet to boost players by position.",
  "<b>Raids come from AI clubs</b> every 10–20 minutes, even when you're away. Check the 🛡️ Log for replays, and hit Revenge for 1.5× loot.",
  "<b>Much faster.</b> Timers are seconds to 2 hours, not days. The Clubhouse tops out at level 8.",
  "<b>Build a Pie Shop and a Drink Tap first</b> (both free). Pie Shops cost drink to upgrade and Drink Taps cost pies, so you need both earning.",
  "<b>Matches are scored like footy.</b> Knock down a building = goal. They get a behind for each building still standing and each player they knock out (goal for big ones). Outscore them to win.",
  "<b>The Season is a real ladder.</b> 4 points a win, percentage splits ties, top 8 play finals, win the Grand Final for a premiership.",
  "<b>Daily tasks</b> pay Brownlow votes, and each weekday has an event (double loot on Grand Final Weekend).",
  "<b>Brownlow votes 🏅</b> (gems) are rare, like Clash gems: a trickle from daily tasks, clearing trees, the odd win and premierships. Spend them wisely.",
  "<b>Not in yet:</b> clans, chat, real-player attacks and wars. Coming next.",
];
function showClashGuide(fromChoice){
  const rows=CLASH_MAP.map(([h,list])=>`<h3>${h}</h3><div class="map">${list.map(([a,b])=>`<span class="from">${a}</span><span class="arrow">→</span><span class="to">${b}</span>`).join("")}</div>`).join("");
  modal(`<h2>Footy Fortress for Clash players</h2><p class="center">Same game loop: build, train, attack, upgrade. Here's what everything is called.</p>${rows}
    <h3>What's different</h3><ul class="diffs">${CLASH_DIFFS.map(d=>`<li>${d}</li>`).join("")}</ul>
    <div class="center"><button class="btn green big" id="gotIt">Got it, let's play</button></div>`);
  $("gotIt").onclick=()=>{ closeModal(); if(fromChoice){ S.tut="done"; S.medals+=10; save(); toast("+10 🏅 to get you started"); } };
}
function showTutorialChoice(){
  modal(`<h2>Have you played Clash of Clans?</h2><p class="center">Pick how you'd like to learn the ropes.</p>
    <div class="choice">
      <button class="btn gold big" id="tutClash">👍 Yes<small>Show me what's what (30 seconds)</small></button>
      <button class="btn green big" id="tutNew">🆕 No<small>Walk me through it (about 3 minutes)</small></button>
      <button class="btn" id="tutSkip">Skip<small>I'll work it out</small></button>
    </div>`,{noClose:true});
  $("tutClash").onclick=()=>showClashGuide(true);
  $("tutNew").onclick=()=>{ closeModal(); startTutorial(); };
  $("tutSkip").onclick=()=>{ S.tut="done"; save(); closeModal(); };
}

// ---------- guided walkthrough ----------
const bCentre = t => () => { const b=S.buildings.find(x=>x.t===t); if(!b) return null; const s=BLD[b.t].size; return [b.x+s/2,b.y+s/2,.4]; };
// Each new building is finished for free during the walkthrough, like Clash's first builds.
const finishNew = t => () => { const b=[...S.buildings].reverse().find(x=>x.t===t&&x.busy); if(b){ b.busy.end=Date.now(); processTimers(); } };
const TUT = [
  {say:"G'day! I'm your Head Coach. This is your ground. It's a bit empty, so let's build it up together.", next:true},
  // 1. a defence first, like Clash's cannon
  {say:"Every ground needs a defence. Tap Shop.", el:"#btnShop", wait:"shop"},
  {say:"Tap the Defence tab.", el:'[data-tab="Defence"]', wait:"tab-Defence"},
  {say:"Tap the Siren Cannon. It blasts attackers on the ground.", el:'[data-t="siren"]', wait:"placing"},
  {say:"Drag it where you like, then tap ✔ to build it.", el:"#placeYes", wait:"placed"},
  {say:"Building takes time and each Groundskeeper 👷 works on one job at a time. I'll finish this one for free!", next:true, prep:finishNew("siren")},
  // 2. income: pies and drink
  {say:"Now let's make some pies 🥧, which pay for most buildings. Tap Shop.", el:"#btnShop", wait:"shop"},
  {say:"Tap the Resources tab.", el:'[data-tab="Resources"]', wait:"tab-Resources"},
  {say:"Tap the Pie Shop.", el:'[data-t="pieshop"]', wait:"placing"},
  {say:"Place it and tap ✔.", el:"#placeYes", wait:"placed"},
  {say:"Done! Your Pie Shop has already baked a batch. Tap it to collect.", world:bCentre("pieshop"), wait:"collect-pies", prep:()=>{ finishNew("pieshop")(); const b=S.buildings.find(x=>x.t==="pieshop"); if(b) b.store=Math.max(b.store,120); }},
  {say:"Sports drink 💧 pays for players. Tap Shop and build a Drink Tap.", el:"#btnShop", wait:"shop"},
  {say:"Tap the Resources tab.", el:'[data-tab="Resources"]', wait:"tab-Resources"},
  {say:"Tap the Drink Tap.", el:'[data-t="drinktap"]', wait:"placing"},
  {say:"Place it and tap ✔.", el:"#placeYes", wait:"placed"},
  {say:"Tap your Drink Tap to collect.", world:bCentre("drinktap"), wait:"collect-drink", prep:()=>{ finishNew("drinktap")(); const b=S.buildings.find(x=>x.t==="drinktap"); if(b) b.store=Math.max(b.store,120); }},
  // 3. a second groundskeeper, bought with Brownlow votes (like Clash's second builder with gems)
  {say:"One groundskeeper is slow going. Hire a second with your Brownlow votes 🏅. Tap Shop.", el:"#btnShop", wait:"shop"},
  {say:"Tap the Resources tab.", el:'[data-tab="Resources"]', wait:"tab-Resources"},
  {say:"Tap the Groundskeeper Shed.", el:'[data-t="shed"]', wait:"placing"},
  {say:"Place it and tap ✔. Now two jobs can run at once.", el:"#placeYes", wait:"placed"},
  // 4. a squad: training oval + bench
  {say:"Time to build a squad. Tap Shop.", el:"#btnShop", wait:"shop"},
  {say:"Tap the Squad tab.", el:'[data-tab="Squad"]', wait:"tab-Squad"},
  {say:"Tap the Training Oval. It's where players train.", el:'[data-t="oval"]', wait:"placing"},
  {say:"Place it and tap ✔.", el:"#placeYes", wait:"placed"},
  {say:"Players need somewhere to wait for match day. Tap Shop for an Interchange Bench.", el:"#btnShop", wait:"shop", prep:finishNew("oval")},
  {say:"Tap the Squad tab.", el:'[data-tab="Squad"]', wait:"tab-Squad"},
  {say:"Tap the Interchange Bench.", el:'[data-t="bench"]', wait:"placing"},
  {say:"Place it and tap ✔.", el:"#placeYes", wait:"placed"},
  {say:"Now train some players. Tap Squad.", el:"#btnSquad", wait:"squad", prep:finishNew("bench")},
  {say:"Tap Rover 3 times. Players cost 💧 and take a few seconds each.", el:'[data-u="rover"]', wait:"train", count:3},
  // 5. first match
  {say:"Close this window, then tap Match.", el:"#btnAttack", wait:"match", prep:()=>{ for(const u of S.queue.splice(0)) S.army[u]=(S.army[u]||0)+1; S.army.rover=Math.max(S.army.rover||0,8); uiDirty=true; }},
  {say:"The Season is 17 rounds against every other club. Win for 4 premiership points, finish top 8 for finals. Tap Play for Round 1.", el:'[data-r="0"]', wait:"battle"},
  {say:"This is their ground. Tap the grass outside the red zone to send a player in. Hold your finger down to send a stream.", world:deploySpot, wait:"deploy", top:true},
  {say:"It's scored like footy. Every building you knock down is a goal. They score a behind for each building still standing and each player they knock out. Outscore them by the siren! Send in the rest.", next:true, top:true},
  {say:"", wait:"battleEnd", hidden:true},
  {say:"Wins earn premiership points, trophies 🏆, loot and card packs. Tap Return Home.", el:"#goHome", wait:"home"},
  // 6. cards
  {say:"Here's a Silver Pack on me. Tap Cards.", el:"#btnCards", wait:"cards", prep:()=>{ S.packs.silver=(S.packs.silver||0)+1; uiDirty=true; }},
  {say:"Tap the Packs tab.", el:'[data-tab="Packs"]', wait:"tab-Packs"},
  {say:"Tap your Silver Pack to open it.", el:'[data-pack="silver"]', wait:"pack"},
  {say:"Real AFL players! Tap Nice! to see your collection.", el:"#pk", wait:"cards"},
  {say:"Tap a card to put it on your Team Sheet. Each card boosts your players in that position.", el:".cgrid [data-card]", wait:"team"},
  {say:"Close this. Next goals: build a Pie Warmer and Esky so you can hold more, then a fence and a Goal Tower. 📋 Tasks pay Brownlow votes every day, and 🛡️ Home shows when other clubs raid you.", el:"#side", next:true},
  {say:"That's the lot! Upgrade your Clubhouse to unlock more buildings, players and your captain. Here's 10 🏅 to get going. Good luck!", next:true, finish:true},
];
let tutCount=0;
// A patch of grass just outside the map edge that's on screen, near the lower middle
function deploySpot(){ let best=null, bd=1e9;
  for(let i=0;i<=N;i+=2) for(const [x,y] of [[i,-1.2],[-1.2,i],[i,N+1.2],[N+1.2,i]]){ const [px,py]=P(x,y); if(px<W*.12||px>W*.88||py<H*.2||py>H*.7) continue; const d=Math.hypot(px-W/2,py-H*.62); if(d<bd){bd=d;best=[x,y,0];} }
  return best||[C0,-1.2,0]; }
function startTutorial(){ S.tut=0; S.nextRaid=Date.now()+20*60000; tutCount=0; save(); showTutStep(); }
function tutActive(){ return S&&typeof S.tut==="number"&&S.tut<TUT.length; }
function tut(ev){
  if(!tutActive()) return;
  const st=TUT[S.tut]; if(st.wait!==ev) return;
  if(st.count&&++tutCount<st.count){ showTutStep(); return; }
  tutCount=0; advanceTut();
}
function advanceTut(){
  uiDirty=true;
  const st=TUT[S.tut];
  if(st.finish){ S.tut="done"; S.medals+=10; save(); $("tut").classList.add("hide"); $("tutHand").classList.add("hide"); toast("+10 🏅"); sfx("cheer"); uiDirty=true; return; }
  S.tut++; save(); setTimeout(showTutStep,250);
}
function showTutStep(){
  if(!tutActive()){ $("tut").classList.add("hide"); $("tutHand").classList.add("hide"); return; }
  const st=TUT[S.tut];
  if(st.prep&&!st._prepped){ st.prep(); st._prepped=true; }
  $("tut").classList.toggle("hide",!!st.hidden);
  $("tutAvatar").src=playerIcon("hero:coach");
  $("tutText").textContent=st.say+(st.count&&tutCount?` (${tutCount}/${st.count})`:"");
  $("tutNext").classList.toggle("hide",!st.next);
  if(st.world){ const w=st.world(); if(w&&mode==="home") centreOn(w[0],w[1]); }
}
// keep the pointer glued to its target every frame
function tutFrame(){
  requestAnimationFrame(tutFrame);
  const hand=$("tutHand"), box=$("tut");
  if(!tutActive()){ hand.classList.add("hide"); return; }
  const st=TUT[S.tut]; let x=null, y=null;
  if(st.el){ const el=document.querySelector(st.el); if(el&&el.offsetParent!==null){ const r=el.getBoundingClientRect(); x=r.left+r.width/2; y=r.top+r.height/2; } }
  else if(st.world){ const w=st.world(); if(w){ const [px,py]=P(w[0],w[1],w[2]||0); x=px*innerWidth/W; y=py*innerHeight/H; } }
  if(st.hidden||x===null){ hand.classList.add("hide"); }
  else { hand.classList.remove("hide"); hand.style.left=x+"px"; hand.style.top=y+"px"; }
  const pos = st.top ? "atTop" : (y!==null && y>innerHeight*.5) ? "atTop" : "atBottom";
  if(!box.classList.contains(pos)){ box.classList.remove("atTop","atBottom","atMid"); box.classList.add(pos); }
}
$("tutNext").onclick=()=>{ sfx("tap",.4); advanceTut(); };
$("tutSkip2").onclick=()=>{ S.tut="done"; save(); showTutStep(); toast("Tutorial skipped. You can replay it from Settings."); };
requestAnimationFrame(tutFrame);

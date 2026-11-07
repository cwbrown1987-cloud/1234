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
  "<b>Matches are scored like footy.</b> Knock down a building = goal. They get a behind for each building still standing and each player they knock out (goal for big ones). Outscore them to win.",
  "<b>The Season is a real ladder.</b> 4 points a win, percentage splits ties, top 8 play finals, win the Grand Final for a premiership.",
  "<b>Daily tasks</b> pay Brownlow votes, and each weekday has an event (double loot on Grand Final Weekend).",
  "<b>Brownlow votes 🏅</b> (gems) come from tasks, clearing trees, Season stars and revenge, never real money.",
  "<b>Not in yet:</b> clans, chat, real-player attacks and wars. Coming next.",
];
function showClashGuide(fromChoice){
  const rows=CLASH_MAP.map(([h,list])=>`<h3>${h}</h3><div class="map">${list.map(([a,b])=>`<span class="from">${a}</span><span class="arrow">→</span><span class="to">${b}</span>`).join("")}</div>`).join("");
  modal(`<h2>Footy Fortress for Clash players</h2><p class="center">Same game loop: build, train, attack, upgrade. Here's what everything is called.</p>${rows}
    <h3>What's different</h3><ul class="diffs">${CLASH_DIFFS.map(d=>`<li>${d}</li>`).join("")}</ul>
    <div class="center"><button class="btn green big" id="gotIt">Got it, let's play</button></div>`);
  $("gotIt").onclick=()=>{ closeModal(); if(fromChoice){ S.tut="done"; S.medals+=50; save(); toast("+50 🏅 to get you started"); } };
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
const TUT = [
  {say:"G'day! I'm your Head Coach. This is your home ground. Let's get you ready for match day.", next:true},
  {say:"Your Pie Shop bakes pies 🥧. Tap it to collect them.", world:bCentre("pieshop"), wait:"collect-pies", prep:()=>{ const b=S.buildings.find(x=>x.t==="pieshop"); b.store=Math.max(b.store,120); }},
  {say:"Nice! The Drink Tap brews sports drink 💧. Tap it too.", world:bCentre("drinktap"), wait:"collect-drink", prep:()=>{ const b=S.buildings.find(x=>x.t==="drinktap"); b.store=Math.max(b.store,120); }},
  {say:"Pies pay for most buildings. Sports drink pays for players. Let's build a defence. Tap Shop.", el:"#btnShop", wait:"shop"},
  {say:"Tap the Defence tab.", el:'[data-tab="Defence"]', wait:"tab-Defence"},
  {say:"Tap the Goal Tower. It kicks footies at attackers.", el:'[data-t="goalpost"]', wait:"placing"},
  {say:"Drag it anywhere you like, then tap ✔ to build it.", el:"#placeYes", wait:"placed"},
  {say:"Building takes time, and each Groundskeeper 👷 works on one job at a time. I'll finish this one for free!", next:true, prep:()=>{ const b=[...S.buildings].reverse().find(x=>x.t==="goalpost"&&x.busy); if(b){ b.busy.end=Date.now(); processTimers(); } }},
  {say:"Now your squad. Tap Squad.", el:"#btnSquad", wait:"squad"},
  {say:"Tap Rover 3 times to train some players. They cost 💧 and take a few seconds each.", el:'[data-u="rover"]', wait:"train", count:3},
  {say:"Trained players wait on your Interchange Bench. Close this window, then tap Match.", el:"#btnAttack", wait:"match"},
  {say:"The Season is 17 rounds against every other club. Win for 4 premiership points, finish top 8 for finals. Tap Play for Round 1.", el:'[data-r="0"]', wait:"battle"},
  {say:"This is their ground. Tap the grass outside the red zone to send a player in. Hold your finger down to send a stream.", world:deploySpot, wait:"deploy", top:true},
  {say:"It's scored like footy. Every building you knock down is a goal. They score a behind for each building still standing and each player they knock out. Outscore them by the siren! Send in the rest.", next:true, top:true},
  {say:"", wait:"battleEnd", hidden:true},
  {say:"Wins earn premiership points, trophies 🏆, loot and card packs. Tap Return Home.", el:"#goHome", wait:"home"},
  {say:"Here's a Silver Pack on me. Tap Cards.", el:"#btnCards", wait:"cards", prep:()=>{ S.packs.silver=(S.packs.silver||0)+1; uiDirty=true; }},
  {say:"Tap the Packs tab.", el:'[data-tab="Packs"]', wait:"tab-Packs"},
  {say:"Tap your Silver Pack to open it.", el:'[data-pack="silver"]', wait:"pack"},
  {say:"Real AFL players! Tap Nice! to see your collection.", el:"#pk", wait:"cards"},
  {say:"Tap a card to put it on your Team Sheet. Each card boosts your players in that position.", el:".cgrid [data-card]", wait:"team"},
  {say:"Close this. Two more things: 📋 Tasks give you Brownlow votes 🏅 every day, and the 🛡️ Log shows when other clubs raid your ground. You can watch the replay and get revenge.", el:"#side", next:true},
  {say:"That's the lot! Upgrade your Clubhouse to unlock more buildings, players and your Head Coach. Here's 50 🏅 to get going. Good luck!", next:true, finish:true},
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
  if(st.finish){ S.tut="done"; S.medals+=50; save(); $("tut").classList.add("hide"); $("tutHand").classList.add("hide"); toast("+50 🏅"); sfx("cheer"); uiDirty=true; return; }
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

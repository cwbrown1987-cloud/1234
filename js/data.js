// ---------- Game data ----------
const VERSION = "2026.11.10.13";
// Club names + colours. Logos: drop PNGs named <abbr>.png (e.g. coll.png) into the logos/ folder and they're used everywhere.
// Player names checked against the 2026 trade period and retirements (lists for the 2027 season); edit freely.
const CLUBS = [
  {abbr:"adel", short:"ADE", name:"Adelaide Crows",      a:"#002b5c", b:"#e21937", c:"#ffd200", hero:{name:"Jordan Dawson",pos:"mid"},           players:[["Izak Rankine","fwd"],["Rory Laird","def"]]},
  {abbr:"bris", short:"BRI", name:"Brisbane Lions",      a:"#7a0a3c", b:"#fdbe57", c:"#0055a3", hero:{name:"Lachie Neale",pos:"mid"},            players:[["Harris Andrews","def"],["Charlie Cameron","fwd"]]},
  {abbr:"carl", short:"CAR", name:"Carlton Blues",       a:"#0e1e2d", b:"#ffffff", c:"#9aa8b8", hero:{name:"Patrick Cripps",pos:"mid"},          players:[["Harry McKay","fwd"],["Sam Walsh","mid"]]},
  {abbr:"coll", short:"COL", name:"Collingwood Magpies", a:"#111111", b:"#ffffff", c:"#888888", hero:{name:"Nick Daicos",pos:"mid"},             players:[["Darcy Moore","def"],["Josh Daicos","mid"]]},
  {abbr:"ess",  short:"ESS", name:"Essendon Bombers",    a:"#111111", b:"#cc2031", c:"#e8e8e8", hero:{name:"Nic Martin",pos:"mid"},              players:[["Kyle Langford","fwd"],["Keidean Coleman","def"]]},
  {abbr:"freo", short:"FRE", name:"Fremantle Dockers",   a:"#2a0d54", b:"#ffffff", c:"#9b8bc4", hero:{name:"Caleb Serong",pos:"mid"},            players:[["Luke Jackson","ruck"],["Andrew Brayshaw","mid"]]},
  {abbr:"geel", short:"GEE", name:"Geelong Cats",        a:"#001f3d", b:"#ffffff", c:"#5f87b8", hero:{name:"Jeremy Cameron",pos:"fwd"},          players:[["Patrick Dangerfield","mid"],["Tom Stewart","def"]]},
  {abbr:"gcs",  short:"GCS", name:"Gold Coast Suns",     a:"#e02112", b:"#ffe600", c:"#0b4ea2", hero:{name:"Matt Rowell",pos:"mid"},             players:[["Noah Anderson","mid"],["Touk Miller","mid"]]},
  {abbr:"gws",  short:"GWS", name:"GWS Giants",          a:"#f15c22", b:"#4a4f55", c:"#ffffff", hero:{name:"Tom Green",pos:"mid"},               players:[["Clayton Oliver","mid"],["Sam Taylor","def"]]},
  {abbr:"haw",  short:"HAW", name:"Hawthorn Hawks",      a:"#4d2004", b:"#fbbf15", c:"#ffffff", hero:{name:"James Sicily",pos:"def"},            players:[["Zach Merrett","mid"],["Will Day","mid"]]},
  {abbr:"melb", short:"MEL", name:"Melbourne Demons",    a:"#0f1131", b:"#cc2031", c:"#ffffff", hero:{name:"Max Gawn",pos:"ruck"},               players:[["Kysaiah Pickett","fwd"],["Jake Bowey","def"]]},
  {abbr:"nmfc", short:"NM",  name:"North Melbourne",     a:"#013b9f", b:"#ffffff", c:"#7fa6e8", hero:{name:"Harry Sheezel",pos:"def"},           players:[["Luke Davies-Uniacke","mid"],["Tristan Xerri","ruck"]]},
  {abbr:"port", short:"PTA", name:"Port Adelaide Power", a:"#111111", b:"#008aab", c:"#ffffff", hero:{name:"Connor Rozee",pos:"mid"},            players:[["Jason Horne-Francis","mid"],["Mitch Georgiades","fwd"]]},
  {abbr:"rich", short:"RIC", name:"Richmond Tigers",     a:"#111111", b:"#fed102", c:"#ffffff", hero:{name:"Tim Taranto",pos:"mid"},             players:[["Jacob Hopper","mid"],["Noah Balta","def"]]},
  {abbr:"stk",  short:"STK", name:"St Kilda Saints",     a:"#ed0f05", b:"#111111", c:"#ffffff", hero:{name:"Nasiah Wanganeen-Milera",pos:"def"}, players:[["Jack Sinclair","mid"],["Max King","fwd"]]},
  {abbr:"syd",  short:"SYD", name:"Sydney Swans",        a:"#ed171f", b:"#ffffff", c:"#999999", hero:{name:"Isaac Heeney",pos:"fwd"},            players:[["Errol Gulden","mid"],["Chad Warner","mid"]]},
  {abbr:"wce",  short:"WCE", name:"West Coast Eagles",   a:"#002b79", b:"#f2a900", c:"#ffffff", hero:{name:"Harley Reid",pos:"mid"},             players:[["Jake Waterman","fwd"],["Liam Duggan","def"]]},
  {abbr:"wb",   short:"WB",  name:"Western Bulldogs",    a:"#014896", b:"#e31937", c:"#ffffff", hero:{name:"Marcus Bontempelli",pos:"mid"},      players:[["Zak Butters","mid"],["Ed Richards","def"]]},
];

const HERO_POS = {
  mid: {hp:1100, dps:70, spd:2.2, range:0.9, ability:"Burst Clearance", desc:"Heals and goes into a rage: faster and hits harder."},
  fwd: {hp:800,  dps:60, spd:2.0, range:4.0, ranged:true, ability:"Set Shot", desc:"Kicks three bombs at nearby buildings."},
  ruck:{hp:1700, dps:55, spd:1.6, range:1.0, ability:"Hit-Out", desc:"Smashes everything nearby and heals."},
  def: {hp:1400, dps:50, spd:1.9, range:0.9, ability:"Spoil", desc:"Big heal and takes half damage for a while."},
  coach:{hp:900, dps:40, spd:1.7, range:3.5, ranged:true, ability:"Three-Quarter Time Address", desc:"Everyone nearby heals 40% and fires up."},
  vice:{hp:1300, dps:80, spd:2.3, range:0.9, ability:"Centre Clearance", desc:"Stuns nearby defences for 4 seconds and fires himself up."},
  star:{hp:900, dps:75, spd:2.0, range:4.5, ranged:true, ability:"Bag of Goals", desc:"Kicks five bombs at the nearest buildings."},
  rleg:{hp:2000, dps:45, spd:1.5, range:1.0, ability:"Ruck Wall", desc:"Nearby players take no damage for 4 seconds. Always: nearby players take 15% less damage."},
};
const HEROES = {
  captain:{building:"locker", th:2, name:c=>c.hero.name, pos:c=>c.hero.pos},
  coach:{building:"office", th:5, name:()=>"Head Coach", pos:()=>"coach"},
  vice:{building:"herohall", hhLv:1, th:6, title:"Vice-Captain", name:c=>heroPlayer(c,"vice"), pos:()=>"vice"},
  star:{building:"herohall", hhLv:2, th:7, title:"Star Forward", name:c=>heroPlayer(c,"star"), pos:()=>"star"},
  rleg:{building:"herohall", hhLv:3, th:8, title:"Ruck Legend", name:c=>heroPlayer(c,"rleg"), pos:()=>"rleg"},
};
// Obstacles, like Clash: small and big trees, bushes, stumps and rocks. Trees cost 💧 to clear, rocks cost 🥧 (Clash: elixir / gold).
// Clearing takes a groundskeeper for a few seconds. A new one grows every 8 hours (up to OBSTACLE_MAX). Clearing can drop a few Brownlow votes.
const OBSTACLES = {
  bush:   {name:"Wattle Bush",   s:1, res:"drink", cost:80, time:10,  w:5, votes:[0,1]},
  stump:  {name:"Old Stump",     s:2, res:"drink", cost:150, time:15, w:2, votes:[0,2]},
  tree:   {name:"Gum Tree",      s:2, res:"drink", cost:200, time:15, w:5, votes:[0,2]},
  bigtree:{name:"River Red Gum", s:3, res:"drink", cost:450, time:30, w:2, votes:[1,4]},
  rock:   {name:"Rock",          s:2, res:"pies",  cost:200, time:20, w:4, votes:[0,2]},
  bigrock:{name:"Boulder",       s:3, res:"pies",  cost:450, time:30, w:2, votes:[1,4]},
};
const OBSTACLE_MAX = 30, OBSTACLE_EVERY = 8*3600e3;
// Older saves have little 1x1 trees/bushes/rocks: treat them as the small versions.
const obsInfo = o => o.s ? OBSTACLES[o.k] : {...OBSTACLES[o.k==="rock"?"rock":o.k==="bush"?"bush":"tree"], name:o.k==="bush"?"Wattle Bush":o.k==="rock"?"Small Rock":"Young Gum", cost:100, time:10, votes:[0,1]};
const HERO_SLOTS = 4; // heroes you can take into one match (Clash's Hero Hall)
// The extra heroes are real players from the 2026 season: most disposals, most goals, most hit-outs (not the captain).
const heroPlayerCache = {};
function heroPlayer(club, key){
  const i = CLUBS.indexOf(club), id = club.abbr+key;
  if (heroPlayerCache[id]) return heroPlayerCache[id];
  const list = (typeof CARD_SET!=="undefined" && CARD_SET[i]) || [];
  const ps = list.filter(p=>p[0]!==club.hero.name), by=k=>[...ps].sort((a,b)=>b[3][k]-a[3][k]);
  const v=by(1)[0], s2=by(2).find(p=>p!==v), r=by(5).find(p=>p!==v&&p!==s2);
  const pick = {vice:v, star:s2, rleg:r}[key];
  return heroPlayerCache[id] = pick ? pick[0] : ({vice:"Vice-Captain", star:"Star Forward", rleg:"Ruck Legend"})[key];
}
const heroMax = (th,h) => ({coach:Math.max(0,(th-4)*4), vice:Math.max(0,(th-5)*5), star:Math.max(0,(th-6)*6), rleg:Math.max(0,(th-7)*8)})[h] ?? th*2;
const heroCost = lv => Math.round(1500*Math.pow(1.45,lv-1));
const heroTime = lv => Math.min(7200, Math.round(20*Math.pow(1.5,lv-1)));

const N = 34;      // map size
const MAX_TH = 8;
const geo = (a,r,n,cap) => Array.from({length:n},(_,i)=>{ const v=Math.round(a*Math.pow(r,i)); return cap?Math.min(cap,v):v; });
const nice = arr => arr.map(v => v<1000?Math.round(v/10)*10 : v<10000?Math.round(v/100)*100 : Math.round(v/1000)*1000);
const T = n => geo(10,2.1,n,7200);   // build times in seconds, capped at 2 hours

const BLD = {
  clubhouse:{name:"Clubhouse", size:4, res:"pies", hp:geo(1500,1.28,8), cost:[0,1000,4000,15000,50000,150000,350000,700000], time:[0,60,300,900,1800,3600,5400,7200],
    store:geo(1000,1.8,8), desc:"The heart of your club. Upgrade it to unlock new buildings and higher levels."},
  pieshop:{name:"Pie Shop", size:3, res:"drink", hp:geo(400,1.12,10), cost:nice(geo(150,2.0,10)), time:T(10),
    rate:geo(20,1.4,10), cap:nice(geo(300,1.6,10)), makes:"pies", desc:"Bakes pies. Tap it to collect."},
  drinktap:{name:"Drink Tap", size:3, res:"pies", hp:geo(400,1.12,10), cost:nice(geo(150,2.0,10)), time:T(10),
    rate:geo(20,1.4,10), cap:nice(geo(300,1.6,10)), makes:"drink", desc:"Brews sports drink. Tap it to collect."},
  piewarmer:{name:"Pie Warmer", size:3, res:"drink", hp:geo(600,1.15,10), cost:nice(geo(300,2.0,10)), time:T(10),
    cap:nice(geo(1500,1.75,10)), stores:"pies", desc:"Keeps your pies hot. Raises how many you can hold."},
  esky:{name:"Esky", size:3, res:"pies", hp:geo(600,1.15,10), cost:nice(geo(300,2.0,10)), time:T(10),
    cap:nice(geo(1500,1.75,10)), stores:"drink", desc:"Keeps the drinks cold. Raises how much you can hold."},
  oval:{name:"Training Oval", size:3, res:"drink", hp:geo(250,1.15,8), cost:nice(geo(200,2.3,8)), time:T(8),
    unlock:["rover","forward","ruck","tagger","shepherd","seagulls","trainer","blimp"], desc:"Trains players. Each level unlocks a new position."},
  bench:{name:"Interchange Bench", size:3, res:"drink", hp:geo(250,1.1,8), cost:nice(geo(250,2.4,8)), time:T(8),
    space:[20,30,40,50,60,70,80,90], desc:"Where your trained players wait. More benches, bigger squad."},
  physio:{name:"Physio Room", size:3, res:"drink", hp:geo(425,1.12,5), cost:nice(geo(5000,2.4,5)), time:[60,600,1800,3600,7200],
    unlock:["oranges","roar","freekick","rain","sub"], slots:[2,3,4,5,6], desc:"Brews match-day spells."},
  coachbox:{name:"Coaches Box", size:3, res:"drink", hp:geo(500,1.1,7), cost:nice(geo(2500,2.2,7)), time:[60,300,1200,2400,3600,5400,7200],
    desc:"Research better skills for your players."},
  locker:{name:"Captain's Locker", size:3, res:"pies", hp:[400], cost:[3000], time:[30], desc:"Home of your captain, the star of your club."},
  herohall:{name:"Hero Hall", size:3, res:"pies", hp:[700,800,900], cost:[80000,150000,300000], time:[1800,3600,7200], desc:"Home of your Vice-Captain, Star Forward and Ruck Legend. Pick up to 4 heroes for each match (Clash's Hero Hall)."},
  kitroom:{name:"Kit Room", size:3, res:"drink", hp:[500,560,620,680,750], cost:[10000,25000,60000,120000,250000], time:[300,1200,2400,3600,7200], desc:"Unlocks and upgrades hero gear (Clash's Blacksmith). Higher levels unlock more gear and higher gear levels."},
  office:{name:"Coach's Office", size:3, res:"pies", hp:[600], cost:[60000], time:[600], desc:"Home of your Head Coach, your second hero."},
  shed:{name:"Groundskeeper Shed", size:2, res:"medals", hp:[250], cost:[0], time:[0], desc:"Each groundskeeper can work on one building at a time."},
  goalpost:{name:"Goal Tower", size:3, res:"pies", hp:geo(380,1.12,10), cost:nice(geo(1000,2.0,10)), time:T(10),
    dps:geo(16,1.22,10), range:7, rate:0.8, shot:"footy", def:true, ground:true, air:true, desc:"Kicks footies at attackers on the ground and in the air."},
  siren:{name:"Siren Cannon", size:3, res:"pies", hp:geo(420,1.12,10), cost:nice(geo(250,2.3,10)), time:T(10),
    dps:geo(14,1.25,10), range:6, rate:0.8, shot:"siren", def:true, ground:true, desc:"Blasts ground attackers with sound. Hits hard, can't hit air."},
  catapult:{name:"Kick-Out Catapult", size:3, res:"pies", hp:geo(400,1.12,7), cost:nice(geo(8000,2.0,7)), time:T(7).map(t=>Math.max(t,300)),
    dps:geo(30,1.2,7), range:11, minr:4, rate:5, splash:1.6, shot:"bomb", def:true, ground:true, desc:"Lobs huge kicks that splash groups. Can't hit up close."},
  floodlight:{name:"Floodlight Tower", size:3, res:"pies", hp:geo(500,1.12,7), cost:nice(geo(12000,1.9,7)), time:T(7).map(t=>Math.max(t,300)),
    dps:geo(80,1.22,7), range:9, rate:1, shot:"beam", def:true, air:true, desc:"Blinding lights that knock flyers out of the sky. Air only."},
  sprinkler:{name:"Sprinkler Trap", size:1, res:"pies", hp:[1,1,1,1,1], cost:[400,1000,3000,8000,20000], time:[0,30,120,600,1800], dmg:geo(60,1.3,5), trap:true,
    desc:"Hidden from attackers. Soaks anyone who runs over it."},
  fence:{name:"Fence", size:1, res:"pies", hp:geo(300,1.5,8), cost:[50,1000,5000,10000,20000,50000,100000,200000], time:[0,0,0,0,0,0,0,0], desc:"Slows attackers down."},
};
// How many of each you can have, by clubhouse level 1..8
const MAXC = {
  clubhouse:[1,1,1,1,1,1,1,1], pieshop:[1,2,3,4,5,6,6,7], drinktap:[1,2,3,4,5,6,6,7], piewarmer:[1,1,2,2,3,3,4,4], esky:[1,1,2,2,3,3,4,4],
  oval:[1,1,2,2,3,3,4,4], bench:[1,1,2,2,3,3,4,4], physio:[0,0,1,1,1,1,1,1], coachbox:[0,0,1,1,1,1,1,1], locker:[0,1,1,1,1,1,1,1], office:[0,0,0,0,1,1,1,1], kitroom:[0,0,0,1,1,1,1,1], herohall:[0,0,0,0,0,1,1,1],
  shed:[6,6,6,6,6,6,6,6], goalpost:[1,1,2,3,4,5,5,6], siren:[1,2,2,3,3,4,5,5], catapult:[0,0,1,1,2,2,3,3], floodlight:[0,0,0,1,2,2,3,3],
  sprinkler:[0,2,4,6,6,8,8,10], fence:[25,50,75,100,125,150,175,200],
};
// What each building is called in Clash of Clans (shown in the shop for players who know Clash)
const CLASH_NAME = {clubhouse:"Town Hall", pieshop:"Gold Mine", drinktap:"Elixir Collector", piewarmer:"Gold Storage", esky:"Elixir Storage",
  oval:"Barracks", bench:"Army Camp", physio:"Spell Factory", coachbox:"Laboratory", locker:"Hero Hall", office:"Hero Hall",
  shed:"Builder's Hut", kitroom:"Blacksmith", herohall:"Hero Hall", goalpost:"Archer Tower", siren:"Cannon", catapult:"Mortar", floodlight:"Air Defense", sprinkler:"Bomb", fence:"Wall"};
const levels = t => BLD[t].hp.length;
const maxLevel = (t, th) => t==="clubhouse" ? MAX_TH : t==="herohall" ? Math.max(0,Math.min(levels(t),th-5)) : t==="fence" ? Math.min(levels(t),th) : Math.min(levels(t), th+(th>=5?2:1));
const SHED_COST = [0,250,500,1000,2000,2000]; // by sheds already owned: the 2nd costs 250 Brownlow votes, like Clash
const SHOP_TABS = {
  "Resources":["pieshop","drinktap","piewarmer","esky","shed"],
  "Defence":["goalpost","siren","catapult","floodlight","sprinkler","fence"],
  "Squad":["oval","bench","physio","coachbox","locker","office","kitroom","herohall"],
  "Deals":[],
};

// Players you can train. pref = what they go after. air = flies over fences, only some defences can hit it.
const UNITS = {
  rover:   {name:"Rover",        space:1,  hp:80,  dps:12, spd:2.2, range:0.8, pref:"any",      cost:25,   time:4,  card:"mid",  desc:"Quick, cheap, goes for anything."},
  forward: {name:"Full-Forward", space:1,  hp:40,  dps:10, spd:2.0, range:3.5, pref:"any",      cost:50,   time:5,  card:"fwd",  ranged:true, desc:"Kicks from range. Fragile."},
  ruck:    {name:"Ruckman",      space:5,  hp:420, dps:12, spd:1.3, range:0.9, pref:"defence",  cost:250,  time:15, card:"ruck", desc:"A wall of a man. Goes straight for defences."},
  tagger:  {name:"Crumber",       space:1,  hp:35,  dps:15, spd:3.2, range:0.7, pref:"resource", cost:40,   time:6,  card:"mid",  desc:"Crumbs the loose stuff: runs at pies and drinks, double damage on them."},
  shepherd:{name:"Shepherd",     space:2,  hp:25,  dps:40, spd:2.8, range:0.6, pref:"fence",    cost:100,  time:10, card:"def",  desc:"Bumps through fences. Huge fence damage, then he's done."},
  seagulls:{name:"Seagulls",     space:2,  hp:55,  dps:16, spd:3.0, range:0.9, pref:"any",      cost:120,  time:8,  card:"fwd",  air:true, desc:"A flock that flies over fences and pecks at anything. Hot chips not included."},
  trainer: {name:"Trainer",      space:14, hp:500, dps:0,  spd:1.8, range:4.0, pref:"heal",     cost:1500, time:40, card:"def",  heal:35, desc:"Runs water and heals your players."},
  blimp:   {name:"Blimp",        space:5,  hp:450, dps:110,spd:1.1, range:0.4, pref:"defence",  cost:600,  time:25, card:"ruck", air:true, splash:1.2, desc:"Floats over everything and drops bombs on defences."},
};
const unitMul = lv => 1 + 0.22*(lv-1);
const UNIT_MAX = 7;
const RESEARCH_COST = [0, 5000, 20000, 60000, 150000, 300000, 600000];
const RESEARCH_TIME = [0, 60, 300, 900, 1800, 3600, 7200];

const SPELLS = {
  oranges: {name:"Half-time Oranges", cost:1500, time:20, radius:3.5, dur:3, desc:"Heals your players in the zone."},
  roar:    {name:"Crowd Roar",        cost:2000, time:25, radius:3,   dur:6, desc:"Players in the zone run faster and hit harder."},
  freekick:{name:"Umpire's Free Kick",cost:1800, time:25, radius:1.6, dmg:160, desc:"Three strikes on buildings at that spot."},
  rain:    {name:"Rain Delay",        cost:3000, time:35, radius:3,   dur:5, desc:"Defences in the zone stop firing for a few seconds."},
  sub:     {name:"Late Sub",          cost:2500, time:30, radius:0,   desc:"Drops 6 fresh Rovers onto the spot."},
};

const POS_NAME = {mid:"Midfielder", fwd:"Forward", ruck:"Ruckman", def:"Defender", coach:"Coach", vice:"Vice-Captain", star:"Star Forward", rleg:"Ruck Legend"};
// Card packs (the card album itself is in js/cards.js and js/cardset.js)
const PACKS = {footy:{name:"Footy Pack", n:7}, prize:{name:"Prize Pack", n:8}};
// Daily tasks and weekly events
const TASKS = [
  {k:"win",     goal:2,    text:n=>`Win ${n} matches`},
  {k:"destroy", goal:15,   text:n=>`Knock down ${n} buildings`},
  {k:"pies",    goal:2000, text:n=>`Collect ${n} pies`},
  {k:"drink",   goal:2000, text:n=>`Collect ${n} sports drink`},
  {k:"train",   goal:20,   text:n=>`Train ${n} players`},
  {k:"upgrade", goal:1,    text:n=>`Start ${n} upgrade${n>1?"s":""}`},
  {k:"pack",    goal:1,    text:n=>`Open ${n} pack${n>1?"s":""}`},
  {k:"defend",  goal:1,    text:n=>n>1?`Defend your ground ${n} times`:"Defend your ground once"},
];
const EVENTS = { // by weekday, 0 = Sunday
  0:{name:"Grand Final Weekend", desc:"Double loot from matches", loot:2},
  2:{name:"Training Day", desc:"Players train twice as fast", train:2},
  4:{name:"Pie Night", desc:"Pie Shops bake twice as fast", pies:2},
  5:{name:"Grand Final Weekend", desc:"Double loot from matches", loot:2},
  6:{name:"Grand Final Weekend", desc:"Double loot from matches", loot:2},
};
const eventNow = () => EVENTS[new Date().getDay()] || null;

const LEAGUES = [[0,"Local Footy"],[200,"Under-18s"],[500,"State League"],[900,"VFL"],[1400,"AFLW Division"],[2000,"AFL Premiership"],[3000,"Hall of Fame"]];
const league = tr => LEAGUES.filter(l=>tr>=l[0]).pop()[1];

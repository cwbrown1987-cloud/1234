// ---------- Game data ----------
// Clubs: names + colours only (no logos). Each club's hero is one of its star players.
// Rosters change every trade period, so edit the hero names here whenever you like.
const CLUBS = [
  {name:"Adelaide Crows",        a:"#002b5c", b:"#e21937", hero:{name:"Jordan Dawson",        pos:"mid"}},
  {name:"Brisbane Lions",        a:"#7a0a3c", b:"#fdbe57", hero:{name:"Lachie Neale",         pos:"mid"}},
  {name:"Carlton Blues",         a:"#0e1e2d", b:"#ffffff", hero:{name:"Patrick Cripps",       pos:"mid"}},
  {name:"Collingwood Magpies",   a:"#111111", b:"#ffffff", hero:{name:"Nick Daicos",          pos:"mid"}},
  {name:"Essendon Bombers",      a:"#111111", b:"#cc2031", hero:{name:"Zach Merrett",         pos:"mid"}},
  {name:"Fremantle Dockers",     a:"#2a0d54", b:"#ffffff", hero:{name:"Caleb Serong",         pos:"mid"}},
  {name:"Geelong Cats",          a:"#001f3d", b:"#ffffff", hero:{name:"Jeremy Cameron",       pos:"fwd"}},
  {name:"Gold Coast Suns",       a:"#e02112", b:"#ffe600", hero:{name:"Matt Rowell",          pos:"mid"}},
  {name:"GWS Giants",            a:"#f15c22", b:"#4a4f55", hero:{name:"Tom Green",            pos:"mid"}},
  {name:"Hawthorn Hawks",        a:"#4d2004", b:"#fbbf15", hero:{name:"James Sicily",         pos:"def"}},
  {name:"Melbourne Demons",      a:"#0f1131", b:"#cc2031", hero:{name:"Max Gawn",             pos:"ruck"}},
  {name:"North Melbourne",       a:"#013b9f", b:"#ffffff", hero:{name:"Harry Sheezel",        pos:"def"}},
  {name:"Port Adelaide Power",   a:"#111111", b:"#008aab", hero:{name:"Zak Butters",          pos:"mid"}},
  {name:"Richmond Tigers",       a:"#111111", b:"#fed102", hero:{name:"Tim Taranto",          pos:"mid"}},
  {name:"St Kilda Saints",       a:"#ed0f05", b:"#111111", hero:{name:"Nasiah Wanganeen-Milera", pos:"def"}},
  {name:"Sydney Swans",          a:"#ed171f", b:"#ffffff", hero:{name:"Isaac Heeney",         pos:"fwd"}},
  {name:"West Coast Eagles",     a:"#002b79", b:"#f2a900", hero:{name:"Harley Reid",          pos:"mid"}},
  {name:"Western Bulldogs",      a:"#014896", b:"#e31937", hero:{name:"Marcus Bontempelli",   pos:"mid"}},
];

const HERO_POS = {
  mid: {hp:1100, dps:70, spd:2.2, range:0.9, ability:"Burst Clearance", desc:"Heals and goes into a rage: faster and hits harder."},
  fwd: {hp:800,  dps:60, spd:2.0, range:4.0, ranged:true, ability:"Set Shot", desc:"Kicks three bombs at nearby buildings."},
  ruck:{hp:1700, dps:55, spd:1.6, range:1.0, ability:"Hit-Out", desc:"Smashes everything nearby and heals."},
  def: {hp:1400, dps:50, spd:1.9, range:0.9, ability:"Spoil", desc:"Big heal and takes half damage for a while."},
};
const heroMax = th => th*2;
const heroCost = lv => Math.round(1500*Math.pow(1.6,lv-1));
const heroTime = lv => Math.round(20*Math.pow(1.7,lv-1));

const N = 30; // map size

// res: what it costs to build/upgrade. Arrays are per level.
const BLD = {
  clubhouse:{name:"Clubhouse", size:4, res:"pies", hp:[1500,2000,2600,3300,4200], cost:[0,1000,4000,15000,50000], time:[0,60,300,900,1800],
    store:[1000,2000,4000,7000,10000], desc:"The heart of your club. Upgrade it to unlock new buildings and higher levels."},
  pieshop:{name:"Pie Shop", size:3, res:"drink", hp:[400,450,500,560,620,700], cost:[150,600,2000,6000,15000,30000], time:[10,60,180,600,1200,2400],
    rate:[20,35,55,80,110,150], cap:[300,700,1200,2000,3000,4500], makes:"pies", desc:"Bakes pies. Tap it to collect."},
  drinktap:{name:"Drink Tap", size:3, res:"pies", hp:[400,450,500,560,620,700], cost:[150,600,2000,6000,15000,30000], time:[10,60,180,600,1200,2400],
    rate:[20,35,55,80,110,150], cap:[300,700,1200,2000,3000,4500], makes:"drink", desc:"Brews sports drink. Tap it to collect."},
  piewarmer:{name:"Pie Warmer", size:3, res:"drink", hp:[600,700,800,900,1000,1100], cost:[300,750,2000,6000,15000,40000], time:[10,60,240,600,1500,3000],
    cap:[1500,3000,6000,12000,25000,50000], stores:"pies", desc:"Keeps your pies hot. Raises how many you can hold."},
  esky:{name:"Esky", size:3, res:"pies", hp:[600,700,800,900,1000,1100], cost:[300,750,2000,6000,15000,40000], time:[10,60,240,600,1500,3000],
    cap:[1500,3000,6000,12000,25000,50000], stores:"drink", desc:"Keeps the drinks cold. Raises how much you can hold."},
  oval:{name:"Training Oval", size:3, res:"drink", hp:[250,290,330,370,420,470], cost:[200,1000,2500,5000,10000,20000], time:[10,60,300,900,1800,3600],
    unlock:["rover","forward","ruck","tagger","shepherd","trainer"], desc:"Trains players. Each level unlocks a new position."},
  bench:{name:"Interchange Bench", size:3, res:"drink", hp:[250,270,290,310,330], cost:[250,2500,10000,25000,60000], time:[10,120,600,1800,3600],
    space:[20,30,40,50,60], desc:"Where your trained players wait. More benches, bigger squad."},
  physio:{name:"Physio Room", size:3, res:"drink", hp:[425,470,520], cost:[5000,15000,40000], time:[60,600,1800],
    unlock:["oranges","roar","freekick"], slots:[2,3,4], desc:"Brews match-day spells."},
  coachbox:{name:"Coaches Box", size:3, res:"drink", hp:[500,550,600,650], cost:[2500,8000,20000,50000], time:[60,300,1200,2400],
    desc:"Research better skills for your players."},
  locker:{name:"Captain's Locker", size:3, res:"pies", hp:[400], cost:[3000], time:[30], desc:"Home of your captain, the star of your club."},
  shed:{name:"Groundskeeper Shed", size:2, res:"medals", hp:[250], cost:[0], time:[0], desc:"Each groundskeeper can work on one building at a time."},
  goalpost:{name:"Goal Tower", size:3, res:"pies", hp:[380,420,460,500,540,580], cost:[1000,2000,5000,10000,20000,40000], time:[15,120,600,1200,2400,3600],
    dps:[16,21,27,34,42,50], range:7, rate:0.8, shot:"footy", def:true, desc:"Kicks footies at attackers from long range."},
  siren:{name:"Siren Cannon", size:3, res:"pies", hp:[420,470,520,570,620,670], cost:[250,1000,4000,10000,25000,50000], time:[10,60,300,900,1800,3600],
    dps:[14,18,24,30,38,46], range:6, rate:0.8, shot:"siren", def:true, desc:"Blasts attackers with sound. Hits hard, shorter range."},
  catapult:{name:"Kick-Out Catapult", size:3, res:"pies", hp:[400,450,500,550], cost:[8000,20000,40000,80000], time:[300,900,1800,3600],
    dps:[30,38,46,55], range:11, minr:4, rate:5, splash:1.6, shot:"bomb", def:true, desc:"Lobs huge kicks that splash groups. Can't hit up close."},
  sprinkler:{name:"Sprinkler Trap", size:1, res:"pies", hp:[1,1,1], cost:[400,1000,3000], time:[0,30,120], dmg:[60,80,100], trap:true,
    desc:"Hidden from attackers. Soaks anyone who runs over it."},
  fence:{name:"Fence", size:1, res:"pies", hp:[300,500,800,1200,1800], cost:[50,1000,5000,10000,20000], time:[0,0,0,0,0], desc:"Slows attackers down."},
};
// How many of each building you can have, by clubhouse level 1..5
const MAXC = {
  clubhouse:[1,1,1,1,1], pieshop:[1,2,3,4,5], drinktap:[1,2,3,4,5], piewarmer:[1,1,2,2,3], esky:[1,1,2,2,3],
  oval:[1,1,2,2,3], bench:[1,1,2,2,3], physio:[0,0,1,1,1], coachbox:[0,0,1,1,1], locker:[0,1,1,1,1], shed:[5,5,5,5,5],
  goalpost:[1,1,2,3,4], siren:[1,2,2,3,3], catapult:[0,0,1,1,2], sprinkler:[0,2,4,6,8], fence:[25,50,75,100,125],
};
const maxLevel = (t, th) => t==="clubhouse" ? 5 : t==="fence" ? Math.min(5,th) : Math.min(BLD[t].hp.length, th+1);
const SHED_COST = [0,0,250,500,1000];
const SHOP_TABS = {
  "Resources":["pieshop","drinktap","piewarmer","esky","shed"],
  "Defence":["goalpost","siren","catapult","sprinkler","fence"],
  "Squad":["oval","bench","physio","coachbox","locker"],
};

// Players you can train. pref = what they go after.
const UNITS = {
  rover:   {name:"Rover",        space:1,  hp:80,  dps:12, spd:2.2, range:0.8, pref:"any",      cost:25,   time:4,  desc:"Quick, cheap, goes for anything."},
  forward: {name:"Full-Forward", space:1,  hp:40,  dps:10, spd:2.0, range:3.5, pref:"any",      cost:50,   time:5,  ranged:true, desc:"Kicks from range. Fragile."},
  ruck:    {name:"Ruckman",      space:5,  hp:420, dps:12, spd:1.3, range:0.9, pref:"defence",  cost:250,  time:15, big:true, desc:"A wall of a man. Goes straight for defences."},
  tagger:  {name:"Tagger",       space:1,  hp:35,  dps:15, spd:3.2, range:0.7, pref:"resource", cost:40,   time:6,  desc:"Hunts pies and drinks. Double damage on them."},
  shepherd:{name:"Shepherd",     space:2,  hp:25,  dps:40, spd:2.8, range:0.6, pref:"fence",    cost:100,  time:10, desc:"Bumps through fences. Huge fence damage, then he's done."},
  trainer: {name:"Trainer",      space:14, hp:500, dps:0,  spd:1.8, range:4.0, pref:"heal",     cost:1500, time:40, heal:35, desc:"Runs water and heals your players."},
};
const unitMul = lv => 1 + 0.25*(lv-1);
const RESEARCH_COST = [0, 5000, 20000, 60000];
const RESEARCH_TIME = [0, 60, 300, 900];

const SPELLS = {
  oranges: {name:"Half-time Oranges", cost:1500, time:20, radius:3.5, dur:3, desc:"Heals your players in the zone."},
  roar:    {name:"Crowd Roar",        cost:2000, time:25, radius:3,   dur:6, desc:"Players in the zone run faster and hit harder."},
  freekick:{name:"Umpire's Free Kick",cost:1800, time:25, radius:1.6, dmg:160, desc:"Three strikes on buildings at that spot."},
};

const LEAGUES = [[0,"Local Footy"],[200,"Under-18s"],[500,"State League"],[900,"VFL"],[1400,"AFL Premiership"]];
const league = tr => LEAGUES.filter(l=>tr>=l[0]).pop()[1];

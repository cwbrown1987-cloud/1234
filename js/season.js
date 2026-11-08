// ---------- The Season: 17 home-and-away rounds, an 18-club ladder, top-8 finals, premierships ----------
const ROUNDS = 17;
const FINALS = ["Qualifying Final","Semi Final","Preliminary Final","Grand Final"];

function newSeason(year){
  return {year, round:0, ladder:CLUBS.map(()=>({w:0,l:0,d:0,pf:0,pa:0})), strength:CLUBS.map(()=>.35+Math.random()*.3),
    results:[], finals:null, over:false, place:null};
}
function ensureSeason(){ if(!S.season||Array.isArray(S.season)) S.season=newSeason(1); S.premierships=S.premierships||0; }
const fmtScore = s => `${s.g}.${s.b} (${s.g*6+s.b})`;
const pctOf = r => r.pa ? r.pf/r.pa*100 : (r.pf?999:0);
function ladderOrder(){
  const L=S.season.ladder;
  return CLUBS.map((_,i)=>i).sort((a,b)=>(L[b].w*4+L[b].d*2)-(L[a].w*4+L[a].d*2) || pctOf(L[b])-pctOf(L[a]) || a-b);
}
const ladderPos = c => ladderOrder().indexOf(c)+1;
// Who you play: every other club once
function roundOpp(r){ const others=CLUBS.map((_,i)=>i).filter(i=>i!==S.club); const k=(r+S.season.year*5)%others.length; return others[k]; }
const roundDiff = r => Math.max(1,Math.min(MAX_TH, th()+(r<5?-1:r<12?0:1)));
const finalDiff = () => Math.max(1,Math.min(MAX_TH, th()+1));
function finalOpp(stage){
  const top=ladderOrder().filter(c=>c!==S.club).slice(0,8);
  return stage===3 ? top[0] : top[(7-stage*2+S.season.year)%8];
}
function nextFixture(){
  const s=S.season; if(s.over) return null;
  if(s.finals) return {name:FINALS[s.finals.stage], club:finalOpp(s.finals.stage), d:finalDiff(), final:true};
  return {name:`Round ${s.round+1}`, club:roundOpp(s.round), d:roundDiff(s.round), final:false};
}
function playSeasonMatch(){
  const f=nextFixture(); if(!f) return;
  startBattle({kind:"season", round:S.season.round, club:f.club, d:f.d, seed:S.season.year*1000+S.season.round*77+(S.season.finals?S.season.finals.stage*13+500:0)+S.club, fixture:f.name});
}
// a made-up score for matches you aren't in
function simScore(str,rnd){ const g=Math.round(6+str*14*rnd()+rnd()*4), b=Math.round(4+rnd()*9); return {g,b}; }
function addResult(c,forS,agS){ const r=S.season.ladder[c], pf=forS.g*6+forS.b, pa=agS.g*6+agS.b; r.pf+=pf; r.pa+=pa; if(pf>pa) r.w++; else if(pf<pa) r.l++; else r.d++; }
// Called when your season match ends. my/their = {g,b}
function seasonResult(my,their,oppClub){
  const s=S.season, f={...nextFixture()}; if(oppClub!=null&&oppClub!==S.club) f.club=oppClub; const myP=my.g*6+my.b, thP=their.g*6+their.b;
  const res = myP>thP?"W":myP<thP?"L":"D";
  s.results.push({name:f.name, club:f.club, my, their, res});
  let note="";
  if(!s.finals){
    addResult(S.club,my,their); addResult(f.club,their,my);
    // everyone else plays too
    const rnd=rng(s.year*991+s.round*31), rest=CLUBS.map((_,i)=>i).filter(i=>i!==S.club&&i!==f.club).sort(()=>rnd()-.5);
    for(let i=0;i+1<rest.length;i+=2){ const a=rest[i], b=rest[i+1]; let sa=simScore(s.strength[a],rnd), sb=simScore(s.strength[b],rnd); addResult(a,sa,sb); addResult(b,sb,sa); }
    s.round++;
    if(s.round>=ROUNDS){
      const pos=ladderPos(S.club); s.place=pos;
      if(pos<=8){ s.finals={stage:0}; note=`You finished ${ordinal(pos)}. Finals footy!`; earnTokens(2); }
      else { s.over=true; note=`You finished ${ordinal(pos)}. No finals this year.`; }
    }
  } else {
    if(res==="W"){ if(s.finals.stage===3){ s.over=true; s.premiers=true; S.premierships++; S.medals+=40; if(typeof addOre==="function") addOre({silver:25}); S.prizePacks=(S.prizePacks||0)+1; note="PREMIERS! +40 🏅 and a Prize Pack"; }
                   else { s.finals.stage++; if(typeof addOre==="function") addOre({silver:5}); note=`Through to the ${FINALS[s.finals.stage]}! +5 🏆 Premiership Silver`; } }
    else { s.over=true; note=res==="D"?"A drawn final… and you lost the replay. Season over.":`Knocked out in the ${FINALS[s.finals.stage]}.`; }
  }
  return {res, note};
}
const ordinal = n => n+((n%10===1&&n%100!==11)?"st":(n%10===2&&n%100!==12)?"nd":(n%10===3&&n%100!==13)?"rd":"th");
function startNextSeason(){ S.season=newSeason(S.season.year+1); save(); openMatch(); }

function openLadder(){
  const L=S.season.ladder, order=ladderOrder();
  let h=`<h2>Ladder · Season ${S.season.year}</h2><div class="ladwrap"><table class="ladder"><tr><th></th><th></th><th>Club</th><th>P</th><th>W</th><th>L</th><th>D</th><th>%</th><th>Pts</th></tr>`;
  order.forEach((c,i)=>{ const r=L[c], p=r.w+r.l+r.d;
    h+=`<tr class="${c===S.club?"me":""} ${i===7?"cut":""}"><td>${i+1}</td><td>${badgeImg(CLUBS[c],"xs")}</td><td>${CLUBS[c].short}</td><td>${p}</td><td>${r.w}</td><td>${r.l}</td><td>${r.d}</td><td>${p?pctOf(r).toFixed(1):"–"}</td><td><b>${r.w*4+r.d*2}</b></td></tr>`; });
  h+=`</table></div><p class="tiny center">Win = 4 points, draw = 2. Ties split by percentage (points for ÷ points against). Top 8 play finals.</p><div class="center"><button class="btn" id="ladBack">Back</button></div>`;
  modal(h); $("ladBack").onclick=openMatch;
}

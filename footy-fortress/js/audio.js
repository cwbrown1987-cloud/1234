// ---------- Sound effects, synthesised with Web Audio (no files needed) ----------
let AC=null, lastSfx={};
function audioCtx(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ AC=null; } } if(AC&&AC.state==="suspended") AC.resume(); return AC; }
addEventListener("pointerdown",()=>audioCtx(),{once:false,passive:true});
function tone(type,f0,f1,dur,vol,delay=0){
  const a=AC, t=a.currentTime+delay, o=a.createOscillator(), g=a.createGain();
  o.type=type; o.frequency.setValueAtTime(f0,t); if(f1) o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t+dur+.02);
}
function noise(dur,vol,freq,q=1,delay=0){
  const a=AC, t=a.currentTime+delay, n=a.sampleRate*dur, buf=a.createBuffer(1,n,a.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
  const s=a.createBufferSource(), f=a.createBiquadFilter(), g=a.createGain(); s.buffer=buf; f.type="bandpass"; f.frequency.value=freq; f.Q.value=q;
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur); s.connect(f).connect(g).connect(a.destination); s.start(t);
}
function sfx(name,vol=1){
  if(typeof simulating!=="undefined"&&simulating) return;
  if(!S||!S.sound||!AC||AC.state!=="running") return;
  const now=performance.now(); if(now-(lastSfx[name]||0)<60) return; lastSfx[name]=now;
  const v=.25*vol;
  switch(name){
    case "kick": tone("sine",160,50,.12,v*1.4); noise(.05,v*.6,1800,2); break;
    case "boom": tone("sine",90,30,.4,v*1.6); noise(.35,v,400,.7); break;
    case "siren": tone("sawtooth",380,760,.6,v*.35); tone("sawtooth",760,380,.6,v*.35,.6); break;
    case "whistle": tone("sine",2600,2500,.25,v*.5); tone("sine",2600,2700,.35,v*.5,.28); break;
    case "cheer": noise(.9,v*.7,900,.4); noise(.7,v*.4,2200,.6,.15); break;
    case "collect": tone("triangle",660,990,.09,v); tone("triangle",990,1320,.12,v,.08); break;
    case "build": for(let i=0;i<3;i++){ tone("square",220,180,.05,v*.5,i*.12); noise(.04,v*.5,3000,3,i*.12); } break;
    case "tap": tone("triangle",520,420,.05,v*.6); break;
    case "splash": noise(.4,v,1200,.5); break;
    case "card": tone("triangle",523,523,.12,v); tone("triangle",659,659,.12,v,.1); tone("triangle",784,784,.2,v,.2); break;
  }
}

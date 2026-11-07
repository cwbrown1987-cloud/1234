// ---------- Rendering engine (isometric canvas, cartoon style) ----------
const cv = document.getElementById("c");
let ctx = cv.getContext("2d");
let W, H, TW, TH, BASE;
const cam = {x:0, y:0, z:1};
const OUT = "#2b1d10";

function resize(){
  const dpr = Math.min(2, devicePixelRatio||1);
  W = cv.width = innerWidth*dpr; H = cv.height = innerHeight*dpr;
  BASE = Math.max(W/(N*0.62), H/(N*0.75)) ; // start zoomed so the base fills a phone screen
  setZoom(cam.z);
}
function setZoom(z){ cam.z = Math.max(.45, Math.min(2.6, z)); TW = BASE*cam.z/ (W>H?1.6:1); TH = TW/2; clampCam(); }
function clampCam(){ const mx=N*TW*.45, my=N*TH*.45; cam.x=Math.max(-mx,Math.min(mx,cam.x)); cam.y=Math.max(-my,Math.min(my,cam.y)); }
const iso = (x,y) => [W/2+cam.x+(x-y)*TW/2, H/2+cam.y+(x+y-N)*TH/2];
function unIso(px,py){ const a=(px-W/2-cam.x)/(TW/2), b=(py-H/2-cam.y)/(TH/2)+N; return [(a+b)/2,(b-a)/2]; }
const P = (x,y,z=0) => { const [a,b]=iso(x,y); return [a, b-z*TH]; };

// ---------- primitives ----------
function rng(seed){ return ()=>{ seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; }; }
const LW = () => Math.max(1.2, TW*.035);
function poly(pts,fill,stroke=OUT,lw){ ctx.beginPath(); pts.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b)); ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||LW();ctx.lineJoin="round";ctx.stroke();} }
function diamond(x,y,w,h,fill,stroke,lw){ poly([P(x,y),P(x+w,y),P(x+w,y+h),P(x,y+h)],fill,stroke||null,lw||1); }
function rgb(hex){ let h=hex.slice(1); if(h.length===3) h=h.split("").map(c=>c+c).join(""); const n=parseInt(h,16); return [n>>16&255,n>>8&255,n&255]; }
function shade(hex,f){ const m=v=>Math.max(0,Math.min(255,f>1?v+(255-v)*(f-1):v*f))|0; return "rgb("+rgb(hex).map(m).join(",")+")"; }
function grad(p0,p1,c0,c1){ const g=ctx.createLinearGradient(p0[0],p0[1],p1[0],p1[1]); g.addColorStop(0,c0); g.addColorStop(1,c1); return g; }
function rr(x,y,w,h,r,col){ ctx.beginPath(); ctx.roundRect(x,y,w,h,Math.max(0,r)); ctx.fillStyle=col; ctx.fill(); ctx.stroke(); }

function prism(x,y,w,d,z,h,col,topCol){
  const L=[P(x,y+d,z),P(x+w,y+d,z),P(x+w,y+d,z+h),P(x,y+d,z+h)];
  const R=[P(x+w,y+d,z),P(x+w,y,z),P(x+w,y,z+h),P(x+w,y+d,z+h)];
  const T=[P(x,y,z+h),P(x+w,y,z+h),P(x+w,y+d,z+h),P(x,y+d,z+h)];
  poly(L,grad(L[3],L[0],shade(col,.95),shade(col,.75)));
  poly(R,grad(R[3],R[0],shade(col,.7),shade(col,.52)));
  poly(T,grad(T[0],T[2],shade(topCol||col,1.25),shade(topCol||col,1.02)));
}
function onL(yp,x0,x1,z0,z1,col,stroke=OUT){ poly([P(x0,yp,z0),P(x1,yp,z0),P(x1,yp,z1),P(x0,yp,z1)],col,stroke,Math.max(1,TW*.022)); }
function onR(xp,y0,y1,z0,z1,col,stroke=OUT){ poly([P(xp,y0,z0),P(xp,y1,z0),P(xp,y1,z1),P(xp,y0,z1)],col,stroke,Math.max(1,TW*.022)); }
function windowL(yp,x0,x1,z0,z1){ onL(yp,x0-.05,x1+.05,z0-.05,z1+.05,"#fff8e6"); onL(yp,x0,x1,z0,z1,grad(P(x0,yp,z1),P(x1,yp,z0),"#bfe9ff","#3d8fd1")); }
function windowR(xp,y0,y1,z0,z1){ onR(xp,y0,y1,z0-.05,z1+.05,"#e8dcc2"); onR(xp,y0-.05,y1+.05,z0,z1,grad(P(xp,y0,z1),P(xp,y1,z0),"#8cc8ee","#2a6aa0")); }
function roof(x,y,w,d,z,h,col,trim){
  const m=y+d/2;
  poly([P(x,y,z),P(x+w,y,z),P(x+w,m,z+h),P(x,m,z+h)],shade(col,1.15));
  const F=[P(x,y+d,z),P(x+w,y+d,z),P(x+w,m,z+h),P(x,m,z+h)];
  poly(F,grad(F[3],F[0],shade(col,1.12),shade(col,.78)));
  ctx.strokeStyle=shade(col,.55); ctx.lineWidth=Math.max(1,TW*.018);
  for(let i=1;i<4;i++){ const t=i/4,a=P(x,y+d-t*d/2,z+t*h),b=P(x+w,y+d-t*d/2,z+t*h); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
  poly([P(x+w,y+d,z),P(x+w,y,z),P(x+w,m,z+h)],shade(col,.62));
  poly([P(x,m,z+h),P(x+w,m,z+h)],null,trim||shade(col,1.4),Math.max(2,TW*(trim?.07:.04)));
}
function cyl(x,y,r,z,h,col,topCol){
  const [cx,cb]=P(x,y,z),[,ct]=P(x,y,z+h),rx=r*TW*.72,ry=rx/2;
  ctx.beginPath(); ctx.moveTo(cx-rx,ct); ctx.lineTo(cx-rx,cb); ctx.ellipse(cx,cb,rx,ry,0,Math.PI,0,true); ctx.lineTo(cx+rx,ct); ctx.closePath();
  const g=ctx.createLinearGradient(cx-rx,0,cx+rx,0); g.addColorStop(0,shade(col,.95)); g.addColorStop(.3,shade(col,1.25)); g.addColorStop(1,shade(col,.55));
  ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle=OUT; ctx.lineWidth=LW(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx,ct,rx,ry,0,0,7); ctx.fillStyle=shade(topCol||col,1.2); ctx.fill(); ctx.stroke();
}
function band(x,y,r,z0,z1,col){ const [cx,b0]=P(x,y,z0),[,b1]=P(x,y,z1),rx=r*TW*.72,ry=rx/2; ctx.beginPath(); ctx.ellipse(cx,b0,rx,ry,0,Math.PI,0,true); ctx.lineTo(cx+rx,b1); ctx.ellipse(cx,b1,rx,ry,0,0,Math.PI,false); ctx.closePath(); ctx.fillStyle=col; ctx.fill(); ctx.strokeStyle=OUT; ctx.lineWidth=Math.max(1,TW*.02); ctx.stroke(); }
function shadow(x,y,w,d){ ctx.save(); ctx.globalAlpha=.22; poly([P(x+.1,y+.3),P(x+w+.45,y+.3),P(x+w+.45,y+d+.45),P(x+.1,y+d+.45)],"#14300a",null); ctx.restore(); }
function pad(x,y,s){ poly([P(x+.06,y+.06),P(x+s-.06,y+.06),P(x+s-.06,y+s-.06),P(x+.06,y+s-.06)],"#d8b57a","#a3814c",Math.max(1,TW*.025));
  poly([P(x+.2,y+.2),P(x+s-.2,y+.2),P(x+s-.2,y+s-.2),P(x+.2,y+s-.2)],"#e2c48e",null); }
function txt(s,x,y,sz,col="#fff"){ ctx.font=`${sz}px "Lilita One","Trebuchet MS",sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.lineJoin="round"; ctx.lineWidth=Math.max(3,sz*.22); ctx.strokeStyle="#000"; ctx.strokeText(s,x,y); ctx.fillStyle=col; ctx.fillText(s,x,y); }
function bar(x,y,f,col,w){ w=w||TW*1.2; const h=Math.max(5,TH*.24); ctx.lineWidth=2; ctx.strokeStyle="#000"; rr(x-w/2,y,w,h,h/2,"#2a2a2a");
  ctx.beginPath(); ctx.roundRect(x-w/2+1.5,y+1.5,Math.max(h-3,(w-3)*Math.max(0,Math.min(1,f))),h-3,(h-3)/2); ctx.fillStyle=col; ctx.fill(); }
function footy(x,y,r,rot){ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.beginPath(); ctx.ellipse(0,0,r,r*.62,0,0,7); ctx.fillStyle="#b5532a"; ctx.fill(); ctx.strokeStyle=OUT; ctx.lineWidth=Math.max(1.2,r*.18); ctx.stroke();
  ctx.strokeStyle="#fff"; ctx.lineWidth=Math.max(1,r*.1); ctx.beginPath(); ctx.moveTo(-r*.35,0); ctx.lineTo(r*.35,0); for(let i=-2;i<=2;i++){ ctx.moveTo(i*r*.14,-r*.12); ctx.lineTo(i*r*.14,r*.12); } ctx.stroke(); ctx.restore(); }
// Aussie rules goals: 2 tall goal posts + 2 shorter behind posts
function posts(px,py,h,club,sc=1){
  const g=TW*.17*sc, w=Math.max(2.5,TW*.07*sc); ctx.lineCap="round";
  [[-2,.6],[-1,1],[1,1],[2,.6]].forEach(([o,k])=>{ const X=px+o*g;
    ctx.strokeStyle=OUT; ctx.lineWidth=w+3; ctx.beginPath(); ctx.moveTo(X,py); ctx.lineTo(X,py-h*k); ctx.stroke();
    ctx.strokeStyle="#fff"; ctx.lineWidth=w; ctx.beginPath(); ctx.moveTo(X,py); ctx.lineTo(X,py-h*k); ctx.stroke();
    if(club){ ctx.strokeStyle=OUT; ctx.lineWidth=1.5; rr(X-w*.95,py-h*.3,w*1.9,h*.28,3,club.a); ctx.fillStyle=club.b; ctx.fillRect(X-w*.95+1,py-h*.2,w*1.9-2,h*.07); }
  });
}
function flag(px,py,club,hs=1){
  const h=TH*2.3*hs; ctx.lineCap="round";
  ctx.strokeStyle=OUT; ctx.lineWidth=Math.max(3,TW*.07); ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px,py-h); ctx.stroke();
  ctx.strokeStyle="#e0e0e0"; ctx.lineWidth=Math.max(1.5,TW*.035); ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px,py-h); ctx.stroke();
  const w=TW*.95*hs, fh=TH*1.05*hs, t=performance.now()/220+px, y0=py-h+2, wv=i=>Math.sin(t+i*3)*TH*.12*i;
  ctx.save(); ctx.beginPath(); ctx.moveTo(px,y0);
  for(let i=0;i<=1.001;i+=.1) ctx.lineTo(px+w*i,y0+wv(i)); for(let i=1;i>=0;i-=.1) ctx.lineTo(px+w*i,y0+fh+wv(i)); ctx.closePath();
  ctx.fillStyle=club.a; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle=club.b; ctx.fillRect(px+w*.36,y0-TH,w*.28,fh+2*TH); ctx.restore();
  ctx.strokeStyle=OUT; ctx.lineWidth=2; ctx.stroke(); ctx.restore();
  ctx.beginPath(); ctx.arc(px,py-h,TW*.06,0,7); ctx.fillStyle="#f6c343"; ctx.fill(); ctx.strokeStyle=OUT; ctx.lineWidth=1.5; ctx.stroke();
}
const GOLD="#f6c343";
const trimFor = lv => lv>=5?"#ffe680":lv>=3?GOLD:null;

// ---------- buildings ----------
// b: {t,x,y,lv,hp,...}; club: colours; list: all buildings (for fence joins)
function drawBuilding(b, club, list, opts={}){
  const d=BLD[b.t], s=d.size, x=b.x, y=b.y, lv=b.lv||1, tr=trimFor(lv);
  if(b.hp!==undefined && b.hp<=0) return rubble(x,y,s);
  if(d.trap){ if(opts.hideTraps && !b.sprung) return; drawTrap(b); return; }
  const isNew = b.busy && b.busy.kind==="build";
  if(b.t!=="fence"){ pad(x,y,s); if(!isNew) shadow(x+.3,y+.3,s-.6,s-.6); }
  let top=2.5;
  if(isNew){ top=1.8; }
  else switch(b.t){
    case "clubhouse":{
      prism(x+.3,y+.3,s-.6,s-.6,0,.45,"#a3968a");
      const wh=1.9+lv*.12;
      prism(x+.5,y+.5,s-1,s-1,.45,wh,"#f3e4c2");
      onL(y+s-.5,x+.5,x+s-.5,.45,.68,club.b,null);
      const z0=.45, zt=z0+wh;
      for(const u of [.75,1.45,2.35]) windowL(y+s-.5,x+u,x+u+.35,zt-.95,zt-.35);
      onL(y+s-.5,x+1.75,x+2.25,z0,z0+.95,"#6b3d1c");
      for(const v of [.75,1.45,2.35]) windowR(x+s-.5,y+v+.35,y+v,zt-.95,zt-.35);
      if(lv>=2) for(const v of [.9,2.2]) windowR(x+s-.5,y+v+.35,y+v,z0+.3,z0+.8);
      roof(x+.32,y+.32,s-.64,s-.64,zt,1.6,club.a,tr);
      const [bx,by]=P(x+s-.32,y+s/2,zt+.5); ctx.lineWidth=2; ctx.strokeStyle=OUT;
      ctx.beginPath(); ctx.arc(bx,by,TW*.3,0,7); ctx.fillStyle=tr||club.b; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx,by,TW*.2,0,7); ctx.fillStyle=club.a; ctx.fill(); ctx.stroke();
      ctx.fillStyle=club.b; ctx.fillRect(bx-TW*.04,by-TW*.18,TW*.08,TW*.36);
      flag(...P(x+s/2,y+s/2,zt+1.6),club,1.15);
      if(lv>=4) flag(...P(x+.6,y+s/2,zt+.25),club,.7);
      top=zt+4.2; break;}
    case "pieshop":{
      prism(x+.45,y+.45,s-.9,s-.9,0,1.5,"#f2d6a0");
      onL(y+s-.45,x+.7,x+1.25,0,1.0,"#7a4a22");
      windowL(y+s-.45,x+1.55,x+2.25,.45,1.05);
      windowR(x+s-.45,y+2.2,y+1.3,.45,1.05);
      const n=7; for(let i=0;i<n;i++){ const a=x+.45+i*(s-.9)/n, w=(s-.9)/n; poly([P(a,y+s-.45,1.35),P(a+w,y+s-.45,1.35),P(a+w,y+s-.05,.95),P(a,y+s-.05,.95)],i%2?"#fff":"#e8503a",OUT,Math.max(1,TW*.02)); }
      prism(x+.35,y+.35,s-.7,s-.7,1.5,.2,"#8b5a1a",tr||"#a96f2a");
      cyl(x+s/2,y+s/2,.8,1.7,.32,"#c98a3a","#eebb62");
      const [px,py]=P(x+s/2,y+s/2,2.02); ctx.strokeStyle="#a0621f"; ctx.lineWidth=Math.max(1.5,TW*.035); ctx.lineCap="round";
      for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(px+i*TW*.18-TW*.1,py-TH*.16); ctx.lineTo(px+i*TW*.18+TW*.1,py+TH*.16); ctx.stroke(); }
      if(lv>=3){ const [sx,sy]=P(x+s/2,y+s/2,2.3); ctx.strokeStyle="#ffffffaa"; ctx.lineWidth=2; for(const o of [-1,0,1]){ ctx.beginPath(); const t=performance.now()/400+o; ctx.moveTo(sx+o*TW*.2,sy); ctx.quadraticCurveTo(sx+o*TW*.2+Math.sin(t)*6,sy-TH*.5,sx+o*TW*.2,sy-TH); ctx.stroke(); } }
      top=3; break;}
    case "drinktap":{
      prism(x+.4,y+.4,s-.8,s-.8,0,.4,"#8d99a6");
      cyl(x+s/2,y+s/2,.85,.4,2.1,"#2fb8e0","#dff6fc");
      band(x+s/2,y+s/2,.85,1.0,1.6,club.a);
      if(tr) band(x+s/2,y+s/2,.85,1.6,1.72,tr);
      const [lx,ly]=P(x+s/2,y+s/2,1.3); txt("⚡",lx-TW*.12,ly+TH*.2,TH*.7);
      cyl(x+s/2,y+s/2,.3,2.5,.35,"#ffffff","#e6e6e6");
      prism(x+1.05,y+2.15,.25,.5,.75,.18,"#c7ccd2");
      top=3.6; break;}
    case "piewarmer":{
      const f=opts.fill??.6;
      prism(x+.35,y+.35,s-.7,s-.7,0,.6,"#8b5a1a",tr||"#a96f2a");
      // glass cabinet with pies stacked inside
      const gx=x+.5,gy=y+.5,gw=s-1,gh=1.5;
      poly([P(gx,gy,.6),P(gx+gw,gy,.6),P(gx+gw,gy+gw,.6),P(gx,gy+gw,.6)],"#7a5a3a",null);
      const rows=Math.ceil(f*3);
      for(let r=0;r<rows;r++) for(const [i,j] of [[.55,.55],[1.45,.55],[.55,1.45],[1.45,1.45]]) cyl(gx+i,gy+j,.36,.6+r*.42,.22,"#c98a3a","#eebb62");
      ctx.save(); ctx.globalAlpha=.35;
      poly([P(gx,gy+gw,.6),P(gx+gw,gy+gw,.6),P(gx+gw,gy+gw,.6+gh),P(gx,gy+gw,.6+gh)],"#cdefff","#ffffff");
      poly([P(gx+gw,gy+gw,.6),P(gx+gw,gy,.6),P(gx+gw,gy,.6+gh),P(gx+gw,gy+gw,.6+gh)],"#9fd6f0","#ffffff");
      ctx.restore();
      poly([P(gx,gy+gw,.6),P(gx+gw,gy+gw,.6),P(gx+gw,gy+gw,.6+gh),P(gx,gy+gw,.6+gh)],null);
      poly([P(gx+gw,gy+gw,.6),P(gx+gw,gy,.6),P(gx+gw,gy,.6+gh),P(gx+gw,gy+gw,.6+gh)],null);
      prism(x+.35,y+.35,s-.7,s-.7,.6+gh,.25,"#c0392b",tr||"#e74c3c");
      top=3.3; break;}
    case "esky":{
      const f=opts.fill??.6;
      prism(x+.4,y+.45,s-.8,s-.9,0,1.25,"#2a6fdb");
      onL(y+s-.45,x+.4,x+s-.4,.15,.35,"#ffffff",null);
      // open lid shows drinks
      const lz=1.25; poly([P(x+.55,y+.6,lz),P(x+s-.55,y+.6,lz),P(x+s-.55,y+s-.6,lz),P(x+.55,y+s-.6,lz)],"#1b4a96",null);
      const n=Math.round(2+f*7), r=rng(b.x*17+b.y);
      for(let i=0;i<n;i++){ const ix=x+.75+(i%3)*.55, iy=y+.8+Math.floor(i/3)*.5; cyl(ix,iy,.16,lz-.1,.45+r()*.1,i%2?"#36c9e8":"#7be3a0","#fff"); }
      prism(x+.35,y+.3,s-.7,.18,lz+.1,.85,"#ffffff",tr||"#f2f2f2");
      prism(x+1.1,y+s-.5,.8,.12,1.0,.12,"#e8e8e8");
      top=3; break;}
    case "oval":{
      const [ox,oy]=P(x+s/2,y+s/2), rx=TW*s*.4, ry=TH*s*.33;
      ctx.save(); ctx.globalAlpha=.25; ctx.beginPath(); ctx.ellipse(ox+4,oy+5,rx*1.06,ry*1.06,0,0,7); ctx.fillStyle="#14300a"; ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.ellipse(ox,oy,rx,ry,0,0,7); ctx.fillStyle="#48a83f"; ctx.fill(); ctx.clip();
      ctx.fillStyle="#5cc050"; for(let i=-6;i<6;i+=2) ctx.fillRect(ox+i*rx/6,oy-ry,rx/6,ry*2); ctx.restore();
      ctx.lineWidth=Math.max(3,TW*.09); ctx.strokeStyle=tr||"#e9dcc0"; ctx.beginPath(); ctx.ellipse(ox,oy,rx*1.03,ry*1.03,0,0,7); ctx.stroke();
      ctx.lineWidth=Math.max(1.5,TW*.035); ctx.strokeStyle=OUT; ctx.beginPath(); ctx.ellipse(ox,oy,rx*1.08,ry*1.08,0,0,7); ctx.stroke();
      ctx.strokeStyle="#fff"; ctx.lineWidth=Math.max(1.5,TW*.03); ctx.beginPath(); ctx.ellipse(ox,oy,rx*.9,ry*.9,0,0,7); ctx.stroke();
      ctx.beginPath(); ctx.rect(ox-TW*.25,oy-TH*.4,TW*.5,TH*.8); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(ox,oy,TW*.12,TH*.14,0,0,7); ctx.stroke();
      posts(ox-rx*.82,oy,TH*1.1,null,.6); posts(ox+rx*.82,oy,TH*1.1,null,.6);
      // training cones
      for(const [cx,cy] of [[-.3,-.25],[0,.3],[.3,-.2]]){ const px=ox+cx*rx, py=oy+cy*ry; poly([[px-TW*.07,py],[px+TW*.07,py],[px,py-TH*.35]],"#ff8a1e",OUT,1.2); }
      top=2; break;}
    case "bench":{
      // dugout-style interchange bench
      prism(x+.3,y+.3,s-.6,s-.6,0,.15,"#5cbf52","#6fd165");
      prism(x+.45,y+.4,s-.9,.3,.15,1.4,"#d9d2c4");
      prism(x+.45,y+.4,.25,s-.8,.15,1.4,"#cfc6b4");
      prism(x+.7,y+.75,s-1.15,.45,.15,.4,"#7a4a22");
      poly([P(x+.35,y+.3,1.55),P(x+s-.3,y+.3,1.55),P(x+s-.3,y+s-.9,1.3),P(x+.35,y+s-.9,1.3)],grad(P(x,y,1.5),P(x,y+s,1.3),shade(club.a,1.2),shade(club.a,.8)));
      if(tr) poly([P(x+.35,y+s-.9,1.3),P(x+s-.3,y+s-.9,1.3)],null,tr,Math.max(2,TW*.06));
      const n=Math.min(6,Math.ceil((opts.fill??.5)*6));
      for(let i=0;i<n;i++) drawMini(x+.95+i*.35,y+1.0,club);
      top=2.4; break;}
    case "physio":{
      prism(x+.4,y+.4,s-.8,s-.8,0,1.6,"#f4f6f8");
      onL(y+s-.4,x+.6,x+1.1,0,1.0,"#3aa6c4");
      windowR(x+s-.4,y+1.9,y+1.1,.6,1.2);
      prism(x+.32,y+.32,s-.64,s-.64,1.6,.2,"#3aa6c4",tr||"#5cc0db");
      // green first-aid plus on the roof
      const [cx,cy]=P(x+s/2,y+s/2,1.8); ctx.fillStyle="#2ecc71"; ctx.strokeStyle=OUT; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.rect(cx-TW*.08,cy-TH*.45,TW*.16,TH*.9); ctx.rect(cx-TW*.3,cy-TH*.12,TW*.6,TH*.24); ctx.fill();
      // ice bath out front
      cyl(x+1.6,y+2.35,.35,0,.35,"#d9e2ea","#9fe3ff");
      top=2.8; break;}
    case "coachbox":{
      for(const [i,j] of [[.6,.6],[2.4,.6],[.6,2.4],[2.4,2.4]]) prism(x+i-.1,y+j-.1,.2,.2,0,1.3,"#6b7079");
      prism(x+.4,y+.4,s-.8,s-.8,1.3,1.1,"#e8e2d6");
      onL(y+s-.4,x+.5,x+s-.5,1.6,2.15,grad(P(x,y+s,2.2),P(x+s,y+s,1.6),"#bfe9ff","#2f78b7"));
      onR(x+s-.4,y+s-.5,y+.5,1.6,2.15,grad(P(x+s,y+s,2.2),P(x+s,y,1.6),"#8cc8ee","#225b8c"));
      prism(x+.3,y+.3,s-.6,s-.6,2.4,.18,club.a,tr);
      const [ax,ay]=P(x+.8,y+.8,2.58); ctx.strokeStyle=OUT; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ax,ay-TH*1.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(ax,ay-TH*1.2,TW*.06,0,7); ctx.fillStyle="#e8503a"; ctx.fill(); ctx.stroke();
      top=3.8; break;}
    case "locker":{
      prism(x+.45,y+.45,s-.9,s-.9,0,.5,"#9c9285");
      prism(x+.75,y+.75,s-1.5,s-1.5,.5,.35,"#b8ad9f",tr||"#cfc6b4");
      onL(y+s-.45,x+.45,x+s-.45,.15,.35,club.a,null);
      if(!opts.heroAway && opts.hero) drawHeroStatue(x+s/2,y+s/2,.85,club,opts.hero);
      else { const [cx,cy]=P(x+s/2,y+s/2,1.0); txt(opts.heroBusy?"🔧":"💤",cx,cy-TH*.4,TH*.9); }
      top=4; break;}
    case "shed":{
      prism(x+.3,y+.3,s-.6,s-.6,0,.95,"#b57a43");
      onL(y+s-.3,x+.55,x+1.0,0,.75,"#6b3d1c");
      roof(x+.22,y+.22,s-.44,s-.44,.95,.75,"#3f8f3a");
      const [mx,my]=P(x+s-.15,y+s-.15); ctx.lineWidth=1.5; ctx.strokeStyle=OUT; rr(mx-TW*.12,my-TH*.5,TW*.24,TH*.3,3,"#e8503a");
      top=2.3; break;}
    case "goalpost":{
      const st="#bfae92", h=1.5+lv*.08;
      prism(x+.6,y+.6,s-1.2,s-1.2,0,h,st);
      for(const z of [h*.33,h*.66]){ onL(y+s-.6,x+.6,x+s-.6,z,z,null,shade(st,.6)); onR(x+s-.6,y+s-.6,y+.6,z,z,null,shade(st,.5)); }
      for(const [u,z] of [[1.1,h*.16],[1.6,h*.5],[1.0,h*.82]]) onL(y+s-.6,x+u,x+u,z-h*.16,z+h*.16,null,shade(st,.6));
      prism(x+.4,y+.4,s-.8,s-.8,h,.3,"#9b6a3a",tr||"#c8915a");
      posts(...P(x+s/2,y+s/2,h+.3),TH*2.8,club,1.1);
      top=h+3.6; break;}
    case "siren":{
      prism(x+.5,y+.5,s-1,s-1,0,.75,"#6b7079");
      onL(y+s-.5,x+.5,x+s-.5,.48,.6,tr||"#f6c343",null);
      cyl(x+s/2,y+s/2,.7,.75,.35,"#4a4f57");
      const a=b.ang??-2.6,[hx,hy]=P(x+s/2,y+s/2,1.35),L=TW*1.05,r0=TW*.12,r1=TW*.4,dx=Math.cos(a),dy=Math.sin(a)*.75,nx=-dy,ny=dx;
      const rec=b.recoil?b.recoil*TW*.25:0, bx=hx-dx*rec, by=hy-dy*rec, mx=bx+dx*L, my=by+dy*L;
      poly([[bx-dx*TW*.25+nx*r0,by-dy*TW*.25+ny*r0],[mx+nx*r1,my+ny*r1],[mx-nx*r1,my-ny*r1],[bx-dx*TW*.25-nx*r0,by-dy*TW*.25-ny*r0]],grad([bx,by-r1],[bx,by+r1],"#ff7a5c","#b52a18"));
      ctx.save(); ctx.translate(mx,my); ctx.rotate(Math.atan2(dy,dx)); ctx.beginPath(); ctx.ellipse(0,0,TW*.09,r1,0,0,7); ctx.fillStyle="#3a0e08"; ctx.fill(); ctx.strokeStyle=OUT; ctx.lineWidth=LW(); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.arc(bx,by,TW*.2,0,7); ctx.fillStyle="#555b63"; ctx.fill(); ctx.stroke();
      top=3; break;}
    case "catapult":{
      prism(x+.4,y+.4,s-.8,s-.8,0,.6,"#8d8478");
      prism(x+.9,y+.9,s-1.8,s-1.8,.6,.4,"#7a4a22",tr);
      const a=b.ang??-2.4, [hx,hy]=P(x+s/2,y+s/2,1.1), arm=(b.recoil||0), L=TW*1.0;
      const ang=-Math.PI/2 + (Math.cos(a)>0?1:-1)*(.9-arm*1.3);
      const ex=hx+Math.cos(ang)*L, ey=hy+Math.sin(ang)*L;
      ctx.lineCap="round"; ctx.strokeStyle=OUT; ctx.lineWidth=TW*.16; ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(ex,ey); ctx.stroke();
      ctx.strokeStyle="#a86b2d"; ctx.lineWidth=TW*.1; ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(ex,ey); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex,ey,TW*.17,0,7); ctx.fillStyle="#6b3d1c"; ctx.fill(); ctx.strokeStyle=OUT; ctx.lineWidth=2; ctx.stroke();
      if(!b.recoil || b.recoil<.2) footy(ex,ey-TW*.05,TW*.17,.3);
      top=3.2; break;}
    case "fence": drawFence(b,club,list,lv); top=1.6; break;
  }
  if(b.busy) scaffold(b, s);
  if(opts.selected) selectRing(x,y,s);
  if(b.hp!==undefined && b.hp<b.max) bar(...P(x+s/2,y+s/2,top),b.hp/b.max,b.hp/b.max>.5?"#5fd16b":"#e8503a");
  if(opts.collect && opts.collect>=1){ const [cx,cy]=P(x+s/2,y+s/2,top+1.2+Math.sin(performance.now()/300)*.2); bubble(cx,cy,BLD[b.t].makes==="pies"?"🥧":"💧"); }
}
const FENCE_COL=["#f7f1e2","#c9a26b","#9aa0a8","#f6c343","#4a3f6b"];
function drawFence(b,club,list,lv){
  const x=b.x,y=b.y, col=FENCE_COL[lv-1];
  const has=(i,j)=>list.some(o=>o.t==="fence"&&!(o.hp<=0)&&o.x===i&&o.y===j&&!(o.busy&&o.busy.kind==="build"));
  const h=.85+lv*.08, w=.24+lv*.02;
  if(has(x+1,y)) for(const z of [.28,h*.7]) prism(x+.5,y+.46,1,.08,z,.12,col);
  if(has(x,y+1)) for(const z of [.28,h*.7]) prism(x+.46,y+.5,.08,1,z,.12,col);
  prism(x+.5-w/2,y+.5-w/2,w,w,0,h,col);
  prism(x+.5-w/2-.03,y+.5-w/2-.03,w+.06,w+.06,h,.12,lv>=4?"#fff3b0":club.a);
  if(lv===5){ const [sx,sy]=P(x+.5,y+.5,h+.12); poly([[sx-TW*.05,sy],[sx+TW*.05,sy],[sx,sy-TH*.45]],"#ddd"); }
}
function drawTrap(b){ const [x,y]=P(b.x+.5,b.y+.5); ctx.fillStyle="#555"; ctx.strokeStyle=OUT; ctx.lineWidth=1.5; ctx.beginPath(); ctx.ellipse(x,y,TW*.18,TH*.18,0,0,7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x,y-TH*.15,TW*.06,0,7); ctx.fillStyle="#9aa0a8"; ctx.fill(); ctx.stroke(); }
function rubble(x,y,s){ poly([P(x+.1,y+.1),P(x+s-.1,y+.1),P(x+s-.1,y+s-.1),P(x+.1,y+s-.1)],"#6d5d48","#4a3f33",1);
  const r=rng(x*131+y*7); for(let i=0;i<s*s*1.5+1;i++){ const a=x+.2+r()*(s-.5),c=y+.2+r()*(s-.5); prism(a,c,.22+r()*.15,.22+r()*.15,0,.15+r()*.25,r()<.5?"#9a8f80":"#b07a4a"); } }
function scaffold(b,s){
  const x=b.x,y=b.y,h=b.busy.kind==="build"?1.4:2.2;
  ctx.save(); ctx.globalAlpha=.95;
  for(const [i,j] of [[.25,.25],[s-.25,.25],[.25,s-.25],[s-.25,s-.25]]){ const [px,py]=P(x+i,y+j); ctx.strokeStyle=OUT; ctx.lineWidth=TW*.08; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px,py-h*TH); ctx.stroke(); ctx.strokeStyle="#c8915a"; ctx.lineWidth=TW*.045; ctx.stroke(); }
  for(const z of [h*.45,h]){ prism(x+.15,y+s-.35,s-.3,.2,z,.08,"#c8915a"); prism(x+s-.35,y+.15,.2,s-.3,z,.08,"#b07a4a"); }
  ctx.restore();
  const left=Math.max(0,(b.busy.end-Date.now())/1000), tot=b.busy.total||1;
  const [cx,cy]=P(x+s/2,y+s/2,h+1.5);
  bar(cx,cy,1-left/tot,"#5fd16b",TW*1.6);
  txt(fmtTime(left),cx,cy-TH*.45,TH*.55);
}
function selectRing(x,y,s){ const t=(Math.sin(performance.now()/200)+1)/2; ctx.save(); ctx.globalAlpha=.5+t*.5; poly([P(x-.1,y-.1),P(x+s+.1,y-.1),P(x+s+.1,y+s+.1),P(x-.1,y+s+.1)],null,"#fff",Math.max(2,TW*.06)); ctx.restore(); }
function bubble(x,y,ic){ ctx.lineWidth=2; ctx.strokeStyle=OUT; ctx.beginPath(); ctx.arc(x,y,TW*.32,0,7); ctx.fillStyle="#fff"; ctx.fill(); ctx.stroke(); txt(ic,x,y+1,TW*.32); }
function fmtTime(s){ s=Math.ceil(s); if(s<60) return s+"s"; if(s<3600) return Math.floor(s/60)+"m "+(s%60?s%60+"s":""); return Math.floor(s/3600)+"h "+Math.floor(s%3600/60)+"m"; }

// ---------- players ----------
// kinds: rover, forward, ruck, tagger, shepherd, trainer, hero
function drawPlayer(px,py,k,c,o={}){
  const t=performance.now()/110+(o.id||0)*1.7;
  const sw=o.moving?Math.sin(t)*k*.22:0, bob=o.moving?Math.abs(Math.sin(t))*k*.12:0, atk=o.atk?k*.25:0;
  ctx.save(); ctx.translate(px,py);
  ctx.fillStyle="#0004"; ctx.beginPath(); ctx.ellipse(0,0,k*.8,k*.35,0,0,7); ctx.fill();
  if(o.face<0) ctx.scale(-1,1); ctx.translate(0,-bob);
  ctx.lineWidth=Math.max(1.2,k*.13); ctx.strokeStyle=OUT; ctx.lineJoin="round";
  const skin=o.skin||"#efc39b", kind=o.kind;
  const jumper = kind==="trainer"?"#e6ff3a":c.a, stripe=kind==="trainer"?"#e6ff3a":c.b;
  const socks = kind==="trainer"?"#fff":c.b;
  for(const ph of [1,-1]){ const q=sw*ph, dx=ph*.2*k; rr(dx-k*.13+q,-k*1.0,k*.26,k*.78,k*.08,socks); rr(dx-k*.16+q*1.1+k*.04,-k*.27,k*.36,k*.22,k*.1,o.hero?GOLD:"#1e1e1e"); }
  rr(-k*.62+atk*.3,-k*1.95,k*.24,k*.7,k*.12,skin);
  rr(-k*.45,-k*1.3,k*.9,k*.42,k*.12,kind==="ruck"?c.b:kind==="trainer"?"#222":"#f2f2f2");
  rr(-k*.5,-k*2.12,k*1.0,k*.92,k*.25,jumper);
  ctx.save(); ctx.beginPath(); ctx.roundRect(-k*.5,-k*2.12,k*1.0,k*.92,k*.25); ctx.clip(); ctx.fillStyle=stripe; ctx.fillRect(-k*.12,-k*2.2,k*.24,k); ctx.restore();
  ctx.beginPath(); ctx.roundRect(-k*.5,-k*2.12,k*1.0,k*.92,k*.25); ctx.stroke();
  if(kind==="trainer"){ ctx.fillStyle="#222"; ctx.font=`${k*.28}px sans-serif`; ctx.textAlign="center"; ctx.fillText("T",0,-k*1.6); }
  if(kind==="shepherd"){ rr(-k*.6,-k*2.15,k*.35,k*.3,k*.1,c.b); rr(k*.25,-k*2.15,k*.35,k*.3,k*.1,c.b); }
  ctx.save(); ctx.translate(k*.42,-k*1.95); ctx.rotate(-atk/k*1.6); rr(-k*.02,0,k*.24,k*.68,k*.12,skin); ctx.restore();
  ctx.beginPath(); ctx.arc(k*.05,-k*2.55,k*.48,0,7); ctx.fillStyle=skin; ctx.fill(); ctx.stroke();
  const hair = o.hair||(kind==="ruck"?"#e0b040":"#4a2e16");
  ctx.beginPath(); ctx.arc(k*.05,-k*2.62,k*.49,Math.PI*1.02,Math.PI*1.98); ctx.lineTo(k*.4,-k*2.7); ctx.lineTo(-k*.35,-k*2.6); ctx.closePath(); ctx.fillStyle=hair; ctx.fill(); ctx.stroke();
  if(kind==="ruck"||kind==="tagger"){ ctx.fillStyle=kind==="tagger"?"#e8503a":c.b; ctx.fillRect(-k*.43,-k*2.75,k*.96,k*.14); }
  if(kind==="shepherd"){ ctx.beginPath(); ctx.arc(k*.05,-k*2.6,k*.53,Math.PI,0); ctx.fillStyle=c.a; ctx.fill(); ctx.stroke(); }
  ctx.fillStyle="#1a1a1a"; ctx.beginPath(); ctx.arc(k*.25,-k*2.5,k*.07,0,7); ctx.arc(k*.42,-k*2.5,k*.07,0,7); ctx.fill();
  if(kind==="forward"||(o.hero&&o.ranged)) footy(k*.75,-k*1.35,k*.32,-.5);
  if(kind==="tagger"){ ctx.lineWidth=Math.max(1,k*.1); rr(-k*.95,-k*1.9,k*.4,k*.5,k*.1,"#c98a3a"); }
  if(kind==="trainer"){ cylBottle(k*.8,-k*1.5,k); cylBottle(-k*.85,-k*1.6,k); }
  if(o.hero){ ctx.fillStyle=GOLD; ctx.beginPath(); for(let i=0;i<5;i++){ const a=-Math.PI/2+i*Math.PI*2/5, a2=a+Math.PI/5; ctx.lineTo(k*.05+Math.cos(a)*k*.35,-k*3.35+Math.sin(a)*k*.35); ctx.lineTo(k*.05+Math.cos(a2)*k*.15,-k*3.35+Math.sin(a2)*k*.15);} ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if(o.rage){ ctx.globalAlpha=.35+.2*Math.sin(t*2); ctx.fillStyle="#ff3b6b"; ctx.beginPath(); ctx.ellipse(0,-k*1.4,k*.9,k*1.6,0,0,7); ctx.fill(); ctx.globalAlpha=1; }
  ctx.restore();
}
function cylBottle(x,y,k){ ctx.lineWidth=Math.max(1,k*.08); rr(x-k*.1,y-k*.3,k*.2,k*.4,k*.06,"#36c9e8"); }
function drawMini(x,y,club){ const [px,py]=P(x,y,.55); drawPlayer(px,py,TW*.13,club,{id:x*7}); }
function drawHeroStatue(x,y,z,club,hero){ const [px,py]=P(x,y,z); drawPlayer(px,py,TW*.36,club,{hero:true,ranged:HERO_POS[hero.pos].ranged,id:1}); txt(hero.name.split(" ").pop(),px,py+TH*.35,TH*.55,GOLD); }

// ---------- scenery ----------
let deco=null, tufts=null;
function makeDeco(){
  const r=rng(42); deco=[]; tufts=[];
  for(let i=-10;i<N+10;i++) for(let j=-10;j<N+10;j++){
    if(i>=-1&&j>=-1&&i<=N&&j<=N) continue;
    if(r()<(i<-2||j<-2||i>N+1||j>N+1?.55:.3)) deco.push({x:i+.2+r()*.6,y:j+.2+r()*.6,k:r()<.72?"tree":r()<.6?"bush":"rock",s:.8+r()*.5,h:r()});
  }
  for(let n=0;n<260;n++) tufts.push([r()*N,r()*N]);
}
function drawDeco(t,ox=0,oy=0){
  const [x,y]=P(t.x+ox,t.y+oy), k=TW*.5*(t.s||1);
  if(x<-k*2||x>W+k*2||y<-k*3||y>H+k) return;
  ctx.fillStyle="#0003"; ctx.beginPath(); ctx.ellipse(x+k*.25,y,k*.75,k*.32,0,0,7); ctx.fill();
  ctx.strokeStyle=OUT;
  if(t.k==="rock"){ ctx.lineWidth=LW(); poly([[x-k*.5,y],[x-k*.4,y-k*.4],[x,y-k*.6],[x+k*.45,y-k*.35],[x+k*.5,y]],grad([x,y-k*.6],[x,y],"#c9c4bb","#7d776d")); return; }
  const blobs=t.k==="tree"?[[-.38,-1.25,.48],[.38,-1.2,.48],[0,-1.7,.58],[0,-1.15,.5]]:[[-.3,-.35,.38],[.3,-.35,.38],[0,-.6,.42]];
  if(t.k==="tree"){ ctx.lineWidth=LW(); rr(x-k*.12,y-k*1.0,k*.24,k*1.0,k*.08,"#7a4a22"); }
  const base=(t.h||0)<.5?"#2f7f2a":"#3a8a2c", light=(t.h||0)<.5?"#5fb246":"#6dbd4c";
  ctx.lineWidth=LW()*2; ctx.fillStyle=base;
  for(const [a,b,r] of blobs){ ctx.beginPath(); ctx.arc(x+a*k,y+b*k,r*k,0,7); ctx.stroke(); }
  for(const [a,b,r] of blobs){ ctx.beginPath(); ctx.arc(x+a*k,y+b*k,r*k,0,7); ctx.fill(); }
  ctx.fillStyle=light; for(const [a,b,r] of blobs){ ctx.beginPath(); ctx.arc(x+a*k-r*k*.25,y+b*k-r*k*.3,r*k*.55,0,7); ctx.fill(); }
}

function drawGround(){
  if(!deco) makeDeco();
  ctx.fillStyle="#4c9631"; ctx.fillRect(0,0,W,H);
  poly([P(-.5,-.5),P(N+.5,-.5),P(N+.5,N+.5),P(-.5,N+.5)],"#5ea83c",null);
  poly([P(0,0),P(N,0),P(N,N),P(0,N)],"#6cb646","#4f9a34",2);
  for(let i=0;i<N;i+=2) diamond(i,0,1,N,"#74bd4d");
  ctx.strokeStyle="#4f9a3499"; ctx.lineWidth=Math.max(1,TW*.025); ctx.lineCap="round";
  for(const [a,b] of tufts){ const [tx,ty]=P(a,b), s=TW*.08; ctx.beginPath(); ctx.moveTo(tx-s,ty-s); ctx.lineTo(tx-s*.3,ty); ctx.lineTo(tx,ty-s*1.3); ctx.lineTo(tx+s*.3,ty); ctx.lineTo(tx+s,ty-s); ctx.stroke(); }
}

// Draw a single building centred into a small canvas (shop thumbnails)
function thumb(t, club, lv=1){
  const c=document.createElement("canvas"); c.width=c.height=160;
  const saved={ctx,W,H,TW,TH,cx:cam.x,cy:cam.y};
  ctx=c.getContext("2d"); W=H=160; const s=BLD[t].size;
  TW=Math.min(120/(s+.6), 60); TH=TW/2;
  // centre building footprint
  const want=[80,s===1?105:122]; cam.x=0; cam.y=0; const [ax,ay]=iso(s/2,s/2); cam.x=want[0]-ax; cam.y=want[1]-ay - (s===1?0:0);
  const list=[{t,x:0,y:0,lv}]; if(t==="fence"){ list.push({t,x:1,y:0,lv}); list[0].x=-.5; }
  try{ drawBuilding({t,x:t==="fence"?0:0,y:0,lv},club,list,{fill:.7,hero:t==="locker"?CLUBS[S.club].hero:null}); }catch(e){ console.error("thumb",t,e.message); }
  ctx=saved.ctx; W=saved.W; H=saved.H; TW=saved.TW; TH=saved.TH; cam.x=saved.cx; cam.y=saved.cy;
  return c;
}

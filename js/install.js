// ---------- "Install the app" prompt, shown the first time someone opens the game ----------
let deferredInstall = null;
const isStandalone = () => matchMedia("(display-mode: standalone)").matches ||
  (matchMedia("(display-mode: fullscreen)").matches && !document.fullscreenElement) || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = () => /android/i.test(navigator.userAgent);
const askedKey = "ffInstallAsked";
function wasAsked(){ try{ return localStorage.getItem(askedKey)==="1"; }catch(e){ return false; } }
function markAsked(){ try{ localStorage.setItem(askedKey,"1"); }catch(e){} }

addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; const b=document.getElementById("installGo"); if(b) b.classList.remove("hide"); });
addEventListener("appinstalled", () => { hideInstall(); markAsked(); });

function showInstall(force){
  if (isStandalone() || (!force && wasAsked())) return;
  if (!force && !isIOS() && !isAndroid() && !deferredInstall) return; // desktop with nothing to offer
  const box = document.getElementById("installPrompt"), steps = document.getElementById("installSteps"), go = document.getElementById("installGo");
  if (isIOS()) {
    steps.innerHTML = `<ol><li>Tap the <b>Share</b> button <span class="ios-share">⬆︎</span> at the bottom of Safari</li><li>Scroll down and tap <b>Add to Home Screen</b></li><li>Tap <b>Add</b>. Footy Fortress opens full screen like an app.</li></ol><p class="tiny">On iPhone this only works in Safari.</p>`;
    go.classList.add("hide");
  } else {
    steps.innerHTML = deferredInstall || !isAndroid()
      ? `<p>Add it to your home screen to play full screen, even offline.</p>`
      : `<ol><li>Tap the <b>⋮</b> menu in Chrome</li><li>Tap <b>Install app</b> (or <b>Add to Home screen</b>)</li></ol>`;
    go.classList.toggle("hide", !deferredInstall);
  }
  box.classList.remove("hide");
  markAsked();
}
function hideInstall(){ document.getElementById("installPrompt").classList.add("hide"); }
document.getElementById("installGo").onclick = async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt(); await deferredInstall.userChoice.catch(()=>{}); deferredInstall = null; hideInstall();
};
document.getElementById("installLater").onclick = hideInstall;

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(()=>{});
// first visit: give Chrome a moment to offer its install event, then ask
setTimeout(() => showInstall(false), 1500);

// Settings > Check for updates: save, drop every cached copy, re-download the files and reload.
async function forceUpdate(){
  try{ save(); }catch(e){}
  toast("Getting the latest version…");
  try{ if(window.caches) for(const k of await caches.keys()) await caches.delete(k); }catch(e){}
  try{ if(navigator.serviceWorker) for(const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); }catch(e){}
  const files=["index.html","style.css","manifest.webmanifest","art/sheets.js",...[...document.scripts].map(s=>s.getAttribute("src")).filter(Boolean)];
  try{ await Promise.all(files.map(f=>fetch(f,{cache:"reload"}).catch(()=>{}))); }catch(e){}
  location.replace(location.pathname+"?v="+Date.now());
}

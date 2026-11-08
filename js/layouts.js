// ---------- Layout Editor (like Clash's): 3 saved slots, the current base always saved, edit with a tray of unplaced pieces ----------
// Placeholder look and text; art and wording to be polished.
let EDIT = null; // {slot, backup:[[id,x,y]], undo:[]}
const LSLOTS = 3;
function layoutsInit(){
  S.layouts = S.layouts || Array(LSLOTS).fill(null);
  if (S.savedLayout) { const i = S.layouts.indexOf(null); if (i >= 0) S.layouts[i] = {name: S.savedLayout.from + "'s ground", L: S.savedLayout.L, at: S.savedLayout.at}; delete S.savedLayout; }
  if (S.editBackup) { restorePositions(S.editBackup); delete S.editBackup; } // closed mid-edit: put the real base back
}
const posSnap = () => S.buildings.map(b => [b.id, b.x, b.y]);
function restorePositions(snap){ const by = new Map(S.buildings.map(b => [b.id, b])); for (const [id, x, y] of snap) { const b = by.get(id); if (b) { b.x = x; b.y = y; } } }
const inTray = b => b.x < 0;
// Put copied layouts into the first empty slot (never straight onto the base)
function layoutToSlot(name, L){
  layoutsInit(); const i = S.layouts.indexOf(null);
  if (i < 0) { toast("All 3 layout slots are full. Delete one in Build → 📋"); return false; }
  S.layouts[i] = {name, L, at: Date.now()}; save(); toast(`📋 Saved to Layout ${i + 1}. Open Build → 📋 to edit or use it`); return true;
}
// Arrange S.buildings to a layout; anything without a spot goes to the tray (x = -99)
function arrangeTo(L){
  const want = {}; for (const [t, x, y] of L || []) if (BLD[t]) (want[t] = want[t] || []).push([x, y]);
  for (const b of S.buildings) { b.x = -99; b.y = -99; }
  for (const b of S.buildings.slice().sort((a, c) => BLD[c.t].size - BLD[a.t].size)) { const s = BLD[b.t].size, sp = want[b.t] || [];
    while (sp.length) { const [x, y] = sp.shift(); if (footprintFree(x, y, s, b)) { b.x = x; b.y = y; break; } } }
}
function openLayouts(){
  layoutsInit(); if (EDIT) return;
  const row = (title, sub, btns) => `<div class="fx"><span class="nm"><b>${title}</b><br><small>${sub}</small></span>${btns}</div>`;
  const cur = S.baseAuto;
  let h = `<h2>📋 Layouts</h2><div class="fixture">`;
  h += row("Current base", "🟢 In use · saved automatically", `<button class="btn blue" data-led="cur">✏️</button>`);
  if (cur) h += row("Previous base", `Before you last tapped Use · ${fmtTime((Date.now() - cur.at) / 1000)} ago`, `<button class="btn green" data-luse="prev">Use</button>`);
  S.layouts.forEach((l, i) => { h += l ? row(`Layout ${i + 1} · ${esc(l.name)}`, `${l.L.length} pieces · ${fmtTime((Date.now() - l.at) / 1000)} ago`,
      `<button class="btn blue" data-led="${i}">✏️</button><button class="btn green" data-luse="${i}">Use</button><button class="btn red" data-ldel="${i}">🗑</button>`)
    : row(`Layout ${i + 1}`, "Empty", `<button class="btn blue" data-led="${i}">✏️ New</button>`); });
  h += `</div><h3>Share & copy</h3><div class="center"><button class="btn gold" id="lyShare">📤 Share current base</button></div><div class="center" id="lyCode"></div>
    <form id="lyLoad" class="fradd"><input id="lyIn" placeholder="Layout code" maxlength="8" autocomplete="off" style="text-transform:uppercase"><button class="btn green" type="submit">📥 Load</button></form>
    <p class="tiny center">Copied layouts (friends, opponents, codes) go into an empty slot. Edit it, drag in anything left in the tray, then tap Use. Your base before each Use is kept as Previous base.</p>`;
  modal(h);
  document.querySelectorAll("[data-led]").forEach(b => b.onclick = () => editLayout(b.dataset.led === "cur" ? "cur" : +b.dataset.led));
  document.querySelectorAll("[data-luse]").forEach(b => b.onclick = () => { const L = b.dataset.luse === "prev" ? S.baseAuto.L : S.layouts[+b.dataset.luse].L; useLayout(L); closeModal(); });
  document.querySelectorAll("[data-ldel]").forEach(b => b.onclick = () => { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Sure?"; return; } S.layouts[+b.dataset.ldel] = null; save(); openLayouts(); });
  $("lyShare").onclick = async () => { if (!signedIn()) return toast("Sign in (Online) to share layouts");
    try { const r = await api("/layout", { method: "POST", body: { layout: layoutOf(S.buildings) } }); $("lyCode").innerHTML = `<p class="lycode">${esc(r.code)}</p>`;
      try { await navigator.clipboard.writeText(r.code); toast("Code copied"); } catch (e) {} } catch (e) { toast(e.message); } };
  $("lyLoad").onsubmit = async e => { e.preventDefault(); const code = $("lyIn").value.trim().toUpperCase(); if (!code) return;
    if (!signedIn()) return toast("Sign in (Online) to load layouts");
    try { const r = await api("/layout/" + encodeURIComponent(code)); if (layoutToSlot((r.name || code) + "'s ground", r.layout)) openLayouts(); } catch (err) { toast(err.message); } };
}
// Use a layout on the real base; the base before is kept as "Previous base"
function useLayout(L){
  if (lockedToast()) return;
  S.baseAuto = {L: layoutOf(S.buildings), at: Date.now()};
  const before = posSnap(); arrangeTo(L);
  const was = new Map(before.map(([id, x, y]) => [id, [x, y]]));
  for (const b of S.buildings.filter(inTray)) { const s = BLD[b.t].size, [ox, oy] = was.get(b.id); const sp = footprintFree(ox, oy, s, b) ? [ox, oy] : findSpot(s); [b.x, b.y] = sp || [ox, oy]; }
  selected = null; placing = null; save(); refreshUI(); toast("Layout in use. Your old base is saved as Previous base");
}
// ----- the editor -----
function editLayout(slot){
  if (lockedToast()) return;
  closeModal(); selected = null; placing = null;
  EDIT = {slot, backup: posSnap(), undo: []}; S.editBackup = EDIT.backup;
  if (slot !== "cur") { const l = S.layouts[slot]; if (l) arrangeTo(l.L); else for (const b of S.buildings) { b.x = -99; b.y = -99; } }
  document.body.classList.add("editing"); editUI(); refreshUI();
}
const editSnap = () => { if (EDIT) { EDIT.undo.push(posSnap()); if (EDIT.undo.length > 40) EDIT.undo.shift(); } };
function editUI(){
  let el = $("editUI"); if (!el) { el = document.createElement("div"); el.id = "editUI"; document.body.appendChild(el); }
  const tray = {}; for (const b of S.buildings) if (inTray(b)) tray[b.t] = (tray[b.t] || 0) + 1;
  const placed = S.buildings.filter(b => !inTray(b)).length;
  el.innerHTML = `<div class="ed-top"><div class="ed-title">✏️ Editing ${EDIT.slot === "cur" ? "current base" : "Layout " + (EDIT.slot + 1)}<small>Placed ${placed} / ${S.buildings.length}</small></div></div>
    <div class="ed-side"><button class="ed-sb red" id="edAll">🧹<br>Remove all</button><button class="ed-sb" id="edFence">🧱<br>Remove fences</button><button class="ed-sb" id="edUndo">↩️<br>Undo</button></div>
    <div class="ed-bot"><div class="ed-trayh">Not placed (${S.buildings.length - placed}) · tap to place, then drag</div><div class="ed-tray">${Object.entries(tray).map(([t, n]) => `<button class="ed-ti" data-tt="${t}"><span>${esc(BLD[t].name)}</span><i>×${n}</i></button>`).join("") || "<span class='tiny'>Everything is placed</span>"}</div>
    <div class="ed-acts"><button class="btn red" id="edCancel">✖ Cancel</button><button class="btn blue" id="edSave">💾 Save</button><button class="btn green" id="edUse">✔ Use</button></div></div>`;
  $("edAll").onclick = () => { editSnap(); for (const b of S.buildings) { b.x = -99; b.y = -99; } editUI(); };
  $("edFence").onclick = () => { editSnap(); for (const b of S.buildings) if (b.t === "fence") { b.x = -99; b.y = -99; } editUI(); };
  $("edUndo").onclick = () => { const u = EDIT.undo.pop(); if (u) { restorePositions(u); editUI(); } };
  document.querySelectorAll("[data-tt]").forEach(btn => btn.onclick = () => { const b = S.buildings.find(x => x.t === btn.dataset.tt && inTray(x)), sp = b && findSpot(BLD[b.t].size);
    if (!sp) return toast("No room left"); editSnap(); [b.x, b.y] = sp; selected = b; centreOn(sp[0] + 1, sp[1] + 1); editUI(); });
  $("edCancel").onclick = () => endEdit(false);
  $("edSave").onclick = () => endEdit(true);
  $("edUse").onclick = () => { const L = layoutOf(S.buildings.filter(b => !inTray(b))); endEdit(true); useLayout(L); };
}
function endEdit(keep){
  const L = layoutOf(S.buildings.filter(b => !inTray(b)));
  restorePositions(EDIT.backup);
  if (keep) { if (EDIT.slot === "cur") { const i = S.layouts.indexOf(null); if (i >= 0) S.layouts[i] = {name: "Edited base", L, at: Date.now()}; else toast("Slots full: changes not saved"); }
    else S.layouts[EDIT.slot] = {name: (S.layouts[EDIT.slot] || {}).name || "My layout", L, at: Date.now()}; }
  EDIT = null; delete S.editBackup; document.body.classList.remove("editing"); const el = $("editUI"); if (el) el.remove();
  selected = null; save(); refreshUI();
}

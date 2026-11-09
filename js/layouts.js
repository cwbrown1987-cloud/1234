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
// Like Clash: copying sends you to the saved layouts to pick a slot (only within 1 Clubhouse level of yours)
function layoutToSlot(name, L, d){
  layoutsInit();
  if (d && Math.abs(d - th()) > 1) { toast("You can only copy grounds within 1 Clubhouse level of yours"); return false; }
  if (typeof BT !== "undefined" && BT) leaveBattle();
  modal(`<h2>Save copied layout</h2><p class="tiny center">${esc(name)} · choose a slot</p><div class="fixture">` + S.layouts.map((l, i) =>
    `<div class="fx"><span class="nm"><b>Layout ${i + 1}</b><br><small>${l ? esc(l.name) + " (will be replaced)" : "Empty"}</small></span><button class="btn green" data-pick="${i}">Save here</button></div>`).join("") + `</div>`);
  document.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => { S.layouts[+b.dataset.pick] = {name, L, at: Date.now()}; save(); openLayouts(); });
  return true;
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
  h += `</div><h3><i class="uia" data-ui="ico-copy">📋</i> Share & copy</h3><div class="center"><button class="btn gold" id="lyShare">📤 Share current base</button></div><div class="center" id="lyCode"></div>
    <form id="lyLoad" class="fradd"><input id="lyIn" placeholder="Layout code" maxlength="8" autocomplete="off" style="text-transform:uppercase"><button class="btn green" type="submit">📥 Load</button></form>
    <p class="tiny center">Copied layouts (friends, opponents, codes) go into an empty slot. Edit it, drag in anything left in the tray, then tap Use. Your base before each Use is kept as Previous base.</p>`;
  modal(h); if (typeof applyUiArt === "function") applyUiArt();
  document.querySelectorAll("[data-led]").forEach(b => b.onclick = () => editLayout(b.dataset.led === "cur" ? "cur" : +b.dataset.led));
  document.querySelectorAll("[data-luse]").forEach(b => b.onclick = () => { const L = b.dataset.luse === "prev" ? S.baseAuto.L : S.layouts[+b.dataset.luse].L; useLayout(L); closeModal(); });
  document.querySelectorAll("[data-ldel]").forEach(b => b.onclick = () => { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Sure?"; return; } S.layouts[+b.dataset.ldel] = null; save(); openLayouts(); });
  $("lyShare").onclick = async () => { if (!signedIn()) return toast("Sign in (Online) to share layouts");
    try { const r = await api("/layout", { method: "POST", body: { layout: layoutOf(S.buildings) } }); $("lyCode").innerHTML = `<p class="lycode">${esc(r.code)}</p>`;
      try { await navigator.clipboard.writeText(r.code); toast("Code copied"); } catch (e) {} } catch (e) { toast(e.message); } };
  $("lyLoad").onsubmit = async e => { e.preventDefault(); const code = $("lyIn").value.trim().toUpperCase(); if (!code) return;
    if (!signedIn()) return toast("Sign in (Online) to load layouts");
    try { const r = await api("/layout/" + encodeURIComponent(code)); layoutToSlot((r.name || code) + "'s ground", r.layout); } catch (err) { toast(err.message); } };
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
  EDIT = {slot, backup: posSnap()}; S.editBackup = EDIT.backup;
  if (slot !== "cur") { const l = S.layouts[slot]; if (l) arrangeTo(l.L); else for (const b of S.buildings) { b.x = -99; b.y = -99; } }
  document.body.classList.add("editing"); editUI(); refreshUI();
}
// Matches Clash's Village Edit Mode: title top left, slide-out toolbar on the right, inventory cards along the bottom.
function editUI(){
  let el = $("editUI"); if (!el) { el = document.createElement("div"); el.id = "editUI"; document.body.appendChild(el); }
  const inv = {}; for (const b of S.buildings) if (inTray(b)) { const k = b.t + "|" + b.lv; (inv[k] = inv[k] || []).push(b); }
  const done = !S.buildings.some(inTray), E = EDIT, club = myClub();
  const bg = cls => cls === "grey" ? "vem-btn-grey" : cls === "red" ? "vem-btn-red" : cls === "on" ? "vem-btn-on" : "vem-btn-green";
  const g = (id, ico, txt, cls = "") => `<button class="vem-b ${cls}" id="${id}" data-uibg="${bg(cls)}"><i class="uia" data-ui="vem-${id.slice(3).toLowerCase()}">${ico}</i><span>${txt}</span></button>`;
  el.className = (E.hideBar ? "barhide " : "") + (E.photo ? "photo" : "");
  el.innerHTML = `<div class="vem-title"><i class="uia" data-ui="vem-pencil">✏️</i>Ground Edit Mode</div>
    <div class="vem-bar"><button class="vem-tab" id="vemTab" data-uibg="vem-tab"><i class="uia" data-ui="vem-wrench">🔧</i></button><div class="vem-list">
      ${g("vemErase", "🧽", E.erase ? "Erase On" : "Erase Off", E.erase ? "on" : "")}
      ${g("vemAll", "📦", E.sureAll ? "Sure?" : "Remove All", "grey")}
      ${g("vemMove", "✥", "Move All", E.move ? "on" : "")}
      ${g("vemWalls", "🧱", "View Fences", E.walls ? "on" : "")}
      ${g("vemScout", "👁️", "Scout View", E.scout ? "on" : "")}
      ${g("vemPhoto", "📷", "Photo Mode")}
      <div class="vem-gap"></div>
      ${done ? g("vemSave", "💾", "Save Ground") : g("vemLater", "✔", "Finish later", "grey")}
      ${g("vemCancel", "✖", "Cancel", "red")}</div></div>
    ${E.move ? `<div class="vem-move"><button data-mv="-1,0" data-uibg="vem-arrow">↖</button><button data-mv="0,-1" data-uibg="vem-arrow">↗</button><button data-rot="-1" data-uibg="vem-rotate">⟲</button><button data-rot="1" data-uibg="vem-rotate">⟳</button><button data-mv="0,1" data-uibg="vem-arrow">↙</button><button data-mv="1,0" data-uibg="vem-arrow">↘</button></div>` : ""}
    <div class="vem-hint">${done ? "" : "Drag buildings from the inventory to place them"}</div>
    <div class="vem-inv">${Object.entries(inv).map(([k, list]) => `<div class="vem-card" data-inv="${k}" data-uibg="vem-card">${list.length > 1 ? `<b>x${list.length}</b>` : ""}<canvas width="160" height="160"></canvas><span>Level ${list[0].lv}</span></div>`).join("")}</div>`;
  if (typeof applyUiArt === "function") applyUiArt(el);
  el.querySelectorAll("[data-inv]").forEach(c => { const [t, lv] = c.dataset.inv.split("|"); const th = thumb(t, club, +lv); c.querySelector("canvas").getContext("2d").drawImage(th, 0, 0);
    c.onpointerdown = e => { e.preventDefault(); const b = S.buildings.find(x => inTray(x) && x.t === t && x.lv === +lv); if (b) invDrag(b, e); }; });
  const tog = (id, k) => $(id).onclick = () => { E[k] = !E[k]; editUI(); };
  $("vemTab").onclick = () => { E.hideBar = !E.hideBar; editUI(); };
  tog("vemErase", "erase"); tog("vemMove", "move"); tog("vemWalls", "walls"); tog("vemScout", "scout");
  $("vemAll").onclick = () => { if (!E.sureAll) { E.sureAll = true; editUI(); setTimeout(() => { if (EDIT) { EDIT.sureAll = false; editUI(); } }, 2500); return; }
    E.sureAll = false; for (const b of S.buildings) { b.x = -99; b.y = -99; } selected = null; editUI(); };
  $("vemPhoto").onclick = () => { E.photo = true; editUI(); toast("Tap anywhere to leave Photo Mode"); };
  if ($("vemSave")) $("vemSave").onclick = () => endEdit(true);
  if ($("vemLater")) $("vemLater").onclick = () => { if (E.slot === "cur") return toast("Place everything first: this is your active ground"); endEdit(true); };
  $("vemCancel").onclick = () => endEdit(false);
  el.querySelectorAll("[data-mv]").forEach(b => b.onclick = () => { const [dx, dy] = b.dataset.mv.split(",").map(Number); shiftAll(p => [p.x + dx, p.y + dy]); });
  el.querySelectorAll("[data-rot]").forEach(b => b.onclick = () => { const r = +b.dataset.rot; shiftAll((p, s) => r > 0 ? [N - p.y - s, p.x] : [p.y, N - p.x - s]); });
}
// Move or turn everything placed, only if it all still fits
function shiftAll(f){
  const on = S.buildings.filter(b => !inTray(b)), next = on.map(b => f(b, BLD[b.t].size)), old = on.map(b => [b.x, b.y]);
  on.forEach((b, i) => { b.x = -99; b.y = -99; });
  const ok = on.every((b, i) => { const [x, y] = next[i]; if (!footprintFree(x, y, BLD[b.t].size, b)) return false; b.x = x; b.y = y; return true; });
  if (!ok) { on.forEach((b, i) => { [b.x, b.y] = old[i]; }); toast("Can't move it that way"); }
}
// Drag a card from the inventory onto the ground
function invDrag(b, e0){
  const s = BLD[b.t].size, at = e => { const r = cv.getBoundingClientRect(), [gx, gy] = unIso((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height); return [Math.round(gx - s / 2), Math.round(gy - s / 2)]; };
  placing = {t: b.t, x: -99, y: -99, moving: b};
  const mv = e => { [placing.x, placing.y] = at(e); };
  const up = e => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up);
    const [x, y] = at(e); if (footprintFree(x, y, s, b)) { b.x = x; b.y = y; sfx("tap"); } placing = null; editUI(); refreshUI(); };
  addEventListener("pointermove", mv); addEventListener("pointerup", up);
}
// Erase mode / Photo Mode taps (called from homeTap)
function editTap(h){
  if (EDIT.photo) { EDIT.photo = false; editUI(); return true; }
  // like Clash, Erase only picks up buildings, never rocks, trees or other obstacles
  if (EDIT.erase) { if (h && h.x >= 0 && S.buildings.includes(h)) { h.x = -99; h.y = -99; selected = null; editUI(); } return true; }
  if (h && !S.buildings.includes(h)) return true; // obstacles can't be cleared or touched in edit mode
  return false;
}
function endEdit(keep){
  const L = layoutOf(S.buildings.filter(b => !inTray(b)));
  restorePositions(EDIT.backup);
  if (keep) { if (EDIT.slot === "cur") { const i = S.layouts.indexOf(null); if (i >= 0) S.layouts[i] = {name: "Edited base", L, at: Date.now()}; else toast("Slots full: changes not saved"); }
    else S.layouts[EDIT.slot] = {name: (S.layouts[EDIT.slot] || {}).name || "My layout", L, at: Date.now()}; }
  EDIT = null; delete S.editBackup; document.body.classList.remove("editing"); const el = $("editUI"); if (el) el.remove();
  selected = null; save(); refreshUI();
}

// ---------- Hero Gear (Clash's hero equipment) ----------
// Built at the Kit Room (Clash's Blacksmith). Each hero equips 2 pieces. Gear is upgraded with ores:
//   Strapping Tape 🩹 (Shiny Ore: every level), Liniment 🧴 (Glowy Ore: every 3rd level), Premiership Silver 🏆 (Starry Ore: epic gear).
const ORES = {
  tape:   {name:"Strapping Tape", icon:"🩹", clash:"Shiny Ore"},
  lin:    {name:"Liniment", icon:"🧴", clash:"Glowy Ore"},
  silver: {name:"Premiership Silver", icon:"🏆", clash:"Starry Ore"},
};
// per-level effects; unlock = Kit Room level needed (epics: special unlock)
const GEAR = {
  boots:   {hero:"captain", name:"Lucky Boots",        icon:"👟", rarity:"common", unlock:1, desc:"Tougher and quicker on his feet.", fx:{hp:.03, spd:.02}},
  gloves:  {hero:"captain", name:"Torpedo Gloves",     icon:"🧤", rarity:"common", unlock:1, desc:"Hits harder.", fx:{dps:.04}},
  armband: {hero:"captain", name:"Captain's Armband",  icon:"🎗️", rarity:"common", unlock:2, desc:"A stronger hero ability.", fx:{ability:.08}},
  mouthguard:{hero:"captain", name:"Mouthguard",       icon:"🦷", rarity:"epic", unlock:3, desc:"Takes less damage from defences.", fx:{armor:.02, hp:.02}},
  clipboard:{hero:"coach",  name:"Clipboard",          icon:"📋", rarity:"common", unlock:1, desc:"Three-Quarter Time Address heals more.", fx:{heal:.06}},
  whistle: {hero:"coach",   name:"Whistle",            icon:"📯", rarity:"common", unlock:1, desc:"The fire-up after the address lasts longer.", fx:{rage:.4}},
  magnet:  {hero:"coach",   name:"Magnet Board",       icon:"🧲", rarity:"common", unlock:2, desc:"Tougher and hits harder.", fx:{hp:.04, dps:.02}},
  cup:     {hero:"coach",   name:"Premiership Cup",    icon:"🏆", rarity:"epic", unlock:"premiership", desc:"His address also shields nearby players for a few seconds.", fx:{shield:1.5, heal:.03}},
};
const GEAR_MAX = {common:12, epic:18};
// cost to go from level lv to lv+1
function gearCost(id, lv) {
  const epic = GEAR[id].rarity === "epic", c = {tape: Math.round((epic ? 160 : 100) * lv * (1 + lv * .15))};
  if (lv % 3 === 0) c.lin = Math.round((epic ? 12 : 8) * lv / 3);
  if (epic && lv % 3 === 0) c.silver = Math.round(4 * lv / 3);
  return c;
}
const ORE_VOTES = {tape:1/30, lin:1/2, silver:3}; // Brownlow votes per missing ore, like paying gems for ore in Clash

const kitRoom = () => S.buildings.find(b => b.t === "kitroom" && built(b));
function gearUnlocked(id) {
  const g = GEAR[id], kr = kitRoom();
  if (!kr) return false;
  if (g.unlock === "premiership") return (S.premierships || 0) > 0;
  return kr.lv >= g.unlock;
}
function gearState() {
  S.gear = S.gear || {lv:{}, eq:{captain:[], coach:[]}};
  S.ore = S.ore || {tape:0, lin:0, silver:0};
  for (const id of Object.keys(GEAR)) if (gearUnlocked(id) && !S.gear.lv[id]) { S.gear.lv[id] = 1; toast(`New gear: ${GEAR[id].name}!`); }
  return S.gear;
}
function addOre(o) { S.ore = S.ore || {tape:0, lin:0, silver:0}; for (const k of Object.keys(o)) S.ore[k] = (S.ore[k] || 0) + o[k]; }
const oreText = o => Object.entries(o).filter(([, n]) => n).map(([k, n]) => `${fmt(n)} ${ORES[k].icon}`).join(" ");

// combined effect of a hero's equipped gear
function gearFx(hero) {
  const out = {hp:0, dps:0, spd:0, ability:0, armor:0, heal:0, rage:0, shield:0};
  if (!S || !S.gear) return out;
  for (const id of S.gear.eq[hero] || []) { const g = GEAR[id], lv = S.gear.lv[id] || 0; for (const [k, v] of Object.entries(g.fx)) out[k] += v * lv; }
  out.armor = Math.min(.4, out.armor);
  return out;
}
function equipGear(id) {
  const g = GEAR[id], eq = S.gear.eq[g.hero];
  const i = eq.indexOf(id);
  if (i >= 0) eq.splice(i, 1);
  else { if (eq.length >= 2) return toast("Two pieces at a time. Take one off first."); eq.push(id); }
  save();
}
function upgradeGear(id, useVotes) {
  const lv = S.gear.lv[id], g = GEAR[id];
  if (!lv) return;
  if (lv >= GEAR_MAX[g.rarity]) return toast("Max level");
  if (lv >= kitRoom().lv * 4) return toast(`Upgrade your Kit Room to go past level ${lv}`);
  const cost = gearCost(id, lv), short = {}; let votes = 0;
  for (const [k, n] of Object.entries(cost)) { const miss = Math.max(0, n - (S.ore[k] || 0)); if (miss) { short[k] = miss; votes += miss * ORE_VOTES[k]; } }
  votes = Math.ceil(votes);
  if (votes && !useVotes) return {short, votes};
  if (votes && !pay("medals", votes)) return toast("Not enough Brownlow votes 🏅");
  for (const [k, n] of Object.entries(cost)) S.ore[k] = Math.max(0, (S.ore[k] || 0) - n);
  S.gear.lv[id]++; sfx("build"); addXP(lv * 2); save();
  return true;
}

// ---------- Squad → Heroes: gear section ----------
function gearHTML(hk) {
  if (!kitRoom()) return `<div class="tiny">Build a <b>Kit Room</b> (Clubhouse 4) to unlock hero gear.</div>`;
  const st = gearState(), eq = st.eq[hk];
  const ids = Object.keys(GEAR).filter(id => GEAR[id].hero === hk);
  return `<div class="gear">${ids.map(id => { const g = GEAR[id], lv = st.lv[id];
    if (!lv) return `<div class="gpiece off"><span class="gi">${g.icon}</span><span><b>${g.name}</b>${g.rarity === "epic" ? ' <span class="tag epic">EPIC</span>' : ""}<br><small>${g.unlock === "premiership" ? "Win a premiership to unlock" : `Kit Room level ${g.unlock}`}</small></span></div>`;
    const on = eq.includes(id), max = lv >= GEAR_MAX[g.rarity];
    return `<div class="gpiece ${on ? "on" : ""}"><span class="gi">${g.icon}</span><span class="grow"><b>${g.name}</b> <small>Lv ${lv}/${GEAR_MAX[g.rarity]}</small>${g.rarity === "epic" ? ' <span class="tag epic">EPIC</span>' : ""}<br><small>${g.desc}</small></span>
      <span class="col"><button class="btn ${on ? "green" : ""}" data-eq="${id}">${on ? "Equipped" : "Equip"}</button>${max ? "" : `<button class="btn gold" data-gup="${id}">⬆ ${oreText(gearCost(id, lv))}</button>`}</span></div>`; }).join("")}</div>`;
}
function bindGear(render) {
  document.querySelectorAll("[data-eq]").forEach(b => b.onclick = () => { equipGear(b.dataset.eq); render(); });
  document.querySelectorAll("[data-gup]").forEach(b => b.onclick = () => {
    const r = upgradeGear(b.dataset.gup, false);
    if (r && r.votes) { if (b.dataset.sure) { upgradeGear(b.dataset.gup, true); render(); return; } b.dataset.sure = 1; b.innerHTML = `Use ${r.votes} 🏅 for missing ore?`; return; }
    render();
  });
}
const oreBar = () => `<div class="orebar">${Object.entries(ORES).map(([k, o]) => `<span title="${o.name} (${o.clash})">${o.icon} ${fmt((S.ore || {})[k] || 0)}</span>`).join("")}</div>`;

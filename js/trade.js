// ---------- Card trading (BETA) ----------
// Friends only. Each offer swaps 1-5 of your SPARE cards (copies beyond your first) for 1-5 of theirs, so nobody can lose a card
// from their album. Your offered cards are held aside until the trade is accepted, declined, cancelled or expires (24 h).
let tradeWith = null, tradeChatT = null;
const tkey = x => x.id + "|" + x.t;
const mySpares = () => Object.entries(S.album || {}).filter(([, n]) => n > 1).map(([k, n]) => { const i = k.lastIndexOf("|"); return {id: k.slice(0, i), t: k.slice(i + 1), n: n - 1}; }).filter(x => CARD_BY_ID[x.id]);
const cardName = x => { const c = CARD_BY_ID[x.id]; return c ? `${c.name} (${(TIERS[x.t] || {name: "Special"}).name})` : x.id; };
function tcard(x, attrs = "", on = false){ const c = CARD_BY_ID[x.id]; if (!c) return "";
  return `<button type="button" class="tcard${on ? " on" : ""}" ${attrs}>${cardFaceImage(c, x.t)}${x.n ? `<i>×${x.n}</i>` : ""}</button>`; }
// Apply finished trades to this device's album, and hand back held cards from trades that didn't happen
async function syncTrades(list){
  S.tradeHold = S.tradeHold || {}; let changed = false;
  for (const t of list) {
    const mine = t.from === NET.user.id, hold = S.tradeHold[t.id];
    if (mine && t.status === "accepted" && !t.appliedFrom) { for (const x of t.get) addCard(x.id, x.t); delete S.tradeHold[t.id]; changed = true;
      api(`/trades/${t.id}/applied`, {method: "POST"}).catch(() => {}); toast(`🤝 ${t.toName} accepted your trade!`); }
    else if (mine && hold && t.status !== "open" && t.status !== "accepted") { for (const x of hold) addCard(x.id, x.t); delete S.tradeHold[t.id]; changed = true; }
  }
  if (changed) save();
}
async function renderTrade(box){
  if (!signedIn()) { box.innerHTML = `<p class="center">Sign in to Online to trade cards with your friends.</p>`; return; }
  box.innerHTML = `<p class="center">Loading…</p>`;
  let fr, tr; try { [fr, tr] = await Promise.all([api("/friends"), api("/trades")]); } catch (e) { box.innerHTML = `<p class="center err">${esc(e.message)}</p>`; return; }
  if (box !== $("tradeBox")) return;
  await syncTrades(tr.trades);
  if (tradeWith) return tradeScreen(box, fr.friends.find(f => f.id === tradeWith) || {id: tradeWith, name: "Friend"});
  const inc = tr.trades.filter(t => t.to === NET.user.id && t.status === "open"), out = tr.trades.filter(t => t.from === NET.user.id && t.status === "open");
  const offerRow = (t, who, btns) => `<div class="toffer"><b>${esc(who)}</b><div class="tline"><span>Gives</span>${(t.to === NET.user.id ? t.give : t.get).map(x => tcard(x)).join("")}</div>
    <div class="tline"><span>Wants</span>${(t.to === NET.user.id ? t.get : t.give).map(x => tcard(x)).join("")}</div><small>Expires in ${fmtTime((t.expires - Date.now()) / 1000)}</small><div class="tbtns">${btns}</div></div>`;
  box.innerHTML = `<p class="tiny center">Swap spare cards with friends. Both of you have to give at least one card, and you can only trade spares, so nobody can lose a card from their album.</p>
    ${inc.length ? `<h3>Offers for you</h3>` + inc.map(t => offerRow(t, t.fromName, `<button class="btn green" data-tacc="${t.id}">Accept</button><button class="btn red" data-tdec="${t.id}">Decline</button><button class="btn blue" data-tchat="${t.from}">💬</button>`)).join("") : ""}
    ${out.length ? `<h3>Your offers</h3>` + out.map(t => offerRow({...t, give: t.get, get: t.give, to: NET.user.id}, "To " + t.toName, `<button class="btn red" data-tcan="${t.id}">Cancel</button>`)).join("") : ""}
    <h3>Trade with a friend</h3>${fr.friends.length ? fr.friends.map(f => `<div class="fx">${badgeImg(CLUBS[f.club] || CLUBS[0], "sm")}<span class="nm"><b>${esc(f.name)}</b></span><button class="btn gold" data-twith="${f.id}">⇄ Trade</button></div>`).join("") : `<p class="center">Add friends in Online → Friends to trade with them.</p>`}`;
  const trades = tr.trades;
  box.querySelectorAll("[data-twith],[data-tchat]").forEach(b => b.onclick = () => { tradeWith = b.dataset.twith || b.dataset.tchat; renderTrade(box); });
  box.querySelectorAll("[data-tcan],[data-tdec]").forEach(b => b.onclick = async () => { b.disabled = true; try { await api(`/trades/${b.dataset.tcan || b.dataset.tdec}/cancel`, {method: "POST"}); } catch (e) { toast(e.message); } renderTrade(box); });
  box.querySelectorAll("[data-tacc]").forEach(b => b.onclick = async () => { const t = trades.find(x => x.id == b.dataset.tacc);
    // you need the spares they asked for, right now
    const short = t.get.find(x => (S.album[akey(x.id, x.t)] || 0) < 2); if (short) return toast(`You no longer have a spare ${cardName(short)}`);
    b.disabled = true; try { await api(`/trades/${t.id}/accept`, {method: "POST"}); } catch (e) { toast(e.message); return renderTrade(box); }
    for (const x of t.get) S.album[akey(x.id, x.t)] -= 1; for (const x of t.give) addCard(x.id, x.t); save(); sfx("card");
    api(`/trades/${t.id}/applied`, {method: "POST"}).catch(() => {}); toast(`🤝 Trade done with ${t.fromName}!`); renderTrade(box); });
}
async function tradeScreen(box, f){
  let theirs = []; try { theirs = (await api("/trades/spares/" + f.id)).spares.filter(x => CARD_BY_ID[x.id]); } catch (e) { toast(e.message); }
  const give = new Set(), get = new Set(), mine = mySpares();
  const draw = () => {
    box.innerHTML = `<div class="thead"><button class="btn" id="tBack">‹ Back</button><b>Trade with ${esc(f.name)}</b></div>
      <div class="tside"><h3>You give <small>${give.size}/5 · your spares</small></h3><div class="tgrid">${mine.map(x => tcard(x, `data-tg="${tkey(x)}"`, give.has(tkey(x)))).join("") || "<p class='tiny'>No spare cards yet. Open packs to get doubles.</p>"}</div></div>
      <div class="tside"><h3>You get <small>${get.size}/5 · ${esc(f.name)}'s spares</small></h3><div class="tgrid">${theirs.map(x => tcard(x, `data-tw="${tkey(x)}"`, get.has(tkey(x)))).join("") || "<p class='tiny'>They have no spare cards yet.</p>"}</div></div>
      <button class="btn green big" id="tSend" ${give.size && get.size ? "" : "disabled"}>${give.size && get.size ? "Send offer" : "Pick at least one card each side"}</button>
      <div class="tchat"><div class="tmsgs" id="tMsgs"><p class="tiny center">Chat with ${esc(f.name)} about the trade</p></div>
        <form id="tChatF" class="fradd"><input id="tChatIn" maxlength="140" placeholder="Message ${esc(f.name)}" autocomplete="off"><button class="btn blue" type="submit">Send</button></form></div>`;
    $("tBack").onclick = () => { tradeWith = null; clearInterval(tradeChatT); renderTrade(box); };
    box.querySelectorAll("[data-tg]").forEach(b => b.onclick = () => { const k = b.dataset.tg; give.has(k) ? give.delete(k) : give.size < 5 && give.add(k); draw(); });
    box.querySelectorAll("[data-tw]").forEach(b => b.onclick = () => { const k = b.dataset.tw; get.has(k) ? get.delete(k) : get.size < 5 && get.add(k); draw(); });
    $("tSend").onclick = async () => { const toItem = k => { const i = k.lastIndexOf("|"); return {id: k.slice(0, i), t: k.slice(i + 1)}; };
      const g = [...give].map(toItem), w = [...get].map(toItem);
      if (g.some(x => (S.album[akey(x.id, x.t)] || 0) < 2)) return toast("You can only offer spare cards");
      try { const r = await api("/trades", {method: "POST", body: {to: f.id, give: g, get: w}});
        S.tradeHold = S.tradeHold || {}; S.tradeHold[r.id] = g; for (const x of g) S.album[akey(x.id, x.t)] -= 1; save(); // held aside until it's settled
        toast(`📨 Offer sent to ${f.name}`); tradeWith = null; clearInterval(tradeChatT); renderTrade(box); } catch (e) { toast(e.message); } };
    $("tChatF").onsubmit = async e => { e.preventDefault(); const text = $("tChatIn").value.trim(); if (!text) return; $("tChatIn").value = "";
      try { await api("/tradechat", {method: "POST", body: {to: f.id, text}}); } catch (err) { toast(err.message); } loadChat(); };
    loadChat();
  };
  const loadChat = async () => { const el = $("tMsgs"); if (!el) return clearInterval(tradeChatT);
    try { const r = await api("/tradechat/" + f.id); if (el !== $("tMsgs")) return;
      if (r.messages.length) el.innerHTML = r.messages.map(m => `<div class="tmsg${m.mine ? " me" : ""}">${esc(m.text)}</div>`).join(""); el.scrollTop = el.scrollHeight; } catch (e) {} };
  clearInterval(tradeChatT); tradeChatT = setInterval(loadChat, 4000);
  draw();
}

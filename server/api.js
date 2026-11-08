// ---------- Footy Fortress online API (runs inside the Cloudflare Pages worker, data in D1) ----------
// Routes live under /api/. Auth: "Authorization: Bearer <session token>".

const now = () => Date.now();
const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {"content-type": "application/json", "cache-control": "no-store"}});
const fail = (msg, status = 400) => json({error: msg}, status);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const randHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));

async function hashPass(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 10000}, key, 256);
  return hex(bits);
}
const sha = async s => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
function safeEqual(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

const NAME_RE = /^[A-Za-z0-9_ .'-]{3,16}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

async function body(req) { try { return await req.json(); } catch (e) { return {}; } }
async function auth(req, env) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  const row = await env.DB.prepare("SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?").bind(await sha(token)).first();
  return row || null;
}
async function newSession(env, userId) {
  const token = randHex(32);
  await env.DB.prepare("INSERT INTO sessions(token,user_id,created) VALUES(?,?,?)").bind(await sha(token), userId, now()).run();
  return token;
}
const profileOut = p => p && ({id: p.user_id, name: p.name, club: p.club, th: p.th, trophies: p.trophies, bot: !!p.bot, squad: p.squad_id, shield: p.shield_until});

export async function handleApi(req, env) {
  if (!env.DB) return fail("Online play isn't set up on this server yet.", 503);
  const url = new URL(req.url), path = url.pathname.replace(/^\/api/, ""), m = req.method;
  try {
    // ----- accounts -----
    if (path === "/signup" && m === "POST") {
      const b = await body(req);
      const email = String(b.email || "").trim().toLowerCase(), name = String(b.name || "").trim(), pass = String(b.password || "");
      if (!EMAIL_RE.test(email)) return fail("That email doesn't look right.");
      if (!NAME_RE.test(name)) return fail("Display name: 3–16 letters, numbers or spaces.");
      if (pass.length < 6) return fail("Password needs at least 6 characters.");
      if (await env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first()) return fail("That email already has an account. Sign in instead.");
      if (await env.DB.prepare("SELECT 1 FROM users WHERE name = ?").bind(name).first()) return fail("That display name is taken.");
      const id = randHex(12), salt = randHex(16), recovery = randHex(4).toUpperCase() + "-" + randHex(4).toUpperCase() + "-" + randHex(4).toUpperCase();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users(id,name,email,pass,salt,recovery,bot,created) VALUES(?,?,?,?,?,?,0,?)").bind(id, name, email, await hashPass(pass, salt), salt, await sha(recovery), now()),
        env.DB.prepare("INSERT INTO profiles(user_id,name,club,th,trophies,last_seen,bot) VALUES(?,?,?,?,?,?,0)").bind(id, name, Number(b.club) || 0, 1, Number(b.trophies) || 0, now()),
      ]);
      return json({token: await newSession(env, id), recovery, user: {id, name, email}});
    }
    if (path === "/login" && m === "POST") {
      const b = await body(req);
      const email = String(b.email || "").trim().toLowerCase();
      const u = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND bot = 0").bind(email).first();
      if (!u || !safeEqual(await hashPass(String(b.password || ""), u.salt), u.pass)) return fail("Email or password is wrong.", 401);
      return json({token: await newSession(env, u.id), user: {id: u.id, name: u.name, email: u.email}});
    }
    if (path === "/recover" && m === "POST") {
      const b = await body(req);
      const u = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND bot = 0").bind(String(b.email || "").trim().toLowerCase()).first();
      const code = String(b.recovery || "").trim().toUpperCase();
      if (!u || !safeEqual(await sha(code), u.recovery)) return fail("That email and recovery code don't match.", 401);
      if (String(b.password || "").length < 6) return fail("New password needs at least 6 characters.");
      const salt = randHex(16);
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET pass = ?, salt = ? WHERE id = ?").bind(await hashPass(String(b.password), salt), salt, u.id),
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(u.id),
      ]);
      return json({token: await newSession(env, u.id), user: {id: u.id, name: u.name, email: u.email}});
    }
    if (path === "/bots" && m === "GET") {
      const r = await env.DB.prepare("SELECT * FROM profiles WHERE bot = 1").all();
      return json({bots: r.results.map(profileOut)});
    }
    if (path === "/leaderboard" && m === "GET") {
      const r = await env.DB.prepare("SELECT p.*, s.name AS squad_name FROM profiles p LEFT JOIN squads s ON s.id = p.squad_id ORDER BY p.trophies DESC LIMIT 100").all();
      return json({players: r.results.map(p => ({...profileOut(p), squadName: p.squad_name}))});
    }

    const me = await auth(req, env);
    if (!me) return fail("Please sign in again.", 401);

    if (path === "/logout" && m === "POST") {
      await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(await sha((req.headers.get("authorization") || "").slice(7))).run();
      return json({ok: true});
    }
    if (path === "/me" && m === "GET") {
      const [save, prof] = await Promise.all([
        env.DB.prepare("SELECT data, updated FROM saves WHERE user_id = ?").bind(me.id).first(),
        env.DB.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(me.id).first(),
      ]);
      await env.DB.prepare("UPDATE profiles SET last_seen = ? WHERE user_id = ?").bind(now(), me.id).run();
      return json({user: me, save: save ? {data: JSON.parse(save.data), updated: save.updated} : null, profile: profileOut(prof)});
    }
    // ----- cloud save + public base -----
    if (path === "/save" && m === "PUT") {
      const b = await body(req);
      const data = JSON.stringify(b.data || null);
      if (data.length > 400000) return fail("Save is too big.");
      const p = b.profile || {}, base = JSON.stringify(p.base || null);
      if (base.length > 120000) return fail("Base is too big.");
      await env.DB.batch([
        env.DB.prepare("INSERT INTO saves(user_id,data,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = excluded.updated").bind(me.id, data, now()),
        env.DB.prepare("UPDATE profiles SET club = ?, th = ?, trophies = ?, base = ?, shield_until = MAX(shield_until, ?), last_seen = ? WHERE user_id = ?")
          .bind(Number(p.club) || 0, Math.max(1, Math.min(8, Number(p.th) || 1)), Math.max(0, Math.min(99999, Number(p.trophies) || 0)), base, Number(p.shield) || 0, now(), me.id),
      ]);
      return json({ok: true, updated: now()});
    }
    // ----- matchmaking: a real player near your trophies, or a bot -----
    if (path === "/match" && m === "GET") {
      const myP = await env.DB.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(me.id).first();
      const ranked = url.searchParams.get("mode") === "ranked";
      const tro = myP ? myP.trophies : 0, th = myP ? myP.th : 1, skip = (url.searchParams.get("skip") || "").split(",").filter(Boolean).slice(0, 20);
      const holes = skip.map(() => "?").join(",") || "''";
      const pick = async (range, real) => (await env.DB.prepare(
        `SELECT * FROM profiles WHERE user_id != ? AND user_id NOT IN (${holes}) AND bot = ? AND shield_until < ? AND base IS NOT NULL
         AND ABS(trophies - ?) <= ? AND ABS(th - ?) <= ${ranked ? 2 : 1} ${real ? "AND last_seen > ?" : ""} ORDER BY RANDOM() LIMIT 1`)
        .bind(me.id, ...skip, real ? 0 : 1, now(), tro, ranked ? range : 99999, th, ...(real ? [now() - 30 * 864e5] : [])).first());
      let opp = null;
      for (const range of [150, 400, 99999]) { opp = await pick(range, true); if (opp) break; }
      if (!opp || Math.random() < 0.35) { for (const range of [200, 600, 99999]) { const b = await pick(range, false); if (b) { opp = b; break; } } }
      if (!opp) return fail("No one to play right now. Try again soon.", 404);
      return json({opponent: {...profileOut(opp), base: JSON.parse(opp.base)}});
    }
    if (path.startsWith("/player/") && m === "GET") {
      const p = await env.DB.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(path.slice(8)).first();
      if (!p) return fail("Player not found.", 404);
      return json({player: {...profileOut(p), base: p.base ? JSON.parse(p.base) : null}});
    }
    // ----- record an attack; the defender sees it in Home Games -----
    if (path === "/attack" && m === "POST") {
      const b = await body(req);
      const def = await env.DB.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(String(b.defender || "")).first();
      if (!def || def.user_id === me.id) return fail("Opponent not found.", 404);
      const friendly = !!b.friendly, stars = Math.max(0, Math.min(3, Number(b.stars) || 0)), pct = Math.max(0, Math.min(100, Number(b.pct) || 0));
      const ranked = !!b.ranked && !friendly;
      const defTro = !ranked ? 0 : stars ? -Math.round(5 + stars * 5) : 8;
      const shield = !friendly && b.magicShield ? now() + 8 * 3600e3 : 0; // Magic Shield: 30%+ of the loot taken
      const data = JSON.stringify({attacker: me.name, ...b, defTro, stars, pct});
      if (data.length > 150000) return fail("Replay is too big.");
      const stmts = [env.DB.prepare("INSERT INTO attacks(attacker_id,defender_id,at,data,seen) VALUES(?,?,?,?,0)").bind(me.id, def.user_id, now(), data)];
      if (!friendly) stmts.push(env.DB.prepare("UPDATE profiles SET trophies = MAX(0, trophies + ?), shield_until = MAX(shield_until, ?) WHERE user_id = ?").bind(defTro, shield, def.user_id));
      if (ranked && Number.isFinite(Number(b.myTrophies))) stmts.push(env.DB.prepare("UPDATE profiles SET trophies = ?, shield_until = 0 WHERE user_id = ?").bind(Math.max(0, Number(b.myTrophies)), me.id));
      await env.DB.batch(stmts);
      return json({ok: true, defTro});
    }
    // ----- friends: add by player name, visit their ground, play a friendly -----
    if (path.startsWith("/friends")) {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS friends(user_id TEXT NOT NULL, friend_id TEXT NOT NULL, created INTEGER, PRIMARY KEY(user_id, friend_id))").run();
      if (path === "/friends" && m === "GET") {
        const r = await env.DB.prepare("SELECT p.* FROM friends f JOIN profiles p ON p.user_id = f.friend_id WHERE f.user_id = ? ORDER BY p.name COLLATE NOCASE").bind(me.id).all();
        return json({friends: r.results.map(p => ({...profileOut(p), online: p.last_seen > now() - 10 * 60e3}))});
      }
      if (path === "/friends" && m === "POST") {
        const b = await body(req), name = String(b.name || "").trim();
        const p = b.id ? await env.DB.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(String(b.id)).first()
                       : await env.DB.prepare("SELECT * FROM profiles WHERE name = ? COLLATE NOCASE AND bot = 0").bind(name).first();
        if (!p) return fail("No player with that name.", 404);
        if (p.user_id === me.id) return fail("That's you!");
        const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM friends WHERE user_id = ?").bind(me.id).first();
        if (c && c.n >= 100) return fail("You can have up to 100 friends.");
        // friends are mutual: you both see each other in your lists
        await env.DB.batch([
          env.DB.prepare("INSERT OR IGNORE INTO friends(user_id,friend_id,created) VALUES(?,?,?)").bind(me.id, p.user_id, now()),
          env.DB.prepare("INSERT OR IGNORE INTO friends(user_id,friend_id,created) VALUES(?,?,?)").bind(p.user_id, me.id, now()),
        ]);
        return json({ok: true, friend: profileOut(p)});
      }
      if (path.startsWith("/friends/") && m === "DELETE") {
        const id = path.slice(9);
        await env.DB.batch([
          env.DB.prepare("DELETE FROM friends WHERE user_id = ? AND friend_id = ?").bind(me.id, id),
          env.DB.prepare("DELETE FROM friends WHERE user_id = ? AND friend_id = ?").bind(id, me.id),
        ]);
        return json({ok: true});
      }
    }
    if (path === "/inbox" && m === "GET") {
      const r = await env.DB.prepare("SELECT a.id, a.attacker_id, a.at, a.data, p.club FROM attacks a LEFT JOIN profiles p ON p.user_id = a.attacker_id WHERE a.defender_id = ? AND a.seen = 0 ORDER BY a.id LIMIT 20").bind(me.id).all();
      return json({attacks: r.results.map(a => ({id: a.id, attackerId: a.attacker_id, at: a.at, club: a.club, ...JSON.parse(a.data)}))});
    }
    if (path === "/inbox/seen" && m === "POST") {
      const ids = ((await body(req)).ids || []).map(Number).filter(Number.isFinite).slice(0, 50);
      if (ids.length) await env.DB.prepare(`UPDATE attacks SET seen = 1 WHERE defender_id = ? AND id IN (${ids.map(() => "?").join(",")})`).bind(me.id, ...ids).run();
      return json({ok: true});
    }
    // ----- cheer squads (clans) + chat -----
    if (path === "/squads" && m === "GET") {
      const q = "%" + (url.searchParams.get("q") || "").slice(0, 20) + "%";
      const r = await env.DB.prepare("SELECT s.*, COUNT(p.user_id) AS members, COALESCE(SUM(p.trophies),0) AS trophies FROM squads s LEFT JOIN profiles p ON p.squad_id = s.id WHERE s.name LIKE ? GROUP BY s.id ORDER BY trophies DESC LIMIT 30").bind(q).all();
      return json({squads: r.results});
    }
    if (path === "/squads" && m === "POST") {
      const b = await body(req), name = String(b.name || "").trim();
      if (!NAME_RE.test(name)) return fail("Squad name: 3–16 letters, numbers or spaces.");
      if (await env.DB.prepare("SELECT 1 FROM squads WHERE name = ?").bind(name).first()) return fail("That squad name is taken.");
      const id = randHex(8);
      await env.DB.batch([
        env.DB.prepare("INSERT INTO squads(id,name,motto,club,open,leader,created) VALUES(?,?,?,?,?,?,?)").bind(id, name, String(b.motto || "").slice(0, 80), Number(b.club) || 0, b.open === false ? 0 : 1, me.id, now()),
        env.DB.prepare("UPDATE profiles SET squad_id = ? WHERE user_id = ?").bind(id, me.id),
        env.DB.prepare("INSERT INTO messages(squad_id,user_id,name,text,at) VALUES(?,?,?,?,?)").bind(id, "", "", `${me.name} started the squad`, now()),
      ]);
      return json({ok: true, id});
    }
    if (path.match(/^\/squads\/[0-9a-f]+\/join$/) && m === "POST") {
      const id = path.split("/")[2];
      const s = await env.DB.prepare("SELECT s.*, (SELECT COUNT(*) FROM profiles WHERE squad_id = s.id) AS members FROM squads s WHERE id = ?").bind(id).first();
      if (!s) return fail("Squad not found.", 404);
      if (!s.open) return fail("That squad is invite-only.");
      if (s.members >= 30) return fail("That squad is full (30).");
      await env.DB.batch([
        env.DB.prepare("UPDATE profiles SET squad_id = ? WHERE user_id = ?").bind(id, me.id),
        env.DB.prepare("INSERT INTO messages(squad_id,user_id,name,text,at) VALUES(?,?,?,?,?)").bind(id, "", "", `${me.name} joined`, now()),
      ]);
      return json({ok: true});
    }
    if (path === "/squad/leave" && m === "POST") {
      const p = await env.DB.prepare("SELECT squad_id FROM profiles WHERE user_id = ?").bind(me.id).first();
      if (p && p.squad_id) await env.DB.batch([
        env.DB.prepare("UPDATE profiles SET squad_id = NULL WHERE user_id = ?").bind(me.id),
        env.DB.prepare("INSERT INTO messages(squad_id,user_id,name,text,at) VALUES(?,?,?,?,?)").bind(p.squad_id, "", "", `${me.name} left`, now()),
      ]);
      return json({ok: true});
    }
    if (path === "/squad" && m === "GET") {
      const p = await env.DB.prepare("SELECT squad_id FROM profiles WHERE user_id = ?").bind(me.id).first();
      if (!p || !p.squad_id) return json({squad: null});
      const after = Number(url.searchParams.get("after")) || 0;
      const [s, members, msgs] = await Promise.all([
        env.DB.prepare("SELECT * FROM squads WHERE id = ?").bind(p.squad_id).first(),
        env.DB.prepare("SELECT * FROM profiles WHERE squad_id = ? ORDER BY trophies DESC").bind(p.squad_id).all(),
        env.DB.prepare("SELECT * FROM messages WHERE squad_id = ? AND id > ? ORDER BY id DESC LIMIT 60").bind(p.squad_id, after).all(),
      ]);
      return json({squad: s, members: members.results.map(profileOut), messages: msgs.results.reverse()});
    }
    if (path === "/squad/chat" && m === "POST") {
      const text = String((await body(req)).text || "").trim().slice(0, 200);
      if (!text) return fail("Say something!");
      const p = await env.DB.prepare("SELECT squad_id FROM profiles WHERE user_id = ?").bind(me.id).first();
      if (!p || !p.squad_id) return fail("Join a squad first.");
      const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE user_id = ? AND at > ?").bind(me.id, now() - 10000).first();
      if (recent.n >= 5) return fail("Slow down a bit!", 429);
      await env.DB.prepare("INSERT INTO messages(squad_id,user_id,name,text,at) VALUES(?,?,?,?,?)").bind(p.squad_id, me.id, me.name, text, now()).run();
      return json({ok: true});
    }
    return fail("Not found.", 404);
  } catch (e) {
    return fail("Server hiccup: " + (e && e.message || e), 500);
  }
}

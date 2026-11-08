# Footy Fortress

A Clash of Clans–style base builder with all 18 AFL clubs, by Backyard Legends. Play at **https://ff.backyardlegendsgames.app** (also https://footy-fortress.pages.dev). It's built for phones (played upright); tablets and computers play sideways. Progress saves on the device, and to the cloud once you sign in.

Unofficial fan game, not affiliated with the AFL, its clubs or Supercell.

## Install it like an app
The first visit explains how: one tap on Android, or Share → Add to Home Screen on iPhone. Settings has **Install** and **Check for updates**. Once installed it works offline.

## How it plays (the same loop as Clash)
- **Home screen**
  - **Battle** (bottom left) has four tabs:
    - Play: Battle for loot, the weekly Ranked league, the Season ladder, Star Bonus
    - Army: players, spells and heroes
    - Recipes: saved armies
    - Log: defences, replays and Revenge
  - **Build** (bottom right) has four tabs:
    - Buildings
    - Heroes and hero gear
    - Research (Coaches Box)
    - Shop
  - Tap your **club badge** for Profile, Achievements and Settings, and **👷** for the Groundskeepers menu.
  - The side buttons are Cards, Pass, Events and Online.
  - In any sub-screen, ✖ steps back to where you came from.
- **Economy**
  - Costs, build times, collector rates and storage sizes follow Clash's level tables.
  - 🥧 pies are Clash's gold, 💧 sports drink is its elixir, and 🏅 Brownlow votes are its gems (earned in the game).
  - Speed-ups and resource top-ups use Clash's gem prices.
- **Heroes**
  - Each club's captain and the Head Coach.
  - From the Hero Hall: a Vice-Captain, Star Forward and Ruck Legend, who are real players picked from their 2026 stats.
  - Take up to 4 heroes into each match. Kit Room gear is upgraded with ores.
- **Matches are scored like footy.** Every building knocked down is a goal, and the home side scores behinds for buildings still standing and players knocked out. You earn 1–3 stars like Clash.
- **Ranked**
  - A weekly league of 30 clubs, from Auskick up to Hall of Fame.
  - Attacks per week are limited, and you can't lose trophies during the week.
  - The top 40% move up and the bottom 10% move down.
  - Ranked matches also count on the 17-round Season ladder, with top-8 finals.
- **Cards**
  - 198 real 2026 players, 11 per club, with ratings from real stats.
  - Rarities: Common, Rare, Epic and Legendary, plus specials and 24K Gold.
  - Packs come from Footy Tokens (won in matches and from the daily bonus), and you tear them open with a finger swipe.
  - The binder album shows a NEW tag and a red dot on clubs with new cards.
- **Daily reasons to come back**
  - collectors filling up
  - groundskeepers glowing when one's idle
  - Star Bonus, Footy Pass tiers and daily challenges
  - weekday events
  - the Lost Kit Bag (Clash's Gem Box) about once a week
  - obstacles to clear
- **Online (free)**
  - Sign in with email and password.
  - Battle real players or the 24 bot clubs.
  - Real attacks on your ground arrive with replays.
  - **Friends** can visit your ground or attack it for ⅛ of the loot (¼ once there's 300,000+ on offer). 10 attacks from the same friend in an hour gives a 2-hour loot shield from them.
  - **Cheer Squads** (clans) have chat, shown with a red dot on Online.

## Files
- **Game data** (edit names and numbers here): `js/data.js` holds clubs, heroes, buildings (Clash tables), units, spells and tasks. `js/cardset.js` has every 2026 player with stats.
- **Home and matches:** `js/game.js` (home base, saves, timers), `js/battle.js` (match engine), `js/season.js` (ladder and finals), `js/raid.js` (AI raids).
- **Menus:** `js/ui.js` (HUD, Army, Build lists, controls), `js/hubs.js` (Battle and Build menus, Groundskeepers, Profile, Ranked, Recipes, Pass, Events, rotation), `js/cards.js` (cards and album), `js/gear.js` (hero gear), `js/tutorial.js` (tutorial).
- **Drawing:** `js/render.js` (drawing and fences), `js/stadium.js` (the stadium and crowd), `js/art.js` (loads the painted art).
- **Look:** bright Clash-style "colour pop": cream/gold panels, blue tabs, an orange Battle button and a gold Build button. Codex's painted icons sit on top (`art/ui`). Settings → Look switches between **Light** (the default colour pop) and **Dark** (Codex's dark "Scoreboard" style and button tiles). The choice is saved on each device.
- **Art:** `art/sheets.js` is the original embedded art. Codex's painted art is in `art/units`, `heroes`, `portraits`, `players`, `cards`, `packs`, `buildings`, `scenery`, `stadium` and `ui`, all listed in `art/manifest.json` (anything missing falls back to the original art).
- **Online:** `js/net.js` (accounts, cloud saves, online matches, friends, squads) and `server/api.js` (the server, on Cloudflare D1 as `DB`).
- **Publishing:** `deploy.sh` publishes to Cloudflare Pages. `CF_BRANCH=name ./deploy.sh` makes a preview instead.

## Art handoffs
- `CODEX_HANDOFF.md`: section 0 is the to-do list (189 card portraits, 71 hero sets, optional fence set).
- `CODEX_UI_HANDOFF.md`: menu and button art.
- `CARD_ART_BRIEF.md`: the numbered 198-card checklist.
- `docs/card-style-reference.png`: the style reference picture.

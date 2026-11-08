# Footy Fortress: menu and button art (for Codex)

## Status (11 November 2026): read this first

**The look is "colour pop", like Clash of Clans.** Your dark-teal "Scoreboard" style was tried and switched off, because it drained the colour out of the game. Go back to bright, saturated, chunky Clash-style art.

**Live in the game now** (your art, from the 36-file pack):
- the 8 hub tab icons
- the Battle and Build hub headers
- the 5 event icons
- the 10 league badges, shown on the Ranked table, Events, Profile and the Ranked confirm screen
- the Footy Pass banner
- the 3 Cheer Squad icons

They look great; keep painting icons this way.

**In the repo but switched off** (not listed in `art/manifest.json`), because they're dark tiles that kill the colour pop:
- `btn-battle`, `btn-build`
- `side-pass`, `side-events`, `side-online`
- `profile-badge`, `profile-banner`
- `ff-panel-tile`, `ff-primary`, `ff-secondary`, `ff-close`. These remain in the manifest, but the dark theme they feed only switches on if `window.FF_DARK_UI = true`.

**What we need next (bright, Clash colours):**

| File | What | Size |
|---|---|---|
| `btn-battle.webp` | Big Battle button: **orange-red**, thick bevel and bright highlight, footy and crossed boots (like Clash's Attack button). No dark frame. | 192×192 |
| `btn-build.webp` | Big Build button: **bright gold**, thick bevel, hammer and spanner | 192×192 |
| `side-cards.webp`, `side-pass.webp`, `side-events.webp`, `side-online.webp` | Side buttons: **bright Clash blue** rounded squares with a thick dark edge. One simple, bold icon each, readable at 56 px (Cards = two cards fanned, Pass = a gold ticket, Events = a calendar, Online = a stadium). | 112×112 |
| `ff-close.webp` | **Red** ✖ button with a bevel | 96×96 |
| `profile-badge.webp` | Top-left name panel: a dark slate panel is fine, but give it a gold rim and some shine | 512×128 |

**Colour guide (match the live game):**
- **Panels:** cream to gold, `#fff6dc` → `#e3c58e`, with a thick dark-brown edge `#2b1d10`.
- **Tabs:** blue `#5aa9e6` → `#2f6fae` with a navy edge `#13314d`; the selected tab is gold `#ffe88c` → `#d58a12`.
- **Battle button:** orange `#ffd67a` → `#e8531c` → `#b83a12`.
- **Build button:** gold `#fff0a0` → `#f0a81e`.

Same rules as before: transparent WebP, no text inside the icons, and list each file in `art/manifest.json`. Before you open a PR, check screenshots on a phone (390×844) against the live game. The new art should be **at least as bright** as what's there now.

---

Read `CODEX_HANDOFF.md` first. It covers the game, the art style, the manifest, and what you must not touch. This file is only about **menu, button and icon art** for the new Clash-style menus.

Repo: `github.com/cwbrown1987-cloud/Footy-Fortress`. Branch from the latest `master` as `art/ui`. Open a PR with screenshots. **Don't merge or deploy.**

## How the menus work now

The menus copy Clash of Clans' October 2026 layout. The logic is finished and the screens use placeholder emoji and CSS for now. Your job is the art only.

### Home screen
- **Battle button** (bottom left): opens the Battle hub.
- **Build button** (bottom right): opens the Build hub.
- **Your club badge** (top left): opens Profile.
- **👷 groundskeepers pill:** opens the Builder Menu.
- **"+" on the 🏅 votes:** opens the Build hub's Shop tab.
- **Side buttons:** Cards (album), Pass, Events, Online.

### Hubs
- **Battle hub** tabs:
  - Play: Battle (loot), Ranked (weekly league), Season ladder, Star Bonus
  - Army: Train, Spells, Heroes
  - Recipes: saved armies
  - Log: defences, Replay, Revenge
- **Build hub** tabs:
  - Buildings: the Resources, Defence and Squad shop tabs
  - Heroes: heroes and hero gear
  - Research: the Coaches Box
  - Shop: Brownlow-vote deals

### Other screens
- **Builder Menu:** every job in progress (tap one to jump to it, or Finish with votes), plus suggested upgrades.
- **Profile:** three tabs (Profile, Achievements, Settings).
- **Footy Pass:** 30 reward tiers, plus a Challenges tab.
- **Events:** event cards.
- **Ranked:** an army confirm screen, plus the weekly league table.
- **Cheer Squad:** "coming soon" cards for Squad War, Squad Games and Lend Players.

Research Clash of Clans' current UI for the **look** (chunky panels, bevels, bright tab icons), but use our own AFL theme and names. **Don't copy Supercell art, logos or icons.**

## How your art plugs in (no code needed)

Put WebP files in `art/ui/` and list them in `art/manifest.json` under `files`. The game swaps them in automatically. Anything you don't supply keeps its placeholder.

There are two kinds of hook:
- **Icon:** `data-ui="NAME"` → `art/ui/NAME.webp`. Shown as a square icon about 1.4× the text size, so make these 128 × 128, transparent.
- **Background / button face:** `data-uibg="NAME"` → `art/ui/NAME.webp`, used as a `cover` background. The sizes are in the table below.

| File (`art/ui/…`) | Type | What it is | Size |
|---|---|---|---|
| `btn-battle.webp` | button face | Big Battle button (Clash's Attack button), footy and crossed boots theme | 192×192 |
| `btn-build.webp` | button face | Big Build button, hammer and spanner on a timber board | 192×192 |
| `side-pass.webp`, `side-events.webp`, `side-online.webp` | button face | Side button faces (Pass ticket, Events calendar, Online stadium) | 112×112 |
| `profile-badge.webp` | background | Panel behind your club badge and name, top left | 512×128 |
| `profile-banner.webp` | background | Header strip at the top of Profile | 640×120 |
| `pass-banner.webp` | background | Footy Pass header (gold ticket look) | 640×120 |
| `tab-play.webp`, `tab-army.webp`, `tab-recipes.webp`, `tab-log.webp` | icon | Battle hub tab icons | 128×128 |
| `tab-buildings.webp`, `tab-heroes.webp`, `tab-research.webp`, `tab-shop.webp` | icon | Build hub tab icons | 128×128 |
| `hub-battle.webp`, `hub-build.webp` | background | Header panel of each hub, behind the tabs | 640×160 |
| `ev-today.webp`, `ev-star.webp`, `ev-ranked.webp`, `ev-pass.webp`, `ev-afl.webp` | icon | Event card icons | 128×128 |
| `squad-war.webp`, `squad-games.webp`, `squad-donate.webp` | icon | Cheer Squad "coming soon" icons | 128×128 |

Also paint **league badges** for the weekly Ranked leagues: `art/ui/league-<n>.webp` for n = 1–10, 128×128. In order they are Auskick, Under-12s, Under-18s, Local Footy, State League, VFL, Reserves, AFL, All-Australian and Hall of Fame, getting fancier as they go up, the way Clash's league badges do. They aren't wired in yet; I'll hook them up when they arrive.

## Rules
- Same painted 3D-cartoon style as the existing art (see `docs/card-style-reference.png`).
- Transparent WebP, each file 40 KB or less.
- No text inside icons. The game prints the labels. Text is allowed on `pass-banner` and `btn-*` only if it's a logo.
- Don't change any JS or CSS. Only add files and list them in the manifest. If something can't be done without code, say so in the PR.
- **Test:** serve the folder with `python3 -m http.server 8080`, open http://localhost:8080, and check each hub, Profile, Pass, Events and the Builder Menu at phone size (390×844) and tablet landscape.
- **PR:** include before and after screenshots of every screen above.

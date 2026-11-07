# Footy Fortress: complete art handoff for Codex

You're new to this project, so this file tells you everything: what the game is, how it works, where things are, exactly what art to make and how to plug it in, and what **not** to touch. Read it all before you start.

The owner has also attached a picture: the **style reference**, saved in the repo as `docs/card-style-reference.png`. It's the look we want. Section 4 explains how to read it.

---

## 1. What the game is

**Footy Fortress** is a mobile web game: a Clash of Clans–style base builder themed on Australian Rules football (the AFL).

- All 18 real AFL clubs, with real club colours, players and 2026 stats.
- Personal and private project. Real club names, colours and guernseys are approved by the owner.
- Studio name: "Backyard Legends".
- Live at https://ff.backyardlegendsgames.app (also https://footy-fortress.pages.dev).
- It's an installable PWA: plain HTML/CSS/JavaScript drawn on a `<canvas>`. No framework and no build step.

**The game loop works like Clash of Clans:**
- You pick a club and build your home ground on an isometric map.
- Collectors make two resources, 🥧 pies (Clash's gold) and 💧 drink (Clash's elixir). Brownlow votes 🏅 are the gem currency.
- Groundskeepers (Clash's builders) construct and upgrade buildings on timers.
- You train players (Clash's troops) and attack other clubs' grounds. Knocking buildings down scores goals, and you win 1 to 3 stars and loot.
- Heroes are real AFL players:
  - each club's **captain**
  - the **Head Coach**
  - three Hero Hall heroes per club: **Vice-Captain**, **Star Forward** and **Ruck Legend**
- There's a **Footy Card album** to collect: 198 real-player cards, opened from packs. Cards are for collecting only and don't change gameplay.

**Names used in the code, with their Clash equivalents:**

| Internal name | In-game name | Clash equivalent |
|---|---|---|
| `rover` | Rover | Barbarian (basic melee) |
| `forward` | Full-Forward | Archer (kicks from range) |
| `ruck` | Ruckman | Giant (big and tough) |
| `tagger` | Crumber | Goblin (fast, goes for collectors) |
| `shepherd` | Shepherd | Wall Breaker (blocker, smashes fences) |
| `trainer` | Trainer | Healer (runs around with water bottles) |
| `seagulls` | Seagulls | Minions (flying flock) |
| `blimp` | Blimp | Balloon (flying, drops footies) |
| `coach` | Head Coach | Grand Warden-like hero (suit, cap, clipboard) |
| `captain` | the club captain | Barbarian King-like hero |
| `vice` / `star` / `rleg` | Vice-Captain / Star Forward / Ruck Legend | extra heroes |

---

## 2. Your job

Make the **art**, save it as **separate WebP files**, list them in a **manifest**, and wire them in through the **rendering code only**. Then open a PR.

### Make these
1. **Animated sprites for every on-field character** (section 5A).
2. **Hero sprites:** 18 captains, the Head Coach and 54 Hero Hall heroes (section 5B).
3. **Two new buildings:** Kit Room and Hero Hall (section 5C).
4. **Footy cards:** 198 player portraits, rarity frames, special frames, card back and two packs (section 5D).

### Do NOT touch
- **Other buildings.** The Clubhouse, Pie Shop, Drink Tap, Pie Warmer, Esky, Training Oval, Interchange Bench, Physio Room, Coaches Box, Captain's Locker, Coach's Office, Groundskeeper Shed, Goal Tower, Siren Cannon, Kick-Out Catapult, Floodlight Tower, Sprinkler and Fences already have finished art. Leave them exactly as they are.
- **The world.** The stadium, crowd, grass, trees, rocks, bushes, stumps and obstacles.
- **The interface.** The HUD, buttons, icons, menus, fonts, the binder/album layout (it's built in HTML/CSS) and the card layout (the game draws the text, rating, badges and stat bars itself; see 5D).
- **Gameplay.** Numbers, rules, timers, costs, balance and the battle simulation. Don't edit `js/data.js`, `js/game.js`, `js/battle.js` (except the one drawing line in section 7), `js/raid.js`, `js/season.js`, `js/net.js` or `server/`.
- **Saves.** Don't touch save data (`localStorage` key `footyFortress2`). Existing players' saves must still load.
- **`art/sheets.js`.** Don't add to it. It's the current art embedded as base64; it stays as the fallback.
- **The Supercell look-alike.** Don't use any Supercell or Clash of Clans artwork, logos or characters, and don't copy their HUD. We want the same *kind* of look, not their assets.
- **Star cards.** Don't add "star player" cards, spells or card abilities. Cards don't affect stats.
- **Deploying and merging.** Don't deploy and don't merge. The owner previews your PR and Claude deploys.

### If you can't generate the images
If you can't produce **painted raster images** in the reference style, **stop and say so** in your reply. Don't substitute code-drawn vector shapes, placeholder boxes, or stock or AI images in a different style.

---

## 3. Where everything is

```
index.html            page shell; loads the scripts in order
style.css             all UI styles (album/binder styles are at the bottom: .fcc, .binder, .statpanel, .tearwrap)
sw.js                 service worker. Bump CACHE when you change files.
js/data.js            clubs (colours, captain), units, heroes, buildings. READ ONLY for you.
js/render.js          isometric drawing helpers, the drawPlayer() fallback, drawBadge()
js/art.js             ART LOADER and art drawing. This is where you wire sprites in.
                      loadArtSheet, drawPlayerArt, drawBuildingArt, clubKit (club recolour), portraitKit, namedHeroArt
js/cards.js           card album. Already loads card art from the manifest (see 5D); no changes needed unless noted.
js/cardset.js         every 2026 AFL player with real stats (data)
js/battle.js          match engine. Only drawUnitB() is visual.
art/sheets.js         current art as base64 sprite sheets (fallback; don't edit)
docs/card-style-reference.png   the style reference picture
CARD_ART_BRIEF.md     contains the numbered 198-card CHECKLIST (use its list; this file overrides its other instructions)
deploy.sh             Claude's deploy script. Don't run it.
```

**Club codes and colours** (`a` = main colour, `b` = second colour, `c` = third):

| Code | Club | a | b | c | Captain |
|---|---|---|---|---|---|
| adel | Adelaide Crows | #002b5c | #e21937 | #ffd200 | Jordan Dawson |
| bris | Brisbane Lions | #7a0a3c | #fdbe57 | #0055a3 | Lachie Neale |
| carl | Carlton Blues | #0e1e2d | #ffffff | #9aa8b8 | Patrick Cripps |
| coll | Collingwood Magpies | #111111 | #ffffff | #888888 | Nick Daicos |
| ess | Essendon Bombers | #111111 | #cc2031 | #e8e8e8 | Nic Martin |
| freo | Fremantle Dockers | #2a0d54 | #ffffff | #9b8bc4 | Caleb Serong |
| geel | Geelong Cats | #001f3d | #ffffff | #5f87b8 | Jeremy Cameron |
| gcs | Gold Coast Suns | #e02112 | #ffe600 | #0b4ea2 | Matt Rowell |
| gws | GWS Giants | #f15c22 | #4a4f55 | #ffffff | Tom Green |
| haw | Hawthorn Hawks | #4d2004 | #fbbf15 | #ffffff | James Sicily |
| melb | Melbourne Demons | #0f1131 | #cc2031 | #ffffff | Max Gawn |
| nmfc | North Melbourne | #013b9f | #ffffff | #7fa6e8 | Harry Sheezel |
| port | Port Adelaide Power | #111111 | #008aab | #ffffff | Connor Rozee |
| rich | Richmond Tigers | #111111 | #fed102 | #ffffff | Tim Taranto |
| stk | St Kilda Saints | #ed0f05 | #111111 | #ffffff | Nasiah Wanganeen-Milera |
| syd | Sydney Swans | #ed171f | #ffffff | #999999 | Isaac Heeney |
| wce | West Coast Eagles | #002b79 | #f2a900 | #ffffff | Harley Reid |
| wb | Western Bulldogs | #014896 | #e21937 | #ffffff | Marcus Bontempelli |

Use each club's **real 2026 home guernsey design** (stripes, sashes, yokes, chevrons), not just flat colours.

---

## 4. The style: match the reference picture exactly

Study `docs/card-style-reference.png` (the attached picture). That is the target look for **every** character and card.

**Characters:**
- Chunky, heroic **3D-cartoon painted** style, like a premium mobile strategy game. Think stylised 3D renders with painterly finish, not flat vector and not anime.
- Proportions: big broad shoulders and chest, thick arms, large hands, slightly oversized head, strong jaw. About 3–3.5 heads tall. Confident, determined expressions.
- Soft studio lighting from the top-left, a warm rim light on the edges, rich saturated colour and smooth shading. Clean dark outline on the silhouette (not heavy black lines everywhere).
- Real AFL guernseys (sleeveless, club design), shorts, long socks and boots. The red Sherrin-style footy is often tucked under an arm.
- Hair and faces vary: different hairstyles, beards, skin tones and headgear (helmet or headband for some).
- Real named players (captains, heroes and card players) should be a **recognisable friendly likeness** (hair colour and style, beard, build) in the same cartoon style, and flattering.

**Cards (as in the picture):**
- A thick, glowing, metallic frame in the rarity colour, with a bevel and an outer glow.
- The background inside is the club's colour with a radial burst of light rays behind the player.
- The player is shown waist-up to mid-thigh, leaning in, holding the ball, filling the card width.
- Rating box top-right, small rarity tag under it, club badge lower-left, dark name plate along the bottom with a position strip under it. **The game draws all of these on top of your art**, so leave those areas clear of important detail (zones in 5D).

**Ignore these in the picture:**
- the Clash HUD (gems, gold, elixir, the builder face, the shield)
- the AFL logo in the banner
- the player data shown: some clubs and positions are wrong, e.g. Tom Stewart and Jeremy Cameron play for Geelong, Connor Rozee plays for Port Adelaide, and Isaac Heeney is a forward
- the "Trade" button (not built yet)

Take the style from the picture, and the facts from this file and `CARD_ART_BRIEF.md`.

---

## 5. Deliverables (exact specs)

All files are **WebP with alpha**, sRGB, with no text baked in unless stated. Keep files small (sizes below); the whole delivery should be **under 25 MB**.

### 5A. Animated field units: `art/units/`

**Recolouring:** one shared body per unit type, recoloured per club by the game. Paint every guernsey in **solid navy (#1b2a6b) with white (#ffffff) trim**, and shorts navy too. Avoid navy or near-white anywhere else on the figure (skin, hair, boots, ball, bottles). The recolour code (`clubKit` in `js/art.js`) swaps navy to the club's main colour and white to its second colour, only in the **middle band of each frame** (about 29%–63% of the frame height, where the guernsey is). So keep the guernsey in that band and centre the figure.

**Variations:** 4 looks per person unit, `a`, `b`, `c` and `d`, with different hair, skin tone, beard and headgear, so a team doesn't look like clones. Same body and the same animation timing.

**Sheet layout:** one sheet per unit and variant, `art/units/<unit>-<variant>.webp`, e.g. `art/units/rover-a.webp`.
- Cells are **128 × 128 px**, the figure's feet at the bottom-centre of the cell (4 px margin), transparent background.
- Draw everything **facing right**. The game mirrors for left.
- 8 columns, with these rows top to bottom:
  1. `run-front`: 8 frames, running toward the camera at a ¾ angle, facing right
  2. `run-back`: 8 frames, running away from the camera at a ¾ angle, facing right
  3. `attack-front`: 6 frames (the rest of the row empty)
  4. `attack-back`: 6 frames
  5. `idle`: 4 frames (subtle breathing or bounce)
  6. `ko`: 4 frames (knocked down, last frame lying flat)
- About 25–60 KB per sheet.

**Units and variants:**

| Unit | Variants | Attack |
|---|---|---|
| `rover` | a b c d | shoulder bump / tackle |
| `forward` | a b c d | drop-punt kick; the ball leaves the foot on frame 4 |
| `ruck` | a b c d | big, very tall; leaping fist punch |
| `tagger` | a b c d | small and wiry; quick grab or tackle |
| `shepherd` | a b c d | broad blocker; hip-and-shoulder smash |
| `trainer` | a b | fluoro high-vis vest, carries water bottles; the attack is a squirt (heal). **Not recoloured**, so the vest stays fluoro yellow/green. |

Flying units, not recoloured, same 128 px cells:
- `art/units/seagulls.webp`: a flock of 3–4 cartoon seagulls; row 1 is a 6-frame flap cycle, row 2 a 4-frame swoop/peck.
- `art/units/blimp.webp`: a small cartoon blimp with a footy pattern and an empty club-coloured band; row 1 is a 4-frame float, row 2 a 4-frame drop (the hatch opens and a footy falls).

### 5B. Heroes: `art/heroes/`

Heroes are **not recoloured**. Paint each one in their real club guernsey. Use the same cell size and facing, with a simpler sheet of 8 columns:
1. `run`: 8 frames (¾ front)
2. `attack`: 6 frames
3. `idle`: 4 frames
4. `ko`: 4 frames

About 30–60 KB each. Draw heroes about 1.15× the size of normal units inside the cell, so they look bigger.

| File | Who |
|---|---|
| `art/heroes/captain-<club>.webp` ×18 | the club captain (table in section 3) |
| `art/heroes/coach.webp` ×1 | Head Coach: navy club jacket, cap, clipboard; points and yells. Not recoloured; a neutral navy jacket is fine. |
| `art/heroes/vice-<club>.webp` ×18 | Vice-Captain (names below) |
| `art/heroes/star-<club>.webp` ×18 | Star Forward (names below); the attack is a big kick |
| `art/heroes/rleg-<club>.webp` ×18 | Ruck Legend (names below); a tall ruckman, the attack is a fist punch |

Also one **portrait** per hero: `art/portraits/<key>-<club>.webp`, plus `art/portraits/coach.webp`. Make them **256 × 256**, head and shoulders, transparent, same pose language as the cards. These are used for menu icons.

| Club | Vice-Captain | Star Forward | Ruck Legend |
|---|---|---|---|
| adel | Sam Berry | Josh Rachele | Lachlan McAndrew |
| bris | Will Ashcroft | Logan Morris | Sam Draper |
| carl | Sam Walsh | Brodie Kemp | Marc Pittonet |
| coll | Josh Daicos | Daniel McStay | Darcy Cameron |
| ess | Zach Merrett | Nate Caddy | Nick Bryan |
| freo | Andrew Brayshaw | Jye Amiss | Luke Jackson |
| geel | Bailey Smith | Shannon Neale | Mitchell Edwards |
| gcs | Noah Anderson | Ben King | Ned Moyle |
| gws | Clayton Oliver | Jake Stringer | Kieren Briggs |
| haw | Jai Newcombe | Jack Gunston | Lloyd Meek |
| melb | Jack Steele | Jacob van Rooyen | Max Heath |
| nmfc | Caleb Daniel | Nick Larkey | Tristan Xerri |
| port | Zak Butters | Mitch Georgiades | Jordon Sweet |
| rich | Jayden Short | Mykelti Lefau | Toby Nankervis |
| stk | Bradley Hill | Liam Ryan | Tom De Koning |
| syd | Nick Blakey | Charlie Curnow | Brodie Grundy |
| wce | Tim Kelly | Jake Waterman | Bailey Williams |
| wb | Ed Richards | Aaron Naughton | Tim English |

### 5C. Two new buildings: `art/buildings/`

Match the **existing building art exactly**: same isometric angle (2:1 diamond footprint), lighting, chunky painted style and scale. Look at the Clubhouse and Captain's Locker in the running game. Both buildings are 3×3 tiles.

- `kitroom-1.webp` … `kitroom-5.webp`: **Kit Room** (the hero-gear forge, like Clash's Blacksmith). A clubroom workshop with boot racks, guernseys on hangers, a workbench with tools and a sewing machine, and a club-colour awning. Each level gets a bit grander.
- `herohall-1.webp` … `herohall-3.webp`: **Hero Hall**. A grand hall-of-fame clubhouse with columns, a gold trim roof and three empty plinths across the front lawn (the game stands the hero figures on them).
- Paint the club-colour parts (awning, banners, roof band) **navy #1b2a6b with white trim** so they can be recoloured.
- Size: **512 × 512** canvas, transparent. The building's ground diamond fills the full width, with its bottom point 20 px above the bottom edge. About 60–120 KB each.

### 5D. Footy cards, packs: `art/players/`, `art/cards/`, `art/packs/`

The game already draws each card in `cardFace()` (`js/cards.js`) and already looks for these exact files once they're in the manifest:

| File | Used as |
|---|---|
| `art/players/<NNN>.webp` | portrait for card number NNN (001–198, three digits) |
| `art/cards/frame-common.webp` | Common frame (silver / grey steel) |
| `art/cards/frame-rare.webp` | Rare frame (blue) |
| `art/cards/frame-epic.webp` | Epic frame (red) |
| `art/cards/frame-legendary.webp` | Legendary frame (gold, with sparkles) |
| `art/cards/frame-star-wildcard.webp`, `frame-best-fairest.webp`, `frame-goal-kicker.webp`, `frame-future-legend.webp` | special frames |
| `art/cards/frame-24k-gold.webp` | 24K Gold frame: solid polished gold, the rarest |
| `art/packs/footy.webp`, `art/packs/prize.webp` | packs |

**Portraits (198):**
- The full list with numbers, names, clubs and positions is the **checklist in `CARD_ART_BRIEF.md`** (001 Ben Keays … 198).
- **512 × 640 px**, transparent background.
- The player from waist/mid-thigh up, facing the viewer at a slight angle, leaning in with the ball, chunky style exactly like the reference cards. In their club's real 2026 home guernsey, with a recognisable friendly likeness.
- The figure fills the width; the head top about 8% below the top edge.
- No background, no frame, no text (the game paints the club burst behind and the frame over it).
- About 20–35 KB each.
- The 18 captains are in the list too. Keep their faces consistent with their hero sprites.

**Frames:**
- **480 × 672 px** (5:7). The window inside must be **fully transparent**: x 34–446, y 34–638 (the game paints the background and portrait there, then puts your frame on top).
- Thick metallic bevelled border with an outer glow, like the reference, plus small corner ornaments. **No text.**
- The game draws over these zones, so keep them plain:
  - top-left circle at (80, 84) r 40: club badge
  - top-right box x 324–460, y 40–170: rating + rarity tag
  - bottom band y 490–640: name plate + position strip
  - lower-left circle at (100, 464) r 55: big club badge
  - specials only: banner y 180–232, centred
- About 40–80 KB each.

**Card back:** `art/cards/back.webp`, 480 × 672. A footy-themed card back: a navy and gold pattern with a "FOOTY FORTRESS" wordmark and a footy. This one is the only file where text is allowed.

**Packs:**
- **480 × 640** (3:4), a foil wrapper with crimped top and bottom edges. The **top crimp sits in the top 12%**; that's where the player slides a finger to tear it open.
- Must say "FOOTY FORTRESS"; text is allowed on packs.
- `footy.webp`: silver/blue foil, with "FOOTY PACK · 7 PLAYER CARDS".
- `prize.webp`: gold foil, with "PRIZE PACK".
- About 60–120 KB each.

**Not needed:** binder or album art. The binder in the game is built in CSS to match the reference.

---

## 6. The manifest: `art/manifest.json`

List every file you add. `js/cards.js` already reads this file and only loads files listed in it. Your loader in `js/art.js` should read it too.

```json
{
  "version": 1,
  "files": [
    "art/units/rover-a.webp",
    "art/heroes/captain-coll.webp",
    "art/players/001.webp",
    "art/cards/frame-common.webp",
    "art/packs/footy.webp"
  ],
  "sheets": {
    "art/units/rover-a.webp": {"cell": 128, "cols": 8, "rows": ["run-front","run-back","attack-front","attack-back","idle","ko"], "frames": [8,8,6,6,4,4]},
    "art/heroes/captain-coll.webp": {"cell": 128, "cols": 8, "rows": ["run","attack","idle","ko"], "frames": [8,6,4,4]}
  }
}
```

Paths are relative to the site root, with no leading slash.

---

## 7. Wiring it in (code changes allowed only here)

The current art keeps working as the fallback: if a new file is missing or fails to load, the old art shows. Make all of your code changes in **`js/art.js`**, plus the one drawing line in `js/battle.js` described below.

1. **Loader.** On start, fetch `art/manifest.json`. If it's there, load each sheet and cut its frames into `artSprites`, using names like `rover-a-run-front-3`, `captain-coll-attack-2` or `kitroom-4`.
   - `artSprites` is the Map that `loadArtSheet` fills. Reuse its trimming logic.
   - Keep the existing names working.
   - When the art finishes loading, clear `iconCache`, the same way `loadArtSheet` does.
2. **Players.** `drawPlayerArt(x, y, k, club, opts)` draws every person.
   - `opts` already has:
     - `kind` (unit name) and `moving`, `atk` and `face` (±1)
     - `hero` and `heroKey`, plus `id` (a unique number per unit; use `id % 4` to pick variant a–d)
   - Choose the frame:
     - `moving` → `run`
     - `atk` → `attack`
     - otherwise → `idle`
     - `opts.ko` → `ko`
   - Use time: `performance.now()` at about 12 fps for run and 10 fps for attack.
   - Run **recoloured** sprites through `clubKit(name, club)` (it caches per club).
   - **Heroes:**
     - `heroKey` `captain` → `captain-<club.abbr>`
     - `vice`/`star`/`rleg` → `<key>-<club.abbr>`
     - the coach (`kind === "coach"`) → `coach`
     - remove the gold-star placeholder only when the real sprite exists
3. **Front or back direction.** In `js/battle.js` → `drawUnitB(u)`, you may pass one extra **visual-only** field: `back: u.y < (u.prevY ?? u.y)`, tracking `u.prevY` there.
   - Don't change any other battle code.
   - If you'd rather not touch `battle.js`, always use the `-front` rows.
4. **Portraits.** The menu icons come from `playerIcon()` in `js/ui.js`, which calls `drawArtIcon("portrait-...")` in `js/art.js`. Make `drawArtIcon` prefer `art/portraits/...` when it's loaded. Don't change `ui.js` beyond that.
5. **Buildings.** In `drawBuildingArt`, use `kitroom-<lv>` / `herohall-<lv>` when loaded; right now they borrow the Coach's Office and Captain's Locker art. Keep the footprint anchoring (the `artBuildings` table).
6. **Cards and packs.** No code needed; `js/cards.js` picks them up from the manifest. Check it works (section 8).
7. **Release.** Bump `CACHE` in `sw.js` (e.g. `footy-fortress-v17`) and `VERSION` in `js/data.js` (the date-like string). Those are the only edits allowed in `data.js`.

---

## 8. Test before you open the PR

- Serve the folder over HTTP: `python3 -m http.server 8080`, then open http://localhost:8080. The manifest isn't read over `file://`.
- Start a new club (any), do the tutorial or skip ahead, then check:
  - [ ] Every unit runs, attacks, idles and gets knocked out; left and right mirror correctly; variants differ.
  - [ ] Guernseys recolour correctly for **Collingwood** (black/white), **Richmond** (black/yellow sash), **Brisbane** (maroon/gold) and **West Coast** (navy/gold). No skin or hair gets recoloured.
  - [ ] Captains and the other heroes show their own sprites in matches and on their buildings. The coach works too.
  - [ ] Kit Room and Hero Hall sit correctly on their 3×3 footprint (the selection glow lines up underneath).
  - [ ] Cards: open the album (Cards button), open a pack (slide across the top), and check that portraits sit inside the frame window with the rating, name and badges readable. Check one of each rarity and a special.
  - [ ] An old save still loads. Play once on master first, then switch to your branch and reload.
  - [ ] No errors in the browser console.

---

## 9. Hand-in

- Branch from `master`, named `art/full-refresh`. Commit in sensible chunks (units, heroes, buildings, cards).
- Open a PR into `master` titled "Art refresh: animated characters, heroes, cards". Include:
  - a short GIF of a match
  - screenshots: home base with the Kit Room and Hero Hall, the album page, the pack tear, and one card of each rarity plus a special
  - a list of anything you couldn't do
- **Don't merge and don't deploy.** The owner previews it, and Claude merges and deploys.

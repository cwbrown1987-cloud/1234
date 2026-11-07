# Footy Fortress: complete art handoff (for GPT/Codex)

Repo: `github.com/cwbrown1987-cloud/Footy-Fortress`. Branch from `master`, name it `art/full-refresh`, open a PR into `master`. **Don't merge it yourself.** The owner previews it first.

This is a **visual-only** job. Don't change gameplay numbers, save data (`localStorage` key `footyFortress2`), names or rules. Old saves must still load.

## 0. Scope: what to redraw, and what to leave alone
**Redraw / create:**
- Every **character**: the 9 field units (animated), head variations, 18 captains, 54 Hero Hall heroes, and the Head Coach.
- **Two new buildings only:** Kit Room and Hero Hall.
- **Cards:** 198 portraits, rarity and special frames, card back, binder album art, and the two packs.

**Do NOT redraw** (these already have finished art, so leave them exactly as they are):
- All other buildings: Clubhouse, Pie Shop, Drink Tap, Pie Warmer, Esky, Training Oval, Interchange Bench, Physio Room, Coaches Box, Locker Room, Coach's Office, Shed, Goal Tower, Siren, Catapult, Floodlight, Sprinkler and Fences.
- The stadium, ground, crowd, trees, rocks and obstacles.
- The HUD, buttons, icons, menus and fonts.
- The card layout. The game already draws the card (`cardFace()` in `js/cards.js`, matching `docs/card-style-reference.png`) and puts the rating, name, badges and stat bars on top of your art. Supply the portrait and frame images only.

## 1. Read these first
- `js/data.js`: clubs (`CLUBS`: colours `a`/`b`/`c`, captain `hero.name`), units (`UNITS`), heroes (`HEROES`, `HERO_POS`), buildings (`BLD`).
- `js/art.js`: how sprites are loaded (`loadArtSheet`), recoloured per club (`clubKit`, `portraitKit`), and drawn (`drawPlayerArt`, `drawBuildingArt`). Also `namedHeroArt` (captain likenesses) and `HERO_ART` (placeholder bodies for the new heroes).
- `art/sheets.js`: the current art, embedded as base64 sheets.
- `js/cardset.js`: every 2026 player with real stats. `CARD_ART_BRIEF.md` has the 198-card checklist.
- `docs/card-style-reference.png`: **style reference only** (look and feel). Take names and numbers from the data files, not the picture.

## 2. One art style everywhere
Bold, chunky, painted 3D-cartoon look: big heads and hands, thick dark outlines, bright rim light, soft shading. In-game sprites, hero portraits, cards and the album should all look like they belong together.

Don't copy Clash of Clans characters, UI, logos or any Supercell art. Only the general cartoon-strategy feel. Real AFL guernseys, club colours and club logos are fine (owner approved; private project).

## 3. Animated field units (most important)
Use the game's **internal names**:

| Internal name | In-game name | What it is |
|---|---|---|
| `rover` | Rover | Fast midfielder, the basic unit |
| `forward` | Forward | Kicks the ball from range |
| `ruck` | Ruck | Big, tough tall |
| `tagger` | Crumber | Small, quick, goes for collectors |
| `shepherd` | Shepherd | Big blocker who smashes fences |
| `trainer` | Trainer | Runs around healing (water bottles) |
| `coach` | Head Coach | Hero, suit and clipboard |
| `seagulls` | Seagulls | Flying flock (air) |
| `blimp` | Blimp | Flying blimp that drops footies (air) |

**One shared body per unit type, recoloured for each club.** Paint the guernsey in **pure navy (#1b2a6b) with pure white (#ffffff) trim** so `clubKit()` can swap in each club's colours. Keep skin, hair, boots and the footy outside those two colours.

Sprite sheet for each person unit: `art/sprites/<name>.webp`
- 160×160 px cells, transparent background, feet at the bottom-centre of each cell.
- Rows:
  - Run (8 frames) ×3 directions: towards camera, side-on, away from camera.
  - Attack (6 frames) ×3 directions. Rover/ruck/shepherd/tagger: bump or tackle. Forward: kick. Trainer: squirt the bottle.
  - Idle (4 frames).
  - Knocked out (4 frames).
- The game mirrors sprites for left/right, so draw facing **right** only.
- Seagulls: flap cycle of 6 frames plus a 4-frame swoop. Blimp: 4-frame bob plus a 4-frame drop.

**Head variations** so a team doesn't look like clones: `art/sprites/<name>-heads.webp`, with 4 different heads (hair, skin tone, beard or headband) × 3 directions. Same cell size, positioned to sit exactly on the body's neck. The game will pick one at random per player.

## 4. Heroes (real players, in their own club guernsey)
Heroes are **not recoloured**. Each one is painted in their real club guernsey with a likeness.

- **Captains (18):** `art/heroes/captain-<club>.webp`. These already exist as stills (see `namedHeroArt`). Redo them with the full animation rows from section 3.
- **New Hero Hall heroes (54)**, already in the game with placeholder art (rover, forward and ruck bodies with a gold star):
  - `art/heroes/vice-<club>.webp`: Vice-Captain, the most 2026 disposals at that club (not the captain). Ability: Centre Clearance.
  - `art/heroes/star-<club>.webp`: Star Forward, the most 2026 goals. Ability: Bag of Goals (big kicks).
  - `art/heroes/rleg-<club>.webp`: Ruck Legend, the most 2026 hit-outs. Ability: Ruck Wall (a gold shield glow around nearby teammates).
- Club codes: `adel bris carl coll ess freo geel gcs gws haw melb nmfc port rich stk syd wce wb`.
- To get each club's names, run `heroPlayer(CLUBS[i], "vice"|"star"|"rleg")` in the browser console, or look at the table below.
- Also make a 512×512 portrait for each hero (head and shoulders, same pose as the cards), named `art/portraits/<key>-<club>.webp`.

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

## 5. Buildings
Same isometric style and footprint rules as the existing building sheet (the front of the base stays inside the tile footprint; see `artBuildings` in `js/art.js`).
- `art/buildings/kitroom.webp`: **Kit Room** (hero gear forge; Clash's Blacksmith). 3×3 tiles, 5 levels. Racks of boots, guernseys on hangers, a workbench, a club-coloured awning.
- `art/buildings/herohall.webp`: **Hero Hall**, home of the Vice-Captain, Star Forward and Ruck Legend. 3×3 tiles, 3 levels. A grand clubroom or hall-of-fame building with three plinths out the front, where the heroes stand.
- Use a club-colour band (navy and white for recolouring) wherever the club colour should show.

## 6. Footy cards, album and packs
Follow `CARD_ART_BRIEF.md`; its checklist has the 198 base cards (11 per club: the captain plus the 10 most-used 2026 players).
- **Card portraits:** 198 head-and-shoulders portraits in real guernseys, saved as `art/cards/<club>-<jumper>.webp` (512×640).
- **Rarity frames:** Common, Rare, Epic, Legendary and 24K Gold, saved as `art/cards/frame-<rarity>.webp`. Special frames: Star Wildcard, Best & Fairest, Goal Kicker and Future Legend (file names as listed in `CARD_ART_BRIEF.md`). 24K Gold cards come only from Prize Packs. Leave the text areas empty, because the game draws the name, jumper number, rating and stat bars from real stats.
- **Card back:** `art/cards/back.webp`.
- **Binder album:** `art/album/` with the cover, a page background with 9 card slots, club tab dividers (18), and an empty-slot silhouette.
- **Packs:** `art/packs/footy.webp` (normal pack: 6 cards + 1 special) and `art/packs/prize.webp` (prize pack, every 5 Experience Levels), plus a 6-frame pack-tear animation.

## 7. Format and limits
- WebP with alpha. Each file must be **≤ 1.5 MB**; the whole `art/` folder should stay under about 40 MB.
- Ship separate files (don't add to the base64 in `art/sheets.js`), plus `art/manifest.json` listing every file with its cell size, columns/rows and row names.
- Wire it up only through `js/art.js` (load from the manifest, fall back to the current art if a file is missing). No changes to `js/game.js`, `js/battle.js` or `js/data.js` numbers.
- Bump `CACHE` in `sw.js` and `VERSION` in `js/data.js`.

## 8. Leave out
- Star player cards, spells or abilities in cards. Cards **don't** change stats.
- Clash HUD, Clash characters, Supercell logos.
- Gameplay or balance changes.

## 9. Before the PR
- Run the game locally (open `index.html`), start a match, and check:
  - every unit runs, attacks and gets knocked out in all 3 directions;
  - club recolours look right for 3 different clubs (e.g. Collingwood, Brisbane, West Coast);
  - the hero likenesses and the Hero Hall look right.
- In the PR, include: a GIF of a match, a screenshot of the home base with the Kit Room and Hero Hall, 6 sample cards (one per rarity and one special), and the album page.
- Confirm an old save still loads.

# Footy Fortress — Character + card art handoff (for GPT/Codex)

## Style reference
`docs/card-style-reference.png` is the approved **look**: chunky, cartoony Clash-style players, bold coloured frames, binder album.
Use it for style only. **Ignore its data**: player clubs, positions, ratings and the Clash currency bar in that mock-up are placeholders and several are wrong
(e.g. Tom Stewart and Jeremy Cameron are Geelong, Connor Rozee is Port Adelaide, Isaac Heeney is a forward).
**Every player's club, guernsey and position must come from the checklist at the bottom of this file.**
Ratings and stat bars on the cards are calculated by the game from real 2026 stats, so leave those areas empty in the art.

## Characters: one style everywhere
The same character style is used for on-field players, menu portraits, captains and card portraits:
1. On-field generic players (rover, forward, ruck, tagger, shepherd, trainer, coach): stand / run / attack poses, transparent, current isometric scale.
   Paint guernseys as dark main colour + light trim (navy/white); the game recolours them to each club at runtime.
2. Menu portraits for the same 7 types (same guernsey rule).
3. The 18 captains: portrait + stand + run in their real club guernsey (3×3 sheets like the current captains sheets).
4. 198 card portraits (checklist below), real 2026 club guernsey.

## Rarity frames (renamed to match the style reference)
Common (grey/silver), Rare (blue), Epic (red/purple), Legendary (gold), plus 24K Gold (solid gold, rarest) and the specials below.

Repo: github.com/cwbrown1987-cloud/Footy-Fortress (branch from `master`; call it `art/characters`). The game is at the repo root (`index.html`, `js/`, `art/`).
**Art only.** Don't change gameplay, saves (`localStorage` key `footyFortress2`) or `js/*.js` logic. Claude will wire the art in.

## The set (matches a real Teamcoach base set)
- **198 base cards**: 11 per club. Exact list below, numbered 001–198.
- **Rarities** of each base card: Common, Rare, Epic, Legendary (same player art, different frame).
- **Specials, one per club unless noted**: Star Wildcard (the captain), Best & Fairest, Goal Kicker, Future Legend (2 per club), and **24K Gold** (the captain, rarest).

## Deliverables
All WebP, transparent where noted, card ratio **5:7** at **360 × 504 px**.

1. **Card front frames** (transparent centre window for the player art):
   `frame-common`, `frame-rare`, `frame-epic`, `frame-legendary`,
   `frame-star-wildcard`, `frame-best-fairest`, `frame-goal-kicker`, `frame-future-legend`, `frame-24k-gold`.
   Keep these zones clear, because the game prints text and badges there:
   - top-left 70×70: club badge
   - top-right 70×70: overall rating (number) + small rarity tag under it
   - bottom 360×110: name plate (first name small, SURNAME big, then position · club · card no.)
   - specials: a banner area 60 px tall at the top-centre for the special's name
   Match the style reference: thick glowing frames, Legendary gold with sparkle, 24K Gold solid gold.
2. **Card back template** `card-back`: club-coloured border is drawn by the game, so make a neutral back with a header area (name/number), an info line, and a stats table area (8 rows × 3 columns: stat, 2026, Career), plus a small footer.
3. **Player portraits, 198 of them**: head and shoulders, yelling/action pose, **same painted style as the existing captain art** (`art/sheets.js` "captains" sheets), each in their club's **2026 home guernsey**, facing the viewer, transparent background.
   - One file per player: `art/players/<card number>.webp`, e.g. `art/players/004.webp`. **256 × 320**, about 15–25 KB each.
   - The 18 captains already exist; reuse their faces for consistency (they're in the list too).
4. **Album**: a leather binder like the style reference: `album-binder` (open binder with rings, 1536 × 900, transparent outside) and `album-slot-empty` (360 × 504, dashed outline with a footy silhouette). The game lays the cards, club badge strip, stats panel and buttons over it.
5. **Packs**: `pack-footy` (Footy Pack: 6 cards + 1 special) and `pack-prize` (Prize Pack, gold) at 360 × 480, foil wrapper with crimped ends and the "FOOTY FORTRESS" logo.

Put frames, back, album and pack art in `art/cards/`, and portraits in `art/players/`. Add `art/cards/manifest.json` listing every file. **Don't** add them to `art/sheets.js`. Claude will host them as separate files so the site stays under Cloudflare's size limit.

## Check before the PR
Open a few portraits next to the captain art and confirm the style matches and the guernsey is right for the club. Attach 3 sample finished cards (a Common, a Gold Foil and a Star Wildcard) as a preview.

## Checklist (198 base cards)
Captain marked; position from 2026 stats.

Adelaide Crows (adel) — home guernsey: see colours a=#002b5c b=#e21937
  001  #2 Ben Keays — Forward
  002  #3 Sam Berry — Midfielder
  003  #8 Josh Rachele — Forward
  004  #12 Jordan Dawson — Forward  (CAPTAIN)
  005  #14 Jake Soligo — Midfielder
  006  #15 Brayden Cook — Midfielder
  007  #16 Max Michalanney — Defender
  008  #23 Izak Rankine — Forward
  009  #24 Josh Worrell — Defender
  010  #28 Alex Neal-Bullen — Midfielder
  011  #42 Lachlan McAndrew — Ruckman

Brisbane Lions (bris) — home guernsey: see colours a=#7a0a3c b=#fdbe57
  012  #1 Kai Lohmann — Forward
  013  #3 Jaspa Fletcher — Defender
  014  #5 Josh Dunkley — Midfielder
  015  #8 Will Ashcroft — Midfielder
  016  #9 Lachie Neale — Midfielder  (CAPTAIN)
  017  #10 Levi Ashcroft — Midfielder
  018  #13 Logan Morris — Forward
  019  #16 Cam Rayner — Forward
  020  #23 Charlie Cameron — Forward
  021  #33 Zac Bailey — Forward
  022  #44 Darcy Wilmot — Defender

Carlton Blues (carl) — home guernsey: see colours a=#0e1e2d b=#ffffff
  023  #2 Lachlan Cowan — Defender
  024  #5 Adam Cerra — Midfielder
  025  #7 Jagga Smith — Midfielder
  026  #9 Patrick Cripps — Midfielder  (CAPTAIN)
  027  #10 Harry McKay — Forward
  028  #11 Mitch McGovern — Forward
  029  #12 Ben Ainsworth — Forward
  030  #14 Oliver Florent — Midfielder
  031  #17 Brodie Kemp — Forward
  032  #18 Sam Walsh — Midfielder
  033  #44 Francis Evans — Forward

Collingwood Magpies (coll) — home guernsey: see colours a=#111111 b=#ffffff
  034  #2 Jordan de Goey — Forward
  035  #7 Josh Daicos — Midfielder
  036  #8 Lachie Schultz — Forward
  037  #9 Dan Houston — Defender
  038  #11 Daniel McStay — Forward
  039  #14 Darcy Cameron — Ruckman
  040  #17 Billy Frampton — Defender
  041  #25 Jack Crisp — Midfielder
  042  #31 Beau McCreery — Midfielder
  043  #35 Nick Daicos — Forward  (CAPTAIN)
  044  #44 Ned Long — Midfielder

Essendon Bombers (ess) — home guernsey: see colours a=#111111 b=#cc2031
  045  #1 Andrew McGrath — Defender
  046  #2 Jacob Farrow — Defender
  047  #4 Kyle Langford — Defender
  048  #7 Zach Merrett — Midfielder
  049  #21 Archie Roberts — Midfielder
  050  #22 Sam Durham — Midfielder
  051  #25 Jaxon Prior — Defender
  052  #28 Xavier Duursma — Midfielder
  053  #30 Nate Caddy — Forward
  054  #31 Zach Reid — Defender
  055  #44 Archer Day-Wicks — Midfielder

Fremantle Dockers (freo) — home guernsey: see colours a=#2a0d54 b=#ffffff
  056  #3 Caleb Serong — Midfielder  (CAPTAIN)
  057  #6 Jordan Clark — Midfielder
  058  #8 Andrew Brayshaw — Midfielder
  059  #9 Luke Jackson — Ruckman
  060  #10 Shai Bolton — Forward
  061  #13 Luke Ryan — Defender
  062  #23 Karl Worner — Defender
  063  #28 Neil Erasmus — Defender
  064  #35 Josh Treacy — Forward
  065  #43 Isaiah Dudley — Forward
  066  #44 Matthew Johnson — Midfielder

Geelong Cats (geel) — home guernsey: see colours a=#001f3d b=#ffffff
  067  #3 Bailey Smith — Midfielder
  068  #5 Jeremy Cameron — Forward  (CAPTAIN)
  069  #7 Shaun Mannagh — Forward
  070  #14 Connor OSullivan — Defender
  071  #17 Lawson Humphries — Defender
  072  #28 Oliver Dempsey — Forward
  073  #30 Tom Atkins — Midfielder
  074  #33 Shannon Neale — Forward
  075  #34 Oisin Mullin — Midfielder
  076  #36 Oliver Henry — Forward
  077  #39 Zach Guthrie — Defender

Gold Coast Suns (gcs) — home guernsey: see colours a=#e02112 b=#ffe600
  078  #1 Mac Andrew — Defender
  079  #2 John Noble — Midfielder
  080  #6 Bodhi Uwland — Defender
  081  #8 Leo Lombard — Midfielder
  082  #11 Touk Miller — Midfielder
  083  #15 Noah Anderson — Midfielder
  084  #16 Joel Jeffrey — Midfielder
  085  #18 Matt Rowell — Midfielder  (CAPTAIN)
  086  #22 Ben Long — Forward
  087  #25 Sam Collins — Defender
  088  #34 Ben King — Forward

GWS Giants (gws) — home guernsey: see colours a=#f15c22 b=#4a4f55
  089  #1 Harvey Thomas — Defender
  090  #3 Stephen Coniglio — Midfielder
  091  #4 Toby Greene — Forward
  092  #6 Lachie Whitfield — Midfielder
  093  #7 Lachie Ash — Midfielder
  094  #9 Ryan Angwin — Midfielder
  095  #10 Clayton Oliver — Midfielder
  096  #20 Jake Stringer — Forward
  097  #27 Harry Himmelberg — Defender
  098  #37 Joe Fonti — Defender
  099  #39 Connor Idun — Defender

Hawthorn Hawks (haw) — home guernsey: see colours a=#4d2004 b=#fbbf15
  100  #2 Mitch Lewis — Forward
  101  #3 Jai Newcombe — Midfielder
  102  #4 Jarman Impey — Midfielder
  103  #6 James Sicily — Defender  (CAPTAIN)
  104  #8 Dylan Moore — Forward
  105  #9 Connor Macdonald — Midfielder
  106  #15 Blake Hardwick — Defender
  107  #16 Massimo DAmbrosio — Midfielder
  108  #17 Lloyd Meek — Ruckman
  109  #25 Josh Ward — Midfielder
  110  #33 Jack Ginnivan — Forward

Melbourne Demons (melb) — home guernsey: see colours a=#0f1131 b=#cc2031
  111  #4 Harvey Langford — Forward
  112  #8 Jake Lever — Defender
  113  #9 Jack Steele — Midfielder
  114  #11 Max Gawn — Ruckman  (CAPTAIN)
  115  #12 Koltyn Tholstrup — Defender
  116  #15 Ed Langdon — Defender
  117  #30 Harry Sharp — Forward
  118  #31 Bayley Fritsch — Forward
  119  #32 Tom Sparrow — Midfielder
  120  #36 Kysaiah Pickett — Forward
  121  #37 Kade Chandler — Forward

North Melbourne (nmfc) — home guernsey: see colours a=#013b9f b=#ffffff
  122  #3 Harry Sheezel — Midfielder  (CAPTAIN)
  123  #5 Caleb Daniel — Defender
  124  #9 Luke Davies-Uniacke — Midfielder
  125  #10 Colby McKercher — Midfielder
  126  #12 Jy Simpkin — Midfielder
  127  #15 Dylan Stephens — Midfielder
  128  #20 Nick Larkey — Forward
  129  #26 Luke Parker — Defender
  130  #30 Charlie Comben — Defender
  131  #44 Cameron Zurhaar — Defender
  132  #47 Cooper Trembath — Forward

Port Adelaide Power (port) — home guernsey: see colours a=#111111 b=#008aab
  133  #1 Connor Rozee — Midfielder  (CAPTAIN)
  134  #5 Joe Berry — Midfielder
  135  #7 Jase Burgoyne — Midfielder
  136  #17 Jack Whitlock — Forward
  137  #18 Jason Horne-Francis — Forward
  138  #19 Mitch Georgiades — Forward
  139  #21 Aliir Aliir — Defender
  140  #24 Jordon Sweet — Ruckman
  141  #28 Willem Drew — Midfielder
  142  #33 Darcy Byrne-Jones — Defender
  143  #44 Corey Durdin — Forward

Richmond Tigers (rich) — home guernsey: see colours a=#111111 b=#fed102
  144  #1 Nick Vlastuin — Defender
  145  #5 Jack Ross — Midfielder
  146  #12 Ben Miller — Defender
  147  #14 Tim Taranto — Midfielder  (CAPTAIN)
  148  #15 Jayden Short — Midfielder
  149  #24 Sam Grlj — Midfielder
  150  #33 Patrick Retschko — Midfielder
  151  #35 Nathan Broad — Defender
  152  #42 Mykelti Lefau — Forward
  153  #44 Seth Campbell — Midfielder
  154  #48 Steely Green — Forward

St Kilda Saints (stk) — home guernsey: see colours a=#ed0f05 b=#111111
  155  #2 Marcus Windhager — Midfielder
  156  #3 Jack Silvagni — Defender
  157  #7 Nasiah Wanganeen-Milera — Forward  (CAPTAIN)
  158  #8 Bradley Hill — Midfielder
  159  #19 Rowan Marshall — Ruckman
  160  #22 Darcy Wilson — Midfielder
  161  #25 Mattaes Phillipou — Midfielder
  162  #34 Hugo Garcia — Midfielder
  163  #40 Max Hall — Forward
  164  #43 Cooper Sharman — Forward
  165  #44 Callum Wilkie — Defender

Sydney Swans (syd) — home guernsey: see colours a=#ed171f b=#ffffff
  166  #1 Chad Warner — Forward
  167  #4 Brodie Grundy — Ruckman
  168  #5 Isaac Heeney — Forward  (CAPTAIN)
  169  #6 Logan McDonald — Forward
  170  #8 James Rowbottom — Midfielder
  171  #13 Jai Serong — Midfielder
  172  #14 Callum Mills — Defender
  173  #22 Nick Blakey — Midfielder
  174  #30 Tom McCartin — Defender
  175  #35 Charlie Curnow — Forward
  176  #44 Jake Lloyd — Midfielder

West Coast Eagles (wce) — home guernsey: see colours a=#002b79 b=#f2a900
  177  #1 Willem Duursma — Midfielder
  178  #2 Jake Waterman — Forward
  179  #6 Elliot Yeo — Midfielder
  180  #9 Harley Reid — Midfielder  (CAPTAIN)
  181  #11 Tim Kelly — Midfielder
  182  #14 Liam Duggan — Defender
  183  #18 Tom McCarthy — Defender
  184  #19 Brady Hough — Midfielder
  185  #20 Tylar Young — Defender
  186  #35 Jobe Shanahan — Forward
  187  #38 Hamish Davis — Midfielder

Western Bulldogs (wb) — home guernsey: see colours a=#014896 b=#e31937
  188  #4 Marcus Bontempelli — Forward  (CAPTAIN)
  189  #6 Cooper Hynes — Midfielder
  190  #8 Matthew Kennedy — Midfielder
  191  #9 Ryley Sanders — Midfielder
  192  #14 Rhylee West — Midfielder
  193  #20 Ed Richards — Forward
  194  #24 Buku Khamis — Defender
  195  #27 Joel Freijah — Midfielder
  196  #29 Lachlan Bramble — Defender
  197  #33 Aaron Naughton — Forward
  198  #37 Michael Sellwood — Defender

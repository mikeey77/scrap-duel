# Scrap Duel

A desktop vehicle builder and combat game: draft parts, bolt together a car, and duel a bot or a friend.

## Desktop app

The game ships as a Windows app (Electron). Everything runs on the player's PC: solo, Scrap Gauntlet and the sandbox work offline, saves stay in the user profile, and multiplayer is peer-to-peer (one player hosts, the other joins with a 4-character code; only the code exchange uses the free PeerJS service).

```sh
npm install
npm start            # build and open the game window
npm run dist:win     # installer + portable exe (run on Windows, or use the "Desktop build" GitHub Action)
npm run dist:win-zip # unsigned zip of the app, buildable from Linux/macOS
```

- `desktop/main.cjs` – window, `app://` protocol, saved window size, F11 fullscreen, GPU flags
- `desktop/preload.cjs` – the small bridge the page uses (`window.desktop`: fullscreen, quit, version)
- Fonts and PeerJS are bundled by `build.mjs` (no CDN needed)
- Settings → _Show frame rate_ shows FPS; slow high-DPI screens switch to performance mode automatically

## Garage HQ update

- **Main menu**: a hangar with your own car in the spotlight, one Continue button for the Scrap Road, and every other mode as a tile with its options right below.
- **Garage HQ** replaces the Workbench and the Locker: one screen with your car, paint, stickers, set bonus and **gear loadout** on the left (loadout gear is in your parts bin from round 1 of every Duel, Scrap Road and Gauntlet match; a fourth slot opens at level 10), and tabs for gear (spec sheet, upgrades, quirks, fusing, locking), the **Fabricator** (bolts into new gear), skins, stickers, trails, wreck effects, titles and your profile. Save up to three complete looks.
- **Blueprint Brawl**: bring one car worth up to 700 coins (a saved blueprint or a ready-made archetype), no drafting and no shop; rearrange it between rounds. Against a bot or online.
- **Online**: the host picks Draft duel or Blueprint Brawl, quick chat (T, then 1–4), a head-to-head record per friend, and a rematch button. Protocol 11.
- **Scrap Road** is an illustrated map: click a mission to see it, click again or press Start.
- **18 new parts**, 3 new arenas (Ice Rink, Scrap Press Plant, Stormy Rooftop) and 4 new stickers.
- **Simpler controls**: logic chips and the Wire tool are gone. Only moving parts (hinges, rotators, rams) take a key; weapons always fire with left click.
- **Smarter building**: bots put their best armour at the front; "Add bin parts to my car" puts wheels in pairs, melee facing forward and armour where hits come in, and leaves moving parts for you.
- Removed: the Lives, Bounty and Hill formats, the drivable map with caches and fog.

## Scrap Road update

- **Scrap Road** (story mode): a top-down world you drive around in your own car (WASD, Shift to boost). 4 regions with their own terrain, roads, gates that open after each boss, 12 hidden caches with bolts and gear, fog of war, a minimap with fast travel. 19 missions on the way. Missions have hand-made arena layouts, special rounds, salvage crates to grab before the rival steals them, and three stars each. Every region ends with a boss (best of 3): Mother Crusher, the Twin Drill, the Magnet Baron and the Junk King, hand-built cars that get angrier at ⅔ and ⅓ health. Boss and mission difficulty were tuned with simulated playthroughs.
- **Workbench and gear** (a technical spec sheet: schematic, base/now/next readout, level curve, work order): parts you find (after Duel matches, Gauntlet runs, missions and bosses) are yours to keep. Upgrade them with bolts up to a level 5 Masterwork, pick a quirk at level 3 (every quirk is a trade-off), fuse duplicates or scrap them. In Duel, Story and Gauntlet your gear turns up as a draft card.
- **Locker** (replaces Garage Style): skins, stickers, trails, wreck effects, titles and your badge. Stickers show on your car and give small perks; two stickers from your skin's set unlock a set bonus. Perks only work offline; online only the picture travels.
- **The show**: commentators Dash Danvers and Doc Gasket call the fight with captions and voices, the crowd in the stands cheers and boos, and a full hype meter makes the crowd throw you a gift (repair, coins or a power-up; offline only).
- Battle telemetry (speed, DPS out and in, parts left, a 10-second trace) and a broadcast-style vignette.
- Match formats (Classic, Lives, Bounty, Hill) are selectable again for Duel vs bot. Your paint colour is remembered.
- Removed: the "Sandbox online" placeholder, unused CSS from older menus, Netlify leftovers and dead code.

Settings → _Commentators (captions)_ and _Commentator voices_ switch the duo off. Multiplayer protocol 10: both players need the same version.

## Earlier releases

### Gauntlet & arenas

- **Scrap Gauntlet** (roguelike): survive endless waves with three hearts. Rivals grow stronger every wave; every fifth wave is a boss (extra HP and damage) that drops a heart and a relic (Duct Tape, Nitro Coffee, Hair Trigger, Thick Skin, Repair Drone, …). Your best wave is saved.
- **17 arenas**: ten new ones with gimmicks — Volcano Forge (lava), Space Station (low gravity, air vents), Car Wash (soap, blowers), Desert Canyon (sandstorm gusts), Haunted Mansion (lights out), Toy Room, Robot Factory (conveyor belts), Pinball Table (bumpers), Giant Kitchen (stove plates) and Soggy Swamp (mud).
- Richer sound: room reverb, stereo position, pitch variation and reworked hits, explosions and UI clicks.
- More jokes: bot banter, hit quips, talking test dummies, kill messages, menu taglines, a cockpit that dozes off when you leave the garage.

### Shapes and branches

- 190 playable modules, including 50 new designs: ten each for fire, cold, scrap economy, slippery terrain and cables.
- Real 1×1, 1×2, 1×3, 2×2, 2×3, L and T footprints. Placement, rotation, collision, supports, damage, bots and Auto-place all use the occupied cells. Large drafts include a usable support pad and extra bay space.
- Animated branch artwork, footprint previews, next synergy bonuses and affordable parts that fit. Decorative motion can be disabled in Settings.
- Fire trails and fans, chilled connectors and a wind-up ice press, collectible cargo with storage/repair/ammunition choices, drifting skids, visible dropped beads and physical towing cables.
- New pickups: temporary junk magnet, ghost through loose wreckage and limited repair. Six pickup types in total.
- Scrap Run: collect junk, bring it to your depot, and race to deliver 20 pieces. All vehicles have basic cargo capacity in this objective; storage modules increase it. Fresh-world scrap rewards are capped at 40 coins per round; spilling and recollecting cargo cannot farm rewards.
- Four selectable formats for solo and multiplayer: Balanced rounds, Scrap Lives (20 lives, defeat costs 2 + round), Bounty (beating the leader pays up to two bonus points, never more than the gap, plus bonus coins), and Hill finale (double-point King of the Hill).
- Cockpit portraits, cargo feedback, damaged connection warnings and restrained camera shake. Result reports show the first broken part, most damaged part and obstructed weapons, with a garage damage map.
- New module cooldowns, cargo, cables and match rules synchronize with the peer and replay. This release uses multiplayer protocol 8; both players should refresh after an update.
- Parts cards show one available quantity badge, or “On car” when all copies are mounted. Mystery crates visibly roll for 2.2 seconds before the reveal; Skip and the separate “Animate mystery crates” setting remain available.
- Shop search, category, rarity, favorites and mount filters narrow the discovered parts. Shop rows and crate rewards show occupied footprints, weight and mount requirements.

Weather rules, 2v2 and spectating during building remain future work.

### Before that

- Random common weapons for each starter, on the same simple chassis.
- Draft and crate rewards include any missing mounting supports. Scrap Frames and Steel Girders are always in the shop.
- Auto-place tests all four directions and leaves parts loose if it cannot place them without creating an obstruction.
- Search, favorites, rarity and current-mount filters; explicit loose and owned counts.
- Chassis/equipment views, firing arcs, fragile connection highlights and obstruction markers.
- Short, skippable mystery-crate animation; reduced background rendering while it runs.
- Original synthesized battle music, separate music volume, and contextual equipped ability/cooldown reminders.
- One point per round, two points in the finale; replay annotations for broken connections and exposed cockpits.
- Multiplayer ping/quality display and a 30-second recovery window. Keep both pages open: reloading or intentionally leaving ends the session. PeerJS matchmaking and a viable peer-to-peer network connection are required.

## Controls

Drive with WASD or arrows. Aim with the mouse; fire with left-click or Space. Jump is J when equipped. Only equipped gadgets appear in the battle reminder, alongside their controls and cooldowns.

New gadgets: right-click activates/reels cables; Z drops beads or foam, V releases a decoy duck, H rings the pickup bell, and C toggles grip studs or activates the rescue jack. The scrap conveyor switches between repairs and ammunition when firing begins. Their buttons appear only when equipped.

In the garage: click/drag to place, right-click to remove, R changes the next part's facing, T rotates placed parts, X removes, M mirrors. Ctrl+Z undoes and Ctrl+Y redoes. G puts hinges, rotators and rams on keys 1–9 (the button only shows when your car has one), [ and ] change a beam's length.

## Code layout

The source is split by feature in `src/`:

- `src/index.html` — page markup with `<!-- @styles -->` / `<!-- @scripts -->` slots
- `src/css/` — stylesheets, in load order
- `src/js/` — game code by area (`data/`, `garage/`, `game/`, `render/`, `audio/`, `net/`, `ui/`, `ai/`, `core/`)
- `src/manifest.json` — the order the files are bundled in (all scripts share one scope)

Static files that are not built (icons) live directly in `site/`; `site/fonts` and `site/vendor` are generated.

`npm run build` (or `node build.mjs`) bundles everything into the single page `site/index.html`, which the desktop app loads and the tests check. `npm run format` runs Prettier. Edit files in `src/`, never `site/index.html` directly.

## Run in a browser (development)

Build, then serve `site/` and open http://localhost:8765/:

```sh
npm run build
python -m http.server 8765 --directory site
```

Multiplayer needs an internet connection for the code exchange.

## Regression checks

With Node.js installed:

```sh
npm test
```

The suite checks randomized starters, support grants, functional placement, undo, scoring, controls, filters, crate accounting, replay events, music lifecycle, and two-peer battle recovery including score and cooldown synchronization. Shape/content checks cover all 50 modules, four-way footprints, full support requirements, non-anchor removal/replacement, connected Auto-place, combat/render execution, cargo rewards and spills, real tow forces, rescue/press timing, serialized new states, Scrap Run deposits, selectable scoring and layer-specific damage reports. Browser playtesting covers layout and actual PeerJS connections.

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
- Settings → *Show frame rate* shows FPS; slow high-DPI screens switch to performance mode automatically

## Gauntlet & arenas release

- **Scrap Gauntlet** (roguelike): survive endless waves with three hearts. Rivals grow stronger every wave; every fifth wave is a boss (extra HP and damage) that drops a heart and a relic (Duct Tape, Nitro Coffee, Hair Trigger, Thick Skin, Repair Drone, …). Your best wave is saved.
- **17 arenas**: ten new ones with gimmicks — Volcano Forge (lava), Space Station (low gravity, air vents), Car Wash (soap, blowers), Desert Canyon (sandstorm gusts), Haunted Mansion (lights out), Toy Room, Robot Factory (conveyor belts), Pinball Table (bumpers), Giant Kitchen (stove plates) and Soggy Swamp (mud).
- Richer sound: room reverb, stereo position, pitch variation and reworked hits, explosions and UI clicks.
- More jokes: bot banter, hit quips, talking test dummies, kill messages, menu taglines, a cockpit that dozes off when you leave the garage.

## Shapes and branches release

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

## Previous release

- Random common weapons for each starter, on the same simple chassis.
- Draft and crate rewards include any missing mounting supports. Scrap Frames and Steel Girders are always in the shop.
- Auto-place tests all four directions and leaves parts loose if it cannot place them without creating an obstruction.
- Search, favorites, rarity and current-mount filters; explicit loose and owned counts.
- Chassis/equipment views, firing arcs, fragile connection highlights and obstruction markers.
- Short, skippable mystery-crate animation; reduced background rendering while it runs.
- Original synthesized battle music, separate music volume, and contextual equipped ability/cooldown reminders.
- One point per round, two points in the finale; replay annotations for broken connections and exposed cockpits.
- Multiplayer ping/quality display and a 30-second recovery window. Keep both pages open: reloading or intentionally leaving ends the session. PeerJS matchmaking and a viable peer-to-peer network connection are required.
- Wrapped mobile toolbar, fixed mobile build actions, and space reserved for the hosting badge.

## Controls

Drive with WASD or arrows. Aim with the mouse; fire with left-click or Space. Jump is J when equipped. Only equipped gadgets appear in the battle reminder, alongside their controls and cooldowns. On touch: left stick drives, right stick aims; push farther to fire. The Fire button shoots while aiming gently. Fullscreen availability depends on the browser.

New gadgets: right-click activates/reels cables; Z drops beads or foam, V releases a decoy duck, H rings the pickup bell, and C toggles grip studs or activates the rescue jack. The scrap conveyor switches between repairs and ammunition when firing begins. Their buttons appear only when equipped.

In the garage: click/drag to place, right-click to remove, R changes the next part's facing, T rotates placed parts, X removes, M mirrors. Ctrl+Z undoes and Ctrl+Y redoes.

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


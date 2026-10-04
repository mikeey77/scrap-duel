# Scrap Duel

A browser vehicle builder and combat game: draft parts, bolt together a car, and duel a bot or a friend across ten rounds.

Play: https://scrap-duel.netlify.app/

## Mobile and UI update

- Portrait arena rotates 90 degrees; aiming, steering, camera fitting and offscreen arrows use the same inverse projection. World coordinates and multiplayer protocol stay unchanged.
- Independent drive and aim sticks. Aim gently without firing; push the right stick past its firing ring to shoot. Pointer capture, cancellation and focus loss release inputs safely.
- Fixed mobile battle viewport, fullscreen button and a portrait-rotation toggle.
- Equipped touch actions show actual cooldowns; control style can be automatic, touch or mouse/keyboard. Optional subtle aim assist is solo-only and ignores smoke, night and blocked targets.
- Three mobile garage tabs keep the parts catalog, build bay and car stats accessible, with persistent build actions.
- Workshop lighting, responsive card feedback, footprint labels and synergy progress bars. Reduced-motion preferences are respected.

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

In the garage: click/drag to place, right-click to remove, R changes the next part's facing, T rotates placed parts, X removes, M mirrors. Ctrl+Z undoes and Ctrl+Y redoes.

## Run locally

No build step or dependencies are needed. Serve this folder, for example:

```sh
python -m http.server 8765
```

Open http://localhost:8765/ in a browser. Internet access is required for multiplayer matchmaking.

## Regression checks

With Node.js installed:

```sh
node tests/regression.cjs
```

The suite checks randomized starters, support grants, functional placement, undo, scoring, controls, filters, crate accounting, replay events, music lifecycle, and two-peer battle recovery including score and cooldown synchronization. The additional mobile checks cover rotated camera/input round trips, independently cancelled twin sticks, equipment cooldowns, and solo-only aim assistance. Browser playtesting covers portrait/landscape layout; previous release testing also covered actual PeerJS connections.

## Deployment

Netlify publishes this folder directly using `netlify.toml`. The HTML entry point revalidates on each visit so multiplayer players receive the same protocol version after an update.

# Scrap Duel

A browser vehicle builder and combat game: draft parts, bolt together a car, and duel a bot or a friend across ten rounds.

Play: https://scrap-duel.netlify.app/

## This release

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

Drive with WASD or arrows. Aim with the mouse; fire with left-click or Space. Jump is J when equipped. Only equipped gadgets appear in the battle reminder, alongside their controls and cooldowns. Touch controls are supported.

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

The suite checks randomized starters, support grants, functional placement, undo, scoring, controls, filters, crate accounting, replay events, music lifecycle, and two-peer battle recovery including score and cooldown synchronization. Browser playtesting covers layout and actual PeerJS connections.

## Deployment

Netlify publishes this folder directly using `netlify.toml`. The HTML entry point revalidates on each visit so multiplayer players receive the same protocol version after an update.

# Scrap Duel

Build a battle car from scrap, then fight a bot, a boss or a friend, 1v1 or 2v2. A desktop game for Windows.

**[Download for Windows](https://scrap-duel.netlify.app)** · [All releases](https://github.com/mikeey77/scrap-duel/releases) · [Changelog](CHANGELOG.md)

![A battle in the factory arena](web/img/battle.webp)

## The game

Every round of a duel has three parts: **draft** a part from three cards, **build** it onto your car on a grid, and **fight** in an arena. Parts break off as you take hits; the last car with a cockpit wins the round.

| Mode            | What it is                                                                            |
| --------------- | ------------------------------------------------------------------------------------- |
| Duel            | Draft, build and fight a bot on Easy, Normal or Hard, alone or 2v2 with a bot partner |
| Blueprint Brawl | No drafting. Bring one car worth up to 700 coins. Against a bot or online             |
| Scrap Gauntlet  | Endless waves with three hearts; a boss every fifth wave drops a relic                |
| Online          | Play a friend with a room code: 1v1, or 2v2 on one team or against each other         |

Between matches, **Garage HQ** holds the gear you have found: pick a loadout, level parts up to 10 (they earn XP in your matches, wins pay the bolts, an A/B special at level 5, a legendary one at 10, mod chips and loadout sets), build new gear in the Fabricator, and dress your car with skins, stickers, trails and wreck effects.

| Garage                                 | 2v2                                       | Workbench                                  |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| ![Building a car](web/img/garage.webp) | ![A 2v2 battle](web/img/team-battle.webp) | ![A level 10 part](web/img/garage-hq.webp) |

### Controls

- **Drive** with WASD or the arrow keys, **aim** with the mouse, **fire** with left click or Space.
- **Moving parts** (hinges, rotators, rams) are on keys 1–9; set them with the Keys tool in the garage.
- **Quick chat** online: T, then 1–4.
- **Garage**: click or drag to place, right click to remove, R to turn the next part, T to rotate a placed part, M to mirror, the arrow keys move the whole car, Ctrl+Z / Ctrl+Y to undo and redo.
- F11 for fullscreen, Esc for the pause menu.

## Project layout

```
src/            the game: index.html, css/ and js/ split by feature, manifest.json sets the load order
desktop/        the Electron shell (window, app:// protocol, saved window size, preload bridge)
site/           build output the app loads (only the icons are checked in)
tests/          regression suite
assets/voice/   recorded commentator and announcer lines (tools/make-voices.mjs)
tools/          the voice recorder
web/            the download page that Netlify publishes
CHANGELOG.md    release notes; the newest section also appears on the download page
```

All scripts in `src/js` share one scope and are bundled in the order of `src/manifest.json`. Edit files in `src/`; `site/index.html` is generated.

## Development

Needs Node.js 22.

```sh
npm install
npm start        # build and open the game window
npm test         # build, then run the regression suite
npm run web      # build the download page into web/dist
npm run format   # Prettier
```

To play in a browser while developing, build and serve `site/` (for example `python -m http.server 8765 --directory site`). Online play needs an internet connection for the room code exchange (PeerJS); the match itself is peer to peer.

## Commentator voices

The commentators and the announcer are recorded clips in `assets/voice/` (Opus, about 2 MB), made offline from the lines in `src/js/data/commentary.js` with the Kokoro neural voice. After changing or adding lines, run `tools/make-voices.mjs` (it lists what it needs at the top); it records only new or changed lines and removes clips nobody uses. Lines without a clip fall back to the system voice.

## Releasing a new version

1. Bump `version` in `package.json`.
2. Add a section for it at the top of `CHANGELOG.md`.
3. Push to `main`.

The **Release** workflow then builds `ScrapDuel-Setup.exe` and `ScrapDuel-Windows.zip` on Windows and publishes them as GitHub Release `vX.Y.Z` with the changelog section as notes. Netlify rebuilds the download page, whose buttons always point at the newest release (`/download` and `/download/zip`).

`npm run dist:win` builds the same files locally on Windows. `npm run dist:win-local` works on Linux and macOS but skips the exe icon and metadata.

Online play only works between players on the same version (the network protocol number is checked when you join).

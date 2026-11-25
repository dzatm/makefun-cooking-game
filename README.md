# dzatm/makefun-cooking-game

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/dzatm/makefun-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/dzatm/makefun-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Sizzle & Serve — Dapur Kilat**: a fast, original cooking game for the
[best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137).
One chef, one busy kitchen, one shift: tickets keep coming, patience keeps
falling, and the grill does not forgive a forgotten patty.

## How to play

- **Move**: `←` `→` or `A` `D` to walk the chef along the kitchen. Click a
  station (or anywhere on the floor) and the chef walks there on their own.
- **Use a station**: `E` or `Space` when the chef stands at it.
- **The route**: take ingredients from the bins (roti, tomat, selada, keju,
  daging), chop tomato and lettuce on the talenan, grill the patty on the
  panggangan (take it off in time or it burns!), assemble the dish on the
  piring saji, then ring the bell at the jendela saji to serve it.
- **Score**: every served dish pays 100 points plus a tip for the patience
  left on its ticket; serving dish after dish without a miss builds a combo
  bonus. A ticket that runs out costs a heart — lose three hearts and the
  shift ends early.
- **Win**: reach 900 points before the 2½-minute shift timer runs out.
- **Pause**: `P` or `Esc`. **Mute**: `M`.

## The menu

| Dish | Plate |
| --- | --- |
| Burger Kilat | roti + daging panggang + selada iris |
| Salad Pelangi | tomat iris + selada iris + keju |
| Keju Leleh | roti + daging panggang + keju |
| Veggie Delight | roti + tomat iris + selada iris + keju |
| Double Sizzle | roti + daging panggang + daging panggang + keju |

## Run it

No build step, no network: everything the game needs is a file under `game/`.

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

Open the page in desktop Chrome and play with keyboard and mouse.

## Layout

- `game/index.html` — the page and the canvas.
- `game/src/main.js` — boot, the fixed-step loop, the four screens.
- `game/src/world.js` — the kitchen rules: orders, stations, cooking, serving.
- `game/src/render.js` — all the art, drawn on canvas (no image files).
- `game/src/config.js` — tuning, recipes, stations, palette.
- `game/src/input.js` — keyboard and click-to-walk input.
- `game/src/audio.js` — small synthesized WebAudio sounds, no files.
- `game/src/shots.js` — the autopilot that stages the screenshots.
- `game/src/random.js` — the seeded random behind orders and screenshots.
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes
  `dossier.json` with the vendored `vendor/makefun-game.ts`.
- `screenshots/` — 3–4 real renders of the game running in a browser.

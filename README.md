# SPL Open Data · Goalie Replay

A 3D replay of all 81 tracked shots in the [SPL Open Data hockey goalie dataset](https://github.com/Sport-Performance-Lab/SPL-Open-Data/tree/main/hockey/goalie) (MLSE Sport Performance Lab, puck tracking by Stathletes).

Built with Next.js, Tailwind CSS, shadcn/ui (Radix), Motion and React Three Fiber.

**Live:** https://maliziapaul.github.io/spl-goalie-replay/

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
```

## Deploy

Every push to `main` builds a static export and publishes it to GitHub Pages (`.github/workflows/pages.yml`). The workflow sets `PAGES_BASE_PATH=/<repo>`, which switches `next.config.ts` to `output: "export"` with that base path. To try the Pages build locally:

```bash
PAGES_BASE_PATH=/spl-goalie-replay npm run build   # writes ./out
```

## What's on screen

- **Stage** (`src/components/replay/scene/`): one end of an NHL rink in feet, with the goalie posed from the 19 tracked keypoints at 60 fps, the puck with a speed-coloured trail, a goal lamp, camera presets and three overlays (motion trail, puck path, all 81 shots).
- **Dock**: transport, a timeline of puck speed and goalie hip height (drag to scrub), and a strip of all 81 shots.
- **Panel**: release speed, distance and angle, butterfly timing, a shooter's-view chart of aim points, and session totals.

Keyboard: Space plays or pauses, ← → step a frame, N / P go to the next or previous shot.

## Data

`public/data/goalie.bin` and `src/data/goalie-meta.json` are generated from the 81 shot JSON files by `scripts/prep_goalie.py`:

```bash
# download hockey/goalie/data/2026-08-06/P0001/*.json from the SPL repo into ./shots, then
python3 scripts/prep_goalie.py ./shots .
```

The binary is gzip of delta-coded int16 channels (19 joints × xyz, puck xyz, puck speed), 0.01 ft resolution, about 570 KB instead of 50 MB of JSON. `src/lib/goalie/data.ts` decodes it in the browser with `DecompressionStream`.

### Derived values (not official labels)

The dataset has no outcome labels. These are computed from the tracking:

- **Release**: the peak puck speed with the puck in front of the net, walked back while speed stays above 40 ft/s.
- **Goal**: the puck is tracked inside the net frame (89.2 < x < 93 ft, |y| < 3 ft, z < 4 ft) after release.
- **Aim point**: the puck's straight-line path just after release, carried to the goal line. "Stopped" means aimed inside the 6 × 4 ft mouth and not a goal; "Wide" means aimed outside it.
- **Butterfly drop**: the first frame the goalie's mid-hip is below 1.45 ft.

## License

- **Code:** MIT, see [LICENSE](LICENSE).
- **Data** (`public/data/goalie.bin`, `src/data/goalie-meta.json`): derived from the SPL Open Data hockey goalie dataset and licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Credit MLSE's Sport Performance Lab and Stathletes, no commercial use, share alike.

This is an independent visualization, not affiliated with or endorsed by MLSE or Stathletes.

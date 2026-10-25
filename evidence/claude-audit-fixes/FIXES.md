# Audit fixes F1–F5, F8 — Professor + Claude — 2026-10-25

Branch `claude/audit-fixes` from `origin/codex/ademix` caf6ee0. Findings are from `evidence/claude-final-audit/AUDIT.md`.
Tested on the production build (`vite build` + `vite preview`) against the simulator's local demo mode, headless
Chrome with SwiftShader (no GPU). No Docker/Eclipse Ditto run was possible on this computer.

## Changed files

| File | Change |
|---|---|
| `ademix/frontend/src/IngestionLayer.tsx` | **Shared hot spot: Codex is finishing release verification around this file.** F1/F8 freshness and failure counting in the live poll and the mode badge; F3 software-renderer detection, `Graphics: Light/Balanced` button, canvas `dpr`/`antialias` from the selected quality; F4 `fleetSplit` returns `held`, shown in the KPI and the Decision gauge; F5 breakdown alert "Details" toggle. |
| `ademix/frontend/src/ingestion.css` | `.ig-mode.stale` badge style; `.ig-alert-more` and the phone rule that hides alert details until opened. |
| `ademix/frontend/public/models/Textures/colormap.png` | F2: new file, 11,813 bytes, CC0, from `https://raw.githubusercontent.com/shorepine/kenney/main/3d/factory/Textures/colormap.png` (same mirror as the five plant GLBs). Git blob `fddb472ccae14b57157b6d504977eda18b490291` equals GitHub's recorded SHA; SHA-256 `35d7bd6900dde0208429eeaec87fa17fbf024ed59f3f4eab54bc92802eba9dd7`; PNG 512×512. Downloaded with the Professor's explicit approval. |
| `evidence/claude-audit-fixes/*` | screenshots, raw JSON, this file. |

Not changed: simulator, data, contracts, README, SUBMISSION, presentation, DATA_LICENSES.md, main.

## Per-finding test results

| # | Fix | Test (exact) | Result |
|---|---|---|---|
| F1 | Badge goes **STALE** (amber) when `mine-01.sim_time_s` has not advanced for 7 s; live styling returns only when time advances again. Original LIVE/DEMO/REPLAY strings kept (Codex test). | Test harness replays one old 200 `/api/state` body for 12 s | Before: "DEMO … every 2 s". After: `DEMO · STALE · simulated time not advancing · 12 s [stale]`; after release: back to `DEMO … every 2 s [live]`. `final-desk-api-frozen.png` |
| F2 | Missing `Textures/colormap.png` added | Console errors over the full route | Before: `THREE.GLTFLoader: Couldn't load texture Textures/colormap.png` on every load. After: no console errors (desk and narrow). Plant shows its kit colours: `final-desk-api-frozen.png` |
| F3 | Software renderer detected via `WEBGL_debug_renderer_info` (SwiftShader/llvmpipe/softpipe/"software"/"basic render") → **Light**: pixel ratio 0.7, no multisampling. GPUs keep **Balanced** (the original `dpr [.75, 1.25]`, antialias). Button `Graphics: Light/Balanced` switches (canvas remounts); `?quality=light|balanced` forces one. | rAF frame timing, 8 s windows, SwiftShader | 1440×900: 5.4 → **13.5 fps** baseline (median 183 → 83 ms), 5.1 → **15.8 fps** with breakdown + Effect + Decision + truck card. 390×844: 5.1 → **22.1 fps**, 6.1 → **30.9 fps**. Profile before: 97 % of time in the rasterizer, JS < 3 %. Light has visibly harder edges (no antialias). |
| F4 | KPI and Decision gauge show trucks **held** behind a blocked lane (state `blocked`), so the split sums to six | Harness: HT-01 `breakdown`, HT-03 `blocked`, controller 4 cycling / 0 parked | KPI `4 · 0 parked · 1 held · 1 down`; gauge `4 · 0 · 1 · 1` (`f4-held-truck-kpi.png`). Route runs: KPI equals controller + states and sums to 6 at every step. |
| F5 | On phones (≤760 px) the alert shows only its headline with a **Details** button; desktop unchanged | Route at 390×844 | Overlap alert × Scenarios 195×34 px → **none** at all 7 steps; `final-narrow-2-breakdown.png` |
| F8 | A failed poll marks the view STALE ("state request failed (n), retrying"); the replay log takes over only after 3 consecutive failures; after recovery the view stays stale until simulated time advances | Harness returns HTTP 503 | 3 s: `DEMO · STALE · state request failed (2), retrying · 4 s`; 8 s: `REPLAY · recorded synthetic log (stand offline)`; after release: `DEMO … every 2 s` (time had advanced by the 2.3 s sample) |

## Other checks

- `npm run build` (tsc -b + vite): PASS, existing >500 kB chunk warning.
- Route baseline → breakdown → Show effect → Decision → Smart Dispatch Apply → Why trust this? → reset at 1440×900
  and 390×844: every command acknowledged by returned state; 0 overlay overlaps, 0 off-screen, 0 low-contrast; reset clean.
- `ademix/simulator` unittest: 92 OK (includes `test_ui_distinguishes_live_demo_and_replay_and_handles_poll_errors`).
- `ademix/data` unittest: 48, the same 3 failures as before these changes (audit F6, Codex-owned, unchanged).

## Overlap with Codex's final-release work

- `IngestionLayer.tsx` and `ingestion.css` are the files Codex is verifying around; merge this branch before freezing
  the candidate and re-run the frontend build, `test_reliability.py`, live smoke and the route on Eclipse Ditto.
- `DATA_LICENSES.md` (integrator file) needs one line for the new texture under "Kenney Factory Kit": the file, URL and
  SHA-256 above. Not edited here.
- Ditto behaviour to confirm on the live stack: the STALE badge must not appear during normal 2 s publishing (sim time
  advances 40 s per publish); a stopped simulator must show STALE within ~7 s.

# Independent final audit — Professor + Claude — 2026-10-25

Candidate audited: `origin/codex/ademix` **caf6ee0** (C5 integrated). Branch `claude/final-independent-audit`.
No frontend, backend, contract, README, SUBMISSION, presentation or `main` change was made; this folder and the
`PROJECT_CONTEXT.md` lock/handoff are the only edits.

## Environment and what could not be run here

- Professor's computer: Windows 11, **no Docker and no WSL distribution**; nothing listens on `127.0.0.1:4173`.
  The OpenEgiz/Eclipse Ditto stack therefore could not be started here.
- Not run (blocked, need Ahmad's Docker host or a clean Ubuntu VM): LIVE Eclipse Ditto screenshots, repeated
  `smoke_check.py`, `verify_scenarios.py` full matrix, Docker restart test. Both scripts correctly reject demo data.
- Run instead: the exact candidate's production build (`vite build` + `vite preview` on :4174 with the `/api` proxy)
  against the real simulator engine in local demo mode (`ADEMIX_DEMO_MODE=1`, :18088). Every screenshot shows the
  **DEMO · local simulator (not via OpenEgiz)** badge; none is presented as LIVE.

## Commands actually run

```text
git fetch origin; git switch -c claude/final-independent-audit origin/codex/ademix (caf6ee0)
cd ademix/frontend && npm run build                      → PASS (tsc -b + vite; existing >500 kB chunk warning)
ADEMIX_DEMO_MODE=1 python -m uvicorn app:app --port 18088 (simulator venv, Python 3.13.13)
npx vite preview --host 127.0.0.1 --port 4174
node cdp_final.mjs http://127.0.0.1:4174/ evidence/claude-final-audit {1440 900 desk | 1024 768 mid | 390 844 narrow}
cd ademix/simulator && python -m unittest discover       → 92 tests OK
cd ademix/data && python -m unittest discover            → 48 tests, 3 FAILED (see F6)
```

`cdp_final.mjs` (headless Chrome, `--disable-gpu`, SwiftShader) walks the route with the real controls, waits for
returned twin state at each command, and at every step saves a screenshot and compares the KPI strip with the same
`/api/state` response the page received. It also checks overlay collisions, off-screen panels, contrast, the mode
badge, a 503 harness and a frozen-200 harness (both test-only Fetch interception).

## Route result (all three sizes)

| Step | Result |
|---|---|
| 1 baseline | KPI = API (production, trucks); no overlap |
| 2 HT-01 breakdown (B button) | acknowledged by returned state; alert + lane tags correct |
| 3 Show effect | Effect + truck card open; focus moves into the panel |
| 4 Decision | recommendation from evidence; no overlap |
| 5 Smart Dispatch (Apply) | "In force now (confirmed by the twins)"; policy smart in API |
| 6 Why trust this? | opens; contract content present |
| 7 reset (A) | API: baseline, fixed, no breakdown/blocked/standby, road open, blockage none |

Screenshots: `final-<desk|mid|narrow>-<1..7>.png`, face/crusher close-ups, `-api-503.png`, `-api-frozen.png`.
Raw data: `final-audit-<desk|mid|narrow>.json`.

## Software rendering (SwiftShader, no GPU, this laptop)

Renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`. Transferred 1,087 kB.
DOMContentLoaded 184 ms; canvas created 274 ms (desktop), 296 ms (mid), 3.2 s (narrow, mobile emulation).

| Size | Baseline overview | Breakdown + Effect + Decision + truck card |
|---|---|---|
| 1440×900 | 5.4 fps (median 183 ms, p95 267 ms, worst 300 ms) | 5.1 fps (median 200 ms, worst 233 ms) |
| 1024×768 | 6.1 fps (median 150 ms, worst 250 ms) | 5.6 fps (median 183 ms, worst 200 ms) |
| 390×844 | 5.1 fps | 6.1 fps |

Controls stayed responsive (every click acknowledged), but camera motion is visibly stepped at ~5 fps.
**There is no Balanced mode in the shipped view:** `GraphicsSettings.tsx` (Balanced/High) is not imported by the
dispatcher view; the canvas always uses `dpr [.75, 1.25]`, antialias on. The judge's 8-vCPU VM may differ from
this laptop; the number is an indication, not the judge's result.

## Findings (most severe first)

| # | Finding | Evidence | Owner / recommended fix |
|---|---|---|---|
| F1 | **Frozen data still shows the fresh badge** (gate 3 fail). With `/api/state` returning the same 200 body for 12 s, the badge stays "DEMO … every 2 s" (LIVE in Ditto mode) and simulated time stays 1.82 h. The UI checks only that the request succeeds. | `final-*-api-frozen.png`, `frozen` in JSON | Claude: track `mine-01.sim_time_s`; if it does not advance for >3 polls show "STALE · no new twin state for N s" and drop the live styling. |
| F2 | **Missing texture on all five plant models**: `THREE.GLTFLoader: Couldn't load texture Textures/colormap.png`. Hopper, crusher, conveyors and stairs render flat white. Gate 4 says "no missing asset". | console error in every run; `final-desk-crusher-fixed.png` | Claude: add Kenney Factory Kit `colormap.png` (CC0) as `ademix/frontend/public/models/Textures/colormap.png` and record it in DATA_LICENSES (or embed it in the GLBs). |
| F3 | **~5 fps under software rendering**, no low-quality mode (RULES_CHECKLIST 3D items unchecked). Weakest provable area for the 25-point visualization criterion. | table above | Claude: detect SwiftShader/llvmpipe via `WEBGL_debug_renderer_info` and use dpr 0.6–0.75, antialias off, shadows off; offer the Balanced/High switch; re-measure. |
| F4 | **Truck count loses held trucks**: after Smart Dispatch during a breakdown the KPI reads "4 · 0 parked · 1 down" (5 of 6). `trucks_in_cycle` excludes `blocked` trucks and the KPI has no "held" term. | step 5 desk/narrow | Claude: add "· N held" from truck states (state `blocked`) so the KPI always sums to 6. |
| F5 | **Phone: breakdown alert covers the Scenarios panel** when the haul-road text is long (195×34 px overlap, text over text). | `final-narrow-2-breakdown.png` | Claude: on phones show only the alert headline (tap to expand) or place it below the KPIs with the Scenarios panel shortened. |
| F6 | **Data reproducibility depends on the platform**: on a clean LF checkout `test_manifest_inputs_match_the_current_files` fails (manifest stores the CRLF hash `2711…`; the file is LF `a966…`, which matches upstream), and the bundle and log regeneration differ at 35.65 vs 35.66 under Python 3.13. A clean Ubuntu checkout will reproduce the first failure. | data suite output | Codex: record the LF hash; make the rounding deterministic (Decimal or round-half-even on fixed precision) and pin the Python version used for evidence. |
| F7 | **Startup transient vs headline**: a fresh stand shows "Production now 900 t/h" for the first simulated hours (ROM draw-down) next to "Expected output 770 t/h". A judge opening a fresh stand sees output above the stated limit without explanation. | `final-desk-1-baseline.png` | Codex/Claude: a short "warming up: ROM bin drawing down" note while `sim_time_s` < warm-up, or start from the documented 4 h warm state. |
| F8 | One failed poll switches the whole view to the recorded replay log (800 t/h, replay controls). It is labelled REPLAY, so it is truthful, but a single Ditto hiccup changes every number on screen. | `final-*-api-503.png`; recovery to DEMO within 5 s | Claude: require 2–3 consecutive failures, and show "Live data unavailable — retrying" before falling back. |

Checked and passing: no overlay collisions or off-screen panels at desktop and mid sizes; KPI production and down counts
equal the API at every step; reset leaves no stale state; LIVE/DEMO/REPLAY labels never mislabel the source; queued
trucks at the face are spaced nose-to-tail without overlap; contrast estimate found no text under 4.5:1.

## Rubric review (ruthless, evidence only)

| Criterion (max) | Provable now | Weakness |
|---|---|---|
| Mine model (25) | 11 Ditto twins, 38 typed relationships, Mine model view with live states (C1) | Only 5 twin types; one road twin for two lanes; crusher twin merges dump/ROM/crusher; plant/waste facilities are not twins |
| Mine visualization (25) | Spatial 3D with twin-driven trucks, lanes, Show effect, Decision | **~5 fps software rendering, missing plant texture (F2, F3)** — weakest provable area |
| Behavioral credibility (20) | FIFO, mass balance, 92 + 48 tests, cited parameters, Why trust this? | Startup transient (F7); data regeneration not platform-stable (F6) |
| Concept and presentation (15) | Concept in SUBMISSION | presentation.pdf not audited here (Codex is reconciling it) |
| What-if scenarios (10) | 3 disruptions + Smart Dispatch, propagated, reset clean | — |
| Modules (5) | Smart Dispatch with evidence-backed Apply | — |

**Weakest provable area: Mine visualization under the judge's software renderer (F2 + F3).** Fixing F1–F5 is
frontend work in Claude-owned files; F6–F7 belong to Codex.

## Still required before `main`

LIVE Eclipse Ditto route screenshots, repeated smoke, full matrix and Docker restart on Ahmad's host or clean Ubuntu;
re-run of this audit against the exact release-candidate SHA once Codex publishes it.

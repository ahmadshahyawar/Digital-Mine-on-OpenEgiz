# Software-rendering spot check

Date: 2026-10-25
Candidate: Windows release worktree before commit
Browser viewport: 1280 × 720; rendered canvas: 896 × 503

The Docker-served frontend was opened in installed Google Chrome with ANGLE forced to SwiftShader. This run is a
spot check, not a passing software-rendering acceptance gate. The browser reported:

- renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`;
- vendor: `Google Inc. (Google)`;
- the interface selected **Graphics: Light** automatically;
- frame cadence: 5.9 average frames/s, 5.5 low-5%, 30 measured intervals over five seconds;
- console errors: 0; failed HTTP responses: 0;
- the captured badge was `Eclipse Ditto · STALE · simulated time not advancing · 8 s`, so an uninterrupted LIVE route was not demonstrated.

The scene rendered without GPU acceleration, but this measured cadence and temporary STALE state do not meet a
claim of smooth uninterrupted judge-host performance. Compare this with the separately recorded interactive
Intel UHD 620 D3D11 route, which is not software-render evidence.

Reproduce with:

```powershell
$env:RUNTIME_NODE_MODULES='C:\Users\R C S\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\R C S\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' evidence/final-release/measure-software-rendering.mjs
```

Artifacts:

- `evidence/final-release/measure-software-rendering.mjs`
- `evidence/final-release/software-rendering.png`
- `evidence/final-release/software-rendering.json`


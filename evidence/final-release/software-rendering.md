# Software-rendering verification

Date: 2026-10-25  
Candidate base: `caf6ee0` plus the final-release branch changes  
Viewport and canvas: 1280 × 720

The exact Docker-served frontend was opened in installed Google Chrome with ANGLE forced to SwiftShader. The browser reported:

- renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`;
- vendor: `Google Inc. (Google)`;
- live source label present: `LIVE · Eclipse Ditto twins · every 2 s`;
- console errors: 0;
- failed HTTP responses after the stack stabilized: 0;
- headless requestAnimationFrame cadence: 2.1 average frames/s, 1.9 low-5%, 11 measured intervals over five seconds.

The low headless cadence is recorded as a limitation, not presented as interactive performance. It proves that the judge route renders and remains connected without GPU acceleration; it does not prove that every CPU-only examination host will feel smooth. Normal interactive rendering on the local in-app Chromium session remained responsive.

Reproduce with:

```powershell
$env:RUNTIME_NODE_MODULES='C:\Users\R C S\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\R C S\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' evidence/final-release/measure-software-rendering.mjs
```

Artifacts:

- `evidence/final-release/measure-software-rendering.mjs`
- `evidence/final-release/software-rendering.png`


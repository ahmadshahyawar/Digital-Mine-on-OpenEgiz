import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const runtimeModules = process.env.RUNTIME_NODE_MODULES;
if (!runtimeModules) throw new Error('RUNTIME_NODE_MODULES must point to the bundled node_modules directory');
const runtimeRequire = createRequire(pathToFileURL(path.join(runtimeModules, 'playwright-core', 'package.json')));
const { chromium } = runtimeRequire('playwright-core');

const url = process.argv[2] ?? 'http://127.0.0.1:4173/?perf=1';
const output = process.argv[3] ?? 'evidence/final-release/software-rendering.png';
const outputJson = process.argv[4] ?? 'evidence/final-release/software-rendering.json';
const executablePath = process.env.ADEMIX_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const headed = process.env.ADEMIX_HEADED === '1';

const browser = await chromium.launch({
  executablePath,
  headless: !headed,
  args: [
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-compositing',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--window-size=1280,720',
    ...(headed ? ['--window-position=-32000,-32000'] : []),
  ],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleErrors = [];
  const failedResponses = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => document.body.innerText.includes('LIVE · Eclipse Ditto twins · every 2 s'), null, { timeout: 120_000 });
  await page.waitForTimeout(12_000);
  const timing = await page.evaluate(() => new Promise(resolve => {
    const samples = [];
    let previous = performance.now();
    const started = previous;
    const collect = now => {
      const delta = (now - previous) / 1000;
      previous = now;
      if (delta > 0 && delta < 1) samples.push(delta);
      if (now - started < 5000) return requestAnimationFrame(collect);
      const ordered = [...samples].sort((a, b) => a - b);
      const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      const slow = ordered[Math.floor((ordered.length - 1) * 0.95)];
      resolve({ fpsAverage: (1 / mean).toFixed(1), fpsLow5: (1 / slow).toFixed(1), frameSamples: String(samples.length) });
    };
    requestAnimationFrame(collect);
  }));
  const result = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      title: document.title,
      renderer: gl && extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null,
      vendor: gl && extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : null,
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      liveLabel: document.body.innerText.includes('LIVE · Eclipse Ditto twins · every 2 s'),
    };
  });
  await page.screenshot({ path: output, fullPage: false });
  const evidence = { ...result, ...timing, consoleErrors, failedResponses, screenshot: output };
  fs.writeFileSync(outputJson, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  if (!result.liveLabel || !timing.fpsAverage || !result.renderer || consoleErrors.length) process.exitCode = 1;
} finally {
  await browser.close();
}

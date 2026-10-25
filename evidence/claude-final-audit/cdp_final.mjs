// Independent final audit in headless Chrome (software WebGL via SwiftShader).
// Usage: node cdp_final.mjs <url> <outDir> <width> <height> <tag> [apiBase]
// Route: baseline → HT-01 breakdown → Show effect → Decision → Smart Dispatch (Apply) → Why trust this? → reset (A).
// Each step: screenshot, KPI-vs-API comparison on the same /api/state response, overlay collisions, off-screen,
// contrast estimate, mode badge. Then: face/crusher close-ups, stale/failed-API truth checks, frame-rate samples.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [url, outDir, w = '1440', h = '900', tag = 'desk', api = 'http://127.0.0.1:18088'] = process.argv.slice(2)
const W = Number(w), H = Number(h)
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--window-size=${W},${H}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`, 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page') } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
const consoleErrors = []
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails?.exception?.description?.slice(0, 200))
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) consoleErrors.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200))
  if (m.method === 'Network.loadingFailed' && !String(m.params.errorText).includes('ERR_ABORTED')) consoleErrors.push('net: ' + m.params.errorText)
})
const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const evaluate = async expr => { const r = await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description }; return r.result?.result?.value }
const shot = async name => { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(outDir, name), Buffer.from(s.result.data, 'base64')) }
const post = (path, body) => fetch(api + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

// API fault harness (test only): pass | fail (HTTP 503) | freeze (replay one old 200 response forever).
let mode = 'pass', frozen = null
await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/state*', requestStage: 'Response' }] })
ws.addEventListener('message', async e => {
  const m = JSON.parse(e.data)
  if (m.method !== 'Fetch.requestPaused') return
  const rid = m.params.requestId
  if (mode === 'pass') {
    const b = await send('Fetch.getResponseBody', { requestId: rid })
    if (m.params.responseStatusCode === 200) frozen = b.result
    return send('Fetch.continueRequest', { requestId: rid })
  }
  if (mode === 'fail') return send('Fetch.fulfillRequest', { requestId: rid, responseCode: 503, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from('{"detail":"Ditto unavailable (test harness)"}').toString('base64') })
  return send('Fetch.fulfillRequest', { requestId: rid, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: frozen.base64Encoded ? frozen.body : Buffer.from(frozen.body).toString('base64') })
})

await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 768 })
// Instrumentation before any page script: frame times, first live badge, last /api/state body.
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__frames = []; const tick = t => { window.__frames.push(t); if (window.__frames.length > 20000) window.__frames.splice(0, 10000); requestAnimationFrame(tick) }; requestAnimationFrame(tick)
  const of = window.fetch; window.fetch = async (...a) => { const r = await of(...a); if (String(a[0]).includes('/api/state') && r.ok) r.clone().json().then(j => { window.__last = j; window.__lastAt = performance.now() }).catch(() => {}); return r }
  new MutationObserver(() => { const m = document.querySelector('#ig-mode'); if (m && !window.__firstMode) window.__firstMode = performance.now(); if (m?.classList.contains('live') && !window.__firstLive) window.__firstLive = performance.now();
    if (document.querySelector('canvas') && !window.__firstCanvas) window.__firstCanvas = performance.now() }).observe(document, { subtree: true, childList: true, attributes: true })` })

await post('/api/dispatch', { policy: 'fixed' }); await post('/api/scenario', { scenario: 'baseline' })
await send('Page.navigate', { url })
await sleep(12000)

const AUDIT = `
const SEL = ['.ig-title', '.ig-kpis', '.ig-views', '.ig-layers', '.ig-stack', '.ig-rstack', '.ig-breakdown-alert', '.ig-guide', '.ig-bar', '.ig-key']
const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' ? r : null }
const boxes = SEL.flatMap(s => [...document.querySelectorAll(s)].map(el => ({ s, r: vis(el) })).filter(b => b.r))
const overlaps = []
for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
  const a = boxes[i].r, b = boxes[j].r, x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  if (x > 2 && y > 2 && !(boxes[i].s === '.ig-views' && boxes[j].s === '.ig-layers')) overlaps.push(boxes[i].s + ' × ' + boxes[j].s + ' ' + Math.round(x) + '×' + Math.round(y))
}
const offscreen = boxes.filter(b => b.r.left < -1 || b.r.top < -1 || b.r.right > innerWidth + 1 || b.r.bottom > innerHeight + 1).map(b => b.s)
const parse = c => { const m = c.match(/[\\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 } }
const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b) }
const mix = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 })
const low = []
for (const el of document.querySelectorAll(SEL.join(',') + ' *')) {
  if (!vis(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue
  const chain = []; for (let p = el; p; p = p.parentElement) chain.push(parse(getComputedStyle(p).backgroundColor))
  let bg = { r: 200, g: 160, b: 112, a: 1 }; for (const c of chain.reverse()) if (c.a > 0) bg = mix(c, bg)
  const fg = mix(parse(getComputedStyle(el).color), bg), L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05)
  const size = parseFloat(getComputedStyle(el).fontSize)
  if (ratio < 4.5 || size < 9.5) low.push({ text: el.textContent.trim().slice(0, 40), ratio: +ratio.toFixed(2), size })
}
// KPI strip against the same /api/state response the page last received.
const t = Object.fromEntries((window.__last?.twins ?? []).map(x => [x.thingId.split(':')[1], Object.fromEntries(Object.entries(x.features).map(([k, v]) => [k, v.properties.value]))]))
const states = [1, 2, 3, 4, 5, 6].map(i => t['truck-0' + i]?.state)
const kpis = [...document.querySelectorAll('.ig-kpis > div')].map(d => d.innerText.replace(/\\s+/g, ' '))
const api = { tph: t['mine-01']?.throughput_tph, bottleneck: t['mine-01']?.bottleneck_live, parked: states.filter(s => s === 'standby').length, held: states.filter(s => s === 'blocked').length, down: states.filter(s => s === 'breakdown').length,
  scenario: t['scenario-controller']?.active, policy: t['scenario-controller']?.dispatch_policy, simH: +(t['mine-01']?.sim_time_s / 3600).toFixed(3),
  faceWait: t['excavator-01']?.average_wait_min, crusherWait: t['crusher-01']?.average_wait_min, blockage: t['road-main']?.blockage_lane, blocked: t['road-main']?.blocked_trucks }
const cyc = 6 - api.parked - api.held - api.down
const numberChecks = { production: kpis[0]?.includes(String(Math.round(api.tph))), trucks: kpis[2]?.startsWith('Trucks working · parked ' + cyc + ' · ' + api.parked + ' parked'),
  held: api.held ? kpis[2]?.includes(api.held + ' held') : !kpis[2]?.includes('held'), down: api.down ? kpis[2]?.includes(api.down + ' down') : !kpis[2]?.includes('down') }
return { overlaps, offscreen, lowContrast: low.slice(0, 12), lowCount: low.length, kpis, api, numberChecks,
  mode: document.querySelector('#ig-mode')?.innerText, alert: document.querySelector('.ig-breakdown-alert')?.innerText.replace(/\\s+/g, ' ').slice(0, 220) ?? null,
  laneTags: [...document.querySelectorAll('.ig-lane-tag')].map(e => e.innerText),
  open: [...document.querySelectorAll('.ig-rstack > section')].map(s => s.getAttribute('aria-label')) }`

const report = { url, size: `${W}x${H}`, steps: [] }
const step = async (name, wait = 2200) => { await sleep(wait); await shot(`final-${tag}-${name}.png`); const a = await evaluate(AUDIT); report.steps.push({ step: name, ...a }); return a }
const until = async (expr, ms = 30000) => { for (let k = 0; k < ms / 500; k++) { if (await evaluate(`return !!(${expr})`)) return true; await sleep(500) } return false }

// Load timing and renderer.
report.load = await evaluate(`const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl')
  const dbg = gl?.getExtension('WEBGL_debug_renderer_info')
  return { renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER), vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null,
    domContentLoadedMs: Math.round(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd), loadMs: Math.round(performance.getEntriesByType('navigation')[0]?.loadEventEnd),
    firstCanvasMs: Math.round(window.__firstCanvas), firstLiveBadgeMs: Math.round(window.__firstLive), transferredKB: Math.round(performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
    devicePixelRatio, canvasPx: [...document.querySelectorAll('canvas')].map(c => c.width + 'x' + c.height) }`)
const fps = async (label, ms = 8000) => {
  const r = await evaluate(`const a = window.__frames.length; await new Promise(r => setTimeout(r, ${ms})); const f = window.__frames.slice(a); const d = f.slice(1).map((x, i) => x - f[i]).sort((p, q) => p - q)
    return { frames: f.length, fps: +(f.length / (${ms} / 1000)).toFixed(1), medianMs: +(d[Math.floor(d.length / 2)] ?? 0).toFixed(1), p95Ms: +(d[Math.floor(d.length * .95)] ?? 0).toFixed(1), worstMs: +(d[d.length - 1] ?? 0).toFixed(0) }`)
  ;(report.fps ??= []).push({ label, ...r })
}

await step('1-baseline')
await fps('baseline overview')
await evaluate(`document.querySelector('#ig-view-face').click()`); await sleep(3500); await shot(`final-${tag}-face-fixed.png`)
await evaluate(`document.querySelector('#ig-view-crusher').click()`); await sleep(3500); await shot(`final-${tag}-crusher-fixed.png`)
await evaluate(`document.querySelector('#ig-view-overview').click()`)
await evaluate(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('Truck HT-01 breakdown')).click()`)
report.breakdownAck = await until(`document.querySelector('#ig-show-effect')`)
await step('2-breakdown', 3000)
await evaluate(`document.querySelector('#ig-show-effect').click()`)
await step('3-show-effect', 3000)
await evaluate(`document.querySelector('#ig-open-decision').click()`)
await step('4-decision')
await fps('breakdown + Effect + Decision + truck card open')
const apply = await evaluate(`const b = document.querySelector('.ig-reco-actions button'); const t = b?.innerText; b?.click(); return t ?? null`)
report.applyButton = apply
report.smartAck = await until(`document.querySelector('.ig-reco-actions')?.innerText.includes('In force now')`)
await step('5-smart-dispatch', 4000)
await evaluate(`const d = document.querySelector('#ig-why-trust'); d.open = true; d.scrollIntoView({ block: 'start' })`)
await step('6-why-trust')
await evaluate(`document.querySelector('#ig-view-face').click()`); await sleep(3500); await shot(`final-${tag}-face-smart-breakdown.png`)
await evaluate(`document.querySelector('#ig-wi-a').click()`)
report.resetAck = await until(`document.querySelector('#ig-wi-a')?.classList.contains('on') && !document.querySelector('.ig-breakdown-alert')`)
await evaluate(`document.querySelector('#ig-view-overview').click()`)
await step('7-reset', 6000)
const stateNow = await (await fetch(api + '/api/state')).json()
const tw = Object.fromEntries(stateNow.twins.map(x => [x.thingId.split(':')[1], Object.fromEntries(Object.entries(x.features).map(([k, v]) => [k, v.properties.value]))]))
report.afterReset = { scenario: tw['scenario-controller'].active, policy: tw['scenario-controller'].dispatch_policy, states: [1, 2, 3, 4, 5, 6].map(i => tw['truck-0' + i].state),
  blockage: tw['road-main'].blockage_lane, blocked: tw['road-main'].blocked_trucks, roadState: tw['road-main'].state, standby: tw['scenario-controller'].trucks_standby }

// Truth under failure (test harness): 503 → badge must leave LIVE/DEMO; frozen 200 → does the badge stay LIVE?
mode = 'fail'; await sleep(5000)
report.failure = { mode: await evaluate(`return document.querySelector('#ig-mode')?.innerText`), kpis: await evaluate(`return document.querySelector('.ig-kpis')?.innerText.replace(/\\s+/g, ' ')`) }
await shot(`final-${tag}-api-503.png`)
mode = 'pass'; await sleep(5000)
report.recovered = await evaluate(`return document.querySelector('#ig-mode')?.innerText`)
mode = 'freeze'; const simA = await evaluate(`return window.__last?.twins?.find(t => t.thingId.endsWith('mine-01'))?.features.sim_time_s.properties.value`)
await sleep(12000)
report.frozen = { mode: await evaluate(`return document.querySelector('#ig-mode')?.innerText`), simTimeAtFreeze: simA,
  simTimeShown: await evaluate(`return document.querySelector('.ig-bar')?.innerText.replace(/\\s+/g, ' ')`) }
await shot(`final-${tag}-api-frozen.png`)
mode = 'pass'
report.consoleErrors = [...new Set(consoleErrors)].slice(0, 30)
await post('/api/dispatch', { policy: 'fixed' }); await post('/api/scenario', { scenario: 'baseline' })
writeFileSync(join(outDir, `final-audit-${tag}.json`), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ load: report.load, fps: report.fps, acks: [report.breakdownAck, report.smartAck, report.resetAck], apply: report.applyButton, afterReset: report.afterReset,
  failure: report.failure, recovered: report.recovered, frozen: report.frozen, errors: report.consoleErrors,
  steps: report.steps.map(s => ({ step: s.step, overlaps: s.overlaps, off: s.offscreen, low: s.lowCount, num: s.numberChecks, mode: s.mode, open: s.open })) }, null, 1))
ws.close(); chrome.kill(); process.exit(0)

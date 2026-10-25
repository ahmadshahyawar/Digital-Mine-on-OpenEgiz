// Bounded live-route check for the final OpenEgiz candidate.
// Exercises the judge route in headless Chrome and fails if the normal route ever leaves LIVE state.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

const url = process.argv[2] ?? 'http://127.0.0.1:4173/'
const api = process.argv[3] ?? 'http://127.0.0.1:8088'
const output = process.argv[4] ?? 'evidence/final-release/live-route.json'
const port = 9810 + Math.floor(Math.random() * 80)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  `--remote-debugging-port=${port}`, '--window-size=1280,720',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ademix-route-'))}`, 'about:blank',
], { stdio: 'ignore' })

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let socket
let messageId = 0
const pending = new Map()
const errors = []
const send = (method, params = {}) => new Promise(resolve => {
  const id = ++messageId
  const timer = setTimeout(() => {
    pending.delete(id)
    resolve({ error: `DevTools call timed out: ${method}` })
  }, 15_000)
  pending.set(id, message => { clearTimeout(timer); resolve(message) })
  socket.send(JSON.stringify({ id, method, params }))
})
const evaluate = async expression => {
  const response = await send('Runtime.evaluate', {
    expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true,
  })
  if (response.error) throw new Error(response.error)
  if (response.result?.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description ?? 'Browser evaluation failed')
  return response.result?.result?.value
}
const until = async (expression, timeoutMs = 30_000) => {
  for (let elapsed = 0; elapsed < timeoutMs; elapsed += 500) {
    if (await evaluate(`return Boolean(${expression})`)) return true
    await sleep(500)
  }
  return false
}
const post = async (path, body) => {
  const response = await fetch(api + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`)
}

const screenshotDir = join(dirname(output), 'live-route')
const screenshots = []
const capture = async name => {
  const response = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  if (response.error || !response.result?.data) throw new Error(`Could not capture ${name} screenshot`)
  mkdirSync(screenshotDir, { recursive: true })
  const path = join(screenshotDir, `${name}.png`)
  writeFileSync(path, Buffer.from(response.result.data, 'base64'))
  screenshots.push(path)
}

const result = { url, renderer: null, quality: null, acknowledgements: {}, modes: [], stateResponses: [], longTasks: [], screenshots, consoleErrors: errors, reset: null, runError: null }
try {
  let target
  for (let attempt = 0; attempt < 100 && !target; attempt++) {
    await sleep(200)
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(item => item.type === 'page') } catch {}
  }
  if (!target) throw new Error('Chrome DevTools endpoint did not start')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise(resolve => socket.addEventListener('open', resolve))
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message)
      pending.delete(message.id)
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails?.exception?.description ?? 'Runtime exception')
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ').slice(0, 300))
    }
    if (message.method === 'Network.loadingFailed' && !String(message.params.errorText).includes('ERR_ABORTED')) {
      errors.push(`Network: ${message.params.errorText}`)
    }
  })
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Page.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__ademixModes = [];
    window.__ademixStateResponses = [];
    window.__ademixLongTasks = [];
    try {
      new PerformanceObserver(list => window.__ademixLongTasks.push(...list.getEntries().map(entry => ({
        at: Math.round(entry.startTime), duration: Math.round(entry.duration),
      })))).observe({ type: 'longtask', buffered: true });
    } catch {}
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      if (!String(args[0]).includes('/api/state')) return originalFetch(...args);
      const at = Math.round(performance.now());
      try {
        const response = await originalFetch(...args);
        const payload = await response.clone().json().catch(() => null);
        const mine = payload?.twins?.find(twin => twin.thingId?.endsWith(':mine-01'));
        window.__ademixStateResponses.push({ at, duration: Math.round(performance.now() - at), status: response.status,
          simTime: mine?.features?.sim_time_s?.properties?.value ?? null });
        return response;
      } catch (error) {
        window.__ademixStateResponses.push({ at, duration: Math.round(performance.now() - at), status: 'error' });
        throw error;
      }
    };
    const record = () => {
      const element = document.querySelector('#ig-mode');
      if (!element) return;
      const item = { at: Math.round(performance.now()), className: element.className, text: element.innerText };
      const last = window.__ademixModes.at(-1);
      if (!last || last.className !== item.className || last.text !== item.text) window.__ademixModes.push(item);
    };
    new MutationObserver(record).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
    setInterval(record, 250);
  ` })

  await post('/api/dispatch', { policy: 'fixed' })
  await post('/api/scenario', { scenario: 'baseline' })
  await send('Page.navigate', { url })
  result.acknowledgements.initialLive = await until(`document.querySelector('#ig-mode')?.classList.contains('live')`, 120_000)
  await sleep(12_000)
  result.renderer = await evaluate(`
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl && extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER) ?? null
  `)
  result.quality = await evaluate(`return document.querySelector('#ig-quality')?.innerText ?? null`)
  if (process.env.ADEMIX_CAPTURE_SCREENSHOTS !== '0') await capture('01-baseline')

  await evaluate(`document.querySelector('#ig-view-overview')?.click()`)
  await evaluate(`[...document.querySelectorAll('button')].find(button => button.innerText.includes('Truck HT-01 breakdown'))?.click()`)
  result.acknowledgements.breakdown = await until(`document.querySelector('#ig-show-effect')`)
  await evaluate(`document.querySelector('#ig-show-effect')?.click()`)
  await sleep(2500)
  if (process.env.ADEMIX_CAPTURE_SCREENSHOTS !== '0') await capture('02-breakdown-effect')
  await evaluate(`document.querySelector('#ig-open-decision')?.click()`)
  await sleep(2500)
  await evaluate(`document.querySelector('.ig-reco-actions button')?.click()`)
  result.acknowledgements.smart = await until(`document.querySelector('.ig-reco-actions')?.innerText.includes('In force now')`)
  if (process.env.ADEMIX_CAPTURE_SCREENSHOTS !== '0') await capture('03-smart-response')
  await evaluate(`const details = document.querySelector('#ig-why-trust'); if (details) details.open = true`)
  await sleep(3000)
  if (process.env.ADEMIX_CAPTURE_SCREENSHOTS !== '0') await capture('04-model-trust')
  await evaluate(`document.querySelector('#ig-wi-a')?.click()`)
  result.acknowledgements.reset = await until(`document.querySelector('#ig-wi-a')?.classList.contains('on') && !document.querySelector('.ig-breakdown-alert')`)
  await evaluate(`document.querySelector('#ig-view-overview')?.click()`)
  await sleep(10_000)
  if (process.env.ADEMIX_CAPTURE_SCREENSHOTS !== '0') await capture('05-reset-overview')

  result.modes = await evaluate(`return window.__ademixModes ?? []`)
  result.stateResponses = await evaluate(`return window.__ademixStateResponses ?? []`)
  result.longTasks = await evaluate(`return window.__ademixLongTasks ?? []`)
  const stateResponse = await fetch(api + '/api/state')
  const state = await stateResponse.json()
  if (!stateResponse.ok || !Array.isArray(state.twins)) {
    result.reset = { source: state.source ?? null, apiStatus: stateResponse.status, apiError: state.detail ?? 'Missing twins array' }
  } else {
    const twins = Object.fromEntries(state.twins.map(twin => [twin.thingId.split(':')[1], Object.fromEntries(Object.entries(twin.features).map(([key, value]) => [key, value.properties.value]))]))
    result.reset = {
      source: state.source,
      scenario: twins['scenario-controller']?.active,
      policy: twins['scenario-controller']?.dispatch_policy,
      blockage: twins['road-main']?.blockage_lane,
      staleBadgeSeen: result.modes.some(mode => mode.className.includes('stale') || mode.text.includes('STALE')),
    }
  }
} catch (error) {
  result.runError = String(error)
} finally {
  try { await post('/api/dispatch', { policy: 'fixed' }); await post('/api/scenario', { scenario: 'baseline' }) } catch {}
  if (socket) socket.close()
  chrome.kill()
}

const acknowledgementsPass = Object.values(result.acknowledgements).every(Boolean)
const resetPass = result.reset?.source === 'eclipse-ditto' && result.reset?.scenario === 'baseline' && result.reset?.policy === 'fixed' && result.reset?.blockage === 'none'
const firstLiveIndex = result.modes.findIndex(mode => mode.className.includes('live'))
const postLiveModes = firstLiveIndex < 0 ? [] : result.modes.slice(firstLiveIndex)
const modePass = !result.reset?.staleBadgeSeen && postLiveModes.length > 0 && postLiveModes.every(mode => mode.className.includes('live'))
result.badgeCheck = { firstLiveIndex, checkedTransitionsAfterFirstLive: postLiveModes.length, passed: modePass }
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(result, null, 2))
if (result.runError || !acknowledgementsPass || !resetPass || !modePass || !result.quality || errors.length) process.exitCode = 1

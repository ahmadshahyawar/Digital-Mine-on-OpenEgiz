import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Twin } from './MineScene'
import { TerrainStage, haulRoadPoint } from './TerrainStage'
import './ingestion.css'

type Row = Record<string, string>
type Spec = { parameter_id: string; value: number | null; unit: string; status: string; source: string; notes: string }
type Log = { label: string; columns: string[]; rows: (string | number | null)[][] }
type Bundle = {
  note: string
  sources: { id: Tab; title: string; origin: string; records: number; unit: string; kind: string }[]
  equipment: { asset: string; kind: string; specs: Spec[] }[]
  source_fleet: Row[]
  sensors: Row[]
  topology: {
    status: string
    nodes: { id: string; label: string; type: string; twin: string }[]
    traffic_rules: string[]
    visual_pit_geometry: Record<string, string | number | number[]>
    not_available: string[]
  }
  route_summary: Row[]
  route_distances: number[]
  logs: Record<string, Log>
  provenance: { generator: string; inputs_sha256: Record<string, string>; outputs: Record<string, { sha256: string; rows: number }> }
}
type Tab = 'specs' | 'logs' | 'sensors' | 'topology'

const STATUS_LABEL: Record<string, string> = {
  sourced: 'Sourced', derived: 'Derived', assumption: 'Team assumption', scenario_input: 'Scenario input',
  synthetic: 'Synthetic', model_setting: 'Model setting', required_input: 'Required input',
}
const SIGNALS = [
  { key: 'mine-01.throughput_tph', label: 'Crusher throughput (rolling hour)', unit: 't/h' },
  { key: 'crusher-01.rom_inventory_t', label: 'ROM bin level', unit: 't' },
  { key: 'excavator-01.queue_length', label: 'Trucks queued at the face', unit: 'trucks' },
  { key: 'truck-01.speed_kmh', label: 'HT-01 speed', unit: 'km/h' },
  { key: 'truck-01.payload_t', label: 'HT-01 payload', unit: 't' },
  { key: 'truck-01.fuel_pct', label: 'HT-01 fuel level (synthetic)', unit: '%' },
]
// Scene anchors: road progress 0 = crusher at the rim, 1 = loading face on the pit floor.
const ANCHORS: Record<string, { progress: number; lift: number; tab: Tab; asset?: string }> = {
  loading_face: { progress: 1, lift: 7, tab: 'specs', asset: 'Excavator EX-01' },
  haul_road: { progress: .5, lift: 5, tab: 'topology' },
  dump_bay: { progress: 0, lift: 9, tab: 'specs', asset: 'Crusher dump bay' },
}
const fmt = (value: number | null, digits = 2) => value === null ? '—' : Number(value.toFixed(digits)).toLocaleString()
const titleCase = (id: string) => id.replace(/_/g, ' ').replace(/\b(t|tph|kmh|lph|pct|min)\b/g, '').replace(/\s+/g, ' ').trim()

function rowToTwins(log: Log, row: (string | number | null)[]): Twin[] {
  const things: Record<string, Twin> = {}
  log.columns.forEach((column, index) => {
    if (column === 'time_s') return
    const [name, feature] = column.split('.')
    const kind = name.startsWith('truck') ? 'haul-truck' : name.split('-')[0]
    things[name] ??= { thingId: `org.openegiz.ademix:${name}`, attributes: { kind, name }, features: {} } as Twin
    things[name].features![feature] = { properties: { value: row[index] as string | number } }
  })
  return Object.values(things).sort((a, b) => a.thingId.localeCompare(b.thingId))
}

function Chip({ status }: { status: string }) {
  return <span className={`ig-chip ig-${status}`}>{STATUS_LABEL[status] || status}</span>
}

function TopologyMarkers({ onSelect, active }: { onSelect: (tab: Tab, asset?: string) => void; active: string }) {
  const markers = React.useMemo(() => Object.entries(ANCHORS).map(([id, anchor]) => ({
    id, anchor, point: haulRoadPoint(anchor.progress).add(new THREE.Vector3(0, anchor.lift, 0)),
  })), [])
  const labels: Record<string, string> = { loading_face: 'Loading face · EX-01', haul_road: 'Haul road · 3.2 km single lane', dump_bay: 'Dump bay → ROM bin → Crusher' }
  return <group>
    {markers.map(({ id, anchor, point }) => <group key={id} position={point}>
      <mesh><sphereGeometry args={[.7, 16, 12]}/><meshBasicMaterial color={active === id ? '#ffe36e' : '#4fd1c5'}/></mesh>
      <mesh position={[0, -anchor.lift / 2, 0]}><cylinderGeometry args={[.07, .07, anchor.lift, 6]}/><meshBasicMaterial color="#4fd1c5"/></mesh>
      <Html center distanceFactor={70} position={[0, 2.2, 0]}>
        <button className={`ig-node ${active === id ? 'on' : ''}`} onClick={() => onSelect(anchor.tab, anchor.asset ?? id)}>{labels[id]}</button>
      </Html>
    </group>)}
  </group>
}

function Sparkline({ log, signal, cursor }: { log: Log; signal: string; cursor: number }) {
  const index = log.columns.indexOf(signal)
  const values = log.rows.map(row => Number(row[index]))
  const times = log.rows.map(row => Number(row[0]) / 3600)
  const width = 320, height = 120, left = 34, bottom = 18
  const max = Math.max(1, ...values) * 1.08
  const x = (t: number) => left + (t / times[times.length - 1]) * (width - left - 6)
  const y = (v: number) => (height - bottom) - (v / max) * (height - bottom - 8)
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(times[i]).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const switchX = x(4)
  return <svg className="ig-spark" viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`${signal} over time`}>
    {[0, .5, 1].map(f => <g key={f}><line x1={left} x2={width - 6} y1={y(max * f / 1.08)} y2={y(max * f / 1.08)} className="ig-grid"/>
      <text x={left - 4} y={y(max * f / 1.08) + 3} textAnchor="end" className="ig-tick">{fmt(max * f / 1.08, 0)}</text></g>)}
    <line x1={switchX} x2={switchX} y1={6} y2={height - bottom} className="ig-switch"/>
    <text x={switchX + 3} y={14} className="ig-tick">scenario starts</text>
    <path d={path} className="ig-line"/>
    <line x1={x(times[cursor])} x2={x(times[cursor])} y1={6} y2={height - bottom} className="ig-cursor"/>
    <circle cx={x(times[cursor])} cy={y(values[cursor])} r={3.2} className="ig-dot"/>
    {[0, 4, 8, 13].map(h => <text key={h} x={x(h)} y={height - 4} textAnchor="middle" className="ig-tick">{h} h</text>)}
  </svg>
}

function RouteHistogram({ distances, route }: { distances: number[]; route: number }) {
  const bins = [0, 2.5, 5, 7.5, 10, 15, 20, 36]
  const counts = bins.slice(0, -1).map((b, i) => distances.filter(d => d >= b && d < bins[i + 1]).length)
  const width = 320, height = 110, max = Math.max(...counts)
  const bw = (width - 20) / counts.length
  const routeBin = bins.findIndex((b, i) => route >= b && route < bins[i + 1])
  return <svg className="ig-spark" viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="OpenMines load-to-dump distance distribution">
    {counts.map((c, i) => <g key={i}>
      <rect x={10 + i * bw + 3} y={86 - (c / max) * 66} width={bw - 6} height={(c / max) * 66} rx={3} className={i === routeBin ? 'ig-bar-on' : 'ig-bar'}/>
      <text x={10 + i * bw + bw / 2} y={86 - (c / max) * 66 - 4} textAnchor="middle" className="ig-tick">{c}</text>
      <text x={10 + i * bw + bw / 2} y={100} textAnchor="middle" className="ig-tick">{bins[i]}–{bins[i + 1]}</text>
    </g>)}
    <text x={width - 10} y={10} textAnchor="end" className="ig-tick">km · highlighted bin holds the 3.2 km model route</text>
  </svg>
}

export function IngestionLayer() {
  const [bundle, setBundle] = React.useState<Bundle | null>(null)
  const [error, setError] = React.useState('')
  const [tab, setTab] = React.useState<Tab>('specs')
  const [asset, setAsset] = React.useState('Haul truck HT-01…06')
  const [scenario, setScenario] = React.useState('truck_breakdown')
  const [cursor, setCursor] = React.useState(48)
  const [playing, setPlaying] = React.useState(false)
  const [signal, setSignal] = React.useState(SIGNALS[0].key)

  React.useEffect(() => {
    fetch('/data/ingestion.json').then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setBundle).catch(reason => setError(String(reason)))
  }, [])
  const log = bundle?.logs[scenario]
  React.useEffect(() => {
    if (!playing || !log) return
    const timer = window.setInterval(() => setCursor(c => (c + 1) % log.rows.length), 700)
    return () => window.clearInterval(timer)
  }, [playing, log])

  if (error) return <div className="ig-root ig-center">Could not load the ingestion data ({error}). Run <code>python ademix/data/build_data_layer.py</code>.</div>
  if (!bundle || !log) return <div className="ig-root ig-center">Loading data & asset sources…</div>

  const row = log.rows[cursor]
  const at = (key: string) => row[log.columns.indexOf(key)]
  const twins = rowToTwins(log, row)
  const hours = Number(row[0]) / 3600
  const select = (next: Tab, nextAsset?: string) => { setTab(next); if (nextAsset && bundle.equipment.some(e => e.asset === nextAsset)) setAsset(nextAsset) }
  const equipment = bundle.equipment.find(e => e.asset === asset) ?? bundle.equipment[0]
  const route = bundle.route_summary.find(r => r.matrix === 'l2d_road_matrix')!
  const activeAnchor = Object.entries(ANCHORS).find(([, a]) => a.asset === asset)?.[0] ?? (tab === 'topology' ? 'haul_road' : '')

  return <main className="ig-root">
    <header className="ig-head">
      <div>
        <span className="ig-eyebrow">LAYER 1 · DATA &amp; ASSET INGESTION</span>
        <h1>North Pit data foundation</h1>
        <p>{bundle.note}</p>
      </div>
      <div className="ig-legend" aria-label="Value status legend">
        {['sourced', 'derived', 'assumption', 'synthetic', 'required_input'].map(s => <Chip key={s} status={s}/>)}
      </div>
    </header>

    <section className="ig-sources" aria-label="Ingested sources">
      {bundle.sources.map(source => <button key={source.id} className={`ig-source ${tab === source.id ? 'on' : ''}`} onClick={() => setTab(source.id)}>
        <span className="ig-source-kind"><Chip status={source.kind === 'mixed' ? 'derived' : source.kind}/></span>
        <b>{source.title}</b>
        <span className="ig-big">{source.records.toLocaleString()} <small>{source.unit}</small></span>
        <small>{source.origin}</small>
      </button>)}
    </section>

    <section className="ig-work">
      <div className="ig-viewport">
        <Canvas camera={{ position: [92, 72, 98], fov: 42 }} dpr={[.75, 1.25]} gl={{ antialias: true, powerPreference: 'low-power', toneMapping: THREE.ACESFilmicToneMapping }}>
          <TerrainStage showRoads showEquipment showPlant moving twins={twins}/>
          <TopologyMarkers onSelect={select} active={activeAnchor}/>
        </Canvas>
        <div className="ig-replay">
          <div className="ig-replay-row">
            <button className="ig-play" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? '❚❚' : '▶'}</button>
            <label className="ig-select">Log
              <select id="ig-scenario" value={scenario} onChange={e => setScenario(e.target.value)}>
                {Object.entries(bundle.logs).map(([id, l]) => <option key={id} value={id}>{l.label}</option>)}
              </select>
            </label>
            <span className="ig-clock">t = {hours.toFixed(2)} h · {hours < 4 ? 'normal operations' : log.label}</span>
          </div>
          <input id="ig-time" type="range" min={0} max={log.rows.length - 1} value={cursor} onChange={e => setCursor(Number(e.target.value))} aria-label="Replay time"/>
          <div className="ig-readouts">
            <span>Throughput <b>{fmt(Number(at('mine-01.throughput_tph')), 0)}</b> t/h</span>
            <span>ROM bin <b>{fmt(Number(at('crusher-01.rom_inventory_t')), 0)}</b> t</span>
            <span>Face queue <b>{String(at('excavator-01.queue_length'))}</b></span>
            <span>Road <b>{String(at('road-main.state'))}</b></span>
            <span>HT-01 <b>{String(at('truck-01.state')).replace(/_/g, ' ')}</b></span>
          </div>
        </div>
        <div className="ig-hint">Historical telemetry replay drives the 3D fleet · click a marker for its data · drag to orbit</div>
      </div>

      <section className="ig-panel">
        <nav className="ig-tabs" aria-label="Ingestion data views">
          {([['specs', 'Specifications'], ['logs', 'Telemetry logs'], ['sensors', 'IoT sensors'], ['topology', 'Topology']] as [Tab, string][]).map(([id, label]) =>
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
        </nav>

        {tab === 'specs' && <div className="ig-body">
          <div className="ig-assets">{bundle.equipment.map(e => <button key={e.asset} className={e.asset === asset ? 'on' : ''} onClick={() => setAsset(e.asset)}>{e.asset}</button>)}</div>
          <table className="ig-table">
            <thead><tr><th>Parameter</th><th>Value</th><th>Status</th></tr></thead>
            <tbody>{equipment.specs.map(spec => <tr key={spec.parameter_id} title={spec.notes}>
              <td>{titleCase(spec.parameter_id)}<small>{spec.source}</small></td>
              <td className="ig-num">{spec.value === null ? <em>not available</em> : <>{fmt(spec.value)} <small>{spec.unit}</small></>}</td>
              <td><Chip status={spec.status}/></td>
            </tr>)}</tbody>
          </table>
          {equipment.specs.some(s => s.status === 'required_input') && <p className="ig-callout">Fuel consumption is not in any source the team holds. The formula is ready (power × load factor × specific fuel consumption ÷ fuel density); a manufacturer or site figure is needed before fuel can be used in results.</p>}
          <h3>OpenMines source fleet</h3>
          <div className="ig-scroll"><table className="ig-table">
            <thead><tr><th>Class</th><th>Unit</th><th>Count</th><th>Capacity t</th><th>Cycle min</th></tr></thead>
            <tbody>{bundle.source_fleet.map(r => <tr key={r.unit} className={r.used_by_ademix === 'yes' ? 'ig-used' : ''}>
              <td>{r.equipment_class.replace('_', ' ')}</td><td>{r.unit.replace('NorthPitMine-', '')}</td><td className="ig-num">{r.count}</td>
              <td className="ig-num">{r.capacity_t || '—'}</td><td className="ig-num">{r.cycle_time_min || '—'}</td>
            </tr>)}</tbody>
          </table></div>
          <small className="ig-foot">Highlighted rows are the units the Ademix model uses.</small>
        </div>}

        {tab === 'logs' && <div className="ig-body">
          <label className="ig-select">Signal
            <select id="ig-signal" value={signal} onChange={e => setSignal(e.target.value)}>
              {SIGNALS.map(s => <option key={s.key} value={s.key}>{s.label} ({s.unit})</option>)}
            </select>
          </label>
          <Sparkline log={log} signal={signal} cursor={cursor}/>
          <p className="ig-muted">{log.rows.length} samples every 5 simulated minutes · {log.columns.length - 1} signals in this view · 120 in the full CSV. Synthetic output of the deterministic simulator (seed 42), regenerated byte for byte by the build script.</p>
          <table className="ig-table">
            <thead><tr><th>Log file</th><th>Rows</th><th>SHA-256</th></tr></thead>
            <tbody>{Object.entries(bundle.provenance.outputs).filter(([p]) => p.startsWith('telemetry/logs/')).map(([p, info]) =>
              <tr key={p}><td>{p.replace('telemetry/logs/', '')}</td><td className="ig-num">{info.rows}</td><td><code>{info.sha256.slice(0, 12)}…</code></td></tr>)}</tbody>
          </table>
        </div>}

        {tab === 'sensors' && <div className="ig-body">
          <p className="ig-muted">Each simulated sensor publishes every second (20 simulated seconds) to MQTT <code>telemetry/&lt;thing&gt;</code>; OpenEgiz maps the message into the Eclipse Ditto twin's features.</p>
          <ul className="ig-sensors">{bundle.sensors.map(s => <li key={s.sensor_id}>
            <div><b>{s.sensor_type}</b> <span className="ig-tag">{s.asset_kind}</span></div>
            <small>{s.real_world_equivalent}</small>
            <code>{s.features.split('|').slice(0, 4).join(', ')}{s.features.split('|').length > 4 ? ' …' : ''}</code>
            <small className="ig-impl">{s.implementation}</small>
          </li>)}</ul>
        </div>}

        {tab === 'topology' && <div className="ig-body">
          <svg className="ig-flow" viewBox="0 0 330 92" width="100%" role="img" aria-label="Haulage network">
            {[['Loading face', '1 server · 6 min', 4], ['Haul road', '3.2 km · 1 lane', 88], ['Dump bay', '1 server · 1 min', 172], ['ROM → crusher', '600 t · 900 t/h', 256]].map(([label, sub, x]) =>
              <g key={label as string}><rect x={x as number} y={20} width={70} height={46} rx={7} className="ig-box"/>
                <text x={(x as number) + 35} y={40} textAnchor="middle" className="ig-box-t">{label}</text>
                <text x={(x as number) + 35} y={56} textAnchor="middle" className="ig-tick">{sub}</text></g>)}
            {[74, 158, 242].map(x => <path key={x} d={`M${x},43 L${x + 14},43`} className="ig-arrow"/>)}
            <text x={165} y={84} textAnchor="middle" className="ig-tick">empty trucks return along the same lane</text>
          </svg>
          <ul className="ig-rules">{bundle.topology.traffic_rules.map(r => <li key={r}>{r}</li>)}</ul>
          <h3>Route length against the source</h3>
          <RouteHistogram distances={bundle.route_distances} route={3.2}/>
          <p className="ig-muted">OpenMines load-to-dump distances: median {route.median} km, interquartile {route.q1}–{route.q3} km. The 3.2 km model route is at or below only {route.pct_of_source_routes_at_or_below_ademix} % of them.</p>
          <h3>3D pit geometry <small>(scene units, not survey)</small></h3>
          <table className="ig-table"><tbody>{Object.entries(bundle.topology.visual_pit_geometry).filter(([k]) => !['units', 'source'].includes(k)).map(([k, v]) =>
            <tr key={k}><td>{k.replace(/_/g, ' ')}</td><td className="ig-num">{Array.isArray(v) ? v.join(' × ') : String(v)}</td></tr>)}</tbody></table>
          <h3>Not available</h3>
          <ul className="ig-rules">{bundle.topology.not_available.map(r => <li key={r}>{r}</li>)}</ul>
        </div>}
      </section>
    </section>
  </main>
}

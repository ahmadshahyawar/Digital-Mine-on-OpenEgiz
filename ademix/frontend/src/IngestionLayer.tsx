import React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { TerrainStage, haulRoadPoint } from './TerrainStage'
import './ingestion.css'

// Layer 1 · Data & Asset Ingestion: a full-screen 3D scene. Equipment specifications sit on the
// assets, simulated sensors report live values from the replayed telemetry logs, the haulage
// topology glows over the road, and data packets flow from every asset into the OpenEgiz hub.

type Spec = { parameter_id: string; value: number | null; unit: string; status: string }
type Log = { label: string; columns: string[]; rows: (string | number | null)[][] }
type Bundle = { equipment: { asset: string; specs: Spec[] }[]; logs: Record<string, Log> }
type Layer = 'specs' | 'sensors' | 'topology' | 'flow'
type Frame = { at: (key: string) => string | number | null; atMix: (key: string) => number }

const LAYERS: [Layer, string][] = [['specs', 'Specifications'], ['sensors', 'IoT sensors'], ['topology', 'Topology'], ['flow', 'Data flow']]
const STATUS_COLOR: Record<string, string> = {
  sourced: '#5fd38d', derived: '#7fb4ff', assumption: '#f0b85a', scenario_input: '#f0b85a',
  synthetic: '#c497f5', model_setting: '#7fb4ff', required_input: '#ff7a6b',
}
const TRUCK_COLOR: Record<string, string> = {
  hauling: '#38ef9d', returning: '#4fd1c5', loading: '#ffc246', dumping: '#ffc246',
  queued_at_excavator: '#f0b85a', queued_at_crusher: '#f0b85a', blocked: '#ff9f2e', breakdown: '#ff5149',
}
const HUB = new THREE.Vector3(0, 40, 0)
const SPEC_PICK: Record<string, string[]> = {
  'Haul truck HT-01…06': ['truck_payload_t', 'truck_speed_kmh', 'truck_fuel_consumption_lph', 'truck_fleet_size'],
  'Excavator EX-01': ['shovel_pass_t', 'shovel_cycle_min', 'load_time_min', 'excavator_fuel_consumption_lph'],
  'Primary crusher CR-01': ['crusher_capacity_tph', 'rom_bin_capacity_t', 'dump_time_min'],
  'Main haul road': ['route_length_km', 'truck_speed_kmh'],
}
const LABEL: Record<string, string> = {
  truck_payload_t: 'Payload', truck_speed_kmh: 'Speed', truck_fuel_consumption_lph: 'Fuel use', truck_fleet_size: 'Fleet',
  shovel_pass_t: 'Bucket pass', shovel_cycle_min: 'Pass cycle', load_time_min: 'Load time', excavator_fuel_consumption_lph: 'Fuel use',
  crusher_capacity_tph: 'Capacity', rom_bin_capacity_t: 'ROM bin', dump_time_min: 'Dump time', route_length_km: 'Length', dump_capacity_tph: 'Dump bay',
}
const num = (v: unknown) => Number(v ?? 0)
const roadAt = (enginePct: number) => haulRoadPoint(1 - THREE.MathUtils.clamp(enginePct, 0, 100) / 100)

function SpecCard({ title, specs }: { title: string; specs: Spec[] }) {
  return <div className="ig-card">
    <b>{title}</b>
    {specs.map(s => <span key={s.parameter_id + title}>
      <i style={{ background: STATUS_COLOR[s.status] }}/>{LABEL[s.parameter_id] ?? s.parameter_id}
      <em className={s.value === null ? 'ig-missing' : ''}>{s.value === null ? 'required input' : `${Number(s.value.toFixed(2)).toLocaleString()} ${s.unit}`}</em>
    </span>)}
  </div>
}

function LoggedTruck({ index, frame, layers, positions }: { index: number; frame: Frame; layers: Set<Layer>; positions: React.MutableRefObject<THREE.Vector3[]> }) {
  const { scene } = useGLTF('/models/hauler.glb')
  const model = React.useMemo(() => scene.clone(), [scene])
  const group = React.useRef<THREE.Group>(null)
  const id = `truck-${String(index + 1).padStart(2, '0')}`
  const state = String(frame.at(`${id}.state`) ?? 'hauling')
  const heading = num(frame.at(`${id}.heading`)) >= 0 ? 1 : -1
  const lane = heading > 0 ? 1.75 : -1.75
  useFrame(() => {
    if (!group.current) return
    // Trucks waiting at a server stand one behind another instead of on the same spot.
    const waiting = state === 'queued_at_excavator' ? 1 : state === 'queued_at_crusher' ? -1 : 0
    const pct = frame.atMix(`${id}.route_progress_pct`) + waiting * (3 + index * 2.2)
    const t = 1 - THREE.MathUtils.clamp(pct, 0, 100) / 100
    const point = haulRoadPoint(t)
    const ahead = haulRoadPoint(THREE.MathUtils.clamp(t + (heading > 0 ? -0.004 : 0.004), 0, 1))
    const tangent = ahead.clone().sub(point).setY(0).normalize()
    const across = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(lane)
    group.current.position.copy(point).add(across).add(new THREE.Vector3(0, .38, 0))
    if (tangent.lengthSq() > 0) group.current.rotation.y = -Math.atan2(tangent.z, tangent.x)
    positions.current[index] = group.current.position.clone()
  })
  const color = TRUCK_COLOR[state] ?? '#38ef9d'
  return <group ref={group}>
    <primitive object={model} scale={1.22}/>
    <mesh position={[0, 4.4, 0]}><sphereGeometry args={[.32, 12, 10]}/><meshBasicMaterial color={color}/></mesh>
    {state === 'breakdown' && <mesh position={[0, 5.4, 0]}><octahedronGeometry args={[.55]}/><meshBasicMaterial color="#ff5149"/></mesh>}
    {layers.has('sensors') && <Html center distanceFactor={115} position={[0, 7, 0]} zIndexRange={[20, 0]}>
      {index === 0
        ? <div className="ig-tag" style={{ borderColor: color }}>
          <b>HT-01</b> {state.replace(/_/g, ' ')}
          <span>GNSS {num(frame.at(`${id}.route_progress_pct`)).toFixed(0)}% of route · {num(frame.at(`${id}.speed_kmh`)).toFixed(1)} km/h</span>
          <span>payload {num(frame.at(`${id}.payload_t`)).toFixed(0)} t · fuel {num(frame.at(`${id}.fuel_pct`)).toFixed(0)}% (synthetic)</span>
        </div>
        : <div className="ig-chip" style={{ borderColor: color }}>HT-{String(index + 1).padStart(2, '0')} · {num(frame.at(`${id}.speed_kmh`)).toFixed(0)} km/h</div>}
    </Html>}
  </group>
}

function Excavator({ frame, layers, specs }: { frame: Frame; layers: Set<Layer>; specs: Spec[] }) {
  const { scene } = useGLTF('/models/excavator.glb')
  const model = React.useMemo(() => scene.clone(), [scene])
  const group = React.useRef<THREE.Group>(null)
  const loading = frame.at('excavator-01.state') === 'loading'
  useFrame(({ clock }) => { if (group.current) group.current.rotation.y = -1.35 + (loading ? Math.sin(clock.elapsedTime * 1.8) * .2 : 0) })
  const base = haulRoadPoint(1).add(new THREE.Vector3(1.2, .35, -1.5))
  return <group position={base}>
    <group ref={group} rotation={[0, -1.35, 0]}><primitive object={model} scale={1.5}/></group>
    {layers.has('specs') && <Html center distanceFactor={115} position={[0, 13, 0]}><SpecCard title="Excavator EX-01" specs={specs}/></Html>}
    {layers.has('sensors') && <Html center distanceFactor={115} position={[0, 7.5, 0]}>
      <div className="ig-tag"><b>EX-01</b> {String(frame.at('excavator-01.state'))}<span>queue {String(frame.at('excavator-01.queue_length'))} trucks</span></div>
    </Html>}
  </group>
}

function RomBin({ frame, layers, specs }: { frame: Frame; layers: Set<Layer>; specs: Spec[] }) {
  const fill = THREE.MathUtils.clamp(frame.atMix('crusher-01.rom_inventory_t') / 600, 0, 1)
  const position = haulRoadPoint(0).add(new THREE.Vector3(-9, .3, 9))
  return <group position={position}>
    <mesh position={[0, 3, 0]}><cylinderGeometry args={[3, 2.4, 6, 24, 1, true]}/><meshStandardMaterial color="#8fa3a6" transparent opacity={.35} side={THREE.DoubleSide}/></mesh>
    <mesh position={[0, .05 + fill * 3, 0]} scale={[1, Math.max(fill, .02), 1]}><cylinderGeometry args={[2.85, 2.35, 6, 24]}/><meshStandardMaterial color="#9b6a3f" roughness={1}/></mesh>
    {layers.has('specs') && <Html center distanceFactor={115} position={[0, 15, 0]}><SpecCard title="Primary crusher CR-01" specs={specs}/></Html>}
    {layers.has('sensors') && <Html center distanceFactor={115} position={[0, 8.5, 0]}>
      <div className="ig-tag"><b>Bin level</b> {frame.atMix('crusher-01.rom_inventory_t').toFixed(0)} / 600 t
        <span>belt scale {num(frame.at('mine-01.throughput_tph')).toFixed(0)} t/h · {String(frame.at('crusher-01.state'))}</span></div>
    </Html>}
  </group>
}

function Topology({ specs }: { specs: Spec[] }) {
  const tube = React.useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
    Array.from({ length: 60 }, (_, i) => haulRoadPoint(i / 59).add(new THREE.Vector3(0, 1.2, 0)))), 240, .35, 6, false), [])
  const nodes: [string, THREE.Vector3, string][] = [
    ['Loading face', haulRoadPoint(1), '1 server · 6 min per truck'],
    ['Haul road', haulRoadPoint(.5), `${specs.find(s => s.parameter_id === 'route_length_km')?.value ?? 3.2} km · single lane`],
    ['Dump bay', haulRoadPoint(0), '1 server · 1 min'],
    ['ROM bin → crusher', haulRoadPoint(0).add(new THREE.Vector3(-9, 0, 9)), '600 t buffer · 900 t/h'],
  ]
  return <group>
    <mesh geometry={tube}><meshBasicMaterial color="#4fd1c5" transparent opacity={.75}/></mesh>
    {nodes.map(([name, at, detail]) => <group key={name} position={at.clone().add(new THREE.Vector3(0, 2.2, 0))}>
      <mesh><sphereGeometry args={[1, 16, 12]}/><meshBasicMaterial color="#4fd1c5"/></mesh>
      <Html center distanceFactor={115} position={[0, 3.2, 0]}><div className="ig-node"><b>{name}</b><span>{detail}</span></div></Html>
    </group>)}
  </group>
}

function DataFlow({ trucks }: { trucks: React.MutableRefObject<THREE.Vector3[]> }) {
  const packets = React.useRef<THREE.Group>(null)
  const fixed = React.useMemo(() => [haulRoadPoint(1), haulRoadPoint(0).add(new THREE.Vector3(-9, 6, 9)), haulRoadPoint(.5)], [])
  const colors = ['#c497f5', '#7fb4ff', '#4fd1c5', '#f0b85a']
  const seeds = React.useMemo(() => Array.from({ length: 40 }, (_, i) => ({ source: i % 9, phase: (i * .137) % 1, color: colors[i % 4] })), [])
  useFrame(({ clock }) => {
    packets.current?.children.forEach((child, i) => {
      const seed = seeds[i]
      const from = seed.source < 6 ? trucks.current[seed.source] : fixed[seed.source - 6]
      if (!from) return
      const t = (clock.elapsedTime * .22 + seed.phase) % 1
      const mid = from.clone().lerp(HUB, .5).add(new THREE.Vector3(0, 14, 0))
      child.position.copy(new THREE.QuadraticBezierCurve3(from, mid, HUB).getPoint(t))
      child.scale.setScalar(.5 + Math.sin(t * Math.PI) * .6)
    })
  })
  return <group>
    <group ref={packets}>{seeds.map((s, i) => <mesh key={i}><sphereGeometry args={[.45, 8, 6]}/><meshBasicMaterial color={s.color}/></mesh>)}</group>
    <group position={HUB}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[5, .35, 10, 48]}/><meshBasicMaterial color="#4fd1c5"/></mesh>
      <mesh><icosahedronGeometry args={[2.4, 1]}/><meshStandardMaterial color="#123a33" emissive="#4fd1c5" emissiveIntensity={.6} wireframe/></mesh>
      <Html center distanceFactor={120} position={[0, 6.5, 0]}><div className="ig-node ig-hub"><b>OpenEgiz ingestion</b><span>MQTT telemetry/&lt;asset&gt; → Eclipse Ditto twins</span></div></Html>
    </group>
  </group>
}

function Playhead({ playing, rows, head, onRow }: { playing: boolean; rows: number; head: React.MutableRefObject<number>; onRow: (row: number) => void }) {
  useFrame((_, delta) => {
    if (!playing) return
    head.current = (head.current + delta / 1.1) % (rows - 1)
    onRow(Math.floor(head.current))
  })
  return null
}

export function IngestionLayer() {
  const [bundle, setBundle] = React.useState<Bundle | null>(null)
  const [error, setError] = React.useState('')
  const [scenario, setScenario] = React.useState('truck_breakdown')
  const [row, setRow] = React.useState(46)
  const [playing, setPlaying] = React.useState(true)
  const [layers, setLayers] = React.useState<Set<Layer>>(new Set(['specs', 'sensors', 'topology', 'flow']))
  const head = React.useRef(46)
  const trucks = React.useRef<THREE.Vector3[]>([])

  React.useEffect(() => {
    fetch('/data/ingestion.json').then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setBundle).catch(reason => setError(String(reason)))
  }, [])
  const log = bundle?.logs[scenario]
  if (error) return <div className="ig-shell ig-msg">Could not load the ingestion data ({error}).</div>
  if (!bundle || !log) return <div className="ig-shell ig-msg">Loading the North Pit data layer…</div>

  const index = (key: string) => log.columns.indexOf(key)
  const current = log.rows[Math.min(row, log.rows.length - 1)]
  const frame: Frame = {
    at: key => current[index(key)],
    atMix: key => {
      const i = Math.floor(head.current), f = head.current - i
      const a = num(log.rows[i]?.[index(key)]), b = num(log.rows[Math.min(i + 1, log.rows.length - 1)]?.[index(key)])
      return Math.abs(b - a) > 60 ? (f < .5 ? a : b) : a + (b - a) * f
    },
  }
  const specsOf = (asset: string) => {
    const all = bundle.equipment.flatMap(e => e.specs)
    return SPEC_PICK[asset].map(id => all.find(s => s.parameter_id === id)!).filter(Boolean)
  }
  const toggle = (layer: Layer) => setLayers(prev => { const next = new Set(prev); next.has(layer) ? next.delete(layer) : next.add(layer); return next })
  const seek = (value: number) => { head.current = value; setRow(value) }
  const hours = num(current[0]) / 3600

  return <main className="ig-shell">
    <div className="ig-stage">
      <Canvas camera={{ position: [84, 78, 96], fov: 42 }} dpr={[.75, 1.25]} gl={{ antialias: true, powerPreference: 'low-power', toneMapping: THREE.ACESFilmicToneMapping }}>
        <TerrainStage showRoads showPlant moving twins={[{ thingId: 'c', attributes: { kind: 'crusher' }, features: { state: { properties: { value: String(frame.at('crusher-01.state')) } } } }]}/>
        <Playhead playing={playing} rows={log.rows.length} head={head} onRow={r => r !== row && setRow(r)}/>
        {Array.from({ length: 6 }, (_, i) => <LoggedTruck key={i} index={i} frame={frame} layers={layers} positions={trucks}/>)}
        <Excavator frame={frame} layers={layers} specs={specsOf('Excavator EX-01')}/>
        <RomBin frame={frame} layers={layers} specs={specsOf('Primary crusher CR-01')}/>
        {layers.has('specs') && <Html center distanceFactor={115} position={roadAt(70).add(new THREE.Vector3(0, 12, 0))}><SpecCard title="Haul trucks HT-01…06" specs={specsOf('Haul truck HT-01…06')}/></Html>}
        {layers.has('topology') && <Topology specs={specsOf('Main haul road')}/>}
        {layers.has('flow') && <DataFlow trucks={trucks}/>}
      </Canvas>
    </div>

    <header className="ig-title">
      <span>LAYER 1 · DATA &amp; ASSET INGESTION</span>
      <h1>North Pit</h1>
    </header>

    <nav className="ig-layers" aria-label="Scene layers">
      {LAYERS.map(([id, label]) => <button key={id} id={`ig-layer-${id}`} aria-pressed={layers.has(id)} className={layers.has(id) ? 'on' : ''} onClick={() => toggle(id)}>{label}</button>)}
    </nav>

    <div className="ig-key" aria-label="Value status">
      {[['sourced', 'OpenMines'], ['derived', 'derived'], ['assumption', 'team input'], ['synthetic', 'synthetic'], ['required_input', 'required input']].map(([s, l]) =>
        <span key={s}><i style={{ background: STATUS_COLOR[s] }}/>{l}</span>)}
    </div>

    <footer className="ig-bar">
      <button id="ig-play" className="ig-play" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? '❚❚' : '▶'}</button>
      <select id="ig-scenario" value={scenario} onChange={e => setScenario(e.target.value)} aria-label="Telemetry log">
        {Object.entries(bundle.logs).map(([id, l]) => <option key={id} value={id}>{l.label}</option>)}
      </select>
      <input id="ig-time" type="range" min={0} max={log.rows.length - 1} value={row} onChange={e => seek(Number(e.target.value))} aria-label="Replay time"/>
      <span className="ig-clock">{hours.toFixed(2)} h · {hours < 4 ? 'normal operations' : log.label}</span>
      <span className="ig-read">{num(frame.at('mine-01.throughput_tph')).toFixed(0)} <small>t/h</small></span>
      <span className="ig-read">{num(frame.at('crusher-01.rom_inventory_t')).toFixed(0)} <small>t ROM</small></span>
      <span className="ig-read">{String(frame.at('road-main.state'))} <small>road</small></span>
    </footer>
  </main>
}

useGLTF.preload('/models/hauler.glb')
useGLTF.preload('/models/excavator.glb')

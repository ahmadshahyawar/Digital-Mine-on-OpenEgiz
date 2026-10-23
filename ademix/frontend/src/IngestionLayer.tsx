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
  synthetic: '#c497f5', model_setting: '#7fb4ff', required_input: '#ff7a6b', external_reference: '#5ec8f2',
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

/** A reading that briefly highlights whenever its value changes. */
function Flash({ value, children }: { value: unknown; children: React.ReactNode }) {
  const [on, setOn] = React.useState(false)
  const first = React.useRef(true)
  React.useEffect(() => {
    if (first.current) { first.current = false; return }
    setOn(true)
    const timer = window.setTimeout(() => setOn(false), 700)
    return () => window.clearTimeout(timer)
  }, [value])
  return <b className={`ig-val ${on ? 'flash' : ''}`}>{children}</b>
}

function SpecCard({ title, specs }: { title: string; specs: Spec[] }) {
  return <div className="ig-card">
    <b>{title}</b>
    {specs.map(s => <span key={s.parameter_id + title}>
      <i style={{ background: STATUS_COLOR[s.status] }}/>{LABEL[s.parameter_id] ?? s.parameter_id}
      <em className={s.value === null ? 'ig-missing' : ''}>{s.value === null ? 'required input' : `${Number(s.value.toFixed(2)).toLocaleString()} ${s.unit}`}</em>
    </span>)}
  </div>
}

// Right-hand traffic: every truck keeps right of its direction of travel, so empty trucks entering the
// pit use the inner lane and loaded trucks leaving use the outer lane; they never meet head-on.
const LANE_OFFSET = 2.1
const SHOULDER_OFFSET = 4.6
const QUEUE_SPACING_PCT = 3.6 // about one truck length plus a gap along the ramp
const LOOP_PCT = 8 // the last 8 % of the route at each end runs through the turning loop

/** Where a truck stands and which way it faces, for a route position (engine %: 0 face, 100 crusher). */
function lanePose(enginePct: number, heading: 1 | -1, sideOffset: number) {
  const t = 1 - THREE.MathUtils.clamp(enginePct, 0, 100) / 100
  const point = haulRoadPoint(t)
  const ahead = haulRoadPoint(THREE.MathUtils.clamp(t + (heading > 0 ? -0.004 : 0.004), 0, 1))
  let forward = ahead.clone().sub(point).setY(0)
  if (forward.lengthSq() < 1e-8) forward = point.clone().sub(haulRoadPoint(THREE.MathUtils.clamp(t + (heading > 0 ? 0.004 : -0.004), 0, 1))).setY(0)
  forward.normalize()
  const right = new THREE.Vector3(-forward.z, 0, forward.x)
  return { position: point.addScaledVector(right, sideOffset), yaw: -Math.atan2(forward.z, forward.x) }
}

/**
 * Turning loop around a pad (the painted yellow ring). A truck arrives in its right-hand lane, drives
 * round the ring keeping the pad on its left, stops half-way to load or dump, then carries on forward
 * and leaves in the opposite lane: it never reverses or turns on the spot.
 */
function turningLoop(end: 'face' | 'crusher') {
  const atFace = end === 'face'
  const centre = haulRoadPoint(atFace ? 1 : 0)
  const radius = atFace ? 7.3 : 9.6
  const approach = lanePose(atFace ? LOOP_PCT : 100 - LOOP_PCT, atFace ? -1 : 1, LANE_OFFSET)
  const exit = lanePose(atFace ? LOOP_PCT : 100 - LOOP_PCT, atFace ? 1 : -1, LANE_OFFSET)
  const angleOf = (p: THREE.Vector3) => Math.atan2(p.z - centre.z, p.x - centre.x)
  const onRing = (a: number) => new THREE.Vector3(centre.x + Math.cos(a) * radius, centre.y, centre.z + Math.sin(a) * radius)
  const start = angleOf(approach.position), finish = angleOf(exit.position)
  // Pick the sweep direction that keeps the pad on the driver's left (right-hand traffic).
  const forwardAt = (a: number, s: number) => new THREE.Vector3(-Math.sin(a) * s, 0, Math.cos(a) * s)
  const leftOf = (f: THREE.Vector3) => new THREE.Vector3(f.z, 0, -f.x)
  const towardCentre = centre.clone().sub(onRing(start)).setY(0)
  const sign = leftOf(forwardAt(start, 1)).dot(towardCentre) > 0 ? 1 : -1
  let sweep = (finish - start) * sign
  while (sweep <= 0) sweep += Math.PI * 2
  const points = [approach.position.clone()]
  for (let k = 0; k <= 24; k++) points.push(onRing(start + sign * sweep * k / 24))
  points.push(exit.position.clone())
  return new THREE.CatmullRomCurve3(points)
}
const LOOPS = { face: turningLoop('face'), crusher: turningLoop('crusher') }

function loopPose(end: 'face' | 'crusher', phase: number) {
  const curve = LOOPS[end]
  const p = THREE.MathUtils.clamp(phase, 0, 1)
  const point = curve.getPointAt(p)
  const forward = curve.getTangentAt(p).setY(0).normalize()
  return { position: point, yaw: -Math.atan2(forward.z, forward.x) }
}

function LoggedTruck({ index, frame, layers, positions, rank, blockageActive }: {
  index: number; frame: Frame; layers: Set<Layer>; positions: React.MutableRefObject<THREE.Vector3[]>; rank: number; blockageActive: boolean
}) {
  const { scene } = useGLTF('/models/hauler.glb')
  const model = React.useMemo(() => scene.clone(), [scene])
  const group = React.useRef<THREE.Group>(null)
  const id = `truck-${String(index + 1).padStart(2, '0')}`
  const state = String(frame.at(`${id}.state`) ?? 'hauling')
  const heading: 1 | -1 = num(frame.at(`${id}.heading`)) >= 0 ? 1 : -1
  useFrame(() => {
    if (!group.current) return
    const pct = frame.atMix(`${id}.route_progress_pct`)
    let pose
    if (state === 'loading') {
      pose = loopPose('face', .5) // half-way round the loop, beside the excavator
    } else if (state === 'dumping') {
      pose = loopPose('crusher', .5) // half-way round the loop, at the tipping point
    } else if (state === 'returning' && pct <= LOOP_PCT) {
      pose = loopPose('face', (LOOP_PCT - pct) / LOOP_PCT * .5) // driving into the loading loop
    } else if (state === 'hauling' && pct <= LOOP_PCT) {
      pose = loopPose('face', .5 + pct / LOOP_PCT * .5) // loaded, finishing the loop forwards
    } else if (state === 'hauling' && pct >= 100 - LOOP_PCT) {
      pose = loopPose('crusher', (pct - (100 - LOOP_PCT)) / LOOP_PCT * .5) // driving into the dump loop
    } else if (state === 'returning' && pct >= 100 - LOOP_PCT) {
      pose = loopPose('crusher', .5 + (100 - pct) / LOOP_PCT * .5) // empty, finishing the loop forwards
    } else if (state === 'queued_at_excavator') {
      pose = lanePose(LOOP_PCT + 3 + rank * QUEUE_SPACING_PCT, -1, LANE_OFFSET) // nose to tail before the loop
    } else if (state === 'queued_at_crusher') {
      pose = lanePose(100 - LOOP_PCT - 3 - rank * QUEUE_SPACING_PCT, 1, LANE_OFFSET) // nose to tail before the loop
    } else if (state === 'blocked') {
      pose = lanePose(pct - heading * QUEUE_SPACING_PCT * (rank + .6), heading, LANE_OFFSET) // stopped behind the broken-down truck
    } else if (state === 'breakdown') {
      // Stops in its lane while it blocks the road, then is towed onto the shoulder.
      pose = lanePose(pct, heading, blockageActive ? LANE_OFFSET : SHOULDER_OFFSET)
    } else {
      pose = lanePose(pct, heading, LANE_OFFSET)
    }
    group.current.position.copy(pose.position).add(new THREE.Vector3(0, .38, 0))
    group.current.rotation.y = pose.yaw
    positions.current[index] = group.current.position.clone()
  })
  const color = TRUCK_COLOR[state] ?? '#38ef9d'
  return <group ref={group}>
    <primitive object={model} scale={1.22}/>
    <mesh position={[0, 4.4, 0]}><sphereGeometry args={[.32, 12, 10]}/><meshBasicMaterial color={color}/></mesh>
    {state === 'breakdown' && <mesh position={[0, 5.4, 0]}><octahedronGeometry args={[.55]}/><meshBasicMaterial color="#ff5149"/></mesh>}
    {layers.has('sensors') && <Html center distanceFactor={80} position={[0, 6.4, 0]} zIndexRange={[20, 0]}>
      <div className="ig-chip" style={{ borderColor: color, color }}>HT-{String(index + 1).padStart(2, '0')}</div>
    </Html>}
  </group>
}

/** Arrows painted in each lane: blue for empty trucks entering the pit, amber for loaded trucks leaving. */
function LaneArrows() {
  const arrows = React.useMemo(() => {
    const list: { position: THREE.Vector3; yaw: number; color: string }[] = []
    for (let pct = LOOP_PCT + 2; pct <= 100 - LOOP_PCT - 4; pct += 4.2) {
      const inbound = lanePose(pct, -1, LANE_OFFSET)
      const outbound = lanePose(pct + 2.1, 1, LANE_OFFSET)
      list.push({ ...inbound, color: '#5ec8f2' }, { ...outbound, color: '#f0b85a' })
    }
    // Around each turning loop: arriving half in the arriving lane's colour, leaving half in the other.
    for (let phase = .08; phase < .95; phase += .07) {
      list.push({ ...loopPose('face', phase), color: phase < .5 ? '#5ec8f2' : '#f0b85a' })
      list.push({ ...loopPose('crusher', phase), color: phase < .5 ? '#f0b85a' : '#5ec8f2' })
    }
    return list
  }, [])
  const shape = React.useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(.9, 0); s.lineTo(-.6, .55); s.lineTo(-.25, 0); s.lineTo(-.6, -.55); s.closePath()
    return new THREE.ShapeGeometry(s)
  }, [])
  return <group>{arrows.map((a, i) => <mesh key={i} geometry={shape} position={a.position.clone().add(new THREE.Vector3(0, .28, 0))}
    rotation={[-Math.PI / 2, 0, a.yaw]}><meshBasicMaterial color={a.color} transparent opacity={.85}/></mesh>)}</group>
}

function Excavator({ frame }: { frame: Frame }) {
  const { scene } = useGLTF('/models/excavator.glb')
  const model = React.useMemo(() => scene.clone(), [scene])
  const group = React.useRef<THREE.Group>(null)
  const loading = frame.at('excavator-01.state') === 'loading'
  useFrame(({ clock }) => { if (group.current) group.current.rotation.y = -1.35 + (loading ? Math.sin(clock.elapsedTime * 1.8) * .2 : 0) })
  const base = haulRoadPoint(1).add(new THREE.Vector3(1.2, .35, -1.5))
  return <group position={base}>
    <group ref={group} rotation={[0, -1.35, 0]}><primitive object={model} scale={1.5}/></group>
  </group>
}

// Ore handling chain: truck tips into the ROM bin beside the dump loop → feeder → primary crusher →
// main conveyor → crushed-ore stockpile. Positions follow the plant layout drawn by TerrainStage.
const PLANT_YAW = 2.76
function plantToWorld(x: number, y: number, z: number) {
  const origin = haulRoadPoint(0).add(new THREE.Vector3(-1.2, .3, -.8))
  const c = Math.cos(PLANT_YAW), s = Math.sin(PLANT_YAW)
  return new THREE.Vector3(origin.x + x * c + z * s, origin.y + y, origin.z - x * s + z * c)
}
const DUMP_POSE = loopPose('crusher', .5)
const ROM_BIN = (() => {
  const centre = haulRoadPoint(0)
  const inward = centre.clone().sub(DUMP_POSE.position).setY(0).normalize()
  return DUMP_POSE.position.clone().addScaledVector(inward, 4.3).setY(centre.y + .3)
})()
const HOPPER = plantToWorld(-2.6, 2.4, 0)
const BELT_START = plantToWorld(4.6, 3.05, .1)
const BELT_END = plantToWorld(20.6, 3.1, .1)
const STOCKPILE = plantToWorld(24.6, 0, .1)

/** A straight belt between two points: a thin slab plus the moving ore on it. */
function Belt({ from, to, flow, color = '#3d4a4a' }: { from: THREE.Vector3; to: THREE.Vector3; flow: number; color?: string }) {
  const chunks = React.useRef<THREE.Group>(null)
  const { mid, length, quaternion } = React.useMemo(() => {
    const dir = to.clone().sub(from)
    return {
      mid: from.clone().add(to).multiplyScalar(.5),
      length: dir.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize()),
    }
  }, [from, to])
  const count = 12
  useFrame((_, delta) => {
    chunks.current?.children.forEach((child, i) => {
      const visible = flow > .02 && i < Math.ceil(count * Math.min(1, flow))
      child.visible = visible
      if (!visible) return
      child.userData.t = ((child.userData.t ?? i / count) + delta * (.12 + .25 * flow)) % 1
      child.position.copy(from).lerp(to, child.userData.t).add(new THREE.Vector3(0, .45, 0))
    })
  })
  return <group>
    <mesh position={mid} quaternion={quaternion}><boxGeometry args={[length, .25, 1.3]}/><meshStandardMaterial color={color} roughness={.9}/></mesh>
    <group ref={chunks}>{Array.from({ length: count }, (_, i) => <mesh key={i}><dodecahedronGeometry args={[.32, 0]}/><meshStandardMaterial color="#9c6b43" roughness={1}/></mesh>)}</group>
  </group>
}

function OreHandling({ frame, dumping }: { frame: Frame; dumping: boolean }) {
  const rom = frame.atMix('crusher-01.rom_inventory_t')
  const fill = THREE.MathUtils.clamp(rom / 600, 0, 1)
  const throughput = num(frame.at('mine-01.throughput_tph'))
  const received = num(frame.at('mine-01.production_t'))
  const falling = React.useRef<THREE.Group>(null)
  const pile = React.useRef<THREE.Mesh>(null)
  // Pile radius grows with the cube root of tonnes received, so its volume tracks the tonnage.
  const pileScale = Math.cbrt(1 + received / 2500)
  useFrame(({ clock }) => {
    falling.current?.children.forEach((child, i) => {
      child.visible = dumping
      if (!dumping) return
      const t = (clock.elapsedTime * .9 + i / 8) % 1
      child.position.copy(DUMP_POSE.position).lerp(ROM_BIN, t).add(new THREE.Vector3(0, 3.2 - t * 2.4 + Math.sin(t * Math.PI) * .8, 0))
    })
    if (pile.current) pile.current.scale.lerp(new THREE.Vector3(pileScale, pileScale, pileScale), .05)
  })
  return <group>
    {/* ROM bin: concrete pocket whose ore level is the live bin level */}
    <group position={ROM_BIN}>
      <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[2.7, 2.1, 3.2, 20, 1, true]}/><meshStandardMaterial color="#9aa3a0" side={THREE.DoubleSide} roughness={.9}/></mesh>
      <mesh position={[0, .05 + fill * 1.55, 0]} scale={[1, Math.max(fill, .03), 1]}><cylinderGeometry args={[2.55, 2.05, 3.1, 20]}/><meshStandardMaterial color="#9b6a3f" roughness={1}/></mesh>
      <mesh position={[0, 3.25, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.7, 3.1, 24]}/><meshBasicMaterial color="#e2c14f"/></mesh>
    </group>
    <group ref={falling}>{Array.from({ length: 8 }, (_, i) => <mesh key={i}><dodecahedronGeometry args={[.38, 0]}/><meshStandardMaterial color="#9c6b43" roughness={1}/></mesh>)}</group>
    {/* Feeder from the bin into the crusher hopper, then the main conveyor to the stockpile */}
    <Belt from={ROM_BIN.clone().add(new THREE.Vector3(0, 1.2, 0))} to={HOPPER} flow={rom > 1 && throughput > 0 ? Math.min(1, throughput / 900) : 0}/>
    <Belt from={BELT_START} to={BELT_END} flow={Math.min(1, throughput / 900)} color="#2f3a3a"/>
    <mesh ref={pile} position={STOCKPILE.clone().add(new THREE.Vector3(0, 2.6, 0))}><coneGeometry args={[6.2, 5.6, 32]}/><meshStandardMaterial color="#7d5b3f" roughness={1}/></mesh>
  </group>
}

/** Mast light towers along the outer edge of the haul road, as on a night-shift mine. */
function LightTowers() {
  const towers = React.useMemo(() => [14, 30, 46, 62, 78].map(pct => lanePose(pct, 1, 5.6)), [])
  return <group>{towers.map((t, i) => <group key={i} position={t.position} rotation={[0, t.yaw, 0]}>
    <mesh position={[0, 3.6, 0]}><cylinderGeometry args={[.12, .18, 7.2, 6]}/><meshStandardMaterial color="#c9cfcc"/></mesh>
    <mesh position={[0, 7.4, 0]}><boxGeometry args={[1.6, .5, .3]}/><meshStandardMaterial color="#2d3436" emissive="#fff6c8" emissiveIntensity={.8}/></mesh>
    <mesh position={[0, .4, 0]}><boxGeometry args={[1.4, .8, 1]}/><meshStandardMaterial color="#e2c14f"/></mesh>
  </group>)}</group>
}

function SpecsPanel({ specsOf }: { specsOf: (asset: string) => Spec[] }) {
  return <section className="ig-panel ig-left" aria-label="Fixed specifications">
    <h2>Fixed specifications</h2>
    <p>Rated equipment values. They describe the machines and do not change during operation.</p>
    <SpecCard title="Haul trucks HT-01…06" specs={specsOf('Haul truck HT-01…06')}/>
    <SpecCard title="Excavator EX-01" specs={specsOf('Excavator EX-01')}/>
    <SpecCard title="Primary crusher CR-01" specs={specsOf('Primary crusher CR-01')}/>
    <SpecCard title="Main haul road" specs={specsOf('Main haul road')}/>
  </section>
}

function SensorPanel({ frame, live }: { frame: Frame; live: boolean }) {
  const reading = (key: string, digits = 0) => {
    const raw = frame.at(key)
    return typeof raw === 'number' ? raw.toFixed(digits) : String(raw ?? '—').replace(/_/g, ' ')
  }
  const rom = num(frame.at('crusher-01.rom_inventory_t'))
  return <section className="ig-panel ig-right" aria-label="Sensor readings">
    <h2>{live ? 'Live sensor readings' : 'Sensor readings · replay'}</h2>
    <p>{live ? 'From the Eclipse Ditto twins, refreshed every 2 seconds.' : 'From the recorded synthetic log; values change as the replay plays.'} Highlighted values just changed.</p>
    <table className="ig-sensors-table">
      <thead><tr><th>Truck</th><th>State</th><th>km/h</th><th>Load t</th><th>Fuel %</th></tr></thead>
      <tbody>{Array.from({ length: 6 }, (_, i) => {
        const id = `truck-0${i + 1}`
        const state = String(frame.at(`${id}.state`) ?? '')
        return <tr key={id}>
          <td><i style={{ background: TRUCK_COLOR[state] ?? '#38ef9d' }}/>HT-0{i + 1}</td>
          <td><Flash value={state}>{reading(`${id}.state`)}</Flash></td>
          <td><Flash value={frame.at(`${id}.speed_kmh`)}>{reading(`${id}.speed_kmh`)}</Flash></td>
          <td><Flash value={frame.at(`${id}.payload_t`)}>{reading(`${id}.payload_t`)}</Flash></td>
          <td><Flash value={frame.at(`${id}.fuel_pct`)}>{reading(`${id}.fuel_pct`)}</Flash></td>
        </tr>
      })}</tbody>
    </table>
    <div className="ig-gauges">
      <div><span>ROM bin level</span><Flash value={rom}>{rom.toFixed(0)} <small>/ 600 t</small></Flash>
        <div className="ig-meter"><i style={{ width: `${Math.min(100, rom / 6)}%` }}/></div></div>
      <div><span>Stockpile received</span><Flash value={Math.round(num(frame.at('mine-01.production_t')) / 10)}>{num(frame.at('mine-01.production_t')).toLocaleString(undefined, { maximumFractionDigits: 0 })} <small>t</small></Flash></div>
      <div><span>Crusher belt scale</span><Flash value={frame.at('mine-01.throughput_tph')}>{reading('mine-01.throughput_tph')} <small>t/h</small></Flash></div>
      <div><span>Excavator</span><Flash value={frame.at('excavator-01.state')}>{reading('excavator-01.state')}</Flash></div>
      <div><span>Queue at face</span><Flash value={frame.at('excavator-01.queue_length')}>{reading('excavator-01.queue_length')} <small>trucks</small></Flash></div>
      <div><span>Road</span><Flash value={frame.at('road-main.state')}>{reading('road-main.state')}</Flash></div>
      <div><span>Trucks blocked</span><Flash value={frame.at('road-main.blocked_trucks')}>{reading('road-main.blocked_trucks')}</Flash></div>
    </div>
    <p className="ig-foot-note">Fuel % is a synthetic display signal.</p>
  </section>
}

function Topology({ specs }: { specs: Spec[] }) {
  const tube = React.useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
    Array.from({ length: 60 }, (_, i) => haulRoadPoint(i / 59).add(new THREE.Vector3(0, 1.2, 0)))), 240, .35, 6, false), [])
  const nodes: [string, THREE.Vector3, string][] = [
    ['Loading face', haulRoadPoint(1), '1 server · 6 min per truck'],
    ['Haul road', haulRoadPoint(.5), `${specs.find(s => s.parameter_id === 'route_length_km')?.value ?? 3.2} km · two-way, keep right`],
    ['Dump bay', haulRoadPoint(0), '1 server · 1 min'],
    ['ROM bin → crusher', ROM_BIN.clone(), '600 t buffer · 900 t/h'],
    ['Crushed-ore stockpile', STOCKPILE.clone().add(new THREE.Vector3(0, 6, 0)), 'conveyor from the crusher'],
  ]
  return <group>
    <mesh geometry={tube}><meshBasicMaterial color="#4fd1c5" transparent opacity={.75}/></mesh>
    {nodes.map(([name, at, detail]) => <group key={name} position={at.clone().add(new THREE.Vector3(0, 2.2, 0))}>
      <mesh><sphereGeometry args={[1, 16, 12]}/><meshBasicMaterial color="#4fd1c5"/></mesh>
      <Html center distanceFactor={115} position={[0, 3.2, 0]} zIndexRange={[20, 0]}><div className="ig-node"><b>{name}</b><span>{detail}</span></div></Html>
    </group>)}
  </group>
}

function DataFlow({ trucks }: { trucks: React.MutableRefObject<THREE.Vector3[]> }) {
  const packets = React.useRef<THREE.Group>(null)
  const fixed = React.useMemo(() => [haulRoadPoint(1), ROM_BIN.clone().add(new THREE.Vector3(0, 4, 0)), haulRoadPoint(.5)], [])
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
      <Html center distanceFactor={120} position={[0, 6.5, 0]} zIndexRange={[20, 0]}><div className="ig-node ig-hub"><b>OpenEgiz ingestion</b><span>MQTT telemetry/&lt;asset&gt; → Eclipse Ditto twins</span></div></Html>
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
  const [layers, setLayers] = React.useState<Set<Layer>>(new Set(['sensors', 'topology', 'flow']))
  const head = React.useRef(46)
  const trucks = React.useRef<THREE.Vector3[]>([])
  // Live mode: poll the OpenEgiz stand; any failure falls back to the recorded-log replay.
  const [live, setLive] = React.useState(false)
  const [, setTick] = React.useState(0)
  const liveState = React.useRef<{ prev: Record<string, unknown>; curr: Record<string, unknown>; at: number }>({ prev: {}, curr: {}, at: 0 })

  React.useEffect(() => {
    let stopped = false
    const poll = async () => {
      try {
        const response = await fetch('/api/state', { cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = await response.json()
        if (body.source !== 'eclipse-ditto' || !Array.isArray(body.twins) || !body.twins.length) throw new Error('not live')
        const flat: Record<string, unknown> = {}
        for (const twin of body.twins as { thingId: string; features?: Record<string, { properties?: { value?: unknown } }> }[]) {
          const name = String(twin.thingId).split(':')[1]
          for (const [feature, value] of Object.entries(twin.features ?? {})) flat[`${name}.${feature}`] = value?.properties?.value
        }
        if (stopped) return
        const previous = liveState.current.curr
        liveState.current = { prev: Object.keys(previous).length ? previous : flat, curr: flat, at: performance.now() }
        setLive(true)
        setTick(t => t + 1)
      } catch {
        if (!stopped) setLive(false)
      }
    }
    poll()
    const timer = window.setInterval(poll, 2000)
    return () => { stopped = true; window.clearInterval(timer) }
  }, [])

  React.useEffect(() => {
    fetch('/data/ingestion.json').then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setBundle).catch(reason => setError(String(reason)))
  }, [])
  const log = bundle?.logs[scenario]
  if (error) return <div className="ig-shell ig-msg">Could not load the ingestion data ({error}).</div>
  if (!bundle || !log) return <div className="ig-shell ig-msg">Loading the North Pit data layer…</div>

  const index = (key: string) => log.columns.indexOf(key)
  const current = log.rows[Math.min(row, log.rows.length - 1)]
  const mix = (a: number, b: number, f: number) => Math.abs(b - a) > 60 ? (f < .5 ? a : b) : a + (b - a) * f
  const frame: Frame = live
    ? {
      at: key => (liveState.current.curr[key] ?? null) as string | number | null,
      atMix: key => {
        const { prev, curr, at } = liveState.current
        return mix(num(prev[key] ?? curr[key]), num(curr[key]), Math.min(1, (performance.now() - at) / 2000))
      },
    }
    : {
      at: key => current[index(key)],
      atMix: key => {
        const i = Math.floor(head.current), f = head.current - i
        return mix(num(log.rows[i]?.[index(key)]), num(log.rows[Math.min(i + 1, log.rows.length - 1)]?.[index(key)]), f)
      },
    }
  const specsOf = (asset: string) => {
    const all = bundle.equipment.flatMap(e => e.specs)
    return SPEC_PICK[asset].map(id => all.find(s => s.parameter_id === id)!).filter(Boolean)
  }
  // Position of a truck among the trucks sharing its waiting state (and direction), so they line up.
  const queueRank = (i: number) => {
    const key = (n: number) => `${frame.at(`truck-0${n + 1}.state`)}|${num(frame.at(`truck-0${n + 1}.heading`)) >= 0}`
    return Array.from({ length: i }, (_, n) => n).filter(n => key(n) === key(i)).length
  }
  const toggle = (layer: Layer) => setLayers(prev => { const next = new Set(prev); next.has(layer) ? next.delete(layer) : next.add(layer); return next })
  const seek = (value: number) => { head.current = value; setRow(value) }
  const hours = (live ? num(frame.at('mine-01.sim_time_s')) : num(current[0])) / 3600
  const liveScenario = String(frame.at('mine-01.active_scenario') ?? 'baseline')

  return <main className="ig-shell">
    <div className="ig-stage">
      <Canvas camera={{ position: [84, 78, 96], fov: 42 }} dpr={[.75, 1.25]} gl={{ antialias: true, powerPreference: 'low-power', toneMapping: THREE.ACESFilmicToneMapping }}>
        <TerrainStage showRoads showPlant moving twins={[{ thingId: 'c', attributes: { kind: 'crusher' }, features: { state: { properties: { value: String(frame.at('crusher-01.state')) } } } }]}/>
        <Playhead playing={playing && !live} rows={log.rows.length} head={head} onRow={r => r !== row && setRow(r)}/>
        <LaneArrows/>
        {Array.from({ length: 6 }, (_, i) => <LoggedTruck key={i} index={i} frame={frame} layers={layers} positions={trucks}
          rank={queueRank(i)} blockageActive={frame.at('road-main.state') === 'restricted'}/>)}
        <Excavator frame={frame}/>
        <OreHandling frame={frame} dumping={Array.from({ length: 6 }, (_, i) => frame.at(`truck-0${i + 1}.state`)).includes('dumping')}/>
        <LightTowers/>
        {layers.has('topology') && <Topology specs={specsOf('Main haul road')}/>}
        {layers.has('flow') && <DataFlow trucks={trucks}/>}
      </Canvas>
    </div>
    {layers.has('specs') && <SpecsPanel specsOf={specsOf}/>}
    {layers.has('sensors') && <SensorPanel frame={frame} live={live}/>}

    <header className="ig-title">
      <span>LAYER 1 · DATA &amp; ASSET INGESTION</span>
      <h1>North Pit</h1>
      <div id="ig-mode" className={`ig-mode ${live ? 'live' : 'replay'}`} role="status">
        <i/>{live ? 'LIVE · Eclipse Ditto twins · every 2 s' : 'REPLAY · recorded synthetic log (stand offline)'}
      </div>
    </header>

    <nav className="ig-layers" aria-label="Scene layers">
      {LAYERS.map(([id, label]) => <button key={id} id={`ig-layer-${id}`} aria-pressed={layers.has(id)} className={layers.has(id) ? 'on' : ''} onClick={() => toggle(id)}>{label}</button>)}
    </nav>

    <div className="ig-key" aria-label="Value status">
      {[['sourced', 'OpenMines'], ['external_reference', 'Cat handbook'], ['derived', 'derived'], ['assumption', 'team input'], ['synthetic', 'synthetic']].map(([s, l]) =>
        <span key={s}><i style={{ background: STATUS_COLOR[s] }}/>{l}</span>)}
      <span className="ig-lane"><b style={{ color: '#5ec8f2' }}>▲</b>empty in · inner lane</span>
      <span className="ig-lane"><b style={{ color: '#f0b85a' }}>▲</b>loaded out · outer lane</span>
    </div>

    <footer className="ig-bar">
      {live
        ? <span className="ig-clock ig-live-note">Live from OpenEgiz · simulated time {hours.toFixed(2)} h · {bundle.logs[liveScenario]?.label ?? liveScenario}</span>
        : <>
          <button id="ig-play" className="ig-play" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? '❚❚' : '▶'}</button>
          <select id="ig-scenario" value={scenario} onChange={e => setScenario(e.target.value)} aria-label="Telemetry log">
            {Object.entries(bundle.logs).map(([id, l]) => <option key={id} value={id}>{l.label}</option>)}
          </select>
          <input id="ig-time" type="range" min={0} max={log.rows.length - 1} value={row} onChange={e => seek(Number(e.target.value))} aria-label="Replay time"/>
          <span className="ig-clock">{hours.toFixed(2)} h · {hours < 4 ? 'normal operations' : log.label}</span>
        </>}
      <span className="ig-read">{num(frame.at('mine-01.throughput_tph')).toFixed(0)} <small>t/h</small></span>
      <span className="ig-read">{num(frame.at('crusher-01.rom_inventory_t')).toFixed(0)} <small>t ROM</small></span>
      <span className="ig-read">{String(frame.at('road-main.state'))} <small>road</small></span>
    </footer>
  </main>
}

useGLTF.preload('/models/hauler.glb')
useGLTF.preload('/models/excavator.glb')

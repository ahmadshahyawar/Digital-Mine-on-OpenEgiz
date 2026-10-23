import React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { PIT_BENCHES, PIT_DESIGN, TerrainStage, haulRoadPoint, pitWallPoint } from './TerrainStage'
import './ingestion.css'

// Layer 1 · Data & Asset Ingestion: a full-screen 3D scene. Equipment specifications sit on the
// assets, simulated sensors report live values from the replayed telemetry logs, the haulage
// topology glows over the road, and data packets flow from every asset into the OpenEgiz hub.

type Spec = { parameter_id: string; value: number | null; unit: string; status: string }
type Log = { label: string; columns: string[]; rows: (string | number | null)[][] }
type RegisterRow = { parameter_id: string; value: number | null; unit: string; status: string }
type Bundle = {
  equipment: { asset: string; specs: Spec[] }[]
  logs: Record<string, Log>
  register: RegisterRow[]
  weather: { note: string; columns: string[]; rows: number[][] }
}
type Weather = Record<string, number>
type Layer = 'whatif' | 'specs' | 'sensors' | 'topology' | 'flow' | 'fleet' | 'weather' | 'safety'
type Frame = {
  at: (key: string) => string | number | null
  atMix: (key: string) => number
  circuit: (truck: number) => number
  /** Where the data next places the truck on the circuit: the waypoint it drives towards. */
  target: (truck: number) => number
}
type Getter = (key: string) => unknown

const LAYERS: [Layer, string][] = [['whatif', 'What-if'], ['specs', 'Specifications'], ['sensors', 'IoT sensors'], ['topology', 'Topology'], ['flow', 'Data flow'], ['fleet', 'Fleet & ESG'], ['weather', 'Weather'], ['safety', 'Safety']]
const STATUS_COLOR: Record<string, string> = {
  sourced: '#5fd38d', derived: '#7fb4ff', assumption: '#f0b85a', scenario_input: '#f0b85a',
  synthetic: '#c497f5', model_setting: '#7fb4ff', required_input: '#ff7a6b', external_reference: '#5ec8f2',
}
const TRUCK_COLOR: Record<string, string> = {
  hauling: '#38ef9d', returning: '#4fd1c5', loading: '#ffc246', dumping: '#ffc246',
  queued_at_excavator: '#f0b85a', queued_at_crusher: '#f0b85a', blocked: '#ff9f2e', breakdown: '#ff5149',
  standby: '#8da2b8',
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
const SHOULDER_OFFSET = 5.1 // centre of a truck parked on the shoulder, clear of its lane
const PULLED_OVER_OFFSET = 3.7 // pulled to the edge but still over the lane line while the road is restricted
const ROAD_HALF_WIDTH = 6.8
const LOOP_HALF_WIDTH = 4.4
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

// The haul cycle as one closed, one-way circuit. Circuit position s runs 0 → 2:
// 0 loading spot → face loop exit → outer lane → crusher loop → 1 tipping point → crusher loop exit →
// inner lane → face loop → 2 (= 0) loading spot. Trucks only ever move forward along it.
function circuitPosition(state: string, pct: number, heading: number, rank: number) {
  if (state === 'loading') return 0
  if (state === 'dumping') return 1
  if (state === 'queued_at_crusher') return (100 - LOOP_PCT - rank * QUEUE_SPACING_PCT) / 100
  if (state === 'queued_at_excavator') return 1 + (100 - (LOOP_PCT + rank * QUEUE_SPACING_PCT)) / 100
  // Smart dispatch: drive round the face loop to the point beside the standby bay (then into the bay).
  if (state === 'standby') return STANDBY_S
  const held = state === 'blocked' ? pct - heading * QUEUE_SPACING_PCT * (rank + .6) : pct
  return heading > 0 ? held / 100 : 1 + (100 - held) / 100
}

/** Metres represented by one circuit unit (the 3.2 km route); used to turn km/h into circuit speed. */
function metresPerUnit(_s: number) {
  return 3200
}

function circuitPose(s: number) {
  const at = ((s % 2) + 2) % 2
  if (at <= 1) {
    const pct = at * 100
    if (pct <= LOOP_PCT) return loopPose('face', .5 + pct / LOOP_PCT * .5) // loaded, finishing the face loop
    if (pct >= 100 - LOOP_PCT) return loopPose('crusher', (pct - (100 - LOOP_PCT)) / LOOP_PCT * .5) // into the dump loop
    return lanePose(pct, 1, LANE_OFFSET) // outer lane, loaded
  }
  const pct = 100 - (at - 1) * 100
  if (pct >= 100 - LOOP_PCT) return loopPose('crusher', .5 + (100 - pct) / LOOP_PCT * .5) // round the storage area
  if (pct <= LOOP_PCT) return loopPose('face', (LOOP_PCT - pct) / LOOP_PCT * .5) // into the loading loop
  return lanePose(pct, -1, LANE_OFFSET) // inner lane, empty
}

const WAITING = new Set(['queued_at_excavator', 'queued_at_crusher', 'blocked', 'standby'])
type Queues = Record<string, number[]>

/** Updates first-come-first-served queues from one snapshot and returns each truck's place in its queue. */
function advanceQueues(queues: Queues, get: Getter): number[] {
  const keyOf = (i: number) => {
    const state = String(get(`truck-0${i + 1}.state`))
    return WAITING.has(state) ? `${state}|${num(get(`truck-0${i + 1}.heading`)) >= 0}` : ''
  }
  const keys = Array.from({ length: 6 }, (_, i) => keyOf(i))
  for (const key of Object.keys(queues)) queues[key] = queues[key].filter(i => keys[i] === key)
  keys.forEach((key, i) => { if (key && !(queues[key] ??= []).includes(i)) queues[key].push(i) })
  return keys.map((key, i) => key ? queues[key].indexOf(i) : 0)
}

/** Moves forward from one circuit position to the next; a small apparent step back means "wait". */
function forwardBlend(from: number, to: number, f: number) {
  let delta = to - from
  while (delta < 0) delta += 2
  if (delta > 1.5) delta = 0
  return from + delta * THREE.MathUtils.clamp(f, 0, 1)
}

const ACCELERATION_MS2 = .5 // gentle haul-truck acceleration and braking, m/s²
const LOAD_SECONDS = 360 // 4 shovel passes × 1.5 min (OpenMines)
const DUMP_SECONDS = 60 // 1 min tipping (OpenMines)
// Hauler model parts (front of the truck is +X): the dump body pivots about BedPivot.
const BED_PIVOT = new THREE.Vector3(-.65, 1.25, 0)
const LOAD_ANCHOR = new THREE.Vector3(-.07, .4, 0)
type Activity = { kind: 'loading' | 'dumping' | null; progress: number }

// Loading follows the simulator: 4 shovel passes of 20.32 t, one every 90 s (OpenMines North Pit).
// Each pass: dig at the muck pile, swing loaded, dump into the truck body, swing back empty.
const LOAD_PASSES = 4
const PASS = { dig: .3, swing: .55, dump: .7 } // phase boundaries within one pass
function loadingPass(progress: number) {
  const scaled = THREE.MathUtils.clamp(progress, 0, .9999) * LOAD_PASSES
  return { pass: Math.floor(scaled), phase: scaled % 1 }
}
/** Share of a full payload in the truck body: rises in one step per bucket, while that bucket is dumped. */
function loadedShare(progress: number) {
  if (progress >= 1) return 1
  const { pass, phase } = loadingPass(progress)
  return (pass + THREE.MathUtils.smoothstep(phase, PASS.swing + .02, PASS.dump - .02)) / LOAD_PASSES
}

function LoggedTruck({ index, frame, layers, positions, activity, blockageActive, timeScale, roadKmh, loopKmh }: {
  index: number; frame: Frame; layers: Set<Layer>; positions: React.MutableRefObject<THREE.Vector3[]>
  activity: React.MutableRefObject<Activity[]>; blockageActive: boolean; timeScale: number; roadKmh: number; loopKmh: number
}) {
  const { scene } = useGLTF('/models/hauler.glb')
  const model = React.useMemo(() => scene.clone(), [scene])
  // Dump-body parts and their rest transforms, so the body can be tipped about its pivot.
  const bed = React.useMemo(() => {
    const parts: { node: THREE.Object3D; position: THREE.Vector3; rotationZ: number }[] = []
    model.traverse(node => {
      if (node.name.startsWith('Hauler_Bed') && node.name !== 'Hauler_BedPivot') parts.push({ node, position: node.position.clone(), rotationZ: node.rotation.z })
    })
    return parts
  }, [model])
  const load = React.useRef<THREE.Group>(null)
  const dwell = React.useRef<{ kind: 'loading' | 'dumping' | null; left: number }>({ kind: null, left: 0 })
  const group = React.useRef<THREE.Group>(null)
  const id = `truck-${String(index + 1).padStart(2, '0')}`
  const state = String(frame.at(`${id}.state`) ?? 'hauling')
  const heading: 1 | -1 = num(frame.at(`${id}.heading`)) >= 0 ? 1 : -1
  const shown = React.useRef<number | null>(null)
  const velocity = React.useRef(0) // circuit units per real second
  const pullOver = React.useRef(0) // extra sideways offset towards the shoulder while broken down
  const park = React.useRef(0) // 0 on the face loop, 1 in its standby bay
  useFrame((_, delta) => {
    if (!group.current) return
    const dt = Math.min(delta, .1)
    // The truck drives towards where the data next places it, like a driver: it speeds up to the
    // limit, slows for the loops, brakes to stop on its spot and waits. It never reverses.
    const target = frame.target(index)
    if (shown.current === null) shown.current = frame.circuit(index)
    let gap = target - shown.current
    while (gap < 0) gap += 2
    const pastTarget = gap > 1.5
    if (pastTarget) gap = 0 // the data is slightly behind: wait where we are
    if (gap > .7) { shown.current = frame.circuit(index); velocity.current = 0; gap = 0; dwell.current = { kind: null, left: 0 } } // replay jumped
    const m = metresPerUnit(shown.current)
    if (dwell.current.kind) {
      // Parked at the excavator or the tipping point until loading or dumping is finished.
      velocity.current = 0
      dwell.current.left -= dt * timeScale
      if (dwell.current.left <= 0) dwell.current = { kind: null, left: 0 }
    } else {
      const along = ((shown.current % 1) + 1) % 1
      const inLoop = along <= LOOP_PCT / 100 || along >= 1 - LOOP_PCT / 100
      const catchUp = gap > .12 ? 1.6 : 1 // more than ~400 m behind the data: up to 40 km/h to make up time
      const limit = (inLoop ? Math.min(loopKmh, roadKmh) : roadKmh) * catchUp / 3.6 / m * timeScale
      const accel = ACCELERATION_MS2 / m * timeScale * timeScale
      const wanted = Math.min(limit, Math.sqrt(2 * accel * gap))
      velocity.current = wanted > velocity.current ? Math.min(wanted, velocity.current + accel * dt) : wanted
      const before = shown.current
      let next = before + Math.min(gap, velocity.current * dt)
      // Hold a truck length behind the truck ahead, e.g. while it is still tipping or pulling away.
      const room = roomAhead(index, before) - MIN_GAP
      if (next > before + Math.max(0, room)) {
        next = before + Math.max(0, room)
        velocity.current = Math.min(velocity.current, Math.max(0, room) / Math.max(dt, 1e-3))
      }
      // Reaching the tipping point (s = 1) or the loading spot (s = 2 ≡ 0) always means stopping to work.
      if (before < 1 && next >= 1) { next = 1; dwell.current = { kind: 'dumping', left: DUMP_SECONDS } }
      else if (before < 2 && next >= 2) { next = 2; dwell.current = { kind: 'loading', left: LOAD_SECONDS } }
      shown.current = next % 2
    }
    SHOWN[index] = shown.current
    // A truck just called out of the standby bay waits beside the loop for its turn: it does not hold
    // up the trucks already queued for the excavator.
    ON_ROAD[index] = state !== 'breakdown' && park.current < .5 && !(pastTarget && state === 'queued_at_excavator')
    const work = dwell.current
    const progress = work.kind ? 1 - work.left / (work.kind === 'loading' ? LOAD_SECONDS : DUMP_SECONDS) : 0
    activity.current[index] = { kind: work.kind, progress }
    // Loaded between the loading spot and the end of tipping; the load grows while the shovel fills it.
    const s = shown.current
    const loaded = work.kind === 'loading' ? loadedShare(progress) : work.kind === 'dumping' ? 1 - Math.max(0, progress - .3) / .7 : s > 1e-4 && s < 1 ? 1 : 0
    if (load.current) { load.current.visible = loaded > .02; load.current.scale.set(1, Math.max(loaded, .05), 1) }
    // Tip the body: raise over the first 30 % of the dump, hold, lower over the last 20 %.
    const tilt = work.kind === 'dumping' ? .62 * Math.min(1, progress / .3, (1 - progress) / .2) : 0
    for (const part of bed) {
      const offset = part.position.clone().sub(BED_PIVOT).applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt)
      part.node.position.copy(BED_PIVOT).add(offset)
      part.node.rotation.z = part.rotationZ + tilt
    }
    if (load.current) {
      const at = LOAD_ANCHOR.clone().add(new THREE.Vector3(0, .42, 0)).sub(BED_PIVOT).applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt).add(BED_PIVOT)
      load.current.position.copy(at)
      load.current.rotation.z = tilt
    }
    // A broken-down truck pulls to the right-hand edge. While the simulator reports the road restricted it
    // still overhangs its lane; once the road reopens it sits fully on the shoulder.
    const pose = circuitPose(shown.current)
    if (state === 'breakdown') {
      const wanted = (blockageActive ? PULLED_OVER_OFFSET : SHOULDER_OFFSET) - LANE_OFFSET
      pullOver.current += (wanted - pullOver.current) * Math.min(1, dt * 1.2)
    } else pullOver.current += (0 - pullOver.current) * Math.min(1, dt * 1.2)
    if (Math.abs(pullOver.current) > 1e-3) pose.position.add(new THREE.Vector3(Math.sin(pose.yaw), 0, Math.cos(pose.yaw)).multiplyScalar(pullOver.current))
    // Parked by smart dispatch: once beside the bay, drive off the loop into this truck's own bay; on
    // release, drive back onto the loop and carry on to the excavator.
    const besideBay = Math.abs(shown.current - STANDBY_S) < .004
    park.current += ((state === 'standby' && besideBay ? 1 : 0) - park.current) * Math.min(1, dt * .8)
    let yaw = pose.yaw
    if (park.current <= 1e-3 && state !== 'standby') bayOf.delete(index)
    if (park.current > 1e-3) {
      const k = THREE.MathUtils.smoothstep(park.current, 0, 1)
      if (!bayOf.has(index)) {
        const taken = new Set(bayOf.values())
        bayOf.set(index, [0, 1, 2, 3].find(b => !taken.has(b)) ?? index % 4)
      }
      pose.position.lerp(STANDBY_BAY.slots[bayOf.get(index)!], k)
      let turn = STANDBY_BAY.yaw - pose.yaw
      while (turn > Math.PI) turn -= Math.PI * 2
      while (turn < -Math.PI) turn += Math.PI * 2
      yaw = pose.yaw + turn * k
    }
    group.current.position.copy(pose.position).add(new THREE.Vector3(0, .38, 0))
    group.current.rotation.y = yaw
    positions.current[index] = group.current.position.clone()
  })
  const color = TRUCK_COLOR[state] ?? '#38ef9d'
  return <group ref={group}>
    <group scale={1.22}>
      <primitive object={model}/>
      <group ref={load} visible={false}>
        <mesh position={[0, .2, 0]} scale={[1, .55, .8]}><sphereGeometry args={[1.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]}/>
          <meshStandardMaterial color="#8a5b36" roughness={1} flatShading/></mesh>
      </group>
    </group>
    <mesh position={[0, 4.4, 0]}><sphereGeometry args={[.32, 12, 10]}/><meshBasicMaterial color={color}/></mesh>
    {state === 'breakdown' && <BreakdownMarker name={`HT-${String(index + 1).padStart(2, '0')}`} speed={num(frame.at(`${id}.speed_kmh`))}/>}
    {layers.has('sensors') && <Html center distanceFactor={80} position={[0, 6.4, 0]} zIndexRange={[20, 0]}>
      <div className="ig-chip" style={{ borderColor: color, color }}>HT-{String(index + 1).padStart(2, '0')}</div>
    </Html>}
  </group>
}

/** Road surface along both turning loops and their links to the lanes, so trucks never drive on bare ground. */
function LoopRoads() {
  const parts = React.useMemo(() => (['face', 'crusher'] as const).map(end => {
    const curve = LOOPS[end]
    const build = (half: number, lift: number) => {
      const positions: number[] = []
      const indices: number[] = []
      const segments = 160
      for (let k = 0; k <= segments; k++) {
        const t = k / segments
        const point = curve.getPointAt(t)
        const forward = curve.getTangentAt(t).setY(0).normalize()
        const right = new THREE.Vector3(-forward.z, 0, forward.x)
        for (const side of [-1, 1]) {
          const v = point.clone().addScaledVector(right, side * half)
          positions.push(v.x, v.y + lift, v.z)
        }
        if (k < segments) indices.push(2 * k, 2 * k + 2, 2 * k + 1, 2 * k + 1, 2 * k + 2, 2 * k + 3)
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.setIndex(indices)
      geometry.computeVertexNormals()
      return geometry
    }
    return { surface: build(LOOP_HALF_WIDTH, .26), edge: build(LOOP_HALF_WIDTH + .15, .24) }
  }), [])
  const rings = React.useMemo(() => [{ centre: haulRoadPoint(1), radius: 7.3 }, { centre: haulRoadPoint(0), radius: 9.6 }], [])
  return <group>
    {rings.map(({ centre, radius }, i) => <group key={`ring-${i}`} position={centre.clone().add(new THREE.Vector3(0, .3, 0))} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh><ringGeometry args={[radius - LOOP_HALF_WIDTH - .15, radius + LOOP_HALF_WIDTH + .15, 72]}/><meshStandardMaterial color="#d9d2c0" roughness={1} side={THREE.DoubleSide}
        polygonOffset polygonOffsetFactor={-1}/></mesh>
      <mesh position={[0, 0, .01]}><ringGeometry args={[radius - LOOP_HALF_WIDTH, radius + LOOP_HALF_WIDTH, 72]}/><meshStandardMaterial color="#504a40" roughness={.98} side={THREE.DoubleSide}
        polygonOffset polygonOffsetFactor={-2}/></mesh>
    </group>)}
    {parts.map((p, i) => <group key={i}>
      <mesh geometry={p.edge}><meshStandardMaterial color="#d9d2c0" roughness={1} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-3}/></mesh>
      <mesh geometry={p.surface}><meshStandardMaterial color="#504a40" roughness={.98} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-4}/></mesh>
    </group>)}
  </group>
}

/** Safety berms (windrows) along both edges of the haul road and the turning loops, as on real haul roads. */
function SafetyBerms() {
  const tubes = React.useMemo(() => {
    const along = (points: THREE.Vector3[]) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(40, points.length * 3), .5, 6, false)
    const road = (side: 1 | -1) => {
      const points: THREE.Vector3[] = []
      for (let pct = LOOP_PCT; pct <= 100 - LOOP_PCT; pct += 1) points.push(lanePose(pct, 1, side * (ROAD_HALF_WIDTH + .5)).position.add(new THREE.Vector3(0, .35, 0)))
      return along(points)
    }
    const loop = (end: 'face' | 'crusher', side: 1 | -1) => {
      const curve = LOOPS[end]
      const points: THREE.Vector3[] = []
      for (let k = 4; k <= 76; k++) {
        const t = k / 80
        const forward = curve.getTangentAt(t).setY(0).normalize()
        points.push(curve.getPointAt(t).addScaledVector(new THREE.Vector3(-forward.z, 0, forward.x), side * (LOOP_HALF_WIDTH + .9)).add(new THREE.Vector3(0, .35, 0)))
      }
      return along(points)
    }
    return [road(-1), loop('face', 1), loop('face', -1), loop('crusher', 1), loop('crusher', -1)]
  }, [])
  return <group>{tubes.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial color="#9e7954" roughness={1}/></mesh>)}</group>
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

/**
 * Excavator loading cycle driven by the loading truck's progress: four passes, each digging at the muck
 * pile, swinging to the truck, opening the bucket over the body (rock falls in) and swinging back.
 * The boom and the arm/bucket are the model's own pivots (Excavator_BoomPivot, Excavator_BucketPivot).
 */
function Excavator({ activity, trucks }: { activity: React.MutableRefObject<Activity[]>; trucks: React.MutableRefObject<THREE.Vector3[]> }) {
  const { scene } = useGLTF('/models/excavator.glb')
  const rig = React.useMemo(() => {
    const model = scene.clone()
    const boom = model.getObjectByName('Excavator_BoomPivot')
    const arm = model.getObjectByName('Excavator_BucketPivot')
    const bucket = model.getObjectByName('Excavator_Bucket')
    // Material carried in the bucket, shown between digging and dumping.
    const heap = new THREE.Mesh(new THREE.SphereGeometry(.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8a5b36', roughness: 1, flatShading: true }))
    heap.position.set(1.25, -1.45, 0)
    heap.scale.set(1, .7, .9)
    heap.visible = false
    arm?.add(heap)
    return { model, boom, arm, bucket, heap, boomZ: boom?.rotation.z ?? 0, armZ: arm?.rotation.z ?? 0 }
  }, [scene])
  const group = React.useRef<THREE.Group>(null)
  const rocks = React.useRef<THREE.Group>(null)
  const base = React.useMemo(() => haulRoadPoint(1).add(new THREE.Vector3(1.2, .35, -1.5)), [])
  const { truckYaw, digYaw, pile } = React.useMemo(() => {
    // Aim at the middle of the truck's dump body, behind the cab (the truck's front is local +X).
    const loading = loopPose('face', .5)
    const spot = loading.position.clone().add(new THREE.Vector3(-Math.cos(loading.yaw), 0, Math.sin(loading.yaw)).multiplyScalar(1.6))
    const truckYaw = -Math.atan2(spot.z - base.z, spot.x - base.x)
    const digYaw = truckYaw + 1.9 // the muck pile lies a little over a quarter-turn from the truck
    const pile = new THREE.Vector3(Math.cos(-digYaw), 0, Math.sin(-digYaw)).multiplyScalar(4.6)
    return { truckYaw, digYaw, pile }
  }, [base])
  const bucketAt = React.useMemo(() => new THREE.Vector3(), [])
  const state = React.useRef({ yaw: truckYaw, boom: 0, arm: 0 })
  useFrame(({ clock }, delta) => {
    const truck = activity.current.findIndex(a => a?.kind === 'loading')
    const { boom, arm, heap } = rig
    let yaw = truckYaw, lift = -.2, curl = .35, carrying = false, dumping = -1
    if (truck >= 0) {
      const { phase } = loadingPass(activity.current[truck].progress)
      const ease = (a: number, b: number) => THREE.MathUtils.smoothstep(phase, a, b)
      if (phase < PASS.dig) {
        // Swing back to the pile, lower the boom and crowd the bucket through the rock.
        const k = ease(0, .12)
        yaw = THREE.MathUtils.lerp(truckYaw, digYaw, k)
        lift = THREE.MathUtils.lerp(.35, -.32, ease(.05, .2))
        curl = THREE.MathUtils.lerp(.55, -.45, ease(.14, PASS.dig))
        carrying = phase > .22
      } else if (phase < PASS.swing) {
        // Raise the full bucket and swing to the truck.
        const k = ease(PASS.dig, PASS.swing)
        yaw = THREE.MathUtils.lerp(digYaw, truckYaw, k)
        lift = THREE.MathUtils.lerp(-.32, .38, ease(PASS.dig, PASS.dig + .12))
        curl = -.45
        carrying = true
      } else if (phase < PASS.dump) {
        // Open the bucket over the body: the rock falls in.
        dumping = (phase - PASS.swing) / (PASS.dump - PASS.swing)
        yaw = truckYaw
        lift = .38
        curl = THREE.MathUtils.lerp(-.45, .75, ease(PASS.swing, PASS.swing + .06))
        carrying = dumping < .55
      } else {
        // Empty bucket, start back towards the pile.
        yaw = THREE.MathUtils.lerp(truckYaw, (truckYaw + digYaw) / 2, ease(PASS.dump, 1))
        lift = .38
        curl = .55
      }
    }
    // Hydraulics move smoothly towards the pose even when replay speed jumps.
    const follow = Math.min(1, delta * 6)
    const st = state.current
    st.yaw += (yaw - st.yaw) * follow
    st.boom += (lift - st.boom) * follow
    st.arm += (curl - st.arm) * follow
    if (group.current) group.current.rotation.y = st.yaw
    if (boom) boom.rotation.z = rig.boomZ + st.boom
    if (arm) arm.rotation.z = rig.armZ + st.arm
    heap.visible = carrying
    if (carrying && dumping >= 0) heap.scale.set(1, .7 * (1 - dumping / .55), .9)
    else heap.scale.set(1, .7, .9)
    // Falling rock: from the bucket lip down into the truck body.
    rig.bucket?.getWorldPosition(bucketAt)
    const body = truck >= 0 ? trucks.current[truck] : undefined
    rocks.current?.children.forEach((child, i) => {
      const t = dumping - i * .07
      child.visible = !!body && dumping >= 0 && t > 0 && t < .6
      if (!child.visible || !body) return
      const fall = t / .6
      const target = body.clone().add(new THREE.Vector3(((i % 3) - 1) * .5, 1.5, ((i % 2) - .5) * .6))
      child.position.copy(bucketAt).lerp(target, fall).sub(base)
      child.position.y += (1 - fall) * .4 - fall * fall * .2
      child.rotation.set(clock.elapsedTime * 3 + i, i, 0)
    })
  })
  return <group position={base}>
    <group ref={group} rotation={[0, truckYaw, 0]}><primitive object={rig.model} scale={1.5}/></group>
    {/* Blasted muck pile the excavator digs from. */}
    <group position={[pile.x, -.35, pile.z]}>
      <mesh scale={[2.4, 1.1, 1.9]}><sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]}/><meshStandardMaterial color="#7d5332" roughness={1} flatShading/></mesh>
      {[[-1.4, .3, .6], [1.1, .25, -.8], [.3, .9, .2], [-.6, .5, -1.1]].map(([x, y, z], i) =>
        <mesh key={i} position={[x, y, z]} rotation={[i, i * 2, 0]}><dodecahedronGeometry args={[.42 + i * .06, 0]}/><meshStandardMaterial color="#6e4a2e" roughness={1}/></mesh>)}
    </group>
    <group ref={rocks}>{Array.from({ length: 8 }, (_, i) => <mesh key={i}><dodecahedronGeometry args={[.3 + (i % 3) * .07, 0]}/><meshStandardMaterial color="#8a5b36" roughness={1}/></mesh>)}</group>
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
  return DUMP_POSE.position.clone().addScaledVector(inward, 4.9).setY(centre.y + .3) // just inside the loop road
})()
const HOPPER = plantToWorld(-2.6, 2.4, 0)
// Smart-dispatch standby bay: an engine-off parking pad on the free pit floor west of the face loop,
// clear of every road (checked against the terrain carve: the floor there spans about 16 x 16 units).
const STANDBY_BAY = (() => {
  const face = haulRoadPoint(1)
  const middle = new THREE.Vector3(-15.5, face.y - .25, 0)
  const out = new THREE.Vector3(-1, 0, 0) // from the loop into the bay
  const along = new THREE.Vector3(0, 0, 1)
  const slots = Array.from({ length: 4 }, (_, k) => middle.clone().addScaledVector(along, (k - 1.5) * 3.7))
  // Parked trucks face the loop, ready to drive straight out.
  return { middle, out, along, yaw: -Math.atan2(-out.z, -out.x), slots }
})()
// Where the face loop passes closest to the bay, before the excavator: trucks turn off the loop here.
const STANDBY_S = (() => {
  let best = 2, distance = Infinity
  for (let s = 1 + (100 - LOOP_PCT) / 100; s < 2; s += .0005) {
    const d = circuitPose(s).position.setY(0).distanceTo(STANDBY_BAY.middle.clone().setY(0))
    if (d < distance) { distance = d; best = s }
  }
  return best
})()
const bayOf = new Map<number, number>() // truck index -> bay, kept while it is parked
// Where each truck is drawn on the circuit, and whether it is on the road (not parked or pulled over),
// so a truck never drives into the one ahead of it.
const SHOWN: (number | null)[] = []
const ON_ROAD: boolean[] = []
const MIN_GAP = .03 // about one truck length plus a gap, in circuit units
/** Circuit distance to the nearest on-road truck ahead of this one (Infinity when none is close). */
function roomAhead(index: number, at: number) {
  let room = Infinity
  SHOWN.forEach((other, k) => {
    if (k === index || other === null || other === undefined || !ON_ROAD[k]) return
    const ahead = (((other - at) % 2) + 2) % 2
    if (ahead < 1e-6 && k > index) return // exactly level: the lower-numbered truck goes first
    if (ahead < .5) room = Math.min(room, ahead)
  })
  return room
}
// Crushed-ore storage sits on its own raised pad outside the pit (beyond the rim, away from the
// mining area), fed by an elevated overland conveyor that crosses over the dump loop.
const PAD_TOP = haulRoadPoint(0).y + .3
const STOCKPILE = new THREE.Vector3(66, PAD_TOP, 36)
const BELT_START = plantToWorld(1.1, 4.2, 0)
const BELT_END = STOCKPILE.clone().add(new THREE.Vector3(0, 9.5, 0))

/** The standby bay: gravel pad, bay markings, an access apron from the loop, a windrow and a sign. */
function StandbyBay({ parked }: { parked: number }) {
  const { middle, out, along, slots } = STANDBY_BAY
  const yaw = -Math.atan2(along.z, along.x) // local x runs along the bay row, local +z away from the loop
  return <group>
    <group position={middle} rotation={[0, yaw, 0]}>
      <mesh position={[0, -.55, 0]}><boxGeometry args={[16.6, 1.3, 8.2]}/><meshStandardMaterial color="#4a4339" roughness={1}/></mesh>
      <mesh position={[0, -.6, -5.6]}><boxGeometry args={[12, 1.3, 3.2]}/><meshStandardMaterial color="#544c41" roughness={1}/></mesh>
      {Array.from({ length: 5 }, (_, k) => <mesh key={k} position={[(k - 2) * 3.7, .11, .4]}><boxGeometry args={[.16, .02, 6]}/><meshBasicMaterial color="#e8e2cf"/></mesh>)}
      <mesh position={[0, .11, -2.6]}><boxGeometry args={[15, .02, .16]}/><meshBasicMaterial color="#e8e2cf"/></mesh>
      <mesh position={[0, .45, 4.5]}><boxGeometry args={[17, .9, 1]}/><meshStandardMaterial color="#9e7954" roughness={1}/></mesh>
      {[-8.5, 8.5].map(x => <mesh key={x} position={[x, .45, .6]}><boxGeometry args={[1, .9, 8.8]}/><meshStandardMaterial color="#9e7954" roughness={1}/></mesh>)}
    </group>
    {slots.map((slot, k) => <Html key={k} center distanceFactor={110} position={slot.clone().addScaledVector(out, 3.4).add(new THREE.Vector3(0, .4, 0))} zIndexRange={[15, 0]}>
      <div className="ig-bay-no">{k + 1}</div></Html>)}
    <Html center distanceFactor={90} position={middle.clone().addScaledVector(out, 5).add(new THREE.Vector3(0, 3.2, 0))} zIndexRange={[20, 0]}>
      <div className="ig-sign-label">Standby bay · engines off · {parked} parked</div></Html>
  </group>
}

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

function OreHandling({ frame, activity }: { frame: Frame; activity: React.MutableRefObject<Activity[]> }) {
  const rom = frame.atMix('crusher-01.rom_inventory_t')
  const fill = THREE.MathUtils.clamp(rom / 600, 0, 1)
  const throughput = num(frame.at('mine-01.throughput_tph'))
  const received = num(frame.at('mine-01.production_t'))
  const falling = React.useRef<THREE.Group>(null)
  const pile = React.useRef<THREE.Mesh>(null)
  // Pile radius grows with the cube root of tonnes received, so its volume tracks the tonnage.
  const pileScale = Math.cbrt(1 + received / 2500)
  useFrame(({ clock }) => {
    const dumping = activity.current.some(a => a?.kind === 'dumping' && a.progress > .25 && a.progress < .85)
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
    <ConveyorTrestles from={BELT_START} to={BELT_END}/>
    {/* Raised storage pad with a containment bund, outside the pit */}
    <mesh position={STOCKPILE.clone().add(new THREE.Vector3(0, -4, 0))}><cylinderGeometry args={[13, 14.5, 8, 40]}/><meshStandardMaterial color="#6f6455" roughness={1}/></mesh>
    <mesh position={STOCKPILE.clone().add(new THREE.Vector3(0, .35, 0))} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[12.2, 13, 48]}/><meshStandardMaterial color="#8a7d6a" roughness={1}/></mesh>
    <mesh ref={pile} position={STOCKPILE.clone().add(new THREE.Vector3(0, 2.6, 0))}><coneGeometry args={[6.2, 5.6, 32]}/><meshStandardMaterial color="#7d5b3f" roughness={1}/></mesh>
  </group>
}

/** Steel trestles holding the overland conveyor above the dump loop and the ground. */
function ConveyorTrestles({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const legs = React.useMemo(() => {
    const crusher = haulRoadPoint(0)
    return Array.from({ length: 7 }, (_, i) => from.clone().lerp(to, (i + 1) / 8))
      .filter(top => Math.hypot(top.x - crusher.x, top.z - crusher.z) > 13.6) // keep the loop road clear
  }, [from, to])
  return <group>{legs.map((top, i) => {
    const height = top.y - (PAD_TOP - 6)
    return <mesh key={i} position={[top.x, top.y - height / 2, top.z]}><boxGeometry args={[.45, height, .45]}/><meshStandardMaterial color="#c58a2b"/></mesh>
  })}</group>
}

/**
 * Mobile light towers as used on open-pit mines: trailer-mounted diesel units with a telescopic mast
 * and a four-lamp head, parked at the work areas (loading face, dump pad, stockpile, ramp bends) and
 * aimed at them, rather than continuous street lighting along the road.
 */
function RoadLighting() {
  const towers = React.useMemo(() => {
    const aimAt = (position: THREE.Vector3, target: THREE.Vector3) => ({
      position, target, yaw: -Math.atan2(target.z - position.z, target.x - position.x),
    })
    const face = haulRoadPoint(1)
    const crusher = haulRoadPoint(0)
    const rampA = lanePose(35, 1, 0).position
    const rampB = lanePose(68, 1, 0).position
    return [
      aimAt(face.clone().add(new THREE.Vector3(-9, 0, 6)), face),
      aimAt(crusher.clone().addScaledVector(crusher.clone().setY(0).normalize(), 13), crusher),
      aimAt(STOCKPILE.clone().add(crusher.clone().sub(STOCKPILE).setY(0).normalize().multiplyScalar(11)), STOCKPILE),
      aimAt(lanePose(35, 1, ROAD_HALF_WIDTH + 2.2).position, rampA),
      aimAt(lanePose(68, 1, ROAD_HALF_WIDTH + 2.2).position, rampB),
    ]
  }, [])
  return <group>{towers.map((t, i) => {
    const pool = t.position.clone().lerp(t.target, .55)
    return <group key={i}>
      <group position={t.position} rotation={[0, t.yaw, 0]}>
        {/* trailer with wheels and outriggers */}
        <mesh position={[0, .75, 0]}><boxGeometry args={[2.6, .9, 1.3]}/><meshStandardMaterial color="#e2c14f" roughness={.7}/></mesh>
        {[-.7, .7].map(z => <mesh key={z} position={[-.4, .35, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.35, .35, .25, 12]}/><meshStandardMaterial color="#1f2326"/></mesh>)}
        {[-1, 1].map(z => <mesh key={`o${z}`} position={[.9, .25, z * 1.1]}><boxGeometry args={[.25, .25, .9]}/><meshStandardMaterial color="#3a3f42"/></mesh>)}
        {/* telescopic mast and four-lamp head aimed at the work area */}
        <mesh position={[.6, 5.2, 0]}><cylinderGeometry args={[.1, .16, 8.8, 8]}/><meshStandardMaterial color="#c9cfcc"/></mesh>
        <group position={[.75, 9.6, 0]} rotation={[0, 0, -.35]}>
          <mesh><boxGeometry args={[.25, 1.3, 1.9]}/><meshStandardMaterial color="#2d3436"/></mesh>
          {[[-.32, -.45], [-.32, .45], [.32, -.45], [.32, .45]].map(([y, z]) => <mesh key={`${y}${z}`} position={[.14, y, z]}>
            <boxGeometry args={[.06, .5, .7]}/><meshStandardMaterial color="#fff6d0" emissive="#fff3c4" emissiveIntensity={2}/></mesh>)}
        </group>
      </group>
      {/* light pool on the ground where the tower is aimed */}
      <mesh position={pool.clone().add(new THREE.Vector3(0, .3, 0))} rotation={[-Math.PI / 2, 0, -t.yaw]}>
        <circleGeometry args={[7.5, 32]}/>
        <meshBasicMaterial color="#fff2c0" transparent opacity={.16} depthWrite={false} blending={THREE.AdditiveBlending}/>
      </mesh>
    </group>
  })}</group>
}

/** Weather in the scene: a windsock at the crusher pad, dust haze along the road, and rain when it falls. */
function WeatherScene({ weather }: { weather: Weather }) {
  const dust = React.useRef<THREE.Group>(null)
  const rain = React.useRef<THREE.Group>(null)
  const sockAt = React.useMemo(() => {
    const centre = haulRoadPoint(0)
    return centre.clone().addScaledVector(centre.clone().setY(0).normalize(), 15).add(new THREE.Vector3(0, 0, -6))
  }, [])
  // Compass: north is -z, east is +x. A windsock points downwind (wind direction + 180°).
  const bearing = THREE.MathUtils.degToRad((weather.wind_direction_deg + 180) % 360)
  const downwind = new THREE.Vector3(Math.sin(bearing), 0, -Math.cos(bearing))
  const sock = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), downwind)
  const stretch = THREE.MathUtils.clamp(weather.wind_speed_ms / 10, .25, 1)
  const seeds = React.useMemo(() => Array.from({ length: 60 }, (_, i) => ({ pct: (i * 37) % 100, side: ((i * 13) % 9) - 4, lift: 1 + (i % 5) })), [])
  const drops = React.useMemo(() => Array.from({ length: 110 }, (_, i) => new THREE.Vector3(((i * 53) % 130) - 65, (i * 17) % 40, ((i * 29) % 96) - 48)), [])
  const dustOpacity = THREE.MathUtils.clamp(weather.pm10_ugm3 / 400, .05, .5)
  useFrame(({ clock }) => {
    dust.current?.children.forEach((child, i) => {
      const seed = seeds[i]
      const base = lanePose(seed.pct, 1, seed.side).position
      const drift = (clock.elapsedTime * weather.wind_speed_ms * .15 + i) % 6
      child.position.copy(base).addScaledVector(downwind, drift).add(new THREE.Vector3(0, seed.lift, 0))
    })
    rain.current?.children.forEach((child, i) => {
      const start = drops[i]
      child.position.set(start.x, 32 - ((start.y + clock.elapsedTime * 28) % 55), start.z)
    })
  })
  return <group>
    <group position={sockAt}>
      <mesh position={[0, 3, 0]}><cylinderGeometry args={[.08, .1, 6, 6]}/><meshStandardMaterial color="#d8dcda"/></mesh>
      <mesh position={new THREE.Vector3(0, 5.8, 0).addScaledVector(downwind, 1.2 * stretch)} quaternion={sock} scale={[1, stretch, 1]}>
        <coneGeometry args={[.45, 2.6, 10, 1, true]}/><meshStandardMaterial color="#ff7a3c" side={THREE.DoubleSide}/></mesh>
    </group>
    <group ref={dust}>{seeds.map((_, i) => <mesh key={i}><sphereGeometry args={[1.6, 8, 6]}/>
      <meshBasicMaterial color="#c9a77d" transparent opacity={dustOpacity} depthWrite={false}/></mesh>)}</group>
    {weather.precipitation_mm_h > 0 && <group ref={rain}>{drops.map((_, i) => <mesh key={i}><boxGeometry args={[.05, 1.4, .05]}/>
      <meshBasicMaterial color="#cfe3ff" transparent opacity={.45}/></mesh>)}</group>}
  </group>
}

/** Safety furniture: excavator swing exclusion zone, loop speed signs, dump bund and a runaway escape lane. */
function SafetyScene({ loopSpeed }: { loopSpeed: number }) {
  const excavator = haulRoadPoint(1).add(new THREE.Vector3(1.2, .45, -1.5))
  const signs = React.useMemo(() => [lanePose(LOOP_PCT + 2, -1, ROAD_HALF_WIDTH + 1.4), lanePose(100 - LOOP_PCT - 2, 1, ROAD_HALF_WIDTH + 1.4)], [])
  const bund = React.useMemo(() => {
    const toTruck = DUMP_POSE.position.clone().sub(ROM_BIN).setY(0).normalize()
    return { position: ROM_BIN.clone().addScaledVector(toTruck, 3.3), yaw: -Math.atan2(toTruck.z, toTruck.x) }
  }, [])
  const escape = React.useMemo(() => lanePose(50, -1, ROAD_HALF_WIDTH + 2.6), [])
  return <group>
    <mesh position={excavator.clone().add(new THREE.Vector3(0, -.2, 0))} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[6.1, 6.5, 48]}/><meshBasicMaterial color="#ff4d4d" transparent opacity={.85} side={THREE.DoubleSide}/></mesh>
    <Html center distanceFactor={90} position={excavator.clone().add(new THREE.Vector3(0, 3.5, 6.3))} zIndexRange={[20, 0]}>
      <div className="ig-sign-label">Swing exclusion zone</div></Html>
    {signs.map((sign, i) => <group key={i} position={sign.position}>
      <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[.06, .06, 2.8, 6]}/><meshStandardMaterial color="#d8dcda"/></mesh>
      <Html center distanceFactor={80} position={[0, 3.2, 0]} zIndexRange={[20, 0]}><div className="ig-speed">{loopSpeed}</div></Html>
    </group>)}
    <group position={bund.position} rotation={[0, bund.yaw, 0]}>
      <mesh position={[0, .45, 0]}><boxGeometry args={[.6, .9, 5.2]}/><meshStandardMaterial color="#e2c14f"/></mesh>
      {[-1.8, 0, 1.8].map(z => <mesh key={z} position={[.01, .45, z]}><boxGeometry args={[.62, .92, .5]}/><meshStandardMaterial color="#1d1d1d"/></mesh>)}
    </group>
    <group position={escape.position} rotation={[0, escape.yaw + .18, 0]}>
      <mesh position={[0, .25, 0]}><boxGeometry args={[11, .5, 2.6]}/><meshStandardMaterial color="#d8c08a" roughness={1}/></mesh>
      <Html center distanceFactor={90} position={[0, 2.4, 0]} zIndexRange={[20, 0]}><div className="ig-sign-label">Runaway escape lane</div></Html>
    </group>
  </group>
}

/** Pit-wall design values shown in the scene, labelled as illustrative assumptions. */
function PitDesignCard() {
  const rows: [string, string][] = [
    ['Bench height', `${PIT_DESIGN.benchHeightM} m`],
    ['Bench face angle', `${PIT_DESIGN.benchFaceAngleDeg}°`],
    ['Working bench width', `${PIT_DESIGN.workingBenchWidthM} m (lowest ${PIT_DESIGN.workingBenches})`],
    ['Overall pit slope', `${PIT_DESIGN.overallSlopeDeg}°`],
    ['Catch berm', `by project design (≈${PIT_BENCHES.catchBermM.toFixed(1)} m implied)`],
    ['Benches drawn', `${PIT_BENCHES.benches.length}`],
  ]
  return <div className="ig-card ig-pit-card">
    <b>Pit design · illustrative</b>
    {rows.map(([label, v]) => <span key={label}><i style={{ background: STATUS_COLOR.assumption }}/>{label}<em>{v}</em></span>)}
    <small>Illustrative assumptions for a conceptual project, not approved Kazakhstan design values. Bench geometry must be set in the site's project documentation and verified by a qualified mining/geotechnical engineer.</small>
  </div>
}

function SpecsPanel({ specsOf }: { specsOf: (asset: string) => Spec[] }) {
  return <section className="ig-panel ig-inline" aria-label="Fixed specifications">
    <h2>Fixed specifications</h2>
    <p>Rated equipment values. They describe the machines and do not change during operation.</p>
    <SpecCard title="Haul trucks HT-01…06" specs={specsOf('Haul truck HT-01…06')}/>
    <SpecCard title="Excavator EX-01" specs={specsOf('Excavator EX-01')}/>
    <SpecCard title="Primary crusher CR-01" specs={specsOf('Primary crusher CR-01')}/>
    <SpecCard title="Main haul road" specs={specsOf('Main haul road')}/>
    <PitDesignCard/>
  </section>
}

type Reg = (id: string) => number
const TRAVELLING = new Set(['hauling', 'returning'])

/** Fleet advisor: what limits output now, how long trucks queue, and how many trucks the cycle needs. */
function FleetPanel({ frame, reg }: { frame: Frame; reg: Reg }) {
  const states = Array.from({ length: 6 }, (_, i) => String(frame.at(`truck-0${i + 1}.state`)))
  const active = states.filter(s => s !== 'breakdown').length
  const parked = states.filter(s => s === 'standby').length
  const smart = frame.at('scenario-controller.dispatch_policy') === 'smart'
  const speed = num(frame.at('road-main.speed_limit_kmh')) || reg('truck_speed_kmh')
  const cycleMin = reg('load_time_min') + reg('dump_time_min') + 2 * reg('route_length_km') / speed * 60
  const target = num(frame.at('scenario-controller.projected_throughput_tph'))
  const needed = Math.max(1, Math.ceil(target * cycleMin / 60 / reg('truck_payload_t') - 1e-9))
  const spare = active - needed
  const bottleneck = String(frame.at('mine-01.bottleneck_live') ?? frame.at('scenario-controller.bottleneck') ?? '—')
  const waitFace = num(frame.at('excavator-01.average_wait_min'))
  const waitCrusher = num(frame.at('crusher-01.average_wait_min'))
  const advice = smart
    ? `Smart dispatch is on: ${active - parked} trucks cycle and ${parked} wait engine-off on the ready line at the face.`
    : spare > 0
    ? `${needed} trucks are enough to reach ${target.toFixed(0)} t/h. The other ${spare} mostly wait in queues: switch on Scenario C (smart dispatch) to park ${spare === 1 ? 'one' : spare} at the face, or add a second loading unit to use them.`
    : spare < 0
      ? `Haulage is short by ${-spare} truck${spare === -1 ? '' : 's'}: the excavator waits for trucks. Lift the road restriction or bring in a spare truck.`
      : 'Fleet and loading unit are matched; queues come from cycle variation only.'
  return <section className="ig-panel ig-inline" aria-label="Fleet advisor">
    <h2>Fleet &amp; traffic advisor</h2>
    <div className="ig-gauges">
      <div><span>Active constraint</span><Flash value={bottleneck}>{bottleneck}</Flash></div>
      <div><span>Trucks needed / active</span><Flash value={`${needed}/${active}`}>{needed} <small>/ {active}</small></Flash></div>
      <div><span>Wait at face</span><Flash value={waitFace.toFixed(1)}>{waitFace.toFixed(1)} <small>min</small></Flash></div>
      <div><span>Wait at crusher</span><Flash value={waitCrusher.toFixed(1)}>{waitCrusher.toFixed(1)} <small>min</small></Flash></div>
      <div><span>Match factor</span><Flash value={frame.at('scenario-controller.match_factor')}>{num(frame.at('scenario-controller.match_factor')).toFixed(2)}</Flash></div>
      <div><span>Free cycle</span><Flash value={cycleMin.toFixed(1)}>{cycleMin.toFixed(1)} <small>min</small></Flash></div>
    </div>
    <p className="ig-advice">{advice}</p>
    <p className="ig-foot-note">Advice only. The mine has one haul road, so there is no alternative route to dispatch trucks to.</p>
  </section>
}

const FAULTS: [string, string][] = [['truck_breakdown', 'Truck HT-01 breakdown'], ['road_closure', 'Main road restriction'], ['crusher_slowdown', 'Crusher −45 %']]

/**
 * What-If Scenario Engine: A normal operations, B fault injection, C smart dispatch, and the dynamic
 * bottleneck. Every figure is read from the simulator's twins; the buttons only send the request.
 */
function WhatIfPanel({ frame, live }: { frame: Frame; live: boolean }) {
  const [busy, setBusy] = React.useState('')
  const [failure, setFailure] = React.useState('')
  const at = (key: string) => frame.at(key)
  const scenario = String(at('scenario-controller.active') ?? at('mine-01.active_scenario') ?? 'baseline')
  const policy = String(at('scenario-controller.dispatch_policy') ?? 'fixed')
  const send = async (path: string, body: object, label: string) => {
    setBusy(label)
    setFailure('')
    try {
      const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch (reason) {
      setFailure(`Request failed (${String(reason)}).`)
    } finally {
      setBusy('')
    }
  }
  const normal = async () => {
    await send('/api/scenario', { scenario: 'baseline' }, 'A')
    await send('/api/dispatch', { policy: 'fixed' }, 'A')
  }
  const projected = num(at('scenario-controller.projected_throughput_tph'))
  const baseline = num(at('scenario-controller.baseline_throughput_tph'))
  const impact = num(at('scenario-controller.impact_pct'))
  const hasDispatch = at('scenario-controller.dispatch_policy') !== undefined
  const hoursPerKt = num(at('mine-01.truck_operating_h_per_kt'))
  const disabled = !live || busy !== ''
  const card = (id: string, on: boolean) => `ig-wi-card${on ? ' on' : ''}${id === busy ? ' busy' : ''}`
  return <section className="ig-panel ig-inline ig-whatif" aria-label="What-if scenario engine">
    <h2>What-if scenario engine</h2>
    <div className="ig-wi-cards">
      <button id="ig-wi-a" className={card('A', scenario === 'baseline' && policy === 'fixed')} disabled={disabled} onClick={normal}>
        <b>A</b><span>Normal operations<small>baseline · fixed fleet</small></span></button>
      <div className={card('B', scenario !== 'baseline')}>
        <b>B</b><span>Fault injection<small>breakdown &amp; disruption</small></span>
        <div className="ig-wi-faults">
          {FAULTS.map(([id, label]) => <button key={id} id={`ig-wi-${id}`} className={scenario === id ? 'on' : ''} disabled={disabled}
            onClick={() => send('/api/scenario', { scenario: id }, 'B')}>{label}</button>)}
        </div>
      </div>
      <button id="ig-wi-c" className={card('C', policy === 'smart')} disabled={disabled || !hasDispatch} aria-pressed={policy === 'smart'}
        onClick={() => send('/api/dispatch', { policy: policy === 'smart' ? 'fixed' : 'smart' }, 'C')}>
        <b>C</b><span>Smart dispatch<small>{policy === 'smart' ? 'on · right-sized fleet' : 'off · tap to optimise'}</small></span></button>
    </div>
    <div className="ig-gauges">
      <div><span>Projected output</span><Flash value={projected.toFixed(0)}>{projected.toFixed(0)} <small>t/h</small></Flash></div>
      <div className={impact < 0 ? 'ig-bad' : ''}><span>vs normal {baseline.toFixed(0)} t/h</span><Flash value={impact}>{impact > 0 ? '+' : ''}{impact.toFixed(0)} <small>%</small></Flash></div>
      <div><span>Trucks cycling / parked</span><Flash value={`${at('scenario-controller.trucks_in_cycle')}/${at('scenario-controller.trucks_standby')}`}>
        {hasDispatch ? num(at('scenario-controller.trucks_in_cycle')) : '—'} <small>/ {hasDispatch ? num(at('scenario-controller.trucks_standby')) : '—'} · need {hasDispatch ? num(at('scenario-controller.trucks_required')) : '—'}</small></Flash></div>
      <div><span>Truck hours per kt</span><Flash value={hoursPerKt.toFixed(2)}>{hoursPerKt > 0 ? hoursPerKt.toFixed(2) : '—'} <small>h/kt</small></Flash></div>
    </div>
    <div className="ig-wi-bottleneck">
      <span>Bottleneck · planned</span><b>{String(at('scenario-controller.bottleneck') ?? '—')}</b>
      <span>Bottleneck · measured now</span><b>{String(at('mine-01.bottleneck_live') ?? '—')}</b>
      <p>{String(at('mine-01.bottleneck_live_reason') ?? at('scenario-controller.bottleneck_reason') ?? '')}</p>
    </div>
    {hasDispatch && <p className="ig-advice">{String(at('scenario-controller.dispatch_reason'))}</p>}
    <p className="ig-foot-note">{live
      ? failure || 'B and C combine: try a breakdown with smart dispatch on. Figures are simulator output, not site measurements.'
      : 'Controls need the running stand; the recorded replay has no dispatch data.'}</p>
  </section>
}

/** Energy and CO2 per tonne from the sourced fuel rates and IPCC diesel factors. */
function EsgPanel({ frame, reg, hours }: { frame: Frame; reg: Reg; hours: number }) {
  const running = Array.from({ length: 6 }, (_, i) => frame.at(`truck-0${i + 1}.state`)).filter(s => s !== 'breakdown' && s !== 'standby').length
  const litresPerHour = running * reg('truck_fuel_consumption_lph') + reg('excavator_fuel_consumption_lph')
  const tph = num(frame.at('mine-01.throughput_tph'))
  const perTonne = tph > 0 ? litresPerHour / tph : 0
  const co2PerHour = litresPerHour * reg('diesel_co2_kg_per_l')
  const shiftCo2 = co2PerHour * hours / 1000
  return <section className="ig-panel ig-inline" aria-label="Energy and emissions">
    <h2>Energy &amp; ESG</h2>
    <div className="ig-gauges">
      <div><span>Diesel use</span><Flash value={litresPerHour.toFixed(0)}>{litresPerHour.toFixed(0)} <small>L/h</small></Flash></div>
      <div><span>Diesel per tonne</span><Flash value={perTonne.toFixed(2)}>{tph > 0 ? perTonne.toFixed(2) : '—'} <small>L/t</small></Flash></div>
      <div><span>Energy per tonne</span><Flash value={perTonne.toFixed(2)}>{tph > 0 ? (perTonne * reg('diesel_energy_kwh_per_l')).toFixed(1) : '—'} <small>kWh/t</small></Flash></div>
      <div><span>CO₂ per tonne</span><Flash value={perTonne.toFixed(2)}>{tph > 0 ? (perTonne * reg('diesel_co2_kg_per_l')).toFixed(2) : '—'} <small>kg/t</small></Flash></div>
      <div><span>CO₂ rate</span><Flash value={co2PerHour.toFixed(0)}>{co2PerHour.toFixed(0)} <small>kg/h</small></Flash></div>
      <div><span>CO₂ this shift</span><Flash value={shiftCo2.toFixed(1)}>{shiftCo2.toFixed(1)} <small>t</small></Flash></div>
    </div>
    <p className="ig-foot-note">Diesel only: {running} trucks × {reg('truck_fuel_consumption_lph')} L/h + excavator {reg('excavator_fuel_consumption_lph')} L/h (Caterpillar handbook, medium load); {reg('diesel_co2_kg_per_l')} kg CO₂/L from IPCC 2006 defaults. Crusher electricity is excluded because its power rating is not available.</p>
  </section>
}

/** Synthetic weather station readings with the team's advisory alert thresholds. */
function WeatherPanel({ weather, reg }: { weather: Weather; reg: Reg }) {
  const alerts = [
    weather.pm10_ugm3 > reg('dust_alert_pm10_ugm3') && `Dust ${weather.pm10_ugm3} µg/m³: send the water truck to the haul road`,
    weather.precipitation_mm_h > reg('rain_alert_mm_per_h') && `Rain ${weather.precipitation_mm_h} mm/h: wet road, reduce speed`,
    weather.wind_speed_ms > reg('wind_alert_ms') && `Wind ${weather.wind_speed_ms} m/s: high wind`,
  ].filter(Boolean) as string[]
  return <section className="ig-panel ig-inline" aria-label="Weather">
    <h2>Weather station · synthetic</h2>
    <div className="ig-gauges">
      <div><span>Temperature</span><Flash value={weather.temperature_c}>{weather.temperature_c} <small>°C</small></Flash></div>
      <div><span>Wind</span><Flash value={weather.wind_speed_ms}>{weather.wind_speed_ms} <small>m/s · {weather.wind_direction_deg}°</small></Flash></div>
      <div><span>Dust PM10</span><Flash value={weather.pm10_ugm3}>{weather.pm10_ugm3} <small>µg/m³</small></Flash></div>
      <div><span>Rain</span><Flash value={weather.precipitation_mm_h}>{weather.precipitation_mm_h} <small>mm/h</small></Flash></div>
      <div><span>Humidity</span><Flash value={weather.humidity_pct}>{weather.humidity_pct} <small>%</small></Flash></div>
    </div>
    {alerts.length ? <ul className="ig-alerts">{alerts.map(a => <li key={a}>{a}</li>)}</ul> : <p className="ig-ok">No weather alerts.</p>}
    <p className="ig-foot-note">Demonstration signal, not measured weather. Alert levels are team thresholds, not regulatory limits.</p>
  </section>
}

/** Safety readings: following distance, swing zone, ROM bin headroom and road condition. */
/** Presentation of the simulator's breakdown state: flashing beacon, warning triangles and a label. */
function BreakdownMarker({ name, speed }: { name: string; speed: number }) {
  const beacon = React.useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!beacon.current) return
    const on = Math.sin(clock.elapsedTime * 7) > 0
    beacon.current.scale.setScalar(on ? 1.25 : .8)
    ;(beacon.current.material as THREE.MeshBasicMaterial).color.set(on ? '#ff2a1f' : '#7a1410')
  })
  return <group>
    <mesh ref={beacon} position={[0, 5.6, 0]}><sphereGeometry args={[.6, 14, 10]}/><meshBasicMaterial color="#ff2a1f"/></mesh>
    <mesh position={[0, 5.6, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.1, 1.35, 28]}/><meshBasicMaterial color="#ff5149" transparent opacity={.7} side={THREE.DoubleSide}/></mesh>
    {[-4.2, -6.4].map(x => <group key={x} position={[x, .55, 0]}>
      <mesh rotation={[0, Math.PI / 2, 0]}><coneGeometry args={[.55, 1.1, 3]}/><meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={.4}/></mesh>
    </group>)}
    <Html center distanceFactor={90} position={[0, 8.2, 0]} zIndexRange={[25, 0]}>
      <div className="ig-breakdown-tag"><b>{name} · BREAKDOWN</b><span>{speed.toFixed(0)} km/h · stopped</span></div>
    </Html>
  </group>
}

/**
 * Alert banner naming the broken-down truck and its operational consequence. It only reads the twin
 * fields the simulator publishes; it does not decide anything itself and disappears on recovery.
 */
function BreakdownAlert({ frame, reg }: { frame: Frame; reg: Reg }) {
  const broken = Array.from({ length: 6 }, (_, i) => i).filter(i => frame.at(`truck-0${i + 1}.state`) === 'breakdown')
  if (!broken.length) return null
  const first = broken[0]
  const name = `HT-0${first + 1}`
  const pct = num(frame.at(`truck-0${first + 1}.route_progress_pct`))
  const reported = frame.at('scenario-controller.breakdown_location')
  const where = typeof reported === 'string' && reported !== 'none'
    ? reported
    : `${(pct / 100 * reg('route_length_km')).toFixed(2)} km from the loading face`
  const blocked = num(frame.at('road-main.blocked_trucks'))
  const roadRestricted = frame.at('road-main.state') === 'restricted'
  const blockage = frame.at('road-main.blockage')
  // On the haul road the simulator blocks the single lane until the truck is towed; elsewhere it does not.
  const onRoad = typeof reported === 'string' && reported !== 'none' ? reported.startsWith('haul road') : pct > LOOP_PCT && pct < 100 - LOOP_PCT
  const roadText = roadRestricted
    ? blocked > 0 ? `Lane blocked: ${blocked} truck${blocked === 1 ? '' : 's'} held behind ${name}` : `Lane blocked by ${name}`
    : onRoad ? `${name} towed onto the shoulder; the road is open again` : `${name} is parked off the haul road; traffic is not blocked`
  const throughput = num(frame.at('mine-01.throughput_tph'))
  const projected = num(frame.at('scenario-controller.projected_throughput_tph'))
  const bottleneck = String(frame.at('mine-01.bottleneck_live') ?? frame.at('scenario-controller.bottleneck') ?? '—')
  return <section id="ig-breakdown-alert" className="ig-breakdown-alert" role="alert" aria-live="polite">
    <b>Breakdown · {broken.map(i => `HT-0${i + 1}`).join(', ')}</b>
    <span>Stopped at {where} · {num(frame.at(`truck-0${first + 1}.speed_kmh`)).toFixed(0)} km/h</span>
    <span>{typeof blockage === 'string' && blockage !== 'none' ? blockage : roadText}</span>
    <span>Crusher {throughput.toFixed(0)} t/h now · {projected.toFixed(0)} t/h expected with {6 - broken.length} trucks · constraint: {bottleneck}</span>
  </section>
}

function SafetyPanel({ frame, reg }: { frame: Frame; reg: Reg }) {
  const metresPerUnit = reg('route_length_km') * 1000
  const lanes: number[][] = [[], []]
  for (let i = 0; i < 6; i++) {
    if (!TRAVELLING.has(String(frame.at(`truck-0${i + 1}.state`)))) continue
    const s = ((frame.circuit(i) % 2) + 2) % 2
    lanes[s < 1 ? 0 : 1].push(s)
  }
  let closest = Infinity
  for (const lane of lanes) {
    lane.sort((a, b) => a - b)
    for (let k = 1; k < lane.length; k++) closest = Math.min(closest, (lane[k] - lane[k - 1]) * metresPerUnit)
  }
  const minimum = reg('min_following_gap_m')
  const headroom = 600 - num(frame.at('crusher-01.rom_inventory_t'))
  const blocked = num(frame.at('road-main.blocked_trucks'))
  const broken = Array.from({ length: 6 }, (_, i) => frame.at(`truck-0${i + 1}.state`)).filter(s => s === 'breakdown').length
  return <section className="ig-panel ig-inline" aria-label="Safety">
    <h2>Safety</h2>
    <div className="ig-gauges">
      <div className={closest < minimum ? 'ig-bad' : ''}><span>Closest gap, same lane</span>
        <Flash value={Math.round(closest / 10)}>{Number.isFinite(closest) ? closest.toFixed(0) : '—'} <small>m (min {minimum})</small></Flash></div>
      <div><span>In swing zone</span><Flash value={frame.at('excavator-01.state')}>{frame.at('excavator-01.state') === 'loading' ? '1' : '0'} <small>truck being loaded</small></Flash></div>
      <div className={headroom < reg('truck_payload_t') ? 'ig-warn' : ''}><span>ROM bin headroom</span><Flash value={Math.round(headroom)}>{headroom.toFixed(0)} <small>t</small></Flash></div>
      <div className={broken ? 'ig-bad' : ''}><span>Breakdowns / blocked</span><Flash value={`${broken}/${blocked}`}>{broken} <small>/ {blocked} trucks</small></Flash></div>
    </div>
    <p className="ig-foot-note">Gap rule {minimum} m and loop speed {reg('loop_speed_kmh')} km/h are team rules shown for monitoring; the simulation does not enforce them. Dumping is only allowed when the bin has room for a full {reg('truck_payload_t')} t load.</p>
  </section>
}

function SensorPanel({ frame, live, source }: { frame: Frame; live: boolean; source: string }) {
  const reading = (key: string, digits = 0) => {
    const raw = frame.at(key)
    return typeof raw === 'number' ? raw.toFixed(digits) : String(raw ?? '—').replace(/_/g, ' ')
  }
  const rom = num(frame.at('crusher-01.rom_inventory_t'))
  return <section className="ig-panel ig-right" aria-label="Sensor readings">
    <h2>{live ? 'Live sensor readings' : 'Sensor readings · replay'}</h2>
    <p>{live ? (source === 'eclipse-ditto' ? 'From the Eclipse Ditto twins, refreshed every 2 seconds.' : 'From the local demo simulator (not via OpenEgiz), refreshed every 2 seconds.') : 'From the recorded synthetic log; values change as the replay plays.'} Highlighted values just changed.</p>
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

function PitWallLabel() {
  const at = React.useMemo(() => pitWallPoint(2.2, PIT_BENCHES.floorD * .45).add(new THREE.Vector3(0, 2.5, 0)), [])
  return <Html center distanceFactor={115} position={at} zIndexRange={[20, 0]}>
    <div className="ig-node"><b>Pit wall · illustrative</b><span>{PIT_DESIGN.benchHeightM} m benches · {PIT_DESIGN.benchFaceAngleDeg}° faces · {PIT_DESIGN.overallSlopeDeg}° overall</span></div>
  </Html>
}

function Topology({ specs }: { specs: Spec[] }) {
  const tube = React.useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
    Array.from({ length: 60 }, (_, i) => haulRoadPoint(i / 59).add(new THREE.Vector3(0, 1.2, 0)))), 240, .35, 6, false), [])
  const nodes: [string, THREE.Vector3, string][] = [
    ['Loading face', haulRoadPoint(1), '1 server · 6 min per truck'],
    ['Haul road', haulRoadPoint(.5), `${specs.find(s => s.parameter_id === 'route_length_km')?.value ?? 3.2} km · two-way, keep right`],
    ['Dump bay', haulRoadPoint(0), '1 server · 1 min'],
    ['ROM bin → crusher', ROM_BIN.clone(), '600 t buffer · 900 t/h'],
    ['Crushed-ore stockpile', STOCKPILE.clone().add(new THREE.Vector3(0, 9, 0)), 'storage pad outside the pit'],
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

const STAND_SPEEDUP = 20 // the stand's simulator runs 20 simulated seconds per real second (SIM_SPEEDUP)
const SAMPLE_SECONDS = 300 // the recorded logs hold one sample every 5 simulated minutes
// The scene compresses the 3.2 km road to ~215 units (1 unit ≈ 15 m) but draws trucks ~9× real size so
// they stay visible; at about 10× a truck covers its own length in ~1.4 s, as a real truck does at 25 km/h.
const SPEEDS: [number, string][] = [[10, 'Real-life look (10×)'], [1, 'Real time (1×)'], [60, '60×'], [300, '300×']]

function Playhead({ playing, rows, head, speed, onRow }: { playing: boolean; rows: number; head: React.MutableRefObject<number>; speed: number; onRow: (row: number) => void }) {
  useFrame((_, delta) => {
    if (!playing) return
    // At 1× one simulated second passes per real second, so trucks move at their real 25 km/h.
    head.current = (head.current + Math.min(delta, .1) * speed / SAMPLE_SECONDS) % (rows - 1)
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
  const [speed, setSpeed] = React.useState(10)
  const [layers, setLayers] = React.useState<Set<Layer>>(new Set(['whatif', 'sensors', 'topology', 'flow']))
  const head = React.useRef(46)
  const trucks = React.useRef<THREE.Vector3[]>([])
  const activity = React.useRef<Activity[]>([])
  // Live mode: poll the OpenEgiz stand; any failure falls back to the recorded-log replay.
  const [live, setLive] = React.useState(false)
  const [liveSource, setLiveSource] = React.useState('eclipse-ditto')
  const [, setTick] = React.useState(0)
  const liveState = React.useRef<{ prev: Record<string, unknown>; curr: Record<string, unknown>; at: number; prevRanks: number[]; currRanks: number[] }>(
    { prev: {}, curr: {}, at: 0, prevRanks: [], currRanks: [] })
  const liveQueues = React.useRef<Queues>({})
  const replayQueues = React.useRef<{ log?: Log; ranks: number[][] }>({ ranks: [] })

  React.useEffect(() => {
    let stopped = false
    const poll = async () => {
      try {
        const response = await fetch('/api/state', { cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = await response.json()
        // Live from Eclipse Ditto, or from the simulator's local demo mode (labelled as such in the badge).
        if (!['eclipse-ditto', 'local-simulator-demo'].includes(body.source) || !Array.isArray(body.twins) || !body.twins.length) throw new Error('not live')
        setLiveSource(body.source)
        const flat: Record<string, unknown> = {}
        for (const twin of body.twins as { thingId: string; features?: Record<string, { properties?: { value?: unknown } }> }[]) {
          const name = String(twin.thingId).split(':')[1]
          for (const [feature, value] of Object.entries(twin.features ?? {})) flat[`${name}.${feature}`] = value?.properties?.value
        }
        if (stopped) return
        const previous = liveState.current.curr
        const prevRanks = liveState.current.currRanks
        const currRanks = advanceQueues(liveQueues.current, k => flat[k])
        liveState.current = { prev: Object.keys(previous).length ? previous : flat, curr: flat, at: performance.now(), prevRanks: prevRanks.length ? prevRanks : currRanks, currRanks }
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

  // Re-draw the replay clock every second so it counts in real time between samples.
  React.useEffect(() => {
    if (!playing || live) return
    const timer = window.setInterval(() => setTick(t => t + 1), 1000)
    return () => window.clearInterval(timer)
  }, [playing, live])

  React.useEffect(() => {
    fetch('/data/ingestion.json').then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setBundle).catch(reason => setError(String(reason)))
  }, [])
  const log = bundle?.logs[scenario]
  if (error) return <div className="ig-shell ig-msg">Could not load the ingestion data ({error}).</div>
  if (!bundle || !log) return <div className="ig-shell ig-msg">Loading the North Pit data layer…</div>

  const index = (key: string) => log.columns.indexOf(key)
  if (replayQueues.current.log !== log) {
    // Replay queue order is the order in which trucks joined each queue, walked through the whole log.
    const queues: Queues = {}
    replayQueues.current = { log, ranks: log.rows.map(r => advanceQueues(queues, key => r[log.columns.indexOf(key)])) }
  }
  const current = log.rows[Math.min(row, log.rows.length - 1)]
  const mix = (a: number, b: number, f: number) => Math.abs(b - a) > 60 ? (f < .5 ? a : b) : a + (b - a) * f
  // Circuit position of truck i in one snapshot; trucks sharing a waiting state line up by rank.
  const circuitIn = (get: Getter, i: number, rank: number) => {
    const t = `truck-0${i + 1}`
    const state = String(get(`${t}.state`) ?? 'hauling')
    const s = circuitPosition(state, num(get(`${t}.route_progress_pct`)), num(get(`${t}.heading`)) >= 0 ? 1 : -1, rank)
    if (state !== 'hauling' && state !== 'returning') return s
    // The simulator reports a truck as travelling until it reaches the dump or the face, so an arriving
    // truck would drive onto trucks already waiting there. Stop it at the back of the queue instead.
    const others = Array.from({ length: 6 }, (_, k) => k === i ? '' : String(get(`truck-0${k + 1}.state`)))
    const count = (wanted: string) => others.filter(v => v === wanted).length
    if (state === 'hauling') {
      const waiting = count('queued_at_crusher')
      return waiting || count('dumping') ? Math.min(s, (100 - LOOP_PCT - waiting * QUEUE_SPACING_PCT) / 100) : s
    }
    const waiting = count('queued_at_excavator')
    return waiting || count('loading') ? Math.min(s, 1 + (100 - (LOOP_PCT + waiting * QUEUE_SPACING_PCT)) / 100) : s
  }
  const replayRanks = replayQueues.current.ranks
  const rowGetter = (r: number): Getter => key => log.rows[Math.min(Math.max(r, 0), log.rows.length - 1)]?.[index(key)]
  const frame: Frame = live
    ? {
      at: key => (liveState.current.curr[key] ?? null) as string | number | null,
      atMix: key => {
        const { prev, curr, at } = liveState.current
        return mix(num(prev[key] ?? curr[key]), num(curr[key]), Math.min(1, (performance.now() - at) / 2000))
      },
      circuit: i => {
        const { prev, curr, at } = liveState.current
        const ranks = liveState.current
        return forwardBlend(circuitIn(k => prev[k] ?? curr[k], i, ranks.prevRanks[i] ?? 0), circuitIn(k => curr[k], i, ranks.currRanks[i] ?? 0), (performance.now() - at) / 2000)
      },
      target: i => circuitIn(k => liveState.current.curr[k], i, liveState.current.currRanks[i] ?? 0),
    }
    : {
      at: key => current[index(key)],
      atMix: key => {
        const i = Math.floor(head.current), f = head.current - i
        return mix(num(log.rows[i]?.[index(key)]), num(log.rows[Math.min(i + 1, log.rows.length - 1)]?.[index(key)]), f)
      },
      circuit: t => {
        const i = Math.floor(head.current)
        const next = Math.min(i + 1, log.rows.length - 1)
        return forwardBlend(circuitIn(rowGetter(i), t, replayRanks[i]?.[t] ?? 0), circuitIn(rowGetter(next), t, replayRanks[next]?.[t] ?? 0), head.current - i)
      },
      target: t => {
        const next = Math.min(Math.floor(head.current) + 1, log.rows.length - 1)
        return circuitIn(rowGetter(next), t, replayRanks[next]?.[t] ?? 0)
      },
    }
  const specsOf = (asset: string) => {
    const all = bundle.equipment.flatMap(e => e.specs)
    return SPEC_PICK[asset].map(id => all.find(s => s.parameter_id === id)!).filter(Boolean)
  }
  const toggle = (layer: Layer) => setLayers(prev => { const next = new Set(prev); next.has(layer) ? next.delete(layer) : next.add(layer); return next })
  const seek = (value: number) => { head.current = value; setRow(value) }
  const hours = (live ? num(frame.at('mine-01.sim_time_s')) : head.current * SAMPLE_SECONDS) / 3600
  const reg: Reg = id => num(bundle.register.find(r => r.parameter_id === id)?.value)
  const weatherIndex = Math.min(bundle.weather.rows.length - 1, Math.max(0, Math.floor(live ? num(frame.at('mine-01.sim_time_s')) / SAMPLE_SECONDS : head.current) % bundle.weather.rows.length))
  const weather: Weather = Object.fromEntries(bundle.weather.columns.map((c, k) => [c, bundle.weather.rows[weatherIndex][k]]))
  const clock = `${Math.floor(hours)} h ${String(Math.floor(hours * 60) % 60).padStart(2, '0')} min ${String(Math.floor(hours * 3600) % 60).padStart(2, '0')} s`
  const liveScenario = String(frame.at('mine-01.active_scenario') ?? 'baseline')

  return <main className="ig-shell">
    <div className="ig-stage">
      <Canvas camera={{ position: [84, 78, 96], fov: 42 }} dpr={[.75, 1.25]} gl={{ antialias: true, powerPreference: 'low-power', toneMapping: THREE.ACESFilmicToneMapping }}>
        <TerrainStage showRoads showPlant moving hideStorage twins={[{ thingId: 'c', attributes: { kind: 'crusher' }, features: { state: { properties: { value: String(frame.at('crusher-01.state')) } } } }]}/>
        <Playhead playing={playing && !live} rows={log.rows.length} head={head} speed={speed} onRow={r => r !== row && setRow(r)}/>
        <LoopRoads/>
        <SafetyBerms/>
        <LaneArrows/>
        {Array.from({ length: 6 }, (_, i) => <LoggedTruck key={i} index={i} frame={frame} layers={layers} positions={trucks} activity={activity}
          blockageActive={frame.at('road-main.state') === 'restricted'}
          timeScale={live ? STAND_SPEEDUP : playing ? speed : 0} roadKmh={num(frame.at('road-main.speed_limit_kmh')) || reg('truck_speed_kmh')} loopKmh={reg('loop_speed_kmh')}/>)}
        <Excavator activity={activity} trucks={trucks}/>
        <OreHandling frame={frame} activity={activity}/>
        <StandbyBay parked={Array.from({ length: 6 }, (_, i) => frame.at(`truck-0${i + 1}.state`)).filter(v => v === 'standby').length}/>
        <RoadLighting/>
        {layers.has('weather') && <WeatherScene weather={weather}/>}
        {layers.has('safety') && <SafetyScene loopSpeed={reg('loop_speed_kmh')}/>}
        {layers.has('topology') && <Topology specs={specsOf('Main haul road')}/>}
        {layers.has('topology') && <PitWallLabel/>}
        {layers.has('flow') && <DataFlow trucks={trucks}/>}
      </Canvas>
    </div>
    {['whatif', 'specs', 'fleet', 'weather', 'safety'].some(l => layers.has(l as Layer)) && <div className="ig-stack">
      {layers.has('whatif') && <WhatIfPanel frame={frame} live={live}/>}
      {layers.has('fleet') && <FleetPanel frame={frame} reg={reg}/>}
      {layers.has('fleet') && <EsgPanel frame={frame} reg={reg} hours={hours}/>}
      {layers.has('safety') && <SafetyPanel frame={frame} reg={reg}/>}
      {layers.has('weather') && <WeatherPanel weather={weather} reg={reg}/>}
      {layers.has('specs') && <SpecsPanel specsOf={specsOf}/>}
    </div>}
    {layers.has('sensors') && <SensorPanel frame={frame} live={live} source={liveSource}/>}

    <BreakdownAlert frame={frame} reg={reg}/>

    <header className="ig-title">
      <span>LAYER 1 · DATA &amp; ASSET INGESTION</span>
      <h1>North Pit</h1>
      <div id="ig-mode" className={`ig-mode ${live ? 'live' : 'replay'}`} role="status">
        <i/>{!live ? 'REPLAY · recorded synthetic log (stand offline)'
          : liveSource === 'eclipse-ditto' ? 'LIVE · Eclipse Ditto twins · every 2 s' : 'DEMO · local simulator (not via OpenEgiz) · every 2 s'}
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
        ? <span className="ig-clock ig-live-note">{liveSource === 'eclipse-ditto' ? 'Live from OpenEgiz' : 'Local demo simulator'} · simulated time {hours.toFixed(2)} h · {bundle.logs[liveScenario]?.label ?? liveScenario}</span>
        : <>
          <button id="ig-play" className="ig-play" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? '❚❚' : '▶'}</button>
          <select id="ig-scenario" value={scenario} onChange={e => setScenario(e.target.value)} aria-label="Telemetry log">
            {Object.entries(bundle.logs).map(([id, l]) => <option key={id} value={id}>{l.label}</option>)}
          </select>
          <select id="ig-speed" value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Playback speed">
            {SPEEDS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <input id="ig-time" type="range" min={0} max={log.rows.length - 1} value={row} onChange={e => seek(Number(e.target.value))} aria-label="Replay time"/>
          <span className="ig-clock">{clock} · {hours < 4 ? 'normal operations' : log.label}</span>
        </>}
      <span className="ig-read">{num(frame.at('mine-01.throughput_tph')).toFixed(0)} <small>t/h</small></span>
      <span className="ig-read">{num(frame.at('crusher-01.rom_inventory_t')).toFixed(0)} <small>t ROM</small></span>
      <span className="ig-read">{String(frame.at('road-main.state'))} <small>road</small></span>
    </footer>
  </main>
}

useGLTF.preload('/models/hauler.glb')
useGLTF.preload('/models/excavator.glb')

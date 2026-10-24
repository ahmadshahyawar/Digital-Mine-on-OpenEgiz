import React from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
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
  dispatchComparison?: DispatchEvidence
  twinRelationships?: RelationshipContract
  decisionExplanation?: DecisionEvidence
  productionRecovery?: RecoveryEvidence
}
// A8/A9 decision explanation (DECISION_EXPLANATION_CONTRACT.md, schema v1). Rendered only when the bundle carries it.
type FleetRow = { trucks: number; throughput_tph: number; loading_queue_trucks_avg: number; crusher_queue_trucks_avg: number; truck_operating_h_per_1000_t: number; bottleneck: string }
type DecisionEvidence = {
  schema_version: string; source_label: string; claim: string
  questions: Record<string, { question: string; answer: string; recommended_action: string; comparison?: FleetRow[]
    studies?: Record<string, { unit: string; category: string; baseline_value: number; cases: { value: number; recommended_active_trucks: number; plateau_observed: boolean }[] }> }>
  presentation_contract: { rounding: { throughput_tph: number; queues_trucks: number; truck_h_per_1000_t: number } }
}
// C1 twin relationship contract (TWIN_RELATIONSHIP_CONTRACT.md, schema v1). Only the fields used here.
type RelationshipNode = { id: string; thing_id: string; label: string; kind: string; parent_thing_id: string | null; state_feature: string }
type Relationship = { id: string; type: string; category: 'hierarchy' | 'material' | 'movement' | 'control'; source: string; target: string; label: string }
type RelationshipContract = { schema_version: string; namespace: string; node_count: number; nodes: RelationshipNode[]; relationships: Relationship[] }
// A3 production and recovery history (HISTORY_CONTRACT.md, schema v1). Only the fields used here.
type RecoverySample = { period_id: number; sim_time_s: number; elapsed_s: number; observed_rolling_throughput_tph: number
  projected_steady_capacity_tph: number; production_t: number; active_scenario: string; road_state: string; blocked_trucks: number }
type RecoveryEvent = { period_id: number; sim_time_s: number; kind: string; label: string }
type RecoveryEvidence = {
  schema_version: string; claim: string; methodology: { sample_s: number; recovery_rule: string }
  baseline: { samples: RecoverySample[] }
  breakdown_recovery: { events: RecoveryEvent[]; periods: { period_id: number; label: string; samples: RecoverySample[] }[] }
}
// A2 matched fixed-versus-smart evidence (DISPATCH_COMPARISON_CONTRACT.md, schema v1). Only the fields used here.
type PolicyMetrics = Record<string, number>
type DispatchEvidence = {
  schema_version: string
  claim: string
  methodology: { steady_window_h: number; fuel_basis: string }
  scenarios: Record<string, {
    label: string; trucks_required: number
    periods: Record<'transient' | 'steady', { window_h: number; fixed: PolicyMetrics; smart: PolicyMetrics; smart_minus_fixed: Record<string, { absolute: number; percent: number | null }> }>
  }>
}
type Weather = Record<string, number>
type Layer = 'specs' | 'sensors' | 'topology' | 'flow' | 'fleet' | 'esg' | 'weather' | 'safety'
type Frame = {
  at: (key: string) => string | number | null
  atMix: (key: string) => number
  circuit: (truck: number) => number
  /** Where the data next places the truck on the circuit: the waypoint it drives towards. */
  target: (truck: number) => number
  /** Feature names the returned twin (or the replay log) carries for one twin id, e.g. "crusher-01". */
  features: (twin: string) => string[]
}
type Getter = (key: string) => unknown

const LAYERS: [Layer, string][] = [['specs', 'Specifications'], ['sensors', 'IoT sensors'], ['topology', 'Topology'], ['flow', 'Data flow'], ['fleet', 'Fleet advisor'], ['esg', 'Fuel & CO₂'], ['weather', 'Weather'], ['safety', 'Safety']]
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

function LoggedTruck({ index, frame, layers, positions, activity, blockageActive, timeScale, roadKmh, loopKmh, selected, onSelect }: {
  index: number; frame: Frame; layers: Set<Layer>; positions: React.MutableRefObject<THREE.Vector3[]>
  activity: React.MutableRefObject<Activity[]>; blockageActive: boolean; timeScale: number; roadKmh: number; loopKmh: number
  selected: boolean; onSelect: () => void
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
    // A failure ends any loading or tipping still being shown: the twin already has the truck on the road.
    if (dwell.current.kind && (state === 'breakdown' || state === 'blocked')) dwell.current = { kind: null, left: 0 }
    if (dwell.current.kind) {
      // Parked at the excavator or the tipping point until loading or dumping is finished.
      velocity.current = 0
      dwell.current.left -= dt * timeScale
      if (dwell.current.left <= 0) dwell.current = { kind: null, left: 0 }
    } else {
      const along = ((shown.current % 1) + 1) % 1
      const inLoop = along <= LOOP_PCT / 100 || along >= 1 - LOOP_PCT / 100
      // More than ~400 m behind the data: up to 40 km/h to make up time. A truck that has failed or is held behind
      // a failure closes the gap quickly, so it is seen stopped where the twin reports it.
      const catchUp = state === 'breakdown' || state === 'blocked' ? 3 : gap > .12 ? 1.6 : 1
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
  return <group ref={group} onClick={event => { event.stopPropagation(); onSelect() }}
    onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
    {selected && <mesh position={[0, .08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[3.6, 4.2, 40]}/>
      <meshBasicMaterial color="#ffe36e" transparent opacity={.9} side={THREE.DoubleSide}/></mesh>}
    <group scale={1.22}>
      <primitive object={model}/>
      <group ref={load} visible={false}>
        <mesh position={[0, .2, 0]} scale={[1, .55, .8]}><sphereGeometry args={[1.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]}/>
          <meshStandardMaterial color="#8a5b36" roughness={1} flatShading/></mesh>
      </group>
    </group>
    <mesh position={[0, 4.4, 0]}><sphereGeometry args={[.32, 12, 10]}/><meshBasicMaterial color={color}/></mesh>
    {state === 'breakdown' && <BreakdownMarker name={`HT-${String(index + 1).padStart(2, '0')}`} speed={num(frame.at(`${id}.speed_kmh`))}/>}
    {(layers.has('sensors') || selected) && <Html center distanceFactor={80} position={[0, 6.4, 0]} zIndexRange={[20, 0]}>
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
      // A flat road surface faces straight up. Where the link bends sharply onto the ring the strip folds over
      // itself; with computed normals (and double-sided flipping) the fold was shaded as dark triangles across the
      // pad. Wind every triangle to face up and give every vertex an upward normal so the whole surface lights evenly.
      for (let k = 0; k < indices.length; k += 3) {
        const [a, b, c] = [indices[k], indices[k + 1], indices[k + 2]].map(i => i * 3)
        const cross = (positions[b + 2] - positions[a + 2]) * (positions[c] - positions[a]) - (positions[b] - positions[a]) * (positions[c + 2] - positions[a + 2])
        if (cross < 0) [indices[k + 1], indices[k + 2]] = [indices[k + 2], indices[k + 1]]
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.setIndex(indices)
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(positions.map((_, k) => k % 3 === 1 ? 1 : 0), 3))
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
    // Each turning loop gets one windrow round its outside edge, open where the haul road joins; the
    // island inside the loop needs none. Road windrows stop short of the loops so no berm crosses the
    // paved turning area that trucks swing through.
    const loops = [{ centre: haulRoadPoint(1), radius: 7.3, end: 1 }, { centre: haulRoadPoint(0), radius: 9.6, end: 0 }]
    const clearOfLoops = (p: THREE.Vector3) => loops.every(l => Math.hypot(p.x - l.centre.x, p.z - l.centre.z) > l.radius + LOOP_HALF_WIDTH + 1.6)
    const road = (side: 1 | -1) => {
      const points: THREE.Vector3[] = []
      for (let pct = LOOP_PCT; pct <= 100 - LOOP_PCT; pct += 1) points.push(lanePose(pct, 1, side * (ROAD_HALF_WIDTH + .5)).position.add(new THREE.Vector3(0, .35, 0)))
      return along(points.filter(clearOfLoops))
    }
    const loopBerm = ({ centre, radius, end }: typeof loops[number]) => {
      const r = radius + LOOP_HALF_WIDTH + .9
      // Where the haul road's centreline crosses the berm circle: leave the road's width open there.
      let join = centre.clone()
      for (let k = 0; k <= 400; k++) {
        const point = haulRoadPoint(end === 1 ? 1 - k / 2000 : k / 2000)
        join = point
        if (Math.hypot(point.x - centre.x, point.z - centre.z) >= r) break
      }
      const gaps = [{ at: Math.atan2(join.z - centre.z, join.x - centre.x), half: Math.atan((ROAD_HALF_WIDTH + 1.4) / r) * 1.1 }]
      // The face loop also opens towards the standby bay, the full width of the bay, so parked trucks have a way in.
      if (end === 1) {
        const bay = STANDBY_BAY.middle
        gaps.push({ at: Math.atan2(bay.z - centre.z, bay.x - centre.x), half: Math.atan(9.4 / r) * 1.15 })
      }
      const open = (a: number) => gaps.some(g => Math.abs(Math.atan2(Math.sin(a - g.at), Math.cos(a - g.at))) < g.half)
      // Walk round the circle and keep each closed stretch as its own windrow.
      const segments: THREE.Vector3[][] = []
      let current: THREE.Vector3[] = []
      const start = gaps[0].at + gaps[0].half
      for (let k = 0; k <= 240; k++) {
        const a = start + Math.PI * 2 * k / 240
        if (open(a)) { if (current.length > 1) segments.push(current); current = []; continue }
        current.push(new THREE.Vector3(centre.x + Math.cos(a) * r, centre.y + .35, centre.z + Math.sin(a) * r))
      }
      if (current.length > 1) segments.push(current)
      return segments.map(along)
    }
    return [road(-1), ...loops.flatMap(loopBerm)]
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
function StandbyBay({ parked, labels }: { parked: number; labels: boolean }) {
  const { middle, out, along, slots } = STANDBY_BAY
  const yaw = -Math.atan2(along.z, along.x) // local x runs along the bay row, local +z away from the loop
  return <group>
    <group position={middle} rotation={[0, yaw, 0]}>
      <mesh position={[0, -.55, 0]}><boxGeometry args={[16.6, 1.3, 8.2]}/><meshStandardMaterial color="#4a4339" roughness={1}/></mesh>
      {/* Paved access apron, the full width of the bay, joining the face loop through the gap in its windrow. */}
      <mesh position={[0, -.58, -7.2]}><boxGeometry args={[16.6, 1.3, 6.6]}/><meshStandardMaterial color="#504a40" roughness={.98}/></mesh>
      {[-8.1, 8.1].map(x => <mesh key={x} position={[x, .12, -7.2]}><boxGeometry args={[.16, .02, 6.4]}/><meshBasicMaterial color="#d9d2c0"/></mesh>)}
      {Array.from({ length: 5 }, (_, k) => <mesh key={k} position={[(k - 2) * 3.7, .11, .4]}><boxGeometry args={[.16, .02, 6]}/><meshBasicMaterial color="#e8e2cf"/></mesh>)}
      <mesh position={[0, .11, -2.6]}><boxGeometry args={[15, .02, .16]}/><meshBasicMaterial color="#e8e2cf"/></mesh>
      <mesh position={[0, .45, 4.5]}><boxGeometry args={[17, .9, 1]}/><meshStandardMaterial color="#9e7954" roughness={1}/></mesh>
      {[-8.5, 8.5].map(x => <mesh key={x} position={[x, .45, .6]}><boxGeometry args={[1, .9, 8.8]}/><meshStandardMaterial color="#9e7954" roughness={1}/></mesh>)}
    </group>
    {labels && slots.map((slot, k) => <Html key={k} center distanceFactor={110} position={slot.clone().addScaledVector(out, 3.4).add(new THREE.Vector3(0, .4, 0))} zIndexRange={[15, 0]}>
      <div className="ig-bay-no">{k + 1}</div></Html>)}
    {(labels || parked > 0) && <Html center distanceFactor={50} position={middle.clone().addScaledVector(out, 5).add(new THREE.Vector3(0, 3.2, 0))} zIndexRange={[20, 0]}>
      <div className="ig-sign-label">Standby bay · engines off · {parked} parked</div></Html>}
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

/** Truck counts from the returned twin fields; the replay log lacks them, so count truck states there. */
function fleetSplit(frame: Frame) {
  const states = Array.from({ length: 6 }, (_, i) => String(frame.at(`truck-0${i + 1}.state`) ?? ''))
  const down = states.filter(s => s === 'breakdown').length
  const reported = frame.at('scenario-controller.trucks_in_cycle')
  if (reported !== null && reported !== undefined) {
    return { cycling: num(reported), parked: num(frame.at('scenario-controller.trucks_standby')), down }
  }
  const parked = states.filter(s => s === 'standby').length
  return { cycling: 6 - parked - down, parked, down }
}

const CRUSHER_SIDE = new Set(['crusher processing capacity', 'dump point'])
// Operator names for the simulator's constraint values (the values themselves are unchanged).
const CONSTRAINT_NAME: Record<string, string> = {
  'loading resource': 'Excavator', 'haul-road travel': 'Haul road', 'available truck fleet': 'Truck fleet',
  'dump point': 'Dump bay', 'crusher processing capacity': 'Crusher',
}

/** The four numbers an operator needs first: output, what limits it, the fleet, and the queue that matters. */
function KpiStrip({ frame }: { frame: Frame }) {
  const tph = frame.at('mine-01.throughput_tph')
  const bottleneck = String(frame.at('mine-01.bottleneck_live') ?? frame.at('scenario-controller.bottleneck') ?? '—')
  const { cycling, parked, down } = fleetSplit(frame)
  // The queue worth watching is the one in front of the constraint: the crusher when it limits output, else the face.
  const atCrusher = CRUSHER_SIDE.has(bottleneck)
  const wait = frame.at(atCrusher ? 'crusher-01.average_wait_min' : 'excavator-01.average_wait_min')
  const queue = frame.at(atCrusher ? 'crusher-01.queue_length' : 'excavator-01.queue_length')
  const missing = (v: unknown) => v === null || v === undefined || v === ''
  return <section className="ig-kpis" aria-label="Key figures">
    <div><span>Production now</span><Flash value={tph}>{missing(tph) ? '—' : num(tph).toFixed(0)} <small>t/h</small></Flash></div>
    <div title={bottleneck}><span>What limits output</span><Flash value={bottleneck}>{CONSTRAINT_NAME[bottleneck] ?? bottleneck}</Flash></div>
    <div><span>Trucks working · parked</span><Flash value={`${cycling}/${parked}/${down}`}>{cycling} <small>· {parked} parked{down ? ` · ${down} down` : ''}</small></Flash></div>
    <div><span>Wait at {atCrusher ? 'crusher' : 'loading face'}</span><Flash value={wait}>{missing(wait) ? '—' : num(wait).toFixed(1)} <small>min · {missing(queue) ? '—' : num(queue)} queued</small></Flash></div>
  </section>
}

type ViewRequest = { target: THREE.Vector3; offset: THREE.Vector3; n: number }
const VIEWS: Record<string, { label: string; target: THREE.Vector3; offset: THREE.Vector3 }> = {
  overview: { label: 'Overview', target: new THREE.Vector3(0, -6, 0), offset: new THREE.Vector3(84, 84, 96) },
  // Looking steeply down into the pit so the walls do not block the view of the face.
  // Aimed between the loop and the standby bay so the excavator, the queue and parked trucks are all in view.
  face: { label: 'Loading face', target: haulRoadPoint(1).lerp(STANDBY_BAY.middle, .35), offset: new THREE.Vector3(8, 50, 26) },
  crusher: { label: 'Crusher', target: haulRoadPoint(0), offset: new THREE.Vector3(-26, 30, 24) },
}

/** Moves the camera and its orbit target smoothly to a requested view; manual orbiting is unaffected. */
function CameraRig({ view }: { view: ViewRequest | null }) {
  const camera = useThree(state => state.camera)
  const controls = useThree(state => state.controls) as unknown as { target: THREE.Vector3; update: () => void } | null
  const flight = React.useRef<{ fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; t: number } | null>(null)
  React.useEffect(() => {
    if (!view || !controls) return
    flight.current = { fromPos: camera.position.clone(), toPos: view.target.clone().add(view.offset), fromTarget: controls.target.clone(), toTarget: view.target.clone(), t: 0 }
  }, [view, camera, controls])
  useFrame((_, delta) => {
    const f = flight.current
    if (!f || !controls) return
    f.t = Math.min(1, f.t + delta / .9)
    const k = THREE.MathUtils.smoothstep(f.t, 0, 1)
    camera.position.lerpVectors(f.fromPos, f.toPos, k)
    controls.target.lerpVectors(f.fromTarget, f.toTarget, k)
    controls.update()
    if (f.t >= 1) flight.current = null
  })
  return null
}

/** The selected truck's returned twin state. */
function TruckCard({ index, frame, onFocus, onClose }: { index: number; frame: Frame; onFocus: () => void; onClose: () => void }) {
  const id = `truck-0${index + 1}`
  const read = (key: string, digits = 0) => {
    const raw = frame.at(`${id}.${key}`)
    return typeof raw === 'number' ? raw.toFixed(digits) : raw === null || raw === undefined ? '—' : String(raw).replace(/_/g, ' ')
  }
  const state = String(frame.at(`${id}.state`) ?? '')
  return <section className="ig-panel ig-truck-card" aria-label={`Truck HT-0${index + 1}`}>
    <h2><i style={{ background: TRUCK_COLOR[state] ?? '#38ef9d' }}/>HT-0{index + 1} <span>{read('state')}</span></h2>
    <p>Twin <code>org.openegiz.ademix:{id}</code></p>
    <dl>
      <dt>Speed</dt><dd>{read('speed_kmh')} km/h</dd>
      <dt>Payload</dt><dd>{read('payload_t')} t</dd>
      <dt>Route position</dt><dd>{read('route_progress_pct')} % from the face</dd>
      <dt>Trips</dt><dd>{read('trips_total')}</dd>
      <dt>Last cycle</dt><dd>{read('cycle_time_min', 1)} min</dd>
      <dt>Last queue wait</dt><dd>{read('queue_wait_min', 1)} min</dd>
      <dt>Tank (synthetic)</dt><dd>{read('fuel_pct')} %</dd>
    </dl>
    <div className="ig-truck-actions"><button onClick={onFocus}>Zoom to truck</button><button onClick={onClose}>Close</button></div>
  </section>
}

const CONDITIONS: [string, string][] = [['baseline', 'Normal'], ['truck_breakdown', 'HT-01 down'], ['road_closure', 'Road restricted'], ['crusher_slowdown', 'Crusher −45 %']]
// Rows of the comparison, in the order an operator reads them. Units come from the evidence contract.
const COMPARE_ROWS: { key: string; label: string; unit: string; digits: number; estimate?: boolean }[] = [
  { key: 'throughput_tph', label: 'Output', unit: 't/h', digits: 0 },
  { key: 'cycling_trucks_avg', label: 'Trucks cycling', unit: 'avg', digits: 1 },
  { key: 'standby_trucks_avg', label: 'Trucks parked', unit: 'avg', digits: 1 },
  { key: 'loading_wait_min', label: 'Wait at loading face', unit: 'min', digits: 1 },
  { key: 'crusher_wait_min', label: 'Wait at crusher', unit: 'min', digits: 1 },
  { key: 'cycle_time_min', label: 'Truck cycle', unit: 'min', digits: 1 },
  { key: 'truck_operating_h_per_kt', label: 'Truck-hours per 1,000 t', unit: 'h', digits: 2 },
  { key: 'estimated_fuel_l_per_kt', label: 'Fuel per 1,000 t', unit: 'L', digits: 0, estimate: true },
]

/**
 * B3: Fixed versus Smart Dispatch, from the saved A2 evidence only (DISPATCH_COMPARISON_CONTRACT.md). Both
 * policies start from the same hashed state and are measured over the same window; no live value is mixed in.
 */
function DispatchEvidencePanel({ evidence, reg, liveCondition, onClose }: {
  evidence?: DispatchEvidence; reg: Reg; liveCondition: string | null; onClose: () => void
}) {
  const [condition, setCondition] = React.useState(liveCondition ?? 'baseline')
  const [period, setPeriod] = React.useState<'steady' | 'transient'>('steady')
  // Follow the live condition (including a reset back to normal); the operator can still pick another tab.
  React.useEffect(() => { if (liveCondition) setCondition(liveCondition) }, [liveCondition])
  if (evidence?.schema_version !== 'ademix.dispatch-comparison.v1') {
    return <section className="ig-panel ig-inline ig-evidence" aria-label="Fixed versus Smart Dispatch evidence">
      <h2>Fixed vs Smart Dispatch</h2>
      <p className="ig-unavailable">Saved comparison evidence is missing or has an unknown version, so nothing is shown.</p>
      <button className="ig-wi-more" onClick={onClose}>Close</button>
    </section>
  }
  const entry = evidence.scenarios[condition] ?? evidence.scenarios.baseline
  const window = entry.periods[period]
  const fmtDelta = (key: string) => {
    const delta = window.smart_minus_fixed[key]
    if (!delta) return '—'
    if (delta.percent === null) return delta.absolute === 0 ? '—' : 'new'
    if (Math.abs(delta.percent) < .05) return 'same'
    return `${delta.percent > 0 ? '+' : ''}${fmt(delta.percent, 1)} %`
  }
  // Why fewer trucks can keep the output: the slowest single machine sets it (register values, steady model).
  const payload = reg('truck_payload_t')
  const loaderTph = payload * 60 / reg('load_time_min')
  const freeCycle = reg('load_time_min') + reg('dump_time_min') + 2 * reg('route_length_km') / reg('truck_speed_kmh') * 60
  const available = condition === 'truck_breakdown' ? 5 : 6
  const need = entry.trucks_required
  const smart = window.smart
  const why = need >= available
    ? `The model needs ${need} trucks here but only ${available} exist, so Smart Dispatch keeps every truck working and the two columns match. There is nothing to park; more trucks, not dispatching, would change this case.`
    : condition === 'crusher_slowdown'
      ? `With the crusher slowed, it sets the pace. ${need} trucks keep it supplied; extra trucks only wait at the dump. Smart Dispatch parks ${fmt(smart.standby_trucks_avg, 0)} of them, so output is unchanged while truck-hours per 1,000 t fall.`
      : `One excavator loads a ${fmt(payload, 0)} t truck every ${fmt(reg('load_time_min'), 0)} min, so it can load at most ${fmt(loaderTph, 0)} t/h. A truck needs about ${fmt(freeCycle, 1)} min for a round trip without waiting, so ${need} trucks already keep the excavator busy. ${available - need === 1 ? 'The other truck only queues at the face.' : available > need ? `The other ${available - need} only queue at the face.` : ''} Smart Dispatch parks them: the same output with fewer truck-hours.`
  const periodText = period === 'steady'
    ? `hours 2–${1 + window.window_h} after the switch (${window.window_h} h)`
    : `the first ${window.window_h} h after the switch`
  return <section className="ig-panel ig-inline ig-evidence" aria-label="Fixed versus Smart Dispatch evidence">
    <h2>Fixed vs Smart Dispatch <button className="ig-x" onClick={onClose} aria-label="Close comparison">×</button></h2>
    <p>Saved model evidence, not live: both policies start from one identical state and are measured over {periodText}.</p>
    <div className="ig-tabs" role="tablist" aria-label="Operating condition">
      {CONDITIONS.map(([id, label]) => <button key={id} role="tab" aria-selected={condition === id} className={condition === id ? 'on' : ''}
        onClick={() => setCondition(id)}>{label}{liveCondition === id ? ' •' : ''}</button>)}
    </div>
    <div className="ig-tabs ig-tabs-small" role="tablist" aria-label="Measurement window">
      <button role="tab" aria-selected={period === 'steady'} className={period === 'steady' ? 'on' : ''} onClick={() => setPeriod('steady')}>Steady {entry.periods.steady.window_h} h</button>
      <button role="tab" aria-selected={period === 'transient'} className={period === 'transient' ? 'on' : ''} onClick={() => setPeriod('transient')}>First {entry.periods.transient.window_h} h</button>
    </div>
    <table className="ig-fuel-compare ig-evidence-table">
      <thead><tr><th>{entry.label}</th><th>Fixed</th><th>Smart</th><th>Change</th></tr></thead>
      <tbody>{COMPARE_ROWS.map(row => <tr key={row.key}>
        <td>{row.label}{row.estimate && <KindTag kind="simulated"/>}</td>
        <td>{fmt(window.fixed[row.key], row.digits)} <small>{row.unit}</small></td>
        <td>{fmt(window.smart[row.key], row.digits)} <small>{row.unit}</small></td>
        <td>{fmtDelta(row.key)}</td>
      </tr>)}</tbody>
    </table>
    <p className="ig-advice">{why}</p>
    <p className="ig-foot-note">{evidence.claim} Fuel is an estimate from comparable-equipment rates. {liveCondition ? '• marks the condition running now.' : 'Replay: no live condition.'}</p>
  </section>
}

const EVENT_COLOR: Record<string, string> = {
  period_started: '#9db3aa', breakdown_started: '#ff5149', road_cleared: '#f0b85a', throughput_recovered: '#38ef9d', reset: '#7fb4ff',
}
const clockSince = (seconds: number) => `${Math.floor(seconds / 3600)}:${String(Math.round(seconds / 60) % 60).padStart(2, '0')}`

/**
 * B4: production loss and recovery after the HT-01 breakdown, plotted from the saved A3 history only
 * (HISTORY_CONTRACT.md). Simulated time on x; observed rolling throughput solid, projected steady capacity dashed,
 * the same-start baseline as a thin control line, and only the supplied event markers. Period 2 (after reset)
 * is drawn separately. The history is static, so replay speed or pausing cannot change it.
 */
function RecoveryTimelinePanel({ evidence, onClose, embedded = false }: { evidence?: RecoveryEvidence; onClose: () => void; embedded?: boolean }) {
  if (evidence?.schema_version !== 'ademix.production-recovery.v1') {
    return <section className="ig-panel ig-inline ig-evidence" aria-label="Breakdown timeline">
      <h2>Breakdown timeline <button className="ig-x" onClick={onClose} aria-label="Close timeline">×</button></h2>
      <p className="ig-unavailable">Saved history is missing or has an unknown version, so nothing is shown.</p>
    </section>
  }
  const periods = evidence.breakdown_recovery.periods
  const events = evidence.breakdown_recovery.events
  const control = evidence.baseline.samples
  const all = periods.flatMap(p => p.samples)
  const t0 = all[0].sim_time_s
  const t1 = all[all.length - 1].sim_time_s
  const values = [...all.flatMap(x => [x.observed_rolling_throughput_tph, x.projected_steady_capacity_tph]), ...control.map(x => x.observed_rolling_throughput_tph)]
  const yMin = Math.floor((Math.min(...values) - 30) / 50) * 50
  const yMax = Math.ceil((Math.max(...values) + 10) / 50) * 50
  const W = 340, H = 190, L = 34, R = 8, T = 26, B = 22
  const x = (t: number) => L + (t - t0) / (t1 - t0) * (W - L - R)
  const y = (v: number) => T + (yMax - v) / (yMax - yMin) * (H - T - B)
  const path = (samples: RecoverySample[], key: 'observed_rolling_throughput_tph' | 'projected_steady_capacity_tph') =>
    samples.map((p, i) => `${i ? 'L' : 'M'}${x(p.sim_time_s).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  const reset = events.find(e => e.kind === 'reset')
  // Events sharing an instant get stacked badges so none hides another.
  const marked = events.filter(e => e.kind !== 'period_started')
  const stacked = marked.map((e, i) => ({ ...e, n: i + 1, row: marked.slice(0, i).filter(o => o.sim_time_s === e.sim_time_s).length }))
  // Derived summary (arithmetic on the supplied samples only).
  const incident = periods[0].samples
  const lowest = incident.reduce((a, b) => b.observed_rolling_throughput_tph < a.observed_rolling_throughput_tph ? b : a)
  const made = (samples: RecoverySample[]) => samples[samples.length - 1].production_t - samples[0].production_t
  const sameSpan = control.filter(c => c.sim_time_s <= incident[incident.length - 1].sim_time_s)
  const lost = made(sameSpan) - made(incident)
  return <section className="ig-panel ig-inline ig-evidence ig-timeline" aria-label="Breakdown timeline">
    {!embedded && <h2>Breakdown timeline <button className="ig-x" onClick={onClose} aria-label="Close timeline">×</button></h2>}
    <p>Saved model history, not live: HT-01 breaks down at 0:00 and the stand runs {Math.round((reset?.sim_time_s ?? t1) - t0) / 3600} h before a reset. Samples every {evidence.methodology.sample_s / 60} simulated minutes.</p>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Observed rolling throughput, projected capacity and events over simulated time">
      {reset && <rect x={x(reset.sim_time_s)} y={T} width={x(t1) - x(reset.sim_time_s)} height={H - T - B} fill="rgba(127,180,255,.08)"/>}
      {Array.from({ length: (yMax - yMin) / 50 + 1 }, (_, k) => yMin + k * 50).map(v => <g key={v}>
        <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.08)"/>
        <text x={L - 4} y={y(v) + 3} textAnchor="end" className="ig-axis">{v}</text>
      </g>)}
      {Array.from({ length: Math.floor((t1 - t0) / 3600) + 1 }, (_, h) => <text key={h} x={x(t0 + h * 3600)} y={H - 6} textAnchor="middle" className="ig-axis">{h} h</text>)}
      <text x={L} y={T - 14} className="ig-axis">t/h</text>
      <path d={path(control, 'observed_rolling_throughput_tph')} fill="none" stroke="#9db3aa" strokeWidth={1} opacity={.7}/>
      {periods.map(p => <g key={p.period_id}>
        <path d={path(p.samples, 'projected_steady_capacity_tph')} fill="none" stroke="#f0b85a" strokeWidth={1.5} strokeDasharray="5 4"/>
        <path d={path(p.samples, 'observed_rolling_throughput_tph')} fill="none" stroke="#4fd1c5" strokeWidth={2.2}/>
      </g>)}
      {stacked.map(e => <g key={e.n}>
        <line x1={x(e.sim_time_s)} x2={x(e.sim_time_s)} y1={T} y2={H - B} stroke={EVENT_COLOR[e.kind] ?? '#fff'} strokeWidth={1} strokeDasharray="2 2"/>
        <circle cx={x(e.sim_time_s) + e.row * 13} cy={T - 4 + 0} r={6} fill={EVENT_COLOR[e.kind] ?? '#fff'}/>
        <text x={x(e.sim_time_s) + e.row * 13} y={T - 1} textAnchor="middle" className="ig-badge">{e.n}</text>
      </g>)}
      <circle cx={x(lowest.sim_time_s)} cy={y(lowest.observed_rolling_throughput_tph)} r={3} fill="#4fd1c5" stroke="#fff"/>
    </svg>
    <div className="ig-legend">
      <span><i className="ig-line-solid"/>Observed, rolling 1 h</span>
      <span><i className="ig-line-dash"/>Projected steady capacity</span>
      <span><i className="ig-line-thin"/>Same start, no breakdown</span>
    </div>
    <ol className="ig-events">
      {stacked.map(e => <li key={e.n}><b style={{ background: EVENT_COLOR[e.kind] }}>{e.n}</b>
        <span>{clockSince(e.sim_time_s - t0)}</span>{e.label}</li>)}
    </ol>
    <dl className="ig-fuel-list ig-timeline-summary">
      <dt>Lowest observed <KindTag kind="derived"/></dt>
      <dd>{fmt(lowest.observed_rolling_throughput_tph, 1)} t/h at {clockSince(lowest.sim_time_s - t0)}</dd>
      <dt>Ore processed in {clockSince(incident[incident.length - 1].sim_time_s - t0)} h, breakdown vs no breakdown <KindTag kind="derived"/></dt>
      <dd>{fmt(made(incident), 0)} vs {fmt(made(sameSpan), 0)} t ({lost >= 0 ? '−' : '+'}{fmt(Math.abs(lost), 0)} t)</dd>
    </dl>
    <p className="ig-foot-note">The observed line is a one-hour rolling average, so it lags the stoppage: the recovered marker follows the
      supplied rule ({evidence.methodology.recovery_rule}), and the average still dips while the hour that contains the stoppage
      passes. Shaded: after reset, a separate period. {evidence.claim}</p>
  </section>
}

/**
 * B6: guided three-minute demonstration. Each step sends the real request (POST /api/scenario or /api/dispatch),
 * then waits until the returned twin state confirms it before the viewer may continue. Saved-evidence steps only
 * open the existing B3/B4 panels. Nothing is animated or faked; cancel stops the guide and leaves the stand as it is.
 */
type GuideStep = {
  title: string
  run?: () => Promise<void>
  confirmed: (frame: Frame) => boolean
  waitingFor: string
  text: (frame: Frame) => string
  view?: 'overview' | 'face' | 'crusher' | 'truck'
  open?: 'timeline' | 'evidence'
}
const post = async (path: string, body: object) => {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`)
}
const anyTruck = (frame: Frame, state: string) => Array.from({ length: 6 }, (_, i) => frame.at(`truck-0${i + 1}.state`)).some(v => v === state)
const atNormal = (frame: Frame) => frame.at('scenario-controller.active') === 'baseline' && frame.at('scenario-controller.dispatch_policy') === 'fixed'
  && !anyTruck(frame, 'breakdown') && !anyTruck(frame, 'blocked') && laneBlockage(frame).lane === 'none'
const constraintName = (frame: Frame) => { const b = String(frame.at('mine-01.bottleneck_live') ?? '—'); return (CONSTRAINT_NAME[b] ?? b).toLowerCase() }

const GUIDE: GuideStep[] = [
  {
    title: 'Normal operations',
    run: async () => { await post('/api/scenario', { scenario: 'baseline' }); await post('/api/dispatch', { policy: 'fixed' }) },
    confirmed: atNormal, waitingFor: 'normal operations, fixed fleet and no breakdown in the twins', view: 'overview',
    text: f => `North Pit runs six haul trucks between one excavator at the pit floor and the crusher. Right now ${num(f.at('mine-01.throughput_tph')).toFixed(0)} t/h is processed and the ${constraintName(f)} limits output: ${num(f.at('excavator-01.queue_length'))} truck${num(f.at('excavator-01.queue_length')) === 1 ? ' is' : 's are'} queuing at the loading face.`,
  },
  {
    title: 'A truck breaks down',
    run: () => post('/api/scenario', { scenario: 'truck_breakdown' }),
    confirmed: f => f.at('truck-01.state') === 'breakdown', waitingFor: 'HT-01 to report breakdown', view: 'truck',
    text: f => {
      const block = laneBlockage(f)
      const where = String(f.at('scenario-controller.breakdown_location') ?? 'its position')
      return block.lane === 'none'
        ? `HT-01 has stopped (${where}). It is off the haul road, so no lane is blocked; the other five trucks keep working.`
        : `HT-01 has stopped on the haul road (${where}). It blocks the ${LANE_WORDS[block.lane].lane}; ${block.held} truck${block.held === 1 ? ' is' : 's are'} held behind it while opposing traffic continues.`
    },
  },
  {
    title: 'What it costs',
    confirmed: f => f.at('truck-01.state') === 'breakdown', waitingFor: 'HT-01 still reported down', open: 'timeline', view: 'overview',
    text: f => {
      const onRoad = String(f.at('scenario-controller.breakdown_location') ?? '').startsWith('haul road')
      return `With five trucks the twin still expects ${num(f.at('scenario-controller.projected_throughput_tph')).toFixed(0)} t/h, because the excavator, not the fleet, sets the pace. ${onRoad
        ? 'The saved timeline (right) shows this case in the model: output dips while HT-01 blocks its lane, then recovers after the tow.'
        : 'This failure is off the road, so little is lost. The saved timeline (right) shows the costly case, a failure on the haul road: output dips while the lane is blocked, then recovers after the tow.'}`
    },
  },
  {
    title: 'Switch on Smart Dispatch',
    run: () => post('/api/dispatch', { policy: 'smart' }),
    confirmed: f => f.at('scenario-controller.dispatch_policy') === 'smart', waitingFor: 'dispatch policy smart in the twins', view: 'face',
    text: f => {
      const available = Array.from({ length: 6 }, (_, i) => f.at(`truck-0${i + 1}.state`)).filter(v => v !== 'breakdown').length
      return `Smart Dispatch is on. The twin calculates that ${num(f.at('scenario-controller.trucks_required'))} trucks keep the excavator busy and ${available} are available; ${num(f.at('scenario-controller.trucks_in_cycle'))} are cycling and ${num(f.at('scenario-controller.trucks_standby'))} parked so far. Extra trucks park in the standby bay as they reach the face, engines off, and rejoin when needed.`
    },
  },
  {
    title: 'The evidence',
    confirmed: f => f.at('scenario-controller.dispatch_policy') === 'smart', waitingFor: 'Smart Dispatch still on', open: 'evidence', view: 'overview',
    text: () => 'The saved, matched model run (right) compares both policies from one identical start: Smart Dispatch keeps the same output with fewer truck-hours per 1,000 t, because the excavator, not the number of trucks, limits production.',
  },
  {
    title: 'Recover and reset',
    run: async () => { await post('/api/scenario', { scenario: 'baseline' }); await post('/api/dispatch', { policy: 'fixed' }) },
    confirmed: atNormal, waitingFor: 'normal operations with no breakdown and no blocked lane', view: 'overview',
    text: () => 'Back to normal operations: no breakdown, no blocked lane, fixed fleet. Recommendation for the dispatcher: while the excavator is the constraint, run Smart Dispatch — keep the needed trucks cycling and park the rest.',
  },
]

function GuidedDemo({ frame, live, onClose, onView, onOpen }: {
  frame: Frame; live: boolean; onClose: () => void
  onView: (view: 'overview' | 'face' | 'crusher' | 'truck') => void; onOpen: (panel: 'timeline' | 'evidence' | null) => void
}) {
  const [index, setIndex] = React.useState(0)
  const [attempt, setAttempt] = React.useState(0)
  const [phase, setPhase] = React.useState<'sending' | 'waiting' | 'confirmed' | 'failed'>('sending')
  const [error, setError] = React.useState('')
  const [confirmedAt, setConfirmedAt] = React.useState<number | null>(null)
  const started = React.useRef(0)
  const step = GUIDE[index]
  React.useEffect(() => {
    let cancelled = false
    setPhase('sending'); setError(''); setConfirmedAt(null)
    started.current = performance.now()
    onOpen(step.open ?? null)
    if (step.view) onView(step.view)
    ;(async () => {
      try { if (step.run) await step.run() } catch (reason) { if (!cancelled) { setPhase('failed'); setError(String(reason)) }; return }
      if (!cancelled) setPhase('waiting')
    })()
    return () => { cancelled = true }
  }, [index, attempt])
  // Confirmation comes only from returned twin state, re-checked on every poll.
  React.useEffect(() => {
    if (phase !== 'waiting') return
    if (step.confirmed(frame)) { setPhase('confirmed'); setConfirmedAt(num(frame.at('mine-01.sim_time_s'))); if (step.view === 'truck') onView('truck') }
    else if (performance.now() - started.current > 60000) { setPhase('failed'); setError(`No confirmation within 60 s (waiting for ${step.waitingFor}).`) }
  })
  if (!live) return <section className="ig-guide" role="dialog" aria-label="Guided demo">
    <p>The guided demo needs the running stand: it uses the real controls and waits for the twins. The recorded replay cannot confirm steps.</p>
    <div className="ig-guide-actions"><button onClick={onClose}>Close</button></div>
  </section>
  const last = index === GUIDE.length - 1
  return <section className="ig-guide" role="dialog" aria-label="Guided demo" aria-live="polite">
    <div className="ig-guide-head"><b>Guided demo · {index + 1}/{GUIDE.length}</b><span>{step.title}</span></div>
    <p>{phase === 'confirmed' ? step.text(frame) : phase === 'failed' ? error : `${phase === 'sending' ? 'Sending the command' : 'Waiting for the twins to confirm'}: ${step.waitingFor}…`}</p>
    <div className={`ig-guide-status ig-guide-${phase}`}>{phase === 'confirmed'
      ? `Confirmed by the returned twin state at simulated ${(num(confirmedAt) / 3600).toFixed(2)} h`
      : phase === 'failed' ? 'Not confirmed' : 'Not confirmed yet'}</div>
    <div className="ig-guide-actions">
      {index > 0 && <button onClick={() => setIndex(i => i - 1)} disabled={phase === 'sending'}>Back</button>}
      {phase === 'failed' && <button onClick={() => setAttempt(a => a + 1)}>Retry</button>}
      {last
        ? <button className="ig-guide-next" disabled={phase !== 'confirmed'} onClick={onClose}>Finish</button>
        : <button className="ig-guide-next" disabled={phase !== 'confirmed'} onClick={() => setIndex(i => i + 1)}>Next ▸</button>}
      <button onClick={onClose}>Cancel</button>
    </div>
  </section>
}

// Layout of the mine model: ore flows left to right, the mine above, the controller below.
const MODEL_W = 484, MODEL_H = 334
const modelPosition = (node: RelationshipNode): [number, number] => {
  if (node.kind === 'mine') return [MODEL_W / 2, 26]
  if (node.id === 'excavator-01') return [60, 167]
  if (node.id === 'road-main') return [304, 167]
  if (node.id === 'crusher-01') return [424, 167]
  if (node.id === 'scenario-controller') return [MODEL_W / 2, MODEL_H - 22]
  const truck = Number(node.id.slice(-2)) - 1
  return [182, 72 + truck * 38]
}
const EDGE_STYLE: Record<Relationship['category'], { color: string; dash?: string; width: number }> = {
  material: { color: '#f0b85a', width: 1.6 },
  movement: { color: '#4fd1c5', dash: '2 3', width: 1.3 },
  control: { color: '#c497f5', dash: '6 4', width: 1.1 },
  hierarchy: { color: '#9db3aa', dash: '1 4', width: .8 },
}

/**
 * C1: the connected 11-twin mine model, drawn only from twinRelationships (TWIN_RELATIONSHIP_CONTRACT.md). Each
 * node joins the live twin by thing_id and shows its state_feature value, or "State unavailable". Selecting a node
 * opens that same live twin. No twin or relationship is invented here.
 */
function MineModelPanel({ contract, frame, live, source, onSelect, onClose }: {
  contract?: RelationshipContract; frame: Frame; live: boolean; source: string; onSelect: (id: string) => void; onClose: () => void
}) {
  const [show, setShow] = React.useState<Record<Relationship['category'], boolean>>({ material: true, movement: true, control: true, hierarchy: false })
  if (contract?.schema_version !== 'ademix.twin-relationships.v1') {
    return <section className="ig-panel ig-inline ig-model" aria-label="Mine model">
      <h2>Mine model <button className="ig-x" onClick={onClose} aria-label="Close mine model">×</button></h2>
      <p className="ig-unavailable">The relationship contract is missing or has an unknown version, so nothing is shown.</p>
    </section>
  }
  const byId = Object.fromEntries(contract.nodes.map(n => [n.id, n]))
  const stateOf = (node: RelationshipNode) => {
    const value = frame.at(`${node.id}.${node.state_feature}`)
    return value === null || value === undefined || value === '' ? null : String(value).replace(/_/g, ' ')
  }
  const joined = contract.nodes.filter(n => frame.features(n.id).length > 0).length
  const counts = contract.relationships.reduce((acc, r) => ({ ...acc, [r.category]: (acc[r.category] ?? 0) + 1 }), {} as Record<string, number>)
  const edgePath = (r: Relationship) => {
    const [x1, y1] = modelPosition(byId[r.source]), [x2, y2] = modelPosition(byId[r.target])
    // Truck → crusher deliveries arc over the road node so the road (movement) stays visibly between them.
    const bend = r.type === 'delivers_to' ? -46 : r.category === 'control' ? 0 : 0
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + bend
    return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`
  }
  return <section className="ig-panel ig-inline ig-model" aria-label="Mine model">
    <h2>Mine model <button className="ig-x" onClick={onClose} aria-label="Close mine model">×</button></h2>
    <p>{contract.node_count} twins from the relationship contract, {live ? `${joined} joined to live state from ${source === 'eclipse-ditto' ? 'Eclipse Ditto' : 'the local demo simulator (not via OpenEgiz)'}` : `${joined} found in the recorded log`}. Click a twin to open it.</p>
    <svg viewBox={`0 0 ${MODEL_W} ${MODEL_H}`} role="img" aria-label="Twins and their relationships">
      <defs>{Object.entries(EDGE_STYLE).map(([k, v]) => <marker key={k} id={`ig-arrow-${k}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0,0 L8,4 L0,8 z" fill={v.color}/></marker>)}</defs>
      {contract.relationships.filter(r => show[r.category]).map(r => {
        const style = EDGE_STYLE[r.category]
        return <path key={r.id} d={edgePath(r)} fill="none" stroke={style.color} strokeWidth={style.width} strokeDasharray={style.dash}
          opacity={r.category === 'hierarchy' ? .55 : .85} markerEnd={`url(#ig-arrow-${r.category})`}><title>{`${byId[r.source].label} ${r.label} ${byId[r.target].label}`}</title></path>
      })}
      {contract.nodes.map(node => {
        const [x, y] = modelPosition(node)
        const state = stateOf(node)
        const truck = node.kind === 'haul-truck'
        const w = truck ? 100 : 112, h = truck ? 28 : 34
        return <g key={node.id} className="ig-model-node" transform={`translate(${x - w / 2},${y - h / 2})`} role="button" tabIndex={0}
          aria-label={`${node.label}: ${state ?? 'State unavailable'}`} onClick={() => onSelect(node.id)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(node.id) }}>
          <rect width={w} height={h} rx={6} className={`ig-model-rect ig-kind-${node.kind}`}/>
          <text x={w / 2} y={truck ? 11 : 13} textAnchor="middle" className="ig-model-label">{truck ? node.label.replace('Haul Truck ', '') : node.label}</text>
          <text x={w / 2} y={truck ? 22 : 26} textAnchor="middle" className={state ? 'ig-model-state' : 'ig-model-state ig-model-missing'}>{state ?? 'State unavailable'}</text>
        </g>
      })}
    </svg>
    <div className="ig-model-legend">
      {(Object.keys(EDGE_STYLE) as Relationship['category'][]).map(k => <label key={k}>
        <input type="checkbox" checked={show[k]} onChange={() => setShow(v => ({ ...v, [k]: !v[k] }))}/>
        <i style={{ borderTop: `2px ${EDGE_STYLE[k].dash ? 'dashed' : 'solid'} ${EDGE_STYLE[k].color}` }}/>{k} · {counts[k] ?? 0}</label>)}
    </div>
    <p className="ig-foot-note">Ore path: loading face (excavator) → haul truck → haul road → crusher. Control links (scenario controller) change
      conditions and dispatch policy; they are not ore flow. Relationships are the team's conceptual topology; current state comes only from the twins.</p>
  </section>
}

/** Card for a selected non-truck twin: its returned features, read live by id. */
function TwinCard({ twin, label, frame, onClose }: { twin: string; label: string; frame: Frame; onClose: () => void }) {
  const keys = frame.features(twin)
  const show = (v: string | number | null) => typeof v === 'number' ? fmt(v, Number.isInteger(v) ? 0 : 2) : v === null ? '—' : String(v).replace(/_/g, ' ')
  return <section className="ig-panel ig-inline ig-truck-card" aria-label={label}>
    <h2>{label} <button className="ig-x" onClick={onClose} aria-label="Close">×</button></h2>
    <p>Twin <code>org.openegiz.ademix:{twin}</code> · {keys.length} returned features</p>
    {keys.length === 0 ? <p className="ig-unavailable">State unavailable: this twin is not in the current data.</p>
      : <dl>{keys.slice(0, 14).map(k => <React.Fragment key={k}><dt>{k.replace(/_/g, ' ')}</dt><dd>{show(frame.at(`${twin}.${k}`))}</dd></React.Fragment>)}</dl>}
  </section>
}

const CONDITION_LABEL: Record<string, string> = { baseline: 'Normal operations', truck_breakdown: 'Truck HT-01 breakdown', road_closure: 'Main road restriction', crusher_slowdown: 'Crusher capacity −45 %' }
const SavedTag = () => <em className="ig-src ig-src-saved">saved model evidence · synthetic · not measured</em>
const LiveTag = ({ source }: { source: string }) => <em className="ig-src ig-src-live">live · {source === 'eclipse-ditto' ? 'Eclipse Ditto' : 'local demo simulator'}</em>

/**
 * C2: one Decision workspace. Live twin values (now) are kept apart from saved model evidence (A2 matched comparison,
 * A3 recovery history, A8/A9 fleet-size explanation when bundled). The recommendation is read from the evidence for the
 * active condition, never computed here; "Apply" uses the real dispatch control.
 */
function DecisionWorkspace({ frame, live, source, bundle, onClose }: {
  frame: Frame; live: boolean; source: string; bundle: Bundle; onClose: () => void
}) {
  const [applying, setApplying] = React.useState(false)
  const [failure, setFailure] = React.useState('')
  const condition = live ? String(frame.at('scenario-controller.active') ?? 'baseline') : 'baseline'
  const policy = live ? String(frame.at('scenario-controller.dispatch_policy') ?? 'fixed') : 'fixed'
  const { cycling, parked, down } = fleetSplit(frame)
  const bottleneckNow = String(frame.at('mine-01.bottleneck_live') ?? '—')
  const planned = String(frame.at('scenario-controller.bottleneck') ?? '—')
  const v = (key: string, digits = 0) => { const x = frame.at(key); return x === null || x === undefined || x === '' ? '—' : fmt(num(x), digits) }

  const a2 = bundle.dispatchComparison?.schema_version === 'ademix.dispatch-comparison.v1' ? bundle.dispatchComparison : undefined
  const steady = a2?.scenarios[condition]?.periods.steady
  const decision = bundle.decisionExplanation?.schema_version === 'ademix.decision-explanation.v1' ? bundle.decisionExplanation : undefined
  const question = decision?.questions[condition === 'truck_breakdown' ? 'baseline' : condition]
  // Recommendation: the A8/A9 contract's text when bundled; otherwise the A2 smart outcome for this condition.
  let action: string | null = null
  let basis = ''
  if (question && condition !== 'truck_breakdown') { action = question.recommended_action; basis = `Fleet-size evidence: ${question.answer}` }
  else if (steady) {
    const smart = steady.smart, fixed = steady.fixed
    const keep = Math.round(smart.cycling_trucks_avg), park = Math.round(smart.standby_trucks_avg)
    action = park > 0
      ? `Use Smart Dispatch: cycle ${keep} trucks and park ${park} as ready reserves.`
      : `Keep all ${keep} available trucks cycling; parking any would cost output.`
    basis = park > 0
      ? `Saved matched run (${steady.window_h} h): output ${fmt(fixed.throughput_tph, 0)} → ${fmt(smart.throughput_tph, 0)} t/h, truck-hours per 1,000 t ${fmt(fixed.truck_operating_h_per_kt, 2)} → ${fmt(smart.truck_operating_h_per_kt, 2)}.`
      : `Saved matched run (${steady.window_h} h): Smart Dispatch finds no surplus truck here; both policies give ${fmt(smart.throughput_tph, 0)} t/h.`
  }
  // The policy to apply comes from the evidence (does Smart Dispatch park any truck here?), not from the wording.
  const wantSmart = steady ? Math.round(steady.smart.standby_trucks_avg) > 0 : false
  const alreadyApplied = wantSmart ? policy === 'smart' : policy !== 'smart'
  const apply = async () => {
    setApplying(true); setFailure('')
    try {
      const response = await fetch('/api/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy: wantSmart ? 'smart' : 'fixed' }) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch (reason) { setFailure(`Request failed (${String(reason)}).`) } finally { setApplying(false) }
  }
  const rows: [string, string, number][] = [['Output', 'throughput_tph', 0], ['Trucks cycling', 'cycling_trucks_avg', 1], ['Trucks parked', 'standby_trucks_avg', 1],
    ['Wait at loading face, min', 'loading_wait_min', 1], ['Wait at crusher, min', 'crusher_wait_min', 1], ['Truck-hours per 1,000 t', 'truck_operating_h_per_kt', 2]]
  const r = decision?.presentation_contract.rounding

  return <section className="ig-panel ig-inline ig-decision" aria-label="Decision workspace">
    <h2>Decision <button className="ig-x" onClick={onClose} aria-label="Close and return to the mine">×</button></h2>
    <p>What limits production, what to do, and the evidence behind it. <button className="ig-linkish" onClick={onClose}>Back to the 3D mine</button></p>

    <h3>Now <LiveTag source={source}/></h3>
    {!live ? <p className="ig-unavailable">Live values need the running stand; the replay shows saved evidence only.</p> : <>
      <p className="ig-now">{CONDITION_LABEL[condition] ?? condition} · {policy === 'smart' ? 'Smart Dispatch' : 'fixed fleet'}</p>
      <div className="ig-gauges">
        <div><span>Output now</span><b>{v('mine-01.throughput_tph')} <small>t/h</small></b></div>
        <div><span>Limits output now (measured)</span><b>{CONSTRAINT_NAME[bottleneckNow] ?? bottleneckNow}</b></div>
        <div><span>Trucks cycling · parked · down</span><b>{cycling} <small>· {parked} · {down}</small></b></div>
        <div><span>Truck-hours per 1,000 t (live)</span><b>{v('mine-01.truck_operating_h_per_kt', 2)} <small>h</small></b></div>
        <div><span>Wait at face · crusher</span><b>{v('excavator-01.average_wait_min', 1)} <small>· {v('crusher-01.average_wait_min', 1)} min</small></b></div>
        <div><span>Planned constraint (model)</span><b>{CONSTRAINT_NAME[planned] ?? planned}</b></div>
      </div></>}

    <h3>Recommended action <SavedTag/></h3>
    {action ? <div className="ig-reco">
      <p><b>{action}</b></p>
      <p>{basis}</p>
      {live && <div className="ig-reco-actions">
        {alreadyApplied ? <span className="ig-ok">In force now (confirmed by the twins).</span>
          : <button onClick={apply} disabled={applying}>{applying ? 'Applying…' : wantSmart ? 'Apply: Smart Dispatch on' : 'Apply: fixed fleet'}</button>}
        {failure && <span className="ig-unavailable">{failure}</span>}
      </div>}
    </div> : <p className="ig-unavailable">Unavailable: no saved evidence for this condition, so no recommendation is shown.</p>}

    <h3>Fixed vs Smart, {CONDITION_LABEL[condition] ?? condition} <SavedTag/></h3>
    {steady ? <table className="ig-fuel-compare">
      <thead><tr><th>{steady.window_h} h matched window</th><th>Fixed</th><th>Smart</th></tr></thead>
      <tbody>{rows.map(([label, key, d]) => <tr key={key}><td>{label}</td><td>{fmt(steady.fixed[key], d)}</td><td>{fmt(steady.smart[key], d)}</td></tr>)}</tbody>
    </table> : <p className="ig-unavailable">Unavailable.</p>}

    <h3>Fleet size and assumptions (A8/A9) <SavedTag/></h3>
    {!decision ? <p className="ig-unavailable">Unavailable in this build: the fleet-size explanation is not yet in the frontend data bundle (requested from Ahmad + Codex).</p> : <>
      {(['baseline', 'road_closure', 'crusher_slowdown'] as const).map(k => {
        const q = decision.questions[k]
        if (!q) return null
        return <details key={k} open={k === (condition === 'truck_breakdown' ? 'baseline' : condition)} className="ig-q">
          <summary>{q.question}</summary>
          <p>{q.answer} <b>{q.recommended_action}</b></p>
          {q.comparison && <table className="ig-fuel-compare"><thead><tr><th>Trucks</th><th>Output t/h</th><th>Face queue</th><th>Crusher queue</th><th>Truck-h / kt</th></tr></thead>
            <tbody>{q.comparison.map(c => <tr key={c.trucks}><td>{c.trucks}</td><td>{fmt(c.throughput_tph, r?.throughput_tph ?? 1)}</td>
              <td>{fmt(c.loading_queue_trucks_avg, r?.queues_trucks ?? 2)}</td><td>{fmt(c.crusher_queue_trucks_avg, r?.queues_trucks ?? 2)}</td>
              <td>{fmt(c.truck_operating_h_per_1000_t, r?.truck_h_per_1000_t ?? 2)}</td></tr>)}</tbody></table>}
        </details>
      })}
      {decision.questions.sensitivity && <details className="ig-q"><summary>{decision.questions.sensitivity.question}</summary>
        <p>{decision.questions.sensitivity.answer} <b>{decision.questions.sensitivity.recommended_action}</b></p>
        {Object.entries(decision.questions.sensitivity.studies ?? {}).map(([name, st]) => <p key={name} className="ig-foot-note">
          {name.replace(/_/g, ' ')} ({st.category}, baseline {st.baseline_value} {st.unit}): {st.cases.map(c => `${c.value} → ${c.recommended_active_trucks} trucks${c.plateau_observed ? '' : ' (no plateau)'}`).join(' · ')}</p>)}
      </details>}
      <p className="ig-foot-note">{decision.claim}</p></>}

    <h3>Breakdown and recovery <SavedTag/></h3>
    <RecoveryTimelinePanel evidence={bundle.productionRecovery} onClose={onClose} embedded/>
    <p className="ig-foot-note">Live values change every 2 s; saved evidence never changes and is not rewritten by a reset.</p>
  </section>
}

const FAULTS: [string, string][] = [['truck_breakdown', 'Truck HT-01 breakdown'], ['road_closure', 'Main road restriction'], ['crusher_slowdown', 'Crusher −45 %']]

/**
 * What-If Scenario Engine: A normal operations, B fault injection, C smart dispatch, and the dynamic
 * bottleneck. Every figure is read from the simulator's twins; the buttons only send the request.
 */
function WhatIfPanel({ frame, live, onEvidence, onTimeline }: { frame: Frame; live: boolean; onEvidence: () => void; onTimeline: () => void }) {
  const [details, setDetails] = React.useState(false)
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
  return <section className="ig-panel ig-inline ig-whatif" aria-label="Scenario controls">
    <h2>Scenarios</h2>
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
    <p className="ig-wi-line">Expected output <b>{live ? `${projected.toFixed(0)} t/h` : '—'}</b>
      {live && <span className={impact < 0 ? 'ig-neg' : ''}>{impact > 0 ? '+' : ''}{impact.toFixed(0)} % vs normal {baseline.toFixed(0)} t/h</span>}</p>
    <div className="ig-wi-row">
      <button className="ig-wi-more" aria-expanded={details} onClick={() => setDetails(d => !d)}>{details ? 'Hide details' : 'Details'} {details ? '▴' : '▾'}</button>
      <button id="ig-open-evidence" className="ig-wi-more ig-wi-evidence" onClick={onEvidence}>Fixed vs Smart evidence ▸</button>
      <button id="ig-open-timeline" className="ig-wi-more ig-wi-evidence" onClick={onTimeline}>Breakdown timeline ▸</button>
    </div>
    {details && <>
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
    </>}
    <p className="ig-foot-note">{live
      ? failure || 'B and C combine: try a breakdown with smart dispatch on. Figures are simulator output, not site measurements.'
      : 'Controls need the running stand; the recorded replay has no dispatch data.'}</p>
  </section>
}

const KIND_LABEL = { simulated: 'simulated', derived: 'derived here', assumed: 'assumed' } as const
type Kind = keyof typeof KIND_LABEL
const KindTag = ({ kind }: { kind: Kind }) => <em className={`ig-kind ig-kind-${kind}`}>{KIND_LABEL[kind]}</em>

const fmt = (value: number, digits = 0) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const simTime = (seconds: number) => `${Math.floor(seconds / 3600)} h ${String(Math.floor(seconds / 60) % 60).padStart(2, '0')} min`

/**
 * Fuel and CO2 (B2). Shift totals and the current rate are the A1 twin fields on mine-01, shown as published
 * (FUEL_CO2_CONTRACT.md); nothing here re-integrates history from the current fleet. The baseline comparison
 * is the A2 matched 8 h model evidence. Values are labelled simulated (model output), derived here (simple
 * arithmetic on listed fields) or assumed (published comparable-equipment rates and factors). None is measured.
 */
function FuelPanel({ frame, reg, evidence, live, condition, policy }: {
  frame: Frame; reg: Reg; evidence?: DispatchEvidence; live: boolean; condition: string; policy: string
}) {
  const [pending, setPending] = React.useState(false)
  const [failure, setFailure] = React.useState('')
  const field = (key: string) => {
    const raw = frame.at(`mine-01.${key}`)
    return raw === null || raw === undefined || raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw)
  }
  const fuel = field('shift_fuel_l')
  const co2 = field('shift_co2_kg')
  const rate = field('current_fuel_rate_lph')
  const trucks = field('operating_trucks_fuel_count')
  const elapsed = field('shift_elapsed_s')
  const shiftId = field('shift_id')
  const basis = frame.at('mine-01.fuel_estimate_basis')
  const tph = field('throughput_tph')
  const perTonne = rate !== null && tph !== null && tph > 0 ? rate / tph : null
  const available = fuel !== null && co2 !== null

  // Baseline (normal operations, fixed fleet) versus the active condition and policy, same matched 8 h window.
  const knownEvidence = evidence?.schema_version === 'ademix.dispatch-comparison.v1' ? evidence : undefined
  const steady = (name: string) => knownEvidence?.scenarios[name]?.periods.steady
  const base = steady('baseline')?.fixed
  const activeWindow = steady(condition)
  const active = activeWindow?.[policy === 'smart' ? 'smart' : 'fixed']
  const isBaseline = condition === 'baseline' && policy !== 'smart'
  const co2Factor = reg('diesel_co2_kg_per_l')
  const change = (a: number, b: number) => b === 0 ? '—' : `${a >= b ? '+' : ''}${fmt(100 * (a - b) / b, 1)} %`
  const label = knownEvidence?.scenarios[condition]?.label ?? condition.replace(/_/g, ' ')

  const newShift = async () => {
    setPending(true)
    setFailure('')
    try {
      const response = await fetch('/api/shift/reset', { method: 'POST' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch (reason) {
      setFailure(`Shift reset failed (${String(reason)}).`)
    } finally {
      setPending(false)
    }
  }

  return <section className="ig-panel ig-inline ig-fuel" aria-label="Fuel and CO2">
    <h2>Fuel &amp; CO₂ · estimated</h2>
    <p>{live ? 'From the mine-01 twin, refreshed every 2 s.' : 'From the recorded synthetic log.'} Model estimates, not meter readings.</p>
    {!available && <p className="ig-unavailable">{live
      ? 'Shift fuel and CO₂ are not in the latest twin state yet; they appear as soon as the simulator publishes them.'
      : 'This recorded log does not contain shift fuel totals.'}</p>}
    <dl className="ig-fuel-list">
      <dt>Estimated shift fuel <KindTag kind="simulated"/></dt>
      <dd className="ig-total">{fuel === null ? '—' : fmt(fuel, 1)} <small>L</small></dd>
      <dt>Estimated tank-to-wheel CO₂ <KindTag kind="simulated"/></dt>
      <dd className="ig-total">{co2 === null ? '—' : fmt(co2, 1)} <small>kg</small></dd>
      <dt>Fuel rate now <KindTag kind="simulated"/></dt>
      <dd><Flash value={rate}>{rate === null ? '—' : fmt(rate, 1)} <small>L/h{trucks !== null ? ` · ${trucks} trucks + excavator` : ''}</small></Flash></dd>
      <dt>Fuel per tonne now <KindTag kind="derived"/></dt>
      <dd>{perTonne === null ? <span className="ig-dim">— no ore processed</span> : <>{fmt(perTonne, 3)} <small>L/t</small></>}</dd>
      <dt>Diesel energy per tonne now <KindTag kind="derived"/></dt>
      <dd>{perTonne === null ? <span className="ig-dim">—</span> : <>{fmt(perTonne * reg('diesel_energy_kwh_per_l'), 2)} <small>kWh/t</small></>}</dd>
    </dl>
    <p className="ig-shift">Shift {shiftId === null ? '—' : shiftId} · {elapsed === null ? '—' : simTime(elapsed)} simulated
      {live && <button onClick={newShift} disabled={pending}>{pending ? 'Starting…' : 'Start new shift'}</button>}</p>
    {failure && <p className="ig-unavailable">{failure}</p>}

    <h3>Against normal operations · {isBaseline ? 'what Smart Dispatch would change' : `now: ${label}${policy === 'smart' ? ' with Smart Dispatch' : ''}`}</h3>
    {!knownEvidence || !base
      ? <p className="ig-unavailable">Saved comparison evidence is unavailable or has an unknown version.</p>
      : (() => {
        // At baseline with the fixed fleet, show the Smart Dispatch alternative from the same evidence.
        const other = isBaseline ? steady('baseline')?.smart : active
        if (!other) return <p className="ig-unavailable">No saved evidence for this condition.</p>
        return <table className="ig-fuel-compare">
          <thead><tr><th/><th>Normal · fixed</th><th>{isBaseline ? 'Normal · smart' : policy === 'smart' ? 'Active · smart' : 'Active · fixed'}</th><th>Change</th></tr></thead>
          <tbody>
            <tr><td>Fuel per 1,000 t <KindTag kind="simulated"/></td><td>{fmt(base.estimated_fuel_l_per_kt, 0)} L</td><td>{fmt(other.estimated_fuel_l_per_kt, 0)} L</td><td>{change(other.estimated_fuel_l_per_kt, base.estimated_fuel_l_per_kt)}</td></tr>
            <tr><td>CO₂ per 1,000 t <KindTag kind="derived"/></td><td>{fmt(base.estimated_fuel_l_per_kt * co2Factor, 0)} kg</td><td>{fmt(other.estimated_fuel_l_per_kt * co2Factor, 0)} kg</td><td>{change(other.estimated_fuel_l_per_kt, base.estimated_fuel_l_per_kt)}</td></tr>
            <tr><td>Fuel in {knownEvidence.methodology.steady_window_h} h <KindTag kind="simulated"/></td><td>{fmt(base.estimated_fuel_l, 0)} L</td><td>{fmt(other.estimated_fuel_l, 0)} L</td><td>{change(other.estimated_fuel_l, base.estimated_fuel_l)}</td></tr>
            <tr><td>Output <KindTag kind="simulated"/></td><td>{fmt(base.throughput_tph, 0)} t/h</td><td>{fmt(other.throughput_tph, 0)} t/h</td><td>{change(other.throughput_tph, base.throughput_tph)}</td></tr>
          </tbody>
        </table>
      })()}
    <p className="ig-foot-note">Saved model evidence: matched {knownEvidence?.methodology.steady_window_h ?? 8} h steady window from one common start state (A2). Not live, not measured.</p>

    <h3>Why the numbers change</h3>
    <ul className="ig-why">
      <li>Fuel accrues for every truck with its engine running, including trucks queuing or held behind a blockage, plus the excavator. Parked (Smart Dispatch) and broken-down trucks add none{trucks !== null ? ` — ${trucks} trucks are counted now` : ''}.</li>
      <li>A scenario or dispatch change alters the rate from that moment only; totals so far are kept. Only Start new shift sets them to zero.</li>
      <li>Fewer engines running for the same tonnes lowers fuel per tonne; a slower road or crusher spreads the same engine hours over fewer tonnes.</li>
    </ul>

    <h3>Where the numbers come from</h3>
    <ul className="ig-why ig-sources">
      <li><KindTag kind="assumed"/> {reg('truck_fuel_consumption_lph')} L/h per truck and {reg('excavator_fuel_consumption_lph')} L/h excavator. Basis reported by the twin: {typeof basis === 'string' ? basis : 'not reported'}.</li>
      <li><KindTag kind="assumed"/> {co2Factor} kg CO₂ per litre and {reg('diesel_energy_kwh_per_l')} kWh per litre: IPCC 2006 diesel defaults (tank-to-wheel CO₂ only).</li>
      <li><KindTag kind="simulated"/> shift totals and rate: the simulator integrates the rate over each event interval.</li>
      <li><KindTag kind="derived"/> per-tonne and per-1,000 t CO₂ values: the fields above divided or multiplied here.</li>
      <li>Measured: none. Excluded: crusher electricity, upstream fuel supply, CH₄ and N₂O. The trucks' tank % is a separate synthetic display signal and is not used.</li>
    </ul>
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
 * A4 two-way road contract (ROAD_BREAKDOWN_CONTRACT.md): which lane a failed truck blocks and how many followers
 * it holds, read from road-main. The lane is never inferred from screen position; the opposing lane stays open.
 */
type LaneBlockage = { lane: 'none' | 'crusher_bound' | 'face_bound'; heading: number; held: number; heldCrusherBound: number; heldFaceBound: number }
function laneBlockage(frame: Frame): LaneBlockage {
  const lane = String(frame.at('road-main.blockage_lane') ?? 'none')
  return {
    lane: lane === 'crusher_bound' || lane === 'face_bound' ? lane : 'none',
    heading: num(frame.at('road-main.blockage_heading')),
    held: num(frame.at('road-main.blocked_trucks')),
    heldCrusherBound: num(frame.at('road-main.blocked_crusher_bound_trucks')),
    heldFaceBound: num(frame.at('road-main.blocked_face_bound_trucks')),
  }
}
const LANE_WORDS = {
  crusher_bound: { lane: 'crusher-bound lane', traffic: 'loaded trucks to the crusher', opposing: 'empty traffic to the face' },
  face_bound: { lane: 'face-bound lane', traffic: 'empty trucks to the face', opposing: 'loaded traffic to the crusher' },
} as const

/** In the scene: only the blocked lane is marked, from the failed truck back towards the trucks it holds. */
function BlockedLane({ frame }: { frame: Frame }) {
  const block = laneBlockage(frame)
  const failed = Array.from({ length: 6 }, (_, i) => i).find(i => frame.at(`truck-0${i + 1}.state`) === 'breakdown')
  const pct = failed === undefined ? 0 : num(frame.at(`truck-0${failed + 1}.route_progress_pct`))
  const heading: 1 | -1 = block.heading < 0 ? -1 : 1
  const geometry = React.useMemo(() => {
    if (block.lane === 'none') return null
    // Followers approach from behind the failed truck: lower route % in the crusher-bound lane, higher in the face-bound.
    const from = heading > 0 ? Math.max(LOOP_PCT, pct - 14) : pct
    const to = heading > 0 ? pct : Math.min(100 - LOOP_PCT, pct + 14)
    const positions: number[] = []
    const indices: number[] = []
    const steps = 28
    for (let k = 0; k <= steps; k++) {
      const p = from + (to - from) * k / steps
      for (const side of [-1, 1]) {
        const v = lanePose(p, heading, LANE_OFFSET + side * 1.9).position
        positions.push(v.x, v.y + .3, v.z)
      }
      if (k < steps) indices.push(2 * k, 2 * k + 2, 2 * k + 1, 2 * k + 1, 2 * k + 2, 2 * k + 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setIndex(indices)
    return g
  }, [block.lane, heading, Math.round(pct)])
  if (!geometry || failed === undefined) return null
  const words = LANE_WORDS[block.lane as 'crusher_bound' | 'face_bound']
  const labelAt = lanePose(pct + (heading > 0 ? -6 : 6), heading, LANE_OFFSET).position.add(new THREE.Vector3(0, 4, 0))
  const openAt = lanePose(pct, -heading as 1 | -1, LANE_OFFSET).position.add(new THREE.Vector3(0, 3, 0))
  return <group>
    <mesh geometry={geometry}><meshBasicMaterial color="#ff3b30" transparent opacity={.38} side={THREE.DoubleSide} depthWrite={false}/></mesh>
    <Html center distanceFactor={70} position={labelAt} zIndexRange={[24, 0]}>
      <div className="ig-lane-tag ig-lane-blocked">{words.lane} blocked · {block.held} held</div></Html>
    <Html center distanceFactor={70} position={openAt} zIndexRange={[24, 0]}>
      <div className="ig-lane-tag ig-lane-open">opposite lane open</div></Html>
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
  const block = laneBlockage(frame)
  const blockage = frame.at('road-main.blockage')
  // A4: a failure on the haul road blocks only its own lane until it is towed clear after 1,200 simulated s;
  // a failure in a queue, bay or the standby line blocks nothing. HT-01 stays out of service until reset.
  const onRoad = typeof reported === 'string' && reported !== 'none' ? reported.startsWith('haul road') : pct > LOOP_PCT && pct < 100 - LOOP_PCT
  const words = block.lane === 'none' ? null : LANE_WORDS[block.lane]
  const roadText = words
    ? `${name} blocks the ${words.lane} (${words.traffic}): ${block.held} truck${block.held === 1 ? '' : 's'} held behind it. Opposing ${words.opposing} continues.`
    : onRoad ? `${name} has been towed clear; both lanes are open. It stays out of service until Normal operations.`
      : `${name} stopped off the haul road; no lane is blocked.`
  const throughput = num(frame.at('mine-01.throughput_tph'))
  const projected = num(frame.at('scenario-controller.projected_throughput_tph'))
  const bottleneck = String(frame.at('mine-01.bottleneck_live') ?? frame.at('scenario-controller.bottleneck') ?? '—')
  return <section id="ig-breakdown-alert" className="ig-breakdown-alert" role="alert" aria-live="polite">
    <b>Breakdown · {broken.map(i => `HT-0${i + 1}`).join(', ')}</b>
    <span>Stopped at {where} · {num(frame.at(`truck-0${first + 1}.speed_kmh`)).toFixed(0)} km/h</span>
    <span>{roadText}</span>
    {typeof blockage === 'string' && blockage !== 'none' && <span className="ig-alert-detail">{blockage}</span>}
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
  return <section className="ig-panel ig-inline ig-sensors" aria-label="Sensor readings">
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
  // Opening view: the mine, four key figures and the scenario controls. Technical layers start closed.
  const [layers, setLayers] = React.useState<Set<Layer>>(new Set())
  const [layersOpen, setLayersOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<number | null>(null)
  const [evidenceOpen, setEvidenceOpen] = React.useState(false)
  const [timelineOpen, setTimelineOpen] = React.useState(false)
  const [guideOpen, setGuideOpen] = React.useState(false)
  const [modelOpen, setModelOpen] = React.useState(false)
  const [decisionOpen, setDecisionOpen] = React.useState(false)
  const [twinCard, setTwinCard] = React.useState<string | null>(null)
  const [view, setView] = React.useState<ViewRequest | null>(null)
  const goTo = (target: THREE.Vector3, offset: THREE.Vector3) => setView(v => ({ target, offset, n: (v?.n ?? 0) + 1 }))
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
      features: twin => Object.keys(liveState.current.curr).filter(k => k.startsWith(`${twin}.`)).map(k => k.slice(twin.length + 1)),
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
      features: twin => log.columns.filter(k => k.startsWith(`${twin}.`)).map(k => k.slice(twin.length + 1)),
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

  const rightOpen = selected !== null || twinCard !== null || modelOpen || decisionOpen || evidenceOpen || timelineOpen || layers.has('esg') || layers.has('sensors')
  // Selecting a model node opens the same live twin: trucks are selected in 3D, other equipment gets a card and focus.
  const selectTwin = (id: string) => {
    if (id.startsWith('truck-')) {
      const i = Number(id.slice(-2)) - 1
      setTwinCard(null); setSelected(i)
      goTo(trucks.current[i]?.clone() ?? VIEWS.overview.target, new THREE.Vector3(14, 18, 16))
      return
    }
    setSelected(null); setTwinCard(id)
    if (id === 'excavator-01') goTo(VIEWS.face.target, VIEWS.face.offset)
    else if (id === 'crusher-01') goTo(VIEWS.crusher.target, VIEWS.crusher.offset)
    else goTo(VIEWS.overview.target, VIEWS.overview.offset)
  }
  return <main className={`ig-shell${rightOpen ? ' ig-has-right' : ''}${guideOpen ? ' ig-has-guide' : ''}`}>
    <div className="ig-stage">
      <Canvas camera={{ position: [84, 78, 96], fov: 42 }} dpr={[.75, 1.25]} gl={{ antialias: true, powerPreference: 'low-power', toneMapping: THREE.ACESFilmicToneMapping }}
        onPointerMissed={() => { setSelected(null); setTwinCard(null) }}>
        <CameraRig view={view}/>
        <TerrainStage showRoads showPlant moving hideStorage twins={[{ thingId: 'c', attributes: { kind: 'crusher' }, features: { state: { properties: { value: String(frame.at('crusher-01.state')) } } } }]}/>
        <Playhead playing={playing && !live} rows={log.rows.length} head={head} speed={speed} onRow={r => r !== row && setRow(r)}/>
        <LoopRoads/>
        <SafetyBerms/>
        <LaneArrows/>
        {Array.from({ length: 6 }, (_, i) => <LoggedTruck key={i} index={i} frame={frame} layers={layers} positions={trucks} activity={activity}
          blockageActive={laneBlockage(frame).lane !== 'none'}
          timeScale={live ? STAND_SPEEDUP : playing ? speed : 0} roadKmh={num(frame.at('road-main.speed_limit_kmh')) || reg('truck_speed_kmh')} loopKmh={reg('loop_speed_kmh')}
          selected={selected === i} onSelect={() => setSelected(i)}/>)}
        <Excavator activity={activity} trucks={trucks}/>
        <OreHandling frame={frame} activity={activity}/>
        <BlockedLane frame={frame}/>
        <StandbyBay labels={layers.has('topology')} parked={Array.from({ length: 6 }, (_, i) => frame.at(`truck-0${i + 1}.state`)).filter(v => v === 'standby').length}/>
        <RoadLighting/>
        {layers.has('weather') && <WeatherScene weather={weather}/>}
        {layers.has('safety') && <SafetyScene loopSpeed={reg('loop_speed_kmh')}/>}
        {layers.has('topology') && <Topology specs={specsOf('Main haul road')}/>}
        {layers.has('topology') && <PitWallLabel/>}
        {layers.has('flow') && <DataFlow trucks={trucks}/>}
      </Canvas>
    </div>
    <div className="ig-stack">
      <WhatIfPanel frame={frame} live={live} onEvidence={() => setEvidenceOpen(o => !o)} onTimeline={() => setTimelineOpen(o => !o)}/>
      {layers.has('fleet') && <FleetPanel frame={frame} reg={reg}/>}
      {layers.has('safety') && <SafetyPanel frame={frame} reg={reg}/>}
      {layers.has('weather') && <WeatherPanel weather={weather} reg={reg}/>}
      {layers.has('specs') && <SpecsPanel specsOf={specsOf}/>}
    </div>


    <BreakdownAlert frame={frame} reg={reg}/>
    <KpiStrip frame={frame}/>
    {guideOpen && <GuidedDemo frame={frame} live={live} onClose={() => { setGuideOpen(false) }}
      onOpen={panel => { setTimelineOpen(panel === 'timeline'); setEvidenceOpen(panel === 'evidence') }}
      onView={v => v === 'truck'
        ? goTo(trucks.current[0]?.clone() ?? VIEWS.overview.target, new THREE.Vector3(18, 26, 22))
        : goTo(VIEWS[v].target, VIEWS[v].offset)}/>}
    {rightOpen && <div className={`ig-rstack${modelOpen || decisionOpen ? ' ig-rstack-wide' : ''}`}>
      {decisionOpen && <DecisionWorkspace frame={frame} live={live} source={liveSource} bundle={bundle} onClose={() => setDecisionOpen(false)}/>}
      {twinCard && <TwinCard twin={twinCard} frame={frame} onClose={() => setTwinCard(null)}
        label={bundle.twinRelationships?.nodes.find(n => n.id === twinCard)?.label ?? twinCard}/>}
      {selected !== null && <TruckCard index={selected} frame={frame} onClose={() => setSelected(null)}
      onFocus={() => goTo(trucks.current[selected]?.clone() ?? VIEWS.face.target, new THREE.Vector3(14, 18, 16))}/>}
      {modelOpen && <MineModelPanel contract={bundle.twinRelationships} frame={frame} live={live} source={liveSource} onSelect={selectTwin} onClose={() => setModelOpen(false)}/>}
      {timelineOpen && <RecoveryTimelinePanel evidence={bundle.productionRecovery} onClose={() => setTimelineOpen(false)}/>}
      {evidenceOpen && <DispatchEvidencePanel evidence={bundle.dispatchComparison} reg={reg} onClose={() => setEvidenceOpen(false)}
        liveCondition={live ? String(frame.at('scenario-controller.active') ?? liveScenario) : null}/>}
      {layers.has('esg') && <FuelPanel frame={frame} reg={reg} evidence={bundle.dispatchComparison} live={live}
        condition={live ? liveScenario : scenario} policy={live ? String(frame.at('scenario-controller.dispatch_policy') ?? 'fixed') : 'fixed'}/>}
      {layers.has('sensors') && <SensorPanel frame={frame} live={live} source={liveSource}/>}
    </div>}


    <header className="ig-title">
      <span>ADEMIX · DISPATCHER VIEW</span>
      <h1>North Pit</h1>
      <div id="ig-mode" className={`ig-mode ${live ? 'live' : 'replay'}`} role="status">
        <i/>{!live ? 'REPLAY · recorded synthetic log (stand offline)'
          : liveSource === 'eclipse-ditto' ? 'LIVE · Eclipse Ditto twins · every 2 s' : 'DEMO · local simulator (not via OpenEgiz) · every 2 s'}
      </div>
    </header>

    <nav className="ig-views" aria-label="Camera and layers">
      <button id="ig-guide-start" className="ig-guide-start" onClick={() => setGuideOpen(true)} disabled={guideOpen}>Guided demo ▶</button>
      <button id="ig-open-decision" className={`ig-decision-btn${decisionOpen ? ' on' : ''}`} aria-pressed={decisionOpen} onClick={() => setDecisionOpen(o => !o)}>Decision</button>
      <button id="ig-open-model" className={modelOpen ? 'on' : ''} aria-pressed={modelOpen} onClick={() => setModelOpen(o => !o)}>Mine model</button>
      {Object.entries(VIEWS).map(([id, v]) => <button key={id} id={`ig-view-${id}`} onClick={() => { goTo(v.target, v.offset); if (id === 'overview') { setSelected(null); setTwinCard(null) } }}>{v.label}</button>)}
      <button id="ig-layers-toggle" className={layersOpen || layers.size ? 'on' : ''} aria-expanded={layersOpen} aria-controls="ig-layer-list"
        onClick={() => setLayersOpen(o => !o)}>Technical layers{layers.size ? ` · ${layers.size}` : ''} {layersOpen ? '▴' : '▾'}</button>
      {layersOpen && <div id="ig-layer-list" className="ig-layers" role="group" aria-label="Technical layers: data and asset ingestion">
        <p>Data &amp; asset ingestion views</p>
        {LAYERS.map(([id, label]) => <button key={id} id={`ig-layer-${id}`} aria-pressed={layers.has(id)} className={layers.has(id) ? 'on' : ''} onClick={() => toggle(id)}>{label}</button>)}
      </div>}
    </nav>

    {(layers.has('specs') || layers.has('sensors')) && <div className="ig-key" aria-label="Value status">
      {[['sourced', 'OpenMines'], ['external_reference', 'Cat handbook'], ['derived', 'derived'], ['assumption', 'team input'], ['synthetic', 'synthetic']].map(([s, l]) =>
        <span key={s}><i style={{ background: STATUS_COLOR[s] }}/>{l}</span>)}
      <span className="ig-lane"><b style={{ color: '#5ec8f2' }}>▲</b>empty in · inner lane</span>
      <span className="ig-lane"><b style={{ color: '#f0b85a' }}>▲</b>loaded out · outer lane</span>
    </div>}

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

import React from 'react'
import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Terrain, { TerrainNS, createSeededRandom } from 'three.terrain.js'
import type { Twin } from './MineScene'
import { createGroundMaterial } from './GroundMaterial'
import { GraphicsSettings } from './GraphicsSettings'

const WIDTH = 1500
const DEPTH = 1150
const SEGMENTS = 320
const PIT_LIFT_COUNT = 10
const PIT_LIFT_HEIGHT = 21.5
const PIT_BENCH_SHARE = .48
const PIT_FACE_SHARE = .46
const HAUL_ROAD_WIDTH = 36
const HAUL_LANE_OFFSET = 11
const WASTE_ROAD_WIDTH = 24
const CRUSHER_SPUR_PROGRESS = .012
const TRUCK_COLORS = ['#dca529', '#d7c9a4', '#b4562d', '#71816a', '#d9d8cf', '#b98b36']

function paintHauler(scene: THREE.Group, paint: string, variant: number) {
  const clone = scene.clone(true)
  clone.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return
    // The source GLB batches wheels into chassis materials; named wheel nodes
    // are empty anchors. Remove middle-axle triangles from a private clone.
    if (child.name.startsWith('RenderBatch_Hauler_HAUL_')) {
      const geometry = child.geometry.clone()
      const position = geometry.getAttribute('position')
      const indices = geometry.index
      const retained: number[] = []
      const inMiddleWheel = (i: number) => Math.abs(position.getX(i)) < .65
        && position.getY(i) < 1.2 && position.getY(i) > -.08
        && Math.abs(position.getZ(i)) > .94
      for (let i = 0; i < (indices?.count ?? position.count); i += 3) {
        const triangle = [0, 1, 2].map(offset => indices ? indices.getX(i + offset) : i + offset)
        if (!triangle.every(inMiddleWheel)) retained.push(...triangle)
      }
      geometry.setIndex(retained)
      child.geometry = geometry
    }
    child.castShadow = child.receiveShadow = true
    const paintMaterial = (source: THREE.Material) => {
      const material = source.clone()
      if (!(material instanceof THREE.MeshStandardMaterial)) return material
      // Paint panels only: do not turn tires, glazing and steel pastel colors.
      if (source.name === 'HAUL_Body') { material.color.set(paint); material.metalness = .18; material.roughness = .72 }
      if (source.name === 'HAUL_ThermalWhite') material.color.set(variant % 2 ? '#e2dfd3' : paint)
      if (source.name === 'HAUL_Frame') { material.color.set('#393c3b'); material.roughness = .85 }
      if (source.name === 'HAUL_DarkService') { material.color.set('#202728'); material.metalness = .08; material.roughness = .88 }
      if (source.name === 'HAUL_StatusLight') { material.color.set('#e8a629'); material.emissive.set('#b56e12'); material.emissiveIntensity = .45 }
      return material
    }
    child.material = Array.isArray(child.material) ? child.material.map(paintMaterial) : paintMaterial(child.material)
  })
  return clone
}

function TruckTrim({ variant }: { variant: number }) {
  // Alternate rear spill guards and side reinforcement layouts, without
  // changing the chassis footprint or pretending these are OEM models.
  return <group>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[-.4, 3.65, side * 2.22]}><boxGeometry args={[4.8, .14, .07]}/><meshStandardMaterial color="#e4d5a0" roughness={.7}/></mesh>
      {Array.from({ length: 2 + variant % 3 }, (_, index) => <mesh key={index} position={[-2 + index * (3.5 / (1 + variant % 3)), 3.2, side * 2.25]}><boxGeometry args={[.13, .85, .1]}/><meshStandardMaterial color="#60594a" roughness={.85}/></mesh>)}
    </group>)}
    {variant % 2 === 0 && <mesh position={[-2.8, 3.5, 0]}><boxGeometry args={[.12, 1.15, 4.4]}/><meshStandardMaterial color="#7b715a" roughness={.85}/></mesh>}
  </group>
}
const twinValue = (twin: Twin | undefined, key: string, fallback: string | number = 0) => twin?.features?.[key]?.properties?.value ?? fallback

function gaussianHill(x: number, z: number, centerX: number, centerZ: number, spreadX: number, spreadZ: number, height: number) {
  const dx = (x - centerX) / spreadX
  const dz = (z - centerZ) / spreadZ
  return height * Math.exp(-(dx * dx + dz * dz))
}

function pitMetric(x: number, z: number) {
  // The road and benches share one footprint instead of carving circular
  // road rings through a differently shaped excavation.
  const nx = x / 500
  const nz = z / 400
  const angle = Math.atan2(nz, nx)
  return { angle, radius: Math.hypot(nx, nz) / pitContourScale(angle) }
}

function pitContourScale(angle: number) {
  const exponent = 3.4
  const radial = (a: number) => (Math.abs(Math.cos(a)) ** exponent + Math.abs(Math.sin(a)) ** exponent) ** (-1 / exponent)
  // Preserve both spiral endpoints at angle .3, including plant connections.
  return radial(angle) / radial(.3) * (1 + .035 * Math.sin(3 * (angle - .3)))
}

function nearestRoadSurface(x: number, z: number, roadPoints: THREE.Vector3[]) {
  let distance = Infinity
  let elevation = 0
  for (let index = 0; index < roadPoints.length - 1; index++) {
    const start = roadPoints[index]
    const end = roadPoints[index + 1]
    const segmentX = end.x - start.x
    const segmentZ = end.z - start.z
    const segmentLengthSquared = segmentX * segmentX + segmentZ * segmentZ
    const projection = segmentLengthSquared > 0
      ? THREE.MathUtils.clamp(((x - start.x) * segmentX + (z - start.z) * segmentZ) / segmentLengthSquared, 0, 1)
      : 0
    const nearestX = start.x + segmentX * projection
    const nearestZ = start.z + segmentZ * projection
    const candidateDistance = Math.hypot(x - nearestX, z - nearestZ)
    if (candidateDistance < distance) {
      distance = candidateDistance
      elevation = THREE.MathUtils.lerp(start.y, end.y, projection)
    }
  }
  return { distance, elevation }
}

function carveEngineeredPit(heights: Float32Array, options: { xSegments: number; ySegments: number; xSize: number; ySize: number }) {
  const columns = options.xSegments + 1
  const rows = options.ySegments + 1
  const roadPoints = haulRoadPoints()
  const accessPoints = crusherAccessTerrainPoints()
  const wastePoints = wasteRoadPoints()
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column
      const x = column / options.xSegments * options.xSize - options.xSize / 2
      const z = row / options.ySegments * options.ySize - options.ySize / 2
      const { angle, radius } = pitMetric(x, z)
      const backgroundRange =
        gaussianHill(x, z, -620, -430, 190, 140, 80) +
        gaussianHill(x, z, -220, -505, 230, 130, 66) +
        gaussianHill(x, z, 180, -500, 215, 140, 72) +
        gaussianHill(x, z, 610, -400, 180, 155, 62) +
        gaussianHill(x, z, -710, 35, 145, 220, 45)
      const regionalSurface = backgroundRange + Math.sin(x * .018 + z * .011) * .48 + Math.cos(z * .023 - x * .009) * .34

      // Keep the camera-facing approach country open while forming a broad,
      // asymmetric mountain wall behind the mine. This gives the pit regional
      // scale without allowing procedural foreground peaks to hide operations.
      if (radius < .1) {
        heights[index] = -213.5 + Math.sin(x * .06) * .35 + Math.cos(z * .07) * .3
      } else if (radius < .96) {
        const normalized = (radius - .1) / .86
        const scaled = normalized * PIT_LIFT_COUNT
        const level = Math.min(PIT_LIFT_COUNT - 1, Math.floor(scaled))
        const withinLevel = scaled - level
        const benchElevation = -210 + level * PIT_LIFT_HEIGHT
        // Every lift contains a true constant-elevation working bench followed
        // by a planar rock face. The wider face lowers the slope and avoids the
        // near-vertical, triangle-emphasising transition of the previous mesh.
        const faceProgress = THREE.MathUtils.clamp((withinLevel - PIT_BENCH_SHARE) / PIT_FACE_SHARE, 0, 1)
        heights[index] = benchElevation + faceProgress * PIT_LIFT_HEIGHT
      } else if (radius < 1.1) {
        const blend = THREE.MathUtils.smoothstep(radius, .96, 1.1)
        const rim = 3.5 + Math.sin(angle * 1.7) * .18
        heights[index] = THREE.MathUtils.lerp(rim, regionalSurface, blend)
      } else {
        heights[index] = regionalSurface
      }

      const mainRoad = nearestRoadSurface(x, z, roadPoints)
      const accessRoad = nearestRoadSurface(x, z, accessPoints)
      const wasteRoad = nearestRoadSurface(x, z, wastePoints)
      const nearestRoadDistance = Math.min(mainRoad.distance, accessRoad.distance, wasteRoad.distance)
      const nearestRoadElevation = nearestRoadDistance === mainRoad.distance ? mainRoad.elevation : nearestRoadDistance === accessRoad.distance ? accessRoad.elevation : wasteRoad.elevation
      const isWasteRoad = wasteRoad.distance === nearestRoadDistance
      const flatHalfWidth = isWasteRoad ? WASTE_ROAD_WIDTH / 2 : HAUL_ROAD_WIDTH / 2
      const shoulderWidth = isWasteRoad ? 6 : 8
      if (nearestRoadDistance < flatHalfWidth) {
        heights[index] = nearestRoadElevation
      } else if (nearestRoadDistance < flatHalfWidth + shoulderWidth) {
        const shoulderBlend = THREE.MathUtils.smoothstep(nearestRoadDistance, flatHalfWidth, flatHalfWidth + shoulderWidth)
        heights[index] = THREE.MathUtils.lerp(nearestRoadElevation, heights[index], shoulderBlend)
      }

      const loadingPoint = roadPoints[roadPoints.length - 1]
      const crusherPoint = roadPoints[0]
      const loadingDistance = Math.hypot(x - loadingPoint.x, z - loadingPoint.z)
      const crusherDistance = Math.hypot(x - crusherPoint.x, z - crusherPoint.z)
      if (loadingDistance < 10.5) heights[index] = THREE.MathUtils.lerp(loadingPoint.y, heights[index], THREE.MathUtils.smoothstep(loadingDistance, 7.5, 10.5))
      if (crusherDistance < 13) heights[index] = THREE.MathUtils.lerp(crusherPoint.y, heights[index], THREE.MathUtils.smoothstep(crusherDistance, 10, 13))
    }
  }
}

function terrainColors(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal')
  const colors = new Float32Array(positions.count * 3)
  const low = new THREE.Color('#aa9278')
  const mid = new THREE.Color('#c2a581')
  const high = new THREE.Color('#d2b78f')
  const color = new THREE.Color()
  for (let index = 0; index < positions.count; index++) {
    const elevation = positions.getZ(index)
    const x = positions.getX(index)
    const z = positions.getY(index)
    const pitRadius = pitMetric(x, z).radius
    const inExcavatedPit = pitRadius < .95
    const normalized = THREE.MathUtils.clamp((elevation + 216) / 300, 0, 1)
    color.copy(normalized < .55 ? low.clone().lerp(mid, normalized / .55) : mid.clone().lerp(high, (normalized - .55) / .45))
    const slope = normals ? 1 - Math.abs(normals.getZ(index)) : 0
    const radialBench = THREE.MathUtils.clamp((pitRadius - .1) / .86, 0, 1) * PIT_LIFT_COUNT
    const withinBench = radialBench - Math.floor(radialBench)
    const talusToe = inExcavatedPit && withinBench > .45 && withinBench < .56 ? .9 : 1
    const desertVariation = inExcavatedPit ? 1 : 1 + Math.sin(x * .061 + z * .043) * .018 + Math.cos(x * .027 - z * .071) * .012
    const granularMottle = 1 + Math.sin(x * .37 + z * .53) * .018
    const depthOcclusion = THREE.MathUtils.lerp(.96, 1.03, THREE.MathUtils.smoothstep(normalized, .06, .72))
    color.multiplyScalar(talusToe * desertVariation * granularMottle * depthOcclusion * THREE.MathUtils.lerp(1, .95, slope))
    colors[index * 3] = color.r; colors[index * 3 + 1] = color.g; colors[index * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

/** Shared road sampler used by the operational, ingestion, and safety views. */
export function haulRoadPoint(progress: number) {
  return new THREE.CatmullRomCurve3(haulRoadPoints()).getPointAt(THREE.MathUtils.clamp(progress, 0, 1))
}

function haulRoadPoints() {
  const pointCount = 641
  return Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1)
    const radius = THREE.MathUtils.lerp(.96, .10, progress)
    const angle = .3 + progress * Math.PI * 20
    const contour = pitContourScale(angle)
    return new THREE.Vector3(
      Math.cos(angle) * 500 * radius * contour,
      THREE.MathUtils.lerp(3.8, -212.2, progress),
      Math.sin(angle) * 400 * radius * contour
    )
  })
}

function processingPlantTransform() {
  const crusherPoint = haulRoadPoints()[0]
  return { position: new THREE.Vector3(crusherPoint.x + 115, crusherPoint.y + 4.6, crusherPoint.z + 35), rotation: -.38 }
}

function crusherDumpBayPoint() {
  const plant = processingPlantTransform()
  return new THREE.Vector3(-9.2, .38, -1.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), plant.rotation).add(plant.position)
}

function crusherAccessCurves(path: THREE.CatmullRomCurve3) {
  const dumpBay = crusherDumpBayPoint()
  const roadEntry = roadLanePoint(path, CRUSHER_SPUR_PROGRESS, -HAUL_LANE_OFFSET)
  const roadExit = roadLanePoint(path, CRUSHER_SPUR_PROGRESS, HAUL_LANE_OFFSET)
  const crest = path.getPointAt(0)
  return {
    entry: new THREE.CatmullRomCurve3([
      roadEntry, roadLanePoint(path, .004, -HAUL_LANE_OFFSET),
      crest.clone().lerp(dumpBay, .42).add(new THREE.Vector3(0, 0, -3)), dumpBay
    ]),
    exit: new THREE.CatmullRomCurve3([
      dumpBay, crest.clone().lerp(dumpBay, .58).add(new THREE.Vector3(0, 0, 5)),
      roadLanePoint(path, .004, HAUL_LANE_OFFSET), roadExit
    ])
  }
}

function crusherAccessTerrainPoints() {
  const path = new THREE.CatmullRomCurve3(haulRoadPoints())
  const { entry, exit } = crusherAccessCurves(path)
  return Array.from({ length: 65 }, (_, index) => {
    const progress = index / 64
    return entry.getPointAt(progress).lerp(exit.getPointAt(1 - progress), .5)
  })
}

function wasteRoadPoints() {
  const guide = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-490, 3.8, 105),
    new THREE.Vector3(-535, 5.5, 140),
    new THREE.Vector3(-585, 7.2, 175),
    new THREE.Vector3(-630, 9, 210),
    new THREE.Vector3(-675, 11, 245)
  ])
  return Array.from({ length: 81 }, (_, index) => guide.getPointAt(index / 80))
}

function roadLanePoint(curve: THREE.CatmullRomCurve3, progress: number, lateral: number) {
  const point = curve.getPointAt(progress)
  const tangent = curve.getTangentAt(progress).normalize()
  return point.addScaledVector(new THREE.Vector3(-tangent.z, 0, tangent.x).normalize(), lateral)
}

function ribbonGeometry(curve: THREE.CatmullRomCurve3, width: number) {
  const segments = 720
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let index = 0; index <= segments; index++) {
    const progress = index / segments
    const point = curve.getPointAt(progress)
    const tangent = curve.getTangentAt(progress).normalize()
    const across = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2)
    for (const side of [-1, 1]) {
      const vertex = point.clone().addScaledVector(across, side)
      positions.push(vertex.x, vertex.y + .18, vertex.z)
      uvs.push(progress * 18, side < 0 ? 0 : 1)
    }
    if (index < segments) {
      const base = index * 2
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function HaulRoadLayer({ restricted = false }: { restricted?: boolean }) {
  const { curve, road, outerBerm, markers, loadingApron, crusherEntryApron, crusherExitApron, loadedTrack, returnTrack } = React.useMemo(() => {
    const points = haulRoadPoints()
    const path = new THREE.CatmullRomCurve3(points)
    const offsetCurve = (distance: number) => new THREE.CatmullRomCurve3(points.map(point => {
      const radial = new THREE.Vector3(point.x / 500, 0, point.z / 400).normalize()
      return point.clone().addScaledVector(radial, distance).add(new THREE.Vector3(0, .52, 0))
    }))
    const framedPoint = (progress: number, lateral: number) => {
      const point = path.getPointAt(progress)
      const tangent = path.getTangentAt(progress).normalize()
      return point.clone().addScaledVector(new THREE.Vector3(-tangent.z, 0, tangent.x).normalize(), lateral)
    }
    const laneCurve = (lateral: number) => new THREE.CatmullRomCurve3(points.map((_, index) => framedPoint(index / (points.length - 1), lateral).add(new THREE.Vector3(0, .28, 0))))
    const apronCurve = new THREE.CatmullRomCurve3([
      framedPoint(.91, HAUL_LANE_OFFSET), framedPoint(.945, 7), framedPoint(.97, -11),
      framedPoint(.985, -16), framedPoint(.965, -14), framedPoint(.925, -HAUL_LANE_OFFSET)
    ])
    const { entry: crusherEntryCurve, exit: crusherExitCurve } = crusherAccessCurves(path)
    return {
      curve: path,
      road: ribbonGeometry(path, HAUL_ROAD_WIDTH),
      loadingApron: ribbonGeometry(apronCurve, 28),
      crusherEntryApron: ribbonGeometry(crusherEntryCurve, 18),
      crusherExitApron: ribbonGeometry(crusherExitCurve, 18),
      loadedTrack: laneCurve(-HAUL_LANE_OFFSET),
      returnTrack: laneCurve(HAUL_LANE_OFFSET),
      outerBerm: offsetCurve(HAUL_ROAD_WIDTH / 2 + 1.2),
      markers: [] as { point: THREE.Vector3; rotation: number }[]
    }
  }, [])
  const loadingBay = React.useMemo(() => {
    const progress = .985
    const point = curve.getPointAt(progress)
    const tangent = curve.getTangentAt(progress).normalize()
    const across = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
    return { point: point.clone().addScaledVector(across, -5), rotation: -Math.atan2(tangent.z, tangent.x) }
  }, [curve])
  return <group>
    <mesh geometry={road}><meshStandardMaterial color={restricted ? '#805443' : '#8a694d'} roughness={1}/></mesh>
    <mesh geometry={loadingApron}><meshStandardMaterial color="#806148" roughness={1}/></mesh>
    <mesh geometry={crusherEntryApron}><meshStandardMaterial color="#85664b" roughness={1}/></mesh>
    <mesh geometry={crusherExitApron}><meshStandardMaterial color="#85664b" roughness={1}/></mesh>
    <mesh><tubeGeometry args={[loadedTrack, 720, .075, 5, false]}/><meshStandardMaterial color="#5f4938" roughness={1} transparent opacity={.5}/></mesh>
    <mesh><tubeGeometry args={[returnTrack, 720, .065, 5, false]}/><meshStandardMaterial color="#664e3b" roughness={1} transparent opacity={.44}/></mesh>
    <mesh><tubeGeometry args={[outerBerm, 180, .42, 6, false]}/><meshStandardMaterial color="#9e7954" roughness={1}/></mesh>
    {markers.map(({ point, rotation }, index) => <mesh key={index} position={[point.x, point.y + .27, point.z]} rotation={[0, rotation, 0]}><boxGeometry args={[2.3, .06, .13]}/><meshBasicMaterial color={restricted ? '#ff714d' : '#e9c94f'}/></mesh>)}
    {restricted && Array.from({ length: 6 }, (_, index) => {
      const point = curve.getPointAt(.38 + index * .025)
      const tangent = curve.getTangentAt(.38 + index * .025)
      return <mesh key={`restriction-${index}`} position={point.clone().add(new THREE.Vector3(0, .72, 0))} rotation={[0, -Math.atan2(tangent.z, tangent.x), 0]}>
        <boxGeometry args={[.35, 1.15, 6.1]}/><meshStandardMaterial color={index % 2 ? '#f0f0e8' : '#ef563f'} roughness={.8}/>
      </mesh>
    })}
    <mesh position={loadingBay.point.clone().add(new THREE.Vector3(0, .24, 0))} rotation={[0, loadingBay.rotation, 0]}><boxGeometry args={[10, .14, 5.4]}/><meshStandardMaterial color="#4b4740" roughness={1}/></mesh>
    <mesh position={loadingBay.point.clone().add(new THREE.Vector3(0, .34, 0))} rotation={[0, loadingBay.rotation, 0]}><boxGeometry args={[8.6, .04, .12]}/><meshBasicMaterial color="#e5c44e"/></mesh>
  </group>
}

function WasteHauler({ curve, offset, lane, moving }: { curve: THREE.CatmullRomCurve3; offset: number; lane: number; moving: boolean }) {
  const { scene } = useGLTF('/models/hauler.glb')
  const truck = React.useMemo(() => paintHauler(scene, offset < 1 ? '#b88d42' : '#b8b3a5', 1), [scene, offset])
  const group = React.useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    const cycle = moving ? (clock.elapsedTime * .006 + offset) % 2 : offset
    const outward = cycle <= 1
    const progress = outward ? cycle : 2 - cycle
    const point = curve.getPointAt(progress)
    const tangent = curve.getTangentAt(progress).normalize().multiplyScalar(outward ? 1 : -1)
    const canonical = curve.getTangentAt(progress).normalize()
    const across = new THREE.Vector3(-canonical.z, 0, canonical.x).normalize().multiplyScalar(outward ? lane : -lane)
    group.current.position.copy(point).add(across).add(new THREE.Vector3(0, .42, 0))
    group.current.rotation.y = -Math.atan2(tangent.z, tangent.x)
  })
  return <group ref={group}>
    <group scale={1.1}>
    <primitive object={truck} scale={2.15}/>
    <TruckTrim variant={offset < 1 ? 1 : 2}/>
    <mesh position={[-.25, 4.2, .08]}><boxGeometry args={[4.8, .85, 3.55]}/><meshStandardMaterial color="#75604c" roughness={1}/></mesh>
    </group>
  </group>
}

function WasteHaulageLayer({ moving }: { moving: boolean }) {
  const curve = React.useMemo(() => new THREE.CatmullRomCurve3(wasteRoadPoints()), [])
  const road = React.useMemo(() => ribbonGeometry(curve, WASTE_ROAD_WIDTH), [curve])
  const leftTrack = React.useMemo(() => new THREE.CatmullRomCurve3(wasteRoadPoints().map(point => point.clone().add(new THREE.Vector3(0, .22, -5.8)))), [])
  const rightTrack = React.useMemo(() => new THREE.CatmullRomCurve3(wasteRoadPoints().map(point => point.clone().add(new THREE.Vector3(0, .22, 5.8)))), [])
  return <group>
    <mesh geometry={road}><meshStandardMaterial color="#896548" roughness={1}/></mesh>
    <mesh><tubeGeometry args={[leftTrack, 160, .08, 5, false]}/><meshStandardMaterial color="#5a4333" roughness={1} transparent opacity={.52}/></mesh>
    <mesh><tubeGeometry args={[rightTrack, 160, .08, 5, false]}/><meshStandardMaterial color="#5a4333" roughness={1} transparent opacity={.52}/></mesh>
    <WasteHauler curve={curve} offset={.12} lane={6.5} moving={moving}/>
    <WasteHauler curve={curve} offset={1.08} lane={6.5} moving={moving}/>
  </group>
}

type TruckPositionRegistry = Map<number, { position: THREE.Vector3; direction: number }>

function HaulerOnRoad({ progress, defaultDirection, queueSlot, truckIndex, twin, moving, selected, positions, onSelect }: { progress: number; defaultDirection: -1 | 1; queueSlot: number; truckIndex: number; twin?: Twin; moving?: boolean; selected?: boolean; positions: React.MutableRefObject<TruckPositionRegistry>; onSelect?: () => void }) {
  const { scene } = useGLTF('/models/hauler.glb')
  const identityColor = TRUCK_COLORS[truckIndex % TRUCK_COLORS.length]
  const model = React.useMemo(() => paintHauler(scene, identityColor, truckIndex), [identityColor, scene, truckIndex])
  const curve = React.useMemo(() => new THREE.CatmullRomCurve3(haulRoadPoints()), [])
  const curveLength = React.useMemo(() => curve.getLength(), [curve])
  const { entry: crusherEntry, exit: crusherExit } = React.useMemo(() => crusherAccessCurves(curve), [curve])
  const group = React.useRef<THREE.Group>(null)
  const animatedProgress = React.useRef(progress)
  const animatedLateral = React.useRef(defaultDirection > 0 ? -HAUL_LANE_OFFSET : HAUL_LANE_OFFSET)
  const state = String(twinValue(twin, 'state', defaultDirection > 0 ? 'hauling' : 'returning'))
  // Engine heading +1 is loaded travel from the pit to the crusher. The
  // rendered curve is stored in the opposite order (crusher to pit).
  const direction = Number(twinValue(twin, 'heading', defaultDirection)) >= 0 ? 1 : -1
  const curveDirection = direction > 0 ? -1 : 1
  const speed = Number(twinValue(twin, 'speed_kmh', moving ? 25 : 0))
  const authoritativeProgress = twin ? 1 - Number(twinValue(twin, 'route_progress_pct', (1 - progress) * 100)) / 100 : null
  const snapshot = React.useRef({ progress: authoritativeProgress ?? progress, receivedAt: performance.now() })
  const payloadFill = THREE.MathUtils.clamp(Number(twinValue(twin, 'payload_fill_pct', state === 'hauling' ? 100 : 0)) / 100, 0, 1)
  React.useEffect(() => {
    snapshot.current = { progress: authoritativeProgress ?? animatedProgress.current, receivedAt: performance.now() }
  }, [authoritativeProgress, direction, state])
  const targetProgress = React.useCallback(() => {
    if (state === 'loading') return .985
    if (state === 'dumping') return .015
    if (state === 'waiting_loading') return Math.max(.64, .92 - queueSlot * .1)
    if (state === 'waiting_crusher') return Math.min(.035, .016 + queueSlot * .006)
    if (state === 'hauling' || state === 'returning') {
      // The simulator runs at 20× real time and publishes snapshots less often
      // than the display refreshes. Predict the position between snapshots so
      // a truck maintains constant speed instead of sprinting and pausing.
      const elapsedRealS = Math.max(0, (performance.now() - snapshot.current.receivedAt) / 1000)
      // Convert the telemetry speed to distance along the actual rendered
      // route. A restrained 1.25× demo clock keeps motion readable while the
      // simulator continues to run at its existing accelerated rate.
      const progressPerRealS = (speed / 3.6) * 1.25 / curveLength
      return THREE.MathUtils.clamp(snapshot.current.progress + curveDirection * progressPerRealS * elapsedRealS, 0, 1)
    }
    return authoritativeProgress === null ? progress : THREE.MathUtils.clamp(authoritativeProgress, 0, 1)
  }, [authoritativeProgress, curveDirection, curveLength, progress, queueSlot, speed, state])
  const targetLateral = React.useCallback(() => {
    const laneSide = direction > 0 ? -1 : 1
    if (state === 'loading') return -16
    const lateralDistance = state === 'dumping' ? 13 : HAUL_LANE_OFFSET
    return laneSide * lateralDistance
  }, [direction, state])
  const updateTransform = React.useCallback((nextProgress: number, lateral: number, snapRotation = false) => {
    if (!group.current) return
    const point = curve.getPointAt(nextProgress)
    const canonicalTangent = curve.getTangentAt(nextProgress).normalize()
    let travelTangent = canonicalTangent.clone().multiplyScalar(curveDirection)
    // Loaded outbound traffic occupies the right side; empty returning
    // traffic occupies the opposite side. The offset is based on the stored
    // curve, not the travel tangent, so the two directions cannot collapse
    // onto the same physical lane.
    const across = new THREE.Vector3(-canonicalTangent.z, 0, canonicalTangent.x).normalize().multiplyScalar(lateral)
    let desiredPosition = point.clone().add(across).add(new THREE.Vector3(0, .38, 0))
    if (state === 'dumping') {
      desiredPosition = crusherDumpBayPoint()
      travelTangent = crusherEntry.getTangentAt(1).setY(0).normalize()
    } else if (state === 'hauling' && nextProgress < CRUSHER_SPUR_PROGRESS) {
      const spurProgress = THREE.MathUtils.clamp(1 - nextProgress / CRUSHER_SPUR_PROGRESS, 0, 1)
      desiredPosition = crusherEntry.getPointAt(spurProgress).add(new THREE.Vector3(0, .38, 0))
      travelTangent = crusherEntry.getTangentAt(spurProgress).setY(0).normalize()
    } else if (state === 'returning' && nextProgress < CRUSHER_SPUR_PROGRESS) {
      const spurProgress = THREE.MathUtils.clamp(nextProgress / CRUSHER_SPUR_PROGRESS, 0, 1)
      desiredPosition = crusherExit.getPointAt(spurProgress).add(new THREE.Vector3(0, .38, 0))
      travelTangent = crusherExit.getTangentAt(spurProgress).setY(0).normalize()
    }
    const blocked = !snapRotation && Array.from(positions.current.entries()).some(([otherIndex, other]) => {
      if (otherIndex === truckIndex) return false
      const safeDistance = other.direction === direction ? 11.5 : 8.5
      return other.position.distanceTo(desiredPosition) < safeDistance
    })
    if (!blocked) {
      if (snapRotation) group.current.position.copy(desiredPosition)
      else group.current.position.lerp(desiredPosition, .16)
    }
    positions.current.set(truckIndex, { position: group.current.position.clone(), direction })
    const targetRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.atan2(travelTangent.z, travelTangent.x), 0))
    if (snapRotation) group.current.quaternion.copy(targetRotation)
    else group.current.quaternion.slerp(targetRotation, .12)
  }, [crusherEntry, crusherExit, curve, curveDirection, direction, positions, state, truckIndex])
  useFrame((_, delta) => {
    const smoothing = moving ? 1 - Math.exp(-delta * 2.4) : 1
    animatedProgress.current = THREE.MathUtils.lerp(animatedProgress.current, targetProgress(), smoothing)
    animatedLateral.current = THREE.MathUtils.lerp(animatedLateral.current, targetLateral(), smoothing)
    updateTransform(animatedProgress.current, animatedLateral.current)
  })
  React.useLayoutEffect(() => {
    animatedProgress.current = targetProgress()
    animatedLateral.current = targetLateral()
    updateTransform(animatedProgress.current, animatedLateral.current, true)
  }, [])
  const status = state === 'breakdown' ? '#ff5149' : ['waiting_loading', 'loading', 'waiting_crusher', 'dumping'].includes(state) ? '#ffc246' : '#38ef9d'
  return <group ref={group} onClick={event => { event.stopPropagation(); onSelect?.() }}>
    <group scale={1.1}>
    <primitive object={model} scale={2.15}/>
    <TruckTrim variant={truckIndex}/>
    {payloadFill > .01 && <group position={[-.25, 4.25, .08]} scale={[1, Math.max(.15, payloadFill), 1]}>
      <mesh position={[0, -.36, 0]}><boxGeometry args={[4.9, .9, 3.6]}/><meshStandardMaterial color="#6f4b31" roughness={1}/></mesh>
      <mesh position={[-.9, .2, -.55]} rotation={[.2, .1, -.08]}><dodecahedronGeometry args={[1.18, 0]}/><meshStandardMaterial color="#9a6b43" roughness={1}/></mesh>
      <mesh position={[.78, .3, .42]} rotation={[-.1, .4, .16]}><dodecahedronGeometry args={[1.35, 0]}/><meshStandardMaterial color="#80583a" roughness={1}/></mesh>
      <mesh position={[1.5, .08, -.72]} rotation={[.4, .2, 0]}><dodecahedronGeometry args={[.95, 0]}/><meshStandardMaterial color="#a4774f" roughness={1}/></mesh>
    </group>}
    <mesh position={[0, 5.95, 0]}><boxGeometry args={[2.5, .25, .55]}/><meshBasicMaterial color={identityColor}/></mesh>
    <group position={[-.95, 6.42, 0]}>{Array.from({ length: truckIndex + 1 }, (_, marker) => <mesh key={marker} position={[marker * .38, 0, 0]}><boxGeometry args={[.2, .5, .2]}/><meshBasicMaterial color={identityColor}/></mesh>)}</group>
    {selected && <mesh position={[0, .08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[3.15, 3.75, 28]}/><meshBasicMaterial color="#fff06a"/></mesh>}
    <mesh position={[0, 7.35, 0]}><sphereGeometry args={[.26, 10, 8]}/><meshBasicMaterial color={status}/></mesh>
    {state === 'breakdown' && <mesh position={[0, 5.8, 0]}><octahedronGeometry args={[.7]}/><meshBasicMaterial color="#ff5149"/></mesh>}
    </group>
  </group>
}

function LoadingTransfer({ active, fill }: { active: boolean; fill: number }) {
  const stream = React.useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!stream.current || !active) return
    stream.current.children.forEach((rock, index) => {
      const phase = (clock.elapsedTime * 1.35 + index * .19) % 1
      rock.position.set(1.8 - phase * .9, 5.1 - phase * 3.2, -1.2 + phase * .55)
      rock.rotation.x += .08
      rock.rotation.z += .05
    })
  })
  if (!active) return null
  return <group ref={stream} position={[0, 0, 0]}>
    {Array.from({ length: 8 }, (_, index) => <mesh key={index} scale={.18 + (index % 3) * .06}>
      <dodecahedronGeometry args={[1, 0]}/><meshStandardMaterial color={index % 2 ? '#9b6d47' : '#704a32'} roughness={1}/>
    </mesh>)}
    <mesh position={[1.35, 1.82, -.72]} scale={[1.2, Math.max(.08, fill), .9]}><coneGeometry args={[1.35, 1.25, 16]}/><meshStandardMaterial color="#815737" roughness={1}/></mesh>
  </group>
}

function LoadingFace({ point, rotation }: { point: THREE.Vector3; rotation: number }) {
  const rocks = React.useMemo(() => Array.from({ length: 22 }, (_, index) => ({
    x: 4.2 + (index % 6) * 1.05 + Math.sin(index * 2.1) * .45,
    y: .35 + Math.floor(index / 6) * .38,
    z: -3.8 + Math.floor(index / 6) * 1.15 + Math.cos(index * 1.7) * .35,
    scale: .45 + (index % 4) * .13,
    rotation: index * .73
  })), [])
  return <group position={point} rotation={[0, rotation, 0]}>
    <mesh position={[1.2, 1.2, -12.8]} rotation={[0, 0, -.12]}><boxGeometry args={[11, 2.6, 1.4]}/><meshStandardMaterial color="#6e4d38" roughness={1}/></mesh>
    <mesh position={[1.2, .65, -10.8]} rotation={[0, 0, -.18]}><coneGeometry args={[5.3, 2.7, 18]}/><meshStandardMaterial color="#825c40" roughness={1}/></mesh>
    {rocks.map((rock, index) => <mesh key={index} position={[rock.x - 4, rock.y, rock.z - 7.2]} rotation={[rock.rotation, rock.rotation * .4, 0]} scale={rock.scale}>
      <dodecahedronGeometry args={[1, 0]}/><meshStandardMaterial color={index % 3 === 0 ? '#9d7450' : '#79543c'} roughness={1}/>
    </mesh>)}
    <mesh position={[0, .12, -5]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[3.8, 4.15, 30, 1, .15, Math.PI * 1.65]}/><meshBasicMaterial color="#e1c150"/></mesh>
    <mesh position={[0, .16, -10.2]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[4.6, 5, 32]}/><meshBasicMaterial color="#d85842"/></mesh>
  </group>
}

function EquipmentLayer({ twins = [], moving = false, selectedId = '', setSelectedId }: { twins?: Twin[]; moving?: boolean; selectedId?: string; setSelectedId?: (id: string) => void }) {
  const { scene } = useGLTF('/models/excavator.glb')
  const excavator = React.useMemo(() => scene.clone(), [scene])
  const excavatorGroup = React.useRef<THREE.Group>(null)
  const truckPositions = React.useRef<TruckPositionRegistry>(new Map())
  const curve = React.useMemo(() => new THREE.CatmullRomCurve3(haulRoadPoints()), [])
  const loadingPoint = curve.getPointAt(1)
  const loadingTangent = React.useMemo(() => curve.getTangentAt(.985).normalize(), [curve])
  const loadingAcross = React.useMemo(() => new THREE.Vector3(-loadingTangent.z, 0, loadingTangent.x).normalize(), [loadingTangent])
  const loadingRotation = -Math.atan2(loadingTangent.z, loadingTangent.x)
  const excavatorPoint = React.useMemo(() => curve.getPointAt(.985).clone().addScaledVector(loadingAcross, -8.1).addScaledVector(loadingTangent, 2.8), [curve, loadingAcross, loadingTangent])
  const trucks = twins.filter(twin => twin.attributes?.kind === 'haul-truck')
  const loadingTruck = trucks.find(twin => String(twinValue(twin, 'state')) === 'loading')
  const loadingFill = Number(twinValue(loadingTruck, 'payload_fill_pct', 0)) / 100
  const loadingQueue = trucks.filter(twin => String(twinValue(twin, 'state')) === 'waiting_loading').sort((a, b) => Number(twinValue(a, 'queue_position', 999)) - Number(twinValue(b, 'queue_position', 999)))
  const crusherQueue = trucks.filter(twin => String(twinValue(twin, 'state')) === 'waiting_crusher').sort((a, b) => Number(twinValue(a, 'queue_position', 999)) - Number(twinValue(b, 'queue_position', 999)))
  const excavatorState = String(twinValue(twins.find(twin => twin.attributes?.kind === 'excavator'), 'state', 'ready'))
  const excavatorBaseRotation = loadingRotation + Math.PI / 2
  useFrame(({ clock }) => {
    if (excavatorGroup.current) excavatorGroup.current.rotation.y = excavatorBaseRotation + (moving && excavatorState === 'loading' ? Math.sin(clock.elapsedTime * 1.8) * .2 : 0)
  })
  return <group>
    {[.12, .36, .66, .82, .55, .28].map((progress, index) => {
      const twin = trucks[index]
      const state = String(twinValue(twin, 'state'))
      const queueSlot = state === 'waiting_loading' ? loadingQueue.indexOf(twin) : state === 'waiting_crusher' ? crusherQueue.indexOf(twin) : 0
      return <HaulerOnRoad key={twin?.thingId || index} progress={progress} defaultDirection={index < 3 ? 1 : -1} queueSlot={Math.max(0, queueSlot)} truckIndex={index} twin={twin} moving={moving} selected={Boolean(twin && selectedId === twin.thingId)} positions={truckPositions} onSelect={twin ? () => setSelectedId?.(twin.thingId) : undefined}/>
    })}
    <LoadingFace point={loadingPoint} rotation={loadingRotation}/>
    <group ref={excavatorGroup} position={excavatorPoint.clone().add(new THREE.Vector3(0, .35, 0))} rotation={[0, excavatorBaseRotation, 0]}>
      <primitive object={excavator} scale={1.5}/>
      <LoadingTransfer active={moving && Boolean(loadingTruck)} fill={loadingFill}/>
    </group>
  </group>
}

function MaterialFlow({ constrained }: { constrained: boolean }) {
  const particles = React.useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (!particles.current) return
    const speed = constrained ? .65 : 1.7
    for (const child of particles.current.children) child.position.x = (child.position.x + delta * speed + 14) % 14
  })
  return <group ref={particles} position={[5.6, 1.45, .1]}>
    {[0, 2.8, 5.6, 8.4, 11.2].map(offset => <mesh key={offset} position={[offset, 0, 0]}>
      <dodecahedronGeometry args={[.35, 0]}/><meshStandardMaterial color={constrained ? '#e28b35' : '#b47b49'} roughness={1}/>
    </mesh>)}
  </group>
}

function MineWorker({ position, rotation = 0, vest = '#f0a51b' }: { position: [number, number, number]; rotation?: number; vest?: string }) {
  return <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, 1.65, 0]}><sphereGeometry args={[.25, 10, 8]}/><meshStandardMaterial color="#9a684b" roughness={1}/></mesh>
    <mesh position={[0, 1.92, 0]}><cylinderGeometry args={[.31, .25, .16, 12]}/><meshStandardMaterial color="#f5d32d" roughness={.72}/></mesh>
    <mesh position={[0, 1.05, 0]}><capsuleGeometry args={[.32, .72, 4, 8]}/><meshStandardMaterial color={vest} roughness={.9}/></mesh>
    <mesh position={[0, 1.16, .31]}><boxGeometry args={[.54, .13, .04]}/><meshBasicMaterial color="#dbff5c"/></mesh>
    {[-.18, .18].map(x => <mesh key={`leg-${x}`} position={[x, .38, 0]}><capsuleGeometry args={[.105, .48, 3, 6]}/><meshStandardMaterial color="#27343c" roughness={1}/></mesh>)}
    {[-.39, .39].map(x => <mesh key={`arm-${x}`} position={[x, 1.15, 0]} rotation={[0, 0, x < 0 ? -.3 : .3]}><capsuleGeometry args={[.08, .42, 3, 6]}/><meshStandardMaterial color={vest} roughness={.9}/></mesh>)}
  </group>
}

function DustControlCrew() {
  return <group position={[-7.8, .25, -5.5]}>
    <mesh position={[0, .42, 0]}><boxGeometry args={[7.4, .85, .16]}/><meshStandardMaterial color="#e4b726" roughness={.8}/></mesh>
    {[-3.4, 0, 3.4].map(x => <mesh key={x} position={[x, .85, 0]}><boxGeometry args={[.15, 1.7, .15]}/><meshStandardMaterial color="#272d2d"/></mesh>)}
    <MineWorker position={[-1.8, .15, -1.15]} rotation={.35}/>
    <MineWorker position={[1.3, .15, -1.2]} rotation={-.25} vest="#e76f2e"/>
    <mesh position={[-1.05, 1.18, -.75]} rotation={[0, 0, -1.12]}><cylinderGeometry args={[.055, .055, 2.7, 8]}/><meshStandardMaterial color="#253d43"/></mesh>
    {[0, 1, 2, 3, 4, 5].map(index => <mesh key={index} position={[-.12 + index * .38, 2.35 + index * .13, -.72 + index * .05]}>
      <sphereGeometry args={[.1 + index * .025, 7, 6]}/><meshBasicMaterial color="#b9e8ed" transparent opacity={.52 - index * .045}/>
    </mesh>)}
    <Html position={[0, 3.55, -1]} center distanceFactor={38}><div style={facilityLabelStyle}>DUST CONTROL · PPE ZONE</div></Html>
  </group>
}

const facilityLabelStyle: React.CSSProperties = {
  background: 'rgba(5, 22, 19, .88)', border: '1px solid rgba(101,245,176,.72)', borderRadius: 4,
  color: '#e9fff5', font: '600 10px Inter, sans-serif', letterSpacing: '.08em',
  padding: '4px 7px', pointerEvents: 'none', whiteSpace: 'nowrap'
}

function WorldFacilitiesLayer() {
  return <group>
    <group position={[690, 13, 330]} rotation={[0, -.48, 0]}>
      <mesh position={[0, 1.8, 0]}><boxGeometry args={[19, 3.6, 11]}/><meshStandardMaterial color="#66757a" roughness={.78}/></mesh>
      <mesh position={[0, 4.2, 0]} rotation={[0, Math.PI / 4, 0]}><cylinderGeometry args={[8.2, 8.2, 1.2, 4]}/><meshStandardMaterial color="#879196" roughness={.7}/></mesh>
      {[-5.7, 0, 5.7].map(x => <mesh key={x} position={[x, 1.5, 5.51]}><boxGeometry args={[4.5, 2.6, .18]}/><meshStandardMaterial color="#24343a"/></mesh>)}
      <Html position={[0, 7.2, 0]} center distanceFactor={48}><div style={facilityLabelStyle}>MAINTENANCE WORKSHOP</div></Html>
    </group>
    <group position={[545, 11, 435]}>
      {[-5, 0, 5].map(x => <mesh key={x} position={[x, 2.4, 0]}><cylinderGeometry args={[2.1, 2.1, 4.8, 18]}/><meshStandardMaterial color="#d5c6a1" metalness={.18} roughness={.65}/></mesh>)}
      <mesh position={[0, .15, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[10, 32]}/><meshStandardMaterial color="#4b514e"/></mesh>
      <Html position={[0, 7, 0]} center distanceFactor={48}><div style={facilityLabelStyle}>FUEL & SERVICE YARD</div></Html>
    </group>
    <group position={[-430, 12, 455]} rotation={[0, .2, 0]}>
      <mesh position={[0, 2.4, 0]}><boxGeometry args={[14, 4.8, 8]}/><meshStandardMaterial color="#d2c6aa" roughness={.82}/></mesh>
      <mesh position={[0, 5.1, 0]}><boxGeometry args={[15.2, .65, 9.2]}/><meshStandardMaterial color="#3e5b5b" roughness={.7}/></mesh>
      {[-4, 0, 4].map(x => <mesh key={x} position={[x, 2.7, 4.02]}><boxGeometry args={[2.4, 1.4, .12]}/><meshStandardMaterial color="#86c9d0" emissive="#173d42" emissiveIntensity={.25}/></mesh>)}
      <Html position={[0, 8, 0]} center distanceFactor={48}><div style={facilityLabelStyle}>MINE CONTROL OFFICE</div></Html>
    </group>
    <group position={[-675, 11, 245]}>
      <mesh scale={[1.7, .75, 1.2]}><coneGeometry args={[12, 12, 20]}/><meshStandardMaterial color="#765843" roughness={1}/></mesh>
      <mesh position={[11, -2, 3]} scale={[1.3, .55, .9]}><coneGeometry args={[10, 10, 18]}/><meshStandardMaterial color="#6a4c39" roughness={1}/></mesh>
      <Html position={[0, 12, 0]} center distanceFactor={48}><div style={facilityLabelStyle}>ENGINEERED WASTE DUMP</div></Html>
    </group>
  </group>
}

function ProcessingPlantLayer({ twins = [], moving = false }: { twins?: Twin[]; moving?: boolean }) {
  const hopper = useGLTF('/models/plant-hopper.glb').scene
  const crusher = useGLTF('/models/plant-crusher.glb').scene
  const conveyor = useGLTF('/models/plant-conveyor.glb').scene
  const conveyorSlope = useGLTF('/models/plant-conveyor-slope.glb').scene
  const stairs = useGLTF('/models/plant-stairs.glb').scene
  const crusherState = String(twinValue(twins.find(twin => twin.attributes?.kind === 'crusher'), 'state', 'operating'))
  const constrained = crusherState === 'constrained'
  const plantLabelStyle: React.CSSProperties = {
    background: 'rgba(5, 22, 19, .9)', border: '1px solid #65f5b0', borderRadius: 4,
    color: '#e9fff5', font: '600 10px Inter, sans-serif', letterSpacing: '.08em',
    padding: '4px 7px', pointerEvents: 'none', whiteSpace: 'nowrap'
  }

  // Place the dump beside the haul-road exit, then extend the processing line
  // outward across the open right-hand bench instead of over the pit wall.
  const { position: plantPosition, rotation: plantRotation } = processingPlantTransform()

  return <group position={plantPosition} rotation={[0, plantRotation, 0]}>
    {/* A single engineered pad grounds the complete processing line on the
        uneven mountainside. Its deep skirt remains embedded at every edge. */}
    <mesh position={[9, -1.65, 0]}><boxGeometry args={[45, 3.4, 15]}/><meshStandardMaterial color="#625e55" roughness={1}/></mesh>
    <mesh position={[9, .08, 0]}><boxGeometry args={[45.4, .22, 15.4]}/><meshStandardMaterial color="#8a877e" roughness={.96}/></mesh>
    <mesh position={[-10.7, 1.05, 0]}><boxGeometry args={[.6, 2.1, 15.4]}/><meshStandardMaterial color="#a29b88" roughness={1}/></mesh>
    <mesh position={[-6.3, .2, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 10]}/><meshStandardMaterial color="#47443e" roughness={1}/></mesh>
    <mesh position={[-5.8, -.55, 0]} rotation={[-Math.PI / 2, 0, 0]}><boxGeometry args={[6.4, 1.1, 4.5]}/><meshStandardMaterial color="#181b1b" roughness={.9}/></mesh>
    <mesh position={[-5.8, .25, -2.7]}><boxGeometry args={[7.8, 2.2, .55]}/><meshStandardMaterial color="#7c6854" roughness={1}/></mesh>
    <mesh position={[-5.8, .25, 2.7]}><boxGeometry args={[7.8, 2.2, .55]}/><meshStandardMaterial color="#7c6854" roughness={1}/></mesh>
    <group position={[-2.6, 0, 0]} rotation={[0, Math.PI / 2, 0]}><primitive object={hopper.clone()} scale={2.45}/></group>
    <Html position={[-5.8, 4.7, 0]} center distanceFactor={42}><div style={plantLabelStyle}>1 · TRUCK DUMP HOPPER</div></Html>
    <group position={[1.1, 0, 0]} rotation={[0, Math.PI / 2, 0]}><primitive object={crusher.clone()} scale={2.45}/></group>
    <group position={[1.1, 3.45, 0]}>
      <mesh><boxGeometry args={[7.8, 6.8, 7.2]}/><meshStandardMaterial color="#46545a" roughness={.78} metalness={.18}/></mesh>
      <mesh position={[0, 3.75, 0]} rotation={[0, Math.PI / 4, 0]}><cylinderGeometry args={[4.9, 4.9, 1.2, 4]}/><meshStandardMaterial color="#69777c" roughness={.72} metalness={.22}/></mesh>
      <mesh position={[-4.01, 1.1, 0]}><boxGeometry args={[.18, 2.8, 3.8]}/><meshBasicMaterial color="#171b1c"/></mesh>
      <mesh position={[0, 1.6, 3.61]}><boxGeometry args={[4.8, 1.15, .12]}/><meshBasicMaterial color="#f0aa24"/></mesh>
    </group>
    <Html position={[1.1, 8.8, 0]} center distanceFactor={42}><div style={plantLabelStyle}>2 · PRIMARY CRUSHER</div></Html>
    <group position={[4.6, .05, .1]} rotation={[0, Math.PI / 2, 0]}><primitive object={conveyorSlope.clone()} scale={2.45}/></group>
    {[8.2, 13.4, 18.6].map(x => <group key={x} position={[x, .58, .1]} rotation={[0, Math.PI / 2, 0]}><primitive object={conveyor.clone()} scale={2.45}/></group>)}
    {[8.2, 13.4, 18.6].map(x => <group key={`support-${x}`} position={[x, .3, .1]}>
      <mesh position={[0, -.22, 0]}><boxGeometry args={[3.6, .28, 3.7]}/><meshStandardMaterial color="#77736a" roughness={1}/></mesh>
      <mesh position={[0, .18, -1.25]}><boxGeometry args={[.32, .8, .32]}/><meshStandardMaterial color="#39464b" metalness={.28}/></mesh>
      <mesh position={[0, .18, 1.25]}><boxGeometry args={[.32, .8, .32]}/><meshStandardMaterial color="#39464b" metalness={.28}/></mesh>
      <mesh position={[0, .52, 0]}><boxGeometry args={[.34, .25, 3]}/><meshStandardMaterial color="#39464b" metalness={.28}/></mesh>
    </group>)}
    <Html position={[13.4, 4.7, .1]} center distanceFactor={42}><div style={plantLabelStyle}>3 · TRANSFER CONVEYOR</div></Html>
    <group position={[1.8, 0, -3.3]}><primitive object={stairs.clone()} scale={2.45}/></group>
    {moving && <MaterialFlow constrained={constrained}/>}
    <mesh position={[24.6, 1.05, .1]}>
      <coneGeometry args={[5.7, 5.2, 28]}/>
      <meshStandardMaterial color="#8b6747" roughness={1}/>
    </mesh>
    <Html position={[24.6, 6.5, .1]} center distanceFactor={42}><div style={plantLabelStyle}>4 · COARSE ORE STOCKPILE</div></Html>
    <mesh position={[24.6, .21, .1]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[6.8, 32]}/>
      <meshStandardMaterial color="#61584b" roughness={1}/>
    </mesh>
    <mesh position={[-5.8, .2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[4.4, 4.8, 32]}/>
      <meshBasicMaterial color="#e2c14f"/>
    </mesh>
    <mesh position={[-9.2, .24, -1.8]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.75, 3.05, 4]}/><meshBasicMaterial color="#ffd84a"/>
    </mesh>
    <Html position={[-9.2, 4.2, -1.8]} center distanceFactor={38}><div style={plantLabelStyle}>AUTHORIZED DUMP BAY</div></Html>
    {[-4, -1, 2, 5].flatMap(x => [-5.8, 5.8].map(z => <group key={`bollard-${x}-${z}`} position={[x, .85, z]}>
      <mesh><cylinderGeometry args={[.2, .24, 1.7, 10]}/><meshStandardMaterial color="#f2bd25" roughness={.75}/></mesh>
      <mesh position={[0, .28, 0]}><cylinderGeometry args={[.205, .205, .2, 10]}/><meshBasicMaterial color="#202729"/></mesh>
    </group>))}
    <mesh position={[7.5, 1.05, -6.5]}><boxGeometry args={[28, .22, .22]}/><meshStandardMaterial color="#e0ad22"/></mesh>
    <mesh position={[7.5, 1.05, 6.5]}><boxGeometry args={[28, .22, .22]}/><meshStandardMaterial color="#e0ad22"/></mesh>
    <DustControlCrew/>
  </group>
}

useGLTF.preload('/models/hauler.glb')
useGLTF.preload('/models/excavator.glb')
useGLTF.preload('/models/plant-hopper.glb')
useGLTF.preload('/models/plant-crusher.glb')
useGLTF.preload('/models/plant-conveyor.glb')
useGLTF.preload('/models/plant-conveyor-slope.glb')
useGLTF.preload('/models/plant-stairs.glb')

function RtsCameraControls({ focusLoading }: { focusLoading: boolean }) {
  const controls = React.useRef<React.ElementRef<typeof OrbitControls>>(null)
  const { camera, gl, scene } = useThree()
  const pressed = React.useRef(new Set<string>())
  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('input, select, textarea, button, [contenteditable]')) return
      const key = event.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault()
        pressed.current.add(key)
      }
    }
    const up = (event: KeyboardEvent) => pressed.current.delete(event.key.toLowerCase())
    const clear = () => pressed.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear) }
  }, [])
  React.useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = .1
      camera.updateProjectionMatrix()
    }
    const canvas = gl.domElement
    const focus = (event: MouseEvent) => {
      const orbit = controls.current
      if (!orbit) return
      const bounds = canvas.getBoundingClientRect()
      const pointer = new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2)
      const ray = new THREE.Raycaster()
      ray.setFromCamera(pointer, camera)
      const hit = ray.intersectObjects(scene.children, true).find(hit => hit.object instanceof THREE.Mesh && hit.object.visible)
      if (!hit) return
      const offset = camera.position.clone().sub(orbit.target).normalize().multiplyScalar(35)
      orbit.target.copy(hit.point)
      camera.position.copy(hit.point).add(offset)
      orbit.update()
    }
    canvas.addEventListener('dblclick', focus)
    return () => canvas.removeEventListener('dblclick', focus)
  }, [camera, gl, scene])
  useFrame((_, delta) => {
    const orbit = controls.current
    if (!orbit || focusLoading) return
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3(-forward.z, 0, forward.x)
    const movement = new THREE.Vector3()
    if (pressed.current.has('w') || pressed.current.has('arrowup')) movement.add(forward)
    if (pressed.current.has('s') || pressed.current.has('arrowdown')) movement.sub(forward)
    if (pressed.current.has('d') || pressed.current.has('arrowright')) movement.add(right)
    if (pressed.current.has('a') || pressed.current.has('arrowleft')) movement.sub(right)
    if (movement.lengthSq() === 0) return
    movement.normalize().multiplyScalar(Math.min(delta, .05) * Math.max(8, camera.position.distanceTo(orbit.target) * .85))
    camera.position.add(movement)
    orbit.target.add(movement)
    orbit.update()
  })
  const setView = (position: [number, number, number], target: [number, number, number]) => {
    camera.position.set(...position)
    controls.current?.target.set(...target)
    controls.current?.update()
  }
  const zoom = (factor: number) => {
    const orbit = controls.current
    if (!orbit) return
    const offset = camera.position.clone().sub(orbit.target)
    const distance = THREE.MathUtils.clamp(offset.length() * factor, 2, 2600)
    camera.position.copy(orbit.target).add(offset.normalize().multiplyScalar(distance))
    orbit.update()
  }
  return <>
    <OrbitControls ref={controls} makeDefault target={focusLoading ? [5, -205, 8] : [0, -88, 0]} enablePan screenSpacePanning zoomToCursor minDistance={2} maxDistance={2600} minPolarAngle={.15} maxPolarAngle={1.48} panSpeed={2.6} zoomSpeed={2.2} mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }} touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}/>
    <Html fullscreen calculatePosition={(_, __, size) => [size.width / 2, size.height / 2]} style={{ pointerEvents: 'none' }}>
      <div className="camera-tools" style={{ pointerEvents: 'auto' }}>
        <button onClick={() => setView([0, 1650, 400], [0, -88, 0])}>Overview</button>
        <button onClick={() => setView([260, 390, 410], [0, -105, 0])}>Pit</button>
        <button onClick={() => setView([760, 185, 430], [610, 5, 150])}>Plant</button>
        <button aria-label="Zoom in" onClick={() => zoom(.5)}>＋</button>
        <button aria-label="Zoom out" onClick={() => zoom(2)}>−</button>
        <span className="camera-help">Drag: move · Wheel: zoom at pointer · Double-click: inspect · Right-drag: rotate</span>
      </div>
    </Html>
  </>
}

export function TerrainStage({ showRoads = false, showEquipment = false, showPlant = false, moving = false, twins = [], selectedId = '', setSelectedId, focusLoading = false }: { showRoads?: boolean; showEquipment?: boolean; showPlant?: boolean; moving?: boolean; twins?: Twin[]; selectedId?: string; setSelectedId?: (id: string) => void; focusLoading?: boolean; hideStorage?: boolean }) {
  const roadRestricted = String(twinValue(twins.find(twin => twin.attributes?.kind === 'road'), 'state', 'open')) === 'restricted'
  const terrain = React.useMemo(() => {
    const material = createGroundMaterial()
    const scene = Terrain({
      after: carveEngineeredPit,
      easing: TerrainNS.EaseInOut,
      frequency: .65,
      heightmap: TerrainNS.Perlin,
      material,
      maxHeight: 2.8,
      minHeight: -.8,
      random: createSeededRandom(111),
      stretch: true,
      xSegments: SEGMENTS,
      xSize: WIDTH,
      ySegments: SEGMENTS,
      ySize: DEPTH
    })
    const mesh = scene.children[0] as THREE.Mesh<THREE.BufferGeometry>
    mesh.geometry.computeVertexNormals()
    terrainColors(mesh.geometry)
    mesh.receiveShadow = true
    return scene
  }, [])

  return <>
    <color attach="background" args={['#8ca0a2']}/>
    <fog attach="fog" args={['#8ca0a2', 1250, 2400]}/>
    <ambientLight intensity={.16}/>
    <hemisphereLight args={['#dbe8e5', '#5b4636', 1.34]}/>
    <directionalLight position={[-480, 850, 420]} intensity={2.05} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-near={10} shadow-camera-far={2400} shadow-camera-left={-950} shadow-camera-right={950} shadow-camera-top={800} shadow-camera-bottom={-800} shadow-normalBias={.35} shadow-bias={-.0001}/>
    <primitive object={terrain} position={[0, 0, 0]}/>
    {showRoads && <HaulRoadLayer restricted={roadRestricted}/>}
    {showEquipment && <EquipmentLayer twins={twins} moving={moving} selectedId={selectedId} setSelectedId={setSelectedId}/>}
    {showPlant && <ProcessingPlantLayer twins={twins} moving={moving}/>}
    {showPlant && <WorldFacilitiesLayer/>}
    {showPlant && <WasteHaulageLayer moving={moving}/>}
    <mesh position={[0, -216, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1680, 1320]}/><meshStandardMaterial color="#3b2d26" roughness={1}/></mesh>
    <RtsCameraControls focusLoading={focusLoading}/>
    <GraphicsSettings/>
  </>
}

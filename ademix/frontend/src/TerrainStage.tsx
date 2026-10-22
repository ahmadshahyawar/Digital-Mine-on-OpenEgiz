import React from 'react'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import Terrain, { TerrainNS, createSeededRandom } from 'three.terrain.js'

const WIDTH = 150
const DEPTH = 112
const SEGMENTS = 128

function carveEngineeredPit(heights: Float32Array, options: { xSegments: number; ySegments: number; xSize: number; ySize: number }) {
  const columns = options.xSegments + 1
  const rows = options.ySegments + 1
  const roadPoints = haulRoadPoints()
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column
      const x = column / options.xSegments * options.xSize - options.xSize / 2
      const z = row / options.ySegments * options.ySize - options.ySize / 2
      const angle = Math.atan2(z, x)
      const ellipticalRadius = Math.sqrt((x / 59) ** 2 + (z / 41) ** 2)
      const geologicalVariation = Math.sin(angle * 3 + .7) * .018 + Math.sin(angle * 7) * .009
      const radius = ellipticalRadius + geologicalVariation
      const original = heights[index]

      if (radius < .14) {
        heights[index] = -23.5 + Math.sin(x * .16) * .22 + Math.cos(z * .2) * .18
      } else if (radius < .91) {
        const normalized = (radius - .14) / .77
        const scaled = normalized * 6
        const level = Math.min(5, Math.floor(scaled))
        const withinLevel = scaled - level
        const benchElevation = -22 + level * 4.35
        const wallProgress = withinLevel < .42 ? 0 : THREE.MathUtils.smoothstep(withinLevel, .42, 1)
        heights[index] = benchElevation + wallProgress * 4.35
      } else if (radius < 1.02) {
        const blend = THREE.MathUtils.smoothstep(radius, .91, 1.02)
        const rim = 4.6 + Math.sin(angle * 4) * .55
        heights[index] = THREE.MathUtils.lerp(rim, original, blend)
      }

      let nearestRoadDistance = Infinity
      let nearestRoadElevation = heights[index]
      for (const roadPoint of roadPoints) {
        const distance = Math.hypot(x - roadPoint.x, z - roadPoint.z)
        if (distance < nearestRoadDistance) {
          nearestRoadDistance = distance
          nearestRoadElevation = roadPoint.y
        }
      }
      if (nearestRoadDistance < 3.8) {
        heights[index] = nearestRoadElevation
      } else if (nearestRoadDistance < 7.2) {
        const shoulderBlend = THREE.MathUtils.smoothstep(nearestRoadDistance, 3.8, 7.2)
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
  const colors = new Float32Array(positions.count * 3)
  const low = new THREE.Color('#55443a')
  const mid = new THREE.Color('#86664c')
  const high = new THREE.Color('#aa8159')
  const color = new THREE.Color()
  for (let index = 0; index < positions.count; index++) {
    const elevation = positions.getZ(index)
    const normalized = THREE.MathUtils.clamp((elevation + 24) / 31, 0, 1)
    color.copy(normalized < .55 ? low.clone().lerp(mid, normalized / .55) : mid.clone().lerp(high, (normalized - .55) / .45))
    const mineralBand = Math.sin(elevation * 2.3) > .72 ? .91 : 1
    color.multiplyScalar(mineralBand)
    colors[index * 3] = color.r; colors[index * 3 + 1] = color.g; colors[index * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function haulRoadPoints() {
  return Array.from({ length: 97 }, (_, index) => {
    const progress = index / 96
    const radius = THREE.MathUtils.lerp(.94, .16, progress)
    const angle = .3 + progress * Math.PI * 2.35
    return new THREE.Vector3(
      Math.cos(angle) * 59 * radius,
      THREE.MathUtils.lerp(4.8, -22.8, progress),
      Math.sin(angle) * 41 * radius
    )
  })
}

function ribbonGeometry(curve: THREE.CatmullRomCurve3, width: number) {
  const segments = 180
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

function HaulRoadLayer() {
  const { curve, road, outerBerm, markers } = React.useMemo(() => {
    const points = haulRoadPoints()
    const path = new THREE.CatmullRomCurve3(points)
    const offsetCurve = (distance: number) => new THREE.CatmullRomCurve3(points.map(point => {
      const radial = new THREE.Vector3(point.x / 59, 0, point.z / 41).normalize()
      return point.clone().addScaledVector(radial, distance).add(new THREE.Vector3(0, .52, 0))
    }))
    return {
      curve: path,
      road: ribbonGeometry(path, 7.2),
      outerBerm: offsetCurve(4.2),
      markers: Array.from({ length: 25 }, (_, index) => {
        const progress = .025 + index * .039
        const point = path.getPointAt(progress)
        const tangent = path.getTangentAt(progress)
        return { point, rotation: -Math.atan2(tangent.z, tangent.x) }
      })
    }
  }, [])
  return <group>
    <mesh geometry={road}><meshStandardMaterial color="#504a40" roughness={.98}/></mesh>
    <mesh><tubeGeometry args={[outerBerm, 180, .42, 6, false]}/><meshStandardMaterial color="#9e7954" roughness={1}/></mesh>
    {markers.map(({ point, rotation }, index) => <mesh key={index} position={[point.x, point.y + .27, point.z]} rotation={[0, rotation, 0]}><boxGeometry args={[2.3, .06, .13]}/><meshBasicMaterial color="#e9c94f"/></mesh>)}
    <mesh position={curve.getPointAt(1).clone().add(new THREE.Vector3(0, .19, 0))} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[8, 40]}/><meshStandardMaterial color="#5a554b" roughness={1}/></mesh>
    <mesh position={curve.getPointAt(0).clone().add(new THREE.Vector3(0, .19, 0))} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[10.5, 40]}/><meshStandardMaterial color="#5a554b" roughness={1}/></mesh>
    <mesh position={curve.getPointAt(1).clone().add(new THREE.Vector3(0, .25, 0))} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[7.1, 7.5, 40]}/><meshBasicMaterial color="#d5b54c"/></mesh>
    <mesh position={curve.getPointAt(0).clone().add(new THREE.Vector3(0, .25, 0))} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[9.4, 9.8, 40]}/><meshBasicMaterial color="#d5b54c"/></mesh>
  </group>
}

function HaulerOnRoad({ progress, lane }: { progress: number; lane: -1 | 1 }) {
  const { scene } = useGLTF('/models/hauler.glb')
  const model = React.useMemo(() => scene.clone(), [scene])
  const curve = React.useMemo(() => new THREE.CatmullRomCurve3(haulRoadPoints()), [])
  const point = curve.getPointAt(progress)
  const tangent = curve.getTangentAt(progress).normalize()
  const across = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(lane * 1.75)
  return <group position={point.clone().add(across).add(new THREE.Vector3(0, .38, 0))} rotation={[0, -Math.atan2(tangent.z, tangent.x), 0]}>
    <primitive object={model} scale={1.22}/>
    <mesh position={[0, 4.35, 0]}><sphereGeometry args={[.16, 10, 8]}/><meshBasicMaterial color="#38ef9d"/></mesh>
  </group>
}

function EquipmentLayer() {
  const { scene } = useGLTF('/models/excavator.glb')
  const excavator = React.useMemo(() => scene.clone(), [scene])
  const curve = React.useMemo(() => new THREE.CatmullRomCurve3(haulRoadPoints()), [])
  const loadingPoint = curve.getPointAt(1)
  return <group>
    <HaulerOnRoad progress={.08} lane={1}/><HaulerOnRoad progress={.22} lane={-1}/>
    <HaulerOnRoad progress={.38} lane={1}/><HaulerOnRoad progress={.54} lane={-1}/>
    <HaulerOnRoad progress={.7} lane={1}/><HaulerOnRoad progress={.86} lane={-1}/>
    <group position={loadingPoint.clone().add(new THREE.Vector3(1.2, .35, -1.5))} rotation={[0, -1.35, 0]}>
      <primitive object={excavator} scale={1.5}/>
    </group>
  </group>
}

function ProcessingPlantLayer() {
  const hopper = useGLTF('/models/plant-hopper.glb').scene
  const crusher = useGLTF('/models/plant-crusher.glb').scene
  const conveyor = useGLTF('/models/plant-conveyor.glb').scene
  const conveyorSlope = useGLTF('/models/plant-conveyor-slope.glb').scene
  const stairs = useGLTF('/models/plant-stairs.glb').scene
  const curve = React.useMemo(() => new THREE.CatmullRomCurve3(haulRoadPoints()), [])
  const crusherPoint = curve.getPointAt(0)

  return <group position={crusherPoint.clone().add(new THREE.Vector3(-1.2, .3, -.8))} rotation={[0, 2.76, 0]}>
    <group position={[-2.6, 0, 0]} rotation={[0, Math.PI / 2, 0]}><primitive object={hopper.clone()} scale={2.45}/></group>
    <group position={[1.1, 0, 0]} rotation={[0, Math.PI / 2, 0]}><primitive object={crusher.clone()} scale={2.45}/></group>
    <group position={[4.6, .2, .1]} rotation={[0, Math.PI / 2, 0]}><primitive object={conveyorSlope.clone()} scale={2.45}/></group>
    {[8.2, 13.4, 18.6].map((x, index) => <group key={x} position={[x, 2.05 + index * .02, .1]} rotation={[0, Math.PI / 2, 0]}><primitive object={conveyor.clone()} scale={2.45}/></group>)}
    <group position={[1.8, 0, -3.3]}><primitive object={stairs.clone()} scale={2.45}/></group>
    <mesh position={[24.6, 1.05, .1]}>
      <coneGeometry args={[5.7, 5.2, 28]}/>
      <meshStandardMaterial color="#8b6747" roughness={1}/>
    </mesh>
    <mesh position={[24.6, .08, .1]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[6.8, 32]}/>
      <meshStandardMaterial color="#61584b" roughness={1}/>
    </mesh>
    <mesh position={[-5.8, .2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[4.4, 4.8, 32]}/>
      <meshBasicMaterial color="#e2c14f"/>
    </mesh>
  </group>
}

useGLTF.preload('/models/hauler.glb')
useGLTF.preload('/models/excavator.glb')
useGLTF.preload('/models/plant-hopper.glb')
useGLTF.preload('/models/plant-crusher.glb')
useGLTF.preload('/models/plant-conveyor.glb')
useGLTF.preload('/models/plant-conveyor-slope.glb')
useGLTF.preload('/models/plant-stairs.glb')

export function TerrainStage({ showRoads = false, showEquipment = false, showPlant = false }: { showRoads?: boolean; showEquipment?: boolean; showPlant?: boolean }) {
  const terrain = React.useMemo(() => {
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94, metalness: 0, flatShading: false })
    const scene = Terrain({
      after: carveEngineeredPit,
      easing: TerrainNS.EaseInOut,
      frequency: 2.7,
      heightmap: TerrainNS.PerlinDiamond,
      material,
      maxHeight: 7,
      minHeight: -2,
      random: createSeededRandom(111),
      stretch: true,
      xSegments: SEGMENTS,
      xSize: WIDTH,
      ySegments: SEGMENTS,
      ySize: DEPTH
    })
    const mesh = scene.children[0] as THREE.Mesh<THREE.BufferGeometry>
    terrainColors(mesh.geometry)
    mesh.geometry.computeVertexNormals()
    return scene
  }, [])

  return <>
    <color attach="background" args={['#8ca0a2']}/>
    <fog attach="fog" args={['#8ca0a2', 115, 230]}/>
    <hemisphereLight args={['#dbe8e5', '#49382b', 1.55]}/>
    <directionalLight position={[-45, 70, 35]} intensity={2.25}/>
    <primitive object={terrain} position={[0, 0, 0]}/>
    {showRoads && <HaulRoadLayer/>}
    {showEquipment && <EquipmentLayer/>}
    {showPlant && <ProcessingPlantLayer/>}
    <mesh position={[0, -24.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[190, 145]}/><meshStandardMaterial color="#3b2d26" roughness={1}/></mesh>
    <OrbitControls makeDefault target={[0, -6, 0]} minDistance={62} maxDistance={175} maxPolarAngle={Math.PI / 2.08}/>
  </>
}

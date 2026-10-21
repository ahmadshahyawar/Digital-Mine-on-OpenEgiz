import React from 'react'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Terrain, { TerrainNS, createSeededRandom } from 'three.terrain.js'

const WIDTH = 150
const DEPTH = 112
const SEGMENTS = 128

function carveEngineeredPit(heights: Float32Array, options: { xSegments: number; ySegments: number; xSize: number; ySize: number }) {
  const columns = options.xSegments + 1
  const rows = options.ySegments + 1
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

export function TerrainStage() {
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
    <mesh position={[0, -24.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[190, 145]}/><meshStandardMaterial color="#3b2d26" roughness={1}/></mesh>
    <OrbitControls makeDefault target={[0, -6, 0]} minDistance={62} maxDistance={175} maxPolarAngle={Math.PI / 2.08}/>
  </>
}

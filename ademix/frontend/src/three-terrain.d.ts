declare module 'three.terrain.js' {
  import * as THREE from 'three'
  type TerrainOptions = {
    after?: (heights: Float32Array, options: TerrainOptions & { xSegments: number; ySegments: number; xSize: number; ySize: number }) => void
    easing?: (value: number) => number
    frequency?: number
    heightmap?: (heights: Float32Array, options: TerrainOptions) => void
    material?: THREE.Material
    maxHeight?: number
    minHeight?: number
    random?: () => number
    steps?: number
    stretch?: boolean
    xSegments?: number
    xSize?: number
    ySegments?: number
    ySize?: number
  }
  export const TerrainNS: Record<string, any>
  export function createSeededRandom(seed: number): () => number
  export default function Terrain(options: TerrainOptions): THREE.Object3D
}

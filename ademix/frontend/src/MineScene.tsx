import React from 'react'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

type Feature = { properties?: { value?: string | number; unit?: string } }
export type Twin = { thingId: string; attributes?: { name?: string; kind?: string }; features?: Record<string, Feature> }
const value = (t: Twin | undefined, key: string, fallback: string | number = 0) => t?.features?.[key]?.properties?.value ?? fallback
const statusColor = (state: string) => state === 'breakdown' || state === 'constrained' ? '#ff554d' : state === 'restricted' ? '#ff9f2e' : '#21d889'
const route = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-27, 1.1, -18), new THREE.Vector3(-21, .2, -14), new THREE.Vector3(-14, -1, -9),
  new THREE.Vector3(-5, -1.7, -3), new THREE.Vector3(4, -1, 4), new THREE.Vector3(15, .2, 11), new THREE.Vector3(27, 1.1, 18)
])

function Truck({ twin, selected, onSelect }: { twin: Twin; selected: boolean; onSelect: () => void }) {
  const state = String(value(twin, 'state', 'unknown'))
  const color = selected ? '#fff06a' : statusColor(state)
  const { scene } = useGLTF('/models/hauler.glb')
  const model = React.useMemo(() => scene.clone(), [scene])
  return <group position={[Number(value(twin, 'position_x')), 1.65, Number(value(twin, 'position_z'))]} rotation={[0, Number(value(twin, 'heading', 1)) < 0 ? Math.PI : 0, 0]} onClick={e => { e.stopPropagation(); onSelect() }}>
    {selected && <mesh position={[0, -1.35, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.9, 2.3, 24]}/><meshBasicMaterial color="#fff06a"/></mesh>}
    <primitive object={model} scale={1.15}/>
    <mesh position={[0, 3.85, 0]}><sphereGeometry args={[.18, 10, 8]}/><meshBasicMaterial color={color}/></mesh>
    {state === 'breakdown' && <mesh position={[0, 2.1, 0]}><octahedronGeometry args={[.48]}/><meshBasicMaterial color="#ff554d"/></mesh>}
  </group>
}

function Bench({ inner, outer, y, color }: { inner: number; outer: number; y: number; color: string }) {
  return <group position={[-11, y, -6]} scale={[1, 1, .68]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[inner, outer, 72]}/><meshStandardMaterial color={color} roughness={.96}/></mesh>
    <mesh position={[0, -.62, 0]}><cylinderGeometry args={[inner, inner + 1.7, 1.25, 72, 1, true]}/><meshStandardMaterial color="#392820" roughness={1} side={THREE.DoubleSide}/></mesh>
  </group>
}

function Excavator() {
  const { scene } = useGLTF('/models/excavator.glb')
  const model = React.useMemo(() => scene.clone(), [scene])
  return <group position={[-27, 1.2, -18]} rotation={[0, -.45, 0]}>
    <primitive object={model} scale={1.35}/>
  </group>
}

function Crusher() {
  return <group position={[27, .8, 18]}>
    <mesh position={[0, 1.7, 0]}><boxGeometry args={[7.2, 3.4, 6.2]}/><meshStandardMaterial color="#60748c" metalness={.15} roughness={.65}/></mesh>
    <mesh position={[0, 3.75, 0]} rotation={[0, Math.PI / 4, 0]}><cylinderGeometry args={[2.1, 3.25, 1.8, 4]}/><meshStandardMaterial color="#91a4ba"/></mesh>
    <mesh position={[5.3, 2.2, 1.2]} rotation={[0, 0, -.15]}><boxGeometry args={[6.7, .6, 2.2]}/><meshStandardMaterial color="#344353"/></mesh>
    <mesh position={[8.4, -.05, 1.2]}><coneGeometry args={[5.8, 6.8, 32]}/><meshStandardMaterial color="#9b6435" roughness={1}/></mesh>
  </group>
}

useGLTF.preload('/models/hauler.glb')
useGLTF.preload('/models/excavator.glb')

function HaulRoad({ restricted }: { restricted: boolean }) {
  return <group><mesh><tubeGeometry args={[route, 96, 2.3, 10, false]}/><meshStandardMaterial color={restricted ? '#8f3f2b' : '#5f5b4f'} roughness={1}/></mesh><mesh><tubeGeometry args={[route, 96, .1, 5, false]}/><meshBasicMaterial color={restricted ? '#ffad38' : '#d9be58'}/></mesh></group>
}

export function MineScene({ twins, selectedId, setSelectedId }: { twins: Twin[]; selectedId: string; setSelectedId: (id: string) => void }) {
  const trucks = twins.filter(t => t.attributes?.kind === 'haul-truck')
  const restricted = value(twins.find(t => t.attributes?.kind === 'road'), 'state', 'open') === 'restricted'
  return <>
    <color attach="background" args={['#07110f']}/><fog attach="fog" args={['#07110f', 75, 135]}/>
    <ambientLight intensity={.9}/><hemisphereLight args={['#c4eadd', '#35251c', 1.1]}/><directionalLight position={[25, 38, 18]} intensity={1.7}/>
    <group>
      <mesh position={[-11, -3.8, -6]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, .68, 1]}><circleGeometry args={[40, 72]}/><meshStandardMaterial color="#2b201b" roughness={1}/></mesh>
      <Bench inner={28} outer={38} y={.1} color="#674a35"/><Bench inner={19.5} outer={27.8} y={-1.15} color="#74543b"/><Bench inner={11} outer={19.3} y={-2.4} color="#826044"/>
      <mesh position={[-11, -3.65, -6]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, .68, 1]}><circleGeometry args={[10.8, 48]}/><meshStandardMaterial color="#936f4e" roughness={1}/></mesh>
      <HaulRoad restricted={restricted}/><Excavator/><Crusher/>
      {trucks.map(t => <Truck key={t.thingId} twin={t} selected={selectedId === t.thingId} onSelect={() => setSelectedId(t.thingId)}/>) }
    </group>
    <gridHelper args={[130, 26, '#244239', '#152821']} position={[0, -3.9, 0]}/>
    <OrbitControls makeDefault target={[-4, -1, 0]} minDistance={35} maxDistance={110} maxPolarAngle={Math.PI / 2.08}/>
  </>
}

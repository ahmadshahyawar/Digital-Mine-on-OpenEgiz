import React from 'react'
import ReactDOM from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import './styles.css'

type Feature = { properties?: { value?: string | number; unit?: string } }
type Twin = { thingId: string; attributes?: { name?: string; kind?: string }; features?: Record<string, Feature> }
type StateResponse = { source: string; twins: Twin[] }

const value = (twin: Twin | undefined, key: string, fallback: string | number = 0) => twin?.features?.[key]?.properties?.value ?? fallback
const colorFor = (state: string) => state === 'breakdown' || state === 'constrained' ? '#ff4d4d' : state === 'restricted' ? '#ffb020' : '#39e58c'

function Truck({ twin, selected, onSelect }: { twin: Twin; selected: boolean; onSelect: () => void }) {
  const x = Number(value(twin, 'position_x'))
  const z = Number(value(twin, 'position_z'))
  const state = String(value(twin, 'state', 'unknown'))
  const heading = Number(value(twin, 'heading', 1))
  return <group position={[x, 1.25, z]} rotation={[0, heading < 0 ? Math.PI : 0, 0]} onClick={(event) => { event.stopPropagation(); onSelect() }}>
    <mesh castShadow={false}><boxGeometry args={[3.1, 1.25, 1.7]}/><meshStandardMaterial color={selected ? '#fff27a' : colorFor(state)} emissive={selected ? '#6d5d00' : '#06120e'} emissiveIntensity={0.35}/></mesh>
    <mesh position={[-0.9, 0.75, 0]}><boxGeometry args={[1.1, 0.9, 1.55]}/><meshStandardMaterial color="#dce8df"/></mesh>
    {[-1, 1].flatMap(ix => [-1, 1].map(iz => <mesh key={`${ix}-${iz}`} position={[ix, -0.65, iz * 0.7]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.38, 0.38, 0.28, 10]}/><meshStandardMaterial color="#111"/></mesh>))}
  </group>
}

function MineScene({ twins, selectedId, setSelectedId }: { twins: Twin[]; selectedId: string; setSelectedId: (id: string) => void }) {
  const trucks = twins.filter(t => t.attributes?.kind === 'haul-truck')
  const road = twins.find(t => t.attributes?.kind === 'road')
  const restricted = value(road, 'state', 'open') === 'restricted'
  return <>
    <color attach="background" args={['#07110f']}/>
    <ambientLight intensity={1.35}/><directionalLight position={[20, 35, 12]} intensity={1.8}/>
    <group>
      {[0, 1, 2, 3].map(level => <mesh key={level} position={[-11 + level * 3.8, -1.5 - level * 1.4, -7 + level * 1.5]}>
        <cylinderGeometry args={[34 - level * 6, 39 - level * 6, 3, 32]}/><meshStandardMaterial color={['#624b35', '#75583d', '#866446', '#997451'][level]} roughness={1}/>
      </mesh>)}
      <mesh position={[1, 0.15, 2]} rotation={[-Math.PI / 2, 0, -0.58]}><planeGeometry args={[70, 5]}/><meshStandardMaterial color={restricted ? '#a9552c' : '#71664e'}/></mesh>
      <mesh position={[-25, 1.5, -18]}><boxGeometry args={[5, 3, 4]}/><meshStandardMaterial color="#f0b429"/></mesh>
      <mesh position={[27, 2, 18]}><boxGeometry args={[7, 4, 6]}/><meshStandardMaterial color="#64748b"/></mesh>
      <mesh position={[32, 1.25, 20]}><cylinderGeometry args={[6, 7, 2.5, 24]}/><meshStandardMaterial color="#8c613c"/></mesh>
      {trucks.map(twin => <Truck key={twin.thingId} twin={twin} selected={selectedId === twin.thingId} onSelect={() => setSelectedId(twin.thingId)}/>)}
    </group>
    <gridHelper args={[100, 20, '#244239', '#152821']} position={[0, -2.95, 0]}/>
    <OrbitControls makeDefault minDistance={28} maxDistance={95} maxPolarAngle={Math.PI / 2.15}/>
  </>
}

function App() {
  const [data, setData] = React.useState<StateResponse>({ source: 'connecting', twins: [] })
  const [selectedId, setSelectedId] = React.useState('')
  const [error, setError] = React.useState('')
  const refresh = React.useCallback(async () => {
    try { const response = await fetch('/api/state'); if (!response.ok) throw new Error(await response.text()); setData(await response.json()); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'State unavailable') }
  }, [])
  React.useEffect(() => { refresh(); const timer = window.setInterval(refresh, 2000); return () => window.clearInterval(timer) }, [refresh])
  const mine = data.twins.find(t => t.attributes?.kind === 'mine')
  const selected = data.twins.find(t => t.thingId === selectedId)
  const scenario = String(value(mine, 'active_scenario', 'baseline'))
  const setScenario = async (next: string) => { await fetch('/api/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: next }) }); await refresh() }

  return <main>
    <header><div><span className="eyebrow">ADEMIX · DIGITAL OPERATIONS</span><h1>North Pit Command Center</h1></div><div className="live"><i/> LIVE VIA {data.source.toUpperCase()}</div></header>
    <section className="kpis">
      <Kpi label="Production" value={Number(value(mine, 'production_t')).toLocaleString()} unit="t"/>
      <Kpi label="Throughput" value={Number(value(mine, 'throughput_tph')).toFixed(0)} unit="t/h"/>
      <Kpi label="Fleet utilization" value={Number(value(mine, 'fleet_utilization')).toFixed(0)} unit="%"/>
      <Kpi label="Cycle time" value={Number(value(mine, 'average_cycle_min')).toFixed(1)} unit="min"/>
    </section>
    <section className="workspace">
      <aside><h2>What-if control</h2><p>Change an operating condition and observe the effect across connected twins.</p>{[
        ['baseline','Normal operations'], ['truck_breakdown','Truck HT-01 breakdown'], ['road_closure','Main road restriction'], ['crusher_slowdown','Crusher capacity −45%']
      ].map(([id,label]) => <button key={id} className={scenario === id ? 'active' : ''} onClick={() => setScenario(id)}>{label}<span>→</span></button>)}
      <div className="source"><b>Trusted state</b><span>Simulator → MQTT → Ditto → 3D</span></div></aside>
      <div className="viewport"><Canvas camera={{ position: [52, 44, 58], fov: 43 }} dpr={[0.75, 1.25]} gl={{ antialias: true, powerPreference: 'low-power', toneMapping: THREE.ACESFilmicToneMapping }}><MineScene twins={data.twins} selectedId={selectedId} setSelectedId={setSelectedId}/></Canvas><div className="view-label">INTERACTIVE 3D MINE · DRAG TO ORBIT · SCROLL TO ZOOM</div>{error && <div className="error">Waiting for OpenEgiz state…</div>}</div>
      <aside className="detail"><h2>{selected?.attributes?.name || 'Select equipment'}</h2>{selected ? Object.entries(selected.features || {}).slice(0, 7).map(([key,feature]) => <div className="reading" key={key}><span>{key.replace(/_/g,' ')}</span><b>{String(feature.properties?.value ?? '—')} <small>{feature.properties?.unit}</small></b></div>) : <p>Click a truck in the 3D scene to inspect its live twin state.</p>}</aside>
    </section>
  </main>
}

function Kpi({ label, value, unit }: { label: string; value: string; unit: string }) { return <div><span>{label}</span><strong>{value}</strong><small>{unit}</small></div> }

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)


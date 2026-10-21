import React from 'react'
import ReactDOM from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { MineScene, type Twin } from './MineScene'
import { TerrainStage } from './TerrainStage'
import './styles.css'
import './fleet.css'

type StateResponse = { source: string; twins: Twin[] }
const value = (twin: Twin | undefined, key: string, fallback: string | number = 0) => twin?.features?.[key]?.properties?.value ?? fallback

function App() {
  const terrainReview = new URLSearchParams(window.location.search).get('stage') === 'terrain'
  const [data, setData] = React.useState<StateResponse>({ source: 'connecting', twins: [] })
  const [selectedId, setSelectedId] = React.useState('')
  const [error, setError] = React.useState('')
  const [scenarioPending, setScenarioPending] = React.useState('')
  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch('/api/state')
      if (!response.ok) throw new Error(await response.text())
      setData(await response.json()); setError('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'State unavailable') }
  }, [])
  React.useEffect(() => { refresh(); const timer = window.setInterval(refresh, 2000); return () => window.clearInterval(timer) }, [refresh])

  const mine = data.twins.find(t => t.attributes?.kind === 'mine')
  const selected = data.twins.find(t => t.thingId === selectedId)
  const scenarioTwin = data.twins.find(t => t.attributes?.kind === 'scenario')
  const scenario = String(value(mine, 'active_scenario', 'baseline'))
  const connected = data.source === 'eclipse-ditto' && !error
  const fleet = data.twins.filter(t => t.attributes?.kind === 'haul-truck')
  const setScenario = async (next: string) => {
    setScenarioPending(next)
    try {
      const response = await fetch('/api/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: next }) })
      if (!response.ok) throw new Error(await response.text())
      await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Scenario update failed') }
    finally { setScenarioPending('') }
  }

  return <main>
    <header><div><span className="eyebrow">ADEMIX · DIGITAL OPERATIONS</span><h1>North Pit Command Center</h1></div><div className={`live ${connected ? '' : 'offline'}`}><i/> {connected ? `LIVE VIA ${data.source.toUpperCase()}` : 'CONNECTING TO OPENGIZ'}</div></header>
    <section className="kpis">
      <Kpi label="Production" value={Number(value(mine, 'production_t')).toLocaleString()} unit="t"/>
      <Kpi label="Throughput" value={Number(value(mine, 'throughput_tph')).toFixed(0)} unit="t/h"/>
      <Kpi label="Fleet utilization" value={Number(value(mine, 'fleet_utilization')).toFixed(0)} unit="%"/>
      <Kpi label="Cycle time" value={Number(value(mine, 'average_cycle_min')).toFixed(1)} unit="min"/>
    </section>
    <section className="workspace">
      <aside><h2>What-if control</h2><p>Change an operating condition and observe the effect across connected twins.</p>{[
        ['baseline','Normal operations'], ['truck_breakdown','Truck HT-01 breakdown'], ['road_closure','Main road restriction'], ['crusher_slowdown','Crusher capacity −45%']
      ].map(([id,label]) => <button key={id} disabled={Boolean(scenarioPending)} className={scenario === id ? 'active' : ''} onClick={() => setScenario(id)}>{scenarioPending === id ? 'Applying…' : label}<span>→</span></button>)}
      <div className="comparison"><span>Projected throughput</span><b>{Number(value(scenarioTwin, 'projected_throughput_tph', 900)).toFixed(0)} <small>t/h</small></b><em>{Number(value(scenarioTwin, 'impact_pct', 0)).toFixed(0)}% vs 900 t/h baseline</em><div><i style={{width: `${Math.max(12, Number(value(scenarioTwin, 'projected_throughput_tph', 900)) / 9)}%`}}/></div></div>
      <div className="source"><b>Trusted state</b><span>Simulator → MQTT → Ditto → 3D</span></div></aside>
      <div className="viewport"><Canvas camera={{ position: terrainReview ? [92, 72, 98] : [57, 48, 62], fov: 42 }} dpr={[0.75, 1.25]} gl={{ antialias: true, powerPreference: 'low-power', toneMapping: THREE.ACESFilmicToneMapping }}>{terrainReview ? <TerrainStage/> : <MineScene twins={data.twins} selectedId={selectedId} setSelectedId={setSelectedId}/>}</Canvas><div className="view-label">{terrainReview ? 'STAGE 1 · TERRAIN REVIEW' : 'LIVE TWIN MAP'} · DRAG TO ORBIT · SCROLL TO ZOOM</div>{error && <div className="error">Waiting for OpenEgiz state…</div>}</div>
      <aside className="detail"><h2>{selected?.attributes?.name || 'Live fleet'}</h2>{selected ? <><button className="back" onClick={() => setSelectedId('')}>← Back to fleet</button>{Object.entries(selected.features || {}).slice(0, 7).map(([key,feature]) => <div className="reading" key={key}><span>{key.replace(/_/g,' ')}</span><b>{String(feature.properties?.value ?? '—')} <small>{feature.properties?.unit}</small></b></div>)}</> : <><p>Select a truck in the scene or fleet list to inspect its Eclipse Ditto state.</p><div className="fleet-list">{fleet.map(t => { const state = String(value(t, 'state', 'unknown')); return <button key={t.thingId} onClick={() => setSelectedId(t.thingId)}><i className={state}/><span><b>{t.attributes?.name}</b><small>{state} · {String(value(t, 'payload_t'))} t</small></span><em>{Number(value(t, 'fuel_pct')).toFixed(0)}%</em></button> })}</div><div className="platform-card"><span>PLATFORM STATE</span><b>{data.twins.length} connected twins</b><small>Updated every 2 seconds via Ditto</small></div></>}</aside>
    </section>
  </main>
}

function Kpi({ label, value, unit }: { label: string; value: string; unit: string }) { return <div><span>{label}</span><strong>{value}</strong><small>{unit}</small></div> }
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)

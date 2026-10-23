import React from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function GraphicsSettings() {
  const [high, setHigh] = React.useState(false)
  const { gl, scene, setDpr } = useThree()
  React.useEffect(() => {
    setDpr(high ? Math.min(window.devicePixelRatio, 2) : 1)
    gl.shadowMap.type = THREE.PCFSoftShadowMap
    scene.traverse(object => {
      if (!(object instanceof THREE.DirectionalLight)) return
      object.shadow.mapSize.setScalar(high ? 2048 : 1024)
      object.shadow.map?.dispose()
      object.shadow.map = null
      object.shadow.needsUpdate = true
    })
  }, [high, gl, scene, setDpr])
  return <Html fullscreen calculatePosition={(_, __, size) => [size.width / 2, size.height / 2]} style={{ pointerEvents: 'none' }}><label style={{
    position: 'absolute', left: 14, top: 14, pointerEvents: 'auto',
    padding: '8px 10px', background: '#14201de8', color: '#eee', borderRadius: 6,
  }}>Graphics <select aria-label="Graphics quality" value={high ? 'high' : 'balanced'}
    onChange={event => setHigh(event.target.value === 'high')}>
    <option value="balanced">Balanced</option><option value="high">High</option>
  </select></label></Html>
}

import * as THREE from 'three'

// Bundled CC0 Poly Haven Dirt scan. Geometry and collision heights stay unchanged.
export function createGroundMaterial() {
  const loader = new THREE.TextureLoader()
  const maps = ['Diffuse', 'rough', 'nor_gl'].map(name => {
    const texture = loader.load(`/textures/dirt/${name}.jpg`)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 4
    texture.repeat.set(1500 / 12, 1150 / 12)
    return texture
  })
  maps[0].colorSpace = THREE.SRGBColorSpace
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, map: maps[0], roughnessMap: maps[1],
    normalMap: maps[2], normalScale: new THREE.Vector2(.35, .35), roughness: 1,
  })
  // Local terrain is XY with Z elevation. Three planar projections avoid
  // stretching the photograph down steep faces. A second scale breaks tiling.
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 groundPosition; varying vec3 groundNormal;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ngroundPosition = position; groundNormal = normal;')
    shader.fragmentShader = `varying vec3 groundPosition; varying vec3 groundNormal;
      vec4 groundSample(sampler2D tex, vec3 p, vec3 w) {
        return texture2D(tex,p.yz)*w.x + texture2D(tex,p.xz)*w.y + texture2D(tex,p.xy)*w.z;
      }\n` + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec3 weights = pow(abs(normalize(groundNormal)), vec3(4.0));
      weights /= max(dot(weights,vec3(1.0)),0.0001);
      vec3 fineSoil = groundSample(map,groundPosition/12.0,weights).rgb;
      vec3 broadSoil = groundSample(map,groundPosition/47.0+vec3(0.37),weights).rgb;
      // Retain geological tint without multiplying two dark albedos together.
      vec3 soil = mix(fineSoil,broadSoil,0.25);
      // Lift dark scan values without clipping highlights or removing grain.
      vec3 drySoil = mix(soil, vec3(0.55,0.43,0.30), 0.42);
      diffuseColor.rgb = mix(diffuseColor.rgb,vec3(0.88),0.55) * drySoil * 1.8;
    `)
  }
  material.customProgramCacheKey = () => 'ademix-ground-triplanar-v2'
  return material
}

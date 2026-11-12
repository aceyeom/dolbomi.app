// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE WALL                                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// Celestual's own shot, the one its film opens on: one letter on a phone's
// glass, and the camera pulling straight back until a whole wall of them
// fills the frame, each screen lighting in its own colour, outward from the
// first. Here the visitor does the pulling, with the scroll.
//
// The letters are Celestual's (reel/assets/wall-letters.jpg, 126 of them on
// one sheet, 16 across and 8 down). Each screen is one instance of one
// quad, on a wall that curves round the camera; one draw call. A screen
// knows three things: which letter it is, how far it is from the first, and
// a seed. The scroll is a wave front going out from the first screen, and a
// screen is lit once the front has passed it. The room's lamp reaches the
// wall too: screens near it burn brighter, the rest sit back.

import {
  Scene, PerspectiveCamera, WebGLRenderer, InstancedMesh, PlaneGeometry, ShaderMaterial, TextureLoader,
  InstancedBufferAttribute, Object3D, SRGBColorSpace, LinearFilter, Vector2, MathUtils,
} from 'three'

const COLS = 33
const ROWS = 13
const TILES = 126
const SHEET = [16, 8]
const W = 1
const H = 1.16
const GAP = 0.13
const RADIUS = 26

const VERT = `
attribute vec2 aTile;
attribute float aDist;
attribute float aSeed;
uniform float uFront;
varying vec2 vUv;
varying float vOn;
varying float vDepth;
void main() {
  vUv = uv * vec2(1.0 / ${SHEET[0]}.0, 1.0 / ${SHEET[1]}.0) + aTile;
  // the wave front: a screen comes on as it passes, each in its own moment
  float t = uFront - aDist - aSeed * 1.4;
  vOn = smoothstep(0.0, 1.2, t) * step(0.07, aSeed);   // one in fourteen is dead
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`

const FRAG = `
precision highp float;
uniform sampler2D uSheet;
uniform vec2 uLamp;
uniform float uReach;
uniform float uLamplight;
varying vec2 vUv;
varying float vOn;
varying float vDepth;
void main() {
  vec3 c = texture2D(uSheet, vUv).rgb;
  float d = distance(gl_FragCoord.xy, uLamp) / uReach;
  float lamp = 1.0 / (1.0 + 7.0 * d * d);
  // lit by its own backlight, and more where the room's lamp is on it
  float b = vOn * mix(0.5, 1.45, mix(0.5, lamp, uLamplight));
  // the far end of the wall goes into the dark
  b *= 1.0 - 0.72 * smoothstep(20.0, 46.0, vDepth);
  c = c * b;
  // a screen that is off is still glass
  c += vec3(0.012, 0.012, 0.014) * (1.0 - vOn);
  gl_FragColor = vec4(c, 1.0);
}`

// a seeded shuffle, so the wall is the same wall on every visit
function mulberry(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createWall(canvas, { sheet }) {
  let renderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  renderer.setClearColor(0x050505, 1)
  renderer.outputColorSpace = SRGBColorSpace

  const scene = new Scene()
  const camera = new PerspectiveCamera(38, 1, 0.1, 120)

  const texture = new TextureLoader().load(sheet, () => ask())
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = false

  const uniforms = {
    uSheet: { value: texture },
    uFront: { value: 0 },
    uLamp: { value: new Vector2(-9999, -9999) },
    uReach: { value: 500 },
    uLamplight: { value: 1 },
  }
  const material = new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms })
  const geometry = new PlaneGeometry(W, H)
  const count = COLS * ROWS
  const mesh = new InstancedMesh(geometry, material, count)

  const rand = mulberry(20260925)
  const tiles = new Float32Array(count * 2)
  const dists = new Float32Array(count)
  const seeds = new Float32Array(count)
  const dummy = new Object3D()
  const cx = (COLS - 1) / 2
  const cy = (ROWS - 1) / 2
  let far = 0
  const used = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c
      // which letter: the first is lin's, at the middle; no letter beside itself
      let t = 0
      if (!(c === cx && r === cy)) {
        do { t = 1 + Math.floor(rand() * (TILES - 1)) } while (t === used[i - 1] || t === used[i - COLS])
      }
      used[i] = t
      tiles[i * 2] = (t % SHEET[0]) / SHEET[0]
      tiles[i * 2 + 1] = 1 - (Math.floor(t / SHEET[0]) + 1) / SHEET[1]
      const dx = c - cx
      const dy = (r - cy) * (H / W)
      dists[i] = Math.hypot(dx, dy)
      far = Math.max(far, dists[i])
      seeds[i] = c === cx && r === cy ? 1 : rand()
      // on a cylinder round the camera
      const theta = (dx * (W + GAP)) / RADIUS
      dummy.position.set(Math.sin(theta) * RADIUS, -(r - cy) * (H + GAP), RADIUS - Math.cos(theta) * RADIUS)
      dummy.rotation.set(0, -theta, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
  }
  // the first screen is on before the scroll starts: it stands well behind the front
  seeds[cy * COLS + cx] = 0.08
  dists[cy * COLS + cx] = -4
  geometry.setAttribute('aTile', new InstancedBufferAttribute(tiles, 2))
  geometry.setAttribute('aDist', new InstancedBufferAttribute(dists, 1))
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1))
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = false
  scene.add(mesh)

  let progress = 0
  let ratio = 1
  let px = 0
  let py = 0
  let raf = 0
  let box = { left: 0, top: 0, width: 1, height: 1 }

  function render() {
    raf = 0
    // the pull back: slow off the glass, then away
    const e = progress * progress * (3 - 2 * progress)
    const portrait = camera.aspect < 0.8
    const near = portrait ? 3.2 : 2.3
    const farZ = portrait ? 30 : 19
    camera.position.set(px * (0.25 + e * 1.6), py * (0.2 + e * 1.0), MathUtils.lerp(near, farZ, e))
    camera.lookAt(px * 0.2, py * 0.15, 0)
    // the front has passed every screen a little before the scroll ends
    uniforms.uFront.value = Math.pow(progress, 1.3) * (far + 4.5) * 1.12
    renderer.render(scene, camera)
  }
  function ask() { if (!raf) raf = requestAnimationFrame(render) }

  return {
    resize() {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      ratio = Math.min(window.devicePixelRatio || 1, 1.75)
      renderer.setPixelRatio(ratio)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      ask()
    },
    progress(p) {
      const v = Math.min(1, Math.max(0, p))
      if (Math.abs(v - progress) < 0.0005) return
      progress = v
      ask()
    },
    lamp(f) {
      box = canvas.getBoundingClientRect()
      const x = f.x - box.left
      const y = f.y - box.top
      uniforms.uLamp.value.set(x * ratio, (box.height - y) * ratio)
      uniforms.uReach.value = f.radius * ratio * 0.9
      uniforms.uLamplight.value = f.lights === 'up' ? 0 : f.light
      // the camera leans a little toward the lamp
      px = MathUtils.clamp((x / box.width) * 2 - 1, -1, 1)
      py = MathUtils.clamp(-((y / box.height) * 2 - 1), -1, 1)
      ask()
    },
    destroy() {
      cancelAnimationFrame(raf)
      geometry.dispose()
      material.dispose()
      texture.dispose()
      renderer.dispose()
    },
  }
}

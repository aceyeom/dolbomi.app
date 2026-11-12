import { useEffect, useRef } from 'react'
import { lamp } from './lamp.js'

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE LIGHT ITSELF                                                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// What the lamp leaves on the wall, drawn as print draws light: a field of
// dots on one grid, each as large as the light is strong where it stands.
// At the lamp the dots run together; a hand's width off they are specks;
// past the lamp's reach there are none, and the wall is black. The field
// breathes a little, so it is a light and not a stamp.
//
// One full-window fragment shader, nothing else on the GPU for it. It is
// redrawn on a slow clock while the lamp is lit, and at once when it moves.

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }'
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uLamp;
uniform float uReach;
uniform float uLight;
uniform vec3 uColour;
uniform float uCell;
uniform float uTime;

float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 q) {
  vec2 i = floor(q); vec2 f = fract(q); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 cell = floor(px / uCell);
  vec2 centre = (cell + 0.5) * uCell;
  float d = length(centre - uLamp) / uReach;
  float light = uLight / (1.0 + 11.0 * d * d);
  light *= 1.0 - smoothstep(0.45, 1.0, d);
  // the breathing: a slow weather over the field
  light *= 0.7 + 0.6 * noise(cell * 0.11 + vec2(uTime * 0.21, -uTime * 0.13));
  float r = sqrt(clamp(light, 0.0, 1.0)) * uCell * 0.74;
  float a = 1.0 - smoothstep(r - 0.8, r + 0.8, length(px - centre));
  a *= step(0.012, light);
  gl_FragColor = vec4(uColour * a, a);
}`

export function Glow() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true })
    if (!gl) return undefined
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o }
    const prog = gl.createProgram()
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return undefined
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const U = Object.fromEntries(['uRes', 'uLamp', 'uReach', 'uLight', 'uColour', 'uCell', 'uTime'].map((n) => [n, gl.getUniformLocation(prog, n)]))

    let ratio = 1
    let frame = { x: -9999, y: -9999, light: 0, radius: 500, colour: [255, 61, 31], pool: 1 }
    let raf = 0
    let last = 0
    const size = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * ratio)
      canvas.height = Math.round(window.innerHeight * ratio)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    const draw = (now) => {
      raf = 0
      last = now
      gl.uniform2f(U.uRes, canvas.width, canvas.height)
      gl.uniform2f(U.uLamp, frame.x * ratio, frame.y * ratio)
      gl.uniform1f(U.uReach, frame.radius * ratio * 0.86)
      gl.uniform1f(U.uLight, frame.lights === 'up' ? 0 : frame.light * (frame.pool ?? 1))
      gl.uniform3f(U.uColour, frame.colour[0] / 255, frame.colour[1] / 255, frame.colour[2] / 255)
      gl.uniform1f(U.uCell, (window.innerWidth < 700 ? 10 : 14) * ratio)
      gl.uniform1f(U.uTime, now / 1000)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const ask = () => { if (!raf) raf = requestAnimationFrame(draw) }
    // the breathing runs on its own slow clock, and not at all while nobody is looking
    const still = matchMedia('(prefers-reduced-motion: reduce)')
    const clock = setInterval(() => {
      if (document.hidden || still.matches || frame.light <= 0) return
      if (performance.now() - last > 40) ask()
    }, 50)
    size()
    const off = lamp.subscribe((f) => { frame = f; ask() })
    const onSize = () => { size(); ask() }
    window.addEventListener('resize', onSize, { passive: true })
    return () => {
      off()
      clearInterval(clock)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onSize)
    }
  }, [])
  return <canvas ref={ref} className="glow" aria-hidden="true" />
}

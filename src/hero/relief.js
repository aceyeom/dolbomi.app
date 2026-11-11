// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE NAME, IN RELIEF                                                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// The name is not printed on the wall, it stands off it: bone letters a few
// millimetres proud of dark plaster, and the lamp held close. So the side
// of a stroke that faces the lamp catches it, the far side falls off, and
// every letter throws a shadow away from the light that grows as the lamp
// drops lower or moves off. That is the whole of tenebrism, and it is the
// first thing in the room.
//
// How: the name is set once on a 2D canvas in the page's own face. Its
// coverage is blurred into a height field (a plateau with a soft shoulder),
// the field's slopes are taken at full float precision and packed into one
// texture: the slope in R and G, the height in B, the sharp coverage in A.
// A single fragment shader then lights every pixel from the lamp's place
// with one lambert term, a short march toward the lamp for the cast shadow,
// and a narrow highlight on the shoulders. It draws only when the lamp
// moved, the window changed or the light came up.
//
// Nothing here is decoration: with WebGL missing, `create` returns null and
// the heading underneath is simply shown as type.

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() {
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;   // rg: slope, b: height, a: coverage
uniform vec2 uRes;        // the canvas, in its own pixels
uniform vec3 uLamp;       // the lamp in those pixels (y down), and its height off the wall
uniform float uReach;     // how far it reaches
uniform float uLight;     // 0 to 1
uniform float uDepth;     // how proud the letters stand, in pixels
uniform float uFlat;      // 1: the house lights are up
uniform float uBump;      // how steep the shoulders read: less on a small name

const vec3 VOID = vec3(0.000367, 0.000262, 0.000175);   // the page's black (#070605), linear
const vec3 PLASTER = vec3(0.0092, 0.0080, 0.0068);
const vec3 BONE = vec3(0.93, 0.90, 0.84);
const vec3 LAMP = vec3(1.0, 0.86, 0.69);

float hash(vec2 q) {
  vec3 p3 = fract(vec3(q.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  // image space: x right, y down, in pixels
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 px = uv * uRes;
  vec4 m = texture2D(uMap, uv);
  float h = m.b;
  float cover = m.a;
  vec2 slope = (m.rg - 0.5) * 8.0;   // packed at a quarter, so a steep shoulder fits
  vec3 n = normalize(vec3(-slope * uBump, 1.0));

  vec3 pos = vec3(px, h * uDepth);
  vec3 toLamp = uLamp - pos;
  float dxy = length(toLamp.xy);
  float dist = length(toLamp);
  vec3 L = toLamp / dist;

  // a light held close: it falls off fast, and is gone by twice its reach
  float fall = 1.0 / (1.0 + 9.0 * (dxy * dxy) / (uReach * uReach));
  fall *= 1.0 - smoothstep(0.6 * uReach, 2.0 * uReach, dxy);

  float lambert = max(dot(n, L), 0.0);

  // the cast shadow: walk toward the lamp along the wall; anything standing
  // higher than the ray at that step is in the way
  float shadow = 1.0;
  if (fall > 0.004) {
    vec2 dir = toLamp.xy / max(dxy, 0.001);
    float rise = (uLamp.z - pos.z) / max(dxy, 1.0);     // the ray's climb per pixel
    float reach = min(uDepth / max(rise, 0.02), dxy);   // past this nothing is tall enough
    reach = min(reach, 0.16 * uRes.y);
    const int STEPS = 20;
    float stepLen = reach / float(STEPS);
    float jitter = hash(px);
    for (int i = 1; i <= STEPS; i++) {
      float t = stepLen * (float(i) - jitter);
      vec2 q = (px + dir * t) / uRes;
      float hq = texture2D(uMap, q).b * uDepth;
      float ray = pos.z + rise * t;
      // the further the thing in the way, the softer the edge it throws
      shadow = min(shadow, clamp(1.0 - (hq - ray) * (1.6 / (1.0 + 0.06 * t)), 0.0, 1.0));
    }
    shadow = mix(1.0, shadow, 0.94);
  }

  vec3 albedo = mix(PLASTER, BONE, cover);
  float direct = lambert * fall * shadow * uLight;

  // the shoulder of a stroke catching the lamp
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float edge = smoothstep(0.05, 0.9, length(slope));
  float spec = pow(max(dot(n, H), 0.0), 28.0) * edge * fall * shadow * uLight * 0.1;

  // what is left with the lamp elsewhere: the letters only just there
  float ambient = cover * 0.019;

  vec3 lit = albedo * (LAMP * direct * 2.1 + vec3(ambient)) + LAMP * spec;
  // a soft shoulder, so the brightest stroke is bone and never a white hole
  lit = VOID + (1.0 - exp(-lit * 1.25));

  // house lights: flat bone on the dark, no lamp in it at all
  vec3 flatCol = mix(VOID, BONE * 0.8, cover);
  vec3 col = mix(lit, flatCol, uFlat);

  // the wall gives out toward the foot of the hero, so it has no edge
  float foot = 1.0 - smoothstep(0.8, 1.0, uv.y);
  col = mix(VOID, col, foot);

  col = pow(col, vec3(1.0 / 2.2));
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.014;
  gl_FragColor = vec4(col, 1.0);
}`

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error(log || 'shader')
  }
  return sh
}

// three passes of a box, which is near enough a gaussian, over one channel
function blur(src, w, h, r) {
  const a = new Float32Array(src)
  const b = new Float32Array(src.length)
  const pass = (from, to, horizontal) => {
    const n = horizontal ? w : h
    const lines = horizontal ? h : w
    const stride = horizontal ? 1 : w
    const span = 2 * r + 1
    for (let l = 0; l < lines; l++) {
      const base = horizontal ? l * w : l
      let sum = 0
      for (let i = -r; i <= r; i++) sum += from[base + Math.min(n - 1, Math.max(0, i)) * stride]
      for (let i = 0; i < n; i++) {
        to[base + i * stride] = sum / span
        const out = Math.max(0, i - r)
        const inn = Math.min(n - 1, i + r + 1)
        sum += from[base + inn * stride] - from[base + out * stride]
      }
    }
  }
  for (let k = 0; k < 3; k++) {
    pass(a, b, true)
    pass(b, a, false)
  }
  return a
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ words: string[], family: string, weight: number }} opts
 * @returns {null | { resize(): void, set(frame): void, flat(on: boolean): void, destroy(): void, box: () => DOMRect }}
 */
export function createRelief(canvas, { words, family, weight = 500 }) {
  let gl
  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false })
  } catch { gl = null }
  if (!gl) return null

  let prog
  try {
    prog = gl.createProgram()
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link')
  } catch {
    return null
  }
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const U = Object.fromEntries(['uMap', 'uRes', 'uLamp', 'uReach', 'uLight', 'uDepth', 'uFlat', 'uBump'].map((n) => [n, gl.getUniformLocation(prog, n)]))
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.uniform1i(U.uMap, 0)

  const scratch = document.createElement('canvas')
  const ctx = scratch.getContext('2d', { willReadFrequently: true })

  let W = 0, H = 0, ratio = 1, depth = 8, flat = 0
  let frame = { x: -9999, y: -9999, light: 0, radius: 500 }
  let lost = false
  let pending = 0

  // where the name stands, and how large: one line on a wide window, the two
  // words stacked on a tall one, flush left on the page's own gutter
  function layout(w, h, gutter) {
    const wide = w / h > 1.25
    const lines = wide ? [words.join(' ')] : words
    const leading = 0.86
    ctx.font = `${weight} 100px ${family}`
    const widest = Math.max(...lines.map((t) => ctx.measureText(t).width)) / 100
    let size = (w - gutter * 2) / widest
    size = Math.min(size, wide ? h * 0.46 : (h * 0.5) / (lines.length * leading))
    const block = size * leading * lines.length
    const top = wide ? h * 0.5 - block * 0.56 : h * 0.47 - block * 0.5
    return { lines, size, leading, top, left: gutter - size * 0.035 }
  }

  function build() {
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight
    if (!cssW || !cssH) return
    // one and a half of the page's pixels is all the shoulders need; past a
    // thousand or so across, the light is soft enough to be drawn at less
    ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    if (cssW * ratio > 2200) ratio = 2200 / cssW
    W = Math.max(2, Math.round(cssW * ratio))
    H = Math.max(2, Math.round(cssH * ratio))
    canvas.width = W
    canvas.height = H
    scratch.width = W
    scratch.height = H

    // the page's own edge (tokens.css `--edge`), so the name hangs on the same margin as the words
    const gutter = Math.max(Math.min(76, Math.max(20, cssW * 0.052)), (cssW - 1480) / 2 + Math.min(76, Math.max(20, cssW * 0.052)))
    const L = layout(W, H, gutter * ratio)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#fff'
    ctx.font = `${weight} ${L.size}px ${family}`
    ctx.textBaseline = 'alphabetic'
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(-0.022 * L.size).toFixed(2)}px`
    L.lines.forEach((t, i) => {
      ctx.fillText(t, L.left, L.top + L.size * L.leading * (i + 0.86))
    })

    const img = ctx.getImageData(0, 0, W, H).data
    const n = W * H
    const cover = new Float32Array(n)
    for (let i = 0; i < n; i++) cover[i] = img[i * 4] / 255
    // the shoulder is a fraction of the letter's size, so the relief reads
    // the same on a phone and across a desk
    const r = Math.max(1, Math.round(L.size * 0.0045))
    depth = Math.max(4, L.size * 0.036)
    const soft = blur(cover, W, H, r)
    const out = new Uint8Array(n * 4)
    const hgt = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const c = soft[i]
      hgt[i] = c * c * (3 - 2 * c)
    }
    const k = depth * 0.5 // the slope in pixels of rise per pixel of run
    for (let y = 0; y < H; y++) {
      const y0 = Math.max(0, y - 1) * W
      const y1 = Math.min(H - 1, y + 1) * W
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        const sx = (hgt[y * W + Math.min(W - 1, x + 1)] - hgt[y * W + Math.max(0, x - 1)]) * k
        const sy = (hgt[y1 + x] - hgt[y0 + x]) * k
        const o = i * 4
        // a quarter of the slope, so one as steep as four in one still fits a byte
        out[o] = Math.max(0, Math.min(255, Math.round((sx * 0.125 + 0.5) * 255)))
        out[o + 1] = Math.max(0, Math.min(255, Math.round((sy * 0.125 + 0.5) * 255)))
        out[o + 2] = Math.round(hgt[i] * 255)
        out[o + 3] = Math.round(cover[i] * 255)
      }
    }
    gl.viewport(0, 0, W, H)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, out)
    gl.uniform2f(U.uRes, W, H)
    gl.uniform1f(U.uDepth, depth)
    gl.uniform1f(U.uBump, 0.58 * Math.min(1, Math.max(0.55, L.size / (300 * ratio))))
  }

  function draw() {
    pending = 0
    if (lost || !W) return
    const r = canvas.getBoundingClientRect()
    // off the top of the window there is nothing to light
    if (r.bottom < -40 || r.top > window.innerHeight + 40) return
    const reach = frame.radius * ratio
    gl.uniform3f(U.uLamp, (frame.x - r.left) * ratio, (frame.y - r.top) * ratio, reach * 0.17)
    gl.uniform1f(U.uReach, reach)
    gl.uniform1f(U.uLight, frame.light)
    gl.uniform1f(U.uFlat, flat)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  const ask = () => { if (!pending) pending = requestAnimationFrame(draw) }

  const onLost = (e) => { e.preventDefault(); lost = true }
  const onBack = () => { lost = false; build(); ask() }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onBack)

  return {
    resize() { build(); ask() },
    set(f) { frame = f; ask() },
    flat(on) { flat = on ? 1 : 0; ask() },
    destroy() {
      cancelAnimationFrame(pending)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onBack)
      const ext = gl.getExtension('WEBGL_lose_context')
      if (ext) ext.loseContext()
    },
  }
}

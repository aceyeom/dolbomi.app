// Celestual's own glyphs and its own colour arithmetic, brought over from
// its repository as they are (app/src/wall/looks.js `PIX`, `skinOf`), so the
// two screens in this room are the product's screens and not a likeness.
// One string per row, `X` lit, on the phone's pixel grid.

export const PIX = {
  // the aerial: a bar, the mast through a hollow triangle, a heavy stem
  ant: ['XXXXXXXXX', 'XX..X..XX', '.X..X..X.', '.XX.X.XX.', '..XXXXX..', '...XXX...', '...XXX...', '...XXX...', '...XXX...', '...XXX...'],
  // the pen, down to the right
  pen: ['XX...XX....', '.XX...XX...', '..XX...XX..', '...XX...XXX', '....XX...XX', '.....XX..XX', '......XX.XX', '.......XXXX', '.......XXXX', '....XXXXXXX'],
  heartO: ['.XX.XX.', 'X..X..X', 'X.....X', '.X...X.', '..X.X..', '...X...'],
  env: ['XXXXXXXXXXX', 'XX.......XX', 'X.X.....X.X', 'X..X...X..X', 'X...XXX...X', 'X.........X', 'XXXXXXXXXXX'],
  // the battery, its nub on the left, four cells, full
  bat: ['..XXXXXXXXXXXXXXX', '..X.............X', 'XXX.XX.XX.XX.XX.X', 'X.X.XX.XX.XX.XX.X', 'X.X.XX.XX.XX.XX.X', 'XXX.XX.XX.XX.XX.X', '..X.............X', '..XXXXXXXXXXXXXXX'],
}

export function glyph(name) {
  const rows = PIX[name]
  let d = ''
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') d += `M${x} ${y}h1v1h-1z` }))
  return { d, w: rows[0].length, h: rows.length }
}

// ── the colour a screen is lit in ──
// One hue, and the bands, the ink, the glow and the bloom are arithmetic on it.
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const hex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
export const mix = (a, b, t) => { const A = rgb(a); const B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)) }
const alpha = (h, a) => `rgba(${rgb(h).join(', ')}, ${a})`

export const HUES = { ice: '#8FB8DC', amber: '#E0A95A' }

export function skin(hue) {
  const ink = mix(hue, '#000000', 0.88)
  return {
    '--s-top': mix(hue, '#000000', 0.5),
    '--s-top-2': mix(hue, '#000000', 0.58),
    '--s-bot': mix(hue, '#000000', 0.9),
    '--s-hi': mix(hue, '#FFFFFF', 0.3),
    '--s-mid': hue,
    '--s-lo': mix(hue, '#000000', 0.3),
    '--s-ink': ink,
    '--s-lit': mix(hue, '#FFFFFF', 0.84),
    '--s-bloom': alpha(mix(hue, '#FFFFFF', 0.5), 0.55),
    '--s-soft': alpha(ink, 0.35),
    '--s-glow': hue,
  }
}

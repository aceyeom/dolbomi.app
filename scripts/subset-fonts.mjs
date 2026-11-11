// The receipt on plate II is set in NuvoVet's own face, Pretendard. The whole
// family is two megabytes; the receipt uses about a hundred and fifty glyphs
// of it. This cuts the face down to exactly those, so the plate costs one
// small file.
//
//   node scripts/subset-fonts.mjs
//
// Run it again whenever the Korean in src/plates/nuvovet changes. The file
// it writes, public/fonts/pretendard-receipt.woff2, is committed.
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import subsetFont from 'subset-font'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2')
const out = path.join(root, 'public/fonts/pretendard-receipt.woff2')
const dir = path.join(root, 'src/plates/nuvovet')

// every character the plate can show: all of its source, plus the printable
// ASCII and the few marks money and measures need
let text = ''
for (const f of await readdir(dir)) text += await readFile(path.join(dir, f), 'utf8')
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('')
const chars = [...new Set(ascii + text + '₩×·–—’‘“”…')].filter((c) => c >= ' ').join('')

const font = await readFile(src)
const cut = await subsetFont(font, chars, {
  targetFormat: 'woff2',
  variationAxes: { wght: { min: 300, max: 700 } },
})
await writeFile(out, cut)
console.log(`pretendard-receipt.woff2: ${chars.length} characters, ${(cut.length / 1024).toFixed(1)} kB`)

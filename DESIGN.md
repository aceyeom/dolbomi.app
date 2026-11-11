# The room

The design system. `src/styles/tokens.css` is the same thing as numbers.

## The idea

Tenebrism, drawn as print draws it. A black room and one light, which the
visitor holds. The light is red and it is made of dots: a halftone field on
the wall, large at the lamp and gone a hand's width off. Type has no weight
of its own: a letter is a hairline in the dark and swells to the heaviest,
widest cut of the face where the light falls on it. Everything else in the
room is a work's own material, brought in whole: Celestual's wall of
letters, its film and its screens; NuvoVet's rendered laptop and a receipt
from its own data.

## Five rules

1. **One lamp.** One light source with one place (`src/lamp/lamp.js`): under
   the pointer, under a finger, on whatever has the keyboard, at rest on the
   nearest `data-lamp-rest`. Everything that looks lit reads that one place.
2. **Light is weight.** Headlines are `LightType`: per letter, weight 130 to
   1000 and width 46 to 151, by distance from the lamp. Nothing else in the
   room is bold.
3. **Light is dots.** The lamp's pool on the wall is a halftone
   (`src/lamp/Glow.jsx`). A picture in the dark is its two-tone dither and
   becomes itself under the lamp (`src/index`).
4. **Few words.** A work gets a label row, its name and one line. A scene
   gets one short caption and at most two keys. Nothing explains itself.
5. **A work keeps its own.** Its face, its colour and its assets are used
   inside its own object and nowhere else. The lamp takes a work's colour
   while it is in that work's part of the room (`data-lamp-colour`).

## Colour

| Token | Value | For |
| --- | --- | --- |
| `--void` | `#050505` | the room |
| `--bone` | `#f3eee5` | anything lit |
| `--ash`, `--dim` | `#948e83`, `#5a564f` | labels; the faintest things |
| `--red` | `#ff3d1f` | the lamp, a key under the hand, a selection, focus |

Celestual brings ice `#8FB8DC` and amber `#E0A95A`. NuvoVet brings cobalt
`#1D3C6E` on paper and white.

## Type

| Face | Where |
| --- | --- |
| Roboto Flex (variable: weight, width, optical size) | headlines through `LightType`; lines and keys at ordinary weights |
| Doto (dot matrix) | labels, in capitals: the room's small voice |
| Jersey 10 | Celestual's screens and the words over its wall |
| Pretendard (a cut of it) | NuvoVet's receipt and laptop |

## The pieces

| Piece | File | What it does |
| --- | --- | --- |
| Lamp | `src/lamp/lamp.js` | place, brightness, reach, colour; a spring; one pass by itself on arrival |
| Glow | `src/lamp/Glow.jsx` | the halftone pool, one fragment shader |
| Lit | `src/lamp/Lit.jsx` | a region drawn lit, with a shade over it that has the lamp's hole in it |
| LightType | `src/type/LightType.jsx` | letters that swell in the light; a line that never wraps |
| Wall | `src/wall/` | Celestual's letters on a curved wall in three.js; the scroll pulls the camera back |
| Screen | `src/plates/celestual/` | one Celestual letter, in its own glyphs and colour arithmetic |
| Laptop | `src/plates/nuvovet/Laptop.jsx` | NuvoVet's render: the lid opens, markup is laid into the glass by a homography |
| Card | `src/index/` | a picture as its dither, developed by the lamp |

## Motion

- The lamp moves because somebody moved it. On arrival it makes one pass
  across the name by itself, and that is the only thing that plays unasked,
  with the laptop's lid and the film.
- The scroll is carried on a little inertia (Lenis) so the wall's pull back
  is one continuous move.
- Answers to a press are under 300 ms. A key scales to 0.97 while pressed.
- Reduced motion: no pass, no inertia, the lamp is put where it is wanted,
  notes appear whole, the lid is already open, the film waits on its poster.

## For everybody

- **Lights**, in the header, turns the room's lights up: no pool, no shades,
  every headline at one even weight. Remembered, and on by itself under
  `prefers-contrast: more`.
- Headlines carry their words in `aria-label`; the letters are decoration.
- Every scene works from the keyboard, the lamp follows focus, and what a
  scene is doing is announced through its caption.
- Without WebGL the pool and the wall are simply absent and everything else
  stands.

## Not in this room

Serifs. A second accent. Cards with borders, pills, drop shadows, frosted
glass. A paragraph where a picture would do. Anything stock.

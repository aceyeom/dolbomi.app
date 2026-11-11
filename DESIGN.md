# The room

The design system. Anything visual in this repository answers to this file.
`src/styles/tokens.css` is the same thing as numbers.

---

## 0. In one paragraph

Tenebrism, and nothing added to it. A black room, one light, and things
coming out of the dark only as far as the light reaches them. The room has
three materials: the dark, the bone white of whatever is lit, and the lamp.
It has one face. It has no colour of its own; colour is something a work
brings and keeps. The visitor holds the lamp, and every piece of lighting on
every surface is computed from where that one lamp is, so nothing is ever lit
from two directions. Minimalism here is not an absence of things, it is the
dark doing the work that boxes, rules and panels do elsewhere.

---

## 1. The five rules

If a decision is not covered below, decide it by asking which of these it serves.

**1. One lamp.** There is one light source, with one place, one brightness and
one reach (`src/lamp/lamp.js`). Everything that looks lit reads those three. A
second light, a glow that does not come from the lamp or from a work's own
screen, a hover highlight with its own idea of where light comes from: none of
these exist.

**2. One bright thing at a time.** When a work turns its own light on, the lamp
gives way to it (`lamp.duck`). A screen, a frame under its picture light, or
the lamp: never two competing.

**3. Colour belongs to the works.** The room is black, bone and lamp. The only
saturated colour that is the room's own is cinnabar, and it is rationed to two
jobs: the ring on whatever has the keyboard, and the mark on selected text.
Celestual's ice and amber stay on Celestual's screens. NuvoVet's cobalt stays
on NuvoVet's paper and in its reading.

**4. A work speaks in its own face.** The room is set in Newsreader and nothing
else. Inside a work's object the type is the product's: Jersey 10 on a
Celestual screen, Pretendard on a NuvoVet receipt and for NuvoVet's figures.
Its glyphs, colours and words are brought over from its own repository, not
drawn again from memory.

**5. Everything is drawn.** No icon set, no stock picture, no bitmap texture.
The grain is a filter, the lamp is arithmetic, the receipt's torn foot is a
mask, the switch for the lights is a border.

---

## 2. Colour

| Token | Value | For |
| --- | --- | --- |
| `--void` | `#070605` | the ground. A warm black, never `#000`: a room, not a screen that is off |
| `--void-1`, `--void-2` | `#0d0b09`, `#141210` | something laid on the ground |
| `--bone` | `#ede6d8` | anything read: type at full strength |
| `--ash` | `#a9a295` | a term, a caption, a label. Never a paragraph |
| `--dim` | `#6f695f` | the colophon and the hint. Never anything that has to be read to use the page |
| `--hair`, `--hair-soft` | bone at 11% and 6% | every rule |
| `--lamp` | `#ffd6a3` | the lamp's own colour: the haze, a caret, the lit switch |
| `--cinnabar` | `#c9482b` | focus and selection. Nothing else |

Text is drawn in `--bone` and dimmed by the shade over it (section 4), so its
colour away from the lamp is arithmetic, not a second token.

---

## 3. Type

One family, Newsreader, with its optical size left on, so the same face is a
sharp display cut at a hundred pixels and a text cut at eighteen.

| Token | Use |
| --- | --- |
| the name | drawn by `relief.js`, weight 440, sized to the window |
| `--t-title` | a plate's name. Weight 400, tracked in, hung on the margin |
| `--t-lede` | the one line under a name; section heads; the hero's line |
| `--t-body` | paragraphs, keys |
| `--t-small` | captions, terms, the header |
| `--t-caption` | the colophon |

Italic is the room's second voice: a plate's number, a caption, a term in a
ledger, a field's name. There is no uppercase, no letter-spaced label and no
monospace. Plates are numbered in roman numerals, as plates are. Figures are
old-style in running text and lining, tabular (`.num`) in a column.

---

## 4. Light

The whole system is two ideas.

**A region is drawn lit, and shaded.** `Lit` (`src/lamp/Lit.jsx`) wraps a
region and lays a shade over it: the room's own black, with a hole in it where
the lamp is. The hole is the falloff of a light held close to a wall. How dark
the shade gets is the region's depth:

| `depth` | Away from the lamp it keeps | For |
| --- | --- | --- |
| `text` | a little over half | words. Dimmed, always readable |
| `object` | a tenth | a thing: a receipt, dark glass |
| `deep` | almost nothing | a picture that should not exist until it is lit |

**The name is modelled.** The hero is not shaded, it is lit: the name is a
height field, and a fragment shader works out, for every pixel, how much lamp
reaches it and whether a letter stands between it and the lamp
(`src/hero/relief.js`). So strokes have a lit side and a far side, and the
shadows lengthen as the lamp moves off.

Around those: the **haze**, the faint warm pool the lamp leaves in the air,
and the **grain**, which makes the dark a room and hides the bands a slow
gradient shows on a cheap panel.

**Where the lamp is.** Under the pointer; under a finger while it is down, and
for a moment after; on the focused element once Tab has been used; otherwise
at rest on the nearest thing marked `data-lamp-rest`, which is what composes
the room for somebody who has not touched it and on a phone. It is carried
there on a critically damped spring: no overshoot, and it can be turned round
halfway.

**Objects that make light.** A lit Celestual screen has its shade lifted and
throws a halo of its own colour. That is the only other light in the room, and
the lamp dims while it is on.

---

## 5. A plate

Every work is hung in the same sentence (`src/plates/Plate.jsx`), so two very
different products read as one hand's:

```
Plate I                               ┌────────────────────────┐
Celestual                             │                        │
A note that is only read              │      the object        │
if one comes back.                    │                        │
                                      └────────────────────────┘
Two paragraphs.                       what is happening, in a line
                                      ─────────             ──────────
Role      Founder                     a key                 another key
Since     2026
...
```

- Words on the left five columns, the object on the right six, the same way
  round on every plate. On a narrow window the object goes between the name
  and the paragraphs.
- Under every object: one caption that says what is happening, and at most
  two soft keys, a word at each end of a hairline.
- The object must work three ways: handled directly, driven by the keys, and
  looked at by somebody who does neither.
- What a work claims is literally true and comes from its own repository.

The two objects are a deliberate pair. Celestual's makes its own light, and
the light is the point: nothing shows until it is mutual. NuvoVet's is paper
and makes none: it shows only what the lamp is held to.

---

## 6. Motion

- The lamp is the only thing that moves on its own account, and only because
  somebody moved it.
- Light comes up slowly and gives way quickly: 500 to 900 ms on
  `--ease-light` for something lighting, under 300 ms for anything answering
  a press.
- A key scales to 0.97 while it is pressed. Nothing bounces, nothing fades up
  on scroll, nothing counts up, nothing loops but a caret while a note is
  being written.
- Reduced motion: the lamp is put where it is wanted instead of carried,
  notes appear whole instead of being typed, and waits are a third as long.

---

## 7. For everybody

- **House lights** lift every shade and the haze and draw the name flat. On by
  itself under `prefers-contrast: more`, and remembered.
- Under the lamp, a paragraph away from the light still clears 4.5:1 on the
  ground; terms and captions do not, by design, and the lights are the answer.
- Every object is operable from the keyboard, the lamp follows focus, and what
  a stage is doing is announced through its caption.
- The heading in the hero is real text; the canvas over it is decoration to a
  reader that is not looking.
- With no WebGL the name is type. With no JavaScript there is a paragraph.

---

## 8. Not in this room

Gradient text. A second accent. Pills, cards, panels, drop shadows on things
in the flow, frosted glass. An eyebrow over a headline. Three things in a row
with an icon each. `01 / 02`. A stat strip. An arrow glued to a link.
Uppercase, tracked labels. A sentence about the page itself. Anything that
moves because the page loaded.

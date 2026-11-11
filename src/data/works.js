// Everything in the room, in the order it hangs. This file is the source of
// truth: `npm run gen:seed` writes it into supabase/seed.sql, and the site
// draws from it at once and then from the database, so a row added there
// shows up here without a deploy and the two can never start out different.
//
//   slug      its name in an address, and its key in the database
//   title     what it is called
//   kind      what sort of thing it is, in one word
//   year      when
//   note      one line, set under its plate
//   href      where a visitor is taken: a plate in this room (#slug) or its own site
//   plate     its picture, 4 by 5, in public/plates
export const works = [
  {
    slug: 'celestual',
    title: 'Celestual',
    kind: 'Venture',
    year: '2026',
    note: 'A note that is only read if one comes back.',
    href: '#celestual',
    plate: '/plates/celestual.webp',
  },
  {
    slug: 'nuvovet',
    title: 'NuvoVet',
    kind: 'Venture',
    year: '2026',
    note: 'A vet’s receipt, read into a decision with its evidence.',
    href: '#nuvovet',
    plate: '/plates/nuvovet.webp',
  },
  {
    slug: 'celestual-reel',
    title: 'Celestual, the reel',
    kind: 'Film',
    year: '2026',
    note: 'Thirty-five seconds, told entirely on a phone’s screen.',
    href: null,
    plate: '/plates/reel.webp',
  },
  {
    slug: 'dolbomi',
    title: 'Dolbomi',
    kind: 'App',
    year: '2026',
    note: 'Self-development for soldiers in service, played as a game with a guardian that grows.',
    href: null,
    plate: '/plates/dolbomi.webp',
  },
]

const ROMAN = [['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100], ['XC', 90], ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]]
/** A plate's number, the way plates are numbered. */
export function roman(n) {
  let out = ''
  let v = n
  for (const [s, k] of ROMAN) while (v >= k) { out += s; v -= k }
  return out
}

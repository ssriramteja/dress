/**
 * Deterministic demo closet.
 *
 * Every garment here is bundled sample data drawn as vector art. None of it is
 * ever presented as detected from the user's own photos.
 */
import type { Category, ColorFamily, Garment, Kind, OutfitPhoto, Pattern, WearEvent } from '../storage/types';
import { addDays, localDate, rng } from '../storage/util';

interface Swatch { name: string; hex: string; family: ColorFamily }

export const SWATCHES: Record<string, Swatch> = {
  white: { name: 'white', hex: '#F7F6F2', family: 'light' },
  ecru: { name: 'ecru', hex: '#E9E1CF', family: 'light' },
  cream: { name: 'cream', hex: '#EFE7D6', family: 'light' },
  black: { name: 'black', hex: '#1A1A1A', family: 'neutral' },
  charcoal: { name: 'charcoal', hex: '#3B3C3E', family: 'neutral' },
  grey: { name: 'grey', hex: '#9A9B9C', family: 'neutral' },
  'grey marl': { name: 'grey marl', hex: '#B4B3AF', family: 'neutral' },
  navy: { name: 'navy', hex: '#1F2A44', family: 'blue' },
  indigo: { name: 'indigo', hex: '#2D3E63', family: 'blue' },
  'light wash': { name: 'light wash', hex: '#8FA6C3', family: 'blue' },
  'light blue': { name: 'light blue', hex: '#BCCFE3', family: 'blue' },
  denim: { name: 'denim', hex: '#4D6688', family: 'blue' },
  olive: { name: 'olive', hex: '#5B5E3A', family: 'green' },
  forest: { name: 'forest', hex: '#2F4A3A', family: 'green' },
  camel: { name: 'camel', hex: '#B88A58', family: 'earth' },
  tan: { name: 'tan', hex: '#A97D50', family: 'earth' },
  brown: { name: 'brown', hex: '#5A3E2B', family: 'earth' },
  sand: { name: 'sand', hex: '#CDBB98', family: 'earth' },
  khaki: { name: 'khaki', hex: '#B5A57E', family: 'earth' },
  stone: { name: 'stone', hex: '#C9C2B3', family: 'earth' },
  burgundy: { name: 'burgundy', hex: '#5E1F2A', family: 'red' },
  red: { name: 'red', hex: '#B3302A', family: 'red' },
  rust: { name: 'rust', hex: '#9A4A2A', family: 'red' },
};

const KIND_META: Record<Kind, { category: Category; formality: number; warmth: number; noun: string; blurb: string }> = {
  tee: { category: 'tops', formality: 0, warmth: 0, noun: 'tee', blurb: 'heavyweight cotton with a clean crew neck' },
  shirt: { category: 'tops', formality: 2, warmth: 1, noun: 'shirt', blurb: 'a button-down with a soft collar' },
  knit: { category: 'tops', formality: 2, warmth: 2, noun: 'knit', blurb: 'a fine-gauge crew neck in merino' },
  hoodie: { category: 'tops', formality: 0, warmth: 2, noun: 'hoodie', blurb: 'brushed fleece, relaxed through the body' },
  polo: { category: 'tops', formality: 1, warmth: 0, noun: 'polo', blurb: 'a knitted polo with a short placket' },
  jeans: { category: 'bottoms', formality: 1, warmth: 1, noun: 'jeans', blurb: 'straight-leg denim with a mid rise' },
  trousers: { category: 'bottoms', formality: 3, warmth: 1, noun: 'trousers', blurb: 'tailored with a pressed crease' },
  chinos: { category: 'bottoms', formality: 2, warmth: 1, noun: 'chinos', blurb: 'cotton twill, slightly tapered' },
  shorts: { category: 'bottoms', formality: 0, warmth: 0, noun: 'shorts', blurb: 'a mid-thigh cut with a flat front' },
  jacket: { category: 'outerwear', formality: 1, warmth: 2, noun: 'jacket', blurb: 'a boxy chore jacket with patch pockets' },
  blazer: { category: 'outerwear', formality: 3, warmth: 1, noun: 'blazer', blurb: 'unstructured, single-breasted, two buttons' },
  coat: { category: 'outerwear', formality: 3, warmth: 3, noun: 'coat', blurb: 'a long wool overcoat with notch lapels' },
  overshirt: { category: 'outerwear', formality: 1, warmth: 1, noun: 'overshirt', blurb: 'a shirt-jacket with two chest pockets' },
  bomber: { category: 'outerwear', formality: 1, warmth: 2, noun: 'bomber', blurb: 'a zip bomber with ribbed trims' },
  puffer: { category: 'outerwear', formality: 0, warmth: 3, noun: 'puffer', blurb: 'a quilted down jacket' },
  sneaker: { category: 'shoes', formality: 1, warmth: 1, noun: 'sneakers', blurb: 'low-top court sneakers' },
  boot: { category: 'shoes', formality: 2, warmth: 2, noun: 'boots', blurb: 'chelsea boots on a stacked sole' },
  loafer: { category: 'shoes', formality: 3, warmth: 1, noun: 'loafers', blurb: 'penny loafers in polished leather' },
  cap: { category: 'caps', formality: 0, warmth: 0, noun: 'cap', blurb: 'a six-panel cotton cap' },
  beanie: { category: 'caps', formality: 0, warmth: 3, noun: 'beanie', blurb: 'a ribbed wool beanie' },
  tote: { category: 'bags', formality: 1, warmth: 1, noun: 'tote', blurb: 'a heavy canvas tote' },
  crossbody: { category: 'bags', formality: 2, warmth: 1, noun: 'crossbody bag', blurb: 'a small leather crossbody' },
  backpack: { category: 'bags', formality: 0, warmth: 1, noun: 'backpack', blurb: 'a roll-top daypack' },
};

/** [kind, swatch, pattern?, accent swatch?, name override?] */
type Entry = [Kind, string, Pattern?, string?, string?];

const ENTRIES: Entry[] = [
  ['tee', 'white'], ['tee', 'black'], ['tee', 'ecru'], ['tee', 'grey marl'], ['tee', 'navy'],
  ['tee', 'olive'], ['tee', 'sand'], ['tee', 'navy', 'stripe', 'white', 'navy stripe tee'], ['tee', 'rust'],
  ['shirt', 'white', 'solid', undefined, 'white oxford shirt'], ['shirt', 'light blue', 'solid', undefined, 'light blue oxford shirt'],
  ['shirt', 'denim', 'solid', undefined, 'denim shirt'], ['shirt', 'black'],
  ['shirt', 'brown', 'check', 'cream', 'brown check shirt'], ['shirt', 'light blue', 'stripe', 'white', 'blue stripe shirt'],
  ['knit', 'charcoal'], ['knit', 'cream'], ['knit', 'navy'], ['knit', 'camel'], ['knit', 'forest'], ['knit', 'burgundy'],
  ['hoodie', 'grey marl', 'solid', undefined, 'grey hoodie'], ['hoodie', 'black'], ['hoodie', 'olive'],
  ['polo', 'navy'], ['polo', 'cream'], ['polo', 'black'],
  ['jeans', 'indigo'], ['jeans', 'black'], ['jeans', 'light wash'], ['jeans', 'ecru'],
  ['trousers', 'charcoal'], ['trousers', 'black'], ['trousers', 'navy'],
  ['trousers', 'camel', 'solid', undefined, 'camel pleated trousers'], ['trousers', 'grey'],
  ['chinos', 'khaki'], ['chinos', 'olive'], ['chinos', 'navy'], ['chinos', 'stone'],
  ['shorts', 'navy'], ['shorts', 'khaki'], ['shorts', 'black'],
  ['jacket', 'black'], ['jacket', 'denim', 'solid', undefined, 'denim jacket'], ['jacket', 'brown', 'solid', undefined, 'brown suede jacket'],
  ['jacket', 'olive', 'solid', undefined, 'olive field jacket'],
  ['blazer', 'navy'], ['blazer', 'charcoal'], ['blazer', 'black'],
  ['coat', 'camel'], ['coat', 'charcoal'], ['coat', 'black'], ['coat', 'navy'],
  ['overshirt', 'olive'], ['overshirt', 'charcoal', 'check', 'grey', 'grey check overshirt'], ['overshirt', 'ecru'],
  ['bomber', 'black'], ['bomber', 'olive'], ['bomber', 'navy'],
  ['puffer', 'black'], ['puffer', 'cream'],
  ['sneaker', 'white'], ['sneaker', 'black'], ['sneaker', 'grey'], ['sneaker', 'cream', 'solid', undefined, 'cream suede sneakers'],
  ['boot', 'black'], ['boot', 'brown'], ['boot', 'tan', 'solid', undefined, 'tan suede boots'],
  ['loafer', 'black'], ['loafer', 'brown'],
  ['cap', 'black'], ['cap', 'navy'], ['cap', 'cream'], ['cap', 'olive'], ['cap', 'red'],
  ['beanie', 'charcoal'], ['beanie', 'cream'], ['beanie', 'forest'],
  ['tote', 'ecru', 'solid', undefined, 'canvas tote'], ['tote', 'black'],
  ['crossbody', 'black'], ['crossbody', 'brown'],
  ['backpack', 'black'], ['backpack', 'grey'],
];

const SOLE: Partial<Record<Kind, string>> = { sneaker: '#F2F0EA', boot: '#2A2420', loafer: '#2A2420' };

function buildGarments(now: number): Garment[] {
  return ENTRIES.map(([kind, swatchKey, pattern = 'solid', accentKey, nameOverride], i) => {
    const sw = SWATCHES[swatchKey];
    const meta = KIND_META[kind];
    const name = nameOverride ?? `${sw.name} ${meta.noun}`;
    const accentHex = accentKey ? SWATCHES[accentKey].hex : SOLE[kind];
    return {
      id: `demo_${String(i).padStart(3, '0')}`,
      name,
      kind,
      category: meta.category,
      colorName: sw.name,
      hex: sw.hex,
      accentHex,
      family: sw.family,
      pattern,
      formality: meta.formality,
      warmth: meta.warmth,
      description: `${meta.blurb}, in ${sw.name}.`,
      sourceOutfitIds: [],
      addedAt: now - i * 1000,
      image: { type: 'art' },
      demo: true,
    };
  });
}

/** Builds demo outfit boards that together cover every garment at least once. */
function buildOutfits(garments: Garment[], count = 32): OutfitPhoto[] {
  const rand = rng(1907);
  const uses = new Map<string, number>();
  const by = (c: Category) => garments.filter((g) => g.category === c);
  const pick = (pool: Garment[], filter?: (g: Garment) => boolean) => {
    const options = (filter ? pool.filter(filter) : pool).slice();
    const list = options.length ? options : pool.slice();
    list.sort((a, b) => (uses.get(a.id) ?? 0) - (uses.get(b.id) ?? 0) || rand() - 0.5);
    const g = list[0];
    uses.set(g.id, (uses.get(g.id) ?? 0) + 1);
    return g;
  };
  const outfits: OutfitPhoto[] = [];
  for (let i = 0; i < count; i++) {
    const top = pick(by('tops'));
    const bottom = pick(by('bottoms'), (b) => Math.abs(b.formality - top.formality) <= 2);
    const shoes = pick(by('shoes'), (s) => Math.abs(s.formality - bottom.formality) <= 2);
    const ids = [top.id, bottom.id, shoes.id];
    if (i < 25) ids.unshift(pick(by('outerwear')).id);
    if (i % 3 === 0) ids.push(pick(by('caps')).id);
    if (i % 3 === 1) ids.push(pick(by('bags')).id);
    outfits.push({ id: `board_${String(i).padStart(2, '0')}`, garmentIds: ids, demo: true });
  }
  return outfits;
}

/** Deterministic wear history: same counts every time, dated relative to today. */
function buildWears(garments: Garment[], today = new Date()): WearEvent[] {
  const rand = rng(4242);
  const events: WearEvent[] = [];
  garments.forEach((g, i) => {
    const r = rand();
    // ~16% never worn; a long tail of favourites.
    const count = r < 0.16 ? 0 : r < 0.45 ? 1 + Math.floor(rand() * 3) : r < 0.85 ? 3 + Math.floor(rand() * 7) : 10 + Math.floor(rand() * 16);
    // Some pieces have not been out for months.
    const stale = rand() < 0.25;
    const used = new Set<string>();
    for (let k = 0; k < count; k++) {
      const back = stale ? 75 + Math.floor(rand() * 200) : 1 + Math.floor(rand() * 150);
      const date = localDate(addDays(today, -back));
      if (used.has(date)) continue;
      used.add(date);
      events.push({ id: `w_${i}_${k}`, garmentId: g.id, date, at: new Date(`${date}T09:00:00`).getTime() });
    }
  });
  return events;
}

export interface DemoCloset {
  garments: Garment[];
  outfits: OutfitPhoto[];
  wears: WearEvent[];
}

export function buildDemoCloset(now = Date.now()): DemoCloset {
  const garments = buildGarments(now);
  const outfits = buildOutfits(garments);
  return { garments, outfits, wears: buildWears(garments, new Date(now)) };
}

/** A fixed set of sample garments for the splash columns. */
export function splashGarments(): Garment[] {
  return buildGarments(0);
}

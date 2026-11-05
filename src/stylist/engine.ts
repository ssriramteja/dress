/**
 * crest stylist: an on-device, rule-based stylist grounded in the user's closet.
 *
 * It parses intent (look / anchor / unworn / similar / pack / follow-up),
 * asks for clarification when a request is ambiguous, and composes looks only
 * from garments the user owns. No LLM is involved; see README for how to swap
 * in a model-backed stylist behind the same `respond` contract.
 */
import type { ChatPart, Garment, Look, Occasion, StylistContext, Weather } from '../storage/types';
import type { WearInfo } from '../storage/store';
import { daysBetween, localDate, numberName, parseNumberWord, rng, uid } from '../storage/util';

export interface StylistInput {
  text: string;
  /** set when the request comes from a garment's "style this" */
  anchorId?: string;
  garments: Garment[];
  wearInfo: Map<string, WearInfo>;
  dislikedKeys: string[];
  ctx: StylistContext;
  now?: Date;
}

export interface StylistReply {
  parts: ChatPart[];
  ctx: StylistContext;
  /** true when the reply contains composed looks (UI shows composing states) */
  composing: boolean;
}

const OCCASIONS: [RegExp, Occasion][] = [
  [/\b(interview|wedding|formal|gala|ceremony|funeral|black tie)\b/, 'formal'],
  [/\b(dinner|date|restaurant|drinks)\b/, 'dinner'],
  [/\b(work|office|meeting|presentation|client|workday)\b/, 'work'],
  [/\b(tonight|party|night out|club|gig|concert|bar)\b/, 'night'],
  [/\b(flight|airport|travel day|train|road trip)\b/, 'travel'],
  [/\b(gym|run|running|hike|hiking|workout|training)\b/, 'active'],
  [/\b(weekend|casual|errands|brunch|coffee|park|saturday|sunday|chill|day off)\b/, 'weekend'],
];

const FORMALITY: Record<Occasion, number> = { formal: 3, dinner: 2, work: 2, night: 2, travel: 1, weekend: 1, active: 0 };

const LOOK_NAMES: Record<Occasion, [string, string]> = {
  dinner: ['dinner', 'dinner, a bit sharper'],
  work: ['work, sorted', 'work, relaxed'],
  formal: ['dressed up', 'dressed up, quieter'],
  night: ['tonight', 'tonight, darker'],
  travel: ['travel day', 'travel, a little neater'],
  active: ['moving', 'moving, layered'],
  weekend: ['weekend', 'weekend, easy'],
};

const KIND_WORDS: Record<string, Garment['kind'][]> = {
  tee: ['tee'], 't-shirt': ['tee'], tshirt: ['tee'], 'tee shirt': ['tee'],
  shirt: ['shirt', 'overshirt'], oxford: ['shirt'], button: ['shirt'],
  knit: ['knit'], sweater: ['knit'], jumper: ['knit'], crewneck: ['knit'],
  hoodie: ['hoodie'], polo: ['polo'],
  jeans: ['jeans'], denim: ['jeans', 'jacket', 'shirt'],
  trousers: ['trousers'], pants: ['trousers', 'chinos', 'jeans'], slacks: ['trousers'],
  chinos: ['chinos'], shorts: ['shorts'],
  jacket: ['jacket', 'bomber', 'blazer', 'puffer'], blazer: ['blazer'], coat: ['coat'], overcoat: ['coat'],
  overshirt: ['overshirt'], bomber: ['bomber'], puffer: ['puffer'],
  sneakers: ['sneaker'], sneaker: ['sneaker'], trainers: ['sneaker'],
  boots: ['boot'], boot: ['boot'], loafers: ['loafer'], loafer: ['loafer'], shoes: ['sneaker', 'boot', 'loafer'],
  cap: ['cap'], hat: ['cap', 'beanie'], beanie: ['beanie'],
  tote: ['tote'], bag: ['tote', 'crossbody', 'backpack'], crossbody: ['crossbody'], backpack: ['backpack'],
};

const COLOR_WORDS = [
  'grey marl', 'light blue', 'light wash', 'white', 'black', 'ecru', 'cream', 'charcoal', 'grey', 'gray', 'navy', 'indigo',
  'denim', 'olive', 'forest', 'green', 'camel', 'tan', 'brown', 'sand', 'khaki', 'stone', 'burgundy', 'red', 'rust', 'blue', 'beige',
];

const COLOR_ALIASES: Record<string, string[]> = {
  gray: ['grey', 'grey marl', 'charcoal'],
  grey: ['grey', 'grey marl', 'charcoal'],
  green: ['olive', 'forest'],
  blue: ['navy', 'indigo', 'light blue', 'light wash', 'denim'],
  beige: ['sand', 'khaki', 'stone', 'camel', 'ecru'],
  red: ['red', 'burgundy', 'rust'],
};

const isNeutral = (g: Garment) => g.family === 'neutral' || g.family === 'light' || g.colorName === 'navy' || g.colorName === 'indigo' || g.colorName === 'denim' || g.colorName === 'light wash' || g.colorName === 'sand' || g.colorName === 'stone' || g.colorName === 'khaki' || g.colorName === 'camel' || g.colorName === 'tan' || g.colorName === 'brown';

const name = (g: Garment) => g.name;
const join = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function defaultWeather(now: Date): Weather {
  const m = now.getMonth();
  if (m === 11 || m <= 1) return 'cold';
  if (m >= 5 && m <= 7) return 'hot';
  if (m === 2 || m === 10) return 'cool';
  return 'mild';
}

function parseWeather(t: string): Weather | undefined {
  if (/\b(freezing|snow|snowy|winter|cold|icy)\b/.test(t)) return 'cold';
  if (/\b(rain|rainy|wet|drizzle|storm)\b/.test(t)) return 'rain';
  if (/\b(hot|heat|summer|beach|humid|sunny|tropical)\b/.test(t)) return 'hot';
  if (/\b(chilly|cool|autumn|fall|breezy|crisp)\b/.test(t)) return 'cool';
  if (/\b(warm|mild|spring)\b/.test(t)) return 'mild';
  return undefined;
}

function parseOccasion(t: string): Occasion | undefined {
  for (const [re, o] of OCCASIONS) if (re.test(t)) return o;
  return undefined;
}

function parseMood(t: string): StylistContext['mood'] | undefined {
  if (/\b(minimal|quiet|clean|simple|understated|neutral)\b/.test(t)) return 'minimal';
  if (/\b(bold|colour|color|colourful|colorful|loud|bright|fun)\b/.test(t)) return 'bold';
  if (/\b(dark|darker|moody|all black|black on black)\b/.test(t)) return 'dark';
  if (/\b(relaxed|comfy|comfortable|cosy|cozy|lazy|easy)\b/.test(t)) return 'relaxed';
  return undefined;
}

interface Mention {
  colors: string[];
  kinds: Garment['kind'][];
  exactKind?: Garment['kind'];
}

function parseMention(t: string): Mention | null {
  const colors: string[] = [];
  let rest = ` ${t} `;
  for (const c of COLOR_WORDS) {
    const re = new RegExp(`\\b${c}\\b`);
    if (re.test(rest)) {
      colors.push(c);
      rest = rest.replace(re, ' ');
    }
  }
  let kinds: Garment['kind'][] = [];
  let exactKind: Garment['kind'] | undefined;
  const words = Object.keys(KIND_WORDS).sort((a, b) => b.length - a.length);
  for (const w of words) {
    if (new RegExp(`\\b${w}\\b`).test(rest)) {
      kinds = KIND_WORDS[w];
      exactKind = KIND_WORDS[w][0];
      break;
    }
  }
  // "denim" alone as a colour word for jeans etc.
  if (!kinds.length && !colors.length) return null;
  if (!kinds.length) return null;
  return { colors, kinds, exactKind };
}

function colorMatches(g: Garment, c: string) {
  const aliases = COLOR_ALIASES[c] ?? [c];
  return aliases.some((a) => g.colorName === a || g.name.includes(a));
}

/** Resolve "my black jacket" to garments. */
function resolveMention(t: string, garments: Garment[]): Garment[] {
  // exact name match first
  const byName = garments.filter((g) => t.includes(g.name));
  if (byName.length) return [byName.sort((a, b) => b.name.length - a.name.length)[0]];
  const m = parseMention(t);
  if (!m) return [];
  let pool = garments.filter((g) => m.kinds.includes(g.kind));
  if (m.colors.length) pool = pool.filter((g) => m.colors.every((c) => colorMatches(g, c)));
  if (pool.length > 1 && m.exactKind) {
    const exact = pool.filter((g) => g.kind === m.exactKind);
    if (exact.length === 1 && m.colors.length) return exact;
  }
  return pool;
}

type Slot = 'outer' | 'top' | 'bottom' | 'shoes' | 'cap' | 'bag';

const slotOf = (g: Garment): Slot =>
  g.category === 'outerwear' ? 'outer' : g.category === 'tops' ? 'top' : g.category === 'bottoms' ? 'bottom' : g.category === 'shoes' ? 'shoes' : g.category === 'caps' ? 'cap' : 'bag';

export const lookKey = (ids: string[]) => ids.slice().sort().join('+');

interface BuildOpts {
  formality: number;
  weather: Weather;
  mood?: StylistContext['mood'];
  anchorIds: string[];
  excludeIds: string[];
  noOuter?: boolean;
  withCap?: boolean;
  occasion?: Occasion;
  seed: number;
  preferIds?: string[];
}

function buildOne(garments: Garment[], wear: Map<string, WearInfo>, disliked: Set<string>, o: BuildOpts, avoid: Set<string>): Garment[] | null {
  const rand = rng(o.seed);
  const today = localDate();
  const anchors = o.anchorIds.map((id) => garments.find((g) => g.id === id)).filter(Boolean) as Garment[];
  const chosen = new Map<Slot, Garment>();
  anchors.forEach((a) => chosen.set(slotOf(a), a));

  const needOuter = !o.noOuter && (o.weather === 'cold' || o.weather === 'cool' || o.weather === 'rain' || o.formality >= 3) && o.occasion !== 'active';
  const slots: Slot[] = ['top', 'bottom', 'shoes'];
  if (needOuter || chosen.has('outer')) slots.unshift('outer');
  if (o.withCap || (o.formality <= 1 && rand() < 0.35 && o.weather !== 'hot')) slots.push('cap');
  if (o.occasion === 'travel' || (o.formality <= 2 && rand() < 0.3)) slots.push('bag');

  const maxWear = Math.max(1, ...[...wear.values()].map((w) => w.count));

  const score = (g: Garment) => {
    let s = -Math.abs(g.formality - o.formality) * 2;
    const w = g.warmth;
    if (o.weather === 'hot') s -= w * 1.2;
    if (o.weather === 'cold') s += (w - 1.5) * 0.9;
    if (o.weather === 'rain' && (g.kind === 'loafer' || g.colorName === 'cream' || g.colorName === 'white') && g.category === 'shoes') s -= 1.5;
    if (o.mood === 'minimal') s += isNeutral(g) ? 1 : -2;
    if (o.mood === 'bold') s += isNeutral(g) ? 0 : 1.6;
    if (o.mood === 'dark') s += g.family === 'neutral' || g.colorName === 'navy' ? 1.5 : -1;
    if (o.mood === 'relaxed') s += g.formality <= 1 ? 1 : -0.5;
    const info = wear.get(g.id);
    s += (1 - (info?.count ?? 0) / maxWear) * 0.6;
    if (info?.last === today) s -= 3;
    if (o.preferIds?.includes(g.id)) s += 1.5;
    if (avoid.has(g.id)) s -= 4;
    return s + rand() * 1.6;
  };

  const harmony = (g: Garment) => {
    const picked = [...chosen.values()].filter((p) => p.category !== 'shoes' && p.category !== 'bags' && p.category !== 'caps');
    if (g.category === 'shoes' || g.category === 'bags' || g.category === 'caps') return true;
    const accents = picked.filter((p) => !isNeutral(p)).length;
    if (!isNeutral(g) && accents >= 1 && o.mood !== 'bold') return false;
    // avoid same colour top and bottom unless dark mood
    if (picked.some((p) => p.colorName === g.colorName && p.category !== 'outerwear') && o.mood !== 'dark') return false;
    if (g.pattern !== 'solid' && picked.some((p) => p.pattern !== 'solid')) return false;
    return true;
  };

  const allowed = (g: Garment, slot: Slot) => {
    if (o.excludeIds.includes(g.id)) return false;
    if (slot === 'bottom' && g.kind === 'shorts' && o.weather !== 'hot' && o.occasion !== 'active') return false;
    if (slot === 'top' && g.kind === 'hoodie' && o.formality >= 2) return false;
    if (slot === 'outer' && g.kind === 'puffer' && o.formality >= 2) return false;
    if (slot === 'outer' && g.kind === 'blazer' && o.formality <= 0) return false;
    if (slot === 'outer' && chosen.get('top')?.kind === 'hoodie' && g.kind === 'blazer') return false;
    return true;
  };

  for (const slot of slots) {
    if (chosen.has(slot)) continue;
    const pool = garments.filter((g) => slotOf(g) === slot && allowed(g, slot));
    const ranked = pool.map((g) => ({ g, s: score(g) })).sort((a, b) => b.s - a.s);
    const pick = ranked.find((r) => harmony(r.g))?.g ?? ranked[0]?.g;
    if (!pick) {
      if (slot === 'top' || slot === 'bottom' || slot === 'shoes') {
        if (slot === 'shoes' || slot === 'bottom') continue; // tolerate a thin closet
        return null;
      }
      continue;
    }
    chosen.set(slot, pick);
  }
  const order: Slot[] = ['outer', 'top', 'bottom', 'shoes', 'cap', 'bag'];
  const result = order.map((s) => chosen.get(s)).filter(Boolean) as Garment[];
  if (result.length < 2) return null;
  if (disliked.has(lookKey(result.map((g) => g.id)))) return null;
  return result;
}

function reasonFor(items: Garment[], o: BuildOpts, wear: Map<string, WearInfo>, now: Date): string {
  const top = items.find((g) => g.category === 'tops');
  const bottom = items.find((g) => g.category === 'bottoms');
  const outer = items.find((g) => g.category === 'outerwear');
  const shoes = items.find((g) => g.category === 'shoes');
  const bits: string[] = [];
  if (top && bottom) bits.push(`${top.name} with ${bottom.name}`);
  if (outer) bits.push(o.weather === 'cold' ? `${outer.name} for the cold` : `${outer.name} on top`);
  if (shoes) bits.push(shoes.name);
  let line = `${bits.join(', ')}.`;
  const today = localDate(now);
  const stale = items.find((g) => {
    const last = wear.get(g.id)?.last;
    return !last || daysBetween(last, today) > 45;
  });
  if (stale) {
    const last = wear.get(stale.id)?.last;
    line += last ? ` the ${stale.name} hasn’t been out in a while.` : ` first outing for the ${stale.name}.`;
  } else if (o.mood === 'minimal') line += ' kept it quiet.';
  return line;
}

function composeLooks(input: StylistInput, o: BuildOpts, names: [string, string]): Look[] {
  const disliked = new Set(input.dislikedKeys);
  const looks: Look[] = [];
  const avoid = new Set<string>();
  for (let attempt = 0; attempt < 12 && looks.length < 2; attempt++) {
    const items = buildOne(input.garments, input.wearInfo, disliked, { ...o, seed: o.seed * 31 + attempt * 7 + 1 }, avoid);
    if (!items) continue;
    const key = lookKey(items.map((g) => g.id));
    if (looks.some((l) => lookKey(l.garmentIds) === key)) continue;
    items.forEach((g) => !o.anchorIds.includes(g.id) && avoid.add(g.id));
    looks.push({
      id: uid('look'),
      name: names[looks.length],
      garmentIds: items.map((g) => g.id),
      reason: reasonFor(items, o, input.wearInfo, input.now ?? new Date()),
    });
  }
  return looks;
}

/** Re-roll a single look (shuffle / dislike) with the same brief. */
export function rerollLook(input: StylistInput, previous: Look, attempt: number): Look | null {
  const c = input.ctx;
  const o = optsFromCtx(c, input.now ?? new Date(), c.seed + attempt * 101 + 13);
  const disliked = new Set([...input.dislikedKeys, lookKey(previous.garmentIds)]);
  const avoid = new Set(previous.garmentIds.filter((id) => !o.anchorIds.includes(id)));
  for (let i = 0; i < 10; i++) {
    const items = buildOne(input.garments, input.wearInfo, disliked, { ...o, seed: o.seed + i * 17 }, avoid);
    if (items) {
      return { id: uid('look'), name: previous.name, garmentIds: items.map((g) => g.id), reason: reasonFor(items, o, input.wearInfo, input.now ?? new Date()) };
    }
  }
  return null;
}

function optsFromCtx(c: StylistContext, now: Date, seed: number): BuildOpts {
  return {
    formality: c.formality ?? (c.occasion ? FORMALITY[c.occasion] : 1),
    weather: c.weather ?? defaultWeather(now),
    mood: c.mood,
    anchorIds: c.anchorIds,
    excludeIds: c.excludeIds,
    noOuter: c.noOuter,
    withCap: c.withCap,
    occasion: c.occasion,
    seed,
    preferIds: c.candidateIds,
  };
}

function lookReply(input: StylistInput, ctx: StylistContext, intro?: string): StylistReply {
  const now = input.now ?? new Date();
  const o = optsFromCtx(ctx, now, ctx.seed);
  const anchor = ctx.anchorIds.map((id) => input.garments.find((g) => g.id === id)).filter(Boolean) as Garment[];
  let names: [string, string] = ctx.occasion ? LOOK_NAMES[ctx.occasion] : ['today', 'another option'];
  if (anchor.length && !ctx.occasion) names = [`with the ${anchor[0].name}`, `${anchor[0].name}, another way`];
  const looks = composeLooks(input, o, names);
  if (!looks.length) {
    return {
      parts: [{ type: 'text', text: 'i couldn’t build a full look from what’s in your closet for that. add a few more pieces, or try a different brief.' }],
      ctx: { ...ctx, lastIntent: 'look' },
      composing: false,
    };
  }
  const parts: ChatPart[] = [];
  if (intro) parts.push({ type: 'text', text: intro });
  parts.push({ type: 'looks', looks });
  if (looks.length < 2) parts.push({ type: 'text', text: 'only one combination works with that brief.' });
  parts.push({ type: 'chips', chips: followUpChips(ctx) });
  return { parts, ctx: { ...ctx, lastIntent: 'look', pending: undefined }, composing: true };
}

function followUpChips(ctx: StylistContext) {
  const chips: string[] = [];
  chips.push((ctx.formality ?? 1) >= 2 ? 'more casual' : 'a bit dressier');
  chips.push(ctx.weather === 'cold' ? 'lighter' : 'warmer');
  chips.push(ctx.noOuter ? 'add a layer' : 'without the jacket');
  return chips;
}

function weatherIntro(ctx: StylistContext, explicit: boolean, now: Date) {
  if (explicit) return undefined;
  const month = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  if (ctx.weather === 'cold' || ctx.weather === 'cool') return `no live weather here, so i’ve assumed ${month} and added a layer.`;
  return undefined;
}

// --- packing ---------------------------------------------------------------

function packReply(input: StylistInput, ctx: StylistContext): StylistReply {
  const days = Math.max(1, Math.min(14, ctx.packDays ?? 3));
  const now = input.now ?? new Date();
  const weather = ctx.weather ?? defaultWeather(now);
  const formality = ctx.formality ?? (ctx.occasion ? FORMALITY[ctx.occasion] : 1);
  const rand = rng(ctx.seed * 13 + days);
  const versatile = (g: Garment) =>
    (isNeutral(g) ? 2 : 0) - Math.abs(g.formality - formality) - (weather === 'hot' ? g.warmth : 0) + (weather === 'cold' ? g.warmth * 0.6 : 0) + rand() * 0.8;
  const take = (cat: Garment['category'], n: number, filter: (g: Garment) => boolean = () => true) =>
    input.garments
      .filter((g) => g.category === cat && filter(g))
      .sort((a, b) => versatile(b) - versatile(a))
      .slice(0, n);
  const tops = take('tops', Math.max(2, days <= 3 ? days : Math.ceil(days * 0.8)), (g) => !(weather === 'hot' && g.kind === 'knit'));
  const bottoms = take('bottoms', Math.max(1, Math.min(3, Math.ceil(days / 2.5))), (g) => (weather === 'hot' ? true : g.kind !== 'shorts'));
  const shoes = take('shoes', days >= 3 ? 2 : 1);
  const outer = weather === 'hot' ? [] : take('outerwear', 1, (g) => (formality >= 2 ? g.kind !== 'puffer' : true));
  const bag = take('bags', 1);
  const pieces = [...outer, ...tops, ...bottoms, ...shoes, ...bag];
  if (tops.length === 0 || bottoms.length === 0) {
    return { parts: [{ type: 'text', text: 'there aren’t enough tops and bottoms in your closet to pack from yet.' }], ctx, composing: false };
  }
  const lines = Array.from({ length: days }, (_, i) => {
    const items = [tops[i % tops.length], bottoms[i % bottoms.length], shoes[i % Math.max(1, shoes.length)]].filter(Boolean) as Garment[];
    return `day ${i + 1} · ${items.map(name).join(', ')}`;
  });
  const wLabel = ctx.weather ? `${ctx.weather} weather` : 'no forecast, so mid-weight layers';
  return {
    parts: [
      { type: 'text', text: `${numberName(days)} days, ${pieces.length} pieces. ${wLabel}. everything here works together.` },
      { type: 'tiles', garmentIds: pieces.map((g) => g.id) },
      { type: 'list', lines },
      { type: 'chips', chips: [weather === 'cold' ? 'it’ll be warm' : 'it’ll be cold', formality >= 2 ? 'more casual' : 'a few dinners too', 'pack lighter'] },
    ],
    ctx: { ...ctx, lastIntent: 'pack', pending: undefined, packDays: days },
    composing: true,
  };
}

// --- main --------------------------------------------------------------------

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'good morning.';
  if (h >= 12 && h < 17) return 'good afternoon.';
  return 'good evening.';
}

export const OPENING_CHIPS = ['what should i wear for dinner?', 'build a look around my black jacket', 'what haven’t i worn lately?', 'pack for five days'];

export function respond(input: StylistInput): StylistReply {
  const t = input.text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
  const now = input.now ?? new Date();
  let ctx: StylistContext = { ...input.ctx, seed: input.ctx.seed + 1 };
  const g = input.garments;

  if (!g.length) {
    return { parts: [{ type: 'text', text: 'your closet is empty, so there’s nothing to style yet. add some pieces from the closet tab first.' }], ctx, composing: false };
  }

  // 0. direct "style this" from a garment
  if (input.anchorId) {
    const a = g.find((x) => x.id === input.anchorId);
    ctx = { ...ctx, anchorIds: a ? [a.id] : [], excludeIds: [], noOuter: false, withCap: false, occasion: undefined, formality: a ? Math.max(1, a.formality) : 1, weather: undefined, mood: undefined, pending: undefined, candidateIds: [] };
    return lookReply(input, ctx, weatherIntro(ctx, false, now));
  }

  // 1. pending clarification
  if (ctx.pending) {
    const p = ctx.pending;
    if (p.type === 'anchor' && p.optionIds) {
      const chosen = p.optionIds.map((id) => g.find((x) => x.id === id)!).find((x) => x && t.includes(x.name));
      if (chosen) {
        ctx = { ...ctx, pending: undefined };
        if (/\bsimilar|like\b/.test(p.text)) return similarReply(input, ctx, chosen);
        ctx = { ...ctx, anchorIds: [chosen.id], excludeIds: [] };
        ctx.occasion = parseOccasion(p.text) ?? ctx.occasion;
        if (ctx.occasion) ctx.formality = FORMALITY[ctx.occasion];
        return lookReply(input, ctx);
      }
    }
    if (p.type === 'occasion') {
      const occ = parseOccasion(t) ?? (/\b(something else|other)\b/.test(t) ? undefined : undefined);
      if (/\b(something else|other)\b/.test(t)) {
        return { parts: [{ type: 'text', text: 'tell me where you’re going and how dressed up it is.' }], ctx: { ...ctx, pending: undefined }, composing: false };
      }
      if (occ) {
        ctx = { ...ctx, occasion: occ, formality: FORMALITY[occ], pending: undefined, anchorIds: ctx.anchorIds, excludeIds: [] };
        ctx.weather = parseWeather(t) ?? ctx.weather;
        return lookReply(input, ctx, weatherIntro(ctx, !!parseWeather(t), now));
      }
    }
    if (p.type === 'days') {
      const n = t.split(' ').map(parseNumberWord).find((x) => x !== undefined);
      if (n) return packReply(input, { ...ctx, packDays: n, pending: undefined });
    }
    if (p.type === 'similar') {
      const found = resolveMention(t, g);
      if (found.length === 1) return similarReply(input, { ...ctx, pending: undefined }, found[0]);
    }
    // otherwise fall through and treat as a fresh request
    ctx = { ...ctx, pending: undefined };
  }

  // 2. small talk
  if (/^(hi|hey|hello|yo|hiya|morning|evening)\b[ !.]*$/.test(t)) {
    return { parts: [{ type: 'text', text: 'hi. tell me where you’re headed, or name a piece you want to wear.' }], ctx, composing: false };
  }
  if (/^(thanks|thank you|cheers|ty|great|perfect|nice|love it|ok|okay|cool)\b/.test(t) && t.length < 24) {
    return { parts: [{ type: 'text', text: 'anytime.' }], ctx, composing: false };
  }
  if (/\b(help|what can you do)\b/.test(t)) {
    return {
      parts: [
        { type: 'text', text: 'i style from what you own. i can build two looks for an occasion, work around a piece, find what you haven’t worn, spot similar pieces, or pack for a trip.' },
        { type: 'chips', chips: OPENING_CHIPS },
      ],
      ctx,
      composing: false,
    };
  }

  // 3. packing
  if (/\b(pack|packing|trip|suitcase|holiday|vacation|going away)\b/.test(t)) {
    const m = t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|a)\s*(day|days|night|nights|week|weeks)\b/);
    let days: number | undefined;
    if (m) {
      const n = parseNumberWord(m[1]) ?? 1;
      days = /week/.test(m[2]) ? n * 7 : n;
    } else if (/\bweekend\b/.test(t)) days = 2;
    else if (/\b(a|one) week\b/.test(t)) days = 7;
    ctx = { ...ctx, weather: parseWeather(t) ?? undefined, occasion: parseOccasion(t.replace(/weekend/, '')) ?? undefined, formality: undefined, anchorIds: [], excludeIds: [], candidateIds: [] };
    if (ctx.occasion) ctx.formality = FORMALITY[ctx.occasion];
    if (!days) {
      return { parts: [{ type: 'text', text: 'how many days?' }, { type: 'chips', chips: ['three days', 'five days', 'a week'] }], ctx: { ...ctx, pending: { type: 'days', text: t } }, composing: false };
    }
    return packReply(input, { ...ctx, packDays: days });
  }

  // 4. unworn
  if (/\b(haven'?t (i )?worn|not worn|never worn|haven'?t worn|forgotten|forgot|underused|neglected|lately|rotation|gathering dust|don'?t wear)\b/.test(t)) {
    const today = localDate(now);
    const stale = g
      .map((x) => ({ x, last: input.wearInfo.get(x.id)?.last }))
      .filter(({ last }) => !last || daysBetween(last, today) > 45)
      .sort((a, b) => (a.last ?? '') < (b.last ?? '') ? -1 : 1)
      .slice(0, 8)
      .map(({ x }) => x);
    if (!stale.length) {
      return { parts: [{ type: 'text', text: 'everything’s been worn in the last six weeks. nicely done.' }], ctx, composing: false };
    }
    const never = stale.filter((x) => !input.wearInfo.get(x.id)?.last).length;
    return {
      parts: [
        { type: 'text', text: never ? `${stale.length} pieces haven’t been out in six weeks or more. ${never} never have.` : `${stale.length} pieces haven’t been out in six weeks or more.` },
        { type: 'tiles', garmentIds: stale.map((x) => x.id) },
        { type: 'chips', chips: [`style the ${stale[0].name}`, 'use a few of them'] },
      ],
      ctx: { ...ctx, lastIntent: 'unworn', candidateIds: stale.map((x) => x.id), anchorIds: [] },
      composing: false,
    };
  }
  if (ctx.lastIntent === 'unworn' && /\b(use (a few|some) of them|style (them|those|one))\b/.test(t)) {
    const first = ctx.candidateIds.find((id) => g.find((x) => x.id === id && (x.category === 'tops' || x.category === 'outerwear' || x.category === 'bottoms')));
    ctx = { ...ctx, anchorIds: first ? [first] : [], occasion: undefined, formality: 1, excludeIds: [] };
    return lookReply(input, ctx);
  }

  // 5. similar
  if (/\b(similar|something like|anything like|duplicate|look alike|own (another|something)|do i (own|have))\b/.test(t)) {
    const found = resolveMention(t, g);
    if (found.length === 1) return similarReply(input, ctx, found[0]);
    if (found.length > 1) return clarifyAnchor(found, t, ctx, 'similar to which one?');
    const ref = ctx.anchorIds[0] && g.find((x) => x.id === ctx.anchorIds[0]);
    if (ref && /\b(it|this|that|similar)\b/.test(t)) return similarReply(input, ctx, ref);
    return { parts: [{ type: 'text', text: 'similar to which piece? name it, like “my navy knit”.' }], ctx: { ...ctx, pending: { type: 'similar', text: t } }, composing: false };
  }

  // 6. follow-ups on the last look / pack
  const fresh = /\b(what should i wear|what to wear|what do i wear|outfit for|look for|build a look|style me|around my)\b/.test(t);
  const followUp = fresh ? null : applyFollowUp(t, ctx, g);
  if (followUp && (ctx.lastIntent === 'look' || ctx.lastIntent === 'pack')) {
    ctx = followUp;
    return ctx.lastIntent === 'pack' ? packReply(input, ctx) : lookReply(input, ctx);
  }

  // 7. anchor + look request
  const mentioned = resolveMention(t, g);
  const occasion = parseOccasion(t);
  const weather = parseWeather(t);
  const mood = parseMood(t);
  const wantsLook = /\b(wear|outfit|look|dress|style|put together|build|pair|go with|goes with|match|around)\b/.test(t) || !!occasion;

  if (mentioned.length > 1 && (wantsLook || /\bmy\b/.test(t))) {
    return clarifyAnchor(mentioned, t, ctx, 'which one?');
  }
  if (mentioned.length === 1 && (wantsLook || /\b(my|with|the)\b/.test(t))) {
    ctx = { ...ctx, anchorIds: [mentioned[0].id], excludeIds: [], noOuter: false, withCap: false, occasion, formality: occasion ? FORMALITY[occasion] : Math.max(1, mentioned[0].formality), weather, mood, candidateIds: [] };
    return lookReply(input, ctx, weatherIntro(ctx, !!weather, now));
  }
  if (wantsLook || mood || weather) {
    if (!occasion && !mood && !weather) {
      return {
        parts: [{ type: 'text', text: 'where are you headed?' }, { type: 'chips', chips: ['work', 'dinner', 'weekend', 'something else'] }],
        ctx: { ...ctx, pending: { type: 'occasion', text: t }, anchorIds: [], candidateIds: [] },
        composing: false,
      };
    }
    ctx = { ...ctx, anchorIds: [], excludeIds: [], noOuter: false, withCap: false, occasion, formality: occasion ? FORMALITY[occasion] : mood === 'relaxed' ? 0 : 1, weather, mood, candidateIds: [] };
    return lookReply(input, ctx, weatherIntro(ctx, !!weather, now));
  }
  if (mentioned.length === 1) {
    const m = mentioned[0];
    const info = input.wearInfo.get(m.id);
    return {
      parts: [
        { type: 'text', text: `your ${m.name}: worn ${info?.count ?? 0} times${info?.last ? `, last on ${info.last}` : ''}.` },
        { type: 'tiles', garmentIds: [m.id] },
        { type: 'chips', chips: [`style the ${m.name}`, `anything similar to my ${m.name}?`] },
      ],
      ctx: { ...ctx, anchorIds: [m.id] },
      composing: false,
    };
  }

  return {
    parts: [
      { type: 'text', text: 'i’m not sure what you need. i can put a look together, work around a piece, find what you haven’t worn or pack for a trip.' },
      { type: 'chips', chips: OPENING_CHIPS.slice(0, 3) },
    ],
    ctx,
    composing: false,
  };
}

function clarifyAnchor(options: Garment[], text: string, ctx: StylistContext, q: string): StylistReply {
  const opts = options.slice(0, 5);
  return {
    parts: [
      { type: 'text', text: `you have ${options.length} that fit. ${q}` },
      { type: 'tiles', garmentIds: opts.map((o) => o.id) },
      { type: 'chips', chips: opts.map((o) => o.name) },
    ],
    ctx: { ...ctx, pending: { type: 'anchor', text, optionIds: opts.map((o) => o.id) } },
    composing: false,
  };
}

function similarReply(input: StylistInput, ctx: StylistContext, ref: Garment): StylistReply {
  const sims = input.garments
    .filter((x) => x.id !== ref.id)
    .map((x) => {
      let s = 0;
      if (x.kind === ref.kind) s += 3;
      else if (x.category === ref.category) s += 1.2;
      if (x.colorName === ref.colorName) s += 2.5;
      else if (x.family === ref.family) s += 1;
      if (x.pattern === ref.pattern) s += 0.3;
      return { x, s };
    })
    .filter((r) => r.s >= 3.2)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map((r) => r.x);
  const next = { ...ctx, anchorIds: [ref.id], lastIntent: 'similar' as const, pending: undefined };
  if (!sims.length) {
    return { parts: [{ type: 'text', text: `nothing close to your ${ref.name}. it’s the only one of its kind here.` }, { type: 'chips', chips: [`style the ${ref.name}`] }], ctx: next, composing: false };
  }
  const exact = sims.filter((x) => x.kind === ref.kind && x.colorName === ref.colorName).length;
  return {
    parts: [
      { type: 'text', text: exact ? `yes. ${exact} almost the same as your ${ref.name}, and a few close cousins.` : `${sims.length} close to your ${ref.name}:` },
      { type: 'tiles', garmentIds: [ref.id, ...sims.map((x) => x.id)] },
      { type: 'chips', chips: [`style the ${ref.name}`] },
    ],
    ctx: next,
    composing: false,
  };
}

function applyFollowUp(t: string, ctx: StylistContext, g: Garment[]): StylistContext | null {
  let c = { ...ctx };
  let changed = false;
  const f = c.formality ?? 1;
  if (/\b(more casual|less formal|relaxed|dress(ed)? down|casual)\b/.test(t)) { c.formality = Math.max(0, f - 1); changed = true; }
  if (/\b(dressier|sharper|smarter|more formal|dress(ed)? up|a bit dressier|few dinners)\b/.test(t)) { c.formality = Math.min(3, f + 1); changed = true; }
  if (/\b(warmer|it'?ll be cold|colder|freezing)\b/.test(t)) { c.weather = 'cold'; changed = true; }
  if (/\b(lighter|cooler|it'?ll be warm|it'?ll be hot|hotter)\b/.test(t)) { c.weather = ctx.weather === 'cold' ? 'mild' : 'hot'; changed = true; }
  if (/\b(pack lighter|fewer)\b/.test(t) && c.packDays) { c.packDays = Math.max(1, c.packDays - 1); changed = true; }
  if (/\b(without the (jacket|coat|layer)|no (jacket|coat|layer))\b/.test(t)) { c.noOuter = true; changed = true; }
  if (/\b(add a layer|with a jacket|with a coat)\b/.test(t)) { c.noOuter = false; c.weather = c.weather === 'hot' ? 'cool' : c.weather ?? 'cool'; changed = true; }
  if (/\b(with a cap|add a cap|with a hat)\b/.test(t)) { c.withCap = true; changed = true; }
  if (/\b(another|different|something else|other options?|again|more options|try again|new ones?)\b/.test(t)) { c.seed += 97; changed = true; }
  const mood = parseMood(t);
  if (mood) { c.mood = mood; changed = true; }
  const occ = changed ? undefined : parseOccasion(t);
  if (occ && occ !== c.occasion) { c.occasion = occ; c.formality = FORMALITY[occ]; changed = true; }
  const swap = t.match(/\b(swap|change|different|other) (the )?(shoes|top|trousers|jeans|bottoms|jacket|coat)\b/);
  if (swap && ctx.lastIntent === 'look') {
    c.seed += 53;
    changed = true;
  }
  if (/\b(with|add|use) (my |the )?/.test(t)) {
    const m = resolveMention(t, g);
    if (m.length === 1) { c.anchorIds = [...new Set([...c.anchorIds.filter((id) => g.find((x) => x.id === id)?.category !== m[0].category), m[0].id])]; changed = true; }
  }
  return changed ? c : null;
}

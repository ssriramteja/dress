/* Lightweight engine checks. Run with: npm run test:engine */
import { buildDemoCloset } from '../catalog/demoCatalog';
import { emptyStylist } from '../storage/defaults';
import type { StylistContext } from '../storage/types';
import { respond } from './engine';

const closet = buildDemoCloset(new Date('2026-11-04T15:00:00').getTime());
const wearInfo = new Map<string, { count: number; last?: string }>();
for (const w of closet.wears) {
  const c = wearInfo.get(w.garmentId) ?? { count: 0 };
  c.count++;
  if (!c.last || w.date > c.last) c.last = w.date;
  wearInfo.set(w.garmentId, c);
}
let ctx: StylistContext = emptyStylist();
let failures = 0;

function ask(text: string, check: (types: string[], parts: any[]) => boolean, label: string, anchorId?: string) {
  const r = respond({ text, anchorId, garments: closet.garments, wearInfo, dislikedKeys: [], ctx, now: new Date('2026-11-04T15:00:00') });
  ctx = r.ctx;
  const types = r.parts.map((p) => p.type);
  const ok = check(types, r.parts);
  if (!ok) failures++;
  const looks = r.parts.find((p) => p.type === 'looks') as any;
  const text0 = (r.parts.find((p) => p.type === 'text') as any)?.text ?? '';
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  → [${types.join(',')}] ${text0.slice(0, 80)}`);
  if (looks) for (const l of looks.looks) console.log(`        ${l.name}: ${l.garmentIds.map((id: string) => closet.garments.find((g) => g.id === id)!.name).join(' / ')}`);
  return r;
}

const twoLooks = (t: string[], p: any[]) => (p.find((x) => x.type === 'looks')?.looks.length ?? 0) === 2;

ask('what should i wear for dinner?', twoLooks, 'dinner gives two looks');
ask('more casual', twoLooks, 'follow-up keeps the brief');
ask('build a look around my black jacket', (t, p) => twoLooks(t, p) && p.find((x) => x.type === 'looks').looks.every((l: any) => l.garmentIds.includes(closet.garments.find((g) => g.name === 'black jacket')!.id)), 'anchor in both looks');
ask('what should i wear?', (t) => t.includes('chips') && !t.includes('looks'), 'ambiguous request asks first');
ask('work', twoLooks, 'clarification resolves');
ask('style my navy jacket', (t) => t.includes('looks') || t.includes('chips'), 'navy jacket resolves or clarifies');
ask('build a look around my shirt', (t) => t.includes('chips') && !t.includes('looks'), 'ambiguous anchor clarifies');
ask('white oxford shirt', twoLooks, 'anchor clarification resolves');
ask("what haven't i worn lately?", (t) => t.includes('tiles'), 'unworn pieces');
ask('do i own something similar?', (t) => t.includes('text'), 'similar without referent');
ask('my navy knit', (t) => t.includes('tiles'), 'similar resolves');
ask('pack for five days', (t) => t.includes('tiles') && t.includes('list'), 'packing');
ask('it’ll be cold', (t) => t.includes('list'), 'packing follow-up');
ask('pack for a trip', (t) => t.includes('chips'), 'packing asks days');
ask('three days', (t) => t.includes('list'), 'days resolves');
ask('thanks', (t) => t.length === 1, 'small talk is short');
ask('style this', twoLooks, 'style this from detail', closet.garments[20].id);

console.log(failures ? `\n${failures} failing` : '\nall passing');
if (failures) process.exit(1);

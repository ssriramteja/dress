/**
 * Garment extraction.
 *
 * Two clearly separate paths:
 *  - demoExtract: runs over the bundled sample outfit boards. Detections come
 *    from the boards' known contents. This is DEMO ONLY.
 *  - extractFromPhotos: the real camera-roll path. No detection model or
 *    service is connected in this build, so it returns `unavailable` instead of
 *    guessing. Plug a real segmenter in here (see README).
 */
import { buildDemoCloset } from '../catalog/demoCatalog';
import type { Garment, OutfitPhoto, WearEvent } from '../storage/types';
import { hashString, rng } from '../storage/util';

export interface Detection {
  id: string;
  outfitId: string;
  /** stable visual signature used for deduplication */
  signature: string;
  garment: Garment;
  confidence: number;
}

export interface DedupedDetection {
  signature: string;
  garment: Garment;
  outfitIds: string[];
  confidence: number;
}

export function signatureOf(g: Pick<Garment, 'kind' | 'hex' | 'pattern'>) {
  return `${g.kind}|${g.hex.toLowerCase()}|${g.pattern}`;
}

/** Merge repeated pieces across photos, keeping links to every source photo. */
export function dedupe(detections: Detection[]): DedupedDetection[] {
  const map = new Map<string, DedupedDetection>();
  for (const d of detections) {
    const hit = map.get(d.signature);
    if (hit) {
      if (!hit.outfitIds.includes(d.outfitId)) hit.outfitIds.push(d.outfitId);
      hit.confidence = Math.max(hit.confidence, d.confidence);
    } else {
      map.set(d.signature, { signature: d.signature, garment: d.garment, outfitIds: [d.outfitId], confidence: d.confidence });
    }
  }
  return [...map.values()];
}

export interface DemoScan {
  outfits: OutfitPhoto[];
  raw: Detection[];
  pieces: DedupedDetection[];
  wears: WearEvent[];
}

/** DEMO ONLY: "detects" garments from bundled outfit boards. */
export function demoExtract(): DemoScan {
  const closet = buildDemoCloset();
  const byId = new Map(closet.garments.map((g) => [g.id, g]));
  const rand = rng(77);
  const raw: Detection[] = [];
  closet.outfits.forEach((o) => {
    o.garmentIds.forEach((gid) => {
      const g = byId.get(gid)!;
      raw.push({
        id: `${o.id}:${gid}`,
        outfitId: o.id,
        signature: signatureOf(g),
        garment: g,
        // A handful of low-confidence detections so the review step has something to check.
        confidence: hashString(gid) % 11 === 0 ? 0.55 + rand() * 0.1 : 0.86 + rand() * 0.13,
      });
    });
  });
  const pieces = dedupe(raw).sort((a, b) => a.confidence - b.confidence);
  return { outfits: closet.outfits, raw, pieces, wears: closet.wears };
}

export type RealExtractResult =
  | { status: 'unavailable'; reason: string }
  | { status: 'ok'; detections: Detection[] };

/** Real-photo path. Deliberately does not fabricate detections. */
export async function extractFromPhotos(_uris: string[]): Promise<RealExtractResult> {
  return {
    status: 'unavailable',
    reason: 'garment detection for your own photos isn’t connected in this build, so nothing was detected.',
  };
}

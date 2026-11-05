import type { StylistContext } from './types';

export const emptyStylist = (): StylistContext => ({ anchorIds: [], excludeIds: [], candidateIds: [], seed: 1 });

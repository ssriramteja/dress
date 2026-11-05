export type Category = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'caps' | 'bags';

export type Kind =
  | 'tee' | 'shirt' | 'knit' | 'hoodie' | 'polo'
  | 'jeans' | 'trousers' | 'chinos' | 'shorts'
  | 'jacket' | 'blazer' | 'coat' | 'overshirt' | 'bomber' | 'puffer'
  | 'sneaker' | 'boot' | 'loafer'
  | 'cap' | 'beanie'
  | 'tote' | 'crossbody' | 'backpack';

export type ColorFamily = 'neutral' | 'light' | 'blue' | 'green' | 'earth' | 'red';

export type Pattern = 'solid' | 'stripe' | 'check';

export type GarmentImage =
  | { type: 'art' }
  /** An unprocessed user photo: not cut out, shown as-is. */
  | { type: 'photo'; uri: string };

export interface Garment {
  id: string;
  name: string;
  kind: Kind;
  category: Category;
  colorName: string;
  hex: string;
  accentHex?: string;
  family: ColorFamily;
  pattern: Pattern;
  /** 0 = active/lounge, 3 = formal */
  formality: number;
  /** 0 = summer, 3 = winter */
  warmth: number;
  description: string;
  sourceOutfitIds: string[];
  addedAt: number;
  image: GarmentImage;
  demo: boolean;
}

export interface OutfitPhoto {
  id: string;
  garmentIds: string[];
  /** Present for real user photos. Demo boards are drawn from their garments. */
  uri?: string;
  demo: boolean;
}

export interface WearEvent {
  id: string;
  garmentId: string;
  /** local YYYY-MM-DD */
  date: string;
  at: number;
}

export interface Look {
  id: string;
  name: string;
  garmentIds: string[];
  reason: string;
}

export interface SavedLook extends Look {
  savedAt: number;
}

export type ChatPart =
  | { type: 'text'; text: string }
  | { type: 'looks'; looks: Look[] }
  | { type: 'tiles'; garmentIds: string[] }
  | { type: 'list'; lines: string[] }
  | { type: 'chips'; chips: string[] };

export interface ChatMessage {
  id: string;
  role: 'user' | 'stylist';
  parts: ChatPart[];
  at: number;
}

export type Occasion = 'dinner' | 'work' | 'formal' | 'weekend' | 'night' | 'travel' | 'active';
export type Weather = 'hot' | 'mild' | 'cool' | 'cold' | 'rain';

export interface StylistContext {
  lastIntent?: 'look' | 'pack' | 'unworn' | 'similar';
  occasion?: Occasion;
  formality?: number;
  weather?: Weather;
  mood?: 'minimal' | 'bold' | 'dark' | 'relaxed';
  anchorIds: string[];
  excludeIds: string[];
  noOuter?: boolean;
  withCap?: boolean;
  packDays?: number;
  candidateIds: string[];
  seed: number;
  pending?: {
    type: 'occasion' | 'anchor' | 'days' | 'similar';
    /** original text so the request can resume */
    text: string;
    optionIds?: string[];
  };
}

export interface WardrobeState {
  version: 1;
  onboarded: boolean;
  demo: boolean;
  garments: Garment[];
  outfits: OutfitPhoto[];
  wears: WearEvent[];
  savedLooks: SavedLook[];
  dislikedKeys: string[];
  chat: ChatMessage[];
  stylist: StylistContext;
}

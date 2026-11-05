import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ChatMessage, Garment, Look, OutfitPhoto, SavedLook, StylistContext, WardrobeState, WearEvent } from './types';
import { emptyStylist } from './defaults';
import { localDate, uid } from './util';

export { emptyStylist };

const KEY = 'crest/v1';

export const initialState = (): WardrobeState => ({
  version: 1,
  onboarded: false,
  demo: false,
  garments: [],
  outfits: [],
  wears: [],
  savedLooks: [],
  dislikedKeys: [],
  chat: [],
  stylist: emptyStylist(),
});

type Action =
  | { type: 'hydrate'; state: WardrobeState }
  | { type: 'completeOnboarding'; garments: Garment[]; outfits: OutfitPhoto[]; wears: WearEvent[]; demo: boolean }
  | { type: 'logWear'; events: WearEvent[] }
  | { type: 'saveLook'; look: Look }
  | { type: 'unsaveLook'; id: string }
  | { type: 'dislike'; key: string }
  | { type: 'addMessages'; messages: ChatMessage[] }
  | { type: 'replaceLook'; messageId: string; oldLookId: string; look: Look }
  | { type: 'setStylist'; ctx: StylistContext }
  | { type: 'clearChat' }
  | { type: 'reset' };

const MAX_CHAT = 80;

function reducer(s: WardrobeState, a: Action): WardrobeState {
  switch (a.type) {
    case 'hydrate':
      return a.state;
    case 'completeOnboarding':
      return { ...initialState(), onboarded: true, demo: a.demo, garments: a.garments, outfits: a.outfits, wears: a.wears };
    case 'logWear':
      return a.events.length ? { ...s, wears: [...s.wears, ...a.events] } : s;
    case 'saveLook':
      if (s.savedLooks.some((l) => l.id === a.look.id)) return s;
      return { ...s, savedLooks: [{ ...a.look, savedAt: Date.now() }, ...s.savedLooks] };
    case 'unsaveLook':
      return { ...s, savedLooks: s.savedLooks.filter((l) => l.id !== a.id) };
    case 'dislike':
      return s.dislikedKeys.includes(a.key) ? s : { ...s, dislikedKeys: [...s.dislikedKeys, a.key] };
    case 'addMessages':
      return { ...s, chat: [...s.chat, ...a.messages].slice(-MAX_CHAT) };
    case 'replaceLook':
      return {
        ...s,
        chat: s.chat.map((m) =>
          m.id !== a.messageId
            ? m
            : {
                ...m,
                parts: m.parts.map((p) =>
                  p.type === 'looks' ? { ...p, looks: p.looks.map((l) => (l.id === a.oldLookId ? a.look : l)) } : p,
                ),
              },
        ),
      };
    case 'setStylist':
      return { ...s, stylist: a.ctx };
    case 'clearChat':
      return { ...s, chat: [], stylist: emptyStylist() };
    case 'reset':
      return initialState();
  }
}

export interface WearInfo { count: number; last?: string }

interface StoreValue {
  state: WardrobeState;
  status: 'loading' | 'ready' | 'error';
  saveError: string | null;
  retryLoad: () => void;
  dispatch: React.Dispatch<Action>;
  garmentById: Map<string, Garment>;
  wearInfo: Map<string, WearInfo>;
  /** Logs one wear per garment per day. Returns how many were newly logged. */
  logWear: (ids: string[]) => number;
  wornToday: (id: string) => boolean;
  logout: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

export function lookKey(ids: string[]) {
  return ids.slice().sort().join('+');
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive) return;
        if (raw) {
          const parsed = JSON.parse(raw) as WardrobeState;
          if (parsed?.version === 1) dispatch({ type: 'hydrate', state: { ...initialState(), ...parsed } });
        }
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [attempt]);

  // Debounced persistence.
  useEffect(() => {
    if (status !== 'ready') return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify(state))
        .then(() => setSaveError(null))
        .catch(() => setSaveError('couldn’t save to this device. storage may be full.'));
    }, 250);
    return () => clearTimeout(t);
  }, [state, status]);

  const garmentById = useMemo(() => new Map(state.garments.map((g) => [g.id, g])), [state.garments]);

  const wearInfo = useMemo(() => {
    const m = new Map<string, WearInfo>();
    for (const w of state.wears) {
      const cur = m.get(w.garmentId) ?? { count: 0 };
      cur.count += 1;
      if (!cur.last || w.date > cur.last) cur.last = w.date;
      m.set(w.garmentId, cur);
    }
    return m;
  }, [state.wears]);

  const logWear = useCallback((ids: string[]) => {
    const today = localDate();
    const already = new Set(stateRef.current.wears.filter((w) => w.date === today).map((w) => w.garmentId));
    const events: WearEvent[] = [...new Set(ids)]
      .filter((id) => !already.has(id))
      .map((garmentId) => ({ id: uid('w'), garmentId, date: today, at: Date.now() }));
    dispatch({ type: 'logWear', events });
    return events.length;
  }, []);

  const wornToday = useCallback(
    (id: string) => {
      const today = localDate();
      return state.wears.some((w) => w.garmentId === id && w.date === today);
    },
    [state.wears],
  );

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      // still reset in memory
    }
    dispatch({ type: 'reset' });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      status,
      saveError,
      retryLoad: () => setAttempt((n) => n + 1),
      dispatch,
      garmentById,
      wearInfo,
      logWear,
      wornToday,
      logout,
    }),
    [state, status, saveError, garmentById, wearInfo, logWear, wornToday, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

export type { SavedLook };

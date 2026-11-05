import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type SheetOrigin = 'closet' | 'chat' | 'you';

export interface StylistRequest {
  text: string;
  anchorId?: string;
}

interface UIValue {
  sheet: { garmentId: string; origin: SheetOrigin } | null;
  openGarment: (garmentId: string, origin: SheetOrigin) => void;
  closeGarment: () => void;
  /** queue a request for the stylist tab to pick up when focused */
  sendToStylist: (req: StylistRequest) => void;
  takeStylistRequest: () => StylistRequest | null;
  inboxVersion: number;
}

const Ctx = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<UIValue['sheet']>(null);
  const inbox = useRef<StylistRequest | null>(null);
  const [inboxVersion, setInboxVersion] = useState(0);

  const openGarment = useCallback((garmentId: string, origin: SheetOrigin) => setSheet({ garmentId, origin }), []);
  const closeGarment = useCallback(() => setSheet(null), []);
  const sendToStylist = useCallback((req: StylistRequest) => {
    inbox.current = req;
    setInboxVersion((v) => v + 1);
  }, []);
  const takeStylistRequest = useCallback(() => {
    const r = inbox.current;
    inbox.current = null;
    return r;
  }, []);

  const value = useMemo(
    () => ({ sheet, openGarment, closeGarment, sendToStylist, takeStylistRequest, inboxVersion }),
    [sheet, openGarment, closeGarment, sendToStylist, takeStylistRequest, inboxVersion],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUI outside UIProvider');
  return v;
}

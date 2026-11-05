import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Voice input.
 * - Web: Web Speech API (Chrome, Edge, Safari). Interim text is streamed so the
 *   user sees what was recognised.
 * - Native in Expo Go: no speech-recognition module ships in Expo Go, so this
 *   reports `unsupported`. The iOS keyboard dictation key still works and feeds
 *   the same text field.
 */
export type VoiceStatus = 'idle' | 'listening' | 'unsupported' | 'denied' | 'error';

export function useVoice(onText: (text: string, final: boolean) => void) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const recRef = useRef<any>(null);
  const cb = useRef(onText);
  cb.current = onText;

  const Ctor =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : undefined;
  const supported = !!Ctor;

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {}
  }, []);

  const start = useCallback(() => {
    if (!Ctor) {
      setStatus('unsupported');
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = false;
      let finalText = '';
      rec.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        cb.current((finalText + interim).trim(), false);
      };
      rec.onerror = (e: any) => {
        setStatus(e?.error === 'not-allowed' || e?.error === 'service-not-allowed' ? 'denied' : 'error');
      };
      rec.onend = () => {
        setStatus((s) => (s === 'listening' ? 'idle' : s));
        if (finalText.trim()) cb.current(finalText.trim(), true);
        recRef.current = null;
      };
      recRef.current = rec;
      setStatus('listening');
      rec.start();
    } catch {
      setStatus('error');
    }
  }, [Ctor]);

  useEffect(() => () => stop(), [stop]);

  return { status, supported, start, stop, reset: () => setStatus('idle') };
}

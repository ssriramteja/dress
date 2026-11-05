import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { demoExtract, extractFromPhotos, type DemoScan } from '../extraction/extractor';
import { useReducedMotion } from '../hooks/device';
import { Intro } from '../onboarding/Intro';
import { Splash } from '../onboarding/Splash';
import { DemoReview, DemoScanStep, Explain, RealReview, RealScanStep, Ready, Source } from '../onboarding/Steps';
import { useStore } from '../storage/store';
import type { Category, Garment, OutfitPhoto } from '../storage/types';
import { uid } from '../storage/util';
import { color } from '../theme/tokens';

type Step =
  | { s: 'intro' }
  | { s: 'splash' }
  | { s: 'explain' }
  | { s: 'source' }
  | { s: 'demoScan'; scan: DemoScan }
  | { s: 'demoReview'; scan: DemoScan }
  | { s: 'realScan'; uris: string[]; limited: boolean }
  | { s: 'realReview'; uris: string[]; reason: string }
  | { s: 'ready'; pieces: number; outfits: number; demo: boolean };

export default function Onboarding() {
  const params = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState<Step>(params.step === 'source' ? { s: 'source' } : { s: 'intro' });
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const reduced = useReducedMotion();
  const { dispatch, state } = useStore();
  const router = useRouter();
  const [wasOnboarded] = useState(state.onboarded);

  const startDemo = () => {
    setRemoved(new Set());
    setStep({ s: 'demoScan', scan: demoExtract() });
  };

  const finishDemo = (scan: DemoScan) => {
    const kept = scan.pieces.filter((p) => !removed.has(p.signature));
    const keptIds = new Set(kept.map((p) => p.garment.id));
    const garments: Garment[] = kept.map((p) => ({ ...p.garment, sourceOutfitIds: p.outfitIds }));
    const outfits: OutfitPhoto[] = scan.outfits
      .map((o) => ({ ...o, garmentIds: o.garmentIds.filter((id) => keptIds.has(id)) }))
      .filter((o) => o.garmentIds.length);
    const wears = scan.wears.filter((w) => keptIds.has(w.garmentId));
    dispatch({ type: 'completeOnboarding', garments, outfits, wears, demo: true });
    setStep({ s: 'ready', pieces: garments.length, outfits: outfits.length, demo: true });
  };

  const finishReal = (picks: { uri: string; category: Category }[]) => {
    const now = Date.now();
    const outfits: OutfitPhoto[] = [];
    const garments: Garment[] = picks.map((p, i) => {
      const id = uid('g');
      const outfitId = uid('photo');
      outfits.push({ id: outfitId, garmentIds: [id], uri: p.uri, demo: false });
      return {
        id,
        name: `${p.category === 'tops' ? 'top' : p.category === 'bottoms' ? 'bottom' : p.category === 'caps' ? 'cap' : p.category === 'bags' ? 'bag' : p.category} ${i + 1}`,
        kind: p.category === 'tops' ? 'tee' : p.category === 'bottoms' ? 'trousers' : p.category === 'outerwear' ? 'jacket' : p.category === 'shoes' ? 'sneaker' : p.category === 'caps' ? 'cap' : 'tote',
        category: p.category,
        colorName: 'unknown',
        hex: '#9A9B9C',
        family: 'neutral',
        pattern: 'solid',
        formality: 1,
        warmth: 1,
        description: 'added from your photo. colour and details haven’t been analysed.',
        sourceOutfitIds: [outfitId],
        addedAt: now - i,
        image: { type: 'photo', uri: p.uri },
        demo: false,
      };
    });
    dispatch({ type: 'completeOnboarding', garments, outfits, wears: [], demo: false });
    setStep({ s: 'ready', pieces: garments.length, outfits: 0, demo: false });
  };

  const content = useMemo(() => {
    switch (step.s) {
      case 'intro':
        return <Intro reduced={reduced} onDone={() => setStep({ s: 'splash' })} />;
      case 'splash':
        return <Splash reduced={reduced} onNext={() => setStep({ s: 'explain' })} onSkip={() => setStep({ s: 'source' })} />;
      case 'explain':
        return <Explain onNext={() => setStep({ s: 'source' })} />;
      case 'source':
        return <Source onDemo={startDemo} onPhotos={(uris, limited) => setStep({ s: 'realScan', uris, limited })} />;
      case 'demoScan':
        return <DemoScanStep scan={step.scan} reduced={reduced} onDone={() => setStep({ s: 'demoReview', scan: step.scan })} />;
      case 'demoReview':
        return (
          <DemoReview
            scan={step.scan}
            removed={removed}
            toggle={(sig) =>
              setRemoved((r) => {
                const n = new Set(r);
                if (n.has(sig)) n.delete(sig);
                else n.add(sig);
                return n;
              })
            }
            onContinue={() => finishDemo(step.scan)}
          />
        );
      case 'realScan':
        return (
          <RealScanStep
            uris={step.uris}
            limited={step.limited}
            onDone={async () => {
              const r = await extractFromPhotos(step.uris);
              if (r.status === 'unavailable') setStep({ s: 'realReview', uris: step.uris, reason: r.reason });
            }}
          />
        );
      case 'realReview':
        return <RealReview uris={step.uris} reason={step.reason} onContinue={finishReal} onDemo={startDemo} />;
      case 'ready':
        return <Ready pieces={step.pieces} outfits={step.outfits} demo={step.demo} onOpen={() => router.replace('/(tabs)/closet')} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, removed, reduced]);

  if (wasOnboarded && params.step !== 'source') return <Redirect href="/(tabs)/closet" />;

  return (
    <View style={{ flex: 1, backgroundColor: step.s === 'intro' ? color.paper : color.black }}>
      <StatusBar style={step.s === 'intro' ? 'dark' : 'light'} />
      {content}
    </View>
  );
}

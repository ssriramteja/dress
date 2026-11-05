import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GarmentArt } from '../catalog/GarmentArt';
import { IconClose } from '../components/Icons';
import { OutfitBoard } from '../components/OutfitBoard';
import { Button, ProgressBar, TextLink } from '../components/ui';
import type { DemoScan } from '../extraction/extractor';
import type { Category, Garment } from '../storage/types';
import { color, touch, type } from '../theme/tokens';

export function Frame({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: color.black, paddingTop: insets.top }]}>
      <View style={styles.frameInner}>
        <View style={{ flex: 1 }}>{children}</View>
        {footer ? <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16, paddingTop: 8, gap: 8 }}>{footer}</View> : null}
      </View>
    </View>
  );
}

// --- explanation --------------------------------------------------------------

export function Explain({ onNext }: { onNext: () => void }) {
  const rows = [
    ['01', 'add outfit photos', 'crest reads the photos you choose, nothing else.'],
    ['02', 'every piece, lifted out', 'each garment becomes its own clean cutout. repeats are merged.'],
    ['03', 'style what you own', 'ask your stylist for a look, a trip, or the things you forgot.'],
  ];
  return (
    <Frame footer={<Button tone="onBlack" label="continue" onPress={onNext} />}>
      <View style={{ padding: 20, paddingTop: 48, gap: 28 }}>
        <Text style={[type.display, { color: color.onBlack }]}>how crest works.</Text>
        {rows.map(([n, title, body]) => (
          <View key={n} style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={[type.label, { color: color.onBlackFaint, width: 24 }]}>{n}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[type.title, { color: color.onBlack, fontSize: 18 }]}>{title}</Text>
              <Text style={[type.body, { color: color.onBlackMuted }]}>{body}</Text>
            </View>
          </View>
        ))}
      </View>
    </Frame>
  );
}

// --- photo permission or demo -------------------------------------------------

type SourceState =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'denied'; canAskAgain: boolean }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

export function Source({ onPhotos, onDemo }: { onPhotos: (uris: string[], limited: boolean) => void; onDemo: () => void }) {
  const [s, setS] = useState<SourceState>({ kind: 'idle' });

  const usePhotos = async () => {
    setS({ kind: 'working' });
    try {
      let limited = false;
      if (Platform.OS !== 'web') {
        let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (!perm.granted && perm.canAskAgain) perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setS({ kind: 'denied', canAskAgain: perm.canAskAgain });
          return;
        }
        limited = perm.accessPrivileges === 'limited';
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 12,
        quality: 0.5,
      });
      if (res.canceled || !res.assets?.length) {
        setS({ kind: 'cancelled' });
        return;
      }
      onPhotos(res.assets.map((a) => a.uri), limited);
    } catch (e) {
      setS({ kind: 'error', message: 'couldn’t open your photos. try again, or use the demo closet.' });
    }
  };

  return (
    <Frame
      footer={
        <>
          {s.kind === 'denied' ? (
            s.canAskAgain ? (
              <Button tone="onBlack" label="ask again" onPress={usePhotos} />
            ) : (
              <Button tone="onBlack" label="open settings" onPress={() => Linking.openSettings().catch(() => {})} />
            )
          ) : (
            <Button tone="onBlack" label="use my photos" loading={s.kind === 'working'} onPress={usePhotos} />
          )}
          <Button tone="onBlack" variant="outline" label="try the demo closet" onPress={onDemo} />
        </>
      }
    >
      <View style={{ padding: 20, paddingTop: 48, gap: 12 }}>
        <Text style={[type.display, { color: color.onBlack }]}>start with your photos.</Text>
        <Text style={[type.body, { color: color.onBlackMuted }]}>
          pick outfit photos from your camera roll. you choose which ones; crest never browses your library.
        </Text>
        <Text style={[type.small, { color: color.onBlackMuted, marginTop: 8 }]}>
          the demo closet is a bundled sample wardrobe for trying crest. none of it comes from your photos.
        </Text>
        {s.kind === 'denied' ? (
          <Notice
            title="photo access is off."
            body={
              s.canAskAgain
                ? 'crest needs permission to show the photo picker. you can ask again, or carry on with the demo.'
                : 'turn on photo access for crest in settings, or carry on with the demo closet.'
            }
          />
        ) : null}
        {s.kind === 'cancelled' ? <Notice title="no photos chosen." body="pick at least one outfit photo, or try the demo closet." /> : null}
        {s.kind === 'error' ? <Notice title="something went wrong." body={s.message} /> : null}
      </View>
    </Frame>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ marginTop: 16, borderLeftWidth: 2, borderColor: color.onBlack, paddingLeft: 12, gap: 2 }} accessibilityLiveRegion="polite">
      <Text style={[type.label, { color: color.onBlack }]}>{title}</Text>
      <Text style={[type.small, { color: color.onBlackMuted }]}>{body}</Text>
    </View>
  );
}

// --- scan ---------------------------------------------------------------------

export function DemoScanStep({ scan, reduced, onDone }: { scan: DemoScan; reduced: boolean; onDone: () => void }) {
  const { width } = useWindowDimensions();
  const total = scan.pieces.length;
  const [n, setN] = useState(0);
  const cells = 12;
  const contentW = Math.min(width, 520) - 40;
  const gap = 4;
  const tile = (contentW - gap * 3) / 4;
  const doneRef = useRef(false);

  useEffect(() => {
    const step = reduced ? 25 : 70;
    const id = setInterval(() => {
      setN((x) => {
        if (x >= total) {
          clearInterval(id);
          if (!doneRef.current) {
            doneRef.current = true;
            setTimeout(onDone, reduced ? 200 : 700);
          }
          return x;
        }
        return x + 1;
      });
    }, step);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = n / total;
  const outfitsRead = Math.min(scan.outfits.length, Math.ceil(p * 1.6 * scan.outfits.length));
  const repeats = scan.raw.length - total;
  const status =
    p < 0.35
      ? `reading outfit ${Math.max(1, outfitsRead)} of ${scan.outfits.length}`
      : p < 0.7
        ? `lifting out individual pieces · ${n} found`
        : p < 0.9
          ? `merging repeats · ${repeats} duplicates`
          : p < 1
            ? 'cleaning cutouts'
            : `${total} pieces ready to review`;

  // the latest 12 arrivals fill the grid in order
  const shown = Array.from({ length: cells }, (_, i) => {
    const idx = n - cells + i;
    return idx >= 0 ? scan.pieces[idx].garment : null;
  });

  return (
    <Frame>
      <View style={{ padding: 20, gap: 16 }}>
        <View style={styles.tag}>
          <Text style={[type.micro, { color: color.onBlack }]}>demo scan · bundled sample outfits</Text>
        </View>
        <Text style={[type.display, { color: color.onBlack }]}>building your closet.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, width: contentW }}>
          {shown.map((g, i) => (
            <View key={i} style={{ width: tile, height: tile, backgroundColor: g ? color.paper : color.surfaceDark, alignItems: 'center', justifyContent: 'center' }}>
              {g ? <GarmentArt garment={g} size={tile * 0.8} /> : null}
            </View>
          ))}
        </View>
        <ProgressBar value={p} />
        <Text style={[type.small, { color: color.onBlackMuted }]} accessibilityLiveRegion="polite">{status}</Text>
      </View>
    </Frame>
  );
}

export function RealScanStep({ uris, limited, onDone }: { uris: string[]; limited: boolean; onDone: () => void }) {
  const { width } = useWindowDimensions();
  const [p, setP] = useState(0);
  const contentW = Math.min(width, 520) - 40;
  const tile = (contentW - 12) / 4;
  useEffect(() => {
    const id = setInterval(() => setP((x) => Math.min(1, x + 0.05)), 60);
    const t = setTimeout(onDone, 1500);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Frame>
      <View style={{ padding: 20, gap: 16 }}>
        <View style={styles.tag}>
          <Text style={[type.micro, { color: color.onBlack }]}>your photos · {uris.length} selected</Text>
        </View>
        <Text style={[type.display, { color: color.onBlack }]}>reading your photos.</Text>
        {limited ? <Text style={[type.small, { color: color.onBlackMuted }]}>limited access: crest can only see the photos you shared.</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, width: contentW }}>
          {Array.from({ length: 12 }, (_, i) => (
            <View key={i} style={{ width: tile, height: tile, backgroundColor: color.surfaceDark }}>
              {uris[i] ? <Image source={{ uri: uris[i] }} style={{ width: tile, height: tile }} /> : null}
            </View>
          ))}
        </View>
        <ProgressBar value={p} />
        <Text style={[type.small, { color: color.onBlackMuted }]}>{p < 1 ? 'checking for a garment detection service' : 'done'}</Text>
      </View>
    </Frame>
  );
}

// --- review -------------------------------------------------------------------

export function DemoReview({ scan, removed, toggle, onContinue }: { scan: DemoScan; removed: Set<string>; toggle: (sig: string) => void; onContinue: () => void }) {
  const { width } = useWindowDimensions();
  const [inspect, setInspect] = useState<string | null>(null);
  const contentW = Math.min(width, 520) - 40;
  const tile = (contentW - 12) / 4;
  const flagged = scan.pieces.filter((p) => p.confidence < 0.7);
  const rest = scan.pieces.filter((p) => p.confidence >= 0.7);
  const keep = scan.pieces.length - removed.size;
  const repeats = scan.raw.length - scan.pieces.length;
  const garmentMap = useMemo(() => new Map(scan.pieces.map((p) => [p.garment.id, p.garment])), [scan]);
  const current = inspect ? scan.pieces.find((p) => p.signature === inspect) : null;

  const grid = (list: typeof scan.pieces) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {list.map((p) => {
        const off = removed.has(p.signature);
        return (
          <Pressable
            key={p.signature}
            accessibilityRole="button"
            accessibilityLabel={`${p.garment.name}${off ? ', removed' : ''}. tap to inspect`}
            onPress={() => setInspect(p.signature)}
            style={{ width: tile, height: tile, backgroundColor: color.paper, opacity: off ? 0.25 : 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <GarmentArt garment={p.garment} size={tile * 0.78} />
            <Pressable accessibilityRole="button" accessibilityLabel={off ? `restore ${p.garment.name}` : `remove ${p.garment.name}`} onPress={() => toggle(p.signature)} style={styles.remove} hitSlop={6}>
              {off ? <Text style={[type.micro, { color: color.ink }]}>undo</Text> : <IconClose color={color.ink} size={14} />}
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Frame footer={<Button tone="onBlack" label={`build my closet · ${keep} pieces`} disabled={keep === 0} onPress={onContinue} />}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
        <View style={styles.tag}>
          <Text style={[type.micro, { color: color.onBlack }]}>demo scan · bundled sample outfits</Text>
        </View>
        <Text style={[type.display, { color: color.onBlack }]}>review.</Text>
        <Text style={[type.body, { color: color.onBlackMuted }]}>
          {scan.pieces.length} pieces from {scan.outfits.length} outfits. {repeats} repeats merged. tap a piece to inspect it; remove anything that’s wrong.
        </Text>
        {flagged.length ? (
          <>
            <Text style={[type.label, { color: color.onBlack, marginTop: 8 }]}>check these · lower confidence</Text>
            {grid(flagged)}
          </>
        ) : null}
        <Text style={[type.label, { color: color.onBlack, marginTop: 8 }]}>everything else</Text>
        {grid(rest)}
      </ScrollView>
      {current ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }]}>
          <View style={{ backgroundColor: color.paper, padding: 16, gap: 10, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
            <View style={{ alignItems: 'center', backgroundColor: color.tile }}>
              <GarmentArt garment={current.garment} size={200} />
            </View>
            <Text style={[type.title, { color: color.ink }]}>{current.garment.name}</Text>
            <Text style={[type.small, { color: color.muted }]}>
              seen in {current.outfitIds.length} outfit{current.outfitIds.length === 1 ? '' : 's'} · confidence {Math.round(current.confidence * 100)}%
            </Text>
            <ScrollView horizontal contentContainerStyle={{ gap: 6 }}>
              {scan.outfits
                .filter((o) => current.outfitIds.includes(o.id))
                .map((o) => (
                  <OutfitBoard key={o.id} outfit={o} garments={garmentMap as Map<string, Garment>} size={86} />
                ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                label={removed.has(current.signature) ? 'restore' : 'remove'}
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {
                  toggle(current.signature);
                  setInspect(null);
                }}
              />
              <Button label="keep" style={{ flex: 1 }} onPress={() => setInspect(null)} />
            </View>
          </View>
        </View>
      ) : null}
    </Frame>
  );
}

const CATS: Category[] = ['tops', 'bottoms', 'outerwear', 'shoes', 'caps', 'bags'];

export function RealReview({
  uris, reason, onContinue, onDemo,
}: { uris: string[]; reason: string; onContinue: (picks: { uri: string; category: Category }[]) => void; onDemo: () => void }) {
  const [picks, setPicks] = useState<Record<number, Category | undefined>>({});
  const chosen = Object.entries(picks).filter(([, c]) => c) as [string, Category][];
  return (
    <Frame
      footer={
        <>
          <Button tone="onBlack" label={chosen.length ? `add ${chosen.length} as single pieces` : 'continue with an empty closet'} onPress={() => onContinue(chosen.map(([i, c]) => ({ uri: uris[+i], category: c })))} />
          <Button tone="onBlack" variant="outline" label="use the demo closet instead" onPress={onDemo} />
        </>
      }
    >
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
        <Text style={[type.display, { color: color.onBlack }]}>review.</Text>
        <Text style={[type.body, { color: color.onBlack }]}>{reason}</Text>
        <Text style={[type.small, { color: color.onBlackMuted }]}>
          crest won’t guess. if a photo shows a single piece, tag it below and it’ll be added as-is (not cut out). otherwise use the demo closet to explore.
        </Text>
        {uris.map((u, i) => (
          <View key={u + i} style={{ flexDirection: 'row', gap: 12 }}>
            <Image source={{ uri: u }} style={{ width: 84, height: 104, backgroundColor: color.surfaceDark }} />
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
              {CATS.map((c) => {
                const on = picks[i] === c;
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setPicks((p) => ({ ...p, [i]: on ? undefined : c }))}
                    style={{ minHeight: 36, paddingHorizontal: 10, justifyContent: 'center', borderWidth: 1, borderColor: on ? color.onBlack : color.lineDark, backgroundColor: on ? color.onBlack : 'transparent' }}
                  >
                    <Text style={[type.small, { color: on ? color.ink : color.onBlackMuted }]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </Frame>
  );
}

// --- ready --------------------------------------------------------------------

export function Ready({ pieces, outfits, demo, onOpen }: { pieces: number; outfits: number; demo: boolean; onOpen: () => void }) {
  return (
    <Frame footer={<Button tone="onBlack" label="open closet" onPress={onOpen} />}>
      <View style={{ padding: 20, paddingTop: 80, gap: 8 }}>
        <Text style={[type.display, { color: color.onBlack }]}>closet ready.</Text>
        <Text style={[type.body, { color: color.onBlackMuted }]}>
          {pieces} pieces{outfits ? ` from ${outfits} outfits` : ''}.{demo ? ' this is the demo closet; you can log out from you to start over.' : ''}
        </Text>
      </View>
    </Frame>
  );
}

export const backLink = (onPress: () => void) => <TextLink label="back" onPress={onPress} textStyle={{ color: color.onBlackMuted }} />;

const styles = StyleSheet.create({
  frameInner: { flex: 1, maxWidth: 520, width: '100%', alignSelf: 'center' },
  tag: { alignSelf: 'flex-start', borderWidth: 1, borderColor: color.onBlackFaint, paddingHorizontal: 8, paddingVertical: 4 },
  remove: { position: 'absolute', top: 0, right: 0, minWidth: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)' },
});

export { touch };

import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GarmentArt } from '../../catalog/GarmentArt';
import { IconMic, IconSend } from '../../components/Icons';
import { LookCard } from '../../components/LookCard';
import { useUI } from '../../components/SheetContext';
import { Chip } from '../../components/ui';
import { useReducedMotion } from '../../hooks/device';
import { useVoice } from '../../hooks/useVoice';
import { lookKey, useStore } from '../../storage/store';
import type { ChatMessage, ChatPart, Look } from '../../storage/types';
import { uid } from '../../storage/util';
import { greeting, OPENING_CHIPS, rerollLook, respond } from '../../stylist/engine';
import { color, touch, type } from '../../theme/tokens';

const COMPOSING = ['looking through your closet', 'putting it together'];

export default function Stylist() {
  const store = useStore();
  const { state, dispatch, garmentById, wearInfo, logWear } = store;
  const { openGarment, takeStylistRequest, inboxVersion } = useUI();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [text, setText] = useState('');
  const [composing, setComposing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const lastCount = useRef(state.chat.length);
  const stateRef = useRef(state);
  stateRef.current = state;
  const busy = useRef(false);

  const send = useCallback(
    (raw: string, anchorId?: string) => {
      const msg = raw.trim();
      if (!msg || busy.current) return;
      setText('');
      setVoiceNote(null);
      const s = stateRef.current;
      const userMsg: ChatMessage = { id: uid('m'), role: 'user', parts: [{ type: 'text', text: msg }], at: Date.now() };
      dispatch({ type: 'addMessages', messages: [userMsg] });
      let reply;
      try {
        reply = respond({ text: msg, anchorId, garments: s.garments, wearInfo, dislikedKeys: s.dislikedKeys, ctx: s.stylist });
      } catch {
        dispatch({ type: 'addMessages', messages: [{ id: uid('m'), role: 'stylist', parts: [{ type: 'text', text: 'something went wrong on my side. try that again?' }], at: Date.now() }] });
        return;
      }
      const deliver = () => {
        dispatch({ type: 'setStylist', ctx: reply.ctx });
        dispatch({ type: 'addMessages', messages: [{ id: uid('m'), role: 'stylist', parts: reply.parts, at: Date.now() }] });
        setComposing(null);
        busy.current = false;
      };
      if (reply.composing) {
        busy.current = true;
        const step = reduced ? 350 : 650;
        setComposing(COMPOSING[0]);
        setTimeout(() => setComposing(COMPOSING[1]), step);
        setTimeout(deliver, step * 2);
      } else {
        deliver();
      }
    },
    [dispatch, wearInfo, reduced],
  );

  // pick up "style this" requests from the garment sheet
  useFocusEffect(
    useCallback(() => {
      const req = takeStylistRequest();
      if (req) send(req.text, req.anchorId);
    }, [takeStylistRequest, send, inboxVersion]),
  );

  // scroll to the end only when a message is added (not when a sheet closes)
  useEffect(() => {
    if (state.chat.length !== lastCount.current || composing) {
      lastCount.current = state.chat.length;
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: !reduced }));
    }
  }, [state.chat.length, composing, reduced]);

  const voice = useVoice((t, final) => {
    setText(t);
    if (final) setTimeout(() => send(t), 450);
  });

  const onMic = () => {
    if (voice.status === 'listening') return voice.stop();
    if (!voice.supported) {
      setVoiceNote(
        Platform.OS === 'ios'
          ? 'expo go doesn’t include speech recognition. use the dictation key on your keyboard; it types into this same chat.'
          : Platform.OS === 'android'
            ? 'expo go doesn’t include speech recognition. use your keyboard’s voice typing; it types into this same chat.'
            : 'this browser doesn’t support speech recognition. try chrome, edge or safari.',
      );
      return;
    }
    setVoiceNote(null);
    voice.start();
  };

  useEffect(() => {
    if (voice.status === 'denied') setVoiceNote('microphone access was denied. allow it in your browser settings to talk to your stylist.');
    if (voice.status === 'error') setVoiceNote('couldn’t hear that. try again, or type instead.');
  }, [voice.status]);

  const lookAction = (messageId: string, look: Look, action: 'save' | 'shuffle' | 'dislike' | 'wear') => {
    const s = stateRef.current;
    const note = (t: string) => setNotes((n) => ({ ...n, [look.id]: t }));
    if (action === 'save') {
      if (s.savedLooks.some((l) => l.id === look.id)) {
        dispatch({ type: 'unsaveLook', id: look.id });
        note('removed from saved looks.');
      } else {
        dispatch({ type: 'saveLook', look });
        note('saved to you.');
      }
      return;
    }
    if (action === 'wear') {
      const n = logWear(look.garmentIds);
      note(n ? `logged ${n} piece${n === 1 ? '' : 's'} for today.` : 'already logged today.');
      return;
    }
    if (action === 'dislike') dispatch({ type: 'dislike', key: lookKey(look.garmentIds) });
    const next = rerollLook(
      { text: '', garments: s.garments, wearInfo, dislikedKeys: action === 'dislike' ? [...s.dislikedKeys, lookKey(look.garmentIds)] : s.dislikedKeys, ctx: s.stylist },
      look,
      Math.floor(Math.random() * 1000),
    );
    if (!next) {
      note('that’s every combination i can make for this brief.');
      return;
    }
    dispatch({ type: 'replaceLook', messageId, oldLookId: look.id, look: next });
    if (action === 'dislike') setNotes((n) => ({ ...n, [next.id]: 'noted. i won’t suggest that one again.' }));
  };

  const savedIds = new Set(state.savedLooks.map((l) => l.id));
  const lastId = state.chat[state.chat.length - 1]?.id;
  const empty = state.chat.length === 0;

  const renderPart = (m: ChatMessage, p: ChatPart, i: number) => {
    switch (p.type) {
      case 'text':
        return m.role === 'user' ? (
          <View key={i} style={styles.userBubble}>
            <Text style={[type.body, { color: color.onBlack }]} selectable>{p.text}</Text>
          </View>
        ) : (
          <Text key={i} style={[type.body, { color: color.onBlack, maxWidth: 560 }]} selectable>{p.text}</Text>
        );
      case 'looks':
        return (
          <View key={i} style={{ gap: 12, alignSelf: 'stretch' }}>
            {p.looks.map((l) => (
              <LookCard
                key={l.id}
                look={l}
                garments={garmentById}
                saved={savedIds.has(l.id)}
                note={notes[l.id]}
                onOpen={(id) => openGarment(id, 'chat')}
                onSave={() => lookAction(m.id, l, 'save')}
                onShuffle={() => lookAction(m.id, l, 'shuffle')}
                onDislike={() => lookAction(m.id, l, 'dislike')}
                onWear={() => lookAction(m.id, l, 'wear')}
              />
            ))}
          </View>
        );
      case 'tiles':
        return (
          <ScrollView key={i} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ alignSelf: 'stretch' }}>
            {p.garmentIds.map((id) => {
              const g = garmentById.get(id);
              if (!g) return null;
              const wears = wearInfo.get(id)?.count ?? 0;
              return (
                <Pressable key={id} accessibilityRole="button" accessibilityLabel={`open ${g.name}`} onPress={() => openGarment(id, 'chat')} style={styles.smallTile}>
                  <GarmentArt garment={g} size={72} />
                  <Text numberOfLines={1} style={[type.micro, { color: wears ? color.muted : color.red, fontSize: 10 }]}>{wears ? `${wears}×` : 'never worn'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        );
      case 'list':
        return (
          <View key={i} style={{ gap: 6 }}>
            {p.lines.map((l, k) => (
              <Text key={k} style={[type.small, { color: color.onBlackMuted }]}>{l}</Text>
            ))}
          </View>
        );
      case 'chips':
        return m.id === lastId && !composing ? (
          <View key={i} style={styles.chips}>
            {p.chips.map((c) => (
              <Chip key={c} label={c} onPress={() => send(c)} />
            ))}
          </View>
        ) : null;
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={[type.label, { color: color.onBlack }]}>stylist</Text>
        {!empty ? (
          <Pressable accessibilityRole="button" onPress={() => dispatch({ type: 'clearChat' })} style={styles.headerBtn}>
            <Text style={[type.small, { color: color.onBlackMuted }]}>new chat</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, empty && { flexGrow: 1, justifyContent: 'flex-end' }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {empty ? (
          <View style={{ gap: 4, paddingBottom: 16 }}>
            <Text style={[type.display, { color: color.onBlack }]}>{greeting()}</Text>
            <Text style={[type.display, { color: color.onBlackMuted }]}>how can i style you?</Text>
            {state.garments.length === 0 ? (
              <Text style={[type.small, { color: color.onBlackMuted, marginTop: 12 }]}>your closet is empty, so there’s nothing to style yet.</Text>
            ) : null}
          </View>
        ) : (
          state.chat.map((m) => (
            <View key={m.id} style={[styles.msg, m.role === 'user' ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
              {m.parts.map((p, i) => renderPart(m, p, i))}
            </View>
          ))
        )}
        {composing ? (
          <Text style={[type.small, { color: color.onBlackMuted, marginTop: 4 }]} accessibilityLiveRegion="polite">
            {composing}…
          </Text>
        ) : null}
      </ScrollView>

      {empty ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }} keyboardShouldPersistTaps="handled">
          {OPENING_CHIPS.map((c) => (
            <Chip key={c} label={c} onPress={() => send(c)} />
          ))}
        </ScrollView>
      ) : null}

      {voiceNote ? <Text style={[type.small, styles.voiceNote]}>{voiceNote}</Text> : null}

      <View style={styles.inputRow}>
        <View style={[styles.input, voice.status === 'listening' && { borderColor: color.onBlack }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={voice.status === 'listening' ? 'listening…' : 'ask your stylist'}
            placeholderTextColor={color.onBlackFaint}
            style={[type.body, styles.textInput]}
            cursorColor={color.onBlack}
            selectionColor={Platform.OS === 'ios' ? color.onBlack : 'rgba(255,255,255,0.4)'}
            returnKeyType="send"
            onSubmitEditing={() => send(text)}
            submitBehavior="submit"
            autoCorrect
            autoCapitalize="none"
            accessibilityLabel="message your stylist"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={voice.status === 'listening' ? 'stop listening' : 'speak'}
            onPress={onMic}
            style={styles.inputBtn}
          >
            {voice.status === 'listening' ? <View style={styles.recDot} /> : <IconMic color={color.onBlackMuted} size={20} />}
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="send"
          disabled={!text.trim() || !!composing}
          onPress={() => send(text)}
          style={[styles.send, (!text.trim() || !!composing) && { opacity: 0.35 }]}
        >
          <IconSend color={color.ink} size={20} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.black },
  header: { height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: { minHeight: touch, justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 16, gap: 18, maxWidth: 720, width: '100%', alignSelf: 'center' },
  msg: { gap: 10 },
  userBubble: { backgroundColor: color.bubbleDark, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '82%' },
  smallTile: { width: 84, height: 96, backgroundColor: color.paper, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4, maxWidth: 720, width: '100%', alignSelf: 'center' },
  input: { flex: 1, minHeight: 46, borderRadius: 23, backgroundColor: color.bubbleDark, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, borderWidth: 1, borderColor: 'transparent' },
  textInput: { flex: 1, color: color.onBlack, minHeight: 44, paddingVertical: 10, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', caretColor: '#fff' } as object) : {}) },
  inputBtn: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.red },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: color.onBlack, alignItems: 'center', justifyContent: 'center' },
  voiceNote: { color: color.onBlackMuted, paddingHorizontal: 20, paddingBottom: 6 },
});

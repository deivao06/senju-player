import React, { useEffect, useRef, useState } from 'react';
import { findNodeHandle, Pressable, StyleSheet, Text, View, useTVEventHandler } from 'react-native';
import { useTVFocus } from './useTVFocus';
import { colors } from './theme';

export function time(seconds: number) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(value / 3600);
  return `${hours ? `${hours}:` : ''}${String(Math.floor((value % 3600) / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

/** Preview locally; commit one native seek on OK, discard on leaving the bar. */
export function SeekBar({
  position,
  duration,
  enabled,
  onSeek,
  onSeeking,
  onInteraction,
}: {
  position: number;
  duration: number;
  enabled: boolean;
  onSeek: (position: number) => void;
  onSeeking: (active: boolean) => void;
  onInteraction: () => void;
}) {
  const ref = useRef<View>(null);
  const { focused, updateFocus } = useTVFocus(ref);
  const [target, setTarget] = useState<number | null>(null);
  const [tag, setTag] = useState<number>();
  useEffect(() => setTag(findNodeHandle(ref.current) ?? undefined), []);
  useEffect(() => {
    onSeeking(focused && enabled);
    if (!focused || !enabled) setTarget(null);
    return () => onSeeking(false);
  }, [focused, enabled, onSeeking]);
  function adjust(direction: -1 | 1) {
    if (!enabled) return;
    setTarget((current) =>
      Math.max(0, Math.min(Math.max(0, duration - 0.1), (current ?? position) + direction * 10)),
    );
    onInteraction();
  }
  function confirm() {
    if (target !== null && enabled) onSeek(target);
    setTarget(null);
    onInteraction();
  }
  useTVEventHandler((event) => {
    if (!focused || !enabled || event.eventKeyAction !== 1) return;
    if (event.eventType !== 'left' && event.eventType !== 'right') return;
    adjust(event.eventType === 'left' ? -1 : 1);
  });
  const current = target ?? position;
  const progress = duration > 0 ? Math.min(1, Math.max(0, current / duration)) : 0;
  return (
    <Pressable
      ref={ref}
      focusable={enabled}
      isTVSelectable={enabled}
      disabled={!enabled}
      nextFocusLeft={tag}
      nextFocusRight={tag}
      accessibilityRole="adjustable"
      accessibilityActions={[
        { name: 'increment', label: 'Avançar 10 segundos' },
        { name: 'decrement', label: 'Voltar 10 segundos' },
        { name: 'activate', label: 'Confirmar posição' },
      ]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'increment') adjust(1);
        else if (nativeEvent.actionName === 'decrement') adjust(-1);
        else if (nativeEvent.actionName === 'activate') confirm();
      }}
      accessibilityLabel="Posição do vídeo. Esquerda e direita ajustam; OK confirma"
      accessibilityValue={
        duration > 0 ? { min: 0, max: Math.floor(duration), now: Math.floor(current) } : undefined
      }
      onFocus={() => updateFocus(true)}
      onBlur={() => updateFocus(false)}
      onPress={confirm}
      style={[styles.timeline, focused && styles.focus]}
    >
      <View style={styles.times}>
        <Text style={styles.time}>{time(current)}</Text>
        <Text style={styles.time}>{focused ? 'Setas ajustam · OK confirma' : ''}</Text>
        <Text style={styles.time}>{duration > 0 ? time(duration) : 'Duração indisponível'}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        {focused && <View style={[styles.thumb, { left: `${progress * 100}%` }]} />}
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  timeline: {
    marginBottom: 10,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.player,
  },
  focus: { borderColor: colors.focus, backgroundColor: '#103020f2' },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  time: { color: '#fff', fontSize: 12, fontVariant: ['tabular-nums'] },
  track: { height: 5, borderRadius: 3, backgroundColor: '#b2cabb66' },
  fill: { height: 5, backgroundColor: colors.accent, borderRadius: 3 },
  thumb: {
    position: 'absolute',
    top: -3,
    width: 11,
    height: 11,
    marginLeft: -5,
    borderRadius: 6,
    backgroundColor: colors.focus,
  },
});

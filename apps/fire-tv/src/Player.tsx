import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  useTVEventHandler,
} from 'react-native';
import Video, { type VideoRef } from 'react-native-video';
import type { PlaylistItem } from '@senju/iptv';
import { Button } from './Button';
import { PlayerControls } from './PlayerControls';
import { createPlaybackSource } from './playbackSource';
import { colors } from './theme';

const HIDE_DELAY = 5000;
export function Player({
  item,
  start,
  onProgress,
  onEnd,
  onClose,
  episodeControls,
}: {
  item: PlaylistItem;
  start: number;
  onProgress: (position: number) => void;
  onEnd: () => void;
  onClose: () => void;
  episodeControls?: {
    previous: boolean;
    next: boolean;
    onChange: (direction: -1 | 1, position: number) => boolean;
  };
}) {
  const ref = useRef<VideoRef>(null);
  const catcher = useRef<View>(null);
  const position = useRef(start);
  const durationRef = useRef(0);
  const progressCallback = useRef(onProgress);
  progressCallback.current = onProgress;
  const ended = useRef(false);
  const lastSaved = useRef(Date.now());
  const [paused, setPaused] = useState(false);
  const [background, setBackground] = useState(AppState.currentState !== 'active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekable, setSeekable] = useState(false);
  const [visible, setVisible] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const source = useMemo(() => createPlaybackSource(item), [item]);
  const live = item.category === 'CHANNEL';
  const clearTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }, []);
  const hide = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);
  const interact = useCallback(() => {
    setVisible(true);
    clearTimer();
    if (!paused && !loading && !error && !background && !scrubbing)
      hideTimer.current = setTimeout(hide, HIDE_DELAY);
  }, [paused, loading, error, background, scrubbing, clearTimer, hide]);
  const togglePause = useCallback(() => {
    setVisible(true);
    setPaused((value) => !value);
  }, []);
  function moveEpisode(direction: -1 | 1) {
    if (!episodeControls || ended.current) return;
    // Invalidate old decoder callbacks before switching the keyed player instance.
    ended.current = true;
    if (!episodeControls.onChange(direction, position.current)) ended.current = false;
  }
  const seekTo = useCallback(
    (seconds: number) => {
      if (live || !seekable || durationRef.current <= 0) return;
      const next = Math.max(0, Math.min(durationRef.current - 0.1, seconds));
      ref.current?.seek(next);
      position.current = next;
      interact();
    },
    [live, seekable, interact],
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setBackground(state !== 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (visible) interact();
    return clearTimer;
  }, [visible, interact, clearTimer]);
  useEffect(() => {
    if (visible || error) return;
    const frame = requestAnimationFrame(() => catcher.current?.requestTVFocus());
    return () => cancelAnimationFrame(frame);
  }, [visible, error]);
  useEffect(
    () => () => {
      if (!live && !ended.current) progressCallback.current(position.current);
    },
    [live],
  );
  useTVEventHandler((event) => {
    if (event.eventKeyAction === 0) return;
    if (event.eventType === 'playPause') togglePause();
    else if (event.eventType === 'play') {
      setVisible(true);
      setPaused(false);
    } else if (event.eventType === 'pause') {
      setVisible(true);
      setPaused(true);
    } else if (['up', 'down', 'left', 'right', 'select'].includes(event.eventType)) interact();
  });
  return (
    <View style={styles.screen}>
      {!error && (
        <Video
          key={attempt}
          ref={ref}
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          paused={paused || background}
          playInBackground={false}
          playWhenInactive={false}
          controls={false}
          focusable={false}
          onLoad={({ duration: length }) => {
            setLoading(false);
            const total = Number.isFinite(length) && length > 0 ? length : 0;
            durationRef.current = total;
            setDuration(total);
            if (!live && position.current > 0 && total > 0)
              ref.current?.seek(Math.min(position.current, Math.max(0, total - 1)));
          }}
          onBuffer={({ isBuffering }) => setLoading(isBuffering)}
          onProgress={({ currentTime, seekableDuration }) => {
            if (live || ended.current) return;
            position.current = Math.max(0, currentTime);
            setSeekable(Number.isFinite(seekableDuration) && seekableDuration > 0);
            if (Date.now() - lastSaved.current >= 5000) {
              lastSaved.current = Date.now();
              progressCallback.current(position.current);
            }
          }}
          onSeek={({ currentTime }) => {
            if (ended.current) return;
            position.current = Math.max(0, currentTime);
          }}
          progressUpdateInterval={1000}
          onEnd={() => {
            if (ended.current) return;
            ended.current = true;
            position.current = 0;
            onEnd();
          }}
          onError={() => {
            setError(true);
            setLoading(false);
            setVisible(true);
          }}
        />
      )}
      {!visible && !error && (
        <Pressable
          ref={catcher}
          focusable
          isTVSelectable
          hasTVPreferredFocus
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Mostrar controles da reprodução"
          onPress={interact}
        />
      )}
      {!error && (
        <PlayerControls
          item={item}
          visible={visible}
          paused={paused}
          duration={duration}
          position={position}
          seekable={seekable && duration > 0 && !loading}
          onPreviousEpisode={episodeControls ? () => moveEpisode(-1) : undefined}
          onNextEpisode={episodeControls ? () => moveEpisode(1) : undefined}
          canPreviousEpisode={episodeControls?.previous || false}
          canNextEpisode={episodeControls?.next || false}
          onPause={togglePause}
          onSeek={(offset) => seekTo(position.current + offset)}
          onSeekTo={seekTo}
          onSeeking={setScrubbing}
          onClose={onClose}
          onHide={hide}
          onInteraction={interact}
        />
      )}
      {loading && !error && (
        <View style={styles.loadingContainer} pointerEvents="none">
          <View style={styles.loading}>
            <ActivityIndicator color="#38e883" size="small" />
            <Text style={styles.loadingText}>Carregando vídeo…</Text>
          </View>
        </View>
      )}
      {error && (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorEyebrow}>Reprodução indisponível</Text>
            <Text style={styles.errorTitle} numberOfLines={2}>
              {item.name}
            </Text>
            <Text accessibilityRole="alert" style={styles.errorText}>
              Não foi possível reproduzir este conteúdo. Confira a conexão e a disponibilidade ou
              compatibilidade do stream.
            </Text>
            <View style={styles.errorActions}>
              <Button
                small
                preferred
                primary
                title="Tentar novamente"
                onPress={() => {
                  setError(false);
                  setLoading(true);
                  setSeekable(false);
                  setAttempt((value) => value + 1);
                }}
              />
              <Button small title="Voltar ao catálogo" onPress={onClose} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#0b1712e8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 9,
  },
  loadingText: { color: '#daeadd', fontSize: 13 },
  errorContainer: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  errorCard: {
    width: '100%',
    maxWidth: 500,
    padding: 22,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.surface,
  },
  errorEyebrow: { color: '#8fb79e', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  errorTitle: { color: '#f0f6f2', fontSize: 20, lineHeight: 26, fontWeight: '700', marginTop: 10 },
  errorText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  errorActions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, gap: 6 },
});

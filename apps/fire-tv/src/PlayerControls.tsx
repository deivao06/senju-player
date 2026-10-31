import React, { memo, useEffect, useState, type RefObject } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { PlaylistItem } from '@senju/iptv';
import { PlayerControlButton } from './PlayerControlButton';
import { SeekBar } from './SeekBar';
import { colors } from './theme';

type Props = {
  item: PlaylistItem;
  visible: boolean;
  paused: boolean;
  duration: number;
  position: RefObject<number>;
  seekable: boolean;
  onPause: () => void;
  onPreviousEpisode?: () => void;
  onNextEpisode?: () => void;
  canPreviousEpisode: boolean;
  canNextEpisode: boolean;
  onSeek: (seconds: number) => void;
  onSeekTo: (seconds: number) => void;
  onSeeking: (active: boolean) => void;
  onClose: () => void;
  onHide: () => void;
  onInteraction: () => void;
};
/** Progress only rerenders this overlay while visible, never the native video each second. */
export const PlayerControls = memo(function PlayerControls(props: Props) {
  const [position, setPosition] = useState(props.position.current);
  const [logoFailed, setLogoFailed] = useState(false);
  const live = props.item.category === 'CHANNEL';
  useEffect(() => {
    if (!props.visible || live) return;
    setPosition(props.position.current);
    const ticker = setInterval(() => setPosition(props.position.current), 1000);
    return () => clearInterval(ticker);
  }, [props.visible, props.position, live]);
  useEffect(() => setLogoFailed(false), [props.item.tvgLogo]);
  if (!props.visible) return null;
  const logo =
    !logoFailed && /^https?:\/\//i.test(props.item.tvgLogo || '') ? props.item.tvgLogo : null;
  return (
    <>
      <View style={styles.heading} pointerEvents="none">
        {logo && (
          <Image
            source={{ uri: logo }}
            style={styles.logo}
            resizeMode="contain"
            resizeMethod="resize"
            onError={() => setLogoFailed(true)}
          />
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {props.item.name}
          </Text>
          {!!props.item.groupName && (
            <Text style={styles.group} numberOfLines={1}>
              {props.item.groupName}
            </Text>
          )}
        </View>
        {live && (
          <View style={styles.liveBadge}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>AO VIVO</Text>
          </View>
        )}
      </View>
      <View style={styles.panel}>
        {!live && (
          <SeekBar
            position={position}
            duration={props.duration}
            enabled={props.seekable}
            onSeek={props.onSeekTo}
            onSeeking={props.onSeeking}
            onInteraction={props.onInteraction}
          />
        )}
        <View style={styles.actions}>
          <PlayerControlButton
            icon="back"
            labelAlign="start"
            label="Voltar ao catálogo"
            onFocus={props.onInteraction}
            onPress={props.onClose}
          />
          <View style={styles.transport}>
            {props.onPreviousEpisode && (
              <PlayerControlButton
                icon="previousEpisode"
                label="Episódio anterior"
                disabled={!props.canPreviousEpisode}
                onFocus={props.onInteraction}
                onPress={props.onPreviousEpisode}
              />
            )}
            {!live && (
              <PlayerControlButton
                icon="rewind"
                label="Voltar 30 segundos"
                disabled={!props.seekable}
                onFocus={props.onInteraction}
                onPress={() => props.onSeek(-30)}
              />
            )}
            <PlayerControlButton
              large
              preferred
              icon={props.paused ? 'play' : 'pause'}
              label={props.paused ? 'Reproduzir' : 'Pausar'}
              onFocus={props.onInteraction}
              onPress={props.onPause}
            />
            {!live && (
              <PlayerControlButton
                icon="forward"
                label="Avançar 30 segundos"
                disabled={!props.seekable}
                onFocus={props.onInteraction}
                onPress={() => props.onSeek(30)}
              />
            )}
            {props.onNextEpisode && (
              <PlayerControlButton
                icon="nextEpisode"
                label="Próximo episódio"
                disabled={!props.canNextEpisode}
                onFocus={props.onInteraction}
                onPress={props.onNextEpisode}
              />
            )}
          </View>
          <PlayerControlButton
            icon="hide"
            labelAlign="end"
            label="Ocultar controles"
            onFocus={props.onInteraction}
            onPress={props.onHide}
          />
        </View>
      </View>
    </>
  );
});
const styles = StyleSheet.create({
  heading: {
    position: 'absolute',
    top: 20,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.player,
    padding: 12,
    borderRadius: 10,
  },
  logo: { width: 44, height: 44, backgroundColor: colors.surface, borderRadius: 6 },
  info: { flex: 1 },
  eyebrow: { color: '#85b497', fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  title: { color: '#f1f7f3', fontSize: 18, lineHeight: 23, fontWeight: '700', marginTop: 3 },
  group: { color: colors.muted, fontSize: 11, marginTop: 3 },
  liveBadge: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderRadius: 5,
    backgroundColor: '#183526',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#38e883' },
  liveText: { color: '#a5edbd', fontSize: 10, fontWeight: '800' },
  panel: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 16,
    padding: 12,
    backgroundColor: 'transparent',
  },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingBottom: 28 },
  transport: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
});

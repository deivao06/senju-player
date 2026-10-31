import React, { memo, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlaylistItem } from '@senju/iptv';
import { useTVFocus } from './useTVFocus';
import { Icon } from './Icon';
import { colors } from './theme';
import { catalogPresentation } from './catalogPresentation';

type Props = {
  item: PlaylistItem;
  width: number;
  height: number;
  poster: boolean;
  showType?: boolean;
  favorite: boolean;
  preferred: boolean;
  leftTarget?: number;
  topTarget?: number;
  onFocus: (node: View | null) => void;
  onPress: () => void;
  onFavorite: () => void;
  focusRef?: React.RefObject<View | null>;
};
export const CatalogCard = memo(function CatalogCard({
  item,
  width,
  height,
  poster,
  showType,
  favorite,
  preferred,
  leftTarget,
  topTarget,
  onFocus,
  onPress,
  onFavorite,
  focusRef,
}: Props) {
  const { title, quality } = catalogPresentation(item.name);
  const internalRef = useRef<View>(null);
  const ref = focusRef || internalRef;
  const { focused, updateFocus } = useTVFocus(ref, () => onFocus(ref.current));
  const [failed, setFailed] = useState(false);
  const image = !failed && /^https?:\/\//i.test(item.tvgLogo || '') ? item.tvgLogo : undefined;
  useEffect(() => {
    setFailed(false);
  }, [item.tvgLogo]);
  useEffect(() => {
    if (!preferred) return;
    const frame = requestAnimationFrame(() => ref.current?.requestTVFocus());
    return () => cancelAnimationFrame(frame);
  }, [preferred, ref]);
  return (
    <Pressable
      ref={ref}
      focusable
      isTVSelectable
      hasTVPreferredFocus={preferred}
      nextFocusLeft={leftTarget}
      nextFocusUp={topTarget}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${favorite ? ', favorito' : ''}`}
      accessibilityHint="OK para abrir. Segure OK para alterar favorito."
      onFocus={() => updateFocus(true)}
      onBlur={() => updateFocus(false)}
      onPress={onPress}
      onLongPress={onFavorite}
      delayLongPress={650}
      style={[styles.card, { width, height }, focused && styles.focus]}
    >
      <View style={[styles.art, !poster && styles.logoArt]} pointerEvents="none">
        {image ? (
          <Image
            source={{ uri: image }}
            resizeMode={poster ? 'cover' : 'contain'}
            resizeMethod="resize"
            style={styles.image}
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.initials}>{item.name.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        {showType && (
          <Text style={styles.typeBadge}>{item.category === 'SERIES' ? 'Série' : 'Filme'}</Text>
        )}
        {!!quality && <Text style={styles.quality}>{quality}</Text>}
        {favorite && (
          <View style={styles.badge}>
            <Icon name="heart" size={13} color={colors.accent} />
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={[styles.name, focused && styles.focusName]}>
        {title}
      </Text>
    </Pressable>
  );
});
const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 9,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  focus: {
    borderColor: colors.focus,
    backgroundColor: colors.surface,
    transform: [{ scale: 1.025 }],
  },
  art: { flex: 1, margin: 2, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.surface },
  logoArt: { padding: 6, backgroundColor: colors.surface },
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.muted, fontSize: 27, fontWeight: '800' },
  fallbackLabel: { color: '#568468', fontSize: 8, marginTop: 4 },
  name: {
    height: 35,
    paddingHorizontal: 5,
    paddingTop: 2,
    color: colors.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
  focusName: { color: colors.focus, fontWeight: '700' },
  quality: {
    position: 'absolute',
    left: 5,
    top: 5,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.background,
  },
  typeBadge: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.background,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.surface,
    borderRadius: 6,
    padding: 6,
  },
});

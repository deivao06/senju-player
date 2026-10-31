import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  findNodeHandle,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ItemCategory } from '@senju/iptv';
import type { CategoryGroups } from './catalogNavigation';
import { homePlatforms, platformCategory } from './homePlatforms';
import { Button } from './Button';
import { colors } from './theme';
import { useTVFocus } from './useTVFocus';

const logos: Record<string, number> = {
  netflix: require('./assets/platforms/netflix.png'),
  globoplay: require('./assets/platforms/globoplay.png'),
  prime: require('./assets/platforms/prime.png'),
  disney: require('./assets/platforms/disney.png'),
  max: require('./assets/platforms/max.png'),
};
type Platform = ReturnType<typeof homePlatforms>[number];
function PlatformTile({
  platform,
  width,
  height,
  preferred,
  leftTarget,
  topTarget,
  onFocus,
  onPress,
  pending,
}: {
  platform: Platform;
  width: number;
  height: number;
  preferred: boolean;
  pending: boolean;
  leftTarget?: number;
  topTarget?: number;
  onFocus: () => void;
  onPress: () => void;
}) {
  const ref = useRef<View>(null);
  const disabled = pending || !platform.types.length;
  const { focused, updateFocus } = useTVFocus(ref, onFocus);
  useEffect(() => {
    if (!preferred || disabled) return;
    const frame = requestAnimationFrame(() => ref.current?.requestTVFocus());
    return () => cancelAnimationFrame(frame);
  }, [preferred, disabled]);
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      disabled={disabled}
      focusable={!disabled}
      isTVSelectable={!disabled}
      hasTVPreferredFocus={preferred && !disabled}
      nextFocusLeft={leftTarget}
      nextFocusUp={topTarget}
      accessibilityRole="button"
      accessibilityLabel={`${platform.label}${disabled ? ', sem categorias disponíveis nesta lista' : ''}`}
      accessibilityState={{ disabled }}
      onFocus={() => updateFocus(true)}
      onBlur={() => updateFocus(false)}
      style={[
        styles.tile,
        { width, height, backgroundColor: platform.background },
        focused && styles.focus,
        disabled && styles.disabled,
      ]}
    >
      <Image
        source={logos[platform.key]}
        resizeMode="contain"
        style={[
          styles.logo,
          height < 130 && { height: 36, marginBottom: 6 },
          ['disney', 'max', 'prime'].includes(platform.key) && { tintColor: colors.text },
        ]}
      />
      <Text style={styles.platformName}>{platform.label}</Text>
      <Text style={styles.types} numberOfLines={1}>
        {pending
          ? 'Identificando…'
          : disabled
            ? 'Sem categorias na lista'
            : platform.types
                .map((type) =>
                  type === 'MOVIE' ? 'Filmes' : type === 'SERIES' ? 'Séries' : 'Ao vivo',
                )
                .join(' · ')}
      </Text>
    </Pressable>
  );
}
export function HomeScreen({
  groups,
  pending,
  focusKey,
  menuTag,
  onFocus,
  onPlatform,
  onCategory,
  onNew,
}: {
  groups: CategoryGroups;
  pending: boolean;
  focusKey: string | null;
  menuTag?: number;
  onFocus: (key: string) => void;
  onPlatform: (key: string, type: ItemCategory) => void;
  onCategory: (type: ItemCategory) => void;
  onNew: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const platforms = useMemo(() => homePlatforms(groups), [groups]);
  const columns = width >= 860 ? 5 : 3;
  const tileWidth = Math.floor((width - 56 - (columns - 1) * 12) / columns);
  const tileHeight = height < 430 ? 112 : 142;
  const preferred =
    platforms.find((platform) => platform.key === focusKey && platform.types.length)?.key ||
    platforms.find((platform) => platform.types.length)?.key;
  const firstShortcut = useRef<View>(null);
  const list = useRef<FlatList<Platform>>(null);
  const [topTag, setTopTag] = useState<number>();
  const [listHeight, setListHeight] = useState(Math.max(120, height - 200));
  useEffect(() => setTopTag(findNodeHandle(firstShortcut.current) ?? undefined), []);
  const initial = Math.max(
    0,
    platforms.findIndex((platform) => platform.key === preferred),
  );
  return (
    <View style={styles.home}>
      <View style={styles.shortcuts}>
        {(['CHANNEL', 'MOVIE', 'SERIES'] as const).map((type, index) => (
          <Button
            key={type}
            small
            quiet
            title={type === 'CHANNEL' ? 'Ao vivo' : type === 'MOVIE' ? 'Filmes' : 'Séries'}
            disabled={pending}
            focusRef={index === 0 ? firstShortcut : undefined}
            preferred={!pending && !preferred && index === 0}
            style={styles.shortcut}
            onPress={() => onCategory(type)}
          />
        ))}
        <Button
          small
          quiet
          disabled={pending}
          title="Novidades"
          style={styles.shortcut}
          onPress={onNew}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.title}>Plataformas da sua lista</Text>
        {pending && <ActivityIndicator size="small" color={colors.accent} />}
      </View>
      <View
        style={styles.list}
        onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
      >
        <FlatList
          key={columns}
          ref={list}
          data={platforms}
          numColumns={columns}
          style={{ height: listHeight }}
          keyExtractor={(platform) => platform.key}
          initialNumToRender={5}
          removeClippedSubviews={false}
          initialScrollIndex={initial >= columns ? Math.floor(initial / columns) : undefined}
          getItemLayout={(_, index) => ({
            length: tileHeight + 12,
            offset: (tileHeight + 12) * index,
            index,
          })}
          contentContainerStyle={styles.content}
          columnWrapperStyle={styles.row}
          renderItem={({ item: platform, index }) => (
            <PlatformTile
              platform={platform}
              width={tileWidth}
              height={tileHeight}
              pending={pending}
              preferred={!pending && platform.key === preferred}
              leftTarget={index % columns === 0 ? menuTag : undefined}
              topTarget={index < columns ? topTag : undefined}
              onFocus={() => {
                onFocus(platform.key);
                list.current?.scrollToIndex({
                  index: Math.floor(index / columns),
                  viewPosition: 0.5,
                  animated: false,
                });
              }}
              onPress={() => {
                const type = platformCategory(platform.types);
                if (type) onPlatform(platform.key, type);
              }}
            />
          )}
          ListFooterComponent={
            !pending && !platforms.some((platform) => platform.types.length) ? (
              <Text style={styles.note}>
                Esta lista não identifica essas plataformas. Você pode navegar por Ao vivo, Filmes e
                Séries.
              </Text>
            ) : null
          }
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  home: { flex: 1, paddingTop: 14 },
  shortcuts: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  shortcut: { flex: 1, margin: 0, backgroundColor: colors.surface },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '600' },
  list: { flex: 1 },
  content: { padding: 4 },
  row: { gap: 12, marginBottom: 12 },
  tile: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focus: { borderColor: colors.focus, transform: [{ scale: 1.025 }] },
  disabled: { opacity: 0.45 },
  logo: { width: '82%', height: 52, marginBottom: 10 },
  platformName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  types: { color: colors.muted, fontSize: 10, marginTop: 5 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
});

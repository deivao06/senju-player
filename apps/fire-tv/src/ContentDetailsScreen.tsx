import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TVFocusGuideView,
  View,
  findNodeHandle,
  useWindowDimensions,
} from 'react-native';
import type { MediaInfo, PlaylistItem } from '@senju/iptv';
import { Button } from './Button';
import { Icon } from './Icon';
import { colors } from './theme';
import { useTVFocus } from './useTVFocus';
import { detailPlayTarget, type DetailEpisode } from './contentDetails';
import type { LibraryState } from './storage';

type Props = {
  item: PlaylistItem;
  info: MediaInfo | null;
  episodes: DetailEpisode[] | null;
  requiresEpisodes: boolean;
  library: LibraryState;
  loading: boolean;
  error: string;
  initialFocus: string;
  onFocus(key: string): void;
  onPlay(item: PlaylistItem): void;
  onBack(): void;
  onRetry(): void;
  onFavorite(): void;
};
const imageUrl = (uri?: string) =>
  typeof uri === 'string' && /^https?:\/\/[^\s]+$/i.test(uri) ? uri : undefined;
const Artwork = memo(function Artwork({
  uri,
  style,
  background = false,
}: {
  uri?: string;
  style: React.ComponentProps<typeof Image>['style'];
  background?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const valid = !failed && imageUrl(uri);
  return valid ? (
    <Image
      source={{ uri: valid }}
      style={style}
      resizeMode="cover"
      resizeMethod="resize"
      fadeDuration={0}
      onError={() => setFailed(true)}
    />
  ) : background ? null : (
    <View style={[style, styles.artFallback]}>
      <Icon name="play" size={26} color={colors.muted} />
    </View>
  );
});
const EpisodeRow = memo(function EpisodeRow({
  item,
  compact,
  progress,
  preferred,
  topTag,
  onFocus,
  onPlay,
}: {
  item: DetailEpisode;
  compact: boolean;
  progress: number;
  preferred: boolean;
  topTag?: number;
  onFocus(node: View | null): void;
  onPlay(): void;
}) {
  const ref = useRef<View>(null);
  const { focused, updateFocus } = useTVFocus(ref, () => onFocus(ref.current));
  useEffect(() => {
    if (!preferred) return;
    const frame = requestAnimationFrame(() => ref.current?.requestTVFocus());
    return () => cancelAnimationFrame(frame);
  }, [preferred]);
  return (
    <Pressable
      ref={ref}
      focusable
      isTVSelectable
      hasTVPreferredFocus={preferred}
      nextFocusUp={topTag}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      onFocus={() => updateFocus(true)}
      onBlur={() => updateFocus(false)}
      onPress={onPlay}
      style={[styles.episode, { height: compact ? 82 : 98 }, focused && styles.episodeFocus]}
    >
      <Text style={styles.episodeNumber}>{String(item.episodeNumber).padStart(2, '0')}</Text>
      <Artwork
        uri={item.tvgLogo}
        style={{ width: compact ? 94 : 116, height: compact ? 54 : 66, borderRadius: 6 }}
      />
      <View style={styles.episodeCopy}>
        <Text numberOfLines={1} style={styles.episodeTitle}>
          {item.name.replace(/^T\d+ E\d+ — /, '')}
        </Text>
        {!!item.plot && (
          <Text numberOfLines={compact ? 1 : 2} style={styles.episodePlot}>
            {item.plot}
          </Text>
        )}
        {!!(item.duration || progress > 0) && (
          <Text numberOfLines={1} style={styles.episodeMeta}>
            {[item.duration, progress > 0 ? 'Em andamento' : ''].filter(Boolean).join('  ·  ')}
          </Text>
        )}
      </View>
      <Icon name="play" size={18} color={focused ? colors.accent : colors.muted} />
    </Pressable>
  );
});

export function ContentDetailsScreen(props: Props) {
  const { width, height } = useWindowDimensions();
  const compact = height < 430;
  const list = useRef<FlatList<DetailEpisode>>(null);
  const back = useRef<View>(null),
    play = useRef<View>(null),
    seasonTab = useRef<View>(null);
  const seasonScroll = useRef<ScrollView>(null);
  const synopsisScroll = useRef<ScrollView>(null);
  const synopsisButton = useRef<View>(null);
  const [expanded, setExpanded] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [topTag, setTopTag] = useState<number>();
  const restoring = useRef(props.initialFocus !== 'play');
  const [restoreFocus, setRestoreFocus] = useState(true);
  const synopsisOffset = useRef(0);
  const seasons = useMemo(
    () => [...new Set((props.episodes || []).map((ep) => ep.seasonNumber))],
    [props.episodes],
  );
  const initialEpisode = props.episodes?.find((ep) => ep.id === props.initialFocus);
  const [selectedSeason, setSeason] = useState<number | undefined>(initialEpisode?.seasonNumber);
  const season = seasons.includes(selectedSeason as number) ? selectedSeason : seasons[0];
  const displayed = useMemo(
    () => (props.episodes || []).filter((ep) => ep.seasonNumber === season),
    [props.episodes, season],
  );
  const target = useMemo(
    () => detailPlayTarget(props.item, props.episodes, props.requiresEpisodes, props.library),
    [
      props.item,
      props.episodes,
      props.requiresEpisodes,
      props.library.recent,
      props.library.progress,
    ],
  );
  const resumable = !!target && (props.library.progress[target.id] || 0) > 0;
  const targetEpisode = target as DetailEpisode | null;
  const playLabel =
    targetEpisode?.seasonNumber !== undefined
      ? `${resumable ? 'Continuar' : 'Assistir'} T${targetEpisode.seasonNumber} · E${targetEpisode.episodeNumber}`
      : resumable
        ? 'Continuar'
        : 'Assistir agora';
  const title = props.info?.name || props.item.name;
  const synopsis = props.info?.plot || '';
  const metadata = [
    props.item.category === 'SERIES' ? 'Série' : 'Filme',
    props.info?.releaseDate?.match(/\b(?:19|20)\d{2}\b/)?.[0],
    props.info?.genre,
    props.info?.duration,
    props.info?.rating ? `Nota ${props.info.rating}` : '',
  ]
    .filter(Boolean)
    .join('  ·  ');
  const favorite = props.library.favorites.includes(props.item.id);
  function focus(key: string) {
    if (key !== props.initialFocus) setRestoreFocus(false);
    props.onFocus(key);
  }
  function top() {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }
  function closeSynopsis() {
    setExpanded(false);
    requestAnimationFrame(() => synopsisButton.current?.requestTVFocus());
  }
  useEffect(() => {
    if (!expanded) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSynopsis();
      return true;
    });
    return () => subscription.remove();
  }, [expanded]);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setTopTag(findNodeHandle(seasonTab.current || play.current || back.current) ?? undefined),
    );
    return () => cancelAnimationFrame(frame);
  }, [season, seasons.length, props.loading]);
  useEffect(() => {
    if (!headerHeight || !restoring.current || !displayed.length) return;
    const index = displayed.findIndex((ep) => ep.id === props.initialFocus);
    if (index < 0) return;
    restoring.current = false;
    requestAnimationFrame(() =>
      list.current?.scrollToOffset({
        offset: headerHeight + index * (compact ? 82 : 98),
        animated: false,
      }),
    );
  }, [headerHeight, displayed, compact, props.initialFocus]);
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.nav}>
        <Button
          title="Voltar"
          iconName="left"
          quiet
          small
          focusRef={back}
          onFocus={top}
          onPress={props.onBack}
        />
        <Text style={styles.brand}>
          SENJU <Text style={{ color: colors.accent }}>PLAYER</Text>
        </Text>
        <Text style={styles.navContext} numberOfLines={1}>
          {props.item.category === 'SERIES' ? 'Detalhes da série' : 'Detalhes do filme'}
        </Text>
      </View>
      <TVFocusGuideView autoFocus style={{ flex: 1 }}>
        <FlatList
          ref={list}
          data={displayed}
          keyExtractor={(item) => item.id}
          extraData={props.library.progress}
          removeClippedSubviews={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          contentContainerStyle={styles.content}
          getItemLayout={(_, index) => ({
            index,
            length: compact ? 82 : 98,
            offset: headerHeight + index * (compact ? 82 : 98),
          })}
          ListHeaderComponent={
            <View onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
              <View
                style={[
                  styles.hero,
                  {
                    paddingVertical: compact ? 12 : 22,
                    minHeight: props.item.category === 'MOVIE' ? height * 0.7 : undefined,
                  },
                ]}
              >
                <View style={styles.backdrop} pointerEvents="none">
                  <Artwork
                    background
                    uri={props.info?.backdrop}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#060b09b8' }]} />
                </View>
                <Artwork
                  uri={props.info?.cover || props.item.tvgLogo}
                  style={{
                    width: compact ? 88 : props.item.category === 'MOVIE' ? 150 : 120,
                    height: compact ? 132 : props.item.category === 'MOVIE' ? 225 : 180,
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                  }}
                />
                <View style={styles.heroCopy}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.title,
                      { fontSize: compact ? 22 : 28, lineHeight: compact ? 27 : 34 },
                    ]}
                  >
                    {title}
                  </Text>
                  <Text numberOfLines={1} style={styles.metadata}>
                    {metadata}
                  </Text>
                  <Text numberOfLines={compact ? 2 : 3} style={styles.synopsis}>
                    {synopsis ||
                      (props.loading
                        ? 'Carregando sinopse…'
                        : 'A fonte não informou uma sinopse para este título.')}
                  </Text>
                  <View style={styles.actions}>
                    <Button
                      title={playLabel}
                      iconName="play"
                      primary
                      small
                      focusRef={play}
                      preferred={restoreFocus && props.initialFocus === 'play' && !expanded}
                      disabled={!target}
                      style={{ width: Math.min(210, Math.max(155, width * 0.23)) }}
                      onFocus={() => {
                        top();
                        focus('play');
                      }}
                      onPress={() => {
                        if (target) {
                          focus('play');
                          props.onPlay(target);
                        }
                      }}
                    />
                    <Button
                      title={favorite ? 'Remover favorito' : 'Adicionar favorito'}
                      accessibilityLabel={
                        favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
                      }
                      iconName="heart"
                      iconOnly
                      small
                      quiet
                      selected={favorite}
                      style={{ width: 42, paddingHorizontal: 7 }}
                      onFocus={() => {
                        top();
                        focus('favorite');
                      }}
                      onPress={props.onFavorite}
                    />
                    {!!synopsis && (
                      <Button
                        title="Sinopse"
                        small
                        quiet
                        focusRef={synopsisButton}
                        style={{ width: 92 }}
                        onFocus={() => {
                          top();
                          focus('synopsis');
                        }}
                        onPress={() => {
                          synopsisOffset.current = 0;
                          setExpanded(true);
                        }}
                      />
                    )}
                  </View>
                </View>
              </View>
              {props.loading && (
                <View style={styles.status}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.muted}>Carregando detalhes…</Text>
                </View>
              )}
              {!!props.error && (
                <View style={styles.status}>
                  <Text
                    style={[styles.muted, { flex: 1, color: '#ffc1c1' }]}
                    accessibilityRole="alert"
                  >
                    {props.error}
                  </Text>
                  <Button title="Tentar novamente" small onPress={props.onRetry} />
                </View>
              )}
              {seasons.length > 0 && (
                <View style={styles.seasons}>
                  <ScrollView ref={seasonScroll} horizontal showsHorizontalScrollIndicator={false}>
                    {seasons.map((number, index) => (
                      <Button
                        key={number}
                        title={number === 0 ? 'Especiais' : `Temporada ${number}`}
                        quiet
                        small
                        selected={number === season}
                        focusRef={number === season ? seasonTab : undefined}
                        style={{ width: 144 }}
                        onFocus={() => {
                          focus(`season-${number}`);
                          top();
                          seasonScroll.current?.scrollTo({
                            x: Math.max(0, index * 148 - width / 3),
                            animated: false,
                          });
                        }}
                        onPress={() => {
                          restoring.current = false;
                          setSeason(number);
                          top();
                          focus(`season-${number}`);
                        }}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}
              {props.requiresEpisodes && !props.loading && (
                <View style={styles.episodesHeading}>
                  <Text style={styles.sectionTitle}>Episódios</Text>
                  <Text style={styles.muted}>{displayed.length} nesta temporada</Text>
                </View>
              )}
              {props.requiresEpisodes &&
                !props.loading &&
                !props.error &&
                !props.episodes?.length && (
                  <Text style={styles.empty}>
                    A fonte não disponibilizou episódios para esta série.
                  </Text>
                )}
            </View>
          }
          renderItem={({ item, index }) => (
            <EpisodeRow
              item={item}
              compact={compact}
              progress={props.library.progress[item.id] || 0}
              preferred={restoreFocus && props.initialFocus === item.id && !expanded}
              topTag={index === 0 ? topTag : undefined}
              onFocus={() => {
                focus(item.id);
                list.current?.scrollToOffset({
                  offset: Math.max(
                    0,
                    headerHeight + index * (compact ? 82 : 98) - (compact ? 82 : 98),
                  ),
                  animated: false,
                });
              }}
              onPlay={() => props.onPlay(item)}
            />
          )}
        />
      </TVFocusGuideView>
      {expanded && (
        <View style={styles.overlay}>
          <TVFocusGuideView
            autoFocus
            trapFocusLeft
            trapFocusRight
            trapFocusUp
            trapFocusDown
            style={styles.synopsisPanel}
          >
            <View style={styles.synopsisHeader}>
              <Text style={styles.sectionTitle}>Sinopse</Text>
              <Button title="Voltar aos detalhes" small preferred onPress={closeSynopsis} />
            </View>
            <Text numberOfLines={2} style={styles.synopsisTitle}>
              {title}
            </Text>
            <ScrollView
              ref={synopsisScroll}
              style={{ flex: 1 }}
              onScroll={(event) => {
                synopsisOffset.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={64}
            >
              <Text style={styles.fullSynopsis}>{synopsis}</Text>
              {!!props.info?.cast && <Text style={styles.credits}>Elenco: {props.info.cast}</Text>}
              {!!props.info?.director && (
                <Text style={styles.credits}>Direção: {props.info.director}</Text>
              )}
            </ScrollView>
            <View style={styles.synopsisNavigation}>
              <Button
                title="Rolar para cima"
                small
                quiet
                onPress={() =>
                  synopsisScroll.current?.scrollTo({
                    y: Math.max(0, synopsisOffset.current - 120),
                    animated: false,
                  })
                }
              />
              <Button
                title="Rolar para baixo"
                small
                quiet
                onPress={() =>
                  synopsisScroll.current?.scrollTo({
                    y: synopsisOffset.current + 120,
                    animated: false,
                  })
                }
              />
            </View>
          </TVFocusGuideView>
        </View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 8,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: colors.stroke,
  },
  brand: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  navContext: { flex: 1, textAlign: 'right', color: colors.muted, fontSize: 12 },
  content: { paddingBottom: 20, paddingHorizontal: 4 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 22, overflow: 'hidden' },
  backdrop: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '72%' },
  heroCopy: { flex: 1, minWidth: 0, gap: 9 },
  title: { color: colors.text, fontWeight: '700', letterSpacing: -0.5 },
  metadata: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  synopsis: { color: colors.text, fontSize: 14, lineHeight: 22 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  artFallback: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  seasons: { paddingVertical: 6, borderTopWidth: 1, borderColor: colors.stroke },
  episodesHeading: { flexDirection: 'row', alignItems: 'baseline', gap: 14, paddingVertical: 9 },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  episode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  episodeFocus: { borderColor: colors.focus, backgroundColor: colors.surface },
  episodeNumber: { width: 26, color: colors.muted, fontSize: 14, fontVariant: ['tabular-nums'] },
  episodeCopy: { flex: 1, gap: 3 },
  episodeTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  episodePlot: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  episodeMeta: { color: colors.accent, fontSize: 12 },
  empty: { color: colors.muted, fontSize: 14, lineHeight: 22, paddingVertical: 24 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000bb',
    paddingHorizontal: '12%',
    paddingVertical: 24,
  },
  synopsisPanel: { flex: 1, backgroundColor: colors.surface, padding: 22, borderRadius: 14 },
  synopsisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  synopsisTitle: { color: colors.text, fontSize: 21, fontWeight: '700', marginVertical: 12 },
  fullSynopsis: { color: colors.text, fontSize: 15, lineHeight: 24 },
  credits: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 16 },
  synopsisNavigation: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 8 },
});

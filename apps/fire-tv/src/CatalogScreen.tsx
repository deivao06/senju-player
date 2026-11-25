import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  findNodeHandle,
  FlatList,
  Keyboard,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  type TextInput,
  TVFocusGuideView,
  useTVEventHandler,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ItemCategory, PlaylistItem } from '@senju/iptv';
import { Button } from './Button';
import { Input } from './Input';
import { CatalogCard } from './CatalogCard';
import { CatalogMenu } from './CatalogMenu';
import type { CatalogFilter } from './catalogFilter';
import { NEW_ITEMS_DAYS } from './catalogOrder';
import { HomeScreen } from './HomeScreen';
import { FocusedItemInfo, type FocusedItemHandle } from './FocusedItemInfo';
import { Icon } from './Icon';
import { colors } from './theme';
import {
  platformLabel,
  platformSections,
  type CategoryGroups,
  type CatalogSelection,
} from './catalogNavigation';
import { gridNeighbor, type GridDirection } from './catalogGridFocus';

const labels: Record<ItemCategory, string> = {
  CHANNEL: 'Ao vivo',
  MOVIE: 'Filmes',
  SERIES: 'Séries',
};
export type { CatalogFilter } from './catalogFilter';
type Props = {
  home: boolean;
  homeFocus: string | null;
  platformsPending: boolean;
  onHome: () => void;
  onHomeFocus: (key: string) => void;
  onPlatform: (key: string, type: ItemCategory) => void;
  sourceName: string;
  category: ItemCategory;
  group: string;
  categoryGroups: CategoryGroups;
  platform: string;
  query: string;
  filter: CatalogFilter;
  items: PlaylistItem[];
  favorites: string[];
  episodes: boolean;
  episodeSeasons?: Record<string, number>;
  initialIndex: number;
  loading: boolean;
  refreshing: boolean;
  cacheSavedAt?: number;
  onClearCache: () => Promise<void>;
  error: string;
  autoEnter: boolean;
  onAutoEnter: () => void;
  onCategory: (category: ItemCategory, selection?: CatalogSelection) => void;
  onQuery: (query: string) => void;
  onFilter: (filter: CatalogFilter) => void;
  onFocus: (index: number) => void;
  onOpen: (item: PlaylistItem) => void;
  onFavorite: (item: PlaylistItem) => void;
  onRefresh: () => void;
  onLists: () => void;
  onExit: () => void;
  onBackEpisodes: () => void;
  onCancel: () => void;
};
export function CatalogScreen(props: Props) {
  const { width, height } = useWindowDimensions();
  const [drawer, setDrawer] = useState<'categories' | 'profile' | 'settings' | null>(null);
  const seasons = useMemo(
    () => [...new Set(Object.values(props.episodeSeasons || {}))].sort((a, b) => a - b),
    [props.episodeSeasons],
  );
  const [season, setSeason] = useState<number | undefined>(
    () => props.episodeSeasons?.[props.items[props.initialIndex]?.id] ?? seasons[0],
  );
  const activeSeason = seasons.includes(season as number) ? season : seasons[0];
  useEffect(() => {
    setSeason(props.episodeSeasons?.[props.items[props.initialIndex]?.id] ?? seasons[0]);
  }, [props.episodeSeasons]);
  const displayed = useMemo(
    () =>
      props.episodes && props.episodeSeasons
        ? props.items.filter((item) => props.episodeSeasons?.[item.id] === activeSeason)
        : props.items,
    [props.items, props.episodes, props.episodeSeasons, activeSeason],
  );
  const seasonTab = useRef<View>(null);
  const seasonScroll = useRef<ScrollView>(null);
  const list = useRef<FlatList<PlaylistItem>>(null);
  const menu = useRef<View>(null);
  const focusedInfo = useRef<FocusedItemHandle>(null);
  const [datesInfo, setDatesInfo] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [cacheError, setCacheError] = useState('');
  const [cacheClearing, setCacheClearing] = useState(false);
  const profile = useRef<View>(null);
  const lastCard = useRef<View | null>(null);
  const searchEditing = useRef(false);
  const searchFocused = useRef(false);
  const keyboardOpen = useRef(false);
  const drawerOrigin = useRef<'menu' | 'grid'>('menu');
  const search = useRef<TextInput>(null);
  const headerBack = useRef<View>(null);
  const platformTab = useRef<View>(null);
  const platformTypes = useMemo(() => {
    const types =
      platformSections(props.categoryGroups).find((platform) => platform.key === props.platform)
        ?.types || [];
    return (['MOVIE', 'SERIES', 'CHANNEL'] as const).filter((type) => types.includes(type));
  }, [props.categoryGroups, props.platform]);
  const firstCard = useRef<View>(null);
  const [topTag, setTopTag] = useState<number>();
  const [leftTag, setLeftTag] = useState<number>();
  const [gridHeight, setGridHeight] = useState(Math.max(120, height - 152));
  const poster = props.category !== 'CHANNEL' && !props.episodes;
  const available = Math.max(180, width - 48 - 8);
  const columns = Math.max(2, Math.floor((available + 10) / 146));
  const cardWidth = Math.floor((available - (columns - 1) * 10) / columns);
  const cardHeight = Math.round(cardWidth * (poster ? 1.2 : 0.55)) + 47;
  const rowHeight = cardHeight + 10;
  const cardRefs = useRef(new Map<number, React.RefObject<View | null>>());
  const [, refreshFocusLinks] = useState(0);
  function cardRef(index: number): React.RefObject<View | null> {
    if (index === 0) return firstCard;
    let ref = cardRefs.current.get(index);
    if (!ref) {
      ref = { current: null };
      cardRefs.current.set(index, ref);
    }
    return ref;
  }
  function focusTag(index: number, direction: GridDirection, edgeTag?: number) {
    const neighbor = gridNeighbor(index, direction, displayed.length, columns);
    const node = neighbor === undefined ? null : cardRef(neighbor).current;
    return (node && findNodeHandle(node)) || edgeTag;
  }
  useLayoutEffect(() => {
    for (const index of cardRefs.current.keys())
      if (index >= displayed.length) cardRefs.current.delete(index);
    refreshFocusLinks((value) => value + 1);
  }, [displayed, columns]);
  const initial = props.episodes
    ? Math.max(
        0,
        displayed.findIndex((item) => item.id === props.items[props.initialIndex]?.id),
      )
    : Math.min(props.initialIndex, Math.max(0, props.items.length - 1));
  const favorites = useMemo(() => new Set(props.favorites), [props.favorites]);
  const cardHandlers = useRef({
    onFocus: props.onFocus,
    onOpen: props.onOpen,
    onFavorite: props.onFavorite,
    items: props.items,
    episodes: props.episodes,
  });
  cardHandlers.current = {
    onFocus: props.onFocus,
    onOpen: props.onOpen,
    onFavorite: props.onFavorite,
    items: props.items,
    episodes: props.episodes,
  };
  const handleCardFocus = useCallback(
    (item: PlaylistItem, index: number, node: View | null) => {
      searchEditing.current = false;
      lastCard.current = node;
      focusedInfo.current?.show(item);
      cardHandlers.current.onFocus(
        cardHandlers.current.episodes ? cardHandlers.current.items.indexOf(item) : index,
      );
    },
    [],
  );
  const handleCardPress = useCallback((item: PlaylistItem) => cardHandlers.current.onOpen(item), []);
  const handleCardFavorite = useCallback(
    (item: PlaylistItem) => cardHandlers.current.onFavorite(item),
    [],
  );
  const openCategories = useCallback((origin: 'menu' | 'grid') => {
    drawerOrigin.current = origin;
    setDrawer('categories');
  }, []);
  const close = useCallback(() => {
    const target =
      drawer === 'categories'
        ? drawerOrigin.current === 'menu'
          ? menu.current
          : lastCard.current || menu.current
        : profile.current;
    setDrawer(null);
    requestAnimationFrame(() => target?.requestTVFocus());
  }, [drawer]);
  useEffect(() => {
    keyboardOpen.current = Keyboard.isVisible();
    const shown = Keyboard.addListener('keyboardDidShow', () => {
      keyboardOpen.current = true;
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      keyboardOpen.current = false;
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  useEffect(() => {
    setLeftTag(findNodeHandle(menu.current) ?? undefined);
  }, []);
  useEffect(() => {
    setTopTag(
      findNodeHandle(
        props.episodes
          ? seasonTab.current || headerBack.current
          : platformTab.current || search.current,
      ) ?? undefined,
    );
  }, [props.episodes, activeSeason, props.platform, props.category, props.home]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (drawer) {
        close();
        return true;
      }
      if (props.episodes || props.loading) return false;
      if (!props.home) {
        props.onHome();
        return true;
      }
      setDrawer('profile');
      return true;
    });
    return () => subscription.remove();
  }, [drawer, close, props.episodes, props.loading, props.home, props.onHome]);
  useTVEventHandler(
    useCallback(
      (event) => {
        if (event.eventKeyAction !== 1) return;
        if (
          !drawer &&
          !props.items.length &&
          event.eventType === 'left' &&
          searchFocused.current &&
          !keyboardOpen.current
        ) {
          menu.current?.requestTVFocus();
          return;
        }
        if (
          (drawer === 'categories' && event.eventType === 'right') ||
          ((drawer === 'profile' || drawer === 'settings') && event.eventType === 'left')
        )
          close();
      },
      [drawer, close, props.items.length],
    ),
  );
  function chooseContent(type: ItemCategory, selection: CatalogSelection = {}) {
    searchEditing.current = false;
    props.onCategory(type, selection);
    drawerOrigin.current = 'grid';
    close();
  }
  const sectionTitle = props.home
    ? 'Início'
    : props.episodes
      ? 'Episódios'
      : props.filter === 'new'
        ? 'Adicionados recentemente'
        : `${props.platform ? `${platformLabel(props.platform)} · ` : ''}${props.group || labels[props.category]}`;
  return (
    <SafeAreaView style={styles.screen}>
      <TVFocusGuideView focusable={!drawer} style={styles.main}>
        <View style={styles.nav}>
          <Button
            title="Menu"
            iconName="menu"
            iconOnly
            accessibilityLabel="Abrir menu de conteúdo"
            small
            quiet
            focusRef={menu}
            onPress={() => openCategories('menu')}
            style={styles.menuButton}
          />
          <Text style={[styles.brand, width < 760 && { fontSize: 14 }]}>
            SENJU<Text style={styles.brandAccent}> PLAYER</Text>
          </Text>
          <View style={styles.navDivider} />
          <View style={styles.heading}>
            <Text style={styles.title} numberOfLines={1}>
              {sectionTitle}
            </Text>
            <Text style={styles.count} numberOfLines={1} accessibilityLiveRegion="polite">
              {props.home ? (
                props.sourceName
              ) : (
                <>
                  {props.refreshing ? 'Atualizando catálogo · ' : ''}
                  {props.items.length.toLocaleString('pt-BR')} itens
                  {props.filter === 'new' ? ` · Últimos ${NEW_ITEMS_DAYS} dias` : ''}
                  {props.filter === 'favorites'
                    ? ' · Favoritos'
                    : props.filter === 'recent'
                      ? ' · Histórico'
                      : ''}
                </>
              )}
            </Text>
          </View>
          {!props.home && !props.episodes && props.filter === 'new' && (
            <Button
              small
              quiet
              iconOnly
              iconName="info"
              title="Sobre as datas"
              accessibilityLabel={
                datesInfo ? 'Ocultar explicação das datas' : 'Sobre as datas das novidades'
              }
              style={{ width: 36, minWidth: 36, paddingHorizontal: 6 }}
              onPress={() => setDatesInfo((value) => !value)}
            />
          )}
          {props.home ? null : props.episodes ? (
            <Button
              small
              focusRef={headerBack}
              title="Voltar às séries"
              onPress={props.onBackEpisodes}
            />
          ) : (
            <Input
              ref={search}
              accessibilityLabel={`Buscar em ${sectionTitle}`}
              placeholder={
                props.filter === 'new' ? 'Buscar novidades' : `Buscar em ${sectionTitle}`
              }
              leadingIcon="search"
              returnKeyType="search"
              nextFocusLeft={leftTag}
              onSubmitEditing={() => {
                search.current?.blur();
                (firstCard.current || menu.current)?.requestTVFocus();
              }}
              style={[styles.search, { width: Math.max(145, Math.min(240, width * 0.24)) }]}
              value={props.query}
              onFocus={() => {
                searchFocused.current = true;
                searchEditing.current = true;
              }}
              onBlur={() => {
                searchFocused.current = false;
              }}
              onChangeText={(value) => {
                searchEditing.current = true;
                props.onQuery(value);
                requestAnimationFrame(() =>
                  list.current?.scrollToOffset({ offset: 0, animated: false }),
                );
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
          <Button
            title="Perfil"
            iconName="profile"
            iconOnly
            small
            quiet
            focusRef={profile}
            accessibilityLabel="Perfil e opções da lista"
            onPress={() => setDrawer('profile')}
            style={styles.profileButton}
          />
        </View>
        {!!props.error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {props.error}
          </Text>
        )}
        {props.loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.muted}>
              {props.filter === 'new' ? 'Carregando filmes e séries…' : 'Carregando catálogo…'}
            </Text>
            <Button small title="Cancelar" onPress={props.onCancel} />
          </View>
        )}
        {props.home ? (
          <HomeScreen
            groups={props.categoryGroups}
            pending={props.platformsPending}
            focusKey={props.homeFocus}
            menuTag={leftTag}
            onFocus={props.onHomeFocus}
            onPlatform={(key, type) => {
              searchEditing.current = false;
              props.onPlatform(key, type);
            }}
            onCategory={(type) => {
              searchEditing.current = false;
              props.onCategory(type);
            }}
            onNew={() => {
              searchEditing.current = false;
              props.onFilter('new');
            }}
          />
        ) : (
          <>
            {!props.episodes &&
              props.platform &&
              platformTypes.length > 1 &&
              props.filter === 'all' && (
                <View style={{ flexDirection: 'row', gap: 8, paddingTop: 10 }}>
                  {platformTypes.map((type) => (
                    <Button
                      key={type}
                      small
                      quiet
                      title={labels[type]}
                      selected={props.category === type}
                      focusRef={props.category === type ? platformTab : undefined}
                      onPress={() => {
                        searchEditing.current = false;
                        props.onCategory(type, { platform: props.platform });
                      }}
                    />
                  ))}
                </View>
              )}
            {props.episodes && seasons.length > 0 && (
              <View style={{ height: 52 }}>
                <ScrollView ref={seasonScroll} horizontal showsHorizontalScrollIndicator={false}>
                  {seasons.map((number, index) => (
                    <Button
                      key={number}
                      small
                      quiet
                      selected={number === activeSeason}
                      focusRef={number === activeSeason ? seasonTab : undefined}
                      style={{ width: 146 }}
                      title={number === 0 ? 'Especiais' : `Temporada ${number}`}
                      onFocus={() =>
                        seasonScroll.current?.scrollTo({
                          x: Math.max(0, index * 150 - width / 3),
                          animated: false,
                        })
                      }
                      onPress={() => {
                        searchEditing.current = true;
                        setSeason(number);
                        const first = props.items.findIndex(
                          (item) => props.episodeSeasons?.[item.id] === number,
                        );
                        props.onFocus(Math.max(0, first));
                        list.current?.scrollToOffset({ offset: 0, animated: false });
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
            {datesInfo && props.filter === 'new' && !props.episodes && (
              <Text style={[styles.muted, { fontSize: 11, paddingTop: 8 }]}>
                Últimos {NEW_ITEMS_DAYS} dias · Filmes e séries. Séries sem data de inclusão usam a
                última atualização.
              </Text>
            )}
            <FocusedItemInfo
              key={`${props.category}-${props.platform}-${props.group}-${props.filter}-${props.query}-${activeSeason}`}
              ref={focusedInfo}
              favorites={props.favorites}
              empty={!displayed.length}
            />
            <View style={styles.body}>
              <View
                style={styles.grid}
                onLayout={(event) => setGridHeight(event.nativeEvent.layout.height)}
              >
                <FlatList
                  key={`${columns}-${props.category}-${props.platform}-${props.group}-${props.filter}-${props.episodes}-${activeSeason}}`}
                  ref={list}
                  style={{ height: gridHeight }}
                  data={displayed}
                  numColumns={columns}
                  extraData={props.favorites}
                  keyExtractor={(item) => `${item.category}:${item.id}`}
                  initialNumToRender={columns * 3}
                  maxToRenderPerBatch={columns * 2}
                  windowSize={5}
                  initialScrollIndex={
                    initial >= columns ? Math.floor(initial / columns) : undefined
                  }
                  getItemLayout={(_, index) => ({
                    length: rowHeight,
                    offset: rowHeight * index,
                    index,
                  })}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={styles.gridContent}
                  ListEmptyComponent={
                    !props.loading ? (
                      <View style={styles.empty}>
                        <Icon name="search" size={30} color={colors.muted} />
                        <Text style={styles.emptyTitle}>Nenhum conteúdo encontrado</Text>
                        <Text style={styles.muted}>
                          {props.query
                            ? 'Não encontramos títulos para esta busca.'
                            : props.filter === 'new'
                              ? 'A fonte não informou filmes ou séries com datas nos últimos 30 dias.'
                              : 'Esta seleção ainda não tem conteúdo disponível.'}
                        </Text>
                        {props.query ? (
                          <Button
                            small
                            quiet
                            title="Limpar busca"
                            nextFocusLeft={leftTag}
                            style={{ width: 200 }}
                            iconName="close"
                            onPress={() => {
                              props.onQuery('');
                              search.current?.requestTVFocus();
                            }}
                          />
                        ) : (
                          <Button
                            small
                            quiet
                            title="Escolher categoria"
                            nextFocusLeft={leftTag}
                            style={{ width: 200 }}
                            iconName="menu"
                            onPress={() => openCategories('grid')}
                          />
                        )}
                      </View>
                    ) : null
                  }
                  renderItem={({ item, index }) => (
                    <CatalogCard
                      item={item}
                      index={index}
                      width={cardWidth}
                      height={cardHeight}
                      poster={poster}
                      showType={props.filter === 'new' && !props.episodes}
                      favorite={favorites.has(item.id)}
                      preferred={!searchEditing.current && index === initial}
                      leftTarget={focusTag(index, 'left', index % columns === 0 ? leftTag : undefined)}
                      topTarget={focusTag(index, 'up', index < columns ? topTag : undefined)}
                      downTarget={focusTag(index, 'down')}
                      rightTarget={focusTag(index, 'right')}
                      focusRef={cardRef(index)}
                      onFocus={handleCardFocus}
                      onPress={handleCardPress}
                      onFavorite={handleCardFavorite}
                    />
                  )}
                />
              </View>
            </View>
          </>
        )}
      </TVFocusGuideView>
      {!!drawer && (
        <View style={[styles.overlay, drawer !== 'categories' && styles.overlayRight]}>
          <TVFocusGuideView
            key={drawer}
            autoFocus
            trapFocusLeft
            trapFocusRight
            trapFocusUp
            trapFocusDown
            style={[
              styles.drawer,
              { width: Math.min(320, width * 0.42), paddingVertical: height < 400 ? 12 : 22 },
            ]}
          >
            {drawer === 'categories' ? (
              <CatalogMenu
                home={props.home}
                onHome={() => {
                  props.onHome();
                  setDrawer(null);
                }}
                groups={props.categoryGroups}
                category={props.category}
                platform={props.platform}
                group={props.group}
                filter={props.filter}
                loading={props.loading}
                onSelect={chooseContent}
                onFilter={(value) => {
                  searchEditing.current = false;
                  props.onFilter(value);
                  drawerOrigin.current = 'grid';
                  close();
                }}
              />
            ) : drawer === 'settings' ? (
              <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.drawerTitle}>Configurações</Text>
                <Text style={styles.drawerNote}>Preferências deste dispositivo</Text>
                <Button
                  small
                  preferred
                  title={`Entrada automática: ${props.autoEnter ? 'ativada' : 'desativada'}`}
                  selected={props.autoEnter}
                  onPress={props.onAutoEnter}
                />
                <Text style={styles.settingsHelp}>
                  Abre a Home ao iniciar quando há exatamente uma lista salva. Você pode sair pelo
                  perfil.
                </Text>
                <Button
                  small
                  title={cacheClearing ? 'Limpando cache…' : 'Limpar cache dos catálogos'}
                  onPress={() => {
                    setCacheCleared(false);
                    setCacheError('');
                    setCacheClearing(true);
                    void props
                      .onClearCache()
                      .then(() => setCacheCleared(true))
                      .catch(() => setCacheError('Não foi possível limpar. Tente novamente.'))
                      .finally(() => setCacheClearing(false));
                  }}
                  disabled={props.loading || props.refreshing || cacheClearing}
                />
                {!!cacheError && (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {cacheError}
                  </Text>
                )}
                <Text accessibilityLiveRegion="polite" style={styles.settingsHelp}>
                  {cacheCleared
                    ? 'Cache limpo. Suas listas e seu progresso foram mantidos.'
                    : 'Mantém suas listas, favoritos e progresso. O catálogo aberto continua disponível.'}
                </Text>
                <View style={styles.spacer} />
                <Text style={styles.settingsHelp}>
                  Para favoritar, segure OK na capa de um título.
                </Text>
                <Text style={styles.settingsHelp}>
                  Senju Player TV · Reprodução nativa{'\n'}O Senju não fornece conteúdo.
                </Text>
                <Button small title="Voltar ao perfil" onPress={() => setDrawer('profile')} />
              </ScrollView>
            ) : (
              <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}
                >
                  <Text numberOfLines={2} style={[styles.drawerTitle, { flex: 1 }]}>
                    {props.sourceName}
                  </Text>
                  <Button
                    small
                    quiet
                    iconOnly
                    iconName="close"
                    title="Fechar perfil"
                    onPress={close}
                    style={{ width: 40, paddingHorizontal: 7 }}
                  />
                </View>
                <Button small preferred title="Trocar ou adicionar lista" onPress={props.onLists} />
                <Button
                  small
                  title={props.refreshing ? 'Atualizando catálogo…' : 'Atualizar catálogo'}
                  disabled={props.loading || props.refreshing}
                  onPress={() => {
                    setDrawer(null);
                    props.onRefresh();
                  }}
                />
                <Text style={styles.settingsHelp}>
                  {props.refreshing
                    ? 'Atualizando em segundo plano…'
                    : props.home
                      ? 'Sua lista fica salva neste dispositivo.'
                      : props.cacheSavedAt
                        ? `Catálogo salvo: ${new Date(props.cacheSavedAt).toLocaleString('pt-BR')}`
                        : 'Este catálogo ainda não está salvo em cache.'}
                </Text>
                <Button small title="Configurações" onPress={() => setDrawer('settings')} />
                <View style={styles.spacer} />
                <Text style={styles.settingsHelp}>
                  Sair mantém sua lista salva neste dispositivo.
                </Text>
                <Button small title="Sair da lista" onPress={props.onExit} />
              </ScrollView>
            )}
          </TVFocusGuideView>
        </View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  main: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: colors.stroke,
  },
  brand: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  brandAccent: { color: colors.accent },
  menuButton: { width: 40, minWidth: 40, margin: 0, paddingHorizontal: 7 },
  navDivider: { width: 1, height: 28, backgroundColor: '#2b3a30', marginHorizontal: 4 },
  avatar: { width: 20, height: 23, alignItems: 'center', justifyContent: 'center' },
  avatarHead: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#739383' },
  avatarBody: {
    width: 17,
    height: 9,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    backgroundColor: '#739383',
    marginTop: 2,
  },
  profileButton: { width: 40, minWidth: 40, height: 40, borderRadius: 12, paddingHorizontal: 7 },
  heading: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 14, fontWeight: '600' },
  count: { color: colors.muted, fontSize: 11, marginTop: 3 },
  search: {
    width: 240,
    minHeight: 38,
    paddingVertical: 3,
    fontSize: 13,
    lineHeight: 18,
    borderWidth: 2,
    borderColor: colors.stroke,
  },
  body: { flex: 1, paddingTop: 0 },
  grid: { flex: 1 },
  gridRow: { gap: 10, marginBottom: 10 },
  gridContent: { paddingVertical: 6, paddingHorizontal: 4 },
  muted: { fontSize: 12, color: colors.muted },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  error: {
    color: '#ffc1c1',
    fontSize: 12,
    padding: 8,
    backgroundColor: '#301c21',
    borderRadius: 6,
    marginVertical: 4,
  },
  empty: { padding: 30, alignItems: 'center', gap: 12 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: '#000000aa',
    flexDirection: 'row',
  },
  overlayRight: { justifyContent: 'flex-end' },
  drawer: {
    backgroundColor: colors.surface,
    paddingLeft: 32,
    paddingRight: 22,
    borderColor: '#31503a',
    borderWidth: 0,
  },
  drawerEyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  drawerTitle: { color: colors.text, fontSize: 21, fontWeight: '700' },
  drawerNote: { color: colors.muted, fontSize: 11, marginTop: 6, marginBottom: 14 },
  spacer: { flex: 1, minHeight: 12 },
  settingsHelp: { fontSize: 12, lineHeight: 18, color: colors.muted, padding: 8 },
});

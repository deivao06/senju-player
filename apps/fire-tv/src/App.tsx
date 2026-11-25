import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, SafeAreaView, StyleSheet, Text } from 'react-native';
import type {
  ItemCategory,
  MediaInfo,
  PlaylistItem,
  SavedPlaylist,
  XtreamCredentials,
} from '@senju/iptv';
import { CatalogScreen } from './CatalogScreen';
import { ContentDetailsScreen } from './ContentDetailsScreen';
import { detailEpisodes, type DetailEpisode } from './contentDetails';
import { catalogCache } from './nativeCatalogCache';
import { isCacheFresh, type CatalogSnapshot } from './catalogCache';
import { filterCatalog } from './catalogFilter';
import { orderByLatest } from './catalogOrder';
import { newCatalogTypes } from './catalogSections';
import { CatalogMemory } from './catalogMemory';
import type { CatalogFilter } from './catalogFilter';
import { completePlayback, changeEpisode, episodeNavigation } from './episodePlayback';
import {
  groupsFromItems,
  mergeCategoryGroups,
  platformForGroup,
  type CategoryGroups,
  type CatalogSelection,
} from './catalogNavigation';
import { Player } from './Player';
import { PlaylistSetup, type SetupValues } from './PlaylistSetup';
import { services } from './iptv';
import { colors } from './theme';
import {
  readLibraryDetailed,
  readPreferences,
  savePreferences,
  readPlaylists,
  saveLibrary,
  savePlaylists,
  type LibraryState,
} from './storage';

export default function App() {
  const [saved, setSaved] = useState<SavedPlaylist[]>([]);
  const [ready, setReady] = useState(false);
  const [autoEnter, setAutoEnter] = useState(true);
  const [active, setActive] = useState<SavedPlaylist | null>(null);
  const [form, setForm] = useState(true);
  const [home, setHome] = useState(true);
  const homeFocus = useRef<string | null>(null);
  const [mode, setMode] = useState<'M3U' | 'XTREAM'>('M3U');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [category, setCategory] = useState<ItemCategory>('CHANNEL');
  const [group, setGroup] = useState('');
  const [platform, setPlatform] = useState('');
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroups>({});
  const groupsRef = useRef<CategoryGroups>({});
  const [query, setQuery] = useState('');
  const [catalogNow, setCatalogNow] = useState(Date.now);
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [library, setLibrary] = useState<LibraryState>({
    favorites: [],
    recent: [],
    progress: {},
  });
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const [playing, setPlaying] = useState<PlaylistItem | null>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const [episodes, setEpisodes] = useState<DetailEpisode[] | null>(null);
  const [detailItem, setDetailItem] = useState<PlaylistItem | null>(null);
  const [detailInfo, setDetailInfo] = useState<MediaInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const detailRequest = useRef<AbortController | null>(null);
  const detailFocus = useRef('play');
  const [loading, setLoading] = useState(false);
  const [newLoading, setNewLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheTimes, setCacheTimes] = useState<Partial<Record<ItemCategory, number>>>({});
  const [error, setError] = useState('');
  const focusIndex = useRef(0);
  function setFocusIndex(value: number) {
    focusIndex.current = value;
  }
  const episodeFocus = useRef(0);
  function setEpisodeFocus(value: number) {
    episodeFocus.current = value;
  }
  const controller = useRef<AbortController | null>(null);
  const memory = useRef(new CatalogMemory());
  const libraries = useRef(new Map<string, LibraryState>());
  const persistence = useRef(Promise.resolve());

  useEffect(() => {
    let disposed = false;
    Promise.all([readPlaylists(), readPreferences()])
      .then(([sources, preferences]) => {
        if (disposed) return;
        setSaved(sources);
        setAutoEnter(preferences.autoEnter);
        setReady(true);
        if (sources.length === 1 && preferences.autoEnter) {
          setForm(false);
          void load(sources[0], 'CHANNEL');
        }
      })
      .catch(() => {
        if (disposed) return;
        setError('Não foi possível abrir o armazenamento seguro.');
        setReady(true);
      });
    return () => {
      disposed = true;
      controller.current?.abort();
      detailRequest.current?.abort();
    };
  }, []);
  function persistLibrary(value: LibraryState) {
    libraryRef.current = value;
    setLibrary(value);
    if (active) {
      const id = active.id;
      libraries.current.set(id, value);
      persistence.current = persistence.current.catch(() => {}).then(() => saveLibrary(id, value));
      void persistence.current.catch(() =>
        setError('Não foi possível salvar favoritos ou progresso.'),
      );
    }
  }
  function cancel() {
    controller.current?.abort();
    setLoading(false);
    setNewLoading(false);
    setRefreshing(false);
    if (!active) setForm(true);
  }
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (playing) {
        playingRef.current = null;
        setPlaying(null);
        return true;
      }
      if (detailItem) {
        closeDetails();
        return true;
      }
      if (loading || newLoading) {
        cancel();
        return true;
      }
      if (episodes) {
        setEpisodes(null);
        return true;
      }
      if (form && active) {
        setForm(false);
        return true;
      }
      if (!form) {
        return false;
      }
      return false;
    });
    return () => subscription.remove();
  }, [playing, loading, newLoading, episodes, form, active, detailItem]);
  function begin(preserveError = false) {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setLoading(true);
    setRefreshing(false);
    if (!preserveError) setError('');
    return next;
  }
  async function load(
    source: SavedPlaylist,
    type: ItemCategory,
    remember = false,
    selection: CatalogSelection = {},
    force = false,
    preserveContext = false,
  ): Promise<boolean> {
    const switching = active?.id !== source.id;
    let applied = false;
    let shownCached = false;
    function apply(snapshot: CatalogSnapshot, cached: boolean, nextLibrary: LibraryState) {
      if (!applied && switching) {
        homeFocus.current = null;
        libraries.current.set(source.id, nextLibrary);
        libraryRef.current = nextLibrary;
        setLibrary(nextLibrary);
        setCacheTimes({});
        setItems(snapshot.items);
      } else
        setItems((previous) =>
          source.type === 'M3U'
            ? snapshot.items
            : [...previous.filter((item) => item.category !== type), ...snapshot.items],
        );
      groupsRef.current = mergeCategoryGroups(
        !applied && switching ? {} : groupsRef.current,
        snapshot.groups,
      );
      setCategoryGroups(groupsRef.current);
      memory.current.remember(source, type, snapshot);
      if (cached)
        setCacheTimes((previous) =>
          source.type === 'M3U'
            ? { CHANNEL: snapshot.savedAt, MOVIE: snapshot.savedAt, SERIES: snapshot.savedAt }
            : { ...previous, [type]: snapshot.savedAt },
        );
      if (!applied && (!force || switching) && !preserveContext) {
        setActive(source);
        setCategory(type);
        setGroup(selection.group || '');
        setPlatform(selection.platform || '');
        if (switching) {
          setQuery('');
          setFilter('all');
        }
        setFocusIndex(0);
        setEpisodeFocus(0);
        setEpisodes(null);
        setPlaying(null);
        setForm(false);
      }
      applied = true;
      setLoading(false);
    }
    // A provider already opened in this session comes straight from memory: no spinner, no disk read.
    if (!remember && !force && !preserveContext) {
      const snapshot = memory.current.get(source, type);
      const remembered = switching ? libraries.current.get(source.id) : libraryRef.current;
      if (snapshot && isCacheFresh(snapshot.savedAt) && (!switching || remembered)) {
        controller.current?.abort();
        controller.current = null;
        setRefreshing(false);
        apply(snapshot, true, remembered ?? libraryRef.current);
        return true;
      }
    }
    const request = begin(preserveContext);
    try {
      let nextLibrary = libraryRef.current;
      if (switching) {
        const rememberedLibrary = libraries.current.get(source.id);
        if (rememberedLibrary) nextLibrary = rememberedLibrary;
        else {
          const read = await readLibraryDetailed(source.id);
          nextLibrary = read.library;
          if (read.recovered && !request.signal.aborted)
            setError(
              'Biblioteca salva inválida. Os dados legíveis foram recuperados e o registro original foi preservado neste dispositivo.',
            );
        }
        libraries.current.set(source.id, nextLibrary);
      }
      if (request.signal.aborted) return false;
      if (!remember && !force) {
        const snapshot = memory.current.get(source, type);
        if (snapshot) {
          apply(snapshot, true, nextLibrary);
          shownCached = true;
        } else {
          let cached: CatalogSnapshot | null = null;
          try {
            cached = await catalogCache.read(source, type, request.signal);
          } catch {
            /* Cache is disposable; a damaged/missing key is recovered by downloading. */
          }
          if (request.signal.aborted) return false;
          if (cached) {
            apply(cached, true, nextLibrary);
            shownCached = true;
          }
        }
        if (shownCached) {
          if (isCacheFresh(memory.current.get(source, type)!.savedAt)) return true;
          setRefreshing(true);
        }
      }
      const api = services(request.signal);
      let catalog: PlaylistItem[];
      if (source.type === 'M3U') catalog = await api.m3u.fetchAndParse(source.data as string);
      else {
        const creds = source.data as XtreamCredentials;
        if (switching && !(await api.xtream.loginCheck(creds))) throw new Error();
        catalog = await (type === 'CHANNEL'
          ? api.xtream.fetchChannels(creds)
          : type === 'MOVIE'
            ? api.xtream.fetchMovies(creds)
            : api.xtream.fetchSeries(creds));
      }
      if (request.signal.aborted) return false;
      if (remember) {
        const next = [...saved, source];
        await savePlaylists(next);
        if (request.signal.aborted) return false;
        setSaved(next);
        setPassword('');
        setUsername('');
        setUrl('');
      }
      const savedAt = Date.now();
      apply({ items: catalog, groups: groupsFromItems(catalog), savedAt }, false, nextLibrary);
      setRefreshing(false);
      if (source.type === 'XTREAM') {
        const categoryTypes = { CHANNEL: 'live', MOVIE: 'vod', SERIES: 'series' } as const;
        const missing = (Object.keys(categoryTypes) as ItemCategory[]).filter(
          (value) => !groupsRef.current[value],
        );
        if (missing.length) {
          const discovered = await Promise.all(
            missing.map(
              async (value) =>
                [
                  value,
                  Object.values(
                    await api.xtream.fetchCategories(
                      source.data as XtreamCredentials,
                      categoryTypes[value],
                    ),
                  ),
                ] as const,
            ),
          );
          if (request.signal.aborted) return false;
          groupsRef.current = mergeCategoryGroups(
            groupsRef.current,
            Object.fromEntries(discovered),
          );
          setCategoryGroups(groupsRef.current);
        }
      }
      try {
        await catalogCache.write(
          source,
          type,
          { items: catalog, groups: groupsRef.current, savedAt },
          request.signal,
        );
        if (!request.signal.aborted)
          setCacheTimes((previous) =>
            source.type === 'M3U'
              ? { CHANNEL: savedAt, MOVIE: savedAt, SERIES: savedAt }
              : { ...previous, [type]: savedAt },
          );
      } catch {
        if (!request.signal.aborted)
          setError('Catálogo carregado, mas não foi possível salvar o cache neste dispositivo.');
      }
      return !request.signal.aborted;
    } catch {
      if (!request.signal.aborted) {
        setError(
          shownCached
            ? 'Não foi possível atualizar. Exibindo o catálogo salvo; tente Atualizar catálogo no perfil.'
            : 'Falha ao carregar. Confira os dados, a conexão e o armazenamento.',
        );
        if (!active && !shownCached) setForm(true);
      }
      return false;
    } finally {
      if (controller.current === request) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }
  async function loadNew(source: SavedPlaylist, force = false) {
    setError('');
    const types = newCatalogTypes(source, memory.current.loaded, force);
    if (!types.length) return;
    setNewLoading(true);
    let current: AbortController | null = null;
    let incomplete = false;
    try {
      for (const type of types) {
        const pending = load(source, type, false, {}, force, true);
        current = controller.current;
        const success = await pending;
        if (current?.signal.aborted || controller.current !== current) return;
        if (!success) incomplete = true;
      }
      if (incomplete)
        setError('Não foi possível atualizar todos os catálogos. Exibindo os itens disponíveis.');
    } finally {
      if (controller.current === current) setNewLoading(false);
    }
  }
  function closeDetails() {
    detailRequest.current?.abort();
    setDetailItem(null);
    setDetailInfo(null);
    setDetailLoading(false);
    setDetailError('');
    setEpisodes(null);
  }
  function startPlayback(item: PlaylistItem) {
    if (typeof item.url !== 'string' || !item.url.trim()) {
      setDetailError('Este item não tem uma URL de reprodução válida.');
      return;
    }
    persistLibrary({
      ...libraryRef.current,
      recent: [item.id, ...libraryRef.current.recent.filter((id) => id !== item.id)].slice(0, 50),
    });
    playingRef.current = item;
    setPlaying(item);
  }
  async function loadDetails(item: PlaylistItem) {
    detailRequest.current?.abort();
    const request = new AbortController();
    detailRequest.current = request;
    setDetailError('');
    if (active?.type !== 'XTREAM') {
      setDetailLoading(false);
      return;
    }
    const id = item.category === 'SERIES' ? item.seriesId || item.streamId : item.streamId;
    if (id === undefined || id === null || id === '') {
      setDetailError('A fonte não informou o identificador dos detalhes.');
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    try {
      const api = services(request.signal).xtream;
      if (item.category === 'SERIES') {
        const result = await api.fetchSeriesInfo(active.data as XtreamCredentials, String(id));
        if (request.signal.aborted) return;
        setDetailInfo(result.info);
        setEpisodes(detailEpisodes(result));
      } else {
        const result = await api.fetchMovieInfo(active.data as XtreamCredentials, String(id));
        if (!request.signal.aborted) setDetailInfo(result.info);
      }
    } catch {
      if (!request.signal.aborted)
        setDetailError(
          item.category === 'SERIES'
            ? 'Não foi possível carregar os detalhes e episódios. Tente novamente.'
            : 'Não foi possível carregar os detalhes. Você ainda pode reproduzir o filme.',
        );
    } finally {
      if (detailRequest.current === request && !request.signal.aborted) setDetailLoading(false);
    }
  }
  function open(item: PlaylistItem) {
    if (item.category === 'CHANNEL') {
      startPlayback(item);
      return;
    }
    cancel();
    detailFocus.current = 'play';
    setDetailItem(item);
    setDetailInfo(null);
    setEpisodes(null);
    setEpisodeFocus(0);
    void loadDetails(item);
  }
  function finishPlayback(completedId: string) {
    const current = playingRef.current;
    if (!current || current.id !== completedId) return;
    const result = completePlayback(current, episodes, libraryRef.current);
    if (result.library !== libraryRef.current) persistLibrary(result.library);
    if (result.focusIndex !== undefined) {
      setEpisodeFocus(result.focusIndex);
      detailFocus.current = (result.next || episodes?.[result.focusIndex])?.id || 'play';
    }
    setError(result.error || '');
    playingRef.current = result.next;
    setPlaying(result.next);
  }
  const episodeControls = useMemo(
    () => (playing ? episodeNavigation(playing, episodes) : undefined),
    [playing, episodes],
  );
  function moveEpisode(currentId: string, direction: -1 | 1, position: number) {
    const current = playingRef.current;
    if (!current || current.id !== currentId) return false;
    const result = changeEpisode(current, episodes, direction, position, libraryRef.current);
    if (!result) return false;
    persistLibrary(result.library);
    setEpisodeFocus(result.index);
    detailFocus.current = result.next.id;
    setError('');
    playingRef.current = result.next;
    setPlaying(result.next);
    return true;
  }
  const groupPlatforms = useMemo(
    () =>
      new Map(
        Object.values(categoryGroups).flatMap((names) =>
          names.map((name) => [name, platformForGroup(name)] as const),
        ),
      ),
    [categoryGroups],
  );
  const orderedItems = useMemo(
    () =>
      category !== 'CHANNEL' && filter !== 'recent' && filter !== 'new' && !episodes
        ? orderByLatest(items)
        : items,
    [items, category, filter, episodes],
  );
  const visible = useMemo(() => {
    if (episodes) return episodes;
    if (filter === 'new' && newLoading) return [];
    return filterCatalog(
      orderedItems,
      { category, group, platform, query, filter, now: catalogNow },
      library,
      groupPlatforms,
    );
  }, [
    orderedItems,
    category,
    group,
    platform,
    groupPlatforms,
    query,
    filter,
    library.favorites,
    library.recent,
    catalogNow,
    newLoading,
    episodes,
  ]);
  const episodeSeasons = useMemo(
    () =>
      episodes
        ? Object.fromEntries(episodes.map((item) => [item.id, item.seasonNumber]))
        : undefined,
    [episodes],
  );
  const selectedIndex = episodes ? episodeFocus.current : focusIndex.current;
  const initialIndex = Math.min(selectedIndex, Math.max(0, visible.length - 1));
  function selectCategory(type: ItemCategory, selection: CatalogSelection = {}) {
    cancel();
    setHome(false);
    setCategory(type);
    setGroup(selection.group || '');
    setPlatform(selection.platform || '');
    setQuery('');
    setFilter('all');
    setFocusIndex(0);
    setEpisodes(null);
    if (active && !memory.current.isLoaded(active, type))
      void load(active, type, false, selection);
  }
  function submit() {
    try {
      if (
        !/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(url.trim()) ||
        !name.trim() ||
        (mode === 'XTREAM' && (!username || !password))
      )
        throw new Error();
    } catch {
      setError('Informe nome, URL HTTP(S) válida e credenciais quando necessário.');
      return;
    }
    setHome(true);
    void load(
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: name.trim(),
        type: mode,
        data: mode === 'M3U' ? url.trim() : { url: url.trim(), username, password },
      },
      'CHANNEL',
      true,
    );
  }
  if (playing)
    return (
      <Player
        key={playing.id}
        item={playing}
        start={library.progress[playing.id] || 0}
        onProgress={(position) =>
          persistLibrary({
            ...libraryRef.current,
            progress: {
              ...libraryRef.current.progress,
              [playing.id]: position,
            },
          })
        }
        episodeControls={
          episodeControls
            ? {
                previous: episodeControls.previous,
                next: episodeControls.next,
                onChange: (direction, position) => moveEpisode(playing.id, direction, position),
              }
            : undefined
        }
        onEnd={() => finishPlayback(playing.id)}
        onClose={() => {
          playingRef.current = null;
          setPlaying(null);
        }}
      />
    );
  if (form && ready) {
    const updateField = (field: keyof SetupValues, value: string) => {
      const setters = { name: setName, url: setUrl, username: setUsername, password: setPassword };
      setters[field](value);
    };
    return (
      <PlaylistSetup
        playlists={saved}
        mode={mode}
        values={{ name, url, username, password }}
        onModeChange={setMode}
        onChange={updateField}
        loading={loading}
        error={error}
        onSelect={(source) => {
          setHome(true);
          void load(source, 'CHANNEL');
        }}
        onRemove={(id) => {
          cancel();
          const next = saved.filter((value) => value.id !== id);
          savePlaylists(next)
            .then(() => {
              setSaved(next);
              memory.current.forget(id);
              libraries.current.delete(id);
              void catalogCache
                .clear(id)
                .catch(() => setError('Lista removida, mas não foi possível limpar seu cache.'));
              if (active?.id === id) {
                setActive(null);
                setItems([]);
              }
            })
            .catch(() => setError('Não foi possível remover a lista.'));
        }}
        onSubmit={submit}
        onCancel={cancel}
        backLabel={home ? 'Início' : 'Catálogo'}
        onBack={active ? () => setForm(false) : undefined}
      />
    );
  }
  if (!ready)
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loading}>Abrindo Senju…</Text>
      </SafeAreaView>
    );
  if (detailItem)
    return (
      <ContentDetailsScreen
        item={detailItem}
        info={detailInfo}
        episodes={episodes}
        requiresEpisodes={detailItem.category === 'SERIES' && active?.type === 'XTREAM'}
        loading={detailLoading}
        error={detailError}
        library={library}
        initialFocus={detailFocus.current}
        onFocus={(key) => {
          detailFocus.current = key;
        }}
        onPlay={startPlayback}
        onBack={closeDetails}
        onRetry={() => void loadDetails(detailItem)}
        onFavorite={() =>
          persistLibrary({
            ...libraryRef.current,
            favorites: libraryRef.current.favorites.includes(detailItem.id)
              ? libraryRef.current.favorites.filter((id) => id !== detailItem.id)
              : [...libraryRef.current.favorites, detailItem.id],
          })
        }
      />
    );
  return (
    <CatalogScreen
      key={active?.id || 'opening'}
      home={home}
      homeFocus={homeFocus.current}
      platformsPending={
        !active || (active.type === 'XTREAM' && (!categoryGroups.MOVIE || !categoryGroups.SERIES))
      }
      onHome={() => {
        cancel();
        setEpisodes(null);
        setHome(true);
      }}
      onHomeFocus={(key) => {
        homeFocus.current = key;
      }}
      onPlatform={(key, type) => selectCategory(type, { platform: key })}
      sourceName={active?.name || 'Conectando…'}
      category={category}
      group={group}
      categoryGroups={categoryGroups}
      platform={platform}
      query={query}
      filter={filter}
      items={visible}
      favorites={library.favorites}
      episodes={!!episodes}
      episodeSeasons={episodeSeasons}
      initialIndex={initialIndex}
      loading={loading || newLoading}
      refreshing={refreshing}
      cacheSavedAt={
        filter === 'new'
          ? Math.min(cacheTimes.MOVIE || 0, cacheTimes.SERIES || 0) || undefined
          : cacheTimes[category]
      }
      onClearCache={async () => {
        cancel();
        try {
          await catalogCache.clear();
          memory.current.forget();
          setCacheTimes({});
        } catch {
          setError('Não foi possível limpar o cache.');
          throw new Error('Falha ao limpar cache.');
        }
      }}
      error={error}
      autoEnter={autoEnter}
      onAutoEnter={() => {
        const next = !autoEnter;
        void savePreferences({ autoEnter: next })
          .then(() => setAutoEnter(next))
          .catch(() => setError('Não foi possível salvar a preferência.'));
      }}
      onCategory={selectCategory}
      onQuery={(value) => {
        setQuery(value);
        setFocusIndex(0);
      }}
      onFilter={(value) => {
        cancel();
        setHome(false);
        setFilter(value);
        setFocusIndex(0);
        setEpisodes(null);
        if (value === 'new') {
          setQuery('');
          setGroup('');
          setPlatform('');
          setCatalogNow(Date.now());
          setCategory('MOVIE');
          if (active) void loadNew(active);
        }
      }}
      onFocus={episodes ? setEpisodeFocus : setFocusIndex}
      onOpen={(item) => void open(item)}
      onFavorite={(item) =>
        persistLibrary({
          ...libraryRef.current,
          favorites: libraryRef.current.favorites.includes(item.id)
            ? libraryRef.current.favorites.filter((id) => id !== item.id)
            : [...libraryRef.current.favorites, item.id],
        })
      }
      onRefresh={() => {
        if (!active) return;
        if (home) {
          setError('');
          void load(active, 'CHANNEL', false, {}, true, true);
        } else if (filter === 'new') {
          setCatalogNow(Date.now());
          void loadNew(active, true);
        } else void load(active, category, false, { platform, group }, true);
      }}
      onLists={() => {
        cancel();
        setForm(true);
      }}
      onExit={() => {
        cancel();
        if (active) libraries.current.delete(active.id);
        setActive(null);
        setItems([]);
        setEpisodes(null);
        setLibrary({ favorites: [], recent: [], progress: {} });
        setError('');
        setForm(true);
      }}
      onBackEpisodes={() => setEpisodes(null)}
      onCancel={cancel}
    />
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#070e0a', alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#9ab6a5', fontSize: 14, marginTop: 14 },
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { services } from '../src/iptv';
import { createPlaybackSource } from '../src/playbackSource';

const item = { id: '1', name: 'Teste', category: 'CHANNEL' as const };

test('native source translates encoded pipe headers without exposing them in the URI', () => {
  const source = createPlaybackSource({
    ...item,
    url: 'https://example.test/live.M3U8?token=test#fragment|user-agent=Senju%20TV&referer=https%3A%2F%2Fexample.test',
    httpHeaders: { Authorization: 'Bearer fixture', 'User-Agent': 'original' },
  });
  assert.equal(source.uri, 'https://example.test/live.M3U8?token=test#fragment');
  assert.equal(source.type, 'm3u8');
  assert.deepEqual(source.headers, {
    Authorization: 'Bearer fixture',
    'User-Agent': 'Senju TV',
    Referer: 'https://example.test',
  });
});

test('native source leaves progressive MPEG-TS inference to ExoPlayer and limits the buffer', () => {
  const source = createPlaybackSource({ ...item, url: 'https://example.test/live.ts' });
  assert.equal(source.type, undefined);
  assert.equal(source.bufferConfig.maxBufferMs, 15000);
});

test('native transport parses M3U and removes the parent abort listener after success', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () =>
    new Response('#EXTM3U\n#EXTINF:-1,Canal\nhttps://example.test/live.ts');
  const controller = new AbortController();
  const catalog = await services(controller.signal).m3u.fetchAndParse('https://example.test/list');
  assert.equal(catalog[0].name, 'Canal');
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('native transport cancels the request when leaving a loading screen', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = (_url, options) =>
    new Promise((_resolve, reject) => {
      const signal = options!.signal!;
      if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'));
      else
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        });
    });
  const controller = new AbortController();
  const pending = services(controller.signal).m3u.fetchAndParse('https://example.test/list');
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('native HTTP errors stay generic and do not include credential-bearing URLs', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(
    services(new AbortController().signal).m3u.fetchAndParse(
      'https://example.test/list?password=fixture',
    ),
    { message: 'Falha na resposta do provedor.' },
  );
});

test('platform navigation uses category labels and rejects unrelated genre/title matches', async () => {
  const { platformForGroup } = await import('../src/catalogNavigation');
  assert.equal(platformForGroup('Séries | GLOBOPLAY'), 'globoplay');
  assert.equal(platformForGroup('Filmes • NETFLIX [4K]'), 'netflix');
  assert.equal(platformForGroup('Filmes | Suspense'), undefined);
  assert.equal(platformForGroup('Canais | Star Trek 24h'), undefined);
  assert.equal(platformForGroup('Filmes | STAR+'), 'star');
  assert.equal(platformForGroup('Filmes | Máximo'), undefined);
});
test('platform accordion exposes only types reported by provider groups and merges duplicates', async () => {
  const { platformSections } = await import('../src/catalogNavigation');
  assert.deepEqual(
    platformSections({
      MOVIE: ['Filmes | Netflix', 'Filmes | Netflix Legendado', 'Filmes | Ação'],
      SERIES: ['Séries | Netflix', 'Séries | Globoplay'],
      CHANNEL: ['Canais | Nacionais'],
    }),
    [
      { key: 'globoplay', label: 'Globoplay', types: ['SERIES'] },
      { key: 'netflix', label: 'Netflix', types: ['SERIES', 'MOVIE'] },
    ],
  );
});
test('M3U navigation retains unbranded groups and separates content types', async () => {
  const { groupsFromItems, platformSections } = await import('../src/catalogNavigation');
  const groups = groupsFromItems([
    { ...item, url: 'https://example.test/1', groupName: 'Notícias' },
    { ...item, id: '2', url: 'https://example.test/2', groupName: 'Notícias' },
    { ...item, id: '3', url: 'https://example.test/3', category: 'MOVIE' },
  ]);
  assert.deepEqual(groups, { CHANNEL: ['Notícias'], MOVIE: ['Outros'] });
  assert.deepEqual(platformSections(groups), []);
});

test('loading a genre catalog does not remove provider platform categories', async () => {
  const { mergeCategoryGroups, groupsFromItems, platformSections } = await import(
    '../src/catalogNavigation'
  );
  const groups = mergeCategoryGroups(
    { MOVIE: ['Filmes | Netflix'], SERIES: ['Séries | Netflix'] },
    groupsFromItems([
      { ...item, category: 'MOVIE', url: 'https://example.test/1', groupName: 'Filmes | Ação' },
    ]),
  );
  assert.deepEqual(platformSections(groups)[0].types, ['SERIES', 'MOVIE']);
});
test('search stays inside selected type, platform, group and favorites', async () => {
  const { filterCatalog } = await import('../src/catalogFilter');
  const items = [
    {
      ...item,
      id: 'net-movie',
      category: 'MOVIE' as const,
      name: 'Alvo',
      url: 'https://example.test/1',
      groupName: 'Ação',
      groupNames: ['Ação', 'Filmes | Netflix'],
    },
    {
      ...item,
      id: 'other-movie',
      category: 'MOVIE' as const,
      name: 'Alvo',
      url: 'https://example.test/2',
      groupName: 'Suspense',
    },
    {
      ...item,
      id: 'net-series',
      category: 'SERIES' as const,
      name: 'Alvo',
      url: 'https://example.test/3',
      groupName: 'Séries | Netflix',
    },
  ];
  const library = { favorites: ['net-movie'], recent: [] };
  const groups = new Map([
    ['Filmes | Netflix', 'netflix'],
    ['Séries | Netflix', 'netflix'],
  ]);
  const selection = {
    category: 'MOVIE' as const,
    platform: 'netflix',
    group: '',
    query: ' Alvo ',
    filter: 'all' as const,
  };
  assert.deepEqual(
    filterCatalog(items, selection, library, groups).map((row) => row.id),
    ['net-movie'],
  );
  assert.deepEqual(
    filterCatalog(items, { ...selection, platform: '', group: 'Suspense' }, library, groups).map(
      (row) => row.id,
    ),
    ['other-movie'],
  );
  assert.deepEqual(
    filterCatalog(items, { ...selection, category: 'SERIES' }, library, groups).map(
      (row) => row.id,
    ),
    ['net-series'],
  );
  assert.deepEqual(filterCatalog(items, { ...selection, query: 'ausente' }, library, groups), []);
  assert.deepEqual(
    filterCatalog(items, { ...selection, platform: '', filter: 'favorites' }, library, groups).map(
      (row) => row.id,
    ),
    ['net-movie'],
  );
});

test('episode completion advances in the full series queue and resets progress without mutating storage state', async () => {
  const { completePlayback } = await import('../src/episodePlayback');
  const episodes = [
    { ...item, id: 'e1', category: 'MOVIE' as const, name: 'T1 E1', url: 'https://example.test/1' },
    { ...item, id: 'e2', category: 'MOVIE' as const, name: 'T1 E2', url: 'https://example.test/2' },
    { ...item, id: 'e3', category: 'MOVIE' as const, name: 'T2 E1', url: 'https://example.test/3' },
  ];
  const library = { favorites: ['e1'], recent: ['e1', 'e2'], progress: { e1: 1200, e2: 90 } };
  const result = completePlayback(episodes[0], episodes, library);
  assert.equal(result.next, episodes[1]);
  assert.equal(result.focusIndex, 1);
  assert.equal(result.library.progress.e1, 0);
  assert.equal(result.library.progress.e2, 0);
  assert.deepEqual(result.library.recent, ['e2', 'e1']);
  assert.deepEqual(library.progress, { e1: 1200, e2: 90 });
  assert.deepEqual(result.library.favorites, ['e1']);
  assert.equal(completePlayback(episodes[1], episodes, result.library).next, episodes[2]);
});
test('last episode returns to its list and films/live never advance into a series', async () => {
  const { completePlayback } = await import('../src/episodePlayback');
  const episode = { ...item, id: 'e1', category: 'MOVIE' as const, url: 'https://example.test/1' };
  const library = { favorites: [], recent: ['e1'], progress: { e1: 600 } };
  const end = completePlayback(episode, [episode], library);
  assert.equal(end.next, null);
  assert.equal(end.focusIndex, 0);
  assert.equal(end.library.progress.e1, 0);
  const movie = { ...episode, id: 'movie' };
  assert.equal(completePlayback(movie, [episode], library).next, null);
  assert.equal(completePlayback(movie, null, library).next, null);
  const live = completePlayback({ ...episode, category: 'CHANNEL' }, [episode, movie], library);
  assert.equal(live.next, null);
  assert.equal(live.library, library);
});
test('an unavailable next URL stops at the episode list without skipping or looping', async () => {
  const { completePlayback } = await import('../src/episodePlayback');
  const episodes = [
    { ...item, id: 'e1', category: 'MOVIE' as const, url: 'https://example.test/1' },
    { ...item, id: 'e2', category: 'MOVIE' as const, url: ' ' },
    { ...item, id: 'e3', category: 'MOVIE' as const, url: 'https://example.test/3' },
  ];
  const result = completePlayback(episodes[0], episodes, {
    favorites: [],
    recent: [],
    progress: {},
  });
  assert.equal(result.next, null);
  assert.equal(result.focusIndex, 0);
  assert.match(result.error!, /URL/);
});

test('a duplicated episode identifier cannot replay the completed player instance', async () => {
  const { completePlayback } = await import('../src/episodePlayback');
  const episode = { ...item, id: 'e1', category: 'MOVIE' as const, url: 'https://example.test/1' };
  const result = completePlayback(episode, [episode, { ...episode }], {
    favorites: [],
    recent: [],
    progress: {},
  });
  assert.equal(result.next, null);
  assert.match(result.error!, /identificador/);
});

test('manual episode navigation preserves unfinished progress and crosses seasons in both directions', async () => {
  const { changeEpisode, episodeNavigation } = await import('../src/episodePlayback');
  const queue = [
    { ...item, id: 'e1', name: 'T1 E1', category: 'MOVIE' as const, url: 'https://example.test/1' },
    { ...item, id: 'e2', name: 'T2 E1', category: 'MOVIE' as const, url: 'https://example.test/2' },
  ];
  const library = { favorites: ['e1'], recent: ['e1', 'e2'], progress: { e1: 10, e2: 20 } };
  assert.deepEqual(episodeNavigation(queue[0], queue), { index: 0, previous: false, next: true });
  const next = changeEpisode(queue[0], queue, 1, 87, library)!;
  assert.equal(next.next, queue[1]);
  assert.equal(next.index, 1);
  assert.equal(next.library.progress.e1, 87);
  assert.equal(next.library.progress.e2, 0);
  assert.deepEqual(next.library.recent, ['e2', 'e1']);
  assert.deepEqual(library.progress, { e1: 10, e2: 20 });
  const previous = changeEpisode(queue[1], queue, -1, 42, next.library)!;
  assert.equal(previous.next, queue[0]);
  assert.equal(previous.library.progress.e1, 0);
  assert.equal(previous.library.progress.e2, 42);
  assert.deepEqual(previous.library.favorites, ['e1']);
});
test('episode controls disable boundaries and reject unrelated, duplicate or invalid targets', async () => {
  const { changeEpisode, episodeNavigation } = await import('../src/episodePlayback');
  const episode = { ...item, id: 'e1', category: 'MOVIE' as const, url: 'https://example.test/1' };
  const library = { favorites: [], recent: [], progress: {} };
  assert.deepEqual(episodeNavigation(episode, [episode]), {
    index: 0,
    previous: false,
    next: false,
  });
  assert.equal(changeEpisode(episode, [episode], -1, 3, library), undefined);
  assert.equal(changeEpisode(episode, [episode], 1, 3, library), undefined);
  assert.equal(episodeNavigation({ ...episode, id: 'film' }, [episode]), undefined);
  assert.equal(episodeNavigation({ ...episode, category: 'CHANNEL' }, [episode]), undefined);
  assert.equal(episodeNavigation(episode, null), undefined);
  assert.equal(changeEpisode(episode, [episode, { ...episode }], 1, 3, library), undefined);
  assert.equal(
    changeEpisode(episode, [episode, { ...episode, id: 'e2', url: '' }], 1, 3, library),
    undefined,
  );
});

test('catalog defaults to update time with inclusion fallback and keeps undated ties stable', async () => {
  const { orderByLatest, catalogTimestamp } = await import('../src/catalogOrder');
  const { filterCatalog } = await import('../src/catalogFilter');
  const catalog = [
    { ...item, id: 'missing', url: '', category: 'MOVIE' as const, groupName: 'Netflix' },
    {
      ...item,
      id: 'old',
      url: '',
      category: 'MOVIE' as const,
      addedAt: 100,
      updatedAt: 9999,
      groupName: 'Netflix',
    },
    { ...item, id: 'new', url: '', category: 'MOVIE' as const, addedAt: 300, groupName: 'Netflix' },
    { ...item, id: 'tie', url: '', category: 'MOVIE' as const, addedAt: 300, groupName: 'Netflix' },
    {
      ...item,
      id: 'other',
      url: '',
      category: 'MOVIE' as const,
      addedAt: 400,
      groupName: 'Prime Video',
    },
    { ...item, id: 'series', url: '', category: 'SERIES' as const, addedAt: 99999, updatedAt: 200 },
    {
      ...item,
      id: 'invalid',
      url: '',
      category: 'MOVIE' as const,
      addedAt: NaN,
      groupName: 'Netflix',
    },
  ];
  const original = catalog.map((entry) => entry.id);
  const ordered = orderByLatest(catalog);
  assert.deepEqual(
    ordered.map((entry) => entry.id),
    ['old', 'other', 'new', 'tie', 'series', 'missing', 'invalid'],
  );
  assert.deepEqual(
    catalog.map((entry) => entry.id),
    original,
  );
  assert.equal(catalogTimestamp(catalog[5]), 200);
  assert.equal(catalogTimestamp({ ...catalog[5], updatedAt: undefined }), 99999);
  assert.equal(catalogTimestamp({ ...catalog[0], category: 'CHANNEL', addedAt: 100 }), 0);
  const selection = {
    category: 'MOVIE' as const,
    platform: 'netflix',
    group: '',
    query: '',
    filter: 'all' as const,
  };
  const library = { favorites: ['old', 'new'], recent: ['old', 'new'] };
  const platforms = new Map([
    ['Netflix', 'netflix'],
    ['Prime Video', 'prime'],
  ]);
  assert.deepEqual(
    filterCatalog(ordered, selection, library, platforms).map((entry) => entry.id),
    ['old', 'new', 'tie', 'missing', 'invalid'],
  );
  assert.deepEqual(
    filterCatalog(ordered, { ...selection, filter: 'favorites' }, library, platforms).map(
      (entry) => entry.id,
    ),
    ['old', 'new'],
  );
  assert.deepEqual(
    filterCatalog(ordered, { ...selection, filter: 'recent' }, library, platforms).map(
      (entry) => entry.id,
    ),
    ['old', 'new'],
  );
});

test('new additions feed combines films and series within 30 days, excludes undated/live/future, and scopes its search', async () => {
  const { filterCatalog } = await import('../src/catalogFilter');
  const { NEW_ITEMS_WINDOW_MS } = await import('../src/catalogOrder');
  const now = Date.UTC(2026, 9, 30);
  const base = { ...item, url: 'https://example.test/movie', category: 'MOVIE' as const };
  const catalog = [
    { ...base, id: 'recent-film', name: 'Novo filme', addedAt: now - 1000, updatedAt: now },
    { ...base, id: 'old-film-updated', addedAt: now - NEW_ITEMS_WINDOW_MS - 1, updatedAt: now },
    { ...base, id: 'boundary', name: 'Novo no limite', addedAt: now - NEW_ITEMS_WINDOW_MS },
    {
      ...base,
      id: 'series-update',
      name: 'Nova série',
      category: 'SERIES' as const,
      updatedAt: now - 500,
    },
    {
      ...base,
      id: 'series-added',
      name: 'Outra série',
      category: 'SERIES' as const,
      addedAt: now - 2000,
      updatedAt: now,
    },
    {
      ...base,
      id: 'old-series-updated',
      category: 'SERIES' as const,
      addedAt: now - NEW_ITEMS_WINDOW_MS - 1,
      updatedAt: now,
    },
    { ...base, id: 'undated' },
    { ...base, id: 'updated-only-film', updatedAt: now },
    { ...base, id: 'future', addedAt: now + 1 },
    { ...base, id: 'live', category: 'CHANNEL' as const, addedAt: now },
  ];
  const selection = {
    category: 'CHANNEL' as const,
    platform: 'netflix',
    group: 'Other menu',
    query: '',
    filter: 'new' as const,
    now,
  };
  const library = { favorites: [], recent: [] };
  const result = filterCatalog(catalog, selection, library, new Map());
  assert.deepEqual(
    result.map((value) => value.id),
    ['series-update', 'recent-film', 'series-added', 'boundary'],
  );
  assert.deepEqual(
    filterCatalog(catalog, { ...selection, query: 'Novo' }, library, new Map()).map(
      (value) => value.id,
    ),
    ['recent-film', 'boundary'],
  );
  assert.deepEqual(
    filterCatalog(catalog, { ...selection, query: 'inexistente' }, library, new Map()),
    [],
  );
  assert.equal(catalog[0].id, 'recent-film');
});

test('combined additions loads missing or stale Xtream catalogs only and M3U at most once', async () => {
  const { newCatalogTypes } = await import('../src/catalogSections');
  const { CACHE_FRESH_MS } = await import('../src/catalogCache');
  const { catalogKey } = await import('../src/catalogMemory');
  const source = {
    id: 'fixture',
    name: 'Fixture',
    type: 'XTREAM' as const,
    data: { url: 'https://example.test', username: 'fixture', password: 'fixture' },
  };
  const now = Date.now();
  const loaded = new Map<string, number>([[catalogKey(source, 'CHANNEL'), now]]);
  assert.deepEqual(newCatalogTypes(source, loaded, false, now), ['MOVIE', 'SERIES']);
  loaded.set(catalogKey(source, 'MOVIE'), now);
  assert.deepEqual(newCatalogTypes(source, loaded, false, now), ['SERIES']);
  loaded.set(catalogKey(source, 'SERIES'), now);
  assert.deepEqual(newCatalogTypes(source, loaded, false, now), []);
  assert.deepEqual(newCatalogTypes(source, loaded, true, now), ['MOVIE', 'SERIES']);
  loaded.set(catalogKey(source, 'MOVIE'), now - CACHE_FRESH_MS);
  assert.deepEqual(newCatalogTypes(source, loaded, false, now), ['MOVIE']);
  const m3u = { ...source, type: 'M3U' as const, data: 'https://example.test/list' };
  assert.deepEqual(newCatalogTypes(m3u, loaded, false, now), ['MOVIE']);
  loaded.set(catalogKey(m3u, 'MOVIE'), now);
  assert.deepEqual(newCatalogTypes(m3u, loaded, false, now), []);
});

test('session catalog memory keeps provider snapshots separate and survives source switches', async () => {
  const { CatalogMemory, catalogKey } = await import('../src/catalogMemory');
  const { CACHE_FRESH_MS } = await import('../src/catalogCache');
  const base = {
    id: 'provider',
    name: 'Provider',
    type: 'XTREAM' as const,
    data: { url: 'https://example.test', username: 'fixture', password: 'fixture' },
  };
  const other = { ...base, id: 'other' };
  const now = Date.now();
  const memory = new CatalogMemory();
  const snapshot = (name: string) => ({
    items: [{ id: name, name, url: 'https://example.test', category: 'MOVIE' as const }],
    groups: { MOVIE: [name] },
    savedAt: now,
  });
  assert.equal(memory.get(base, 'MOVIE'), null);
  assert.equal(memory.isLoaded(base, 'MOVIE', now), false);
  memory.remember(base, 'MOVIE', snapshot('movies'));
  memory.remember(base, 'SERIES', { ...snapshot('series'), items: [] });
  memory.remember(other, 'MOVIE', snapshot('other-movies'));
  assert.equal(memory.get(base, 'MOVIE')?.items[0].name, 'movies');
  assert.equal(memory.get(other, 'MOVIE')?.items[0].name, 'other-movies');
  assert.equal(memory.isLoaded(base, 'SERIES', now), true);
  assert.equal(memory.isLoaded(other, 'SERIES', now), false);
  assert.equal(memory.get(base, 'MOVIE')?.items[0].name, 'movies');
  memory.forget(other.id);
  assert.equal(memory.get(other, 'MOVIE'), null);
  assert.equal(memory.get(base, 'MOVIE')?.items[0].name, 'movies');
  memory.remember(base, 'MOVIE', { ...snapshot('stale'), savedAt: now - CACHE_FRESH_MS });
  assert.equal(memory.isLoaded(base, 'MOVIE', now), false);
  assert.equal(memory.get(base, 'MOVIE')?.items[0].name, 'stale');
  memory.forget();
  assert.equal(memory.loaded.size, 0);
});

test('M3U session memory marks all categories loaded with a single combined snapshot', async () => {
  const { CatalogMemory, catalogKey } = await import('../src/catalogMemory');
  const source = { id: 'm3u', name: 'M3U', type: 'M3U' as const, data: 'https://example.test/list' };
  const now = Date.now();
  const memory = new CatalogMemory();
  memory.remember(source, 'CHANNEL', {
    items: [],
    groups: { CHANNEL: ['News'], MOVIE: ['Action'], SERIES: ['Drama'] },
    savedAt: now,
  });
  for (const type of ['CHANNEL', 'MOVIE', 'SERIES'] as const) {
    assert.equal(memory.isLoaded(source, type, now), true);
    assert.equal(memory.get(source, type)?.groups[type]?.length, 1);
  }
  assert.equal(memory.loaded.size, 1);
  assert.equal(catalogKey(source, 'MOVIE'), 'm3u:ALL');
});

test('home exposes exactly the five requested platforms and never fabricates source content types', async () => {
  const { homePlatforms, platformCategory } = await import('../src/homePlatforms');
  const groups = {
    SERIES: ['Netflix', 'Globoplay', 'Disney+', 'HBO Max', 'Apple TV+'],
    MOVIE: ['Amazon Prime', 'Globoplay', 'Disney+'],
    CHANNEL: ['Globoplay'],
  };
  const featured = homePlatforms(groups);
  assert.deepEqual(
    featured.map((value) => value.label),
    ['Netflix', 'Globoplay', 'Prime Video', 'Disney+', 'HBO'],
  );
  assert.deepEqual(featured.find((value) => value.key === 'netflix')?.types, ['SERIES']);
  assert.equal(
    platformCategory(featured.find((value) => value.key === 'netflix')!.types),
    'SERIES',
  );
  assert.equal(
    platformCategory(featured.find((value) => value.key === 'globoplay')!.types),
    'MOVIE',
  );
  assert.equal(platformCategory([]), undefined);
  assert.ok(homePlatforms({}).every((value) => value.types.length === 0));
  assert.equal(
    featured.some((value) => value.key === 'apple'),
    false,
  );
  assert.equal(
    platformCategory(homePlatforms({ MOVIE: ['Netflix'], SERIES: ['Netflix'] })[0].types),
    'MOVIE',
  );
});

test('card quality presentation uses explicit tags and preserves titles, languages and source names', async () => {
  const { catalogPresentation } = await import('../src/catalogPresentation');
  assert.deepEqual(catalogPresentation('Filme [FHD][HDR] [L]'), {
    title: 'Filme [L]',
    quality: 'FHD · HDR',
  });
  assert.deepEqual(catalogPresentation('Filme [HD][H265]'), {
    title: 'Filme [H265]',
    quality: 'HD',
  });
  assert.deepEqual(catalogPresentation('Filme 4K [L]'), { title: 'Filme 4K [L]', quality: '' });
  assert.deepEqual(catalogPresentation('Série [DV] [L]'), { title: 'Série [DV] [L]', quality: '' });
  assert.deepEqual(catalogPresentation('Filme [H265]'), { title: 'Filme [H265]', quality: '' });
  assert.deepEqual(catalogPresentation('[HD]'), { title: '[HD]', quality: 'HD' });
});

import { detailEpisodes, detailPlayTarget } from '../src/contentDetails';
test('content details preserve the complete episode queue and supplied descriptions', () => {
  const episodes = detailEpisodes({
    info: {
      name: 'Série',
      cover: 'https://images.test/cover',
      plot: '',
      cast: '',
      director: '',
      genre: '',
      releaseDate: '',
      rating: '',
    },
    seasons: [
      {
        number: 1,
        episodes: [
          {
            id: '1',
            title: 'Início',
            url: 'https://test/1.mp4',
            seasonNumber: 1,
            episodeNumber: 1,
            containerExtension: 'mp4',
            info: { plot: 'Piloto', duration: '45:00' },
          },
        ],
      },
      {
        number: 2,
        episodes: [
          {
            id: '2',
            title: 'Retorno',
            url: 'https://test/2.mp4',
            seasonNumber: 2,
            episodeNumber: 1,
            containerExtension: 'mp4',
          },
        ],
      },
    ],
  });
  assert.deepEqual(
    episodes.map((e) => [e.id, e.seasonNumber]),
    [
      ['episode-1', 1],
      ['episode-2', 2],
    ],
  );
  assert.equal(episodes[0].plot, 'Piloto');
  assert.equal(episodes[0].tvgLogo, 'https://images.test/cover');
  const movie = {
    id: 'movie',
    name: 'Filme',
    category: 'MOVIE' as const,
    url: 'https://test/movie.mp4',
  };
  assert.equal(
    detailPlayTarget(movie, episodes, true, {
      recent: ['episode-2'],
      progress: { 'episode-2': 123 },
    })?.id,
    'episode-2',
  );
  assert.equal(
    detailPlayTarget(movie, episodes, true, { recent: ['episode-2'], progress: { 'episode-2': 0 } })
      ?.id,
    'episode-1',
  );
});
test('series details never play the Xtream series placeholder or invent episodes', () => {
  const series = {
    id: 's',
    name: 'Série',
    url: 'https://test/series/user/pass/1',
    category: 'SERIES' as const,
  };
  const library = { recent: [], progress: {} };
  assert.equal(detailPlayTarget(series, null, true, library), null);
  assert.equal(detailPlayTarget(series, [], true, library), null);
  assert.equal(detailPlayTarget(series, null, false, library), series);
});
test('movie details retain original playback URL and HTTP headers', () => {
  const movie = {
    id: 'm',
    name: 'Filme',
    url: 'https://test/movie.mp4',
    httpHeaders: { Referer: 'https://test/' },
    category: 'MOVIE' as const,
  };
  assert.equal(detailPlayTarget(movie, null, false, { recent: [], progress: {} }), movie);
});

import { gridNeighbor } from '../src/catalogGridFocus';
test('catalog grid resolves one D-pad press to the adjacent card and scroll target', () => {
  assert.equal(gridNeighbor(0, 'down', 20, 6), 6);
  assert.equal(gridNeighbor(6, 'up', 20, 6), 0);
  assert.equal(gridNeighbor(7, 'right', 20, 6), 8);
  assert.equal(gridNeighbor(7, 'left', 20, 6), 6);
  assert.equal(gridNeighbor(5, 'right', 20, 6), undefined);
  assert.equal(gridNeighbor(6, 'left', 20, 6), undefined);
  assert.equal(gridNeighbor(18, 'down', 20, 6), undefined);
  assert.equal(gridNeighbor(0, 'up', 20, 6), undefined);
  assert.equal(gridNeighbor(2, 'down', 20, 1), 3);
  assert.equal(gridNeighbor(-1, 'down', 20, 6), undefined);
});

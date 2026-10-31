import { test } from 'node:test';
import assert from 'node:assert/strict';
import { M3UParserService, XtreamService, type Request } from '../src/index';

const creds = {
  url: 'http://provider.test/',
  username: 'a+b',
  password: 'p&ss',
};
test('M3U preserves identity, categories, Unicode and HTTP metadata', async () => {
  const service = new M3UParserService(async () => ({
    data: `#EXTM3U
#EXTINF:-1 tvg-id="news" tvg-logo="http://test/logo.png" group-title="Notícias",Notícias
#EXTVLCOPT:http-user-agent=Senju
http://test/live.ts
#EXTINF:-1 group-title="Filmes",Cinema
http://test/movie.mp4
#EXTINF:-1 group-title="Séries",Temporada
http://test/episode.mp4`,
  }));
  const items = await service.fetchAndParse('http://provider.test/list');
  assert.deepEqual(
    items.map((item) => item.category),
    ['CHANNEL', 'MOVIE', 'SERIES'],
  );
  assert.equal(items[0].id, 'news');
  assert.equal(items[0].name, 'Notícias');
  assert.equal(items[0].httpHeaders?.['User-Agent'], 'Senju');
});
test('M3U rejects invalid provider data and propagates transport failure', async () => {
  await assert.rejects(
    new M3UParserService(async () => ({
      data: '<html>error</html>',
    })).fetchAndParse('url'),
  );
  await assert.rejects(
    new M3UParserService(async () => {
      throw new Error('offline');
    }).fetchAndParse('url'),
    /offline/,
  );
});
test('Xtream authenticates, handles numeric objects, maps groups, encodes credentials', async () => {
  const request: Request = async (url) => {
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('username'), creds.username);
    assert.equal(parsed.searchParams.get('password'), creds.password);
    switch (parsed.searchParams.get('action')) {
      case 'get_live_categories':
        return { data: { 0: { category_id: 2, category_name: 'Notícias' } } };
      case 'get_live_streams':
        return {
          data: { 0: { stream_id: 12, name: 'Canal', category_id: 2 } },
        };
      default:
        return { data: { user_info: { status: 'Active' } } };
    }
  };
  const service = new XtreamService(request);
  assert.equal(await service.loginCheck(creds), true);
  const items = await service.fetchChannels(creds);
  assert.equal(items[0].url, 'http://provider.test/live/a%2Bb/p%26ss/12.ts');
  assert.equal(items[0].groupName, 'Notícias');
});
test('Xtream VOD uses container and episodes are sorted by season/episode', async () => {
  const service = new XtreamService(async (url) => {
    const action = new URL(url).searchParams.get('action');
    if (action === 'get_vod_streams')
      return {
        data: [{ stream_id: 4, name: 'Movie', container_extension: 'mkv' }],
      };
    if (action === 'get_vod_categories') return { data: [] };
    return {
      data: {
        info: { name: 'Series' },
        episodes: {
          2: [
            {
              id: 'b',
              title: 'B',
              season: '2',
              episode_num: '2',
              container_extension: 'mp4',
            },
            {
              id: 'a',
              title: 'A',
              season: '2',
              episode_num: '1',
              container_extension: 'mp4',
            },
          ],
          1: [],
        },
      },
    };
  });
  assert.match((await service.fetchMovies(creds))[0].url, /4.mkv$/);
  const detail = await service.fetchSeriesInfo(creds, '20');
  assert.deepEqual(
    detail.seasons.map((season) => season.number),
    [1, 2],
  );
  assert.deepEqual(
    detail.seasons[1].episodes.map((episode) => episode.id),
    ['a', 'b'],
  );
});
test('Xtream reports failed authentication and propagates catalog errors', async () => {
  const service = new XtreamService(async () => {
    throw new Error('offline');
  });
  assert.equal(await service.loginCheck(creds), false);
  await assert.rejects(service.fetchChannels(creds), /offline/);
});

test('Xtream preserves primary groups and secondary platform membership', async () => {
  const service = new XtreamService(async (url) => {
    if (url.includes('get_vod_categories'))
      return {
        data: [
          { category_id: 1, category_name: 'Filmes | Ação' },
          { category_id: 2, category_name: 'Filmes | Netflix' },
        ],
      };
    return { data: [{ stream_id: 1, name: 'Filme', category_id: 1, category_ids: [1, 2] }] };
  });
  const movie = (await service.fetchMovies(creds))[0];
  assert.equal(movie.groupName, 'Filmes | Ação');
  assert.deepEqual(movie.groupNames, ['Filmes | Ação', 'Filmes | Netflix']);
});

test('Xtream preserves catalog inclusion and update timestamps without using release dates', async () => {
  const service = new XtreamService(async (url) => {
    if (url.includes('categories')) return { data: [] };
    return {
      data: [
        {
          stream_id: 1,
          series_id: 1,
          name: 'With dates',
          added: '1700000000',
          last_modified: 1710000000000,
          releaseDate: '2026-01-01',
        },
        ...[undefined, null, '', 'bad', 'Infinity', 0, -1, true, [], {}, 9e15].map(
          (value, index) => ({
            stream_id: index + 2,
            series_id: index + 2,
            name: 'Undated',
            added: value,
            last_modified: value,
            releaseDate: '2026-01-01',
          }),
        ),
      ],
    };
  });
  for (const catalog of [await service.fetchMovies(creds), await service.fetchSeries(creds)]) {
    assert.equal(catalog[0].addedAt, 1700000000000);
    assert.equal(catalog[0].updatedAt, 1710000000000);
    for (const entry of catalog.slice(1)) {
      assert.equal(entry.addedAt, undefined);
      assert.equal(entry.updatedAt, undefined);
    }
  }
});

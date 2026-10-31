import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SavedPlaylist, PlaylistItem } from '@senju/iptv';
import {
  CatalogCache,
  CACHE_FRESH_MS,
  isCacheFresh,
  type CacheDisk,
  type CatalogSnapshot,
} from '../src/catalogCache';

class Disk implements CacheDisk {
  entries = new Map<string, { manifest: string; pages: string[] }>();
  writes = new Map<string, { key: string; pages: string[] }>();
  reads = new Map<string, { manifest: string; pages: string[] }>();
  sequence = 0;
  failPage = -1;
  async openRead(namespace: string, key: string) {
    const entry = this.entries.get(`${namespace}:${key}`);
    if (!entry) return null;
    const handle = String(++this.sequence);
    this.reads.set(handle, entry);
    return { handle, manifest: entry.manifest };
  }
  async readPage(handle: string, index: number) {
    const value = this.reads.get(handle)?.pages[index];
    if (value === undefined) throw new Error('Missing page');
    return value;
  }
  async closeRead(handle: string) {
    this.reads.delete(handle);
  }
  async beginWrite(namespace: string, key: string) {
    const token = String(++this.sequence);
    this.writes.set(token, { key: `${namespace}:${key}`, pages: [] });
    return token;
  }
  async writePage(token: string, index: number, value: string) {
    if (index === this.failPage) throw new Error('Disk full');
    this.writes.get(token)!.pages[index] = value;
  }
  async commit(token: string, manifest: string) {
    const write = this.writes.get(token)!;
    this.entries.set(write.key, { manifest, pages: write.pages });
    this.writes.delete(token);
  }
  async abortWrite(token: string) {
    this.writes.delete(token);
  }
  async clear(namespace: string | null) {
    for (const key of this.entries.keys())
      if (namespace === null || key.startsWith(`${namespace}:`)) this.entries.delete(key);
  }
}
const source: SavedPlaylist = {
  id: 'fixture-a',
  name: 'Fixture',
  type: 'XTREAM',
  data: { url: 'https://example.test', username: 'fixture', password: 'fixture' },
};
const movie: PlaylistItem = {
  id: 'movie-1',
  name: 'Filme ç',
  url: 'https://example.test/movie',
  category: 'MOVIE',
  groupName: 'Netflix',
  tvgLogo: 'https://images.example.test/posters/movie-poster.jpg',
  addedAt: 1700000000000,
};
function snapshot(count = 1): CatalogSnapshot {
  return {
    savedAt: Date.now(),
    groups: { MOVIE: ['Netflix'], SERIES: ['Netflix'] },
    items: Array.from({ length: count }, (_, index) => ({ ...movie, id: `movie-${index}` })),
  };
}
const signal = () => new AbortController().signal;

test('catalog cache round trips paginated catalogs and metadata, including empty catalogs', async () => {
  const disk = new Disk();
  const cache = new CatalogCache(disk);
  const expected = snapshot(45001);
  await cache.write(source, 'MOVIE', expected, signal());
  assert.equal([...disk.entries.values()][0].pages.length, 91);
  assert.ok(
    [...disk.entries.values()][0].pages.reduce((size, page) => size + Buffer.byteLength(page), 0) >
      6 * 1024 * 1024,
  );
  assert.deepEqual(await cache.read(source, 'MOVIE', signal()), expected);
  assert.equal(disk.reads.size, 0);
  await cache.write(source, 'MOVIE', snapshot(0), signal());
  assert.deepEqual((await cache.read(source, 'MOVIE', signal()))?.items, []);
});
test('cache keys isolate accounts, credentials and Xtream types; M3U shares its complete catalog', async () => {
  const cache = new CatalogCache(new Disk());
  await cache.write(source, 'MOVIE', snapshot(), signal());
  assert.equal(await cache.read({ ...source, id: 'fixture-b' }, 'MOVIE', signal()), null);
  assert.equal(
    await cache.read(
      { ...source, data: { ...(source.data as object), password: 'changed' } } as SavedPlaylist,
      'MOVIE',
      signal(),
    ),
    null,
  );
  assert.equal(await cache.read(source, 'SERIES', signal()), null);
  const m3u: SavedPlaylist = { ...source, type: 'M3U', data: 'https://example.test/list' };
  const value = snapshot();
  value.items.push({ ...movie, id: 'channel', category: 'CHANNEL' });
  await cache.write(m3u, 'CHANNEL', value, signal());
  assert.deepEqual(await cache.read(m3u, 'SERIES', signal()), value);
});
test('cache freshness has a six hour boundary and never treats a future timestamp as fresh', () => {
  const now = Date.now();
  assert.equal(isCacheFresh(now - CACHE_FRESH_MS + 1, now), true);
  assert.equal(isCacheFresh(now - CACHE_FRESH_MS, now), false);
  assert.equal(isCacheFresh(now + 1, now), false);
});
test('partial or cancelled writes preserve the last complete snapshot', async () => {
  const disk = new Disk();
  const cache = new CatalogCache(disk);
  const previous = snapshot();
  await cache.write(source, 'MOVIE', previous, signal());
  disk.failPage = 1;
  await assert.rejects(cache.write(source, 'MOVIE', snapshot(1001), signal()), /Disk full/);
  assert.equal(disk.writes.size, 0);
  assert.deepEqual(await cache.read(source, 'MOVIE', signal()), previous);
  disk.failPage = -1;
  const controller = new AbortController();
  const append = disk.writePage.bind(disk);
  disk.writePage = async (...args) => {
    await append(...args);
    controller.abort();
  };
  await assert.rejects(
    cache.write(source, 'MOVIE', snapshot(1001), controller.signal),
    /cancelado/,
  );
  assert.equal(disk.writes.size, 0);
  assert.deepEqual(await cache.read(source, 'MOVIE', signal()), previous);
});
test('invalid schema, corrupt pages, wrong category and missing pages never return partial catalogs', async () => {
  const disk = new Disk();
  const cache = new CatalogCache(disk);
  for (const corrupt of [
    (entry: { manifest: string; pages: string[] }) => {
      entry.manifest = '{';
    },
    (entry: { manifest: string; pages: string[] }) => {
      entry.manifest = JSON.stringify({ ...JSON.parse(entry.manifest), version: 999 });
    },
    (entry: { manifest: string; pages: string[] }) => {
      entry.pages[0] = '[{}]';
    },
    (entry: { manifest: string; pages: string[] }) => {
      entry.pages[0] = JSON.stringify([{ ...movie, category: 'SERIES' }]);
    },
    (entry: { manifest: string; pages: string[] }) => {
      entry.pages = [];
    },
  ]) {
    await cache.write(source, 'MOVIE', snapshot(), signal());
    corrupt([...disk.entries.values()][0]);
    await assert.rejects(cache.read(source, 'MOVIE', signal()));
    assert.equal(disk.reads.size, 0);
  }
});
test('cancelled reads release their handle and clear can target a single account', async () => {
  const disk = new Disk();
  const cache = new CatalogCache(disk);
  await cache.write(source, 'MOVIE', snapshot(1001), signal());
  const other = { ...source, id: 'fixture-b' };
  await cache.write(other, 'MOVIE', snapshot(), signal());
  const controller = new AbortController();
  const read = disk.readPage.bind(disk);
  disk.readPage = async (...args) => {
    const value = await read(...args);
    controller.abort();
    return value;
  };
  await assert.rejects(cache.read(source, 'MOVIE', controller.signal), /cancelado/);
  assert.equal(disk.reads.size, 0);
  disk.readPage = read;
  await cache.clear(source.id);
  assert.equal(await cache.read(source, 'MOVIE', signal()), null);
  assert.ok(await cache.read(other, 'MOVIE', signal()));
  await cache.clear();
  assert.equal(disk.entries.size, 0);
});

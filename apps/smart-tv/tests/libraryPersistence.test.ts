import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyLibrary, normalizeLibrary } from '../src/persistence';

const item = (id: string) => ({ id, name: id, url: 'https://example.test/' + id, category: 'MOVIE' as const });

test('invalid library objects are recovered without throwing', () => {
  for (const value of [null, 'text', 42, []]) {
    const result = normalizeLibrary(value);
    assert.equal(result.recovered, true);
    assert.deepEqual(result.library, emptyLibrary());
  }
});

test('valid library fields survive normalization unchanged', () => {
  const value = {
    favorites: [item('a'), item('b')],
    recent: [item('b')],
    progress: { a: 42, b: 0 },
    episodeParents: { b: 'a' },
    currentEpisodes: { a: 'b' },
  };
  const result = normalizeLibrary(value);
  assert.equal(result.recovered, false);
  assert.deepEqual(result.library, value);
});

test('bad items, positions and maps are dropped and flagged for recovery', () => {
  const result = normalizeLibrary({
    favorites: [item('a'), { id: 'b' }, 'c'],
    recent: 'nope',
    progress: { a: 8, b: -3, c: 'x', d: Number.NaN },
    episodeParents: { a: 'b', bad: 1 },
    currentEpisodes: [],
  });
  assert.equal(result.recovered, true);
  assert.deepEqual(result.library.favorites, [item('a')]);
  assert.deepEqual(result.library.recent, []);
  assert.deepEqual(result.library.progress, { a: 8 });
  assert.deepEqual(result.library.episodeParents, { a: 'b' });
  assert.deepEqual(result.library.currentEpisodes, {});
});

test('favorites, recent and progress are capped on read and on write', () => {
  const favorites = Array.from({ length: 205 }, (_, i) => item(`f${i}`));
  const recent = Array.from({ length: 55 }, (_, i) => item(`r${i}`));
  const progress = Object.fromEntries(Array.from({ length: 505 }, (_, i) => [`p${i}`, i]));
  const { library } = normalizeLibrary({ favorites, recent, progress });
  assert.equal(library.favorites.length, 200);
  assert.equal(library.recent.length, 50);
  assert.equal(Object.keys(library.progress).length, 500);
  assert.deepEqual(normalizeLibrary(library).library, library);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIBRARY_LIMITS,
  emptyLibrary,
  normalizeLibrary,
  parseLibrary,
} from '../src/librarySchema';

test('corrupt or non-object libraries never throw and start empty', () => {
  for (const value of ['{', 'null', '[]', '"text"', '42']) {
    const result = parseLibrary(value);
    assert.equal(result.recovered, true);
    assert.deepEqual(result.library, emptyLibrary());
  }
  assert.deepEqual(parseLibrary(null), { library: emptyLibrary(), recovered: false });
});

test('valid libraries are preserved without a recovery warning', () => {
  const value = {
    favorites: ['a', 'b'],
    recent: ['b', 'a'],
    progress: { a: 12.5, b: 0 },
  };
  const result = parseLibrary(JSON.stringify(value));
  assert.equal(result.recovered, false);
  assert.deepEqual(result.library, value);
});

test('wrong field types and bad positions are recovered instead of breaking favorites', () => {
  const result = parseLibrary(
    JSON.stringify({
      favorites: 'not-an-array',
      recent: ['ok', 5, 'ok', null],
      progress: { a: 10, b: -1, c: 'x', d: Number.NaN, e: 3 },
    }),
  );
  assert.equal(result.recovered, true);
  assert.deepEqual(result.library.favorites, []);
  assert.deepEqual(result.library.recent, ['ok']);
  assert.deepEqual(result.library.progress, { a: 10, e: 3 });
});

test('collections are capped on read and on write without losing valid entries', () => {
  const favorites = Array.from({ length: LIBRARY_LIMITS.favorites + 20 }, (_, i) => `f${i}`);
  const recent = Array.from({ length: LIBRARY_LIMITS.recent + 20 }, (_, i) => `r${i}`);
  const progress = Object.fromEntries(
    Array.from({ length: LIBRARY_LIMITS.progress + 20 }, (_, i) => [`p${i}`, i]),
  );
  const { library } = normalizeLibrary({ favorites, recent, progress });
  assert.equal(library.favorites.length, LIBRARY_LIMITS.favorites);
  assert.equal(library.recent.length, LIBRARY_LIMITS.recent);
  assert.equal(Object.keys(library.progress).length, LIBRARY_LIMITS.progress);
  assert.deepEqual(library.favorites[0], 'f0');
  assert.deepEqual(normalizeLibrary(library).library, library);
});

import { performance } from 'node:perf_hooks';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { itemGroups, platformForGroup, type PlaylistItem } from '@senju/iptv';
import { indexCatalog, selectCatalog } from '../src/catalogIndex';
const items: PlaylistItem[] = Array.from({ length: 50_000 }, (_, n) => ({
  id: String(n),
  name: `Título ${n}`,
  category: 'MOVIE',
  groupName: n % 2 ? 'NETFLIX | FILMES' : 'PRIME VIDEO | FILMES',
  url: `https://example.test/${n}`,
}));
function run(task: () => PlaylistItem[]) {
  const samples = [];
  for (let i = 0; i < 7; i++) {
    const start = performance.now();
    if (task().length !== 25_000) throw new Error('Fixture inválida.');
    samples.push(Math.round((performance.now() - start) * 100) / 100);
  }
  return samples;
}
const before = run(() =>
  items.filter(
    (item) =>
      itemGroups(item).some((g) => platformForGroup(g) === 'netflix') &&
      item.name.toLowerCase().includes('título'),
  ),
);
const start = performance.now(),
  index = indexCatalog(items),
  indexMs = performance.now() - start;
const after = run(() => selectCatalog(index, { platform: 'netflix', group: '', query: 'título' }));
const report = {
  items: items.length,
  before_ms: before,
  index_once_ms: Math.round(indexMs * 100) / 100,
  after_ms: after,
  distinct_groups: index.platforms.size,
  environment: 'Node22 development machine. Not TV performance, simulator or decoder evidence.',
};
await mkdir(resolve('build'), { recursive: true });
await writeFile(resolve('build/catalog-performance.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));

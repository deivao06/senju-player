import type { ItemCategory, SavedPlaylist } from '@senju/iptv';
import { isCacheFresh } from './catalogCache';

/** The combined feed loads only missing/stale types, one at a time on small TVs. */
export function newCatalogTypes(
  source: SavedPlaylist,
  loaded: Map<ItemCategory, number>,
  force = false,
  now = Date.now(),
): ItemCategory[] {
  const types: ItemCategory[] = source.type === 'M3U' ? ['MOVIE'] : ['MOVIE', 'SERIES'];
  return types.filter(
    (type) => force || !loaded.has(type) || !isCacheFresh(loaded.get(type)!, now),
  );
}

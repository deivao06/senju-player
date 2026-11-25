import type { ItemCategory, SavedPlaylist } from '@senju/iptv';
import { isCacheFresh, type CatalogSnapshot } from './catalogCache';

export const ALL_TYPES = ['CHANNEL', 'MOVIE', 'SERIES'] as const;

/** M3U stores one combined snapshot; Xtream stores one per category. */
export function catalogKey(source: SavedPlaylist, type: ItemCategory) {
  return `${source.id}:${source.type === 'M3U' ? 'ALL' : type}`;
}

/** Session cache that survives switching providers, so disk reads are not repeated. */
export class CatalogMemory {
  readonly loaded = new Map<string, number>();
  private readonly snapshots = new Map<string, CatalogSnapshot>();

  get(source: SavedPlaylist, type: ItemCategory) {
    return this.snapshots.get(catalogKey(source, type)) ?? null;
  }

  remember(source: SavedPlaylist, type: ItemCategory, snapshot: CatalogSnapshot) {
    this.snapshots.set(catalogKey(source, type), snapshot);
    for (const value of source.type === 'M3U' ? ALL_TYPES : [type])
      this.loaded.set(catalogKey(source, value), snapshot.savedAt);
  }

  isLoaded(source: SavedPlaylist, type: ItemCategory, now = Date.now()) {
    const savedAt = this.loaded.get(catalogKey(source, type));
    return savedAt !== undefined && isCacheFresh(savedAt, now);
  }

  forget(sourceId?: string) {
    if (!sourceId) {
      this.snapshots.clear();
      this.loaded.clear();
      return;
    }
    const prefix = `${sourceId}:`;
    for (const key of [...this.snapshots.keys()]) if (key.startsWith(prefix)) this.snapshots.delete(key);
    for (const key of [...this.loaded.keys()]) if (key.startsWith(prefix)) this.loaded.delete(key);
  }
}

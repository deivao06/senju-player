import type { ItemCategory, PlaylistItem, SavedPlaylist } from '@senju/iptv';
import type { CategoryGroups } from './catalogNavigation';

export const CACHE_FRESH_MS = 6 * 60 * 60 * 1000;
const PAGE_SIZE = 500;
export interface CacheDisk {
  openRead(namespace: string, key: string): Promise<{ handle: string; manifest: string } | null>;
  readPage(handle: string, index: number): Promise<string>;
  closeRead(handle: string): Promise<void>;
  beginWrite(namespace: string, key: string): Promise<string>;
  writePage(token: string, index: number, value: string): Promise<void>;
  commit(token: string, manifest: string): Promise<void>;
  abortWrite(token: string): Promise<void>;
  clear(namespace: string | null): Promise<void>;
}
export type CatalogSnapshot = {
  items: PlaylistItem[];
  groups: CategoryGroups;
  savedAt: number;
};
// Credentials are hashed natively for the filename, never stored in the manifest or logs.
function cacheKey(source: SavedPlaylist, type: ItemCategory) {
  return JSON.stringify([1, source.type, source.data, source.type === 'M3U' ? 'ALL' : type]);
}
export function isCacheFresh(savedAt: number, now = Date.now()) {
  return savedAt <= now && now - savedAt < CACHE_FRESH_MS;
}
function validItem(item: unknown, source: SavedPlaylist, type: ItemCategory): item is PlaylistItem {
  if (!item || typeof item !== 'object') return false;
  const value = item as PlaylistItem;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.url === 'string' &&
    ['CHANNEL', 'MOVIE', 'SERIES'].includes(value.category) &&
    (source.type === 'M3U' || value.category === type) &&
    (value.groupName === undefined || typeof value.groupName === 'string') &&
    (value.groupNames === undefined ||
      (Array.isArray(value.groupNames) &&
        value.groupNames.every((name) => typeof name === 'string')))
  );
}
function validGroups(value: unknown): value is CategoryGroups {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([key, names]) =>
        ['CHANNEL', 'MOVIE', 'SERIES'].includes(key) &&
        Array.isArray(names) &&
        names.every((name) => typeof name === 'string'),
    )
  );
}
function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw new Error('Cache cancelado.');
}
/** Pages bound JSON work per turn. The disk publishes only after every page succeeds. */
export class CatalogCache {
  constructor(private readonly disk: CacheDisk) {}
  async read(
    source: SavedPlaylist,
    type: ItemCategory,
    signal: AbortSignal,
  ): Promise<CatalogSnapshot | null> {
    checkAbort(signal);
    const entry = await this.disk.openRead(source.id, cacheKey(source, type));
    if (!entry) return null;
    try {
      const meta = JSON.parse(entry.manifest);
      if (
        meta.version !== 1 ||
        !Number.isInteger(meta.pages) ||
        meta.pages < 0 ||
        meta.pages > 2000 ||
        !Number.isInteger(meta.count) ||
        meta.count < 0 ||
        meta.count > 1000000 ||
        meta.pages !== Math.ceil(meta.count / PAGE_SIZE) ||
        !Number.isFinite(meta.savedAt) ||
        meta.savedAt <= 0 ||
        meta.savedAt > Date.now() + 60000 ||
        !validGroups(meta.groups)
      )
        throw new Error('Cache inválido.');
      const items: PlaylistItem[] = [];
      for (let page = 0; page < meta.pages; page++) {
        checkAbort(signal);
        const values: unknown = JSON.parse(await this.disk.readPage(entry.handle, page));
        if (
          !Array.isArray(values) ||
          values.length !== Math.min(PAGE_SIZE, meta.count - page * PAGE_SIZE) ||
          !values.every((item) => validItem(item, source, type))
        )
          throw new Error('Cache inválido.');
        for (const item of values) items.push(item as PlaylistItem);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      checkAbort(signal);
      return { items, savedAt: meta.savedAt, groups: meta.groups };
    } finally {
      await this.disk.closeRead(entry.handle);
    }
  }
  async write(
    source: SavedPlaylist,
    type: ItemCategory,
    snapshot: CatalogSnapshot,
    signal: AbortSignal,
  ) {
    checkAbort(signal);
    const token = await this.disk.beginWrite(source.id, cacheKey(source, type));
    let committed = false;
    try {
      const pages = Math.ceil(snapshot.items.length / PAGE_SIZE);
      if (pages > 2000) throw new Error('Catálogo excede o limite do cache.');
      for (let index = 0; index < pages; index++) {
        checkAbort(signal);
        const value = JSON.stringify(
          snapshot.items.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE),
        );
        await this.disk.writePage(token, index, value);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      checkAbort(signal);
      await this.disk.commit(
        token,
        JSON.stringify({
          version: 1,
          pages,
          count: snapshot.items.length,
          savedAt: snapshot.savedAt,
          groups: snapshot.groups,
        }),
      );
      committed = true;
    } finally {
      if (!committed) await this.disk.abortWrite(token);
    }
  }
  clear(sourceId: string | null = null) {
    return this.disk.clear(sourceId);
  }
}

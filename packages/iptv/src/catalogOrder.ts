import type { PlaylistItem } from './playlist';

export const NEW_ITEMS_DAYS = 30;
export const NEW_ITEMS_WINDOW_MS = NEW_ITEMS_DAYS * 24 * 60 * 60 * 1000;
function timestamp(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}
/** Catalogs default to provider update time, falling back to inclusion time. */
export function catalogTimestamp(item: PlaylistItem): number {
  return item.category === 'CHANNEL' ? 0 : timestamp(item.updatedAt) || timestamp(item.addedAt);
}
/** A separate inclusion feed; series-only update dates are an explicit provider fallback. */
export function inclusionTimestamp(item: PlaylistItem): number {
  return item.category === 'MOVIE'
    ? timestamp(item.addedAt)
    : item.category === 'SERIES'
      ? timestamp(item.addedAt) || timestamp(item.updatedAt)
      : 0;
}
export function isNewCatalogItem(item: PlaylistItem, now: number): boolean {
  const date = inclusionTimestamp(item);
  return date > 0 && date >= now - NEW_ITEMS_WINDOW_MS && date <= now;
}
/** Stable ties and undated items last; never mutate the provider's array. */
export function orderByLatest(items: PlaylistItem[]): PlaylistItem[] {
  return [...items].sort((a, b) => catalogTimestamp(b) - catalogTimestamp(a));
}
export function orderByInclusion(items: PlaylistItem[]): PlaylistItem[] {
  return [...items].sort((a, b) => inclusionTimestamp(b) - inclusionTimestamp(a));
}

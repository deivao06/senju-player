import type { ItemCategory, PlaylistItem } from '@senju/iptv';
import { isNewCatalogItem, orderByInclusion } from './catalogOrder';
export type CatalogFilter = 'all' | 'favorites' | 'recent' | 'new';

type Selection = {
  category: ItemCategory;
  platform: string;
  group: string;
  query: string;
  filter: CatalogFilter;
  now?: number;
};
/** Search always narrows the selected section; it never searches another menu's catalog. */
export function filterCatalog(
  items: PlaylistItem[],
  selection: Selection,
  library: { favorites: string[]; recent: string[] },
  groupPlatforms: Map<string, string | undefined>,
) {
  const favorites = new Set(library.favorites);
  const recent = new Set(library.recent);
  const query = selection.query.trim().toLowerCase();
  const combined = selection.filter === 'new';
  const now = selection.now ?? Date.now();
  const result = items.filter((item) => {
    if (combined ? !isNewCatalogItem(item, now) : item.category !== selection.category)
      return false;
    const groups = item.groupNames;
    const primary = item.groupName || 'Outros';
    if (
      !combined &&
      selection.group &&
      !(groups ? groups.includes(selection.group) : primary === selection.group)
    )
      return false;
    if (
      !combined &&
      selection.platform &&
      !(groups
        ? groups.some((group) => groupPlatforms.get(group) === selection.platform)
        : groupPlatforms.get(primary) === selection.platform)
    )
      return false;
    if (selection.filter === 'favorites' && !favorites.has(item.id)) return false;
    if (selection.filter === 'recent' && !recent.has(item.id)) return false;
    return (
      !query || `${item.name} ${groups ? groups.join(' ') : primary}`.toLowerCase().includes(query)
    );
  });
  if (combined) return orderByInclusion(result);
  if (selection.filter === 'recent') {
    const order = new Map(library.recent.map((id, index) => [id, index]));
    result.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }
  return result;
}

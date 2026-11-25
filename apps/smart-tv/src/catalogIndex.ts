import { itemGroups, platformForGroup, type PlaylistItem } from '@senju/iptv';
export const PAGE_SIZE = 30;
export const GROUP_PAGE_SIZE = 80;
export const EMPTY_CATALOG: PlaylistItem[] = [];
export type CatalogIndex = {
  items: PlaylistItem[];
  names: string[];
  groups: string[];
  platforms: Map<string, string | undefined>;
};
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
/** Index strings and distinct provider groups once, never once per item per keypress. */
const indexes = new WeakMap<PlaylistItem[], CatalogIndex>();
export function rememberCatalogIndex(index: CatalogIndex) {
  indexes.set(index.items, index);
}
export function indexCatalog(items: PlaylistItem[]): CatalogIndex {
  const cached = indexes.get(items);
  if (cached) return cached;
  const platforms = new Map<string, string | undefined>();
  const names = new Array<string>(items.length);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    names[i] = normalize(item.name);
    for (const group of itemGroups(item)) {
      if (!platforms.has(group)) platforms.set(group, platformForGroup(group));
    }
  }
  const index = { items, names, platforms, groups: [...platforms.keys()].sort() };
  rememberCatalogIndex(index);
  return index;
}
export function selectCatalog(
  index: CatalogIndex,
  selection: { platform: string; group: string; query: string },
) {
  const { platform, group } = selection;
  const query = normalize(selection.query.trim());
  if (!platform && !group && !query) return index.items;
  return index.items.filter((item, n) => {
    if (query && !index.names[n].includes(query)) return false;
    const groups = item.groupNames?.length ? item.groupNames : undefined;
    const primary = item.groupName || 'Outros';
    if (group && !(groups ? groups.includes(group) : primary === group)) return false;
    return (
      !platform ||
      (groups
        ? groups.some((name) => index.platforms.get(name) === platform)
        : index.platforms.get(primary) === platform)
    );
  });
}

import type { ItemCategory, PlaylistItem } from './playlist';

export type CategoryGroups = Partial<Record<ItemCategory, string[]>>;
export type CatalogSelection = { platform?: string; group?: string };
export const contentLabels: Record<ItemCategory, string> = {
  CHANNEL: 'Ao vivo',
  MOVIE: 'Filmes',
  SERIES: 'Séries',
};
const platforms = [
  { key: 'globoplay', label: 'Globoplay', aliases: ['globoplay', 'globo play'] },
  { key: 'netflix', label: 'Netflix', aliases: ['netflix'] },
  { key: 'prime', label: 'Prime Video', aliases: ['prime video', 'amazon prime', 'amazon'] },
  { key: 'disney', label: 'Disney+', aliases: ['disney', 'disneyplus'] },
  { key: 'max', label: 'HBO / Max', aliases: ['hbo', 'max'] },
  { key: 'apple', label: 'Apple TV+', aliases: ['apple tv', 'appletv'] },
  { key: 'paramount', label: 'Paramount+', aliases: ['paramount'] },
  { key: 'crunchyroll', label: 'Crunchyroll', aliases: ['crunchyroll'] },
  { key: 'discovery', label: 'Discovery+', aliases: ['discovery'] },
  { key: 'star', label: 'Star+', aliases: ['star plus', 'starplus', 'star+'] },
  { key: 'mubi', label: 'MUBI', aliases: ['mubi'] },
  { key: 'telecine', label: 'Telecine', aliases: ['telecine'] },
  { key: 'pluto', label: 'Pluto TV', aliases: ['pluto'] },
  { key: 'looke', label: 'Looke', aliases: ['looke'] },
];
function normalize(value: string) {
  return ` ${value
    .replace(/\+/g, ' plus ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}
const aliases = platforms.map((platform) => ({
  ...platform,
  aliases: platform.aliases.map(normalize),
}));
/** Provider category labels are the only evidence; never infer ownership from titles or stream URLs. */
export function platformForGroup(group: string): string | undefined {
  const value = normalize(group);
  return aliases.find((platform) => platform.aliases.some((alias) => value.includes(alias)))?.key;
}
export function platformLabel(key: string): string {
  return platforms.find((platform) => platform.key === key)?.label || key;
}
export function itemGroups(item: PlaylistItem): string[] {
  return item.groupNames?.length ? item.groupNames : [item.groupName || 'Outros'];
}
export function mergeCategoryGroups(
  current: CategoryGroups,
  incoming: CategoryGroups,
): CategoryGroups {
  const result = { ...current };
  for (const type of ['CHANNEL', 'MOVIE', 'SERIES'] as const)
    if (incoming[type]) {
      result[type] = [...new Set([...(current[type] || []), ...incoming[type]])].sort();
    }
  return result;
}
export function groupsFromItems(items: PlaylistItem[]): CategoryGroups {
  const groups: Partial<Record<ItemCategory, Set<string>>> = {};
  for (const item of items)
    for (const group of itemGroups(item)) (groups[item.category] ||= new Set()).add(group);
  return Object.fromEntries(
    Object.entries(groups).map(([type, names]) => [type, [...names].sort()]),
  );
}
export function platformSections(groups: CategoryGroups) {
  const available = new Map<string, Set<ItemCategory>>();
  for (const [type, names] of Object.entries(groups))
    for (const name of names) {
      const key = platformForGroup(name);
      if (!key) continue;
      const types = available.get(key) || new Set<ItemCategory>();
      types.add(type as ItemCategory);
      available.set(key, types);
    }
  return platforms
    .flatMap((platform) => {
      const types = (['SERIES', 'MOVIE', 'CHANNEL'] as const).filter((type) =>
        available.get(platform.key)?.has(type),
      );
      return types.length ? [{ key: platform.key, label: platform.label, types }] : [];
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

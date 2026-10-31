import type { ItemCategory } from './playlist';
import { platformSections, type CategoryGroups } from './catalogNavigation';

const featured = [
  { key: 'netflix', label: 'Netflix', background: '#200f14' },
  { key: 'globoplay', label: 'Globoplay', background: '#28151c' },
  { key: 'prime', label: 'Prime Video', background: '#0c2031' },
  { key: 'disney', label: 'Disney+', background: '#10252c' },
  { key: 'max', label: 'HBO', background: '#21182d' },
];
export function homePlatforms(groups: CategoryGroups) {
  const available = new Map(
    platformSections(groups).map((platform) => [platform.key, platform.types]),
  );
  return featured.map((platform) => ({ ...platform, types: available.get(platform.key) || [] }));
}
export function platformCategory(types: ItemCategory[]): ItemCategory | undefined {
  return types.includes('MOVIE')
    ? 'MOVIE'
    : types.includes('SERIES')
      ? 'SERIES'
      : types.includes('CHANNEL')
        ? 'CHANNEL'
        : undefined;
}

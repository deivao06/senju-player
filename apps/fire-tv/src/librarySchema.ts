export interface LibraryState {
  favorites: string[];
  recent: string[];
  progress: Record<string, number>;
}

export const LIBRARY_LIMITS = { favorites: 200, recent: 50, progress: 500 } as const;

export function emptyLibrary(): LibraryState {
  return { favorites: [], recent: [], progress: {} };
}

function strings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === 'string'))];
}

function positions(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [id, position] of Object.entries(value)) {
    if (typeof position === 'number' && Number.isFinite(position) && position >= 0)
      result[id] = position;
  }
  return result;
}

/** Accepts older records, drops invalid fields and bounds every collection. */
export function normalizeLibrary(value: unknown): { library: LibraryState; recovered: boolean } {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { library: emptyLibrary(), recovered: true };
  const record = value as Record<string, unknown>;
  const favoritesRaw = Array.isArray(record.favorites) ? record.favorites : null;
  const recentRaw = Array.isArray(record.recent) ? record.recent : null;
  const progressRaw =
    !!record.progress && typeof record.progress === 'object' && !Array.isArray(record.progress)
      ? record.progress
      : null;
  const library: LibraryState = {
    favorites: strings(record.favorites).slice(0, LIBRARY_LIMITS.favorites),
    recent: strings(record.recent).slice(0, LIBRARY_LIMITS.recent),
    progress: Object.fromEntries(
      Object.entries(positions(record.progress)).slice(0, LIBRARY_LIMITS.progress),
    ),
  };
  const favoritesInvalid =
    record.favorites !== undefined &&
    (!favoritesRaw || favoritesRaw.some((id) => typeof id !== 'string'));
  const recentInvalid =
    record.recent !== undefined &&
    (!recentRaw || recentRaw.some((id) => typeof id !== 'string'));
  const progressInvalid = record.progress !== undefined && !progressRaw;
  const recovered =
    favoritesInvalid ||
    recentInvalid ||
    progressInvalid ||
    (favoritesRaw !== null && library.favorites.length !== favoritesRaw.length) ||
    (recentRaw !== null && library.recent.length !== recentRaw.length) ||
    (progressRaw !== null &&
      Object.keys(library.progress).length !== Object.keys(progressRaw).length);
  return { library, recovered };
}

export function parseLibrary(value: string | null): { library: LibraryState; recovered: boolean } {
  if (!value) return { library: emptyLibrary(), recovered: false };
  try {
    return normalizeLibrary(JSON.parse(value));
  } catch {
    return { library: emptyLibrary(), recovered: true };
  }
}

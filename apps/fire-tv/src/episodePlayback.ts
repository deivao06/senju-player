import type { PlaylistItem } from '@senju/iptv';
import type { LibraryState } from './storage';

/** The queue is the series detail order (season, then episode), never the filtered screen. */
export function completePlayback(
  item: PlaylistItem,
  episodes: PlaylistItem[] | null,
  library: LibraryState,
): { next: PlaylistItem | null; focusIndex?: number; library: LibraryState; error?: string } {
  if (item.category === 'CHANNEL') return { next: null, library };
  const completedLibrary = { ...library, progress: { ...library.progress, [item.id]: 0 } };
  const index = episodes?.findIndex((episode) => episode.id === item.id) ?? -1;
  if (index < 0 || !episodes) return { next: null, library: completedLibrary };
  const next = episodes[index + 1];
  if (!next) return { next: null, focusIndex: index, library: completedLibrary };
  if (next.id === item.id)
    return {
      next: null,
      focusIndex: index,
      library: completedLibrary,
      error: 'A lista repete o identificador do episódio seguinte. Não foi possível avançar.',
    };
  if (typeof next.url !== 'string' || !next.url.trim())
    return {
      next: null,
      focusIndex: index,
      library: completedLibrary,
      error: 'O próximo episódio não tem uma URL de reprodução válida.',
    };
  return {
    next,
    focusIndex: index + 1,
    library: {
      ...completedLibrary,
      recent: [next.id, ...library.recent.filter((id) => id !== next.id)].slice(0, 50),
      progress: { ...completedLibrary.progress, [next.id]: 0 },
    },
  };
}

export function episodeNavigation(item: PlaylistItem, episodes: PlaylistItem[] | null) {
  const index = episodes?.findIndex((episode) => episode.id === item.id) ?? -1;
  if (!episodes || index < 0 || item.category === 'CHANNEL') return undefined;
  const valid = (episode?: PlaylistItem) =>
    episode && episode.id !== item.id && typeof episode.url === 'string' && !!episode.url.trim();
  return { index, previous: !!valid(episodes[index - 1]), next: !!valid(episodes[index + 1]) };
}

/** Manual skips save the current position; they do not mark the current episode complete. */
export function changeEpisode(
  item: PlaylistItem,
  episodes: PlaylistItem[] | null,
  direction: -1 | 1,
  position: number,
  library: LibraryState,
) {
  const navigation = episodeNavigation(item, episodes);
  if (!navigation || !episodes || !(direction === -1 ? navigation.previous : navigation.next))
    return undefined;
  const index = navigation.index + direction;
  const next = episodes[index];
  return {
    next,
    index,
    library: {
      ...library,
      recent: [next.id, ...library.recent.filter((id) => id !== next.id)].slice(0, 50),
      progress: {
        ...library.progress,
        [item.id]: Number.isFinite(position) ? Math.max(0, position) : 0,
        [next.id]: 0,
      },
    },
  };
}

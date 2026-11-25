import type { PlaylistItem, SeriesDetail } from './playlist';
export type DetailEpisode = PlaylistItem & {
  seasonNumber: number;
  episodeNumber: number;
  plot?: string;
  duration?: string;
};
/** Preserve the complete provider season order for manual and automatic playback. */
export function detailEpisodes(detail: SeriesDetail): DetailEpisode[] {
  return detail.seasons.flatMap((season) =>
    season.episodes.map((episode) => ({
      id: `episode-${episode.id}`,
      name: `T${season.number} E${episode.episodeNumber} — ${episode.title}`,
      category: 'MOVIE' as const,
      url: episode.url,
      tvgLogo: episode.info?.movie_image || detail.info.cover,
      seasonNumber: season.number,
      episodeNumber: episode.episodeNumber,
      plot: episode.info?.plot,
      duration: episode.info?.duration,
    })),
  );
}
export function detailPlayTarget(
  item: PlaylistItem,
  episodes: DetailEpisode[] | null,
  requiresEpisodes: boolean,
  library: { recent: string[]; progress: Record<string, number> },
): PlaylistItem | null {
  if (!requiresEpisodes) return typeof item.url === 'string' && item.url.trim() ? item : null;
  if (!episodes?.length) return null;
  const resumable = new Map(
    episodes
      .filter((ep) => Number.isFinite(library.progress[ep.id]) && library.progress[ep.id] > 0)
      .map((ep) => [ep.id, ep]),
  );
  return library.recent.map((id) => resumable.get(id)).find(Boolean) || episodes[0];
}

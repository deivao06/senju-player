export type ItemCategory = 'CHANNEL' | 'MOVIE' | 'SERIES';

export interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  category: ItemCategory;
  httpHeaders?: Record<string, string>;
  tvgId?: string;
  tvgLogo?: string;
  groupName?: string;
  groupNames?: string[];
  streamId?: string;
  containerExtension?: string;
  seriesId?: string;
  /** Provider catalog timestamps in Unix milliseconds, not theatrical release dates. */
  addedAt?: number;
  updatedAt?: number;
}

export interface Episode {
  id: string;
  title: string;
  containerExtension: string;
  seasonNumber: number;
  episodeNumber: number;
  url: string;
  info?: {
    movie_image?: string;
    plot?: string;
    duration?: string;
    rating?: string;
  };
}

export interface Season {
  number: number;
  episodes: Episode[];
}

export interface MediaInfo {
  name: string;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  rating: string;
  backdrop?: string;
  duration?: string;
}

export interface MovieDetail {
  info: MediaInfo;
}

export interface SeriesDetail {
  info: MediaInfo;
  seasons: Season[];
}

export interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

export interface SavedPlaylist {
  id: string;
  name: string;
  type: 'M3U' | 'XTREAM';
  data: string | XtreamCredentials; // URL para M3U ou Credenciais para Xtream
  lastUpdated?: number;
}

import type { PlaylistItem, XtreamCredentials } from './playlist';
import type { Request } from './transport';

export class XtreamService {
  private readonly request: Request;
  constructor(request: Request) {
    this.request = request;
  }
  async loginCheck(creds: XtreamCredentials): Promise<boolean> {
    const baseUrl = creds.url.endsWith('/') ? creds.url.slice(0, -1) : creds.url;
    const apiBase = `${baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`;

    try {
      const loginRes = await this.request(apiBase, 60000);
      return loginRes.data?.user_info?.status === 'Active';
    } catch {
      return false;
    }
  }

  private normalizeToArray(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      // Alguns servidores retornam objetos com chaves numéricas
      return Object.values(data);
    }
    return [];
  }

  async fetchCategories(
    creds: XtreamCredentials,
    type: 'live' | 'vod' | 'series',
  ): Promise<Record<string, string>> {
    const baseUrl = creds.url.endsWith('/') ? creds.url.slice(0, -1) : creds.url;
    const action =
      type === 'live'
        ? 'get_live_categories'
        : type === 'vod'
          ? 'get_vod_categories'
          : 'get_series_categories';
    const apiBase = `${baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&action=${action}`;

    try {
      const response = await this.request(apiBase, 30000);
      const data = this.normalizeToArray(response.data);
      const map: Record<string, string> = {};
      data.forEach((cat: any) => {
        if (cat.category_id && cat.category_name) {
          map[cat.category_id.toString()] = cat.category_name;
        }
      });
      return map;
    } catch {
      return {};
    }
  }

  private extraGroups(
    item: any,
    categories: Record<string, string>,
  ): { groupNames?: string[] } | undefined {
    if (
      !Array.isArray(item.category_ids) &&
      typeof item.category_ids !== 'string' &&
      !Array.isArray(item.category_id) &&
      !Array.isArray(item.category_names)
    )
      return undefined;
    const primary = item.category_name || categories[item.category_id?.toString()];
    const ids = Array.isArray(item.category_ids)
      ? item.category_ids
      : typeof item.category_ids === 'string'
        ? item.category_ids.split(',')
        : [];
    const primaryIds = Array.isArray(item.category_id) ? item.category_id : [];
    const names = [
      ...new Set(
        [
          primary,
          ...(Array.isArray(item.category_names) ? item.category_names : []),
          ...[...primaryIds, ...ids].map((id) => categories[String(id).trim()]),
        ].filter((name): name is string => typeof name === 'string' && !!name.trim()),
      ),
    ];
    return names.length > 1 || (names.length === 1 && !primary) ? { groupNames: names } : undefined;
  }

  /** Xtream catalogs normally use Unix seconds; normalize once at import. */
  private catalogDates(item: { added?: unknown; last_modified?: unknown }) {
    const timestamp = (value: unknown): number | undefined => {
      if (typeof value !== 'number' && typeof value !== 'string') return undefined;
      const numeric = typeof value === 'string' ? Number(value.trim()) : value;
      const milliseconds = numeric < 1e12 ? numeric * 1000 : numeric;
      return Number.isFinite(milliseconds) && milliseconds > 0 && milliseconds <= 8.64e15
        ? Math.floor(milliseconds)
        : undefined;
    };
    const addedAt = timestamp(item.added);
    const updatedAt = timestamp(item.last_modified);
    return { ...(addedAt ? { addedAt } : {}), ...(updatedAt ? { updatedAt } : {}) };
  }

  async fetchChannels(creds: XtreamCredentials): Promise<PlaylistItem[]> {
    const baseUrl = creds.url.endsWith('/') ? creds.url.slice(0, -1) : creds.url;
    const apiBase = `${baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`;

    const [response, categories] = await Promise.all([
      this.request(`${apiBase}&action=get_live_streams`, 180000),
      this.fetchCategories(creds, 'live'),
    ]);

    const data = this.normalizeToArray(response.data);

    return data.map((item: any) => ({
      id: `channel-${item.stream_id}`,
      name: item.name,
      url: `${baseUrl}/live/${encodeURIComponent(creds.username)}/${encodeURIComponent(creds.password)}/${item.stream_id}.ts`,
      category: 'CHANNEL',
      tvgLogo: item.stream_icon,
      groupName: item.category_name || categories[item.category_id?.toString()] || 'Outros',
      ...this.extraGroups(item, categories),
      streamId: item.stream_id,
    }));
  }

  async fetchMovies(creds: XtreamCredentials): Promise<PlaylistItem[]> {
    const baseUrl = creds.url.endsWith('/') ? creds.url.slice(0, -1) : creds.url;
    const apiBase = `${baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`;

    const [response, categories] = await Promise.all([
      this.request(`${apiBase}&action=get_vod_streams`, 180000),
      this.fetchCategories(creds, 'vod'),
    ]);

    const data = this.normalizeToArray(response.data);

    return data.map((item: any) => ({
      id: `movie-${item.stream_id}`,
      name: item.name,
      url: `${baseUrl}/movie/${encodeURIComponent(creds.username)}/${encodeURIComponent(creds.password)}/${item.stream_id}.${item.container_extension || 'mp4'}`,
      category: 'MOVIE',
      ...this.catalogDates(item),
      tvgLogo: item.stream_icon,
      groupName: item.category_name || categories[item.category_id?.toString()] || 'Outros',
      ...this.extraGroups(item, categories),
      streamId: item.stream_id,
      containerExtension: item.container_extension,
    }));
  }

  async fetchSeries(creds: XtreamCredentials): Promise<PlaylistItem[]> {
    const baseUrl = creds.url.endsWith('/') ? creds.url.slice(0, -1) : creds.url;
    const apiBase = `${baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`;

    const [response, categories] = await Promise.all([
      this.request(`${apiBase}&action=get_series`, 180000),
      this.fetchCategories(creds, 'series'),
    ]);

    const data = this.normalizeToArray(response.data);

    return data.map((item: any) => ({
      id: `series-${item.series_id}`,
      name: item.name,
      url: `${baseUrl}/series/${encodeURIComponent(creds.username)}/${encodeURIComponent(creds.password)}/${item.series_id}`,
      category: 'SERIES',
      ...this.catalogDates(item),
      tvgLogo: item.cover,
      groupName: item.category_name || categories[item.category_id?.toString()] || 'Outros',
      ...this.extraGroups(item, categories),
      streamId: item.series_id,
      seriesId: item.series_id,
    }));
  }

  private mediaInfo(raw: unknown, fallbackName?: unknown): import('./playlist').MediaInfo {
    const info =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const text = (...values: unknown[]) => {
      for (const value of values) {
        if (typeof value === 'string' && value.trim())
          return value
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      }
      return '';
    };
    const image = (...values: unknown[]) =>
      values
        .flat()
        .find(
          (value): value is string =>
            typeof value === 'string' && /^https?:\/\/[^\s]+$/i.test(value),
        );
    return {
      name: text(info.name, fallbackName),
      cover: image(info.cover, info.movie_image, info.cover_big) || '',
      plot: text(info.plot, info.description),
      cast: text(info.cast, info.actors),
      director: text(info.director),
      genre: text(info.genre),
      releaseDate: text(info.releaseDate, info.releasedate, info.release_date),
      rating: text(info.rating),
      backdrop: image(info.backdrop_path, info.backdrop),
      duration: text(info.duration, info.episode_run_time),
    };
  }

  async fetchMovieInfo(
    creds: XtreamCredentials,
    vodId: string,
  ): Promise<import('./playlist').MovieDetail> {
    const baseUrl = creds.url.replace(/\/$/, '');
    const response = await this.request(
      `${baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&action=get_vod_info&vod_id=${encodeURIComponent(vodId)}`,
      60000,
    );
    const data = response.data;
    if (!data || typeof data !== 'object' || (!data.info && !data.movie_data))
      throw new Error('Detalhes do filme indisponíveis.');
    return { info: this.mediaInfo(data.info, data.movie_data?.name) };
  }

  async fetchSeriesInfo(
    creds: XtreamCredentials,
    seriesId: string,
  ): Promise<import('./playlist').SeriesDetail> {
    const baseUrl = creds.url.endsWith('/') ? creds.url.slice(0, -1) : creds.url;
    const apiBase = `${baseUrl}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&action=get_series_info&series_id=${encodeURIComponent(seriesId)}`;

    const response = await this.request(apiBase, 60000);
    const data = response.data;

    const seasonsMap: Record<number, import('./playlist').Episode[]> = {};

    if (data.episodes) {
      Object.keys(data.episodes).forEach((seasonNum) => {
        const episodes = data.episodes[seasonNum];
        const n = parseInt(seasonNum);
        seasonsMap[n] = episodes.map((ep: any) => ({
          id: ep.id,
          title: ep.title,
          containerExtension: ep.container_extension,
          seasonNumber: parseInt(ep.season),
          episodeNumber: parseInt(ep.episode_num),
          url: `${baseUrl}/series/${encodeURIComponent(creds.username)}/${encodeURIComponent(creds.password)}/${ep.id}.${ep.container_extension}`,
          info: ep.info,
        }));
      });
    }

    const seasons: import('./playlist').Season[] = Object.keys(seasonsMap)
      .map((num) => ({
        number: parseInt(num),
        episodes: seasonsMap[parseInt(num)].sort((a, b) => a.episodeNumber - b.episodeNumber),
      }))
      .sort((a, b) => a.number - b.number);

    return {
      info: this.mediaInfo(data.info),
      seasons,
    };
  }
}

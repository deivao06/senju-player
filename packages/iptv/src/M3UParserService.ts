import parser from 'iptv-playlist-parser';
import type { PlaylistItem, ItemCategory } from './playlist';
import type { Request } from './transport';

export class M3UParserService {
  private readonly request: Request;
  constructor(request: Request) {
    this.request = request;
  }
  async fetchAndParse(url: string): Promise<PlaylistItem[]> {
    // Keep the existing playlist download timeout.
    const response = await this.request(url, 180000);
    const m3uContent = response.data;
    const parsed = parser.parse(m3uContent);

    return parsed.items.map((item, index) => {
      const category = this.determineCategory(item.group.title, item.name);
      return {
        id: item.tvg.id || `item-${index}`,
        name: item.name,
        url: item.url,
        category,
        httpHeaders: {
          ...(item.http?.['user-agent'] ? { 'User-Agent': item.http['user-agent'] } : {}),
          ...(item.http?.referrer ? { Referer: item.http.referrer } : {}),
        },
        tvgId: item.tvg.id,
        tvgLogo: item.tvg.logo,
        groupName: item.group.title,
      };
    });
  }

  private determineCategory(groupName: string, name: string): ItemCategory {
    const combined = `${groupName} ${name}`.toLowerCase();

    const movieKeywords = ['filme', 'movie', 'cinema', 'vod', 'pfc'];
    const seriesKeywords = ['série', 'series', 'episódio', 'season', 'temporada'];

    if (seriesKeywords.some((keyword) => combined.includes(keyword))) {
      return 'SERIES';
    }

    if (movieKeywords.some((keyword) => combined.includes(keyword))) {
      return 'MOVIE';
    }

    return 'CHANNEL';
  }
}

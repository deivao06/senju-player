import {
  M3UParserService,
  XtreamService,
  orderByLatest,
  type ItemCategory,
  type PlaylistItem,
  type SavedPlaylist,
  type XtreamCredentials,
} from '@senju/iptv';
import { indexCatalog, type CatalogIndex } from './catalogIndex';
import { transport } from './transport';
export type PreparedCatalog = Partial<
  Record<ItemCategory, { items: PlaylistItem[]; index: CatalogIndex }>
>;
/** Runs in a worker when supported; the fallback preserves packaged-TV compatibility. */
export async function prepareCatalog(
  source: SavedPlaylist,
  type: ItemCategory,
  authenticate: boolean,
  signal: AbortSignal,
): Promise<PreparedCatalog> {
  const request = transport(signal);
  const prepare = (items: PlaylistItem[]) => {
    const ordered = orderByLatest(items);
    return { items: ordered, index: indexCatalog(ordered) };
  };
  if (source.type === 'M3U') {
    const items = await new M3UParserService(request).fetchAndParse(source.data as string);
    return Object.fromEntries(
      (['CHANNEL', 'MOVIE', 'SERIES'] as const).map((t) => [
        t,
        prepare(items.filter((i) => i.category === t)),
      ]),
    );
  }
  const api = new XtreamService(request),
    creds = source.data as XtreamCredentials;
  if (authenticate && !(await api.loginCheck(creds))) throw new Error('Lista não autenticada.');
  const items = await (type === 'CHANNEL'
    ? api.fetchChannels(creds)
    : type === 'MOVIE'
      ? api.fetchMovies(creds)
      : api.fetchSeries(creds));
  return { [type]: prepare(items) };
}

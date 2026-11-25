import { prepareCatalog } from './catalogPreparation';
import type { ItemCategory, SavedPlaylist } from '@senju/iptv';
const scope = globalThis as unknown as {
  onmessage: (
    event: MessageEvent<{ source: SavedPlaylist; type: ItemCategory; authenticate: boolean }>,
  ) => void;
  postMessage(value: unknown): void;
};
scope.postMessage({ ready: true });
scope.onmessage = async (event) => {
  try {
    const { source, type, authenticate } = event.data;
    const catalog = await prepareCatalog(source, type, authenticate, new AbortController().signal);
    scope.postMessage({ ok: true, catalog });
  } catch {
    scope.postMessage({ ok: false });
  }
};

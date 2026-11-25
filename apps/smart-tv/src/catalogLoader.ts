import type { ItemCategory, SavedPlaylist } from '@senju/iptv';
import { rememberCatalogIndex } from './catalogIndex';
import { prepareCatalog, type PreparedCatalog } from './catalogPreparation';
export function loadCatalog(
  source: SavedPlaylist,
  type: ItemCategory,
  authenticate: boolean,
  signal: AbortSignal,
): Promise<PreparedCatalog> {
  if (signal.aborted) return Promise.reject(new DOMException('Cancelado', 'AbortError'));
  if (typeof Worker === 'undefined') return prepareCatalog(source, type, authenticate, signal);
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./catalog.worker.ts', import.meta.url));
    } catch {
      void prepareCatalog(source, type, authenticate, signal).then(resolve, reject);
      return;
    }
    let settled = false,
      ready = false;
    const cleanup = () => {
      worker.terminate();
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException('Cancelado', 'AbortError'));
    };
    signal.addEventListener('abort', abort);
    worker.onerror = (event) => {
      event.preventDefault();
      if (settled) return;
      settled = true;
      cleanup();
      if (ready) reject(new Error('Falha ao processar catálogo.'));
      else void prepareCatalog(source, type, authenticate, signal).then(resolve, reject);
    };
    worker.onmessage = (event) => {
      if (settled) return;
      if (event.data?.ready) {
        ready = true;
        return;
      }
      settled = true;
      cleanup();
      if (!event.data?.ok) {
        reject(new Error('Falha ao carregar catálogo.'));
        return;
      }
      const catalog = event.data.catalog as PreparedCatalog;
      for (const entry of Object.values(catalog)) if (entry) rememberCatalogIndex(entry.index);
      resolve(catalog);
    };
    worker.postMessage({ source, type, authenticate });
  });
}

import type { PlaylistItem, SavedPlaylist } from '@senju/iptv';
export type Library = {
  favorites: PlaylistItem[];
  recent: PlaylistItem[];
  progress: Record<string, number>;
  episodeParents: Record<string, string>;
  currentEpisodes: Record<string, string>;
};
export const emptyLibrary = (): Library => ({
  favorites: [],
  recent: [],
  progress: {},
  episodeParents: {},
  currentEpisodes: {},
});
const DATABASE = 'senju-smart-tv-protected-v1';
const MAX_RECORD_BYTES = 1024 * 1024;
const encoder = new TextEncoder();
let opening: Promise<{ database: IDBDatabase; key: CryptoKey }> | undefined;
function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Armazenamento indisponível.'));
  });
}
function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () =>
      reject(new Error('Não foi possível salvar os dados.'));
  });
}
async function open() {
  if (!globalThis.crypto?.subtle || !globalThis.indexedDB)
    throw new Error('Armazenamento protegido indisponível.');
  if (!opening)
    opening = (async () => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('records');
        request.result.createObjectStore('keys');
      };
      const database = await result(request);
      database.onversionchange = () => {
        database.close();
        opening = undefined;
      };
      let key = (await result(database.transaction('keys').objectStore('keys').get('aes'))) as
        | CryptoKey
        | undefined;
      if (!key) {
        const candidate = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
          'encrypt',
          'decrypt',
        ]);
        const transaction = database.transaction('keys', 'readwrite');
        const done = complete(transaction);
        transaction.objectStore('keys').add(candidate, 'aes');
        try {
          await done;
          key = candidate;
        } catch {
          key = (await result(database.transaction('keys').objectStore('keys').get('aes'))) as
            | CryptoKey
            | undefined;
          if (!key) throw new Error('Não foi possível criar a chave.');
        }
      }
      if (key.extractable || key.algorithm.name !== 'AES-GCM')
        throw new Error('Chave de armazenamento inválida.');
      return { database, key };
    })().catch((error) => {
      opening = undefined;
      throw error;
    });
  return opening;
}
async function read<T>(id: string): Promise<T | undefined> {
  const { database, key } = await open();
  const record = (await result(database.transaction('records').objectStore('records').get(id))) as
    | { iv: Uint8Array<ArrayBuffer>; cipher: ArrayBuffer }
    | undefined;
  if (!record) return;
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: record.iv, additionalData: encoder.encode(id) },
    key,
    record.cipher,
  );
  if (data.byteLength > MAX_RECORD_BYTES) throw new Error('Registro inválido.');
  return JSON.parse(new TextDecoder().decode(data)) as T;
}
async function write(id: string, value: unknown) {
  const { database, key } = await open();
  const data = encoder.encode(JSON.stringify(value));
  if (data.byteLength > MAX_RECORD_BYTES) throw new Error('Limite de armazenamento atingido.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(id) },
    key,
    data,
  );
  const transaction = database.transaction('records', 'readwrite');
  const done = complete(transaction);
  transaction.objectStore('records').put({ iv, cipher }, id);
  await done;
}
export async function readProfiles(): Promise<SavedPlaylist[]> {
  const profiles = await read<unknown>('profiles');
  if (profiles === undefined) return [];
  if (!Array.isArray(profiles) || profiles.length > 5) throw new Error('Listas salvas inválidas.');
  if (
    !profiles.every(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        typeof s.name === 'string' &&
        (s.type === 'M3U'
          ? typeof s.data === 'string' && /^https?:\/\//i.test(s.data)
          : s.type === 'XTREAM' &&
            typeof s.data?.url === 'string' &&
            /^https?:\/\//i.test(s.data.url) &&
            typeof s.data.username === 'string' &&
            typeof s.data.password === 'string'),
    )
  )
    throw new Error('Listas salvas inválidas.');
  return profiles;
}
export function writeProfiles(profiles: SavedPlaylist[]) {
  if (profiles.length > 5) throw new Error('Você pode salvar até cinco listas.');
  return write('profiles', profiles);
}
export interface LibraryRead {
  library: Library;
  recovered: boolean;
  unavailable: boolean;
}
function validItem(value: unknown): value is PlaylistItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as PlaylistItem;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.url === 'string' &&
    ['CHANNEL', 'MOVIE', 'SERIES'].includes(item.category)
  );
}
function stringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value))
    if (typeof entry === 'string') result[key] = entry;
  return result;
}
/** Salvages readable fields, caps collections and flags changed data for recovery. */
export function normalizeLibrary(value: unknown): { library: Library; recovered: boolean } {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { library: emptyLibrary(), recovered: true };
  const record = value as Partial<Library>;
  const favorites = Array.isArray(record.favorites)
    ? record.favorites.filter(validItem).slice(0, 200)
    : [];
  const recent = Array.isArray(record.recent) ? record.recent.filter(validItem).slice(0, 50) : [];
  const progressIsRecord =
    !!record.progress && typeof record.progress === 'object' && !Array.isArray(record.progress);
  const progressEntries: [string, number][] = [];
  if (progressIsRecord)
    for (const [id, position] of Object.entries(record.progress!))
      if (typeof position === 'number' && Number.isFinite(position) && position >= 0)
        progressEntries.push([id, position]);
  const episodeParents = stringMap(record.episodeParents);
  const currentEpisodes = stringMap(record.currentEpisodes);
  const library: Library = {
    favorites,
    recent,
    progress: Object.fromEntries(progressEntries.slice(0, 500)),
    episodeParents,
    currentEpisodes,
  };
  const recovered =
    !Array.isArray(record.favorites) ||
    !Array.isArray(record.recent) ||
    !progressIsRecord ||
    favorites.length !== record.favorites.length ||
    recent.length !== record.recent.length ||
    Object.keys(library.progress).length !== Object.keys(record.progress!).length ||
    Object.keys(episodeParents).length !== Object.keys(record.episodeParents || {}).length ||
    Object.keys(currentEpisodes).length !== Object.keys(record.currentEpisodes || {}).length;
  return { library, recovered };
}
async function quarantine(id: string) {
  const { database } = await open();
  const record = await result(
    database.transaction('records').objectStore('records').get(id),
  );
  if (!record) return;
  const transaction = database.transaction('records', 'readwrite');
  const done = complete(transaction);
  transaction.objectStore('records').add(record, `${id}:invalid:${Date.now()}`);
  transaction.objectStore('records').delete(id);
  await done;
}
export async function readLibraryResult(id: string): Promise<LibraryRead> {
  const key = 'library:' + id;
  let stored: unknown;
  try {
    stored = await read<unknown>(key);
  } catch {
    return { library: emptyLibrary(), recovered: false, unavailable: true };
  }
  if (stored === undefined)
    return { library: emptyLibrary(), recovered: false, unavailable: false };
  const { library, recovered } = normalizeLibrary(stored);
  if (recovered) await quarantine(key).catch(() => {});
  return { library, recovered, unavailable: false };
}
export async function readLibrary(id: string): Promise<Library> {
  return (await readLibraryResult(id)).library;
}
export function writeLibrary(id: string, library: Library) {
  return write('library:' + id, normalizeLibrary(library).library);
}
export async function removeLibrary(id: string) {
  const { database } = await open();
  const transaction = database.transaction('records', 'readwrite');
  const done = complete(transaction);
  transaction.objectStore('records').delete('library:' + id);
  await done;
}
export function favoriteItem(library: Library, item: PlaylistItem): Library {
  return {
    ...library,
    favorites: library.favorites.some((i) => i.id === item.id)
      ? library.favorites.filter((i) => i.id !== item.id)
      : [item, ...library.favorites].slice(0, 200),
  };
}
export function watchedItem(
  library: Library,
  item: PlaylistItem,
  position?: number,
  owner: PlaylistItem = item,
  completed = false,
): Library {
  const progress = { ...library.progress };
  const parents = { ...library.episodeParents },
    current = { ...library.currentEpisodes };
  if (owner.id !== item.id) {
    parents[item.id] = owner.id;
    if (completed) {
      if (current[owner.id] === item.id) delete current[owner.id];
    } else current[owner.id] = item.id;
  }
  if (position !== undefined && Number.isFinite(position) && item.category !== 'CHANNEL') {
    delete progress[item.id];
    progress[item.id] = Math.max(0, position);
  }
  const recent = [owner, ...library.recent.filter((i) => i.id !== owner.id)].slice(0, 50);
  const keep = new Set([...recent, ...library.favorites].map((i) => i.id));
  for (const id of Object.keys(progress))
    if (!keep.has(id) && !keep.has(parents[id])) {
      delete progress[id];
      delete parents[id];
    }
  const ids = Object.keys(progress);
  for (const id of ids.slice(0, Math.max(0, ids.length - 500))) {
    delete progress[id];
    delete parents[id];
  }
  for (const id of Object.keys(current)) if (!keep.has(id)) delete current[id];
  return { ...library, recent, progress, episodeParents: parents, currentEpisodes: current };
}

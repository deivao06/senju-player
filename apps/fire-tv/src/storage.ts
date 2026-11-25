import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedPlaylist } from '@senju/iptv';
import { normalizeLibrary, parseLibrary, type LibraryState } from './librarySchema';

export type { LibraryState } from './librarySchema';

const service = 'com.senju.tv.playlists';
export async function readPlaylists(): Promise<SavedPlaylist[]> {
  const value = await Keychain.getGenericPassword({ service });
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value.password);
    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          typeof (item as SavedPlaylist).id === 'string' &&
          typeof (item as SavedPlaylist).name === 'string' &&
          ((item as SavedPlaylist).type === 'M3U'
            ? typeof (item as SavedPlaylist).data === 'string'
            : typeof (item as SavedPlaylist).data === 'object'),
      )
    )
      return [];
    return parsed as SavedPlaylist[];
  } catch {
    return [];
  }
}
export async function savePlaylists(playlists: SavedPlaylist[]) {
  if (!playlists.length) {
    await Keychain.resetGenericPassword({ service });
    return;
  }
  await Keychain.setGenericPassword('playlists', JSON.stringify(playlists), {
    service,
  });
}

export interface LibraryRead {
  library: LibraryState;
  recovered: boolean;
}
/** Invalid records are quarantined before a fresh library is written. */
export async function readLibraryDetailed(id: string): Promise<LibraryRead> {
  const key = `library:${id}`;
  const value = await AsyncStorage.getItem(key);
  const parsed = parseLibrary(value);
  if (value && parsed.recovered) {
    try {
      await AsyncStorage.setItem(`${key}:invalid:${Date.now()}`, value);
      await AsyncStorage.removeItem(key);
    } catch {
      /* Storage errors remain visible through the normal error path. */
    }
  }
  return parsed;
}
export async function readLibrary(id: string): Promise<LibraryState> {
  return (await readLibraryDetailed(id)).library;
}
export function saveLibrary(id: string, value: LibraryState) {
  const { library } = normalizeLibrary(value);
  return AsyncStorage.setItem(`library:${id}`, JSON.stringify(library));
}

export interface Preferences {
  autoEnter: boolean;
}
export async function readPreferences(): Promise<Preferences> {
  try {
    const value = JSON.parse(
      (await AsyncStorage.getItem('preferences')) || 'null',
    ) as { autoEnter?: unknown } | null;
    return { autoEnter: value?.autoEnter !== false };
  } catch {
    return { autoEnter: true };
  }
}
export function savePreferences(value: Preferences) {
  return AsyncStorage.setItem('preferences', JSON.stringify(value));
}

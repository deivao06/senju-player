import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedPlaylist } from '@senju/iptv';

const service = 'com.senju.tv.playlists';
export async function readPlaylists(): Promise<SavedPlaylist[]> {
  const value = await Keychain.getGenericPassword({ service });
  return value ? JSON.parse(value.password) : [];
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
export interface LibraryState {
  favorites: string[];
  recent: string[];
  progress: Record<string, number>;
}
const empty: LibraryState = { favorites: [], recent: [], progress: {} };
export async function readLibrary(id: string): Promise<LibraryState> {
  const value = await AsyncStorage.getItem(`library:${id}`);
  return value ? { ...empty, ...JSON.parse(value) } : { ...empty };
}
export function saveLibrary(id: string, value: LibraryState) {
  return AsyncStorage.setItem(`library:${id}`, JSON.stringify(value));
}

export interface Preferences {
  autoEnter: boolean;
}
export async function readPreferences(): Promise<Preferences> {
  const value = await AsyncStorage.getItem('preferences');
  const stored = value ? JSON.parse(value) : null;
  return { autoEnter: stored?.autoEnter !== false };
}
export function savePreferences(value: Preferences) {
  return AsyncStorage.setItem('preferences', JSON.stringify(value));
}

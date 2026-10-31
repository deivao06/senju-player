import { NativeModules } from 'react-native';
import { CatalogCache, type CacheDisk } from './catalogCache';

export const catalogCache = new CatalogCache(NativeModules.SenjuCatalogCache as CacheDisk);

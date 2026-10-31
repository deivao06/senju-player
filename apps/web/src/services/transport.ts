import axios from 'axios';
import { getProxyUrl } from '../utils/proxy';

export const request = (url: string, timeout: number) => axios.get(getProxyUrl(url), { timeout });

import { M3UParserService as Service } from '@senju/iptv';
import { request } from './transport';

export const M3UParserService = new Service(request);

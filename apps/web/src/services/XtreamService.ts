import { XtreamService as Service } from '@senju/iptv';
import { request } from './transport';

export const XtreamService = new Service(request);

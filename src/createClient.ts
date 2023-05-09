import { AxiosApi } from './AxiosApi';
import { FetchApi } from './FetchApi';
import { IApi } from './IApi';

/**
 * Create REST API client
 */
export function createClient(): IApi {
    if (typeof fetch === 'undefined') return new AxiosApi();
    return new FetchApi();
}

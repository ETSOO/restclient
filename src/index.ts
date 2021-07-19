import { AxiosApi } from './AxiosApi';
import { FetchApi } from './FetchApi';
import { IApi } from './IApi';

export * from './ApiBase';
export * from './ApiDataError';
export * from './ApiError';
export * from './AxiosApi';
export * from './FetchApi';
export * from './IApi';

/**
 * Create REST API client
 */
export function createClient(): IApi {
    if (typeof fetch === 'undefined') return new AxiosApi();
    return new FetchApi();
}

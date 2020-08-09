import { AxiosApi } from './AxiosApi';
import { FetchApi } from './FetchApi';
import { IApi } from './IApi';

export * from './ApiBase';
export * from './ApiDataError';
export * from './ApiError';
export * from './AxiosApi';
export * from './FetchApi';
export * from './IApi';
export * from './JestTester';
export * from './Utils';

/**
 * Create REST API client
 */
export function createClient(): IApi<any> {
    if (typeof fetch === 'undefined') return new AxiosApi();
    return new FetchApi();
}

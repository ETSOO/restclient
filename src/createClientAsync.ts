import type { IApi } from './IApi';

/**
 * Async create REST API client
 */
export async function createClientAsync(): Promise<IApi> {
    if (typeof fetch === 'undefined') {
        const { AxiosApi } = await import('./AxiosApi');
        return new AxiosApi();
    }

    const { FetchApi } = await import('./FetchApi');
    return new FetchApi();
}

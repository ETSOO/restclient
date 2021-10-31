/* eslint-disable no-undef */
import { enableFetchMocks } from 'jest-fetch-mock';
import { FetchApi } from '../src/FetchApi';
import {
    ApiMethod,
    IApiConfig,
    ApiResponseType,
    ApiRequestData,
    ApiAuthorizationScheme,
    IApiPayload
} from '../src/IApi';

/**
 * Fetch Api helper class for testing
 * https://stackoverflow.com/questions/5601730/should-private-protected-methods-be-under-unit-test
 * I agree protected methods, especially critical methods should be tested with a extended new class
 * ApiBase protected methods are tested here
 */
class FetchApiHelper extends FetchApi {
    /**
     * Build API url
     * @param url API url
     */
    buildUrl(url: string) {
        return super.buildUrl(url);
    }

    /**
     * Get content type
     * @param headers Headers
     */
    getContentType(headers: HeadersInit): string | null {
        return super.getContentType(headers);
    }

    /**
     * Set content type
     * @param headers Headers
     * @param contentType New content type
     */
    setContentType(
        contentType: string | null | undefined,
        headers?: HeadersInit
    ): void {
        super.setContentType(contentType, headers);
    }

    /**
     * Merge API configure, two levels only
     * @param apiConfig API configure
     */
    mergeConfig(apiConfig: IApiConfig) {
        super.mergeConfig(apiConfig);
    }

    /**
     * Create response
     * @param method Method
     * @param url Api URL
     * @param headers Headers
     * @param data Data
     * @param reponseType Response data type
     * @param rest Rest properties
     */
    createResponse(
        method: ApiMethod,
        url: string,
        headers: HeadersInit,
        data: any,
        responseType: ApiResponseType,
        rest: { [key: string]: any }
    ): Promise<Response> {
        return super.createResponse(
            method,
            url,
            headers,
            data,
            responseType,
            rest
        );
    }

    /**
     * Format posted data
     * @param method Verb
     * @param headers Headers
     * @param params URL parameters
     * @param data Raw data
     * @param contentType Content type
     */
    formatData(
        method: ApiMethod,
        headers: HeadersInit,
        params: URLSearchParams,
        data?: ApiRequestData,
        contentType?: string
    ): [any, Error?] {
        return super.formatData(method, headers, params, data, contentType);
    }

    /**
     * Get response data
     * @param response API response
     * @param reponseType Response data type
     */
    responseData(
        response: Response,
        responseType: ApiResponseType
    ): Promise<any> {
        return super.responseData(response, responseType, ['creation']);
    }
}

/**
 * Test JSON data interface
 */
interface CountryItem {
    id: string;
    name: string;
    creation: Date;
}

// Enable fetch mocks to avoid Headers/fetch is not defined
// https://www.npmjs.com/package/jest-fetch-mock
enableFetchMocks();

// Before each test, reset mocks
beforeEach(() => {
    fetchMock.resetMocks();
});

// Create the API client
const api = new FetchApiHelper();

// For HTTPS test
// https://stackoverflow.com/questions/31673587/error-unable-to-verify-the-first-certificate-in-nodejs/32440021
// Server side cross origin http://localhost should be added
// "testEnvironment": "node"
api.baseUrl = 'http://localhost:19333';

// Arrange
const data = [
    { id: 'CN', name: 'China', creation: '1949-10-1' },
    { id: 'NZ', name: 'New Zealand', creation: '1907-9-26' }
];

describe('Protected methods tests', () => {
    it('createResponse, responseData, responseOk', async () => {
        // Mock the response data
        fetchMock.mockResponse(JSON.stringify(data));

        // Create the response
        const response = await api.createResponse(
            ApiMethod.GET,
            api.buildUrl('/Customer/CountryList'),
            {},
            undefined,
            ApiResponseType.Json,
            {}
        );

        // Response should be defined
        expect(response).toBeDefined();

        // Response status is OK
        expect(api.transformResponse(response).ok).toBeTruthy();

        // Response data should be defined
        const result = await api.responseData(response, ApiResponseType.Json);
        expect(result).toBeDefined();

        // Response data matches
        expect(result).toContainEqual({
            id: 'CN',
            name: 'China',
            creation: new Date('1949-10-1')
        });
    });

    test('Tests for formatData', () => {
        const headers = {};
        const [data] = api.formatData(
            ApiMethod.PUT,
            headers,
            new URLSearchParams(),
            { id: 1, name: 'test' }
        );
        expect(api.getContentTypeAndCharset(headers)[0]).toBe(
            'application/json'
        );
        expect(typeof data).toBe('string');
        expect(data).toMatch('"id":');
    });
});

describe('authorize tests', () => {
    test('Global level', () => {
        // Act
        api.authorize(ApiAuthorizationScheme.Bearer, 'abc');

        // Assert
        expect(api.config?.headers).toBeDefined();
        if (api.config?.headers) {
            expect(
                api.getHeaderValue(api.config.headers, 'Authorization')
            ).toBe('Bearer abc');
        }
    });
});

describe('buildUrl tests', () => {
    test('buildUrl concatenation ', () => {
        const url = '/Customer/CountryList/11';
        expect(api.buildUrl(url)).toBe(`${api.baseUrl}${url}`);
    });

    test('buildUrl full', () => {
        const httpURL = 'http://localhost/Customer/CountryList/11';
        expect(api.buildUrl(httpURL)).toBe(httpURL);
    });
});

describe('setContentType/getContentType/getContentTypeAndCharset tests', () => {
    // Arrange
    const headers: HeadersInit = {
        Cache: 'true',
        'Content-Type': 'application/problem+json'
    };

    // https://stackoverflow.com/questions/5258977/are-http-headers-case-sensitive
    // Names are case insensitive
    test('name case insensitive', () => {
        // Act
        api.setContentType('application/json', headers);

        // Assert
        expect(Object.keys(headers).length).toBe(2);

        // Act
        const contentType = api.getContentType(headers);

        // Assert
        expect(contentType).toBe(`application/json; charset=${api.charset}`);

        // Act
        const result = api.getContentTypeAndCharset(headers);
        expect(result).toStrictEqual([
            'application/json',
            `charset=${api.charset}`
        ]);
    });
});

describe('GET tests', () => {
    test('Empty result', async () => {
        // Mock the response data
        fetchMock.mockResponse('', {
            headers: { 'Content-type': 'application/json' }
        });

        // Act
        const emptyResult = await api.get<CountryItem[]>(
            '/Customer/CountryList'
        );

        // Assert
        expect(emptyResult).toBeUndefined();

        // Act
        const emptyArrayResult = await api.get<CountryItem[]>(
            '/Customer/CountryList',
            undefined,
            { defaultValue: [] }
        );

        // Assert
        expect(emptyArrayResult?.length).toBe(0);
    });

    test('OK result', async () => {
        // Mock the response data
        fetchMock.mockResponse(JSON.stringify(data), {
            headers: { 'Content-type': 'application/json' }
        });

        // Act
        const okResult = await api.get<CountryItem[]>('/Customer/CountryList');

        // Assert
        expect(okResult).toBeDefined();
        expect(okResult?.length).toBe(2);
    });

    it('Failure result', async () => {
        // Mock the response data
        fetchMock.mockResponse('{ title: "Not Found" }', {
            status: 404
        });

        // Act
        const failResult = await api.post<CountryItem[]>(
            '/Customer/CountryList',
            undefined,
            {
                onError: (error) => {
                    expect(error).toHaveProperty('message', 'Not Found');
                    expect(error.data).toHaveProperty('method', ApiMethod.POST);
                }
            }
        );

        // Assert
        expect(failResult).toBeUndefined();
        expect(api.lastError?.data.url).toBe('/Customer/CountryList');
    });

    it('detectIP tests', async () => {
        // Mock the response data
        fetchMock.mockResponse(
            JSON.stringify({
                status: 'success',
                country: 'New Zealand',
                countryCode: 'NZ',
                region: 'AUK',
                regionName: 'Auckland',
                city: 'Auckland',
                zip: '1010',
                lat: -36.8506,
                lon: 174.7679,
                timezone: 'Pacific/Auckland',
                isp: 'CallPlus Services Limited',
                org: 'CallPlus Services Limited',
                as: 'AS9790 Vocus Group NZ',
                query: '101.98.49.5'
            })
        );

        const data = await api.getJson('http://ip-api.com/json');
        expect(data).toHaveProperty('query', '101.98.49.5');
    });
});

describe('POST tests', () => {
    // For asyn/await call
    // Or without it, add a done parameter here
    test('OK result', async () => {
        // Api client
        const localApi = new FetchApi();

        // Global authorization
        localApi.authorize('etsoo', 'abc');

        // On request
        localApi.onRequest = (apiData) => {
            // Local authorization test
            expect(api.getHeaderValue(apiData.headers, 'Authorization')).toBe(
                'Basic basic'
            );

            expect(api.getContentTypeAndCharset(apiData.headers)[0]).toBe(
                'application/json'
            );
            expect(apiData.method).toBe(ApiMethod.POST);
        };

        // On response
        localApi.onResponse = (apiData) => {
            // part with string
            expect(apiData.url).toMatch('id=2');
            // or Regex match
            expect(apiData.url).toMatch(/name=test/);
        };

        // Mock the response data
        fetchMock.mockResponse(JSON.stringify(data), {
            url: '/Customer/CountryList',
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });

        // Act
        const config = { headers: {} };

        // Local authorization
        api.authorize(ApiAuthorizationScheme.Basic, 'basic', config.headers);

        // Payload
        const payload: IApiPayload<CountryItem[], any> = {
            params: { id: 2, name: 'test' },
            dateFields: ['creation'],
            config
        };

        const okResult = await localApi.post<CountryItem[]>(
            '/Customer/CountryList',
            { id: 1 },
            payload
        );

        // Assert
        expect(payload.response).not.toBeNull();
        expect(okResult).toBeDefined();

        if (okResult != null) {
            expect(okResult.length).toBe(2);
            const isDate = okResult[0].creation instanceof Date;
            expect(isDate).toBeTruthy();
        }
    });
});

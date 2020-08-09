/* eslint-disable no-undef */

import { enableFetchMocks } from 'jest-fetch-mock';
import { FetchApi } from '../src/FetchApi';
import { ApiMethod, IApiConfig, ApiResponseType } from '../src/IApi';

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
        headers: HeadersInit,
        contentType: string | null | undefined
    ): void {
        super.setContentType(headers, contentType);
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
     * Get response data
     * @param response API response
     * @param reponseType Response data type
     */
    responseData(
        response: Response,
        responseType: ApiResponseType
    ): Promise<any> {
        return super.responseData(response, responseType);
    }

    /**
     * Is the response in Ok status
     */
    responseOk(response: Response): boolean {
        return super.responseOk(response);
    }
}

/**
 * Test JSON data interface
 */
interface CountryItem {
    id: string;
    name: string;
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

describe('Protected methods tests', () => {
    it('createResponse, responseData, responseOk', async () => {
        // Arrange
        const data = [
            { id: 'CN', name: 'China' },
            { id: 'NZ', name: 'New Zealand' }
        ];

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
        expect(api.responseOk(response)).toBeTruthy();

        // Response data should be defined
        const result = await api.responseData(response, ApiResponseType.Json);
        expect(result).toBeDefined();

        // Response data matches
        expect(result).toContainEqual({ id: 'CN', name: 'China' });
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
        api.setContentType(headers, 'application/json');

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
    test('OK result', async () => {
        // Arrange
        const data = [
            { id: 'CN', name: 'China' },
            { id: 'NZ', name: 'New Zealand' }
        ];

        // Mock the response data
        fetchMock.mockResponse(JSON.stringify(data));

        // Act
        const okResult = await api.get<CountryItem[]>('/Customer/CountryList');

        // Assert
        expect(okResult).toBeDefined();
        expect(okResult?.length).toBe(2);
    });

    it('Failure result', async (done) => {
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
                    done();
                }
            }
        );

        // Assert
        expect(failResult).toBeUndefined();
    });
});

describe('POST tests', () => {
    // For asyn/await call
    // Or without it, add a done parameter here
    test('OK result', async () => {
        // Arrange
        const data = [
            { id: 'CN', name: 'China' },
            { id: 'NZ', name: 'New Zealand' }
        ];

        // Api client
        const localApi = new FetchApi();
        localApi.onRequest = (apiData) => {
            expect(apiData.method).toBe(ApiMethod.POST);
        };
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
        const okResult = await localApi.post<CountryItem[]>(
            '/Customer/CountryList',
            undefined,
            { params: { id: 2, name: 'test' } }
        );

        // Assert
        expect(okResult).toBeDefined();
        expect(okResult?.length).toBe(2);
    });
});

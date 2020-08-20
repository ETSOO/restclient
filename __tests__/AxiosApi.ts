import { enableFetchMocks } from 'jest-fetch-mock';
import axios, { AxiosResponse, AxiosRequestConfig, AxiosPromise } from 'axios';
import { mocked } from 'ts-jest/dist/util/testing';
import { AxiosApi } from '../src/AxiosApi';
import { ApiMethod, ApiResponseType, ApiRequestData } from '../src/IApi';
import { ApiError } from '../src/ApiError';

/**
 * Axios Api helper class for testing
 * https://stackoverflow.com/questions/5601730/should-private-protected-methods-be-under-unit-test
 * I agree protected methods should be tested with a extended new class
 */
class AxiosApiHelper extends AxiosApi {
    /**
     * Build API url
     * @param url API url
     */
    buildUrl(url: string) {
        return super.buildUrl(url);
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
    ): Promise<AxiosResponse> {
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
        response: AxiosResponse,
        responseType: ApiResponseType
    ): Promise<any> {
        return super.responseData(response, responseType);
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

// This is needed to allow jest to modify axios at runtime
jest.mock('axios');

// Mocking axios function
// https://github.com/axios/axios/search?q=AxiosInstance&unscoped_q=AxiosInstance
// Strong type will use (config: AxiosRequestConfig): AxiosPromise;
// While without it will use overloaded function (url: string, config?: AxiosRequestConfig): AxiosPromise
const mockedAxios = mocked<{ (config: AxiosRequestConfig): AxiosPromise }>(
    axios
);

// Mocking implementation
mockedAxios.mockImplementation((config) => {
    const localConfig = config || ({} as AxiosRequestConfig);

    const getVerb =
        localConfig.method == null ||
        localConfig.method === 'get' ||
        localConfig.method === 'GET';

    let { data } = localConfig;
    const initData = !!data;
    if (!initData) {
        if (getVerb)
            data = [
                { id: 'CN', name: 'China' },
                { id: 'NZ', name: 'New Zealand' }
            ];
        else data = { title: 'Method Not Allowed' };
    }

    const response: AxiosResponse =
        getVerb || initData
            ? {
                  data,
                  headers: localConfig.headers,
                  config: localConfig,
                  status: 200,
                  statusText: 'OK'
              }
            : {
                  data,
                  headers: {
                      'Content-Type': 'application/problem+json; charset=utf-8'
                  },
                  config: localConfig,
                  status: 405,
                  statusText: ''
              };

    return Promise.resolve(response);
});

// Create the API client
const api = new AxiosApiHelper();

// For HTTPS test
// https://stackoverflow.com/questions/31673587/error-unable-to-verify-the-first-certificate-in-nodejs/32440021
// Server side cross origin http://localhost should be added
// "testEnvironment": "node"
api.baseUrl = 'http://localhost:19333';

describe('Protected methods tests', () => {
    it('createResponse, responseData, responseOk', async () => {
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
        expect(api.responseData(response, ApiResponseType.Json)).toBeDefined();

        // Response data matches
        expect(response.data).toContainEqual({ id: 'CN', name: 'China' });
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

describe('GET tests', () => {
    it('OK result', async () => {
        // Act
        const okResult = await api.get<CountryItem[]>('/Customer/CountryList');

        // Assert
        expect(okResult).toBeDefined();
        expect(okResult?.length).toBe(2);
    });

    it('Failure result', async (done) => {
        // Act
        const failResult = await api.post<CountryItem[]>(
            '/Customer/CountryList',
            undefined,
            {
                onError: (error) => {
                    expect(error.source).toBeInstanceOf(ApiError);
                    expect(error).toHaveProperty(
                        'message',
                        'Method Not Allowed'
                    );
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
    it('OK result', async () => {
        // Act
        const okResult = await api.post<CountryItem[]>(
            '/Customer/CountryList',
            JSON.stringify([
                { id: 'CN', name: 'China' },
                { id: 'NZ', name: 'New Zealand' }
            ])
        );

        // Assert
        expect(okResult).toBeDefined();
        expect(okResult?.length).toBe(2);
    });
});

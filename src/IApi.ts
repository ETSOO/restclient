import { DataTypes } from '@etsoo/shared';
import { ApiDataError } from './ApiDataError';

/**
 * API verbs
 */
export enum ApiMethod {
    DELETE,
    GET,
    HEAD,
    OPTIONS,
    PATCH,
    POST,
    PUT
}

/**
 * API authorization scheme
 */
export enum ApiAuthorizationScheme {
    Basic,
    Bearer,
    OAuth
}

/**
 * IP data
 */
export interface IPData {
    /**
     * IP address
     */
    ip: string;

    /**
     * Country name, like New Zealand
     */
    country: string;

    /**
     * Country code, like NZ
     */
    countryCode: string;

    /**
     * Timezone, like Pacific/Auckland
     */
    timezone?: string;
}

/**
 * API configures interface
 */
export interface IApiConfig {
    /**
     * Dynamic data
     */
    [key: string]: any;

    /**
     * Headers
     */
    headers?: HeadersInit;
}

/**
 * API request data type
 */
export type ApiRequestData =
    | ArrayBuffer
    | ArrayBufferView
    | Blob
    | File
    | FileList
    | FormData
    | Object
    | ReadableStream
    | DataTypes.SimpleObject
    | String
    | URLSearchParams;

/**
 * API Response data type
 * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
 */
export enum ApiResponseType {
    ArrayBuffer,
    Blob,
    Document,
    Json,
    Stream,
    Text
}

/**
 * API data
 */
export interface IApiData {
    /**
     * Data submitted
     */
    data: any;

    /**
     * Depth for debug
     */
    depth?: number;

    /**
     * Request headers
     */
    headers: HeadersInit;

    /**
     * API verb
     */
    method: ApiMethod;

    /**
     * URL parameters
     */
    params: ApiParams;

    /**
     * Response data type
     */
    responseType: ApiResponseType;

    /**
     * Show loading indicator
     */
    showLoading?: boolean;

    /**
     * API URL
     */
    url: string;
}

/**
 * API error handler
 */
export interface IApiErrorHandler<R = any> {
    (error: ApiDataError<R>): boolean | undefined | void;
}

/**
 * API response error data interface
 */
export interface IResponseErrorData {
    /**
     * Title field
     */
    title?: string;

    /**
     * Message field
     */
    message?: string;
}

/**
 * Is error data
 * @param data Raw data
 */
export function isResponseErrorData(data: any): data is IResponseErrorData {
    return data && (data.title || data.message);
}

/**
 * Api response interface
 */
export interface IApiResponse {
    /**
     * Response headers
     */
    headers: HeadersInit;

    /**
     * OK status
     */
    ok: boolean;

    /**
     * Status code
     */
    status: number;

    /**
     * Status text
     */
    statusText: string;
}

/**
 * API request handler
 */
export interface IApiRequestHandler {
    (data: IApiData): void;
}

/**
 * API Response handler
 */
export interface IApiResponseHandler<R> {
    (data: IApiData, response: R): void;
}

/**
 * API complete handler
 */
export interface IApiCompleteHandler<R> {
    (data: IApiData, response?: R): void;
}

/**
 * API result type
 */
export type ApiResult<T> = [Error?, T?];

/**
 * API params type
 */
export type ApiParams = DataTypes.SimpleObject | URLSearchParams;

/**
 * API data parser
 */
export interface IApiParser<T> {
    (data: any): ApiResult<T>;
}

/**
 * API payload interface
 */
export interface IApiPayload<T, R> {
    /**
     * Content type
     */
    readonly contentType?: string;

    /**
     * Error handler
     */
    readonly onError?: IApiErrorHandler<R>;

    /**
     * Configures
     */
    readonly config?: IApiConfig;

    /**
     * Default value
     */
    readonly defaultValue?: T;

    /**
     * URL parameters
     */
    readonly params?: ApiParams;

    /**
     * Data parser
     */
    readonly parser?: IApiParser<T>;

    /**
     * Current response
     */
    response?: R;

    /**
     * Response data type
     */
    readonly responseType?: ApiResponseType;

    /**
     * Show loading indicator
     */
    readonly showLoading?: boolean;
}

/**
 * API interface
 */
export interface IApi<R = any> {
    /**
     * API base url
     */
    baseUrl?: string;

    /**
     * Charset, default is 'utf-8'
     */
    charset: string;

    /**
     * Default configures
     */
    config?: IApiConfig;

    /**
     * Default response data type
     */
    defaultResponseType: ApiResponseType;

    /**
     * Last error
     */
    lastError?: ApiDataError<R>;

    /**
     * API error handler
     */
    onError?: IApiErrorHandler<R>;

    /**
     * API request handler
     */
    onRequest?: IApiRequestHandler;

    /**
     * API complete handler
     */
    onComplete?: IApiCompleteHandler<R>;

    /**
     * API response handler
     */
    onResponse?: IApiResponseHandler<R>;

    /**
     * Authorize the call
     * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization
     * @param scheme Scheme
     * @param token Token, empty/null/undefined to remove it
     * @param writeHeaders Headers to write authtication, default to all calls
     */
    authorize(
        scheme: ApiAuthorizationScheme | string,
        token: string | undefined,
        writeHeaders?: HeadersInit
    ): void;

    /**
     * Detect IP data
     * @returns IP data
     */
    detectIP(): Promise<IPData | undefined>;

    /**
     * Get content type and charset
     * @param headers Headers
     */
    getContentTypeAndCharset(headers: HeadersInit): [string, string?];

    /**
     * Get content type
     * @param headers Headers
     */
    getHeaderValue(headers: HeadersInit, key: string): string | null;

    /**
     * Delete API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    delete<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ): Promise<T | undefined>;

    /**
     * Get API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    get<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ): Promise<T | undefined>;

    /**
     * Get Json data directly
     * @param url URL
     * @returns Json data
     */
    getJson<T = DataTypes.ReadonlyData>(url: string): Promise<T>;

    /**
     * Head API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    head<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ): Promise<T | undefined>;

    /**
     * Options API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    options<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ): Promise<T | undefined>;

    /**
     * Patch API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    patch<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ): Promise<T | undefined>;

    /**
     * Post API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    post<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ): Promise<T | undefined>;

    /**
     * Put API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    put<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ): Promise<T | undefined>;

    /**
     * Request to API
     * @param method Method
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    request<T>(
        method: ApiMethod,
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ): Promise<T | undefined>;

    /**
     * Set content language
     * @param language Content language
     * @param headers Headers
     */
    setContentLanguage(
        language: string | null | undefined,
        headers?: HeadersInit
    ): void;

    /**
     * Set header value
     * @param key Header name
     * @param value Header value
     * @param headers Optional headers to lookup
     */
    setHeaderValue(
        key: string,
        value: string | null | undefined,
        headers?: HeadersInit
    ): void;

    /**
     * Transform the original response to unified object
     * @param response Original response
     */
    transformResponse(response: R): IApiResponse;
}

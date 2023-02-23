import { ContentDisposition, DataTypes, IFormData } from '@etsoo/shared';
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
 * Extended headers type
 */
export type HeadersAll = HeadersInit | Iterable<[string, string]>;

/**
 * Is iterable or not
 * @param headers Headers
 * @returns Result
 */
export function isIterable<T>(
    headers: HeadersInit | Iterable<T>
): headers is Iterable<T> {
    return Symbol.iterator in headers;
}

/**
 * IP data
 */
export interface IPData {
    /**
     * IP address
     */
    readonly ip: string;

    /**
     * Country name, like New Zealand
     */
    readonly country: string;

    /**
     * Country code, like NZ
     */
    readonly countryCode: string;

    /**
     * Timezone, like Pacific/Auckland
     */
    readonly timezone?: string;
}

/**
 * API configures interface
 */
export interface IApiConfig {
    /**
     * Dynamic data
     */
    [key: string]: unknown;

    /**
     * Headers
     */
    headers?: HeadersAll;
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
    | IFormData
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
    data: unknown;

    /**
     * Depth for debug
     */
    depth?: number;

    /**
     * Request headers
     */
    headers: HeadersAll;

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
    responseType?: ApiResponseType;

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
export interface IApiErrorHandler<R = unknown> {
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
export function isResponseErrorData(data: unknown): data is IResponseErrorData {
    return (
        typeof data === 'object' &&
        data != null &&
        'title' in data &&
        'message' in data
    );
}

/**
 * Api response interface
 */
export interface IApiResponse {
    /**
     * Response headers
     */
    headers: HeadersAll;

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
    (data: unknown): ApiResult<T>;
}

/**
 * API payload interface
 */
export interface IApiPayload<T, R = any> {
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
     * Date field names
     */
    readonly dateFields?: string[];

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

    /**
     * Local API and ignore baseUrl
     */
    readonly local?: boolean;
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
    defaultResponseType?: ApiResponseType;

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
        writeHeaders?: HeadersAll
    ): void;

    /**
     * Detect IP data
     * @returns IP data
     */
    detectIP(): Promise<IPData | undefined>;

    /**
     * Get HTTP content dispostion
     * @param responseOrValue Response or header value
     * @returns Result
     */
    getContentDisposition(response: R): ContentDisposition | undefined;
    getContentDisposition(header: string): ContentDisposition | undefined;

    /**
     * Get content length
     * @param headers Headers
     * @returns
     */
    getContentLength(headers: HeadersAll): number | undefined;

    /**
     * Get content type and charset
     * @param headers Headers
     */
    getContentTypeAndCharset(headers: HeadersAll): [string, string?];

    /**
     * Get content type
     * @param headers Headers
     */
    getHeaderValue(headers: HeadersAll, key: string): string | null;

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
    getJson<T extends {} = {}>(url: string): Promise<T | undefined>;

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
     * @param headers Headers, default is global headers
     */
    setContentLanguage(
        language: string | null | undefined,
        headers?: HeadersAll
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
        headers: HeadersAll
    ): void;

    /**
     * Transform the original response to unified object
     * @param response Original response
     */
    transformResponse(response: R): IApiResponse;
}

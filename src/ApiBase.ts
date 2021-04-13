/* eslint-disable no-param-reassign */
import { DomUtils, DataTypes } from '@etsoo/shared';
import {
    IApi,
    ApiMethod,
    IApiPayload,
    ApiRequestData,
    IApiErrorHandler,
    IApiRequestHandler,
    IApiResponseHandler,
    IApiConfig,
    IApiData,
    isResponseErrorData,
    ApiParams,
    ApiResponseType,
    IApiResponse,
    ApiAuthorizationScheme,
    IApiCompleteHandler
} from './IApi';
import { ApiError } from './ApiError';
import { ApiDataError } from './ApiDataError';

/**
 * Api abstract class
 */
export abstract class ApiBase<R> implements IApi<R> {
    /**
     * Headers content type key
     */
    private static ContentTypeKey = 'Content-Type';

    /**
     * API base url
     */
    baseUrl?: string;

    /**
     * Charset, default is 'utf-8'
     */
    charset: string = 'utf-8';

    /**
     * Default configures
     */
    config?: IApiConfig;

    /**
     * Default response data type
     */
    defaultResponseType: ApiResponseType = ApiResponseType.Json;

    private lastErrorPrivate?: ApiDataError<R>;

    /**
     * Last error
     */
    get lastError() {
        return this.lastErrorPrivate;
    }

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
    ): void {
        // Scheme name
        const schemeName =
            typeof scheme === 'number'
                ? ApiAuthorizationScheme[scheme]
                : scheme;

        // Headers
        const headers = writeHeaders ?? this.getHeaders();

        // Authentication header value
        const value = token ? `${schemeName} ${token}` : token;

        // Set
        this.setHeaderValue('Authorization', value, headers);
    }

    /**
     * Build API url
     * @param url API url
     */
    protected buildUrl(url: string) {
        return !url.includes('://') && this.baseUrl
            ? `${this.baseUrl}${url}`
            : url;
    }

    // Create form files
    private createFormFiles(files: FileList) {
        const formFiles = new FormData();
        for (let i = 0; i < files.length; i += 1) {
            const file = files.item(i);
            if (file) formFiles.append('files', file);
        }
        return formFiles;
    }

    /**
     * Format posted data
     * @param method Verb
     * @param headers Headers
     * @param params URL parameters
     * @param data Raw data
     * @param contentType Content type
     */
    protected formatData(
        method: ApiMethod,
        headers: HeadersInit,
        params: URLSearchParams,
        data?: ApiRequestData,
        contentType?: string
    ): [any, Error?] {
        if (data) {
            // Calculate content type
            let localContentType = contentType || this.getContentType(headers);

            if (
                method === ApiMethod.PATCH ||
                method === ApiMethod.POST ||
                method === ApiMethod.PUT
            ) {
                // Body type
                try {
                    // String type
                    if (data instanceof String) {
                        if (data.startsWith('{') && data.endsWith('}')) {
                            // Guess as JSON
                            if (!localContentType)
                                localContentType = 'application/json';
                        } else if (data.startsWith('<') && data.endsWith('>')) {
                            // Guess as XML
                            if (!localContentType)
                                localContentType = 'application/xml';
                        }
                        this.setContentType(localContentType, headers);
                        return [data];
                    }

                    // JSON
                    if (
                        data.constructor === Object ||
                        (localContentType &&
                            DomUtils.isJSONContentType(localContentType))
                    ) {
                        // Object type, default to JSON
                        if (!localContentType)
                            localContentType = 'application/json';
                        this.setContentType(localContentType, headers);

                        return [JSON.stringify(data)];
                    }

                    // Default form data
                    if (!localContentType)
                        localContentType = 'application/x-www-form-urlencoded';
                    this.setContentType(localContentType, headers);

                    // FileList, check availibility
                    if (
                        typeof FileList !== 'undefined' &&
                        data instanceof FileList
                    )
                        return [this.createFormFiles(data)];

                    // ArrayBufferView
                    if (ArrayBuffer.isView(data)) return [data.buffer];

                    // Other cases
                    return [data];
                } catch (ex) {
                    return [undefined, ex];
                }
            }

            // params shoud be avoided to pass with data
            if (Array.from(params.keys()).length > 0) {
                return [
                    undefined,
                    new Error('URL params shoud be avoided to pass with data')
                ];
            }

            if (data instanceof URLSearchParams) {
                data.forEach((value, key) => {
                    params.set(key, value);
                });
            } else if (DataTypes.isSimpleObject(data)) {
                DomUtils.mergeURLSearchParams(params, data);
            } else {
                return [
                    undefined,
                    new TypeError(
                        'Data transforms to params with wrong data type'
                    )
                ];
            }
        }

        return [undefined, undefined];
    }

    /**
     * Merge API configure, two levels only
     * @param apiConfig API configure
     */
    protected mergeConfig(apiConfig: IApiConfig) {
        if (this.config) {
            Object.keys(this.config).forEach((key) => {
                // default value
                const defaultValue = this.config![key];
                if (defaultValue == null) {
                    return;
                }

                // config value
                const configValue = apiConfig[key];
                if (configValue) {
                    if (typeof configValue === 'object') {
                        // merge object
                        // eslint-disable-next-line no-param-reassign
                        apiConfig[key] = { ...defaultValue, ...configValue };
                    }
                } else {
                    // eslint-disable-next-line no-param-reassign
                    apiConfig[key] = defaultValue;
                }
            });
        }
    }

    /**
     * Get content type
     * @param headers Headers
     */
    protected getContentType(headers: HeadersInit): string | null {
        return this.getHeaderValue(headers, ApiBase.ContentTypeKey);
    }

    /**
     * Get content type and charset
     * @param headers Headers
     */
    getContentTypeAndCharset(headers: HeadersInit): [string, string?] {
        const contentType = this.getContentType(headers);
        if (contentType) {
            const parts = contentType.split(';');
            return [
                parts[0].trim(),
                parts.length > 1 ? parts[1].trim() : undefined
            ];
        }
        return ['', undefined];
    }

    /**
     * Get headers
     * @returns Headers
     */
    protected getHeaders() {
        let headers: HeadersInit;
        if (this.config == null) {
            headers = {};
            this.config = { headers };
        } else if (this.config.headers) {
            headers = this.config.headers;
        } else {
            headers = {};
            this.config.headers = headers;
        }
        return headers;
    }

    /**
     * Get content type
     * @param headers Headers
     */
    getHeaderValue(headers: HeadersInit, key: string): string | null {
        // String array
        if (Array.isArray(headers)) {
            const index = headers.findIndex((item) => {
                const itemKey = item[0];
                if (itemKey && itemKey.toLowerCase() === key.toLowerCase())
                    return true;
                return false;
            });
            if (index === -1) return null;
            return headers[index][1];
        }

        // Standard Headers
        if (headers instanceof Headers) {
            return headers.get(key);
        }

        // Simple object
        const matchKey = Object.keys(headers).find(
            (item) => item.toLowerCase() === key.toLowerCase()
        );
        if (matchKey) return headers[matchKey];

        return null;
    }

    /**
     * Set content language
     * @param language Content language
     * @param headers Headers
     */
    setContentLanguage(
        language: string | null | undefined,
        headers?: HeadersInit
    ) {
        this.setHeaderValue('Content-Language', language, headers);
    }

    /**
     * Set content type
     * @param contentType New content type
     * @param headers Headers
     */
    protected setContentType(
        contentType: string | null | undefined,
        headers?: HeadersInit
    ): void {
        let value = contentType;
        if (value && !value.includes('charset=')) {
            // Test charset
            value += `; charset=${this.charset}`;
        }
        this.setHeaderValue(ApiBase.ContentTypeKey, value, headers);
    }

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
    ): void {
        // Default headers
        if (headers == null) headers = this.getHeaders();

        // String array
        if (Array.isArray(headers)) {
            const index = headers.findIndex((item) => {
                const itemKey = item[0];
                if (itemKey && itemKey.toLowerCase() === key.toLowerCase())
                    return true;
                return false;
            });

            if (value) {
                if (index === -1) headers.push([key, value]);
                else headers[index][1] = value;
            } else if (index !== -1) {
                headers.splice(index, 1);
            }

            return;
        }

        // Standard Headers
        if (headers instanceof Headers) {
            if (value) headers.set(key, value);
            else headers.delete(key);
            return;
        }

        // Simple object
        const matchKey =
            Object.keys(headers).find(
                (item) => item.toLowerCase() === key.toLowerCase()
            ) || key;
        if (value) headers[matchKey] = value;
        else delete headers[matchKey];
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
    protected abstract createResponse(
        method: ApiMethod,
        url: string,
        headers: HeadersInit,
        data: any,
        responseType: ApiResponseType,
        rest: { [key: string]: any }
    ): Promise<R>;

    /**
     * Get response data
     * @param response API response
     * @param reponseType Response data type
     */
    protected abstract responseData(
        response: R,
        responseType: ApiResponseType
    ): Promise<any>;

    /**
     * Get response error message
     * @param data Response data
     */
    private responseErrorMessage(data: any) {
        if (isResponseErrorData(data)) return data.message || data.title;
        return data;
    }

    // Response promise handler for error catch
    private responsePromiseHandler(
        promise: Promise<R>
    ): Promise<{
        /**
         * Response
         */
        response?: R;

        /**
         * Error
         */
        error?: ApiError;
    }> {
        return promise
            .then(async (response) => {
                // Destruct
                const { ok, status, statusText } = this.transformResponse(
                    response
                );

                if (ok) {
                    return { response };
                }

                // Other status codes are considered as error
                // Try to read response JSON data
                let errorMessage: string | null;
                try {
                    // When parse, may have unexpected end of JSON input
                    const responseData = await this.responseData(
                        response,
                        ApiResponseType.Json
                    );
                    errorMessage = this.responseErrorMessage(responseData);
                } catch {
                    errorMessage = null;
                }

                const message = statusText || errorMessage || 'Unkown';
                const error = new ApiError(message, status);
                return { error, response };
            })
            .catch((reason) => {
                const exception: Error = reason;
                const error = new ApiError(
                    exception.message || 'Network Error',
                    -1
                );
                return Promise.resolve({ error });
            });
    }

    // Dispatch response callback
    private dispatchResponseCallback(data: IApiData, response?: R) {
        // On response callback
        if (response && this.onResponse) {
            this.onResponse(data, response);
        }
    }

    // Dispatch response callback
    private dispatchCompleteCallback(data: IApiData, response?: R) {
        // On complete callback
        if (this.onComplete) {
            this.onComplete(data, response);
        }
    }

    /**
     * Handle error
     * @param error Error
     * @param data Error data
     * @param localDoError Local error handler
     */
    protected handleError(
        error: Error,
        data: IApiData,
        response?: R,
        localDoError?: IApiErrorHandler<R>
    ) {
        // Data error
        const dataError = new ApiDataError<R>(error, data, response);

        // Cache the error
        this.lastErrorPrivate = dataError;

        if (localDoError == null && this.onError == null) {
            // No error handler, throw the error
            throw dataError;
        }

        if (localDoError && localDoError(dataError) === false) {
            // Local error handler
            // return false will prevent further handle
            return;
        }

        if (this.onError) {
            // Global error handler
            this.onError(dataError);
        }
    }

    /**
     * Transform URL parameters
     * @param params URL parameters
     */
    private transformParams(params?: ApiParams): URLSearchParams {
        // NULL
        if (params == null) return new URLSearchParams();

        // URLSearchParams
        if (params instanceof URLSearchParams) return params;

        // SimpleObject
        return DomUtils.mergeURLSearchParams(new URLSearchParams(), params);
    }

    /**
     * Request to API
     * @param method Method
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    async request<T>(
        method: ApiMethod,
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ): Promise<T | undefined> {
        // Destruct payload
        const {
            contentType,
            config = {},
            defaultValue,
            onError,
            params,
            parser,
            responseType = this.defaultResponseType,
            showLoading
        } = payload || {};

        // Reset last error
        this.lastErrorPrivate = undefined;

        // Merge configure
        this.mergeConfig(config);

        // Destruct options
        const { headers = {}, ...rest } = config;

        // Transform params
        const localParams = this.transformParams(params);

        // Format the data
        const [formattedData, formattedError] = this.formatData(
            method,
            headers,
            localParams,
            data,
            contentType
        );

        // URL parameters
        const parameters = localParams.toString();
        let localUrl = url;
        if (parameters) {
            if (localUrl.includes('?')) localUrl += '&';
            else localUrl += '?';
            localUrl += parameters;
        }

        // API data
        const apiData: IApiData = {
            data: formattedData,
            headers,
            method,
            params: localParams,
            responseType,
            showLoading,
            url: localUrl
        };

        // Format error occured
        if (formattedError) {
            apiData.depth = 0;
            this.handleError(formattedError, apiData, undefined, onError);
            return undefined;
        }

        // On request callback
        if (this.onRequest) this.onRequest(apiData);

        // Calculate the URL
        const api = this.buildUrl(localUrl);

        // Act and the response
        const { response, error } = await this.responsePromiseHandler(
            this.createResponse(
                method,
                api,
                headers,
                formattedData,
                responseType,
                rest
            )
        );

        // Complete API call
        this.dispatchCompleteCallback(apiData, response);

        if (error || response == null) {
            // Error occured
            const localError = error || new Error('No Response Error');
            apiData.depth = 1;
            this.handleError(localError, apiData, response, onError);
        } else {
            // Dispatch response callback
            this.dispatchResponseCallback(apiData, response);

            // Return target type data
            try {
                const rawResult = await this.responseData(
                    response,
                    responseType
                );

                // May return null or ''
                if (rawResult == null || rawResult === '') {
                    return defaultValue;
                }

                if (parser) {
                    // Parser case
                    const [parseError, parseResult] = parser(rawResult);
                    if (parseError) {
                        apiData.depth = 2;
                        this.handleError(
                            parseError,
                            apiData,
                            response,
                            onError
                        );
                        return undefined;
                    }

                    if (parseResult) return parseResult;
                    return defaultValue;
                }

                // Transform data type
                return rawResult as T;
            } catch (exception) {
                apiData.depth = 3;
                this.handleError(exception, apiData, response, onError);
            }
        }

        return undefined;
    }

    /**
     * Transform original response to unified object
     * @param response Original response
     */
    abstract transformResponse(response: R): IApiResponse;

    /**
     * Delete API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    async delete<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ) {
        const result = await this.request<T>(
            ApiMethod.DELETE,
            url,
            data,
            payload
        );
        return result;
    }

    /**
     * Get API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    async get<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ) {
        const result = await this.request<T>(ApiMethod.GET, url, data, payload);
        return result;
    }

    /**
     * Head API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    async head<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ) {
        const result = await this.request<T>(
            ApiMethod.HEAD,
            url,
            data,
            payload
        );
        return result;
    }

    /**
     * Options API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    async options<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ) {
        const result = await this.request<T>(
            ApiMethod.OPTIONS,
            url,
            data,
            payload
        );
        return result;
    }

    /**
     * Patch API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    async patch<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ) {
        const result = await this.request<T>(
            ApiMethod.PATCH,
            url,
            data,
            payload
        );
        return result;
    }

    /**
     * Post API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    async post<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ) {
        const result = await this.request<T>(
            ApiMethod.POST,
            url,
            data,
            payload
        );
        return result;
    }

    /**
     * Put API
     * @param url API URL
     * @param data Passed data
     * @param payload Payload
     */
    async put<T>(
        url: string,
        data?: ApiRequestData,
        payload?: IApiPayload<T, R>
    ) {
        const result = await this.request<T>(ApiMethod.PUT, url, data, payload);
        return result;
    }
}

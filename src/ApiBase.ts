/* eslint-disable no-param-reassign */
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
    IApiResponse,
    isResponseErrorData,
    ApiParams,
    ApiResponseType
} from './IApi';
import { ApiError } from './ApiError';
import {
    isSimpleObject,
    mergeURLSearchParams,
    isJSONContentType
} from './Utils';
import { ApiDataError } from './ApiDataError';

/**
 * Api abstract class
 */
export abstract class ApiBase<R extends IApiResponse> implements IApi<R> {
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

    /**
     * API error handler
     */
    onError?: IApiErrorHandler<R>;

    /**
     * API request handler
     */
    onRequest?: IApiRequestHandler;

    /**
     * API response handler
     */
    onResponse?: IApiResponseHandler<R>;

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
    private formatData(
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
                            if (localContentType)
                                localContentType = 'application/json';
                        } else if (data.startsWith('<') && data.endsWith('>')) {
                            // Guess as XML
                            if (localContentType)
                                localContentType = 'application/xml';
                        }
                        this.setContentType(headers, localContentType);
                        return [data];
                    }

                    // JSON
                    if (
                        data.constructor === Object ||
                        (localContentType &&
                            isJSONContentType(localContentType))
                    ) {
                        // Object type, default to JSON
                        if (localContentType)
                            localContentType = 'application/json';
                        this.setContentType(headers, localContentType);

                        return [JSON.stringify(data)];
                    }

                    // Default form data
                    if (localContentType == null)
                        localContentType = 'application/x-www-form-urlencoded';
                    this.setContentType(headers, localContentType);

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
            } else if (isSimpleObject(data)) {
                mergeURLSearchParams(params, data);
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
        return this.getHeaderValue(headers, 'Content-Type');
    }

    /**
     * Get content type and charset
     * @param headers Headers
     */
    public getContentTypeAndCharset(headers: HeadersInit): [string, string?] {
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
     * Get content type
     * @param headers Headers
     */
    protected getHeaderValue(headers: HeadersInit, key: string): string | null {
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
     * Set content type
     * @param headers Headers
     * @param contentType New content type
     */
    protected setContentType(
        headers: HeadersInit,
        contentType: string | null | undefined
    ): void {
        let value = contentType;
        if (value && !value.includes('charset=')) {
            // Test charset
            value += `; charset=${this.charset}`;
        }
        this.setHeaderValue(headers, 'Content-Type', value);
    }

    /**
     * Set content type
     * @param headers Headers
     * @param contentType New content type
     */
    protected setHeaderValue(
        headers: HeadersInit,
        key: string,
        value: string | null | undefined
    ): void {
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
     * Is the response in Ok status
     */
    protected abstract responseOk(response: R): boolean;

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
                const { status, statusText } = response;

                if (this.responseOk(response)) {
                    // HTTP status codes range from 200-299
                    return { response };
                }

                // Other status codes are considered as error
                const message =
                    statusText ||
                    this.responseErrorMessage(
                        await this.responseData(response, ApiResponseType.Json)
                    );
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
        return mergeURLSearchParams(new URLSearchParams(), params);
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
            onError,
            params,
            parser,
            responseType = this.defaultResponseType,
            showLoading
        } = payload || {};

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

                // Transform data type
                let result: T;

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

                    // Convert data type, error may occure
                    result = parseResult as T;
                } else {
                    // Convert data type, error may occure
                    result = rawResult as T;
                }

                // Return result
                return result;
            } catch (exception) {
                apiData.depth = 3;
                this.handleError(exception, apiData, response, onError);
            }
        }

        return undefined;
    }

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

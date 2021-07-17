import { DataTypes, DateUtils, DomUtils } from '@etsoo/shared';
import { ApiBase } from './ApiBase';
import {
    ApiMethod,
    ApiResponseType,
    HeadersAll,
    IApiResponse,
    isIterable
} from './IApi';
import fetch, { Headers, Response } from 'node-fetch';

/**
 * Fetch Node API
 */
export class FetchNodeApi extends ApiBase<Response> {
    /**
     * Create response
     * @param method Method
     * @param url Api URL
     * @param headers Headers
     * @param data Data
     * @param reponseType Response data type
     * @param rest Rest properties
     */
    protected createResponse(
        method: ApiMethod,
        url: string,
        headers: HeadersAll,
        data: any,
        _responseType: ApiResponseType | undefined,
        rest: { [key: string]: any }
    ): Promise<Response> {
        // Headers
        const h = new Headers(
            isIterable(headers) ? Object.fromEntries(headers) : headers
        );

        // Request body
        const requestBody = {
            ...rest,
            body: data,
            headers: h,
            method: ApiMethod[method]
        };
        return fetch(url, requestBody);
    }

    /**
     * Get Json data directly
     * @param url URL
     * @returns Json data
     */
    getJson<T = DataTypes.ReadonlyData>(url: string) {
        return new Promise<T>((resolve, reject) => {
            // Fetch
            fetch(url).then((response) => {
                // Check validation
                if (!response.ok) {
                    reject('Invalid Status');
                    return;
                }

                // Json
                response.json().then((json) => {
                    if (json == null) {
                        reject('No Data');
                        return;
                    }

                    // Resolve
                    resolve(json as T);
                });
            });
        });
    }

    /**
     * Get response data
     * @param response API response
     * @param reponseType Response data type
     */
    protected responseData(
        response: Response,
        responseType?: ApiResponseType
    ): Promise<any> {
        // 204 = No content
        if (response.status === 204) return Promise.resolve('');

        // Content type
        const [contentType] = this.getContentTypeAndCharset(response.headers);

        if (
            responseType === ApiResponseType.Blob ||
            contentType.startsWith('application/octet-stream')
        )
            return response.blob();

        if (responseType === ApiResponseType.ArrayBuffer)
            return response.arrayBuffer();

        if (responseType === ApiResponseType.Document) {
            return new Promise((resolve) => {
                response.text().then((value) => {
                    // Document type
                    const type = contentType
                        ? (contentType as DOMParserSupportedType)
                        : 'application/xml';

                    // Transform text to document object (DOM)
                    // https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
                    const result = new DOMParser().parseFromString(value, type);

                    // Promise resolve
                    resolve(result);
                });
            });
        }

        if (responseType === ApiResponseType.Stream)
            return Promise.resolve(response.body);

        // Default is text
        const text = response.text();

        if (
            responseType === ApiResponseType.Json ||
            DomUtils.isJSONContentType(contentType)
        ) {
            return text.then((value) => {
                if (value == null || value === '') return '';
                return JSON.parse(value, DateUtils.jsonParser);
            });
        }

        return text;
    }

    /**
     * Transform original response to unified object
     * @param response Original response
     */
    transformResponse(response: Response): IApiResponse {
        // https://developer.mozilla.org/en-US/docs/Web/API/Response/ok
        const { headers, ok, status, statusText } = response;
        return {
            headers,
            ok,
            status,
            statusText
        };
    }
}

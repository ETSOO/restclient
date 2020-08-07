import { ApiBase } from './ApiBase';
import { ApiMethod, ApiResponseType } from './IApi';
import { isJSONContentType } from './Utils';

/**
 * Fetch API
 */
export class FetchApi extends ApiBase<Response> {
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
        headers: HeadersInit,
        data: any,
        _responseType: ApiResponseType,
        rest: { [key: string]: any }
    ): Promise<Response> {
        // Request body
        const requestBody = {
            ...rest,
            body: data,
            headers: new Headers(headers),
            method: ApiMethod[method]
        };
        return fetch(url, requestBody);
    }

    /**
     * Get response data
     * @param response API response
     * @param reponseType Response data type
     */
    protected responseData(
        response: Response,
        responseType: ApiResponseType
    ): Promise<any> {
        // Content type
        const [contentType] = this.getContentTypeAndCharset(response.headers);

        if (
            responseType === ApiResponseType.Json ||
            isJSONContentType(contentType)
        )
            return response.json();

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
                        ? (contentType as SupportedType)
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
        return response.text();
    }

    /**
     * Is the response in Ok status
     */
    protected responseOk(response: Response): boolean {
        // https://developer.mozilla.org/en-US/docs/Web/API/Response/ok
        return response.ok;
    }
}

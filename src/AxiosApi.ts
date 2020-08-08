import axios, { Method, AxiosResponse, ResponseType } from 'axios';
import { ApiBase } from './ApiBase';
import { ApiMethod, ApiResponseType } from './IApi';
import { headersToObject, isJSONContentType } from './Utils';

/**
 * Axios API
 */
export class AxiosApi extends ApiBase<AxiosResponse> {
    /**
     * Constructor
     * Format the error
     */
    constructor() {
        super();

        axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response) {
                    // Response exists
                    // push to response handle codes (up, responsePromiseHandler)
                    return Promise.resolve(error.response);
                }
                return Promise.reject(error);
            }
        );
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
    protected createResponse(
        method: ApiMethod,
        url: string,
        headers: HeadersInit,
        data: any,
        responseType: ApiResponseType,
        rest: { [key: string]: any }
    ): Promise<AxiosResponse> {
        // Transform response type
        const localResponseType = ApiResponseType[
            responseType
        ].toLowerCase() as ResponseType;

        // Request body
        const requestBody = {
            ...rest,
            data,
            headers: headersToObject(headers),
            method: ApiMethod[method] as Method,
            responseType: localResponseType,
            url
        };
        return axios(requestBody);
    }

    /**
     * Get response data
     * @param response API response
     * @param reponseType Response data type
     */
    protected responseData(
        response: AxiosResponse,
        responseType: ApiResponseType
    ): Promise<any> {
        const { data } = response;
        if (data) {
            // Content type
            const [contentType] = this.getContentTypeAndCharset(
                response.headers
            );

            if (
                (responseType === ApiResponseType.Json ||
                    isJSONContentType(contentType)) &&
                typeof data === 'string'
            ) {
                // Convert string to JSON object, rare
                return Promise.resolve(JSON.parse(data));
            }
        }
        return Promise.resolve(data);
    }

    /**
     * Is the response in Ok status
     */
    protected responseOk(response: AxiosResponse): boolean {
        const { status } = response;
        return status >= 200 && status < 299;
    }
}
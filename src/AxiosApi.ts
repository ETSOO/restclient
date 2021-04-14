import axios, { Method, AxiosResponse, ResponseType } from 'axios';
import { DataTypes, DomUtils } from '@etsoo/shared';
import { ApiBase } from './ApiBase';
import { ApiMethod, ApiResponseType, IApiResponse } from './IApi';

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
            headers: DomUtils.headersToObject(headers),
            method: ApiMethod[method] as Method,
            responseType: localResponseType,
            url
        };
        return axios(requestBody);
    }

    /**
     * Get Json data directly
     * @param url URL
     * @returns Json data
     */
    getJson<T = DataTypes.ReadonlyData>(url: string) {
        return new Promise<T>((resolve, reject) => {
            // Get
            axios.get(url).then((response) => {
                // Check validation
                if (response.status != 200) {
                    reject('Invalid Status');
                    return;
                }

                // No data
                if (response.data == null || response.data === '') {
                    reject('No Data');
                }

                // Convert possible string to Json object
                const data =
                    typeof response.data === 'string'
                        ? JSON.parse(response.data)
                        : response.data;

                // Resolve
                resolve(data as T);
            });
        });
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
                    DomUtils.isJSONContentType(contentType)) &&
                typeof data === 'string'
            ) {
                // 204 = No content
                if (response.status === 204) return Promise.resolve('');

                // Convert string to JSON object, rare
                return Promise.resolve(JSON.parse(data));
            }
        }
        return Promise.resolve(data);
    }

    /**
     * Transform original response to unified object
     * @param response Original response
     */
    transformResponse(response: AxiosResponse): IApiResponse {
        const { headers, status, statusText } = response;

        // HTTP status codes range from 200-299
        const ok = status >= 200 && status <= 299;
        return {
            headers,
            ok,
            status,
            statusText
        };
    }
}

import axios, {
  Method,
  AxiosResponse,
  ResponseType,
  RawAxiosResponseHeaders,
  AxiosResponseHeaders,
  AxiosRequestConfig
} from "axios";
import { DateUtils, DomUtils } from "@etsoo/shared";
import { ApiBase } from "./ApiBase";
import {
  ApiMethod,
  ApiResponseType,
  HeadersAll,
  IApiConfigShared,
  IApiResponse
} from "./IApi";

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
    headers: HeadersAll,
    data: any,
    responseType: ApiResponseType | undefined,
    rest: IApiConfigShared
  ): Promise<AxiosResponse> {
    // Transform response type
    const localResponseType =
      responseType == null
        ? undefined
        : (ApiResponseType[responseType].toLowerCase() as ResponseType);

    // Request body
    const requestBody: AxiosRequestConfig = {
      data,
      headers: DomUtils.headersToObject(headers),
      method: ApiMethod[method] as Method,
      responseType: localResponseType,
      url
    };

    // Merge rest properties
    // Based on https://developer.mozilla.org/en-US/docs/Web/API/RequestInit
    if (rest.credentials && rest.credentials !== "omit") {
      requestBody.withCredentials = true;
    }

    if (rest.signal) {
      requestBody.signal = rest.signal;
    }

    return axios(requestBody);
  }

  /**
   * Get Json data directly
   * @param url URL
   * @returns Json data
   */
  async getJson<T extends {} = {}>(url: string) {
    const response = await axios.get(url);
    if (
      response.status === 200 &&
      response.data != null &&
      response.data !== ""
    ) {
      // Convert possible string to Json object
      const data =
        typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data;

      return data as T;
    }
  }

  private transformHeaders(
    headers: RawAxiosResponseHeaders | AxiosResponseHeaders
  ): HeadersAll {
    if (typeof headers.toJSON === "function") {
      return headers.toJSON(true) as {};
    } else if (typeof headers === "object") {
      return headers as {};
    }
    return {};
  }

  /**
   * Get response data
   * @param response API response
   * @param reponseType Response data type
   * @param dateFields Date field names
   * @param defaultValue Default value
   */
  protected responseData(
    response: AxiosResponse,
    responseType?: ApiResponseType,
    dateFields?: string[],
    defaultValue?: unknown
  ): Promise<any> {
    const { data } = response;
    if (data) {
      // Content type
      const [contentType] = this.getContentTypeAndCharset(
        this.transformHeaders(response.headers)
      );

      if (
        (responseType === ApiResponseType.Json ||
          DomUtils.isJSONContentType(contentType)) &&
        typeof data === "string"
      ) {
        // 204 = No content
        if (response.status === 204 || data == null || data === "")
          return Promise.resolve("");

        // Convert string to JSON object, rare
        const fields = this.getDateFields(dateFields, defaultValue);
        if (fields.length > 0)
          return JSON.parse(data, DateUtils.jsonParser(fields));
        return JSON.parse(data);
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
      headers: this.transformHeaders(headers),
      ok,
      status,
      statusText
    };
  }
}

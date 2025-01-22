/* eslint-disable no-param-reassign */
import { DomUtils, DataTypes, ContentDisposition } from "@etsoo/shared";
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
  IApiCompleteHandler,
  IPData,
  HeadersAll,
  isIterable,
  IApiConfigShared
} from "./IApi";
import { ApiError } from "./ApiError";
import { ApiDataError } from "./ApiDataError";

const httpStatuses: Record<number, string> = {
  // Informational responses
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  103: "Early Hints",

  // Successful responses
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",

  // Redirection messages
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  307: "Temporary Redirect",
  308: "Permanent Redirect",

  // Client error responses
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a Teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",

  // Server error responses
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required"
};

/**
 * Api abstract class
 */
export abstract class ApiBase<R = any> implements IApi<R> {
  /**
   * Headers content type key
   */
  protected static ContentTypeKey = "Content-Type";

  /**
   * API base url
   */
  baseUrl?: string;

  /**
   * Charset, default is 'utf-8'
   */
  charset: string = "utf-8";

  /**
   * Default configures
   */
  config?: IApiConfig;

  /**
   * Default response data type
   */
  defaultResponseType?: ApiResponseType;

  private lastErrorPrivate?: ApiDataError<R>;

  /**
   * Last error
   */
  get lastError() {
    return this.lastErrorPrivate;
  }

  /**
   * JSON content type
   */
  get jsonContentType() {
    return "application/json";
  }

  /**
   * Name of the API
   */
  name: string = "system";

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
  ): void {
    // Scheme name
    const schemeName =
      typeof scheme === "number" ? ApiAuthorizationScheme[scheme] : scheme;

    // Headers
    const headers = writeHeaders ?? this.getHeaders();

    // Authentication header value
    const value = token ? `${schemeName} ${token}` : token;

    // Set
    this.setHeaderValue("Authorization", value, headers);
  }

  /**
   * Detect IP data
   * @returns IP data
   */
  async detectIP() {
    // Endpoints for detection
    const endpoints = [
      "https://extreme-ip-lookup.com/json/",
      "https://geoip-db.com/json/",
      "https://ipapi.co/json"
    ];

    // Any success result
    let data: Readonly<DataTypes.StringDictionary> | undefined;

    try {
      if (typeof Promise.any === "function") {
        data = await Promise.any(endpoints.map((p) => this.getJson(p)));
      } else {
        data = await new Promise<Readonly<DataTypes.StringDictionary>>(
          (resolve) => {
            endpoints.forEach(async (p) => {
              const result = await this.getJson(p);
              if (result != null) resolve(result);
            });
          }
        );
      }
    } catch (e) {
      data = undefined;
    }

    if (data == null) return undefined;

    // IP data
    const ipData: IPData = {
      ip: data.query ?? data.IPv4 ?? data.IPv6,
      country: data.country ?? data.country_name,
      countryCode: data.countryCode ?? data.country_code,
      timezone: data.timezone
    };

    // Return
    return ipData;
  }

  /**
   * Build API url
   * @param url API url
   */
  protected buildUrl(url: string) {
    return !url.includes("://") && this.baseUrl ? `${this.baseUrl}${url}` : url;
  }

  // Create form files
  private createFormFiles(files: FileList) {
    const formFiles = new FormData();
    for (let i = 0; i < files.length; i += 1) {
      const file = files.item(i);
      if (file) formFiles.append("files", file);
    }
    return formFiles;
  }

  /**
   * Get Json data directly
   * @param url URL
   */
  abstract getJson<T extends {} = {}>(url: string): Promise<T | undefined>;

  /**
   * Get status text
   * @param status Status code
   * @returns Status text
   */
  getStatusText(status: number) {
    return httpStatuses[status] ?? "Unknown";
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
    headers: HeadersAll,
    params: URLSearchParams,
    data?: ApiRequestData,
    contentType?: string
  ): [any, Error?] {
    if (data) {
      if (
        method === ApiMethod.PATCH ||
        method === ApiMethod.POST ||
        method === ApiMethod.PUT
      ) {
        // Calculate content type
        let localContentType = contentType || this.getContentType(headers);

        // Body type
        try {
          // String type
          if (data instanceof String) {
            if (data.startsWith("{") && data.endsWith("}")) {
              // Guess as JSON
              if (!localContentType) localContentType = this.jsonContentType;
            } else if (data.startsWith("<") && data.endsWith(">")) {
              // Guess as XML
              if (!localContentType) localContentType = "application/xml";
            }
            this.setContentType(localContentType, headers);
            return [data];
          }

          // Form data
          if (DomUtils.isFormData(data)) {
            return [data];
          }

          // JSON
          if (
            data.constructor === Object ||
            (localContentType && DomUtils.isJSONContentType(localContentType))
          ) {
            // Object type, default to JSON
            if (!localContentType) localContentType = this.jsonContentType;
            this.setContentType(localContentType, headers);

            return [JSON.stringify(data)];
          }

          // Set content type
          if (!localContentType) this.setContentType(localContentType, headers);

          // FileList, check availibility
          if (typeof FileList !== "undefined" && data instanceof FileList)
            return [this.createFormFiles(data)];

          // ArrayBufferView
          if (ArrayBuffer.isView(data)) return [data.buffer];

          // Other cases
          return [data];
        } catch (ex) {
          const error = ex instanceof Error ? ex : new Error(String(ex));
          return [undefined, error];
        }
      }

      // params shoud be avoided to pass with data
      if (Array.from(params.keys()).length > 0) {
        return [
          undefined,
          new Error("URL params shoud be avoided to pass with data")
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
          new TypeError("Data transforms to params with wrong data type")
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

        if (typeof defaultValue === "object") {
          // Is object, copy and merge
          apiConfig[key] = {
            ...defaultValue,
            ...(typeof configValue === "object" ? configValue : {})
          };
        } else if (!Object.keys(apiConfig).some((k) => k === key)) {
          apiConfig[key] = defaultValue;
        }
      });
    }
  }

  /**
   * Get content type
   * @param headers Headers
   */
  protected getContentType(headers: HeadersAll): string | null {
    return this.getHeaderValue(headers, ApiBase.ContentTypeKey);
  }

  /**
   * Get content length
   * @param headers Headers
   * @returns
   */
  getContentLength(headers: HeadersAll): number | undefined {
    const cl = this.getHeaderValue(headers, "content-length");
    if (cl == null || cl === "") return undefined;
    return parseInt(cl);
  }

  /**
   * Get content type and charset
   * @param headers Headers
   */
  getContentTypeAndCharset(headers: HeadersAll): [string, string?] {
    const contentType = this.getContentType(headers);
    if (contentType) {
      const parts = contentType.split(";");
      return [parts[0].trim(), parts.length > 1 ? parts[1].trim() : undefined];
    }
    return ["", undefined];
  }

  /**
   * Get headers
   * @returns Headers
   */
  protected getHeaders() {
    let headers: HeadersAll;
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

  getContentDisposition(response: R): ContentDisposition | undefined;
  getContentDisposition(header: string): ContentDisposition | undefined;
  /**
   * Get HTTP content dispostion
   * @param responseOrValue Response or header value
   * @returns Result
   */
  getContentDisposition(responseOrValue: R | string) {
    const cd =
      typeof responseOrValue === "string"
        ? responseOrValue
        : this.getHeaderValue(
            this.transformResponse(responseOrValue).headers,
            "Content-Disposition"
          );
    return ContentDisposition.parse(cd);
  }

  /**
   * Get content type
   * @param headers Headers
   */
  getHeaderValue(headers: HeadersAll, key: string): string | null {
    // Key to lower case
    key = key.toLowerCase();

    // String array
    // isIterable(headers) = true, Array.isArray(headers) also true
    // so Array.from(headers) will never happen
    if (isIterable(headers) || Array.isArray(headers)) {
      const array = Array.isArray(headers) ? headers : Array.from(headers);
      const arrayItem = array.find((item) => item[0].toLowerCase() === key);
      if (arrayItem == null) return null;
      return arrayItem[1];
    }

    // Standard Headers
    if (headers instanceof Headers) {
      return headers.get(key);
    }

    // Simple object
    const matchKey = Object.keys(headers).find(
      (item) => item.toLowerCase() === key
    );
    if (matchKey) return headers[matchKey];

    return null;
  }

  /**
   * Set content language
   * @param language Content language
   * @param headers Headers, default is global headers
   */
  setContentLanguage(
    language: string | null | undefined,
    headers?: HeadersAll
  ) {
    this.setHeaderValue(
      "Content-Language",
      language,
      headers ?? this.getHeaders()
    );
  }

  /**
   * Set content type
   * @param contentType New content type
   * @param headers Headers
   */
  protected setContentType(
    contentType: string | null | undefined,
    headers: HeadersAll
  ): void {
    let value = contentType;
    if (value && !value.includes("charset=")) {
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
    headers: HeadersAll
  ): void {
    // Key to lower case
    key = key.toLowerCase();

    // isIterable(headers) = true, Array.isArray(headers) also true
    // so Array.from(headers) will never happen
    // so push and splice without updating the source array will be effective
    if (isIterable(headers) || Array.isArray(headers)) {
      const array = Array.isArray(headers) ? headers : Array.from(headers);

      const index = array.findIndex((item) => item[0].toLowerCase() === key);

      if (value) {
        if (index === -1) array.push([key, value]);
        else array[index][1] = value;
      } else if (index !== -1) {
        array.splice(index, 1);
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
      Object.keys(headers).find((item) => item.toLowerCase() === key) || key;
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
    headers: HeadersAll,
    data: any,
    responseType: ApiResponseType | undefined,
    rest: IApiConfigShared
  ): Promise<R>;

  protected getDateFields(dateFields?: string[], defaultValue?: unknown) {
    // Set static date fields
    if (dateFields != null && dateFields.length > 0) return dateFields;

    // Dynamic from default value
    const fields: string[] = [];
    if (defaultValue != null) {
      let simpleObject;
      if (Array.isArray(defaultValue)) {
        if (defaultValue.length === 0) return [];
        simpleObject = defaultValue[0];
      } else {
        simpleObject = defaultValue;
      }

      for (const [key, value] of Object.entries(simpleObject)) {
        if (value instanceof Date) fields.push(key);
      }
    }

    return fields;
  }

  /**
   * Get response data
   * @param response API response
   * @param reponseType Response data type
   * @param dateFields Date field names
   * @param defaultValue Default value
   */
  protected abstract responseData(
    response: R,
    responseType?: ApiResponseType,
    dateFields?: string[],
    defaultValue?: unknown
  ): Promise<any>;

  /**
   * Get response error message
   * @param data Response data
   */
  private responseErrorMessage(data: any) {
    if (isResponseErrorData(data)) return data.message || data.title;
    return undefined;
  }

  // Response promise handler for error catch
  private responsePromiseHandler(promise: Promise<R>): Promise<{
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
        const { ok, status, statusText } = this.transformResponse(response);

        if (ok) {
          return { response };
        }

        // Other status codes are considered as error
        // Try to read response JSON data
        let errorMessage: string | undefined;
        try {
          // When parse, may have unexpected end of JSON input
          const responseData = await this.responseData(
            response,
            ApiResponseType.Json
          );
          errorMessage = this.responseErrorMessage(responseData);
        } catch {
          errorMessage = undefined;
        }

        const message = errorMessage || statusText || "Unkown";
        const error = new ApiError(message, status);
        return { error, response };
      })
      .catch((reason) => {
        const exception: Error = reason;
        const error = new ApiError(exception.message || "Network Error", -1);
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
      dateFields,
      defaultValue,
      onError,
      params,
      parser,
      responseType = this.defaultResponseType,
      showLoading,
      local
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
    const localUrl = parameters ? url.addUrlParams(parameters) : url;

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
    const api = local ? localUrl : this.buildUrl(localUrl);

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
      const localError = error || new Error("No Response Error");
      apiData.depth = 1;
      this.handleError(localError, apiData, response, onError);
    } else {
      // Hold a reference
      if (payload != null) payload.response = response;

      // Dispatch response callback
      this.dispatchResponseCallback(apiData, response);

      // Return target type data
      try {
        const rawResult = await this.responseData(
          response,
          responseType,
          dateFields,
          defaultValue
        );

        // May return null or ''
        if (rawResult == null || rawResult === "") {
          return defaultValue;
        }

        if (parser) {
          // Parser case
          const [parseError, parseResult] = parser(rawResult);
          if (parseError) {
            apiData.depth = 2;
            this.handleError(parseError, apiData, response, onError);
            return undefined;
          }

          if (parseResult) return parseResult;
          return defaultValue;
        }

        // Transform data type
        return rawResult as T;
      } catch (ex) {
        // unknow type of ex more safe
        // https://devblogs.microsoft.com/typescript/announcing-typescript-4-4/
        const error = ex instanceof Error ? ex : new Error(String(ex));

        apiData.depth = 3;
        this.handleError(error, apiData, response, onError);
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
    const result = await this.request<T>(ApiMethod.DELETE, url, data, payload);
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
    const result = await this.request<T>(ApiMethod.HEAD, url, data, payload);
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
    const result = await this.request<T>(ApiMethod.OPTIONS, url, data, payload);
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
    const result = await this.request<T>(ApiMethod.PATCH, url, data, payload);
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
    const result = await this.request<T>(ApiMethod.POST, url, data, payload);
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

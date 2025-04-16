/* eslint-disable no-undef */
import createFetchMock from "vitest-fetch-mock";
import { FetchApi } from "../src/FetchApi";
import {
  ApiMethod,
  IApiConfig,
  ApiResponseType,
  ApiRequestData,
  ApiAuthorizationScheme,
  IApiPayload
} from "../src/IApi";

/**
 * Fetch Api helper class for testing
 * https://stackoverflow.com/questions/5601730/should-private-protected-methods-be-under-unit-test
 * I agree protected methods, especially critical methods should be tested with a extended new class
 * ApiBase protected methods are tested here
 */
class FetchApiHelper extends FetchApi {
  /**
   * Build API url
   * @param url API url
   */
  buildUrl(url: string) {
    return super.buildUrl(url);
  }

  /**
   * Get content type
   * @param headers Headers
   */
  getContentType(headers: HeadersInit): string | null {
    return super.getContentType(headers);
  }

  /**
   * Set content type
   * @param headers Headers
   * @param contentType New content type
   */
  setContentType(
    contentType: string | null | undefined,
    headers: HeadersInit
  ): void {
    super.setContentType(contentType, headers);
  }

  /**
   * Merge API configure, two levels only
   * @param apiConfig API configure
   */
  mergeConfig(apiConfig: IApiConfig) {
    super.mergeConfig(apiConfig);
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
  createResponse(
    method: ApiMethod,
    url: string,
    headers: HeadersInit,
    data: any,
    responseType: ApiResponseType,
    rest: { [key: string]: any }
  ): Promise<Response> {
    return super.createResponse(method, url, headers, data, responseType, rest);
  }

  /**
   * Format posted data
   * @param method Verb
   * @param headers Headers
   * @param params URL parameters
   * @param data Raw data
   * @param contentType Content type
   */
  formatData(
    method: ApiMethod,
    headers: HeadersInit,
    params: URLSearchParams,
    data?: ApiRequestData,
    contentType?: string
  ): [any, Error?] {
    return super.formatData(method, headers, params, data, contentType);
  }

  /**
   * Get response data
   * @param response API response
   * @param reponseType Response data type
   */
  responseData(
    response: Response,
    responseType: ApiResponseType
  ): Promise<any> {
    return super.responseData(response, responseType, ["creation"]);
  }
}

/**
 * Test JSON data interface
 */
interface CountryItem {
  id: string;
  name: string;
  creation: Date;
}

// Enable fetch mocks to avoid Headers/fetch is not defined
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

// Before each test, reset mocks
beforeEach(() => {
  fetchMock.resetMocks();
});

// Create the API client
const api = new FetchApiHelper();

// For HTTPS test
// https://stackoverflow.com/questions/31673587/error-unable-to-verify-the-first-certificate-in-nodejs/32440021
// Server side cross origin http://localhost should be added
// "testEnvironment": "node"
api.baseUrl = "http://localhost:19333";
api.name = "Etsoo";

// Arrange
const data = [
  { id: "CN", name: "China", creation: "1949-10-1" },
  { id: "NZ", name: "New Zealand", creation: "1907-9-26" }
];

describe("Protected methods tests", () => {
  it("createResponse, responseData, responseOk", async () => {
    // Mock the response data
    fetchMock.mockResponse(JSON.stringify(data));

    // Create the response
    const response = await api.createResponse(
      ApiMethod.GET,
      api.buildUrl("/Customer/CountryList"),
      {},
      undefined,
      ApiResponseType.Json,
      {}
    );

    // Response should be defined
    expect(response).toBeDefined();

    // Response status is OK
    expect(api.transformResponse(response).ok).toBeTruthy();

    // Response data should be defined
    const result = await api.responseData(response, ApiResponseType.Json);
    expect(result).toBeDefined();

    // Response data matches
    expect(result).toContainEqual({
      id: "CN",
      name: "China",
      creation: new Date("1949-10-1")
    });
  });

  test("Tests for formatData", () => {
    const headers = { "content-length": "123" };
    const [data] = api.formatData(
      ApiMethod.PUT,
      headers,
      new URLSearchParams(),
      { id: 1, name: "test" }
    );
    expect(api.getContentTypeAndCharset(headers)[0]).toBe(api.jsonContentType);
    expect(api.getContentLength(headers)).toBe(123);
    expect(typeof data).toBe("string");
    expect(data).toMatch('"id":');
  });

  // For array data, please pass JSON content type
  test("Tests for array formatData", () => {
    const headers = {
      "content-length": "123",
      "content-type": api.jsonContentType
    };
    const [data] = api.formatData(
      ApiMethod.POST,
      headers,
      new URLSearchParams(),
      ["a", "b", "c"]
    );

    expect(api.getContentTypeAndCharset(headers)[0]).toBe(api.jsonContentType);
    expect(api.getContentLength(headers)).toBe(123);
    expect(data).toMatch('["a","b","c"]');
  });
});

describe("Global level tests", () => {
  test("Name", () => {
    // Assert
    expect(api.name).toBe("Etsoo");
  });
  test("Authorization", () => {
    // Act
    api.authorize(ApiAuthorizationScheme.Bearer, "abc");

    // Assert
    expect(api.config?.headers).toBeDefined();
    if (api.config?.headers) {
      expect(api.getHeaderValue(api.config.headers, "Authorization")).toBe(
        "Bearer abc"
      );
    }
  });
});

describe("buildUrl tests", () => {
  test("buildUrl concatenation ", () => {
    const url = "/Customer/CountryList/11";
    expect(api.buildUrl(url)).toBe(`${api.baseUrl}${url}`);
  });

  test("buildUrl full", () => {
    const httpURL = "http://localhost/Customer/CountryList/11";
    expect(api.buildUrl(httpURL)).toBe(httpURL);
  });
});

describe("setContentType/getContentType/getContentTypeAndCharset tests", () => {
  // Arrange
  const headers: HeadersInit = {
    Cache: "true",
    "Content-Type": "application/problem+json"
  };

  // https://stackoverflow.com/questions/5258977/are-http-headers-case-sensitive
  // Names are case insensitive
  test("name case insensitive", () => {
    // Act
    api.setContentType(api.jsonContentType, headers);

    // Assert
    expect(Object.keys(headers).length).toBe(2);

    // Act
    const contentType = api.getContentType(headers);

    // Assert
    expect(contentType).toBe(`application/json; charset=${api.charset}`);

    // Act
    const result = api.getContentTypeAndCharset(headers);
    expect(result).toStrictEqual([
      api.jsonContentType,
      `charset=${api.charset}`
    ]);
  });
});

describe("GET tests", () => {
  test("Empty result", async () => {
    // Mock the response data
    fetchMock.mockResponse("", {
      headers: { "Content-type": api.jsonContentType }
    });

    // Act
    const emptyResult = await api.get<CountryItem[]>("/Customer/CountryList");

    // Assert
    expect(emptyResult).toBeUndefined();

    // Act
    const emptyArrayResult = await api.get<CountryItem[]>(
      "/Customer/CountryList",
      undefined,
      { defaultValue: [] }
    );

    // Assert
    expect(emptyArrayResult?.length).toBe(0);
  });

  test("OK result", async () => {
    // Mock the response data
    fetchMock.mockResponse(JSON.stringify(data), {
      headers: { "Content-type": api.jsonContentType }
    });

    // Act
    const okResult = await api.get<CountryItem[]>("/Customer/CountryList");

    // Assert
    expect(okResult).toBeDefined();
    expect(okResult?.length).toBe(2);
  });

  it("Failure result", async () => {
    // Mock the response data
    fetchMock.mockResponse('{ title: "Not Found" }', {
      status: 404,
      statusText: "Not Found"
    });

    // Act
    const failResult = await api.post<CountryItem[]>(
      "/Customer/CountryList",
      undefined,
      {
        onError: (error) => {
          expect(error).toHaveProperty("message", "Not Found");
          expect(error.data).toHaveProperty("method", ApiMethod.POST);
        }
      }
    );

    // Assert
    expect(failResult).toBeUndefined();
    expect(api.lastError?.data.url).toBe("/Customer/CountryList");
  });

  it("Failure result with statusText", async () => {
    // Mock the response data
    fetchMock.mockResponse(undefined, {
      status: 400,
      statusText: ""
    });

    // Act
    const failResult = await api.post<CountryItem[]>(
      "/Customer/CountryList",
      undefined,
      {
        onError: (error) => {
          if (error.response) {
            const data = api.transformResponse(error.response);
            expect(data).toHaveProperty("status", 400);
            expect(data).toHaveProperty("statusText", api.getStatusText(400));
          }
        }
      }
    );

    // Assert
    expect(failResult).toBeUndefined();
    expect(api.getStatusText(429)).toBe("Too Many Requests");
  });

  it("Failure result with .NET model validation", async () => {
    // Mock the response data
    const data = {
      type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
      title: "One or more validation errors occurred.",
      status: 400,
      errors: {
        $: [
          "JSON deserialization for type \u0027com.etsoo.CMS.RQ.User.UserCreateRQ\u0027 was missing required properties, including the following: password"
        ],
        rq: ["The rq field is required."]
      },
      traceId: "00-ed96a4f0c83f066594ecc69b77da9803-df770e3cd714fedd-00"
    };
    fetchMock.mockResponse(JSON.stringify(data), {
      status: 400,
      headers: {
        "Content-Type": "application/problem+json; charset=utf-8"
      }
    });

    // Act
    const failResult = await api.post<CountryItem[]>(
      "/Customer/CountryList",
      undefined,
      {
        onError: (error) => {
          expect(error).toHaveProperty(
            "message",
            "One or more validation errors occurred."
          );
          expect(error.data).toHaveProperty("method", ApiMethod.POST);
        }
      }
    );

    // Assert
    expect(failResult).toBeUndefined();
    expect(api.lastError?.data.url).toBe("/Customer/CountryList");
  });

  it("detectIP tests", async () => {
    // Mock the response data
    fetchMock.mockResponse(
      JSON.stringify({
        status: "success",
        country: "New Zealand",
        countryCode: "NZ",
        region: "AUK",
        regionName: "Auckland",
        city: "Auckland",
        zip: "1010",
        lat: -36.8506,
        lon: 174.7679,
        timezone: "Pacific/Auckland",
        isp: "CallPlus Services Limited",
        org: "CallPlus Services Limited",
        as: "AS9790 Vocus Group NZ",
        query: "101.98.49.5"
      })
    );

    const data = await api.detectIP();
    expect(data?.ip).toBe("101.98.49.5");
    expect(data?.country).toBe("New Zealand");
    expect(data?.region).toBe("Auckland");
    expect(data?.city).toBe("Auckland");
  });
});

describe("POST tests", () => {
  // For asyn/await call
  // Or without it, add a done parameter here
  test("OK result", async () => {
    // Api client
    const localApi = new FetchApi();

    // Global authorization
    localApi.authorize("etsoo", " abc");

    // Authorization header
    const { scheme, token } = localApi.getAuthorization() ?? {};
    expect(scheme).toBe("etsoo");
    expect(token).toBe(" abc");

    // On request
    localApi.onRequest = (apiData) => {
      // Local authorization test
      expect(api.getHeaderValue(apiData.headers, "Authorization")).toBe(
        "Basic basic"
      );

      expect(api.getContentTypeAndCharset(apiData.headers)[0]).toBe(
        api.jsonContentType
      );
      expect(apiData.method).toBe(ApiMethod.POST);
    };

    // On response
    localApi.onResponse = (apiData) => {
      // part with string
      expect(apiData.url).toMatch("id=2");
      // or Regex match
      expect(apiData.url).toMatch(/name=test/);
    };

    // Mock the response data
    fetchMock.mockResponse(JSON.stringify(data), {
      url: "/Customer/CountryList",
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

    // Local authorization
    localApi.authorize(ApiAuthorizationScheme.Basic, "basic");

    const configBefore = JSON.stringify(localApi.config);

    // Payload
    const payload: IApiPayload<CountryItem[], any> = {
      params: { id: 2, name: "test" },
      dateFields: ["creation"]
    };

    const okResult = await localApi.post<CountryItem[]>(
      "/Customer/CountryList",
      { id: 1 },
      payload
    );

    const configAfter = JSON.stringify(localApi.config);

    // Assert
    expect(configBefore).toStrictEqual(configAfter);
    expect(payload.response).not.toBeNull();
    expect(okResult).toBeDefined();

    if (okResult != null) {
      expect(okResult.length).toBe(2);
      const isDate = okResult[0].creation instanceof Date;
      expect(isDate).toBeTruthy();
    }
  });
});

# @etsoo/restclient

**TypeScript promise based HTTP/REST API client. Unified axios and fetch usage.**

- axios: https://github.com/axios/axios, based on XHR: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
- fetch: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

ESLint + AirbnbBase + Prettier, Jest(ts-jest) applied. About how to build a NPM package and CI/CD with Github action: https://dev.to/garryxiao/build-a-react-components-npm-package-and-ci-cd-with-github-action-1jm6

## Installing

Using npm:

```bash
$ npm install @etsoo/restclient
```

Using yarn:

```bash
$ yarn add @etsoo/restclient
```

## Example

### Initialization

- Depending on the envioronment, fetch first. If fetch is not supported, use axios.

```ts
import { createClient, IApi } from '@etsoo/restclient';
const client: IApi = createClient();
```

- Depending on your decision.

```ts
import { FetchApi } from '@etsoo/restclient';
const client = new FetchApi();
// Or
import { AxiosApi } from '@etsoo/restclient';
const client = new AxiosApi();
```

### Calls

```ts
// Customer data structure
interface Customer {
    id: string,
    name: string
}

// API client
const client = createClient();

// Authorization, JWT
client.authorize(ApiAuthorizationScheme.Bearer, '*** JWT token ***');

// Read customer list with asyc/await ES6+ style
const customers = await client.get<Customer[]>('/api/customer');
// or with traditional callback way
client.get<Customer[]>('/api/customer').then(customers => {
});

// Read one customer
const customer = await client.get<Customer>('/api/customer/1');
if(customer == null) {
    // Error found
    return;
}
console.log(customer.name);
```

### Error handling

```ts
// API client
const client = createClient();

// Global error handling
client.onError = (error) => {
    console.log(error);
}

// Read one customer
var payload: IApiPayload<Customer, any> = {
    // Current call's error handling
    onError = (error) => {
        console.log(error);
        // return false to prevent further error handling
        return false;
    }
}

const customer = await client.get<Customer>('/api/customer/1', undefined, payload);
if(customer == null) {
    // Error found
    // client.lastError cache the last error
    // For accurate check, validate client.lastError.data.url
    return;
}

// Now call payload.response to access headers
// client.transformResponse(payload.response) to get a standard IApiResponse
```

## Properties

|Name|Description|
|---:|---|
|baseUrl|API base URL, add to the API root of all calls|
|charset|Charset for sending data, default is 'utf-8'|
|config|See axios/Request Config or fetch/RequestInit|
|defaultResponseType|Default type is JSON|
|lastError|Last error for track|
|onError|Error occured callback|
|onRequest|Before request callback|
|onComplete|After request completed but before onResponse|
|onResponse|After response callback|

## Methods

Provides **delete, get, head, options, patch, post, put** syntactic sugar for **request** method. Return with **undefined** means error found. If the API return nothing with success, a **empty object {}** will be returned to distingush the error case. Define a **onError** callback function at **payload** only for the call or client's property **onError** for global error handling.

```ts
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
    ): void;

    /**
     * Detect IP data
     * @returns IP data
     */
    detectIP(): Promise<IPData | undefined>;

    /**
     * Get content type and charset
     * @param headers Headers
     */
    getContentTypeAndCharset(headers: HeadersInit): [string, string?];

    /**
     * Get content type
     * @param headers Headers
     */
    getHeaderValue(headers: HeadersInit, key: string): string | null;

    /**
     * Get Json data directly
     * @param url URL
     * @returns Json data
     */
    getJson<T = DataTypes.ReadonlyData>(url: string): Promise<T>;

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
     * @param headers Headers
     */
    setContentLanguage(
        language: string | null | undefined,
        headers?: HeadersInit
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
        headers?: HeadersInit
    ): void;

    /**
     * Transform the original response to a unified object
     * @param response Original response
     */
    transformResponse(response: R): IApiResponse;
```

## Call Payload

When you call any API, pass additional properties with the payload parameter.

|Name|Description|
|---:|---|
|contentType|Specify data type to send, like 'application/json'|
|onError|Current API call error callback|
|config|Current API config. See axios/Request Config or fetch/RequestInit|
|defaultValue|Default value, like [] for array return|
|params|URL parameters|
|parser|Current API response data parser|
|response|Request response object|
|responseType|Specify response data type|
|showLoading|Whether to show loading bar|

## License

[MIT](LICENSE)
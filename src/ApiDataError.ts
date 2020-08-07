import { IApiData } from './IApi';

/**
 * Api Data Error
 */
export class ApiDataError<R> extends Error {
    /**
     * Api data
     */
    readonly data: IApiData;

    /**
     * Response object
     */
    readonly response?: R;

    /**
     * Original error
     */
    readonly source?: Error;

    /**
     * Constructor
     * @param error Original error
     * @param data Api data
     * @param response Response object
     */
    constructor(error: Error, data: IApiData, response?: R) {
        super(error.message);

        this.stack = error.stack;
        this.name = 'ApiDataError';

        this.source = error;
        this.data = data;
        this.response = response;
    }
}

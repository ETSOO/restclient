/**
 * Api Error
 */
export class ApiError extends Error {
    /**
     * HTTP status codes
     * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
     */
    readonly status: number;

    /**
     * Constructor
     * @param message Error message
     * @param status HTTP status code
     */
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }

    /**
     * Formated string
     */
    toString() {
        let s = super.toString();
        if (this.status > 0) {
            s = `${s} (${this.status})`;
        }
        return s;
    }
}

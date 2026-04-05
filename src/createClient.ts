import { FetchApi } from "./FetchApi";
import { IApi } from "./IApi";

/**
 * Create REST API client
 */
export function createClient(): IApi {
  if (typeof fetch === "undefined")
    throw new Error("Fetch API is not supported in this environment.");
  return new FetchApi();
}

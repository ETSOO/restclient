import type { IApi } from "./IApi";

/**
 * Async create REST API client
 */
export async function createClientAsync(): Promise<IApi> {
  if (typeof fetch === "undefined") {
    throw new Error("Fetch API is not supported in this environment.");
  }

  const { FetchApi } = await import("./FetchApi.js");
  return new FetchApi();
}

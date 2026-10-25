import "server-only";

export type ApiErrorKind =
  "timeout" | "network" | "http" | "invalid-response" | "config";

/**
 * Typed API failure. `message` is for logs only — never render it; show a generic,
 * translated message instead (CLAUDE.md §6).
 */
export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly path: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

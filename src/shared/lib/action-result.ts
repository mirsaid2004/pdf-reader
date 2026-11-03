/**
 * Return type for server actions. Errors are returned, not thrown, because
 * thrown errors are redacted in production and can't carry a user message.
 */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string): { ok: false; error: string } => ({
  ok: false,
  error,
});

/**
 * The moment a server component rendered, in ms. Passed to the browser so a
 * copy of the page held in the client cache can tell how old it is (see
 * `RefreshWhenStale` and `useStaleOnMount`). Call it only after reading
 * request data (cookies/session), so it is never taken at build time.
 */
export function serverNow(): number {
  return Date.now();
}

import "server-only";

import { getCurrentUser } from "@/shared/auth";
import { presignGet } from "@/shared/lib/r2";

import { getOwnedBookStorage } from "./queries";

const URL_TTL_SECONDS = 5 * 60;

/**
 * Responds with a redirect to a short-lived presigned cover URL after
 * checking ownership. 404 for missing *and* foreign books (no existence leak).
 */
export async function coverRedirectResponse(bookId: string): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const storage = await getOwnedBookStorage(user.id, bookId);
  if (!storage?.coverKey) return new Response("Not found", { status: 404 });

  const url = await presignGet({
    key: storage.coverKey,
    expiresInSeconds: URL_TTL_SECONDS,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      // Let the browser reuse the redirect while the signed URL is still valid.
      "Cache-Control": `private, max-age=${URL_TTL_SECONDS - 60}`,
    },
  });
}

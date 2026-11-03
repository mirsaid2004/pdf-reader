import "server-only";

import { publicEnv } from "@/shared/config";
import { getCurrentUser } from "@/shared/auth";

import { readingReportSchema } from "../model/schemas";
import { saveReadingReport } from "./save-report";

const MAX_BODY_CHARS = 4_096;

const status = (code: number) => new Response(null, { status: code });

/**
 * Route handlers don't get the automatic origin check that server actions do,
 * so reject cross-site requests ourselves. Browsers send Sec-Fetch-Site; fall
 * back to comparing Origin with our own origin for older ones.
 */
function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  return origin === null || origin === publicEnv.appUrl;
}

export async function handleReadingReport(
  request: Request,
  bookId: string,
): Promise<Response> {
  if (!isSameOrigin(request)) return status(403);

  const user = await getCurrentUser();
  if (!user) return status(401);

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return status(413);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return status(400);
  }
  const parsed = readingReportSchema.safeParse(json);
  if (!parsed.success) return status(400);

  const result = await saveReadingReport({
    userId: user.id,
    bookId,
    report: parsed.data,
  });
  return status(result === "saved" ? 204 : 404);
}

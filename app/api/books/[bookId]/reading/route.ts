import { handleReadingReport } from "@/features/track-reading/server";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/books/[bookId]/reading">,
) {
  const { bookId } = await params;
  return handleReadingReport(request, bookId);
}

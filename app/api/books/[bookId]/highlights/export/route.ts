import { handleHighlightsExport } from "@/features/export-highlights/server";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/books/[bookId]/highlights/export">,
) {
  const { bookId } = await params;
  return handleHighlightsExport(bookId);
}

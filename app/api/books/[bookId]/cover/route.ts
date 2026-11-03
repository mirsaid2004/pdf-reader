import { coverRedirectResponse } from "@/entities/book/server";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/books/[bookId]/cover">,
) {
  const { bookId } = await params;
  return coverRedirectResponse(bookId);
}

// Object key layout. Keys are always derived on the server from the
// authenticated user id, never accepted from the client.

export const COVER_CONTENT_TYPES = ["image/webp", "image/jpeg"] as const;
export type CoverContentType = (typeof COVER_CONTENT_TYPES)[number];

const COVER_EXTENSION: Record<CoverContentType, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

const bookPrefix = (userId: string, bookId: string) =>
  `users/${userId}/books/${bookId}`;

export const bookPdfKey = (userId: string, bookId: string) =>
  `${bookPrefix(userId, bookId)}/book.pdf`;

export const bookCoverKey = (
  userId: string,
  bookId: string,
  contentType: CoverContentType,
) => `${bookPrefix(userId, bookId)}/cover.${COVER_EXTENSION[contentType]}`;

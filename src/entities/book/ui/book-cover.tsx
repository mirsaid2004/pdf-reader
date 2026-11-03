import { FadeInImage } from "@/shared/ui/fade-in-image";

type BookCoverProps = {
  bookId: string;
  title: string;
  hasCover: boolean;
  className?: string;
};

export const bookCoverUrl = (bookId: string) => `/api/books/${bookId}/cover`;

export function BookCover({
  bookId,
  title,
  hasCover,
  className,
}: BookCoverProps) {
  const base = `relative aspect-[3/4] overflow-hidden rounded-md bg-foreground/5 ${className ?? ""}`;
  if (!hasCover) {
    return (
      <div
        className={`${base} flex items-center justify-center p-3 text-center`}
      >
        <span className="line-clamp-4 text-sm font-medium text-foreground/60">
          {title}
        </span>
      </div>
    );
  }
  return (
    <div className={base}>
      {/* `unoptimized`: the cover route redirects to a short-lived presigned R2
          URL and needs the user's cookies, which the image optimizer lacks. */}
      <FadeInImage
        src={bookCoverUrl(bookId)}
        alt={`Cover of ${title}`}
        fill
        unoptimized
        sizes="200px"
        className="object-cover"
      />
    </div>
  );
}

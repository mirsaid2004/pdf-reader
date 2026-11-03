import { z } from "zod";

import { bookIdSchema, outlineSchema } from "@/entities/book";
import { publicEnv } from "@/shared/config";
import { COVER_CONTENT_TYPES } from "@/shared/lib/r2/keys";

export const PDF_CONTENT_TYPE = "application/pdf";
export const MAX_COVER_BYTES = 2 * 1024 * 1024;

export const requestUploadSchema = z.object({
  fileSize: z.number().int().positive().max(publicEnv.maxUploadBytes),
  cover: z
    .object({
      contentType: z.enum(COVER_CONTENT_TYPES),
      size: z.number().int().positive().max(MAX_COVER_BYTES),
    })
    .nullable(),
});
export type RequestUploadInput = z.infer<typeof requestUploadSchema>;

export const createBookSchema = z.object({
  bookId: bookIdSchema,
  title: z.string().trim().min(1, "Title is required").max(300),
  author: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .transform((value) => (value ? value : null)),
  pageCount: z.number().int().positive().max(100_000),
  hasTextLayer: z.boolean(),
  outline: outlineSchema.nullable(),
  coverContentType: z.enum(COVER_CONTENT_TYPES).nullable(),
});
export type CreateBookInput = z.input<typeof createBookSchema>;

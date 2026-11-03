import { z } from "zod";

/** Wire format of a reading report (shared by the browser and the route handler). */
export const readingReportSchema = z
  .object({
    page: z.number().int().min(1).max(100_000).optional(),
    session: z
      .object({
        id: z.uuid(),
        startedAt: z.number().int().positive(),
        endedAt: z.number().int().positive(),
        pagesRead: z.number().int().min(0).max(100_000),
      })
      .optional(),
  })
  .refine(
    (report) => report.page !== undefined || report.session !== undefined,
    {
      message: "Empty report",
    },
  );

export type ReadingReportInput = z.infer<typeof readingReportSchema>;

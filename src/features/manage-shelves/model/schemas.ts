import { z } from "zod";

export const shelfNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a shelf name.")
  .max(40, "Shelf names can be at most 40 characters.");

export const shelfIdSchema = z.uuid();

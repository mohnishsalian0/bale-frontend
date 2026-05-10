import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const tallyExportSchema = z
  .object({
    date_from: z
      .string()
      .regex(ISO_DATE_REGEX, "date_from must be in YYYY-MM-DD format"),
    date_to: z
      .string()
      .regex(ISO_DATE_REGEX, "date_to must be in YYYY-MM-DD format"),
  })
  .refine((data) => data.date_from <= data.date_to, {
    message: "date_from must be on or before date_to",
    path: ["date_from"],
  });

export type TallyExportInput = z.infer<typeof tallyExportSchema>;

import { z } from "zod";

const ChoiceOptionsSchema = z
  .array(z.string().trim().min(1, "Option text can't be empty"))
  .min(2, "Add at least 2 options");

const FileConfigSchema = z.object({
  accepted_types: z.array(z.string()).optional(),
  max_size_bytes: z.number().int().positive().optional(),
});

const StepInputSchema = z
  .object({
    title: z.string().min(1, "Step title is required"),

    description: z.string().optional(),

    type: z.enum([
      "short_text",
      "long_text",
      "single_select",
      "multi_select",
      "file_upload",
      "credential",
      "e_sign",
    ]),

    is_required: z.boolean().default(true),

    validation_rules: z
      .object({
        options: z.array(z.string()).optional(),
        accepted_types: z.array(z.string()).optional(),
        max_size_bytes: z.number().optional(),
      })
      .optional(),
  })
  .superRefine((step, ctx) => {
    if (
      step.type === "single_select" ||
      step.type === "multi_select"
    ) {
      const result = ChoiceOptionsSchema.safeParse(
        step.validation_rules?.options ?? []
      );

      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error.issues[0].message,
          path: ["validation_rules", "options"],
        });
      }
    }

    if (
      step.type === "file_upload" &&
      step.validation_rules
    ) {
      const result = FileConfigSchema.safeParse(
        step.validation_rules
      );

      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid file upload configuration",
          path: ["validation_rules"],
        });
      }
    }
  });

export const CreateTemplateSchema = z.object({
  title: z.string().min(1, "Template title is required"),

  description: z.string().optional(),

  steps: z
    .array(StepInputSchema)
    .min(1, "Add at least one step"),
});
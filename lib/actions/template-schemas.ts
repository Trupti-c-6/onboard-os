import { z } from "zod";

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export const CHOICE_TYPES = ["single_select", "multi_select"] as const;
export const RESPONSE_TYPE_LABELS: Record<string, string> = {
  short_text: "Short text",
  long_text: "Long text",
  single_select: "Single choice",
  multi_select: "Multiple choice",
  file_upload: "File upload",
  credential: "Credential",
  e_sign: "E-signature",
};

const ACCEPTED_TYPE_PATTERN = /^(?:\.[a-z0-9][a-z0-9+.-]*|[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+|[a-z0-9!#$&^_.+-]+\/\*)$/i;

export function normalizeAcceptedTypes(value: string[]): string[] {
  return [...new Set(value.map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

export const ChoiceOptionsSchema = z
  .array(z.string().trim().min(1, "Option text can't be empty"))
  .min(2, "Please add at least 2 options")
  .superRefine((options, ctx) => {
    const normalized = options.map((option) => option.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Options must be unique" });
    }
  });

const FileConfigSchema = z.object({
  accepted_types: z.array(z.string()).optional().transform((types) => normalizeAcceptedTypes(types ?? [])),
  max_size_bytes: z.number().finite().int().positive().max(MAX_FILE_SIZE_BYTES).optional(),
}).superRefine((config, ctx) => {
  if (config.accepted_types.some((type) => !ACCEPTED_TYPE_PATTERN.test(type))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Use valid extensions or MIME types for accepted files" });
  }
});

const StepInputSchema = z
  .object({
    title: z.string().min(1, "Step title is required"),

    description: z.string().trim().max(2000, "Step description is too long").optional(),

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
      const result = ChoiceOptionsSchema.safeParse(step.validation_rules?.options ?? []);

      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error.issues[0]?.message ?? "Invalid options",
          path: ["validation_rules", "options"],
        });
      }
    }

    if (step.type === "file_upload") {
      const result = FileConfigSchema.safeParse(step.validation_rules ?? {});

      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error.issues[0]?.message ?? "Invalid file upload configuration",
          path: ["validation_rules"],
        });
      }
    }
  });

export const CreateTemplateSchema = z.object({
  title: z.string().trim().min(1, "Template title is required").max(255, "Template title is too long"),

  description: z.string().trim().max(2000, "Template description is too long").optional(),

  steps: z
    .array(StepInputSchema)
    .min(1, "Add at least one step"),
});

export type TemplateInput = z.infer<typeof CreateTemplateSchema>;

export function sanitizeStepForType<T extends { type: string; validation_rules?: Record<string, unknown> }>(step: T): T {
  if (step.type === "single_select" || step.type === "multi_select") {
    return { ...step, validation_rules: { options: Array.isArray(step.validation_rules?.options) ? step.validation_rules.options : [] } };
  }
  if (step.type === "file_upload") {
    return { ...step, validation_rules: { accepted_types: Array.isArray(step.validation_rules?.accepted_types) ? step.validation_rules.accepted_types : [], ...(step.validation_rules?.max_size_bytes !== undefined ? { max_size_bytes: step.validation_rules.max_size_bytes } : {}) } };
  }
  return { ...step, validation_rules: {} };
}
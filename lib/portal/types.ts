export type PortalStep = {
  id: string;
  step_order: number;
  title: string;
  description: string | null;
  type:
    | "short_text"
    | "long_text"
    | "single_select"
    | "multi_select"
    | "file_upload"
    | "credential"
    | "e_sign";
  is_required: boolean;
  validation_rules: Record<string, unknown> | null;
};

export type PortalSubmission = {
  status: string;
  value_text: string | null;
  value_json: Record<string, unknown> | null;
};

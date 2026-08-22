export type TemplateClassificationInput = {
  organization_id: string | null;
  is_starter: boolean;
};

export function isStarterTemplate(template: TemplateClassificationInput): boolean {
  return template.is_starter === true && template.organization_id === null;
}

export function ownedTemplateCopyFields(category: string, organizationId: string) {
  return {
    organization_id: organizationId,
    category,
    is_starter: false,
  } as const;
}

export function isOwnedCustomTemplate(
  template: TemplateClassificationInput,
  organizationId: string
): boolean {
  return template.is_starter === false && template.organization_id === organizationId;
}
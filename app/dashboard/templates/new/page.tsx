import { TemplateBuilderForm } from "@/components/workflow-builder/TemplateBuilderForm";
export default function NewTemplatePage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">New Onboarding Template</h1>
        <TemplateBuilderForm />
      </div>
    </div>
  );
}

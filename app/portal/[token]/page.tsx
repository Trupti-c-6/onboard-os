import { getPortalData } from "@/lib/portal/get-portal-data";
import { PortalClient } from "@/components/client-portal/PortalClient";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPortalData(token);

  if (!data.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            {data.reason === "expired" ? "This link has expired" : "Link not found"}
          </h1>
          <p className="mt-2 text-slate-500">
            {data.supportEmail
              ? `Please contact ${data.supportEmail} for a new onboarding link.`
              : "Please contact your service provider for a new onboarding link."}
          </p>
        </div>
      </div>
    );
  }

  return <PortalClient token={token} data={data} />;
}

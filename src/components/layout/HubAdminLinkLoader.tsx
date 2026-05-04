import Link from "next/link";
import { BarChart3, ShieldCheck } from "lucide-react";
import { getHubAdminData, type HubShellData } from "@/lib/drafts/hubInitialData";
import type { AppRole } from "@/lib/auth/appRoles";

type HubAdminLinkLoaderProps = {
  user: HubShellData["initialUser"];
  roles?: AppRole[];
};

export default async function HubAdminLinkLoader({
  user,
  roles = [],
}: HubAdminLinkLoaderProps) {
  const { initialCanManageDraftCleanup } = await getHubAdminData(user);
  const canReadOdsTelemetry = roles.includes("ods_telemetria_admin");

  if (!initialCanManageDraftCleanup && !canReadOdsTelemetry) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {initialCanManageDraftCleanup ? (
        <Link
          href="/hub/admin/borradores"
          prefetch={false}
          data-testid="hub-admin-draft-cleanup-link"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
        >
          <ShieldCheck className="h-4 w-4" />
          Admin
        </Link>
      ) : null}
      {canReadOdsTelemetry ? (
        <Link
          href="/hub/admin/ods-telemetria"
          prefetch={false}
          data-testid="hub-admin-ods-telemetry-link"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
        >
          <BarChart3 className="h-4 w-4" />
          ODS telemetry
        </Link>
      ) : null}
    </div>
  );
}

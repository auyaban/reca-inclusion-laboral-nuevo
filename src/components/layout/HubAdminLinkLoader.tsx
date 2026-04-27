import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getHubAdminData, type HubShellData } from "@/lib/drafts/hubInitialData";

type HubAdminLinkLoaderProps = {
  user: HubShellData["initialUser"];
};

export default async function HubAdminLinkLoader({
  user,
}: HubAdminLinkLoaderProps) {
  const { initialCanManageDraftCleanup } = await getHubAdminData(user);

  if (!initialCanManageDraftCleanup) {
    return null;
  }

  return (
    <Link
      href="/hub/admin/borradores"
      prefetch={false}
      data-testid="hub-admin-draft-cleanup-link"
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
    >
      <ShieldCheck className="h-4 w-4" />
      Admin
    </Link>
  );
}

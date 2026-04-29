import HubFormatsHome from "@/components/layout/HubFormatsHome";
import { getHubShellData } from "@/lib/drafts/hubInitialData";

export default async function HubPage() {
  const shellData = await getHubShellData();

  return <HubFormatsHome initialUserId={shellData.initialUserId} />;
}

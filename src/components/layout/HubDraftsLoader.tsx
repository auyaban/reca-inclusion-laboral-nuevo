import HubDraftsControls from "@/components/layout/HubDraftsControls";
import { getHubDraftsData } from "@/lib/drafts/hubInitialData";

type HubDraftsLoaderProps = {
  initialPanelOpen: boolean;
  userId: string | null;
};

export default async function HubDraftsLoader({
  initialPanelOpen,
  userId,
}: HubDraftsLoaderProps) {
  const { initialRemoteDrafts } = await getHubDraftsData(userId);

  return (
    <HubDraftsControls
      initialPanelOpen={initialPanelOpen}
      initialRemoteDrafts={initialRemoteDrafts}
    />
  );
}

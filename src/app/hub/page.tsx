import { Suspense } from "react";
import HubAdminLinkLoader from "@/components/layout/HubAdminLinkLoader";
import HubDraftsLoader from "@/components/layout/HubDraftsLoader";
import HubMenu from "@/components/layout/HubMenu";
import { HubDraftsControlsFallback } from "@/components/layout/HubMenu";
import { getHubShellData } from "@/lib/drafts/hubInitialData";

interface HubPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HubPage({ searchParams }: HubPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shellData = await getHubShellData({
    panel: resolvedSearchParams?.panel,
  });

  return (
    <HubMenu
      initialPanelOpen={shellData.initialPanelOpen}
      initialUserName={shellData.initialUserName}
      initialUserId={shellData.initialUserId}
      adminEntry={
        <Suspense fallback={null}>
          <HubAdminLinkLoader user={shellData.initialUser} />
        </Suspense>
      }
      draftsControls={
        <Suspense
          fallback={
            <HubDraftsControlsFallback
              initialPanelOpen={shellData.initialPanelOpen}
            />
          }
        >
          <HubDraftsLoader
            initialPanelOpen={shellData.initialPanelOpen}
            userId={shellData.initialUserId}
          />
        </Suspense>
      }
    />
  );
}

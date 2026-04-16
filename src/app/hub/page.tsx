import HubMenu from "@/components/layout/HubMenu";
import { getHubInitialData } from "@/lib/drafts/hubInitialData";

interface HubPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HubPage({ searchParams }: HubPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialData = await getHubInitialData({
    panel: resolvedSearchParams?.panel,
  });

  return <HubMenu {...initialData} />;
}

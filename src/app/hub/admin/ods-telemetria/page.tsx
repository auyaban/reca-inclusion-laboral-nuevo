import OdsTelemetryAdminView from "@/components/ods/telemetry/OdsTelemetryAdminView";
import { getOdsTelemetriaAdminContextOrRedirect } from "@/lib/ods/telemetry/access";
import { getOdsTelemetryAdminData } from "@/lib/ods/telemetry/admin";
import { parseOdsTelemetryAdminParams } from "@/lib/ods/telemetry/adminSchemas";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toURLSearchParams(
  params: Record<string, string | string[] | undefined> | undefined
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === "string") {
      searchParams.append(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          searchParams.append(key, item);
        }
      }
    }
  }

  return searchParams;
}

export default async function OdsTelemetryAdminPage({ searchParams }: PageProps) {
  await getOdsTelemetriaAdminContextOrRedirect();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const params = parseOdsTelemetryAdminParams(
    toURLSearchParams(resolvedSearchParams)
  );
  const result = await getOdsTelemetryAdminData({ params });

  return <OdsTelemetryAdminView result={result} params={params} />;
}

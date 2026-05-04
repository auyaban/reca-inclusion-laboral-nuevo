import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";

const ODS_TELEMETRIA_ADMIN_ROLE = "ods_telemetria_admin";

export async function getOdsTelemetriaAdminContextOrRedirect() {
  const context = await getCurrentUserContext();

  if (!context.ok || !context.roles.includes(ODS_TELEMETRIA_ADMIN_ROLE)) {
    redirect("/hub");
  }

  return context;
}

import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";

const ODS_ROLE = "ods_operador";

export async function hasOdsOperadorRole() {
  const context = await getCurrentUserContext();
  return context.ok && context.roles.includes(ODS_ROLE);
}

export async function getOdsOperadorContextOrRedirect() {
  const context = await getCurrentUserContext();

  if (!context.ok || !context.roles.includes(ODS_ROLE)) {
    redirect("/hub");
  }

  return context;
}

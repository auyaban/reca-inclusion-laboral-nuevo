import OdsWizardPage from "@/components/ods/OdsWizardPage";
import { getOdsOperadorContextOrRedirect } from "@/lib/ods/access";

export default async function OdsPage() {
  await getOdsOperadorContextOrRedirect();

  return <OdsWizardPage />;
}

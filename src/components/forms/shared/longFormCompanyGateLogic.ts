import { getNavigableInvisibleSessionId } from "@/lib/drafts";
import type { Empresa } from "@/lib/store/empresaStore";

export const DEFAULT_LONG_FORM_COMPANY_GATE_DESCRIPTION =
  "Selecciona primero la empresa para abrir el documento largo. Este gate evita montar el formulario completo antes de tiempo y acelera la busqueda inicial.";

type ShouldRenderLongFormCompanyGateOptions = {
  empresa: Empresa | null;
  draftId: string | null;
  sessionId: string | null;
};

export function shouldRenderLongFormCompanyGate({
  empresa,
  draftId,
  sessionId,
}: ShouldRenderLongFormCompanyGateOptions) {
  const navigableSessionId = getNavigableInvisibleSessionId(sessionId);
  return !empresa && !draftId && !navigableSessionId;
}

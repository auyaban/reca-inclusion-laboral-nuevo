---
name: Roadmap de implementacion
description: Estado tecnico resumido y siguiente orden de trabajo
type: roadmap
updated: 2026-04-20
---

## Regla operativa

- Este archivo sigue siendo el roadmap tecnico y de dependencias del repo.
- El backlog vivo, QA abierto y decisiones activas viven en Notion:
  - `20 - Pendientes priorizados`
  - `30 - QA y validacion`
  - `40 - Iniciativas y decisiones`
- Cuando cambie el estado real de una fase, sincronizar `roadmap.md`, `memory/MEMORY.md` y la pagina canonica de Notion correspondiente.

## Estado actual breve

- `Finalizacion / hardening F1` ya quedo aplicada localmente.
- `Finalizacion / limpieza estructural F2` ya quedo aplicada localmente.
- `Finalizacion / prewarm hardening F3` ya quedo aplicada localmente.
- `Finalizacion / resiliencia operativa F2` ya quedo aplicada localmente.
- `Finalizacion / consolidacion estructural F3` ya quedo aplicada localmente.
- `Drafts invisibles` y `drafts durante finalizacion` ya quedaron endurecidos de forma shared.
- `Induccion Operativa` e `Induccion Organizacional` ya corren `textReview` efectivo al final con el mismo patron de los formatos homologados.
- `Condiciones de la Vacante` ya dejo atras la suscripcion global del formulario y `Evaluacion` ya tiene un pase conservador de watchers agrupados para reducir trabajo reactivo innecesario.
- `Integridad de guardado y salida final F1` ya quedo aplicada localmente: flush local shared por blur en `LongFormShell`, feedback de guardado priorizando persistencia local del dispositivo, optionalidad correcta de `section_6` / observaciones cortas en `Evaluacion` y ocultamiento shared de la hoja provisional vacia del `draft_prewarm`.
- `Follow-up local de autosave + Evaluacion` ya quedo aplicado sobre esa base: seed inicial de copia local para todos los long forms apenas el formulario queda listo tras escoger empresa, `flushAutosave()` viendo cambios pendientes de forma sincronica y observaciones cortas de `Evaluacion` (`2.1` a `3`) sin asterisco de requerido en UI.
- `Consistencia operativa shared F2` ya quedo aplicada localmente: lookup por cedula homogeneo en `Seleccion`, `Contratacion` e inducciones (nombre visible, sin cedula duplicada fuera del input y sin alerta redundante dentro del lookup), gate liviano antes de escoger empresa para los 8 long forms, delete de borradores en `/hub` con reactividad inmediata y comportamiento compartido de apertura de recursos blindado con regresion para limpiar mensajes viejos.
- `Ergonomia y productividad F3` ya quedo aplicada localmente: `RepeatedPeopleSection` deja CTA arriba y abajo para `Seleccion` y `Contratacion`, `AsistentesSection` adopta el patron de lista simple con CTA solo al final y `Condiciones Vacante` queda cubierto como referencia correcta del patron `solo abajo`.
- `Follow-up local de autosave shared` ya quedo aplicado sobre ese lote: `Seleccion`, `Evaluacion`, `Contratacion`, `Sensibilizacion` y `Condiciones Vacante` dejaron de depender de `isBootstrappingForm` para sembrar la copia local inicial y suscribirse al autosave por cambios. Este corte sigue pendiente de preview y QA manual enfocado en riesgo de perdida de datos.
- `Preview integrado de autosave + consistencia shared` ya quedo creado: [preview](https://reca-inclusion-laboral-nuevo-hb9xvv292-auyabans-projects.vercel.app) · [inspector](https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/7KyVmyCN1WvcQjQqtSSDtg3RwJfJ). El siguiente paso real es QA manual focal de autosave/integridad antes de retomar otros hallazgos.
- `Delete del hub + apertura guiada acta/PDF` ya quedo aplicado localmente: delete optimista con rollback real en `/hub`, aviso inline cuando el rollback ocurre, timings estructurados en el route DELETE y CTA combinado nuevo que abre primero el acta y guia al usuario al PDF sin depender de dos popups.
- `Evaluacion` sigue en preview vigente y requiere QA manual agrupado.
- El resto de formularios largos ya corre sobre la base compartida actual; `Seguimientos` sigue siendo el frente funcional grande pendiente.

## Siguiente orden recomendado

1. Crear un preview nuevo con el fix de delete optimista del hub y el flujo guiado de `Abrir acta y luego PDF` sobre la base actual.
2. QA manual focal de `/hub` y del CTA combinado, confirmando desaparicion inmediata del draft, rollback correcto si falla el backend y apertura confiable del acta con guia clara al PDF.
3. Revalidar sobre ese mismo preview el smoke agrupado de autosave, gate liviano, lookup por cedula, repetidores shared y salida final sin hojas/paginas extra.
4. Cerrar hallazgos de QA y decidir promocion del siguiente preview.

## Fases completadas

- `F0` a `F4.3`: infraestructura, auth, hub, formulario base y hardening inicial de drafts/finalizacion.
- `F5.1` a `F5.6`: sensibilizacion, seleccion, contratacion, inducciones y evaluacion ya migradas al stack web actual.
- `F6`: integracion con Google Drive/PDF ya resuelta para los formularios que la usan.
- `F7`: borradores/autosave ya resueltos en la base shared.

## Estado por formulario

| Formulario | Slug | Estado real |
|---|---|---|
| Presentacion/Reactivacion | `presentacion` | Produccion; referencia canonica |
| Sensibilizacion | `sensibilizacion` | Produccion; baseline reusable |
| Condiciones de la Vacante | `condiciones-vacante` | Produccion |
| Seleccion Incluyente | `seleccion` | Produccion base; follow-ups locales pendientes |
| Contratacion Incluyente | `contratacion` | Produccion base; follow-ups locales pendientes |
| Induccion Organizacional | `induccion-organizacional` | Produccion |
| Induccion Operativa | `induccion-operativa` | Produccion |
| Evaluacion de Accesibilidad | `evaluacion` | Preview vigente; QA manual pendiente |
| Seguimientos | `seguimientos` | Pendiente |

## Frentes shared activos

### Finalizacion

- F1 ya cerro:
  - duplicate email handling en `finalizationUser`
  - `finalization_claim_exhausted` como `409` retryable
  - marcado safe de success tracking
  - timeout/abort mejor diagnosticado en `textReview`
- F2 ya cerro:
  - registro central en `src/lib/finalization/formRegistry.ts`
  - particion de `textReview.ts`
  - helpers shared de texto en `valueUtils.ts`
  - deduplicacion de payloads entre `seleccion` y `contratacion`
  - limpieza de nits bajos (`rangeHasValues`, `normalizeAsistentesNames`, `maybeSweep`, metadata defensiva)
- F3 ya cerro localmente:
  - estados terminales reales de `google_prewarm` (`failed`, `finalized`)
  - lease server-side por draft con RPC de claim/release
  - cleanup remoto best-effort al borrar drafts
  - rollout por `NEXT_PUBLIC_RECA_PREWARM_ENABLED` + `NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS`
  - validacion fuerte del bundle antes de reuse
  - rate limit del endpoint de prewarm con fallback a memoria
  - outcomes de finalizacion mas finos para observabilidad
  - pipeline shared de prewarm/finalizacion extraido de las 8 routes
  - rollout config separado de la registry de dominio
  - contrato comun para `FinalizationProfiler` y `TimingTracker`
  - tipos explicitos en la superficie prewarm/finalizacion sin `as never`
  - documentacion de la divergencia `legacy_company` vs `draft_prewarm`
  - `textReview` efectivo homologado en `induccion-operativa` e `induccion-organizacional`
  - mejora de fluidez de frontend en `Condiciones Vacante` y pase conservador en `Evaluacion`
  - gate liviano compartido para los 8 long forms
  - lookup por cédula con menos ruido visual en `Seleccion`, `Contratacion` e inducciones
  - delete reactivo de drafts en `/hub` y limpieza de mensajes viejos en apertura de recursos
  - delete optimista con rollback real en `/hub`
  - CTA combinado guiado para abrir acta primero y PDF manualmente

### Drafts

- La URL nominal ya no debe exponer pseudo-session ids `draft:<uuid>`.
- Durante finalizacion ya no deben correr checkpoints automaticos.
- El cleanup shared ya usa `draftId` vivo para evitar huerfanos remotos.

### Observabilidad

- El ruido operacional de finalizacion ya paso a breadcrumbs-only.
- El backlog reciente de Sentry del proyecto ya quedo triageado y cerrado.

## Pendiente real

- QA manual del preview vigente.
- Resolver cualquier hallazgo nuevo antes de promover el siguiente corte.
- Abrir el frente de `Seguimientos` cuando el lote actual quede estabilizado.

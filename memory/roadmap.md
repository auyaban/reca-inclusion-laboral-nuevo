---
name: Roadmap de implementacion
description: Estado tecnico resumido y siguiente orden de trabajo
type: roadmap
updated: 2026-04-19
---

## Regla operativa

- Este archivo sigue siendo el roadmap tecnico y de dependencias del repo.
- El backlog vivo, QA abierto y decisiones activas viven en Notion:
  - `20 — Pendientes priorizados`
  - `30 — QA y validación`
  - `40 — Iniciativas y decisiones`
- Cuando cambie el estado real de una fase, sincronizar `roadmap.md`, `memory/MEMORY.md` y la página canónica de Notion correspondiente.

## Estado actual breve

- `Finalizacion / hardening F1` ya quedó aplicada localmente.
- `Finalizacion / limpieza estructural F2` ya quedó aplicada localmente.
- `Drafts invisibles` y `drafts durante finalizacion` ya quedaron endurecidos de forma shared.
- `Evaluacion` sigue en preview vigente y requiere QA manual agrupado.
- El resto de formularios largos ya corre sobre la base compartida actual; `Seguimientos` sigue siendo el frente funcional grande pendiente.

## Siguiente orden recomendado

1. QA manual del preview vigente para `Presentacion`, `Evaluacion` y una inducción.
2. Confirmar desde `/hub` que el flujo invisible de drafts sigue estable.
3. Cerrar hallazgos de QA y decidir promoción de los fixes shared actuales.
4. Después de ese cierre, retomar el siguiente formulario realmente pendiente (`Seguimientos`) o deuda funcional nueva.

## Fases completadas

- `F0` a `F4.3`: infraestructura, auth, hub, formulario base y hardening inicial de drafts/finalizacion.
- `F5.1` a `F5.6`: sensibilizacion, seleccion, contratacion, inducciones y evaluacion ya migradas al stack web actual.
- `F6`: integración con Google Drive/PDF ya resuelta para los formularios que la usan.
- `F7`: borradores/autosave ya resueltos en la base shared.

## Estado por formulario

| Formulario | Slug | Estado real |
|---|---|---|
| Presentación/Reactivación | `presentacion` | Producción; referencia canónica |
| Sensibilización | `sensibilizacion` | Producción; baseline reusable |
| Condiciones de la Vacante | `condiciones-vacante` | Producción |
| Selección Incluyente | `seleccion` | Producción base; follow-ups locales pendientes |
| Contratación Incluyente | `contratacion` | Producción base; follow-ups locales pendientes |
| Inducción Organizacional | `induccion-organizacional` | Producción |
| Inducción Operativa | `induccion-operativa` | Producción |
| Evaluación de Accesibilidad | `evaluacion` | Preview vigente; QA manual pendiente |
| Seguimientos | `seguimientos` | Pendiente |

## Frentes shared activos

### Finalizacion

- F1 ya cerró:
  - duplicate email handling en `finalizationUser`
  - `finalization_claim_exhausted` como `409` retryable
  - marcado safe de success tracking
  - timeout/abort mejor diagnosticado en `textReview`
- F2 ya cerró:
  - registro central en `src/lib/finalization/formRegistry.ts`
  - partición de `textReview.ts`
  - helpers shared de texto en `valueUtils.ts`
  - deduplicación de payloads entre `seleccion` y `contratacion`
  - limpieza de nits bajos (`rangeHasValues`, `normalizeAsistentesNames`, `maybeSweep`, metadata defensiva)

### Drafts

- La URL nominal ya no debe exponer pseudo-session ids `draft:<uuid>`.
- Durante finalización ya no deben correr checkpoints automáticos.
- El cleanup shared ya usa `draftId` vivo para evitar huérfanos remotos.

### Observabilidad

- El ruido operacional de finalización ya pasó a breadcrumbs-only.
- El backlog reciente de Sentry del proyecto ya quedó triageado y cerrado.

## Pendiente real

- QA manual del preview vigente.
- Resolver cualquier hallazgo nuevo antes de promover el siguiente corte.
- Abrir el frente de `Seguimientos` cuando el lote actual quede estabilizado.

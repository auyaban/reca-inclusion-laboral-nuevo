---
name: Roadmap de implementacion
description: Estado tecnico resumido y siguiente orden de trabajo
type: roadmap
updated: 2026-04-22
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
- `Finalizacion / cierre operativo F3` ya quedo aplicada localmente: rollout `opt-in` real por `env`, registry tipada por formulario, constantes estructurales shared para `Presentacion` y `Sensibilizacion`, firma deterministica de estructura, boundary shared para los 8 `*FormEditor`, helper de gate renombrado a logica pura y tests directos de naming.
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
- `Preview F3 de prewarm hardening` ya quedo creado: [preview](https://reca-inclusion-laboral-nuevo-punvytdw5-auyabans-projects.vercel.app) · [inspector](https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/FAt6ffSYDWW5WeUGeFknLg9trh9f). El siguiente paso real es QA manual focal de rollout por `env`, reuse/rebuild, variantes de `Presentacion/Reactivacion`, naming y decision de rollout global.
- `Evaluacion` sigue en preview vigente y requiere QA manual agrupado.
- `Seguimientos` ya quedo implementado localmente hasta Fase 7 sobre runtime dedicado: bootstrap por cedula, shell homogeneo con drafts/locks, ficha inicial editable, seguimientos 1..N con override, diff visual contra Google Sheets, consolidado formula-first, refresh/reparacion del `PONDERADO FINAL` y export PDF selectivo. Sobre esa base ya quedaron aplicados tres follow-ups locales: `Ficha Inicial Robusta + correccion historica sin autoavance` (`cargo_vinculado` y `discapacidad` dejan de bloquear el caso cuando llegan vacios desde RECA y las correcciones historicas guardadas con `Override` ya no autoavanzan de etapa), `Politica de PDF persistido` (selector construido solo desde Google persistido, bloqueo de export con dirty changes y validacion backend mas estricta de variantes) y `Cleanup conservador del bundle` (los espejos `direct write` de `Ficha inicial` / `PONDERADO FINAL` pasan a escribirse como datos reales, los bundles existentes se limpian de formulas espejo heredadas y `healthy/stale/broken` deja de perseguir esas formulas; las graficas del consolidado siguen fuera de alcance por ahora). Ademas ya quedaron aplicadas dos capas de hardening adicionales: `Trust Boundary + guardado seguro` (ownership real por `owner_user_id` en appProperties, lease server-side de bootstrap por cedula, override grant firmado y validado en servidor, semantica `written_needs_reload` cuando Google guarda pero la rehidratacion falla, validaciones server-side mas estrictas y cobertura automatica actualizada) y `Resiliencia operativa / deuda estructural F2` (hidratacion `eager/passive` para reducir writes y cuota en saves, lecturas paralelas de followups, parseo robusto de drafts con workflow reconstruido, preservacion en sesion de overrides vigentes, helper shared de path access, visibilidad `keepOnlySheetsVisible`, naming de carpetas mas predecible, logging util de temporales PDF y mensaje explicito de que el check actual del consolidado todavia no valida formulas canonicas). Encima de eso ya quedaron aplicados `Fase 3.1` de QA residual (backend bloqueando `followup_*` con ficha inicial incompleta y bootstrap con errores tipados de storage), el pase de `pulido UX/UI`, `Fase 4` del fix de proteccion/layout, `Fase 5` de ergonomia operativa (el followup ya repone los atajos masivos de legacy para `Autoevaluacion`, `Evaluacion empresa` y `Evaluacion empresarial` con `Todo excelente/bien/necesita mejorar/mal/no aplica`), la `Fase 1` de continuidad del flujo (`Marcar visita fallida` ahora completa tambien observaciones operativas con `No aplica` dejando intacto `Cierre`, `fecha_fin_contrato` sigue opcional y los submits invalidos de `Ficha inicial` / `Seguimiento` hacen focus al primer error), la `Fase 2` de productividad/consistencia operativa (`Cierre` ya expone dictado en `situacion_encontrada` y `estrategias_ajustes`, `Colapsar` desaparece de `Seguimientos` y la UI ahora deja mas clara la diferencia entre `Guardar borrador`, `Guardar ... en Google Sheets` y `Generar PDF`) y el follow-up estructural actual: fechas otra vez en selector nativo `type=\"date\"` con estado interno ISO, salidas a Google Sheets/PDF en `DD/MM/AAAA`, y `Asistentes` migrado al patron dinamico tipo `Contratacion` con fila `0` de `Profesional RECA`, segunda fila vacia por defecto, CTA `Agregar asistente`, capacidad hasta `10` y expansion del bloque de Sheets a `D47:D56 / N47:N56`. Ademas, `Seguimientos` ya queda habilitado en el hub y deja de mostrarse como `Próximamente`. Este corte quedo validado localmente con unit tests, Playwright, build, lint y spellcheck. Queda pendiente preview + QA manual end-to-end.

- `Seguimientos` ya cerro ademas el fix de override multi-etapa: `override_required` ya devuelve `missingOverrideStageIds`, el dialogo de `Desbloquear etapa` mantiene spinner/cierre solo al resolver y la route de override acepta varias etapas explicitas en una sola confirmacion para poblar varios grants firmados.
- `Seguimientos` ya cerro tambien el follow-up de expiracion de override: el TTL del grant sube a `20 min`, las rutas distinguen `override_required` vs `override_expired`, el cliente conserva las etapas faltantes/vencidas como `pendingOverrideRequest` y el mismo dialogo de override ahora se reutiliza para renovar desbloqueos de forma explicita.
- `Seguimientos` ya cerro ademas el follow-up estructural de `Asistentes` y fechas: asistentes dinamicos hasta `10` con `Profesional RECA` en la fila `0`, segunda fila visible vacia por defecto, add/remove real y writes limpios a `D47:D56 / N47:N56`, mientras la fecha vuelve al picker nativo con ISO interno y formato `DD/MM/AAAA` solo en salidas humanas.
- `Seguimientos` ya cerro tambien el fix lineal `A+B+C+D` para fechas legacy y trazabilidad de guardado: el parser acepta `D/M/AAAA`, los prefills/hydration de RECA y Sheets se normalizan a ISO antes de llegar al form state, los valores no interpretables se sanean a vacio antes del picker nativo y las routes de guardado devuelven `fieldPath` + `issues` para ubicar el campo exacto cuando una validacion falla.
- `Seguimientos` ya cerro ademas el hardening post-QA real: grants persistidos en `sessionStorage` por `caseId`, aviso persistente de `visita fallida`, `override_unavailable` tipado con `503`, bloqueo `409 case_conflict` con CTA de recarga explicita, `worker-src 'self' blob:` en CSP y observabilidad estructurada de overrides/conflictos. Este corte ya paso validacion local completa y queda pendiente preview + QA manual focal.
- `Preview post-QA de Seguimientos` ya quedo creado: [preview](https://reca-inclusion-laboral-nuevo-2nupnjft9-auyabans-projects.vercel.app) · [inspector](https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/GUgyCR3HQFHxDzk37QR9V1qk8EE4). El siguiente paso real es QA manual focal de refresh, renovacion explicita, conflicto entre pestañas y consola limpia de workers.
- `Seguimientos` ya cerro tambien el fix puntual del token de override: el parser ahora separa `expiresAt` y firma usando el ultimo `.` para no romper timestamps ISO con milisegundos, sin cambiar el wire format del grant. Ademas, los logs ya distinguen `grant_missing`, `grant_parse_failed` y `grant_signature_invalid`, y el modulo real de override queda cubierto con tests unitarios directos.
- `Preview fix token override` ya quedo creado: [preview](https://reca-inclusion-laboral-nuevo-82wd0hpmv-auyabans-projects.vercel.app) · [inspector](https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/6HgTueCAanFC5n26pbZqehjXMT5c). El siguiente paso real es QA manual focal de correcciones historicas y expiracion real del grant.
- `Seguimientos` ya cerro ademas el follow-up del `409` propio y la higiene de overrides: `expectedCaseUpdatedAt` sale del draft vivo en vez de `hydration`, los grants usados se limpian tras saves exitosos tambien en `sessionStorage`, `Marcar visita fallida` deja el followup `dirty` desde el mismo preset y el shell ya expone `Bloquear etapa` como accion local simetrica al desbloqueo.
- `Seguimientos` ya cerro ademas el follow-up de dirty fantasma y decision explicita al bloquear: la autosiembra de `Profesional RECA` en followups vacios ya no marca `Seguimiento 2/3` como `dirty` hasta que el usuario modifique manualmente la fila `0`, el bloqueo del PDF deja de activarse por solo abrir esos seguimientos y `Bloquear etapa` ahora pide elegir entre conservar o descartar cambios locales antes de volver a proteger la etapa.
- `Preview follow-up dirty fantasma + bloquear etapa` ya quedo creado: [preview](https://reca-inclusion-laboral-nuevo-ia1p2eqfv-auyabans-projects.vercel.app) · [inspector](https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/8jvkdyKYv9iMSAjBXJkf9NnKqDFX). El siguiente paso real es QA manual focal de `Seguimiento 2/3` vacios, PDF final habilitado sin cambios reales y ambas ramas del modal de `Bloquear etapa`.
- `Seguimientos` ya cerro ademas el paquete `Fase 1 + Fase 2` de navegacion/edicion por hoja: los saves de `Ficha inicial` y `Seguimiento X` ya no autoavanzan, la hoja guardada se mantiene activa con CTA explicita a la siguiente etapa visible y a `Resultado final`, y `Desbloquear etapa` / `Bloquear etapa` ahora checkpointan el borrador local para que el estado de sesion sea coherente al recargar. Tambien se restauro el desbloqueo al rehidratar desde draft local y la regresion quedo cubierta localmente con unit tests, Playwright, build, lint y spellcheck. No se genero preview en este corte a proposito; el siguiente frente recomendado es `Fase 3 + Fase 4`.
- `Seguimientos` ya cerro ademas el paquete `Fase 3 + Fase 4` de export PDF: `Resultado final` ahora renderiza siempre todas las variantes esperables segun el workflow visible (`3` o `6` seguimientos), cada variante expone `enabled/disabledReason`, la UI deja de ocultarlas dentro de un select y el backend de export ya rechaza tambien las variantes visibles pero bloqueadas. En paralelo, `visita fallida` persistida ahora cuenta como exportable para `Ficha inicial + Seguimiento X`, mientras que las variantes `+ Consolidado` siguen requiriendo `summary.exportReady`. Este corte ya paso validacion local completa con unit tests, Playwright, build, lint y spellcheck.
- `Preview Fase 3 + Fase 4 de Seguimientos` ya quedo creado: [preview](https://reca-inclusion-laboral-nuevo-crn42nc2c-auyabans-projects.vercel.app) · [inspector](https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/8YtsqmgactXYwaHRVgAk8aBQg4sb). El siguiente paso real es QA manual focal de variantes siempre visibles en `Resultado final`, `visita fallida` exportable, razones de bloqueo por opcion y bloqueo global por `dirtyStageIds`.
- `Seguimientos` ya cerro ademas el follow-up de feedback visible post-save: el panel inline superior de confirmacion se reemplaza por un toast local fijo en viewport que aparece al guardar `Ficha inicial` o cualquier `Seguimiento X`, mantiene el banner superior existente y ofrece CTA explicita a `Resultado final` y al siguiente seguimiento visible sin reintroducir autoavance. El toast se autocierra, puede cerrarse manualmente y no aparece en errores ni en `written_needs_reload`. Este corte ya paso validacion local completa con unit tests, Playwright, build, lint y spellcheck y no tiene preview nuevo por ahora.

## Siguiente orden recomendado

1. QA manual focal del preview F3 nuevo, confirmando rollout por `env`, variante correcta de `Presentacion/Reactivacion`, estructura correcta en `Sensibilizacion` y al menos un formulario con repetidores.
2. Sobre ese mismo preview, cerrar un smoke corto de los 8 long forms y de `/hub` para confirmar que el boundary shared de editores y el helper de gate no introdujeron regresiones laterales.
3. Si ese QA pasa, decidir si el siguiente cambio en prod es solo habilitar `NEXT_PUBLIC_RECA_PREWARM_ENABLED=true` y mantener o expandir `NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS`.
4. Despues de ese QA shared, crear preview de `Seguimientos` y validar bootstrap, ownership/reclaim, override server-side, recovery `written_needs_reload`, consolidado y PDF con casos `compensar` y `no_compensar`.

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
| Seguimientos | `seguimientos` | Implementado local F1-F7 + follow-ups de ficha inicial/override, politica PDF, cleanup conservador del bundle, hardening de trust boundary/guardado, resiliencia operativa F2, continuidad del flujo F1, productividad/consistencia operativa F2, fix de proteccion/layout F4, atajos masivos de evaluacion F5, selector nativo de fecha con ISO interno y asistentes dinamicos hasta 10, fases `1 + 2` y `3 + 4` cerradas (navegacion por hoja, checkpoint de bloqueo, variantes PDF siempre visibles y `visita fallida` exportable), habilitado en `/hub`, cobertura automatica (routes + Playwright) y preview vigente; QA manual focal pendiente |

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
  - rollout `opt-in` real por `env` ausente = apagado
  - validacion fuerte del bundle antes de reuse
  - rate limit del endpoint de prewarm con fallback a memoria
  - outcomes de finalizacion mas finos para observabilidad
  - pipeline shared de prewarm/finalizacion extraido de las 8 routes
  - rollout config separado de la registry de dominio
  - contrato comun para `FinalizationProfiler` y `TimingTracker`
  - tipos explicitos en la superficie prewarm/finalizacion sin `as never`
  - registry tipada por formulario, firma estructural deterministica y constantes shared para `Presentacion`/`Sensibilizacion`
  - documentacion de la divergencia `legacy_company` vs `draft_prewarm`
  - `textReview` efectivo homologado en `induccion-operativa` e `induccion-organizacional`
  - mejora de fluidez de frontend en `Condiciones Vacante` y pase conservador en `Evaluacion`
  - gate liviano compartido para los 8 long forms
  - lookup por cédula con menos ruido visual en `Seleccion`, `Contratacion` e inducciones
  - delete reactivo de drafts en `/hub` y limpieza de mensajes viejos en apertura de recursos
  - delete optimista con rollback real en `/hub`
  - CTA combinado guiado para abrir acta primero y PDF manualmente
  - boundary shared para los 8 `*FormEditor`, helper de gate como logica pura, tests directos de naming y eliminacion de `serverClient.ts` muerto

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
- Crear preview y ejecutar QA manual de `Seguimientos` con foco en bootstrap por cedula, correccion historica con override, refresh del consolidado y las 3 variantes de PDF.

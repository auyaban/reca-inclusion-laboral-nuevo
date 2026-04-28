---
name: Roadmap de implementacion
description: Frentes activos, decisiones abiertas y siguiente orden del repo
type: roadmap
updated: 2026-04-28
---

## Regla operativa

- Este archivo solo guarda frentes abiertos, decisiones activas y siguiente orden.
- El backlog vivo, QA abierta y decisiones amplias viven en Notion (`20`, `30`, `40`).
- Cuando cambie un frente activo, sincronizar `roadmap.md`, `memory/MEMORY.md` y la pagina canonica de Notion correspondiente.
- No registrar aqui changelog de PRs, previews viejos ni QA cerrada.

## Frentes activos

### Visita fallida

- Ya quedaron implementados localmente tres lotes:
  - `evaluacion`, `induccion-operativa` e `induccion-organizacional` con presets reales de `No aplica`, narrativas obligatorias en modo fallido y persistencia inmediata.
  - `seleccion`, `contratacion` y `condiciones-vacante` con CTA visible, persistencia inmediata, optionalidad estructural en modo fallido y presets locales sin crear placeholders.
- Los ajustes directos de QA local ya quedaron aplicados para `evaluacion` (`No` en campos `No/Si/Parcial`), `seleccion` (dropdowns con `No aplica`) y filas repetibles nuevas/activadas en `seleccion` y `contratacion`.
- Por decision de producto, `presentacion` y `sensibilizacion` ya no exponen el CTA visible de `visita fallida`; conservan compatibilidad tecnica para drafts legacy con `failed_visit_applied_at`.
- `condiciones-vacante` queda congelado hasta revision con profesional RECA; no hacer mas ajustes de producto sobre ese formulario sin esa validacion.
- `seguimientos` conserva su logica propia; `interprete-lsc` sigue fuera del rollout shared mientras no se decida su variante.
- El siguiente paso operativo ya no es desarrollo base sino QA manual corta del lote completo y luego decidir si se promueve o si requiere ajustes antes de tocar `interprete-lsc`.

### Borradores

- La eliminacion del hub se mantiene optimista en UI: el borrador desaparece inmediatamente de la lista.
- El DELETE remoto ahora prioriza soft-delete (`deleted_at`) antes del cleanup de Google Drive; si Drive falla o queda pendiente, se conserva metadata de cleanup para trazabilidad.
- Existe una API interna protegida por `usuario_login` y una UI minima para `aaron_vercel` (`/hub/admin/borradores`) para listar drafts soft-deleted con cleanup `pending`/`failed`, reintentar manualmente el trash de Drive con batch seguro y purgar manualmente filas soft-deleted resueltas (`trashed`/`skipped`) despues de 30 dias.
- No se abre queue ni cron por ahora; se reevalua solo si aparecen fallos, latencia recurrente o volumen que no se pueda manejar con reintento/purga manual protegida.

### Shared finalization y prewarm

- La confirmacion shared de finalizacion ya tolera fallos transitorios del polling de `finalization-status` y puede recuperar exito/PDF si la publicacion ya quedo persistida; el status tambien completa `pdfLink` desde `external_artifacts` cuando el `response_payload` historico quedo incompleto.
- El frente de prewarm solo sigue activo para QA shared y decisiones de rollout; no para discovery nuevo.
- Si se retoma rollout de `interprete-lsc`, se hace solo via `NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS`.

### Proyecto: Prewarm y finalizacion segura

Objetivo: reducir tiempos de finalizacion y carga operacional de Google sin sacrificar seguridad contra perdida de informacion ni duplicacion de actas.

Constantes del proyecto:
- La frontera durable sigue siendo el insert exitoso en la tabla final del formulario.
- El prewarm prepara estructura, no publica informacion final ni reemplaza el draft.
- Todo spreadsheet prewarm debe estar ligado a `draftId`, `userId`, `formSlug` e `identity_key`.
- Nunca marcar `succeeded` antes de insert durable y seal critico del prewarm.
- Nunca mandar a trash un spreadsheet sin revisar lease activo y referencias de finalizacion `processing`/`succeeded`.
- Las mejoras de performance deben medirse contra baseline p50/p95 antes y despues.

#### Fase 0 - Baseline y tablero de medicion

Estado: completada localmente el 2026-04-27; queda como herramienta recurrente antes/despues de cada fase.

Alcance:
- Medir p50/p95 de `total_duration_ms` por formulario y por `prewarm_status`.
- Agregar breakdown por `profiling_steps.label`.
- Separar casos `prewarm_reused=true` y `prewarm_reused=false`.
- Identificar top 3 etapas lentas reales antes de optimizar.
- Comando implementado: `npm run finalization:baseline -- --days 30 --limit 100`.

Criterio de salida:
- Query o script reproducible de baseline.
- Tabla de tiempos por formulario y etapa.
- Decision documentada de que etapa se ataca primero.

Baseline inicial:
- Ventana: ultimos 30 dias, 100 finalizaciones `succeeded`, 84 con timing y profiling.
- p95 por formulario en la muestra: `condiciones-vacante` 47.98s, `induccion-organizacional` 45.55s, `presentacion` 39.40s, `seleccion` 38.81s.
- Etapas mas lentas por p95: `text_review.*` domina la muestra; Google copy/prewarm sigue como segundo bloque relevante (`spreadsheet.copy_master`, `prewarm.spreadsheet.copy_bundle`, create provisional file).
- Decision: ejecutar Fase 1 por ser segura y de bajo acoplamiento, pero no asumir que `renameDriveFile` es el principal cuello de botella; mantener `text_review` como candidato de performance si se busca una reduccion mayor del tiempo total.

QA:
- Corrida real ejecutada contra datos recientes con service role local, sin imprimir payloads ni identificadores de usuario.
- Confirmar que no se exponen datos sensibles en logs o reportes.

#### Fase 1 - Ganancias seguras del path critico

Estado: completada localmente el 2026-04-27.

Alcance:
- Separar seal critico de rename cosmetico.
- Mantener orden seguro: insert durable -> mark prewarm finalized -> mark request succeeded -> rename async/best-effort.
- Eliminar repersist doble de `lastRunTiming`.
- Asegurar que fallos de rename no bloqueen la respuesta final ni rompan recuperacion.
- Implementacion: `renameDriveFile` queda programado con `after` de Next y ya no usa `markStage` ni `runGoogleStep("drive.rename_final_file")`; los repersist `repersist_reused_timing` y `repersist_ready_timing` fueron eliminados.
- Post-QA: si `after()` no esta disponible, el fallback queda visible con `console.warn` y usa macrotask best-effort; tambien se elimino el hook muerto `onRenameFailure`.

Criterio de salida:
- El usuario no espera por `renameDriveFile`.
- `succeeded` no se marca antes de `prewarm finalized`.
- La telemetria sigue guardando tiempo suficiente para comparar baseline.
- Verificacion local: tests compartidos de finalization/prewarm, lint y baseline ejecutados.

QA:
- Test unitario de rename lento/fallido.
- Test de orden entre seal y mark succeeded.
- Finalizacion manual de `presentacion` con prewarm reused y cold.

#### Fase 2 - Claim atomico por identidad de acta

Estado: completada y validada en preview el 2026-04-28.

Alcance:
- Crear proteccion DB para una sola finalizacion activa o exitosa por `(form_slug, user_id, identity_key)`.
- Usar filtro operativo sobre `status IN ('processing', 'succeeded')` para permitir retry despues de `failed`.
- Implementar claim atomico via RPC corta o equivalente transaccional.
- Resolver: `succeeded` -> replay, `processing` fresco -> in-progress, `processing` stale -> reclaim/fail, `failed` -> retry permitido.
- Implementacion: migracion `finalization_identity_claim` con preflight de duplicados, indice parcial unico activo, RPC `claim_form_finalization_request` con advisory lock por identidad y `identityKey` obligatorio en TypeScript.
- Post-QA: el TTL de `processing` bajo de 360s a 90s, alineado con `maxDuration = 60` de las rutas de finalizacion, para reducir la ventana de reclaim tardio; si `mark succeeded` choca con el indice unico por identidad (`23505`), se loguea explicitamente como posible duplicado extremo.

Criterio de salida:
- Dos tabs con mismo draft e inputs distintos no pueden crear dos actas.
- Un retry despues de fallo real sigue funcionando.
- El polling/status puede resolver la finalizacion por identidad aunque el request hash cambie.
- Verificacion local: tests de `requests`, `finalization-status`, lint, build y `supabase:doctor`.

QA:
- Test de doble submit concurrente mismo `identity_key` con payload distinto.
- Test de replay de `succeeded`.
- Test de reclaim de `processing` stale.
- Test de retry despues de `failed`.
- QA manual 2026-04-28: finalizacion normal green; doble apertura del mismo borrador bloquea la segunda pestaña con toma de control, comportamiento esperado; no se observaron duplicados.

#### Fase 3 - Delete y cleanup seguros

Estado: completada y validada en preview el 2026-04-28.

Alcance:
- Hacer el delete de draft con snapshot atomico del prewarm actual.
- Rehusar o diferir cleanup si hay lease activo.
- Antes de trash, revisar referencias de finalizacion `processing`/`succeeded` al spreadsheet.
- En `strictDraftPersistence`, tratar `updateDraftGooglePrewarm === null` como error para que el catch limpie el archivo recien creado.
- Registrar/reparar renames best-effort que no hayan completado y dejen archivos finalizados con nombre provisional.
- Implementacion: DELETE de draft con `UPDATE ... RETURNING`, blocker RPC `find_draft_prewarm_cleanup_blocker`, guard equivalente en `/api/internal/draft-cleanup`, razones estables `active_lease`, `active_finalization_identity`, `active_finalization_spreadsheet`, metadata `finalDocumentBaseName` en `external_artifacts` y helper de retry de rename best-effort.
- Post-QA: el path inline de finalizacion ahora usa `strictDraftPersistence: true`; el retry de rename quedo expuesto como accion admin explicita `POST /api/internal/draft-cleanup` con `action: "retry_rename"`.
- Nota de alcance: la red de seguridad de renames pendientes no bloquea Fase 2 porque no afecta perdida de datos ni duplicacion de actas; queda como cleanup seguro de Fase 3 y ya existe metadata/helper minimo para reparacion.
- Decision post-QA: no se habilita purga automatica de drafts `pending` bloqueados por finalizacion `succeeded`; eso resuelve bloat operativo, pero no protege contra perdida de datos. Se mantiene fuera del path destructivo por ahora y se tratara como herramienta admin explicita si aparece volumen real.

Criterio de salida:
- Un draft borrado durante prewarm no deja archivos huerfanos.
- Un draft borrado durante finalizacion no puede trashar un Sheet ya publicado o en publicacion.
- Los cleanup pendientes quedan trazables para admin/retry.
- Verificacion local: tests de delete, cleanup interno, `draftSpreadsheet`, lint, build, `supabase:doctor` y baseline.

QA:
- Test delete durante prewarm.
- Test delete entre insert durable y seal prewarm.
- Test cleanup skip/deferred por lease activo.
- Test cleanup skip por finalizacion `processing`/`succeeded`.
- QA manual 2026-04-28: delete/finalizacion/cleanup/retry rename green. Caso `skipped` validado para draft sin `spreadsheetId`, sin lease y sin finalizacion asociada; significa que no habia archivo de Drive para trash.

#### Fase 4 - Contrato canonico de prewarm estructural

Estado: implementada localmente y desplegada en Preview para QA manual el 2026-04-28.

Alcance:
- Definir por formulario los inputs minimos que cambian estructura del Sheet.
- Agregar caps server-side por formulario para repetibles y bloques.
- Quitar dependencia de `structureSignature` enviada por cliente para rate-limit fino.
- Implementacion: `/api/formularios/prewarm-google` mantiene body compatible, pero ignora `prewarm_hint` como fuente de verdad; lee el draft remoto por `draft_id + user_id + form_slug`, usa `form_drafts.data` como draft canonico y recalcula `PrewarmHint` con `buildPrewarmHintForForm`.
- Implementacion: `empresa_snapshot.nombre_empresa` es la fuente canonica para rate-limit y preparacion de carpeta; `body.empresa.nombre_empresa` queda solo como fallback de compatibilidad si el draft historico no tiene snapshot.
- Implementacion: `presentacion` y `sensibilizacion` tienen cap server-side de `asistentes <= 80`; los demas formularios auditados tienen caps conservadores por repetible (`asistentes <= 50`, bloques repetibles <= 50, `interprete-lsc` alineado con sus limites de validacion). Si se excede, responde `400 prewarm_cap_exceeded` antes de rate-limit y antes de tocar Google.
- Post-QA: el cliente detecta `prewarm_cap_exceeded` como error terminal por `requestKey`, evitando retries/backoff inutiles para la misma estructura y permitiendo reintento si el usuario corrige el conteo.
- Implementacion operativa: Preview se redeployo con `NEXT_PUBLIC_RECA_PREWARM_ENABLED=true` y `NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS=presentacion` inyectadas en build/runtime del deployment de QA.

Criterio de salida:
- El prewarm no acepta counts ilimitados del cliente.
- La firma estructural la calcula el servidor desde el draft remoto.
- El body de prewarm sigue pequeno y compatible; el cliente puede enviar hint optimista, pero no decide estructura ni rate-limit fino.
- Draft faltante, soft-deleted o de otro usuario responde antes de rate-limit/Google.
- Empresa del body del cliente no rota el fingerprint fino de rate-limit cuando existe `empresa_snapshot`.

QA:
- Test de counts maliciosos ignorados cuando el draft canonico no los tiene.
- Test de firma recomputada por servidor y usada en rate-limit.
- Test de draft faltante/soft-deleted/de otro usuario sin llamada a Google.
- Test de cap `presentacion > 80` sin llamada a Google.
- Test de caps de otros formularios sin llamada a Google.
- Test de `empresa_snapshot` canonico para rate-limit y preparacion.
- Test de cliente sin retry para `prewarm_cap_exceeded`.
- QA manual pendiente: crear draft `presentacion`, confirmar `google_prewarm.spreadsheetId`, borrar draft con spreadsheet asociado, finalizar con prewarm listo y validar fallback inline si no hay prewarm.

#### Fase 5 - Piloto de prewarm temprano por formulario

Estado: completada y validada en preview el 2026-04-28.

Alcance:
- Piloto inicial: `presentacion`.
- Inputs tempranos propuestos: empresa, tipo de acta (`presentacion`/`reactivacion`) y cantidad estimada de asistentes.
- Implementacion: despues de seleccionar empresa, `presentacion` muestra un setup inicial con tipo de visita y asistentes estimados cuando el piloto de prewarm esta habilitado y no se esta restaurando un draft/session existente.
- Implementacion: `prewarm_asistentes_estimados` queda como metadata opcional del draft canonico; no crea filas falsas de asistentes ni se escribe como dato final del acta.
- Implementacion: `buildPrewarmHintForForm("presentacion")` usa `max(asistentes reales, asistentes estimados)` y conserva el cap server-side de 80 para evitar trabajo masivo de Google.
- Implementacion: el hook de prewarm puede ejecutar un checkpoint remoto del snapshot actual antes del POST, para que `/api/formularios/prewarm-google` lea estructura canonica actualizada desde `form_drafts.data`.
- Implementacion: el setup se recuerda en `sessionStorage` por empresa y el editor promueve la navegacion a `session=...`, evitando re-prompt en refresh normal post-setup.
- Post-QA: las filas estimadas vacias en `presentacion` deben revisarse antes de finalizar; el usuario puede completarlas o eliminarlas. No se compactan silenciosamente para evitar publicar una estructura distinta sin revision humana.
- Decision post-QA: `prewarm_asistentes_estimados` no contamina el `requestHash` porque el hash usa payload canonico de finalizacion; tambien queda fuera del text review porque `presentacion` solo revisa `acuerdos_observaciones`.
- Crear carpeta de empresa si falta, copiar template, preparar estructura y dejar nombre provisional.
- En finalizacion, escribir valores, exportar PDF si aplica, persistir, seal y rename async.
- Evaluar `contratacion` como segundo piloto solo si cantidad de oferentes cambia estructura real del Sheet.

Criterio de salida:
- `presentacion` reduce p95 de finalizacion frente al baseline.
- Cambiar asistentes/tipo invalida o reconstruye el prewarm sin perdida de datos.
- Abandono de draft deja cleanup trazable.

QA:
- Flujo con conteo correcto desde el inicio.
- Flujo con conteo cambiado antes de finalizar.
- Flujo sin prewarm listo: fallback inline sigue funcionando.
- Flujo de borrado de draft con spreadsheet provisional.
- QA combinado Fase 4/5 validado: crear draft `presentacion`, confirmar `google_prewarm.spreadsheetId`, borrar draft con spreadsheet asociado, finalizar con prewarm listo, validar cambio de conteo y validar cap `81` sin llamada Google.
- QA post-review validado: overestimate con filas sobrantes bloquea finalizacion hasta completar o eliminar filas intermedias.

#### Fase 6 - Reuse confiable y reduccion real del path de finalizacion

Estado: completada y validada en preview el 2026-04-28.

Alcance:
- Agregar `templateRevision` por formulario y `validatedAt` al snapshot JSONB de prewarm, sin migracion DB.
- Incluir `templateRevision` en la firma estructural para invalidar prewarms viejos cuando cambie plantilla, hojas soporte, validaciones o layout.
- Saltar `listSheets` solo si el prewarm `ready` coincide en firma, bundle, revision, carpeta, spreadsheet, sheet activo y `validatedAt` sigue fresco (TTL actual: 10 min).
- Si falta `validatedAt` o expiro, revalidar contra Google como antes y persistir el nuevo timestamp.
- Agregar transporte directo server-side para text review con OpenAI Responses API usando `OPENAI_API_KEY`, manteniendo Supabase Edge Function como fallback/rollback.
- Selector de transporte: `OPENAI_TEXT_REVIEW_TRANSPORT=direct|edge`; default `direct` si existe `OPENAI_API_KEY`, si no `edge`.
- Mantener `gpt-4.1-nano` como modelo default.
- Paralelizar en rutas con text review: despues del claim por identidad y antes de tocar Google, iniciar `textReviewPromise`; preparar/reusar spreadsheet con la mutacion estructural del payload original; esperar la revision solo antes de escribir valores finales, armar payload durable y PDF.
- Mantener fail-open: si OpenAI/Edge falla o timeoutea, se escribe el texto original y la finalizacion continua.
- Observabilidad agregada: `textReviewModel`, `textReviewTransport`, `textReviewDurationMs`, `textReviewStatus`, `prewarmValidatedAt` y `prewarmTemplateRevision` quedan en profiling/metadata de finalizacion.
- Post-QA: el path que espera a otro prewarm y revalida con `listSheets` ahora refresca `validatedAt` con guard por `google_prewarm_updated_at`, evitando una llamada redundante posterior sin poder pisar un seal/rebuild mas reciente.
- Decision post-QA: no se salta text review en recoveries tardias hasta persistir el payload revisado en `external_artifacts`; un skip simple podria dejar DB y Sheet inconsistentes igual que el edge case que intenta corregir. Ese cache queda movido a Fase 7.

Criterio de salida:
- Prewarms viejos se invalidan al cambiar template/logica estructural.
- Reuse reciente evita llamadas Google redundantes sin confiar ciegamente.
- `replay` e `in_progress` salen antes de llamar text review.
- Google prep y text review ya no corren serialmente en las rutas principales.
- La frontera durable no cambia: insert final, seal critico y mark succeeded siguen en orden seguro.

QA:
- Test revision bump invalida prewarm.
- Test snapshot reciente evita revalidacion.
- Test snapshot expirado revalida.
- Test de transporte directo, fallback Edge, parse de Responses API y fail-open.
- Test de ruta `presentacion`: spreadsheet prep inicia antes de que resuelva text review y la escritura final usa texto revisado.
- Verificacion local ejecutada: tests de text review/config/client, prewarm registry, draft spreadsheet, rutas resume afectadas, prewarm-google, finalizationSpreadsheet, lint, build y baseline.
- QA manual en preview green: finalizacion de `presentacion` con prewarm reutilizado termino en ~15-18s, `prewarm_status=reused_ready`, `prewarm_reused=true`, y text review directo/paralelo tomo ~5s en el caso observado.
- QA post-review validado: las filas intermedias creadas por estimado en `presentacion` muestran asterisco obligatorio y deben completarse o eliminarse antes de finalizar; el Sheet/PDF no publica filas vacias no revisadas.

#### Fase 7 - Optimizacion del cold path de Google Sheets

Estado: completada y validada en preview el 2026-04-28; pendiente solo de medicion post-deploy con mas muestra real.

Alcance:
- Mantener el cold path como fallback obligatorio: si no hay prewarm reutilizable, la finalizacion sigue preparando el Sheet inline sin cambiar la frontera durable.
- No copiar el master completo como atajo; se siguen copiando solo hojas requeridas para evitar exponer tabs no usados si una operacion posterior falla.
- Reemplazar resoluciones repetidas de metadata fuente por `copySheetsToSpreadsheet`, que lee metadata del master una vez y copia el bundle requerido por `copyTo`.
- Leer metadata destino una sola vez despues de copiar el bundle, incluyendo propiedades de hojas y protected ranges.
- Agrupar operaciones estructurales compatibles en `applyPrewarmStructuralBatch`: borrar protected ranges, insertar filas simples, copiar template rows, ocultar filas, aplicar checkbox validations y visibilidad de hojas. `values.batchUpdate`, PDF export y operaciones que dependen de endpoints distintos siguen separadas.
- Cachear `textReview` en `external_artifacts` con `inputHash`, modelo, transporte, estado, duracion, items revisados y `reviewedAt`.
- Reutilizar cache valido de text review en retries cuando coinciden input, modelo y campos esperados; cachear tambien fail-open para que un retry preserve el mismo texto original si esa fue la mutacion aplicada.
- Persistir el cache antes de `spreadsheet.apply_mutation_done` de forma best-effort; si falla, no bloquea finalizacion y queda marcado como `text_review.cache_persist_failed`.
- Agregar labels de medicion: `copy_bundle.source_metadata`, `copy_bundle.copy_to`, `validation_metadata`, `structural_batch`, `text_review.cache_hit`, `text_review.cache_miss`, `text_review.cache_persisted` y `text_review.cache_persist_failed`.
- Evaluar bajar `OPENAI_TEXT_REVIEW_REQUEST_TIMEOUT_MS` solo despues de medir p95 post-deploy con transporte directo y cache de retry.

Criterio de salida:
- Prewarm/cold inline baja p50/p95 sin cambiar el resultado visual/estructural del Sheet.
- Las operaciones mantienen orden seguro para formulas, merges, alturas y validaciones.
- Retries posteriores a text review ya no pueden escribir Sheet con texto `X` e insertar DB con texto `Y` si el primer intento dejo cache valido en artifacts.
- Las mejoras se evaluan separando `inline_cold`, `inline_after_stale` y `reused_ready`; no mezclar casos al comparar.

QA:
- Comparacion de Sheet generado antes/despues por formulario piloto (`presentacion`) y un long form con repetibles grandes (`contratacion` o `evaluacion`).
- Test de mutaciones estructurales repetibles, tabs visibles, filas insertadas/ocultas, checkbox validations y PDF exportado cuando aplique.
- Test de cache hit valido, cache fail-open, cache invalidado por input/modelo distinto y persistencia best-effort fallida; incluye regresion para reutilizar cache cuando solo cambia whitespace no significativo, porque los targets de review se sanitizan antes del hash.
- Verificacion local ejecutada: tests de `textReview`, `requests`, `draftSpreadsheet`, `finalizationSpreadsheet`, `routeHelpers`, `sheets`, `companySpreadsheet`; rutas afectadas de `presentacion`, `evaluacion`, `seleccion`, `contratacion`, `condiciones-vacante`, `induccion-operativa` e `induccion-organizacional`; `lint`, `build` y baseline.
- Baseline local 2026-04-28: 100 filas `succeeded` ultimos 30 dias, 98 con timing; `inline_cold` domina la muestra y `text_review.*` sigue siendo top cost. Comparacion real queda pendiente de datos post-deploy.
- QA manual de preview validado con `presentacion` y `contratacion`: ambos publicaron Sheet/PDF correctamente, sin duplicados por identidad, sin requests colgados, con links persistidos y cleanup de draft `skipped` por prewarm `finalized` como comportamiento esperado.
- Resultado observado: `presentacion` reutilizo prewarm (`reused_ready`, `prewarm_reused=true`) y `contratacion` probo el fallback frio optimizado (`inline_cold`, `prewarm_reused=false`) con finalizacion perceptiblemente mas rapida.
- Decision post-review: no se agrega TTL a cache `failed` todavia; por ahora la consistencia de retry pesa mas que reintentar OpenAI despues de un outage transitorio. Reevaluar en Fase 8 si aparecen clusters de `text_review.cache_hit` con `status=failed`.
- Decision post-review: se mantiene el batch separado de protected ranges cuando hay `templateBlockInsertions`; sacrifica un round-trip en casos complejos para preservar un orden defensivo con merges/alturas/protected ranges.

#### Fase 8 - Rollout controlado

Estado: pendiente de plan.

Orden propuesto:
1. `presentacion`
2. `sensibilizacion`
3. Evaluar `seleccion` y `contratacion` antes de implementar setup temprano propio; si Fase 7 ya cubre suficiente el cold path o si sus inputs estructurales no son claros, mantenerlos solo con prewarm canonico/fallback.
4. `induccion-organizacional` e `induccion-operativa`
5. `condiciones-vacante`
6. `evaluacion`
7. `interprete-lsc` solo si se decide activar el piloto

Criterio de salida:
- Sin duplicados por identidad.
- Sin cleanup destructivo.
- p95 de finalizacion menor que baseline por formulario priorizado.
- Fallback inline disponible mientras el rollout madura.

### Evaluacion

- `evaluacion` sigue en preview y no se considera cerrada mientras mantenga QA manual pendiente.
- El formulario ya corre como long form productivo y publica solo a Google Sheets; por decision de producto no genera PDF nunca por la hoja manual de fotos.
- En local ya soporta `visita fallida` con preset real y minimos de asistentes relajados a 1.
- La coherencia visual local de `visita fallida` ya fue ajustada: el nav marca completas las secciones de preguntas segun optionalidad fallida y el grupo 2 puede iniciar plegado solo en este formulario.

### Robustez de asistentes (fila 0 / profesional RECA)

Caso reportado en produccion: el server rechazo `evaluacion` con `400 "El cargo es requerido"` aun cuando la validacion cliente paso. Causa: `asistentes[0]` (fila profesional RECA) llega con `cargo: ""` cuando `useProfesionalesCatalog` aun no tiene al profesional o el catalogo no termino de cargar antes del submit. El reintento le sirvio al usuario sin tocar nada porque el catalogo cargo entre intentos y el auto-seed (`AsistentesSection.tsx:139-202`) lleno el cargo. Tres fixes pendientes, de menor a mayor invasividad:

1. Server robusto en `ensureEvaluacionBaseAsistentes` ([`evaluacion.ts:355-394`](../src/lib/evaluacion.ts#L355)): cuando el match por nombre con el profesional asignado existe y `cargo` viene vacio, resolverlo desde el catalogo (o, al minimo, no dejarlo escapar a la validacion de Zod del request).
2. Cliente robusto en la fila 0 de `AsistentesSection`: cuando el catalogo no provee cargo del profesional asignado, hacer el campo `cargo` visiblemente requerido y editable. Hoy luce auto-llenado pero queda vacio sin que el usuario lo note.
3. Bloquear submit hasta que el catalogo este listo: deshabilitar el boton Finalizar mientras `useProfesionalesCatalog` este `loading`, evitando la carrera de tiempo entre seed y envio.

### Operacion documental

- `forms_catalog.md` es la unica verdad local del estado por formulario.
- Los historicos de migracion, QA y discovery ya no vuelven a `memory/`.

## Estado por formulario

| Formulario | Slug | Estado real |
|---|---|---|
| Presentacion / Reactivacion | `presentacion` | Produccion; referencia canonica del stack; sin CTA visible de `visita fallida` |
| Sensibilizacion | `sensibilizacion` | Produccion; baseline reusable; sin CTA visible de `visita fallida` |
| Condiciones de la Vacante | `condiciones-vacante` | Produccion; lote local de `visita fallida` pendiente de QA |
| Seleccion Incluyente | `seleccion` | Produccion; lote local de `visita fallida` pendiente de QA |
| Contratacion Incluyente | `contratacion` | Produccion; lote local de `visita fallida` pendiente de QA |
| Induccion Organizacional | `induccion-organizacional` | Produccion; lote local de `visita fallida` pendiente de QA |
| Induccion Operativa | `induccion-operativa` | Produccion; lote local de `visita fallida` pendiente de QA |
| Evaluacion de Accesibilidad | `evaluacion` | Preview vigente; `visita fallida` local pendiente de QA |
| Interprete LSC | `interprete-lsc` | Migrado; sin frente de migracion. Prewarm listo por `env`, fuera del piloto default |
| Seguimientos | `seguimientos` | Migrado; runtime multi-etapa ya absorbido al catalogo normal |

## Siguiente orden recomendado

1. Medir post-deploy con `npm run finalization:baseline -- --days 30 --limit 100`, separando `inline_cold`, `inline_after_stale` y `reused_ready`.
2. Crear plan de Fase 8: rollout controlado por formulario, empezando por revisar si `seleccion` y `contratacion` ameritan setup/prewarm temprano propio o si basta el contrato canonico + cold path optimizado.
3. Ejecutar Fase 8 solo con formularios donde el beneficio esperado sea claro y medible por p50/p95.
4. Mantener en paralelo QA manual del lote actual de `visita fallida` y validacion de borradores, sin mezclar esos hallazgos con el rollout de prewarm.
5. Decidir si `evaluacion` se cierra como migracion completa y si `interprete-lsc` entra al piloto solo despues de estabilizar las fases compartidas.

## Completado

- La base shared de long forms, drafts, finalizacion y prewarm ya esta migrada.
- `Interprete LSC` y `Seguimientos` ya cuentan como formularios migrados; no necesitan documentacion propia en `memory/`.

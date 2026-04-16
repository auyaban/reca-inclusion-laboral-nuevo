---
name: Roadmap de implementación
description: Plan paso a paso de todo lo que queda por construir, en orden de dependencia
type: roadmap
updated: 2026-04-16
---

## Regla operativa

- Este archivo sigue siendo el **roadmap técnico y de dependencias** del proyecto.
- El backlog vivo, el QA abierto y las decisiones/iniciativas activas viven en Notion:
  - `20 — Pendientes priorizados`
  - `30 — QA y validación`
  - `40 — Iniciativas y decisiones`
- Cuando cambie el estado real de una fase, sincronizar roadmap + `memory/MEMORY.md` + la página canónica de Notion correspondiente.

## Actual local breve

- `2026-04-16` - `Inducción Organizacional` + `Inducción Operativa`: F0 conjunto ya documentado en `memory/inducciones_f0.md`. El lote queda delimitado como migración larga compartida con 1 solo vinculado en web, lookup manual low-egress a `usuarios_reca`, asistentes genéricos, observaciones con dictado y slices separados por formulario después de una sola fase base compartida.
- `2026-04-16` - `Inducción Organizacional` + `Inducción Operativa`: F2 y F3 ya quedaron implementadas localmente sobre la base shared de `F1`. Ambos slugs ya existen como long forms con hook, presenter, validación, routes de finalización y adapters por formulario; `HubMenu` se mantiene oculto (`available: false`) hasta cerrar `F4/F5`. Validación local conjunta cerrada con `vitest` focal (`41/41`), `eslint`, `npm run spellcheck` y `npm run build`.
- `2026-04-16` - `Inducción Organizacional` + `Inducción Operativa`: `F4-A` ya quedó aplicado localmente. El lote ahora usa hashing compartido desde `src/lib/finalization/idempotency.ts`, ambas routes hacen sync mínimo non-fatal a `usuarios_reca`, `Inducción Organizacional` escribe `medio + recomendacion` explícitos en `6. INDUCCIÓN ORGANIZACIONAL` y `Inducción Operativa` corrigió el mapping final de `section_4` contra legacy + maestro vivo sin agregar correos inexistentes en `section_1`. Validación focal cerrada con `vitest` (`43/43`) y `eslint` sobre los archivos tocados; siguiente paso real: `F4-B` y luego `F5` (preview + QA manual) antes de decidir exposición en hub.
- `2026-04-16` - `Inducción Organizacional` + `Inducción Operativa`: `F4-B` ya quedó aplicado localmente. El lote eliminó validaciones redundantes en Organizacional (`section_4` y vinculado), simplificó la regla de asistentes en Operativa, corrigió el fixture nested de `section_3` y endureció la cobertura con replay paths, asserts por efectos observables en las routes y cleanup interactivo del snapshot de `InduccionLinkedPersonSection`. Baseline final del lote revalidado con `npx vitest run` (`551/551`), `npm run lint`, `npm run build` y `npm run spellcheck`; siguiente paso real: `F5` (preview + QA manual) antes de decidir exposición en hub.
- `2026-04-16` - `Inducción Organizacional` + `Inducción Operativa`: Playwright local ya cubre ambos formularios antes de `F5`. Se agregó `e2e/inducciones.spec.ts` con smoke + integration para apertura seeded, lookup singular a `usuarios_reca`, recomendaciones derivadas de `section_4` en Organizacional y sync prefijado de `section_4` en Operativa; además `openSeededForm()` quedó flexible para slugs que no siempre promueven `draft/session` en la URL al primer render. Validación E2E completa cerrada con `npm run test:e2e` (`42/42`).
- `2026-04-16` - `Inducción Organizacional` + `Inducción Operativa`: `F5` sigue en `preview` y ya absorbió el segundo follow-up de QA. El deployment vigente pasó a `reca-inclusion-laboral-nuevo-m0wqo0f6w-auyabans-projects.vercel.app` con inspector `G3pnfZ4fdV7Z32K3HYPvCeSdgf9a`; sobre el corte anterior se agregaron notas/observaciones no obligatorias en ambas inducciones y el botón `Test` compartido de llenado rápido, manteniendo las tarjetas habilitadas en `HubMenu` y la búsqueda liviana de `empresas` con `zona_empresa`. Validación local cerrada con `vitest` focal (`23/23`), `eslint`, `npx playwright test e2e/inducciones.spec.ts` (`6/6`) y `npm run build`. Siguiente paso real: QA manual focal del preview vigente.
- `2026-04-16` - finalización de formularios largos: follow-up local de UX aplicado tras QA. `Presentación`, `Sensibilización`, `Condiciones de la Vacante`, `Selección`, `Contratación`, `Inducción Organizacional` e `Inducción Operativa` ya conservan los errores de publicación dentro del popup de finalización con opciones de `Cerrar/Reintentar`, y al cerrar dejan además feedback contextual junto a `Finalizar` en vez de subirlo al banner superior. El diálogo compartido ya soporta este estado de error y Playwright cubre explícitamente el caso fallido de `Selección` e `Inducción Organizacional`. Baseline local cerrado con `npm run lint`, `npm run spellcheck`, `npm run build`, `npx vitest run src/components/forms/shared/FormSubmitConfirmDialog.test.tsx` y `npx playwright test e2e/finalization-controlled.spec.ts e2e/inducciones.spec.ts`; preview nuevo: `reca-inclusion-laboral-nuevo-ibf3dbs8t-auyabans-projects.vercel.app`.

- `2026-04-16` - hub: `/hub` ahora siembra server-side el shell inicial, el nombre del usuario y los borradores remotos; se eliminó el `fallback` vacío, el drawer ya abre por `?panel=drafts` sin depender de `useSearchParams()` en el primer render y la reconciliación local queda en background sin volver a tapar la UI. Validación local cerrada con `npm run lint`, `npm run test` (`495/495`), `npm run test:e2e:smoke` (`18/18`) y `npm run build`. Preview nuevo: `reca-inclusion-laboral-nuevo-nrab1go9t-auyabans-projects.vercel.app`. Siguiente paso real: QA focal del hub y del deep link del drawer sobre ese preview.

- `2026-04-16` - performance de formularios largos: `/formularios/[slug]` ahora lazy-load de las 5 entradas largas y resuelve deep links `?draft=...` server-side con Supabase SSR + RLS para evitar el waterfall `mount -> effect -> Supabase -> render`. La hidratacion mantiene precedencia `copia local > draft prefetched > fetch cliente fallback/error`. Validacion local cerrada con `npm run lint`, `npm run test` (`489/489`) y `npm run build`. Siguiente paso real: preview nuevo y QA focal de carga inicial + restore remoto.

- `2026-04-14` — borradores: mejora visual del drawer/hub para distinguir drafts de la misma empresa sin tocar IDs, locks, aliases ni autosave. La metadata sale del snapshot local; `condiciones-vacante` prioriza `nombre_vacante`, `numero_vacantes` y `fecha_visita`.
- `2026-04-14` - formularios largos: `Presentacion` y `Sensibilizacion` quedaron refactorizados a contenedor delgado + hook de estado + presenter puro sobre `useLongFormDraftController`; `npm run lint`, `npm run test` y `npm run build` pasaron localmente.
- `2026-04-15` - hardening post-review: `Condiciones de la Vacante` quedó refactorizado al mismo patrón contenedor + hook + presenter; el hash de idempotencia del formulario ya no depende de una segunda normalización implícita, `uploadPdf` usa stage consistente sin retry ciego y `textReview` ya tiene timeout + telemetría estructurada. Validación local cerrada con `npm run spellcheck`, `npm run lint`, `npm run test` y `npm run build`.
- `2026-04-15` - `Seleccion` y `Contratacion`: `F0` documentado en `memory/seleccion_contratacion_f0.md`. Se cerró `desarrollo_actividad` como campo único por formulario y se delimitó `F1` como extensión del motor compartido de Google Sheets para duplicar bloques completos del template.
- `2026-04-15` - `Seleccion` y `Contratacion`: `F1` implementado en el motor compartido de Google Sheets. `FormSheetMutation` ahora soporta `templateBlockInsertions`, `companySpreadsheet` reescribe/prepara esas hojas al duplicarlas y la regresión local quedó validada con `src/lib/google/sheets.test.ts`, `src/lib/google/companySpreadsheet.test.ts` y `src/app/api/formularios/condiciones-vacante/route.test.ts`.
- `2026-04-15` - `Seleccion` y `Contratacion`: `F2` implementado como fundación compartida de personas repetibles. Se agregaron `src/lib/repeatedPeople.ts`, `RepeatedPeopleSection` y helpers genéricos de navegación para arrays; la UX base deja siempre una card visible, abre la nueva card sin colapsar las demás y mantiene `desarrollo_actividad` como campo raíz del formulario. Validación local cerrada con `npm run lint`, `npm run spellcheck` y `npm run test` (`345/345`).
- `2026-04-15` - `Contratacion`: `F3` implementado como long form productivo local. Se agregó el slice completo (`ContratacionForm`, hook de estado, presenter, sections, hydration, navigation, schema, route y adapters de finalización), `desarrollo_actividad` quedó como campo raíz único, `vinculados` usa `RepeatedPeopleSection` y la finalización escribe `5. CONTRATACIÓN INCLUYENTE` con bloques repetibles, PDF y registro en `formatos_finalizados_il`. Cierre local validado con `npm run lint`, `npm run spellcheck`, `npm test` (`366/366`) y `npm run build`. Siguiente frente recomendado: `Seleccion`.
- `2026-04-15` - `Seleccion`: `F4` implementado como long form productivo local. Se agregó el slice completo (`SeleccionForm`, hook de estado, presenter, sections, hydration, navigation, schema, route y adapters de finalización), `desarrollo_actividad` quedó como campo raíz único, `oferentes` usa `RepeatedPeopleSection`, `section_5` recupera `ajustes_recomendaciones` + `nota` con helpers legacy y la finalización escribe `4. SELECCIÓN INCLUYENTE` con bloques repetibles, PDF y registro en `formatos_finalizados_il`. Cierre local validado con `npm run lint`, `npm run spellcheck`, `npm test` (`388/388`) y `npm run build`. Siguiente frente recomendado: QA/push de `Contratacion` y `Seleccion`.
- `2026-04-15` - `F5` de `Contratacion` + `Seleccion`: baseline técnico revalidado (`npm run spellcheck`, `npm run lint`, `npm run test`, `npm run build`), preview creado sin commit en `reca-inclusion-laboral-nuevo-1yovu360y-auyabans-projects.vercel.app` e inicio del branch `codex/f5-qa-contratacion-seleccion`. El siguiente paso real es QA manual de Arquitectura, Dev y funcional sobre ese preview; si aparecen hallazgos bloqueantes, entran como fixes encima del commit de revisión.
- `2026-04-15` - `F5` de `Contratacion` + `Seleccion`: lote local de fixes QA aplicado sobre el branch de revisión. Se corrigieron `grupo_etnico_cual` en `Contratacion`, `extra_name` de `Seleccion` para nombres compuestos, `extra_name` de `Contratacion` según legacy, cobertura `409 in_progress`, `requestHash` sobre `reviewedFormData`, extracción de helpers de route y recorte del `useWatch` global en ambos hooks. La verificación contra legacy dejó `no cambiar` para encabezados `VINCULADO N`. Validación local cerrada con `npm run spellcheck`, `npm run lint`, `npm run test` (`395/395`) y `npm run build`. Siguiente paso real: crear preview nuevo y ejecutar QA manual final.
- `2026-04-15` - `F5` de `Contratacion` + `Seleccion`: preview nuevo generado desde el worktree actual en `reca-inclusion-laboral-nuevo-bj3gi27p2-auyabans-projects.vercel.app` con inspector `EwrP8SvLTXr9paTcuihcbeUtdNDF`. Este corte ya incluye los fixes locales del frente QA y pasa a ser la referencia para el QA manual final antes de commit/push.
- `2026-04-15` - `F5` de `Contratacion` + `Seleccion`: follow-up local sobre hallazgos nuevos de QA. Se consolidó `isMeaningfulValue` sobre `src/lib/repeatedPeople.ts`, se agregó el test de schema para `grupo_etnico="Si" + grupo_etnico_cual="No aplica"` en `Contratacion`, ambas routes ya pasan `empresaRecord` a `buildSection1Data` y la diferencia de `extra_name` entre `Seleccion` y `Contratacion` quedó documentada como paridad intencional con legacy. También se corrigió el mock de observabilidad/Sentry en `src/lib/finalization/profiler.test.ts`, con lo que `npm test` completo volvió a verde (`396/396`).
- `2026-04-15` - `F6` `usuarios_reca`: integración local cerrada para `Seleccion` + `Contratacion`. `Contratacion` ya consulta por cédula vía `GET /api/usuarios-reca`, permite `Cargar datos` manualmente por card, resalta en amarillo los campos modificados respecto al snapshot cargado y ambos formularios sincronizan `usuarios_reca` al finalizar como paso best-effort no bloqueante para no volver a ejecutar Google si ese sync falla. El cierre local pasó `npm run lint`, `npm run test` (`416/416`), `npm run build` y `npm run spellcheck`. Siguiente paso real: QA manual del nuevo flujo antes de push.
- `2026-04-15` - `F6` `usuarios_reca`: hardening puntual aplicado sobre rutas, hooks y server helper. `certificado_porcentaje` ya compara y rellena `45/45%` de forma consistente, `inferUsuarioRecaDiscapacidadCategoria` tiene cobertura directa, `normalizeUsuarioRecaUpsertRow` ignora keys no permitidas, `useUsuariosRecaSearch` aborta fetch en vuelo, el detalle `GET /api/usuarios-reca/[cedula]` usa `Cache-Control: private, no-store` y `usuariosRecaServer` reutiliza un admin client lazy con intención explícita de merge en `upsert`.
- `2026-04-15` - `Seleccion` + `Contratacion`: `Seleccion` ya consume `usuarios_reca` con el mismo patron manual de `Contratacion`, la paridad de sync legacy de dropdowns prefijados para `Seleccion` quedo extraida y cubierta en `src/lib/seleccionPrefixedDropdowns.ts`, y el repo ya tiene Playwright v1 como smoke E2E local para `hub`, gates, repetibles, lookup por cedula, sync de dropdowns y boton `Test`. Validacion local cerrada con `npm run test:e2e` (`10/10`), `npm run lint`, `npm run test` (`439/439`), `npm run build` y `npm run spellcheck`.
- `2026-04-15` - `Seleccion` + `Contratacion`: follow-up local de hardening QA cerrado. `Contratacion` ahora extrae sus reglas de sync prefijado a `src/lib/contratacionPrefixedDropdowns.ts` con tests unitarios, el bypass E2E paso a env server-only (`E2E_AUTH_BYPASS`) y las routes read-only de `usuarios-reca` ya lo respetan, `manualTestFill` usa fecha dinamica con cobertura del feature flag, `repeatedPeople.test.ts` cubre `syncRepeatedPeopleRowOrder` y Playwright ya valida tambien el flujo `click sugerencia -> Cargar datos` en `Seleccion`. Validacion local cerrada con `npm run lint`, `npm run test` (`447/447`), `npm run test:e2e` (`11/11`), `npm run build` y `npm run spellcheck`.
- `2026-04-15` - `Seleccion` + automation transversal: cierre local del frente de performance, ayudas de seleccion y Playwright. `RepeatedPeopleSection` ya opera con watch por fila y helpers dedicados para insercion/reindexado, `Seleccion` ahora centraliza sus 22 statements en `src/lib/seleccionAdjustmentLibrary.ts` con categorias, sugerencias universales y sugerencias por discapacidad, y `SeleccionRecommendationsSection` expone ayudas contextuales sin perder los botones legacy. El harness E2E ya cubre smoke de app/formularios, drafts lifecycle, recomendaciones de `Seleccion`, `usuarios_reca`, sync prefijado y finalizacion controlada con mocks, con `openSeededForm()` estabilizado sobre `?session/?draft` para evitar flakes de hidratacion. Validacion local cerrada con `npm run lint`, `npm run spellcheck`, `npm run test` (`458/458`), `npm run test:e2e` (`33/33`) y `npm run build`.
- `2026-04-15` - `Seleccion` + `Contratacion`: follow-up local de Fase 1 y 2 del nuevo lote pre-prod. La capa de dominio ahora deriva `edad` desde `fecha_nacimiento`, `Seleccion` fuerza `tipo_pension = "No aplica"` cuando `cuenta_pension = "No"` y `Contratacion` deja `fecha_fin` opcional en schema/normalizacion. Ademas `seleccionAdjustmentLibrary` ya normaliza tildes, detecta `Autismo`, separa `family_boundaries` bajo `Familia y contexto` y reduce aliases para exponer una API publica mas corta via `@/lib/seleccion`. Los tests de regresion de estas reglas quedaron preparados, pero por instruccion del lote aun no se ejecuta baseline.
- `2026-04-15` - `Seleccion` + `Contratacion`: follow-up local de Fase 4 y 5 del mismo lote pre-prod. `SeleccionRecommendationsSection` ahora expone un flujo guiado en tres pasos (`Bloques rapidos`, `Sugerencias para esta persona`, `Texto final de ajustes`) manteniendo `ajustes_recomendaciones` como texto libre final, y ambos hooks de formulario preservan contexto con view-state efimero por ruta/sesion para que restore, reload y focus-out ya no salten al tope. Tambien quedaron preparados los casos de regresion para preview de helpers y conservacion de scroll/contexto, pero todavia no se ejecuta baseline hasta cerrar el resto de fases.
- `2026-04-15` - `Seleccion` + `Contratacion`: follow-up local de Fase 3 y 6 del mismo lote pre-prod. Ambas UIs ya tratan `edad` como campo derivado/no editable desde `fecha_nacimiento`; `Seleccion` expone `fecha_firma_contrato` como texto libre y fuerza `tipo_pension = "No aplica"` mientras `cuenta_pension = "No"`, y `Contratacion` deja `fecha_fin` como texto opcional sin validacion visual de fecha. Las cards de personas convergieron a una estructura visual mas parecida, el autofill de cargo del profesional RECA se endurecio por coincidencia exacta al escribir, y la finalizacion ahora muestra pasos cliente-side + tiempo transcurrido con error contextual cerca de las acciones en vez de depender del banner superior. Los tests de regresion de esta UX quedaron preparados, pero por instruccion del lote aun no se ejecuta baseline.
- `2026-04-16` - `Seleccion` + `Contratacion`: follow-up local de Fase 7 y 8 del mismo lote pre-prod. `LoginForm` ya usa copy con ortografia/tildes correctas, `textReview` amplió la allowlist de `condiciones_vacante` a los campos de texto libre que se estaban escapando y ahora sanitiza espacios/saltos de línea de forma conservadora, y `src/lib/finalization/sheetValueFormat.ts` unifica la exportacion de `certificado_porcentaje` para `Seleccion` y `Contratacion` en Google Sheets. Los tests de regresion de copy, text review y decimal-to-Sheets quedaron preparados, pero por instruccion del lote aun no se ejecuta baseline.
- `2026-04-16` - `Seleccion` + `Contratacion`: follow-up local de Fase 9 y 10 y cierre tecnico del lote pre-prod. `DraftPersistenceStatus` ahora expone estado observable de guardado (`data-save-state`, `data-local-saved-at`) para que Playwright espere autosave de forma deterministica, `DraftsHub.tsx` alinea naming interno con el modulo real, `RepeatedPeopleSection` actualiza `renderRow` via ref + `useSyncExternalStore` sin perder memoizacion, `Condiciones de la Vacante` movio `Agregar fila` al final del bloque de discapacidades y el harness E2E ya no depende de `waitForTimeout(1500)` ni de selectores ambiguos en finalizacion. Baseline final local verde con `npm run lint`, `npm run spellcheck`, `npm run test` (`475/475`), `npm run test:e2e` (`36/36`) y `npm run build`. Siguiente paso real: preview nuevo y QA manual final antes de push.
- `2026-04-16` - `Seleccion` + `Contratacion`: follow-up local post-preview sobre hallazgos manuales de cards repetibles y `usuarios_reca`, sin revalidar baseline aun. `RepeatedPeopleSection` ya soporta titulo/subtitulo custom por config, `Seleccion` y `Contratacion` usan `Oferente/Vinculado N` como identidad primaria con `nombre + cedula` como resumen secundario y se eliminó la banda interna duplicada de `Consecutivo`; ademas `usuariosReca` ahora ignora sentinelas derivados como `grupo_etnico_cual = "No aplica"` y `tipo_pension = "No aplica"` cuando no representan datos realmente reemplazables, evitando falsos positivos de `Reemplazar datos` en filas vacias.
- `2026-04-16` - `Seleccion` + `Contratacion`: cleanup tecnico local de follow-up QA, tambien sin rerun de baseline. `auth.setup.ts` ya importa la cookie E2E desde la fuente canonica, ambas routes de finalizacion usan `getSession()` directo y el spec `@publish` de finalizacion controlada ya no depende de la visibilidad efimera del paso `esperando_respuesta` para pasar con mocks rapidos.
- `2026-04-15` - finalizacion/Supabase RLS: fix local urgente para `formatos_finalizados_il`. Las 5 routes de finalizacion dejaron de insertar `user.email` como `usuario_login`; ahora resuelven el login canónico desde `app_metadata` o `profesionales` mediante `src/lib/finalization/finalizationUser.ts`. Cobertura local cerrada con `npx vitest run` sobre helper + rutas (`28/28`) y `npx eslint` sobre los archivos tocados. Siguiente paso real: desplegar y retestar finalizacion en producción con un usuario no admin.

---

## Fase 0 — Completada ✅

- [x] Setup Next.js 16 + TypeScript + Tailwind v4
- [x] Paleta de colores RECA (#81398A) en globals.css
- [x] Dependencias: Supabase JS, React Hook Form, Zod, lucide-react, shadcn utils
- [x] Página de login (`/`) — UI completa con validación Zod
- [x] Hub / menú principal (`/hub`) — 9 tarjetas de formularios
- [x] Estructura de carpetas del proyecto
- [x] Documentación: CLAUDE.md + archivos memory/
- [x] Reordenar Notion con capa canónica corta (`00` a `80`) para contexto rápido, backlog, QA y referencias

---

## Fase 1 — Autenticación con Supabase ✅ COMPLETA

- [x] `.env.local` con URL y publishable key (formato `sb_publishable_...`, NO anon JWT)
- [x] `src/lib/supabase/client.ts` — cliente browser con `@supabase/ssr`
- [x] `src/lib/supabase/server.ts` — cliente server con cookies
- [x] `src/proxy.ts` (≡ middleware) — protege `/hub` y `/formularios/*`, redirige si hay sesión en `/`
- [x] `src/hooks/useAuth.ts` — expone `user`, `session`, `loading`, `signOut()`
- [x] `LoginForm.tsx` — lookup `usuario_login` en tabla `profesionales`, luego `signInWithPassword()`
- [x] `HubMenu.tsx` — nombre de usuario desde sesión, logout funcional
- [x] Usuario de prueba: `aaron_vercel` / `Password1234`

---

## Fase 2 — Búsqueda de empresa (Section 1) ✅ COMPLETA

- [x] Input de búsqueda con debounce (300ms) en tabla `empresas` (1134 registros)
- [x] Lista de resultados con selección (nombre, NIT, ciudad, sede)
- [x] Al seleccionar: guarda empresa en Zustand store + `sessionStorage`
- [x] `src/lib/store/empresaStore.ts` — persiste en `sessionStorage`
- [x] Ruta dinámica `/formularios/[slug]` → renderiza `Section1Form`
- [x] Al seleccionar empresa → navega a `/formularios/[slug]/seccion-2`

---

## Fase 3 — Componentes UI base (shadcn/ui) ✅ COMPLETA

- [x] shadcn/ui inicializado con Tailwind v4
- [x] Button, Input, Textarea, Select, Checkbox, Label, Badge, Alert
- [x] `src/components/ui/FormField.tsx` — wrapper label+input+error+hint
- [x] `src/components/layout/FormWizard.tsx` — barra de progreso multi-paso

---

## Fase 4 — Formulario piloto: Presentación/Reactivación ✅ COMPLETA

- [x] Schema Zod: `src/lib/validations/presentacion.ts`
- [x] `PresentacionForm.tsx` migrado a documento largo de una sola página
- [x] Ruta canónica `/formularios/presentacion`
- [x] Ruta legacy `/formularios/presentacion/seccion-2` redirige preservando `draft`, `session` y `new`
- [x] Búsqueda y selección de empresa integradas dentro del mismo documento
- [x] Navegación lateral por secciones en desktop + navegación compacta en móvil
- [x] Textareas largos autoexpandibles como estándar para formularios largos
- [x] Flujo Google Sheets: copia template → escribe celdas → checkboxes → PDF → Drive
- [x] Guarda en `formatos_finalizados_il` en Supabase
- [x] Pantalla de éxito con links al Sheet y PDF

---

## Fase 4.1 — MVP piloto de Presentación/Reactivación

- [x] Dejar comparativa legacy vs web en Notion para `Presentación/Reactivación`
- [x] Dejar matriz de mapping `maestro vs legacy vs web`
- [x] Cerrar decisión de mapping: el maestro vivo es la única fuente oficial de verdad
- [x] Cerrar decisión de validación: asistentes flexibles en `presentacion`
- [x] Crear checklist operativo del MVP piloto
- [x] Definir convención de trabajo por sesiones y fases en Notion
- [x] Implementar autoajuste de altura para filas modificadas en Google Sheets
- [x] Implementar Fase 1.5 de finalización: un solo spreadsheet por empresa en Drive
- [x] Reutilizar spreadsheet existente de la empresa cuando ya existe
- [x] Duplicar pestaña desde el maestro cuando la pestaña objetivo ya está ocupada
- [x] Ocultar pestañas no usadas antes de exportar PDF
- [x] Devolver link directo a la pestaña usada en el spreadsheet final
- [x] Validar `acuerdos_observaciones` largos en Sheet y PDF
- [x] Validar crecimiento de asistentes por encima del bloque base
- [x] Definir arquitectura de payloads: base común compartida + adaptador por formulario
- [x] Refactorizar `presentacion` y `sensibilizacion` para usar la base común de finalización
- [x] Agregar tests mínimos para helpers de Sheets y payloads
- [x] Validar reutilización real del spreadsheet de empresa en Drive
- [x] Validar que el PDF final ya no incluya pestañas no usadas
- [x] Ejecutar QA piloto de `Presentación/Reactivación`
- [x] Abrir pruebas con usuarios

---

## Fase 4.2 — UX transversal de borradores + performance de finalización ✅ COMPLETA

- [x] Mover acción de guardado al panel de navegación de formularios largos
- [x] Mostrar estado separado de último cambio local y último cambio en la nube
- [x] Reutilizar `DraftPersistenceStatus` dentro del panel de navegación de formularios largos
- [x] Instrumentar tiempos del flujo de finalización en `presentacion` y `sensibilizacion`
- [x] Medir costo de: Drive folder lookup, spreadsheet lookup/create, tab resolution, writes, PDF export y persistencia final
- [x] Proponer y aplicar recorte de pasos no necesarios en web frente al legacy
- [x] Validar contra la tabla viva que `formatos_finalizados_il` acepta el insert mínimo útil
- [x] Mover `payload_raw` a Google Drive en `.reca_payloads` sin crear columnas nuevas
- [x] Guardar referencia `raw_payload_artifact` dentro de `payload_normalized.metadata`
- [x] Corregir acciones de pantalla final bloqueadas por pop-ups/navegación (`Abrir acta`, `Abrir PDF`, `Abrir acta y PDF`, `Volver al menú`)

---

## Fase 4.3 — Estabilización urgente de borradores y recarga ✅ COMPLETA

- [x] Corregir la recarga/refresh sin warning cuando existen cambios locales o checkpoints pendientes y evitar que el usuario asuma que no hubo guardado
- [x] Evitar que el hub muestre dos borradores del mismo proceso (`local` + `sincronizado`) cuando en realidad representan el mismo trabajo mediante alias `session -> draft` y reconciliación por identidad lógica
- [x] Evitar que un guardado colgado o interrumpido deje dos drafts remotos con IDs distintos para el mismo proceso lógico reutilizando identidad persistida antes de crear un draft remoto nuevo
- [x] Corregir la divergencia entre estado visual de sync y persistencia real cuando el draft sí se guarda en Supabase pero la UX sigue mostrando una variante local paralela
- [x] Corregir el flujo de `Guardar borrador` para trabajo incompleto sin colgar la UI: timeout visible de 15s, preflight local y retry sobre la misma identidad lógica
- [x] Evitar que cerrar la pestaña durante un guardado colgado deje un draft remoto más actualizado y otro local rezagado del mismo proceso lógico
- [x] Corregir el desacople entre contador de borradores y contenido real del hub/drawer (`contador=3`, lista visible=2`) unificando ambos sobre la misma proyección recuperable
- [x] Corregir el drawer/pestaña de drafts que a veces queda bloqueado y no cierra correctamente pasando el estado a `HubMenu` y sincronizando `?panel=drafts` con `router.replace`
- [x] Ajustar `Volver al menú` en pantalla final para que recupere el foco del hub ya abierto; solo navegar en la pestaña actual si no existe hub disponible
- [x] Eliminar también la copia local, alias e índices al finalizar o borrar un draft para evitar drafts fantasma después de borrar la fila remota en Supabase
- [x] Validar manualmente en `Presentación` que reload con warning, recuperación del mismo draft, deduplicación, contador del hub y limpieza post-finalización quedaron funcionando
- [x] Corregir el cuelgue del flujo `Finalizar` cuando falla la validación del asesor en asistentes moviendo el checkpoint del submit inválido a background y evitando `reset(...)`/`await saveDraft(...)` dentro de `onInvalid`
- [x] Hacer que el hub vuelva siempre a `/hub` y no preserve `?panel=drafts` después de abrir un borrador desde el drawer
- [x] Limpiar el warning de CSP del preview permitiendo `https://vercel.live` solo en `VERCEL_ENV=preview`
- [x] Ejecutar retest manual del preview nuevo para confirmar que `Finalizar` con asesor faltante ya no cuelga la UI ni muestra runtime error, y que el hub refresca cerrado en `/hub`
- [x] Mantener `Sensibilización` fuera del frente urgente de QA funcional mientras siga como wizard y no vuelva a prioridad

### Cierre de fase

- QA manual cerró el bug crítico del asesor en `Presentación`: blur vacío sin crash, `Finalizar` vuelve a bloquear correctamente y no se observaron duplicados.
- La causa raíz quedó corregida en `src/lib/validationNavigation.ts`, endureciendo la navegación de errores frente a arrays dispersos de RHF.
- Próximo frente recomendado: retomar backlog UX/UI pendiente no bloqueante, empezando por confirmación previa a `Finalizar` y transición visible en login.

---

## Fase 5 — Migrar los formularios restantes

Base transversal ya cerrada para las siguientes migraciones:
- `LONG_FORM_SLUGS` + `isLongFormSlug()` centralizados
- `LongFormShell` y estados reutilizables para formularios largos
- `src/lib/longFormHydration.ts` + módulos `<slug>Hydration.ts`
- módulos `<slug>Sections.ts` para labels, completitud y compatibilidad de drafts
- [x] Motor compartido de Google Sheets con `templateBlockInsertions` para duplicar bloques completos del template dentro de una misma pestaña
- [x] Base lógica + visual para personas repetibles (`src/lib/repeatedPeople.ts` + `RepeatedPeopleSection`)

**Orden sugerido** (de menor a mayor complejidad):

| # | Formulario | Slug | Estado |
|---|---|---|---|
| 1 | Sensibilización | `sensibilizacion` | ✅ S1-S6 cerradas; baseline lista para siguientes migraciones |
| 2 | Inducción Operativa | `induccion-operativa` | ✅ En preview; tarjeta habilitada en hub del corte vigente |
| 3 | Inducción Organizacional | `induccion-organizacional` | ✅ En preview; tarjeta habilitada en hub del corte vigente |
| 4 | Evaluación de Accesibilidad | `evaluacion` | ⏳ Pendiente |
| 5 | Contratación Incluyente | `contratacion` | ✅ F3 local cerrado; pendiente QA/push |
| 6 | Selección Incluyente | `seleccion` | ✅ F4 local cerrado; pendiente QA/push |
| 7 | Condiciones de la Vacante | `condiciones-vacante` | ⏳ Pendiente |
| 8 | Seguimientos | `seguimientos` | ⏳ Pendiente (lógica sub-registros) |

Siguiente frente recomendado dentro de esta fase: ejecutar QA manual sobre el preview vigente de inducciones y decidir exposición en hub después de ese corte.

**Checklist de avance**

- [x] Sensibilización (`sensibilizacion`) — baseline productivo cerrado
- [x] Inducción Operativa (`induccion-operativa`)
- [x] Inducción Organizacional (`induccion-organizacional`)
- [ ] Evaluación de Accesibilidad (`evaluacion`)
- [x] Contratación Incluyente (`contratacion`)
- [x] Selección Incluyente (`seleccion`)
- [ ] Condiciones de la Vacante (`condiciones-vacante`)
- [ ] Seguimientos (`seguimientos`)

**Para cada formulario:**
1. Leer `formularios/<nombre>/<nombre>.py` en el repo original
2. Extraer campos + validaciones → schema Zod
3. Extraer mapeo a columnas Sheets → API route
4. Construir `<Nombre>Form.tsx` usando los componentes reutilizables:
   - `useFormDraft` para autosave + borradores
   - `AsistentesSection` para la sección de asistentes
   - `DictationButton` para campos de texto largos
   - documento largo como estándar productivo
   - `DraftPersistenceStatus`, `DraftLockBanner`, `FormSubmitConfirmDialog` y `FormCompletionActions` cuando apliquen
5. Testear flujo completo (Sheets + Drive + Supabase)

### Fase 5.1 — Convergencia de Sensibilización a estándar productivo

- [x] S0 — Alinear `legacy vs web vs maestro vivo` y cerrar la estructura final del documento largo
  - Cierre: contraste `legacy vs web vs maestro vivo` y estructura final documentados en `memory/sensibilizacion_s0.md`; verificados nombre real de pestaña y drift del bloque `Temas`
- [x] S1 — Reemplazar el wizard por shell de documento largo con navegación lateral por secciones
  - Cierre: `Sensibilización` ya usa shell largo reutilizable, ruta canónica `/formularios/sensibilizacion`, redirect legacy desde `seccion-2`, compatibilidad de drafts por mapping `step -> section`, sin bloques `Temas`/`Registro fotográfico` y sin exportación de PDF
- [x] S2 — Cerrar el contenido definitivo útil dentro del patrón canónico (`empresa`, `datos de la visita`, `observaciones`, `asistentes`) y retirar residuos del legacy ya descartados
  - Cierre: `Sensibilización` quedó reducida a los bloques útiles del acta, sin `Temas`, sin `Registro fotográfico`, sin exportación de PDF y con QA manual aprobada para guardado, takeover y finalización
- [x] S3 — Endurecer navegación de validación, borradores y submit inválido dentro del nuevo layout
  - Cierre: contrato de asistentes endurecido a mínimo 2 filas significativas con `nombre + cargo`, navegación de errores ya no depende de `step`, restore/checkpoint de `Sensibilización` usan precedencia explícita y la finalización sanea filas vacías antes de escribir en Google Sheets
- [x] S4 — Completar pruebas del contrato productivo reutilizable (`normalize`, `validation target`, helpers extraídos)
  - Cierre: `AsistentesSection` ahora exige `mode` explícito por formulario, `Sensibilización` usa `Profesional RECA + asistentes libres`, `Presentación/Reactivación` preserva `Profesional RECA + Asesor Agencia`, los defaults/restore se centralizaron en `src/lib/asistentes.ts` y el shell largo quedó cubierto con tests puros y de render
- [x] S5 — Ejecutar QA funcional + QA de regresión de plataforma y validar preview si aplica
  - Cierre: QA manual aprobada sobre el preview `reca-inclusion-laboral-nuevo-7q9fv787c-auyabans-projects.vercel.app`; `Sensibilización` validó asistentes libres, restore de borradores sin reintroducir asesor, estabilidad de `Presentación` y finalización correcta a Google Sheet
- [x] S6 — Cerrar documentación y promover el playbook como base para `Inducción Operativa`
  - Cierre: `MEMORY`, `roadmap`, `forms_catalog`, `form_production_standard` y Notion quedaron sincronizados; `Sensibilización` deja de tener fases pendientes y se toma como baseline para la siguiente migración

### Fase 5.2 — Integración shared de `usuarios_reca`

- [x] Crear módulo shared `src/lib/usuariosReca.ts` con normalización de cédula, deduplicación por `cedula_usuario`, mappers de `Seleccion`/`Contratacion` y contratos mínimos futuros para inducciones/seguimientos
- [x] Crear `src/lib/usuariosRecaServer.ts` con lectura por prefijo de cédula, detalle por cédula y upsert vía service role
- [x] Agregar `GET /api/usuarios-reca` y `GET /api/usuarios-reca/[cedula]` como rutas autenticadas para lookup web
- [x] Integrar sync best-effort a `usuarios_reca` en `POST /api/formularios/seleccion` y `POST /api/formularios/contratacion`
- [x] Integrar lookup manual por cédula en `Contratacion` con `Cargar datos`, banner de warning y highlight amarillo sobre campos modificados respecto al snapshot cargado
- [x] Extender el lookup manual por cédula a `Seleccion` con el mismo patrón de snapshot/warning/highlight
- [x] Dejar lista la infraestructura shared para que `Inducción Operativa`, `Inducción Organizacional` y `Seguimientos` reutilicen el mismo contrato cuando se migren

### Fase 5.3 — Paridad legacy y smoke E2E local

- [x] Extraer y cubrir con tests la configuración de sync legacy de dropdowns prefijados de `Seleccion`
- [x] Agregar Playwright v1 como smoke E2E local para `hub`, `Seleccion` y `Contratacion`
- [x] Agregar `data-testid` puntuales para estabilizar selectors de gates, cards repetibles, lookup por cédula, banners de snapshot y botón `Test`

### Fase 5.4 — Hardening post-smoke de `Seleccion` + `Contratacion`

- [x] Extraer la configuración de sync prefijado de `Contratacion` a `src/lib/contratacionPrefixedDropdowns.ts` y cubrirla con tests unitarios
- [x] Mover el bypass E2E a env server-only (`E2E_AUTH_BYPASS`) y alinearlo entre `src/proxy.ts` y las routes read-only de `usuarios-reca`
- [x] Endurecer utilidades puras con fecha dinámica para `manualTestFill`, cobertura del feature flag y test directo de `syncRepeatedPeopleRowOrder`
- [x] Expandir Playwright para cubrir el flujo `click sugerencia -> Cargar datos` y corregir el lookup local para no cerrar sobre una cédula vieja

### Fase 5.5 — Inducciones Organizacional + Operativa

- [x] F0 — Alinear `legacy vs maestro vivo` y cerrar el target conjunto del lote
  - Cierre: `memory/inducciones_f0.md` ya documenta el contrato canónico del frente. Quedó cerrada la decisión de 1 solo vinculado en web, lookup manual low-egress a `usuarios_reca`, asistentes genéricos, observaciones largas con dictado, botones masivos como alcance obligatorio y slices separados por formulario después de una sola base compartida.
- [x] F1 — Construir la base compartida de inducciones
  - Cierre: ya existe la fundación shared oculta para `Inducción Organizacional` + `Inducción Operativa`. El repo ahora tiene `src/lib/inducciones.ts` con contratos/defaults/normalización de la base común, helpers específicos de `usuarios_reca` para vinculado singular y bloques UI reutilizables `InduccionCompanySection` + `InduccionLinkedPersonSection`, manteniendo ambas inducciones fuera de `LONG_FORM_SLUGS`, del hub y de cualquier endpoint productivo mientras F2/F3 montan sus slices específicos.
  - [x] F2 — Implementar `Inducción Organizacional` de extremo a extremo
    - Cierre: `Inducción Organizacional` ya quedó montada como long form modular con root lazy, hook de estado, presenter, sections, schema Zod, navegación de validación, route `POST`, payload helper y sheet helper para `6. INDUCCIÓN ORGANIZACIONAL`. El slice reutiliza la base shared de empresa/vinculado/asistentes, mantiene `usuarios_reca` en solo lectura y conserva el formulario oculto en el hub mientras se cierra el hardening del lote.
  - [x] F3 — Implementar `Inducción Operativa` de extremo a extremo
    - Cierre: `Inducción Operativa` ya quedó montada con el mismo patrón modular, incluyendo sync puro de dropdowns acoplados en `section_4`, route `POST`, payload helper y sheet helper para `7. INDUCCIÓN OPERATIVA`. La validación local del lote de inducciones pasó `vitest` focal (`41/41`), `eslint`, `npm run spellcheck` y `npm run build`, manteniendo el `HubMenu` oculto hasta `F4/F5`.
- [x] F4 — Ejecutar hardening técnico conjunto
- [ ] F5 — Abrir preview, QA manual y cierre documental del lote
  - Estado actual: preview vigente en `https://reca-inclusion-laboral-nuevo-ibf3dbs8t-auyabans-projects.vercel.app` con inspector `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/7GAcfTfJFVKYhZwKDhGXJBeR4QKz`; pendiente QA manual y cierre final del lote

---

## Fase 6 — Google Drive (subida de PDFs) ✅ COMPLETA

- [x] Generar PDF desde Google Sheet (exportar como PDF via Drive API)
- [x] Subir PDF a carpeta Drive de la empresa
- [x] Link al PDF en pantalla de éxito
- [x] Integrado en API route de Presentación como patrón estándar

---

## Fase 7 — Borradores y autosave ✅ COMPLETA

- [x] `useFormDraft` hook — autosave localStorage (debounce 800ms) + borradores Supabase
- [x] Tabla `form_drafts` en Supabase con RLS
- [x] `DraftBanner` — detecta borrador al entrar, ofrece Restaurar/Descartar
- [x] Botón "Borrador" en header del formulario
- [x] `clearDraft()` al finalizar el formulario
- [x] Optimización low-egress de borradores y catálogos — hub/count metadata-only + caché de `profesionales` y `asesores`
- [x] Hub persistente con drawer de borradores y deep link `?panel=drafts`
- [x] Apertura de formularios y borradores en nuevas pestañas desde el hub
- [x] Compatibilidad `/hub/borradores` → `/hub?panel=drafts`
- [x] Remoción de unicidad legacy en `form_drafts` para permitir múltiples actas del mismo formulario y empresa

---

## Fase 8 — Deploy en Vercel ✅ COMPLETA

- [x] Proyecto en Vercel conectado a GitHub (auto-deploy en push a `main`)
- [x] Variables de entorno configuradas en Vercel
- [x] MCP de Vercel configurado en Codex
- [x] MCP de Supabase configurado en Codex
- [x] URL producción: https://reca-inclusion-laboral-nuevo.vercel.app
- [x] Verificar `GOOGLE_SERVICE_ACCOUNT_JSON` bien formateado en Vercel

---

## Fase 9 — Pulido y features adicionales

- [x] Dictado de voz con OpenAI `gpt-4o-mini-transcribe` via Supabase Edge Function `dictate-transcribe`
  - `DictationButton` componente reutilizable con MediaRecorder API
  - Integrado en formularios con textos largos
- [x] Hardening mínimo de auth y endpoints auxiliares (`/api/auth/lookup`, catálogos autenticados, login y búsqueda de empresas)
- [x] Claridad de borradores: feedback visual de guardado, copy orientado a usuario y badge de borrador activo por formulario
- [x] Confirmación y transición: confirmación previa a `Finalizar`, transición visible de login hacia el hub y preservación del scroll al guardar borrador manualmente
- [x] Pulido visual mobile: indicador de overflow en tabs horizontales de `Presentación` + reset del estado `Guardado` en el botón de borrador
- [x] Hardening post-QA: serializar checkpoints remotos entre guardado manual y automático usando la misma identidad lógica de draft
- [x] Hardening post-QA: unificar modalidad en `Mixta` con compatibilidad de restore para payloads legacy `Mixto`
- [x] Limpieza post-QA: retirar artefactos huérfanos (`FormWizard`, `PresentacionSectionCard`, `PresentacionSectionNav`, `useDraftsCount`) y dejar la documentación alineada al patrón de documento largo
- [ ] Revisión ortográfica (migrar `text_review.py` → Edge Function)
- [ ] Notificaciones de formularios pendientes
- [ ] Vista de historial de actas por empresa
- [ ] Modo offline básico (service worker para borradores)



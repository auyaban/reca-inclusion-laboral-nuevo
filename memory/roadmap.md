---
name: Roadmap de implementación
description: Plan paso a paso de todo lo que queda por construir, en orden de dependencia
type: roadmap
updated: 2026-04-15
---

## Regla operativa

- Este archivo sigue siendo el **roadmap técnico y de dependencias** del proyecto.
- El backlog vivo, el QA abierto y las decisiones/iniciativas activas viven en Notion:
  - `20 — Pendientes priorizados`
  - `30 — QA y validación`
  - `40 — Iniciativas y decisiones`
- Cuando cambie el estado real de una fase, sincronizar roadmap + `memory/MEMORY.md` + la página canónica de Notion correspondiente.

## Actual local breve

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
| 2 | Inducción Operativa | `induccion-operativa` | ⏳ Siguiente frente recomendado |
| 3 | Inducción Organizacional | `induccion-organizacional` | ⏳ Pendiente |
| 4 | Evaluación de Accesibilidad | `evaluacion` | ⏳ Pendiente |
| 5 | Contratación Incluyente | `contratacion` | ✅ F3 local cerrado; pendiente QA/push |
| 6 | Selección Incluyente | `seleccion` | ✅ F4 local cerrado; pendiente QA/push |
| 7 | Condiciones de la Vacante | `condiciones-vacante` | ⏳ Pendiente |
| 8 | Seguimientos | `seguimientos` | ⏳ Pendiente (lógica sub-registros) |

**Checklist de avance**

- [x] Sensibilización (`sensibilizacion`) — baseline productivo cerrado
- [ ] Inducción Operativa (`induccion-operativa`)
- [ ] Inducción Organizacional (`induccion-organizacional`)
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

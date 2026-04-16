# QA actual

- Fecha: `2026-04-16`
- Frente: `F5` — QA de `Contratacion` + `Seleccion`
- Branch: `codex/f5-qa-contratacion-seleccion`
- Preview: `https://reca-inclusion-laboral-nuevo-85rvvpkpw-auyabans-projects.vercel.app`
- Inspector: `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/6cebBAPEXh8adseBMKoUu1LXxKqY`
- Estado: el preview vigente ya corresponde al worktree local con Fase 1-10 cerradas del lote pre-prod. Este es el corte correcto para QA manual final antes de push.

## Estado local mas reciente (revalidado)

- `2026-04-16` - follow-up tecnico post-QA revalidado localmente. `auth.setup.ts` ya importa la cookie canonica del bypass E2E, las routes de finalizacion usan `getSession()` directo, el spec `@publish` de finalizacion controlada ya no depende del paso efimero `esperando_respuesta`, el helper E2E de drafts sigue verde sin sleeps fijos y el preview actual para este corte es `https://reca-inclusion-laboral-nuevo-g07zcy4m5-auyabans-projects.vercel.app` con inspector `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/6MoiYkZ169w9TkvQPhQkDBSEn9aQ`.
- Baseline final revalidado:
  - `npm run lint` OK
  - `npm run spellcheck` OK
  - `npm run test` OK (`481/481`)
  - `npm run test:e2e` OK (`36/36`)
  - `npm run build` OK
- Ajustes adicionales del rerun:
  - `cspell.config.json` amplio el vocabulario para el texto nuevo documentado en `memory/`.
  - `src/lib/usuariosReca.test.ts` corrigio un regression case que estaba probando mal el sentinela `tipo_pension = "No aplica"` junto con `cuenta_pension = "No"`.
  - `e2e/drafts-lifecycle.spec.ts` ahora valida preservacion de contexto por viewport del bloque activo en vez de depender de un umbral fragil de `scrollY`.
- Ruido conocido no bloqueante: `npm run test:e2e` sigue imprimiendo logs del webserver por `/api/usuarios-reca` cuando faltan envs reales de Supabase y algun flujo toca rutas no mockeadas; la suite pasa completa y el harness esperado sigue cubierto.

## Estado local mas reciente

- `2026-04-16` - lote pre-prod cerrado localmente hasta Fase 10. `DraftPersistenceStatus` ya expone estado observable para autosave, `waitForDraftAutosave()` dejo de depender de sleeps, `DraftsHub.tsx` alinea su naming interno, `RepeatedPeopleSection` evita closures stale de `renderRow` sin romper performance y `Condiciones de la Vacante` ya muestra `Agregar fila` al final del bloque. Tambien se alinearon los specs de finalizacion controlada y recomendaciones de `Seleccion`, y `ContratacionNarrativeSection` recupero `data-testid` para `ajustes_recomendaciones`.
- Baseline final local:
  - `npm run lint` OK
  - `npm run spellcheck` OK
  - `npm run test` OK (`475/475`)
  - `npm run test:e2e` OK (`36/36`)
  - `npm run build` OK
- Ruido conocido no bloqueante: durante `npm run test:e2e` siguen apareciendo logs del webserver por `api/usuarios-reca` sin envs reales de Supabase cuando el flujo cae en rutas no mockeadas; los specs pasan y el comportamiento esperado sigue cubierto por mocks/harness actual.
- Siguiente paso recomendado: crear preview nuevo desde este worktree y ejecutar QA manual final pre-push sobre ese deploy, no sobre los previews anteriores.

## Hallazgos aplicados localmente

- `Contratacion`: corregido `grupo_etnico=Si + grupo_etnico_cual="No aplica"` para que siga siendo válido en normalización, validación y export a Sheet.
- `Seleccion`: corregido `extra_name` para nombres compuestos con un solo apellido (`Ana Maria Lopez` -> `Ana Lopez`).
- `Contratacion` y `Seleccion`: agregada cobertura de `409 in_progress` + header `Retry-After` en las routes.
- `Contratacion` y `Seleccion`: `requestHash` ahora se calcula sobre `reviewedFormData`, no sobre el payload pre-textReview.
- `Contratacion` y `Seleccion`: `buildSection1Data`, `toEmpresaRecord` y el runner Google pasaron a `src/lib/finalization/routeHelpers.ts`.
- Hooks de `Seleccion` y `Contratacion`: se retiró el `useWatch({ control })` global y se limitó el watch al subset necesario para status/nav.
- `Contratacion`: `parsed_raw.extra_name` quedó alineado al legacy (`nombre completo` en individual, total en grupal).
- `Seleccion` y `Contratacion`: el criterio de `valor significativo` ya sale de `src/lib/repeatedPeople.ts`, evitando drift entre validaciones y helpers compartidos.
- `Contratacion`: agregado test de schema real para `grupo_etnico="Si" + grupo_etnico_cual="No aplica"`; ya no depende solo de un test de normalización.
- `Seleccion` y `Contratacion`: las routes ahora pasan `empresaRecord` a `buildSection1Data`, alineando el helper con la fuente semánticamente correcta.
- `usuarios_reca`: `Seleccion` ya sincroniza a `usuarios_reca` al finalizar y `Contratacion` ya consume por cédula con `Cargar datos`, warning por card y highlight amarillo sobre campos modificados respecto al snapshot cargado.
- Hub: `Seleccion` y `Contratacion` ya no quedan como `Próximamente`; el bloqueo estaba solo en `src/components/layout/HubMenu.tsx` con `available: false`, no en las routes ni en `LONG_FORM_SLUGS`.
- `usuarios_reca` hardening: el sync final ya no bloquea `formatos_finalizados_il`, `certificado_porcentaje` trata `45` y `45%` como equivalentes para prefill/highlight, el detalle usa `Cache-Control: private, no-store`, `useUsuariosRecaSearch` aborta fetch en vuelo y `usuariosRecaServer` reutiliza un admin client lazy por módulo.
- `Seleccion` y `Contratacion`: el contenedor ahora abre con gate liviano y carga diferida del editor completo, reduciendo el costo inicial antes de seleccionar empresa o restaurar borrador.
- `Seleccion` y `Contratacion`: el bloque repetible ya reindexa correctamente al agregar o borrar personas; el caso reportado donde “borrar oferente” solo reabría la card quedó cubierto.
- `Seleccion` y `Contratacion`: las cards repetibles ya no duplican la identidad visual en header + banda interna; ahora el header conserva `Oferente/Vinculado N` como identificador principal y muestra `nombre + cedula` como resumen secundario cuando existen.
- Cleanup QA tecnico: `auth.setup.ts` ya usa la cookie canonica del bypass E2E, las routes de finalizacion dejaron el ternario defensivo de `getSession` y el spec `@publish` exitoso ya no depende del paso visual efimero `esperando_respuesta` cuando la respuesta mockeada es inmediata.
- `Contratacion`: el lookup por cédula ahora deja explícito el uso de `Cargar datos` y también responde al presionar `Enter`.
- `usuarios_reca`: la detección de `Reemplazar datos` ahora ignora sentinelas derivados (`grupo_etnico_cual = "No aplica"` sin grupo afirmativo y `tipo_pension = "No aplica"` sin pension afirmativa), evitando warnings falsos en filas visualmente vacías.
- `Contratacion`: se portó la sincronización verificada del legacy para grupos de dropdowns prefijados (`0-3/No aplica` y pares equivalentes); al cambiar un valor, los campos hermanos del mismo grupo se alinean.
- `Seleccion`: ahora tambien consume `usuarios_reca` con el mismo patron de `Contratacion` (`Cargar/Reemplazar datos`, warning por card y highlight amarillo cuando el valor final diverge del snapshot).
- `Seleccion`: la sincronizacion legacy de dropdowns prefijados ya quedo extraida a contrato testeable (`src/lib/seleccionPrefixedDropdowns.ts`) y cubierta con tests directos.
- `Seleccion` y `Contratacion`: se agregó botón local de `Test` para rellenar datos mínimos útiles en entornos no productivos y acelerar QA manual.
- `Seleccion` y `Contratacion`: las notas ya no son obligatorias ni a nivel raíz ni dentro de cada persona repetible.
- Playwright v1: el repo ya tiene smoke E2E local para `hub`, gate liviano, add/remove/collapse de repetibles, lookup por cédula en `Seleccion` + `Contratacion`, sync de dropdowns prefijados y botón `Test`.
- `Contratacion`: las reglas de sync prefijado ya no viven en el componente; quedaron extraídas a `src/lib/contratacionPrefixedDropdowns.ts` con tests directos, alineando el patrón arquitectónico con `Seleccion`.
- E2E auth/local: el bypass ya no depende de `NEXT_PUBLIC_E2E_AUTH_BYPASS`; ahora usa `E2E_AUTH_BYPASS` server-side, se comparte entre `src/proxy.ts` y las routes read-only de `usuarios-reca`, y quedó documentado en `.env.local.example`.
- Utilidades puras: `manualTestFill` ahora usa fecha dinámica (con override opcional por env) y `repeatedPeople.test.ts` ya cubre `syncRepeatedPeopleRowOrder` con `orderField`.
- `UsuarioRecaLookupField`: el flujo `click sugerencia -> Cargar datos` ya usa un `lookupValue` local sincronizado con RHF, evitando cierres sobre cédulas viejas y dejando estable el lookup manual de `Seleccion`.
- Playwright: `usuarios-reca.spec.ts` ahora cubre tanto `Enter` como click sobre sugerencia de autocompletado.
- `Seleccion`: `SeleccionRecommendationsSection` ya quedó reordenada como flujo guiado en tres bloques (`Bloques rápidos`, `Sugerencias para esta persona`, `Texto final de ajustes`) con preview expandible usable en móvil, manteniendo `ajustes_recomendaciones` como texto libre final.
- `Seleccion` y `Contratacion`: ambos hooks ya guardan view-state efímero por ruta/sesión para preservar scroll, sección activa y contexto cuando se restaura un draft o se vuelve después de focus-out/reload.
- `Seleccion` y `Contratacion`: los rows ya tratan `edad` como campo derivado/no editable desde `fecha_nacimiento`; `Seleccion` usa `fecha_firma_contrato` como texto libre y fuerza `tipo_pension = "No aplica"` cuando `cuenta_pension = "No"`, mientras `Contratacion` deja `fecha_fin` como texto opcional.
- Finalización: el diálogo posterior a confirmar ahora muestra pasos coarse client-side y tiempo transcurrido; si la publicación falla, el error queda anclado cerca de las acciones de finalización y no solo arriba del shell.
- Copy y exportación: `LoginForm` ya corrige ortografía/tildes visibles, `textReview` amplió la cobertura de `condiciones_vacante` a campos libres como `nombre_vacante`, horarios, días y observaciones, y `Seleccion` + `Contratacion` ahora comparten un helper de decimal-to-Sheets para exportar `certificado_porcentaje` como número consistente.

## Decisiones de verificación cerradas

- `VINCULADO N` en `Contratacion`: `no cambiar`. El legacy local escribe solo el título grupal en `F1` y el bloque dinámico de celdas; no hay evidencia de que agregue encabezados `VINCULADO N` por bloque.
- `extra_name` en `contratacionPayload`: `sí cambiar`. El legacy local sí retorna `extra_name` en individual y grupal; el web ya quedó alineado.
- `extra_name` entre formularios: `no alinear`. `Seleccion` mantiene `primer nombre + ultimo apellido` y `Contratacion` mantiene `nombre completo` porque así ya opera el legacy en cada formulario.

## Verificar

- `Contratacion` individual: 1 vinculado, `desarrollo_actividad` unico, asistentes minimos, finalizacion con Sheet + PDF.
- `Contratacion` grupal: 2 o mas vinculados, bloques repetibles correctos, corrimiento de secciones posteriores y salida final consistente.
- `Seleccion` individual: 1 oferente, `ajustes_recomendaciones` + `nota`, `desarrollo_actividad` unico y finalizacion con Sheet + PDF.
- `Seleccion` grupal: 2 o mas oferentes, bloques repetibles correctos, corrimiento de secciones posteriores y salida final consistente.
- En ambos formularios: redirect desde `/formularios/[slug]/seccion-2`, guardado manual, autosave, recarga, restore, takeover y salto al primer error correcto.
- En ambos formularios: add/remove/collapse del bloque repetible y reinicio de la ultima persona visible en vez de dejar el array en cero.
- `Contratacion`: lookup por cédula en `usuarios_reca`, carga manual de datos, reemplazo de una fila ya diligenciada y desaparición del highlight amarillo cuando el usuario vuelve al valor original.
- `Seleccion`: la finalización exitosa debe mantenerse aunque falle el sync best-effort a `usuarios_reca`; el error debe quedar solo en logs/profiler y no duplicar operaciones de Google en el retry.
- `Seleccion` y `Contratacion`: el gate inicial debe aparecer rápido, sin montar todavía el editor completo; al seleccionar empresa o restaurar `draft/session`, el formulario debe pasar al loader `Abriendo formulario`.
- `Contratacion`: el lookup por cédula debe permitir `Enter` además del botón `Cargar datos`, y los campos con snapshot cargado deben seguir resaltando solo cuando el valor final diverge realmente del snapshot.
- `Seleccion` y `Contratacion`: el botón de `Test` debe estar visible solo fuera de producción y debe rellenar un payload mínimo válido para acelerar pruebas manuales.
- `Seleccion`: validar lookup manual por cédula con `Cargar/Reemplazar datos`, warning por card y desaparicion del highlight al volver al valor original.
- `Seleccion`: validar la sincronizacion de dropdowns prefijados en grupos representativos (`aseo_*`, `instrumentales_*`, `actividades_*`, `discriminacion_*`) sin afectar `controles_frecuencia`, `desplazamiento_transporte` ni `ubicacion_aplicaciones`.
- `Seleccion`: validar que los `Bloques rápidos` permitan ver contenido antes de insertar y que el texto manual en `ajustes_recomendaciones` no se sobrescriba al agregar helpers o sugerencias.
- `Seleccion` y `Contratacion`: validar que reload/restore con el usuario trabajando abajo en el formulario ya no lo devuelva al inicio; debe conservar el bloque donde venía trabajando.
- `Seleccion`: validar que `edad` se recalcula al cambiar `fecha_nacimiento`, que no se puede editar manualmente y que `fecha_firma_contrato = "Por definir"` se conserva visualmente.
- `Seleccion`: validar que `cuenta_pension = "No"` setea y bloquea `tipo_pension = "No aplica"`, y que al volver a `Si` el select se reactiva y exige una opción distinta.
- `Contratacion`: validar que `edad` se recalcula al cambiar `fecha_nacimiento` y que `fecha_fin` acepta texto libre o vacío sin error visual.
- `Seleccion` y `Contratacion`: validar que al publicar aparezcan pasos y tiempo transcurrido; si falla la publicación, el error debe quedar cerca de `Finalizar` y no obligar a buscarlo arriba.
- Login: validar copy visible con tildes correctas (`Iniciar sesión`, `Contraseña`, mensajes de error y footer).
- `Condiciones de la Vacante`: validar que textos libres típicos como horarios, `de lunes a viernes`, `por definir` y observaciones sigan pasando por el corrector ortográfico sin alterar campos numéricos o estructurados.
- `Seleccion` y `Contratacion`: validar en Sheets que `certificado_porcentaje` salga como número coherente cuando la persona digita `45`, `45%`, `45,5` o `45.5`.

## Baseline validado

- `npm run spellcheck` OK
- `npm run test -- src/components/layout/HubMenu.test.tsx` OK
- `npm run lint` OK
- `npm run test` OK (`416/416`)
- `npm run build` OK

## Estado local del follow-up

- `npm run lint` OK
- `npx vitest run src/lib/contratacion.test.ts src/lib/seleccion.test.ts src/lib/finalization/contratacionPayload.test.ts src/app/api/formularios/seleccion/route.test.ts src/app/api/formularios/contratacion/route.test.ts` OK (`24/24`)
- `npm run build` OK
- `npm test` OK (`396/396`)
- `npm run lint` OK
- `npm run test` OK (`409/409`)
- `npm run build` OK
- `npm run spellcheck` OK
- `npx vitest run src/components/forms/SeleccionForm.test.tsx src/components/forms/SeleccionFormEditor.test.tsx src/components/forms/ContratacionForm.test.tsx src/components/forms/ContratacionFormEditor.test.tsx` OK (`14/14`)
- `npm run lint` OK
- `npm run spellcheck` OK
- `npm run test` OK (`429/429`)
- `npm run build` OK
- `npm run test:e2e` OK (`10/10`)
- `npm run lint` OK
- `npm run test` OK (`439/439`)
- `npm run build` OK
- `npm run spellcheck` OK
- `npm run lint` OK
- `npm run test` OK (`447/447`)
- `npm run test:e2e` OK (`11/11`)
- `npm run build` OK
- `npm run spellcheck` OK
- `Seleccion`: `RepeatedPeopleSection` ahora observa cada row de forma aislada y usa helpers dedicados para insercion/reindexado, reduciendo trabajo global cuando hay multiples oferentes.
- `Seleccion`: `src/lib/seleccionAdjustmentLibrary.ts` centraliza los 22 statements del documento operativo en categorias reutilizables, sugerencias universales y sugerencias por discapacidad detectada.
- `Seleccion`: `SeleccionRecommendationsSection` ya agrupa mejor los bloques legacy, expone previews/contexto de cada bloque y permite agregar recomendaciones especificas sin duplicar contenido existente.
- Playwright: el harness ya cubre smoke de app/formularios, recommendations de `Seleccion`, drafts lifecycle y finalizacion controlada con mocks; `openSeededForm()` espera a que la hidratacion de `?session/?draft` quede estable antes de interactuar.
- `npm run lint` OK
- `npm run spellcheck` OK
- `npm run test` OK (`458/458`)
- `npm run test:e2e` OK (`33/33`)
- `npm run build` OK

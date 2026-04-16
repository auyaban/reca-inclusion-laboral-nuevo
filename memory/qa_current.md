# QA actual

- Fecha: `2026-04-15`
- Frente: `F5` — QA de `Contratacion` + `Seleccion`
- Branch: `codex/f5-qa-contratacion-seleccion`
- Preview: `https://reca-inclusion-laboral-nuevo-3g005998v-auyabans-projects.vercel.app`
- Inspector: `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/BWUZTejopbKXti7eEG3BTtRv267o`
- Estado: el preview vigente sigue siendo la ultima referencia desplegada para QA manual, pero el worktree local ya avanzo mas alla de ese corte. Localmente ya quedaron montados el lookup por cedula en `Seleccion`, la auditoria/cobertura del sync legacy de dropdowns prefijados y Playwright v1 como smoke E2E. No se genero preview nuevo en este cierre.

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
- `Contratacion`: el lookup por cédula ahora deja explícito el uso de `Cargar datos` y también responde al presionar `Enter`.
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

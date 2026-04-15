# QA actual

- Fecha: `2026-04-15`
- Frente: `F5` — QA de `Contratacion` + `Seleccion`
- Branch: `codex/f5-qa-contratacion-seleccion`
- Preview: `https://reca-inclusion-laboral-nuevo-bj3gi27p2-auyabans-projects.vercel.app`
- Inspector: `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/EwrP8SvLTXr9paTcuihcbeUtdNDF`
- Estado: preview nuevo ya disponible con el lote local de fixes QA; pendiente QA manual final de Arquitectura, Dev y funcional sobre este corte

## Hallazgos aplicados localmente

- `Contratacion`: corregido `grupo_etnico=Si + grupo_etnico_cual="No aplica"` para que siga siendo válido en normalización, validación y export a Sheet.
- `Seleccion`: corregido `extra_name` para nombres compuestos con un solo apellido (`Ana Maria Lopez` -> `Ana Lopez`).
- `Contratacion` y `Seleccion`: agregada cobertura de `409 in_progress` + header `Retry-After` en las routes.
- `Contratacion` y `Seleccion`: `requestHash` ahora se calcula sobre `reviewedFormData`, no sobre el payload pre-textReview.
- `Contratacion` y `Seleccion`: `buildSection1Data`, `toEmpresaRecord` y el runner Google pasaron a `src/lib/finalization/routeHelpers.ts`.
- Hooks de `Seleccion` y `Contratacion`: se retiró el `useWatch({ control })` global y se limitó el watch al subset necesario para status/nav.
- `Contratacion`: `parsed_raw.extra_name` quedó alineado al legacy (`nombre completo` en individual, total en grupal).

## Decisiones de verificación cerradas

- `VINCULADO N` en `Contratacion`: `no cambiar`. El legacy local escribe solo el título grupal en `F1` y el bloque dinámico de celdas; no hay evidencia de que agregue encabezados `VINCULADO N` por bloque.
- `extra_name` en `contratacionPayload`: `sí cambiar`. El legacy local sí retorna `extra_name` en individual y grupal; el web ya quedó alineado.

## Verificar

- `Contratacion` individual: 1 vinculado, `desarrollo_actividad` unico, asistentes minimos, finalizacion con Sheet + PDF.
- `Contratacion` grupal: 2 o mas vinculados, bloques repetibles correctos, corrimiento de secciones posteriores y salida final consistente.
- `Seleccion` individual: 1 oferente, `ajustes_recomendaciones` + `nota`, `desarrollo_actividad` unico y finalizacion con Sheet + PDF.
- `Seleccion` grupal: 2 o mas oferentes, bloques repetibles correctos, corrimiento de secciones posteriores y salida final consistente.
- En ambos formularios: redirect desde `/formularios/[slug]/seccion-2`, guardado manual, autosave, recarga, restore, takeover y salto al primer error correcto.
- En ambos formularios: add/remove/collapse del bloque repetible y reinicio de la ultima persona visible en vez de dejar el array en cero.

## Baseline validado

- `npm run spellcheck` OK
- `npm run lint` OK
- `npm run test` OK (`395/395`)
- `npm run build` OK

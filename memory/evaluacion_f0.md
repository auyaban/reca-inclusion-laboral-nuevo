---
name: Evaluación de Accesibilidad F0
description: Contraste legacy vs maestro vivo vs arquitectura web para preparar la migración de Evaluación de Accesibilidad
type: guide
updated: 2026-04-17
---

## Objetivo

Cerrar la fase cero de `Evaluación de Accesibilidad` (`evaluacion`) antes de implementar el formulario web:

1. contrastar mapping legacy vs maestro vivo;
2. inventariar funcionalidad real del runtime legacy;
3. decidir el target arquitectónico dentro del estándar web actual;
4. dejar explícitos los gaps que deben resolverse antes de F1.

## Estado actual en web

- El slug `evaluacion` existe en labels, pero no entra aún al runtime de formularios largos: [src/lib/forms.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/forms.ts:13).
- La tarjeta del hub sigue bloqueada con `available: false`: [src/components/layout/HubMenu.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/layout/HubMenu.tsx:57).
- La ruta canónica `/formularios/[slug]` solo carga los formularios incluidos en `LONG_FORM_SLUGS`; `evaluacion` hoy cae en `Section1Form`: [src/app/formularios/[slug]/page.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/app/formularios/[slug]/page.tsx:63), [src/app/formularios/[slug]/page.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/app/formularios/[slug]/page.tsx:96), [src/app/formularios/[slug]/page.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/app/formularios/[slug]/page.tsx:109).
- La ruta legacy `/formularios/evaluacion/seccion-2` muestra solo placeholder de "en construcción": [src/app/formularios/[slug]/seccion-2/page.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/app/formularios/[slug]/seccion-2/page.tsx:27).

## Baseline arquitectónica obligatoria

- Los formularios nuevos ya no deben nacer como wizard; deben nacer como documento largo: [memory/form_production_standard.md](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/memory/form_production_standard.md:19), [memory/form_production_standard.md](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/memory/form_production_standard.md:170).
- La baseline vigente es `LongFormShell + LongFormSectionNav + LongFormSectionCard`: [memory/form_production_standard.md](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/memory/form_production_standard.md:56), [memory/architecture.md](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/memory/architecture.md:50).
- `AsistentesSection` debe montarse con `mode` explícito; no debe asumir semántica por defecto: [memory/form_production_standard.md](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/memory/form_production_standard.md:23), [memory/form_production_standard.md](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/memory/form_production_standard.md:108).
- Los campos narrativos largos deben reutilizar `LongTextField` + `DictationButton`: [src/components/forms/shared/LongTextField.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/LongTextField.tsx:18), [src/components/forms/shared/LongTextField.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/LongTextField.tsx:91), [memory/architecture.md](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/memory/architecture.md:74).
- La finalización debe vivir sobre `prepareCompanySpreadsheet` y los adapters por formulario, no sobre lógica monolítica ad hoc: [memory/form_production_standard.md](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/memory/form_production_standard.md:115), [src/lib/google/companySpreadsheet.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/google/companySpreadsheet.ts:495).

## Inventario del legacy

### Fuente principal

- Módulo legacy: [evaluacion_accesibilidad.py](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/formularios/evaluacion_programa/evaluacion_accesibilidad.py:595)
- Cell map documental: [09_evaluacion_accesibilidad.txt](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/docs/cell_maps/09_evaluacion_accesibilidad.txt:1)

### Estructura funcional

- `section_1`: 14 campos base de empresa/visita.
- `section_2_1` a `section_3`: 91 preguntas de accesibilidad auditiva, fisica y organizacional en total.
- `section_4`: concepto de evaluación con resumen derivado.
- `section_5`: 9 bloques de ajustes razonables.
- `section_6`: observaciones generales, texto largo.
- `section_7`: cargos compatibles, texto largo.
- `section_8`: asistentes dinámicos, `max_items = 10`, `base_rows = 4`: [evaluacion_accesibilidad.py](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/formularios/evaluacion_programa/evaluacion_accesibilidad.py:906)

### Tipos de widgets reales en preguntas

Conteo sobre `section_2_1` a `section_3`:

- `lista`: 34
- `accesible_con_observaciones`: 24
- `lista_multiple`: 15
- `lista_doble`: 7
- `texto`: 6
- `lista_triple`: 5

Conclusión: este formulario necesita un renderer declarativo por tipo de pregunta. No es sostenible implementarlo a mano pregunta por pregunta dentro de un solo presenter.

### Funcionalidades confirmadas del runtime legacy

1. `section_4` calcula resumen de respuestas `_accesible`, porcentajes y sugerencia de nivel:
   - `>= 86%` de `Sí` => `Alto`
   - `>= 51%` => `Medio`
   - `>= 1%` => `Bajo`
   - referencia: [app.py](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/app.py:13782)
2. `section_4` autocompleta la descripción desde catálogo estático según el nivel elegido: [app.py](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/app.py:13824)
3. `section_5` no deja los ajustes como entrada libre; al confirmar, escribe el texto sugerido del ítem cuando el usuario marca `Aplica`, y `"No aplica"` en caso contrario: [evaluacion_accesibilidad.py](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/formularios/evaluacion_programa/evaluacion_accesibilidad.py:1882)
4. `section_6` y `section_7` usan `tk.Text`, o sea texto multilinea real, no inputs cortos: [app.py](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/app.py:14084)
5. `section_8` sí es dinámica, pero no genérica:
   - primera fila: `Profesional RECA`
   - última fila: `Asesor Agencia`
   - filas intermedias: asistentes libres
   - el botón `Agregar asistente` inserta una fila nueva antes del último asesor
   - referencia: [app.py](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/app.py:14175)
6. El flujo final del legacy muestra el botón `📞 Solicitar Intérprete LSC` en la sección 8: [app.py](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/app.py:14157)
7. La exportación legacy deja visible la pestaña auxiliar `2.1 EVALUACION FOTOS`: [evaluacion_accesibilidad.py](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/formularios/evaluacion_programa/evaluacion_accesibilidad.py:581)

### Funcionalidades no encontradas en legacy

- No se encontraron botones de acción masiva propios de `Evaluación`.
- No se encontró un motor de sync prefijado tipo `Seleccion`/`Contratación`.
- Sí existen preguntas con dos, tres o cinco dropdowns, pero son combinaciones propias de una pregunta, no sincronización transversal entre bloques.

## Contraste con maestro vivo

### Coincidencias fuertes

- La hoja viva sigue siendo `2. EVALUACIÓN DE ACCESIBILIDAD`.
- Los rangos macro siguen alineados con legacy:
  - `2.1`: filas `17-26`
  - `2.2`: `28-69`
  - `2.3`: `71-103`
  - `2.4`: `105-141`
  - `2.5`: `143-152`
  - `2.6`: `154-155`
  - `3`: `157-177`
  - `4`: `180`
  - `5`: `186-203`
  - `6`: `205`
  - `7`: `208`
  - `8`: `212+`
- La sección de asistentes mantiene `start_row = 212`, `name_col = C`, `cargo_col = O`, `base_rows = 4`: [evaluacion_accesibilidad.py](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/formularios/evaluacion_programa/evaluacion_accesibilidad.py:905), [09_evaluacion_accesibilidad.txt](/C:/Users/aaron/Desktop/RECA_INCLUSION_LABORAL/docs/cell_maps/09_evaluacion_accesibilidad.txt:13)

### Drift detectado contra maestro vivo

1. La fila `A18` del maestro vivo existe como `Registro Google maps`; no está en el mapping legacy ni en el runtime legacy.
2. En filas `61-69` del maestro vivo aparecen validaciones adicionales en columna `W` (`W61:W69`) que no existen en legacy.
3. La pestaña `2.1 EVALUACIÓN FOTOS` existe y tiene dropdowns y formulas propias, pero el cell map legacy la trata como anexo fuera del payload principal.
4. En `section_4` el maestro vivo tiene al menos una formula activa para descripción del concepto:
   - `Q180 = VLOOKUP($M180; 'Caracterización'!D10:F12; 2; 0)`
   - aun así, el runtime legacy ya hace cálculo previo en UI; no basta con "dejar que lo resuelva Sheets".

### Lectura operativa del drift

- El grueso del formulario sí está estable entre legacy y maestro.
- Los tres puntos que exigen cierre antes de F1 son:
  1. si `Registro Google maps` entra o no al V1 web;
  2. si `W61:W69` es funcionalidad nueva viva o ruido residual del maestro;
  3. si `2.1 EVALUACIÓN FOTOS` se migra en esta ola o solo se preserva vía copia/visibilidad de pestaña.

## Decisiones F0 recomendadas

### 1. Target de UX

Migrar `Evaluación` como documento largo de una sola página, no como wizard.

Razones:

- es el estándar vigente del proyecto;
- el wizard ya fue retirado del runtime compartido;
- el formulario tiene demasiadas dependencias cruzadas para repartirlas en vistas rígidas;
- `section_4` depende del acumulado de respuestas previas y se beneficia de un documento único.

### 2. Política de asistentes

Migrar con `mode="reca_plus_agency_advisor"` en V1.

Razones:

- es la semántica real del runtime legacy en este formulario;
- el componente shared actual ya soporta exactamente ese modo: [src/components/forms/shared/AsistentesSection.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/AsistentesSection.tsx:55), [src/components/forms/shared/AsistentesSection.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/AsistentesSection.tsx:80)
- evita una regresión funcional silenciosa en la fila final.

Si producto decide homogeneizar a asistentes genéricos, esa decisión debe tomarse explícitamente y no por omisión.

### 3. Dictado

El formulario debe salir con dictado al menos en:

- observaciones y notas de preguntas con `texto`;
- `section_6`;
- `section_7`;
- cualquier textarea larga derivada de observaciones abiertas.

No hace falta inventar otra solución; el proyecto ya tiene `LongTextField` y `DictationButton`: [src/components/forms/shared/LongTextField.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/LongTextField.tsx:34), [src/components/forms/shared/DictationButton.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/DictationButton.tsx:23)

### 4. Sync de dropdowns

No abrir una capa shared de sync prefijado para `Evaluación` salvo que el cierre de `W61:W69` confirme que sí hay una regla nueva transversal.

El patrón de sync actual existe y está aislado en `Seleccion`: [src/lib/seleccionPrefixedDropdowns.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/seleccionPrefixedDropdowns.ts:7)

### 5. PDF

Tratar `Evaluación` como candidata a flujo con PDF, no como `Sensibilización`.

Razones:

- el legacy ya deja visible una hoja anexa para evidencia;
- formularios comparables (`Presentación`, `Selección`, `Contratación`) ya pasan por exportación PDF;
- si `2.1 EVALUACIÓN FOTOS` sigue vigente, omitir PDF desde el inicio dejaría un output incompleto para operación.

## Diseño de integración web recomendado

### Slices de dominio

Crear un slice nuevo y modular, no un componente monolítico:

- `src/lib/evaluacion.ts`
- `src/lib/evaluacionSections.ts`
- `src/lib/evaluacionHydration.ts`
- `src/lib/validations/evaluacion.ts`
- `src/lib/finalization/evaluacionPayload.ts`
- `src/lib/finalization/evaluacionSheet.ts`
- `src/components/forms/EvaluacionForm.tsx`
- `src/components/forms/evaluacion/EvaluacionFormPresenter.tsx`
- `src/hooks/useEvaluacionFormState.tsx`

### Subcomponentes recomendados

- `EvaluacionCompanySection`
- `EvaluacionQuestionSection`
- `EvaluacionQuestionField`
- `EvaluacionConceptSection`
- `EvaluacionAdjustmentsSection`
- `EvaluacionNarrativeSection`

Clave: `EvaluacionQuestionField` debe renderizar por descriptor (`lista`, `lista_doble`, `lista_triple`, `lista_multiple`, `texto`, `accesible_con_observaciones`) para no repetir JSX 91 veces.

### Navegación sugerida

Secciones visibles en el documento largo:

1. Empresa
2. 2.1 Movilidad y urbanísticas
3. 2.2 Condiciones generales
4. 2.3 Discapacidad física
5. 2.4 Discapacidad sensorial
6. 2.5 Discapacidad intelectual / TEA
7. 2.6 Discapacidad psicosocial
8. 3. Condiciones organizacionales
9. 4. Concepto de evaluación
10. 5. Ajustes razonables
11. 6. Observaciones
12. 7. Cargos compatibles
13. 8. Asistentes

## Funcionalidades que deben conservarse

- cálculo de resumen y sugerencia de `section_4`;
- descripción derivada por nivel de accesibilidad;
- lógica automática de ajustes de `section_5`;
- asistentes dinámicos con fila final de asesor;
- textos largos y observaciones multilinea;
- pestaña auxiliar de fotos si sigue siendo parte del entregable;
- botón/flujo de intérprete LSC si sigue vigente a nivel de plataforma.

## Funcionalidades que probablemente no deben migrarse tal cual

- navegación wizard sección por sección;
- autosave basado en callbacks por pantalla;
- duplicación de widgets por pregunta dentro de una sola clase Tkinter;
- dependencia en fórmulas de Sheets para UX interactiva que ya puede resolverse en cliente.

## Bloqueos funcionales antes de F1

1. Cerrar si `Registro Google maps` (`A18`) entra al payload web o se descarta.
2. Cerrar si `W61:W69` es requerimiento activo del maestro vivo.
3. Cerrar alcance de `2.1 EVALUACIÓN FOTOS`:
   - solo copiar/mostrar en el Sheet;
   - o exponer captura en web.
4. Cerrar si `📞 Solicitar Intérprete LSC` sigue siendo requisito de este formulario en la web actual.

## Plan integral propuesto

### F1. Contrato de dominio y cierre de mapping

- traducir legacy a schema declarativo por pregunta;
- construir `evaluacionSections.ts` con labels, tipos, opciones y metadatos de completitud;
- cerrar `legacy vs maestro vivo` para `A18`, `W61:W69` y `2.1 EVALUACIÓN FOTOS`;
- definir shape final de drafts/hydration.

### F2. Fundación shared del formulario

- agregar `evaluacion` a `LONG_FORM_SLUGS`;
- crear entrypoint lazy `/formularios/evaluacion`;
- montar hook + presenter + shell largo;
- implementar secciones 1, 6, 7 y 8 primero para fijar empresa, narrativas y asistentes;
- conectar `AsistentesSection` en modo `reca_plus_agency_advisor`.

### F3. Motor de preguntas y concepto de evaluación

- implementar renderer declarativo por tipo de pregunta;
- montar las secciones 2.1 a 3 sobre ese renderer;
- conectar cálculo client-side de resumen, porcentajes y sugerencia;
- montar `section_4` con descripción derivada.

### F4. Ajustes razonables + finalización

- implementar `section_5` con librería de ajustes y autollenado derivado;
- construir adapter `payload -> sheet mutation`;
- crear `evaluacionSheet.ts` y route `POST /api/formularios/evaluacion`;
- decidir y conectar PDF / hoja `2.1 EVALUACIÓN FOTOS`;
- reutilizar `prepareCompanySpreadsheet`.

### F5. Hardening y QA

- tests unitarios del renderer declarativo, summary engine y section 5;
- tests de route/finalización;
- smoke Playwright para apertura, restore, asistentes, resumen y publish;
- habilitación progresiva en hub después de preview y QA manual.

## Orden recomendado de implementación

1. Cerrar drift de maestro vivo.
2. Modelar contrato declarativo de preguntas.
3. Montar shell/hydration/drafts.
4. Implementar renderer de preguntas.
5. Implementar `section_4` y `section_5`.
6. Conectar finalización Sheets/PDF.
7. Hacer QA y recién ahí abrir tarjeta del hub.

## Conclusión

`Evaluación de Accesibilidad` no está bloqueada por arquitectura; está bloqueada por cierre de contrato funcional. El proyecto web ya tiene casi toda la infraestructura necesaria. La complejidad real no está en Google Sheets ni en asistentes, sino en modelar bien 91 preguntas heterogéneas sin convertir el formulario en un monolito React.

La decisión correcta para V1 es migrarla como long form modular, preservar la semántica de asistentes del legacy, reutilizar dictado en narrativas y resolver explícitamente los tres drifts del maestro vivo antes de tocar implementación productiva.
## Cierre F1

F1 quedo implementada en codigo y deja a `evaluacion` en estado decision-complete para F2.

- Contrato declarativo creado en [src/lib/evaluacionSections.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionSections.ts:1) con 13 secciones visibles, 91 preguntas entre `2.1` y `3`, 14 campos de empresa, 9 items de `section_5` y `section_8` configurada con `baseRows = 4`, `maxItems = 10`, `mode = reca_plus_agency_advisor`.
- Dominio base creado en [src/lib/evaluacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacion.ts:1) con `createEmptyEvaluacionValues()`, `normalizeEvaluacionValues()`, normalizacion de asistentes, resumen de accesibilidad y derivacion obligatoria de `section_4.descripcion` y `section_5.*`.
- Hydration creada en [src/lib/evaluacionHydration.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionHydration.ts:1) para convertir drafts nuevos o caches legacy por seccion al shape final `EvaluacionValues`, preservando `section_8` y cerrando compatibilidad con restore.
- Schema Zod creado en [src/lib/validations/evaluacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/validations/evaluacion.ts:1), separando inputs manuales de campos `derived` y `static_copy` via registry y corrigiendo el gap legacy en preguntas `texto` y `lista_triple`.
- `draftSnapshot` ya conoce `evaluacion`, aunque el slug sigue fuera de `LONG_FORM_SLUGS`: [src/lib/draftSnapshot.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/draftSnapshot.ts:1)

### Drifts cerrados en F1

- `A18 Registro Google maps` queda clasificado como `static_copy` y no entra al payload web V1.
- `W61:W69` queda clasificado como `deferred_blocker` por falta de encabezado y semantica funcional demostrable en el maestro vivo.
- `2.1 EVALUACION FOTOS` queda clasificada como `auxiliary_sheet`; se preserva para finalizacion/export, pero no forma parte del schema de inputs.

### Verificacion F1

- Tests del contrato: [src/lib/evaluacionSections.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionSections.test.ts:1), [src/lib/evaluacion.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacion.test.ts:1), [src/lib/evaluacionHydration.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionHydration.test.ts:1), [src/lib/validations/evaluacion.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/validations/evaluacion.test.ts:1)
- Comandos verificados en esta fase:
  - `npx vitest run src/lib/evaluacionSections.test.ts src/lib/evaluacion.test.ts src/lib/evaluacionHydration.test.ts src/lib/validations/evaluacion.test.ts src/lib/draftSnapshot.test.ts`
  - `npx eslint src/lib/evaluacion.ts src/lib/evaluacionHydration.ts src/lib/evaluacionSections.ts src/lib/evaluacion.test.ts src/lib/evaluacionHydration.test.ts src/lib/evaluacionSections.test.ts src/lib/validations/evaluacion.ts src/lib/validations/evaluacion.test.ts src/lib/draftSnapshot.ts`

## Cierre F2

F2 ya quedo implementada localmente como runtime largo base de `Evaluacion de Accesibilidad`.

- El slug `evaluacion` ya entra al runtime largo via [src/lib/forms.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/forms.ts:1) y carga por [src/app/formularios/[slug]/page.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/app/formularios/[slug]/page.tsx:1), mientras la tarjeta del hub sigue oculta para usuarios finales.
- El slice cliente ya existe con entrypoint, hook y presenter modulares en [src/components/forms/EvaluacionForm.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/EvaluacionForm.tsx:1), [src/hooks/useEvaluacionFormState.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/useEvaluacionFormState.tsx:1) y [src/components/forms/evaluacion/EvaluacionFormPresenter.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/evaluacion/EvaluacionFormPresenter.tsx:1).
- `Empresa`, `section_6`, `section_7` y `section_8` ya quedaron activas con drafts, autosave, restore y takeover sobre `useLongFormDraftController`.
- `section_8` ya usa `AsistentesSection` en modo `reca_plus_agency_advisor`, con base de 4 filas y tope de 10.
- Las secciones `2.1`, `2.2`, `2.3`, `2.4`, `2.5`, `2.6`, `3`, `4` y `5` ya renderizan visibles pero bloqueadas con copy fijo de migracion parcial.
- `Finalizar` se mantiene visible pero deshabilitado; no existe submit real ni route de publicacion en este corte.
- `Solicitar interprete` sigue completamente fuera de alcance en F2; no se monto CTA ni plumbing oculto asociado.

### Verificacion F2

- Tests y smokes agregados: [src/lib/evaluacionValidationNavigation.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionValidationNavigation.test.ts:1), [src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx:1), [e2e/evaluacion.spec.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/e2e/evaluacion.spec.ts:1), [e2e/form-shells.spec.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/e2e/form-shells.spec.ts:1)
- Comandos verificados en esta fase:
  - `npx eslint src/lib/forms.ts src/lib/forms.test.ts src/app/formularios/[slug]/page.tsx src/lib/evaluacionSections.ts src/lib/evaluacionSections.test.ts src/lib/evaluacion.ts src/lib/evaluacion.test.ts src/lib/evaluacionHydration.ts src/lib/evaluacionHydration.test.ts src/lib/validations/evaluacion.ts src/lib/validations/evaluacion.test.ts src/lib/evaluacionValidationNavigation.ts src/lib/evaluacionValidationNavigation.test.ts src/components/forms/EvaluacionForm.tsx src/components/forms/evaluacion/EvaluacionCompanySection.tsx src/components/forms/evaluacion/EvaluacionFormPresenter.tsx src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx src/hooks/useEvaluacionFormState.tsx e2e/helpers/forms.ts e2e/form-shells.spec.ts e2e/evaluacion.spec.ts`
  - `npx vitest run src/lib/forms.test.ts src/lib/evaluacionSections.test.ts src/lib/evaluacion.test.ts src/lib/evaluacionHydration.test.ts src/lib/evaluacionValidationNavigation.test.ts src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx`
  - `npx playwright test e2e/form-shells.spec.ts e2e/evaluacion.spec.ts --workers=1`
  - `npx tsc --noEmit --pretty false` revisado contra el slice de `evaluacion` sin errores propios

## Cierre F3

F3 ya quedo implementada localmente y desbloquea la base técnica del formulario.

- `evaluacion` ahora renderiza las 91 preguntas de `2.1` a `3` desde el descriptor declarativo en [src/lib/evaluacionSections.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionSections.ts:1) a traves de [src/components/forms/evaluacion/EvaluacionQuestionSections.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/evaluacion/EvaluacionQuestionSections.tsx:1), sin hardcodear JSX por pregunta.
- `section_4` ya quedo activa con resumen cliente, porcentajes, nivel sugerido, select editable de `nivel_accesibilidad` y `descripcion` readonly derivada en [src/components/forms/evaluacion/EvaluacionSection4Card.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/evaluacion/EvaluacionSection4Card.tsx:1).
- La regla `prefill editable` quedo cerrada en [src/lib/evaluacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacion.ts:1): si el nivel esta vacío se rellena con la sugerencia, si seguía sincronizado con la sugerencia previa vuelve a alinearse, y si el usuario hace override manual ese valor se preserva en drafts sin agregar flags al contrato.
- El hook [src/hooks/useEvaluacionFormState.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/useEvaluacionFormState.tsx:1) ya trata `2.1` a `4` como runtime activo, recalcula completitud/errores por seccion y deja `section_5` como unico bloque bloqueado fuera del target de validacion.
- `Finalizar` sigue visible pero deshabilitado y `Solicitar interprete` continua fuera de alcance en este corte.

### Verificacion F3

- Tests y smokes actualizados: [src/lib/evaluacionSections.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionSections.test.ts:1), [src/lib/evaluacion.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacion.test.ts:1), [src/lib/evaluacionValidationNavigation.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionValidationNavigation.test.ts:1), [src/lib/validations/evaluacion.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/validations/evaluacion.test.ts:1), [src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx:1), [e2e/evaluacion.spec.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/e2e/evaluacion.spec.ts:1)
- Comandos verificados en esta fase:
  - `npx vitest run src/lib/evaluacion.test.ts src/lib/evaluacionSections.test.ts src/lib/evaluacionValidationNavigation.test.ts src/lib/validations/evaluacion.test.ts src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx`
  - `npx playwright test e2e/form-shells.spec.ts e2e/evaluacion.spec.ts --workers=1`
  - `npm run build`
  - `npm run spellcheck`
- `eslint` del slice sigue cerrando sin errores y conserva solo el warning conocido de React Hook Form por `watch()` en `useEvaluacionFormState.tsx`.

## Cierre F4

F4 ya quedo implementada localmente y deja a `evaluacion` como formulario productivo local con publicacion real a Google Sheets.

- `section_5` ya quedo activa en [src/components/forms/evaluacion/EvaluacionSection5Card.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/evaluacion/EvaluacionSection5Card.tsx:1), con 9 items fijos, `nota` readonly, selector `Aplica / No aplica` y `ajustes` readonly derivados desde catalogo.
- El hook [src/hooks/useEvaluacionFormState.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/useEvaluacionFormState.tsx:1) ya usa el schema completo, incluye `section_5` en completitud real, habilita `Finalizar`, maneja dialogo de confirmacion, polling de confirmacion y pantalla final solo con `sheetLink`.
- La finalizacion ya existe en [src/app/api/formularios/evaluacion/route.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/app/api/formularios/evaluacion/route.ts:1), con `reviewFinalizationText`, idempotencia post-review y registro en `formatos_finalizados_il`.
- Los adapters quedaron separados en [src/lib/finalization/evaluacionPayload.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/finalization/evaluacionPayload.ts:1) y [src/lib/finalization/evaluacionSheet.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/finalization/evaluacionSheet.ts:1).
- `prepareCompanySpreadsheet()` ya soporta `extraVisibleSheetNames` en [src/lib/google/companySpreadsheet.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/google/companySpreadsheet.ts:1), y `evaluacion` lo usa para conservar visible `2.1 EVALUACION FOTOS` sin escribirle payload.

### Decisiones F4 cerradas

- `evaluacion` no genera PDF en este corte.
- `2.1 EVALUACION FOTOS` se preserva como hoja auxiliar visible y bloqueante si falta en el maestro vivo.
- `W61:W69` sigue fuera del contrato y fuera del adapter.
- `Solicitar interprete` sigue fuera de alcance.
- La tarjeta del hub sigue oculta hasta `F5`.

### Verificacion F4

- Tests focales:
  - [src/lib/finalization/evaluacionPayload.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/finalization/evaluacionPayload.test.ts:1)
  - [src/lib/finalization/evaluacionSheet.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/finalization/evaluacionSheet.test.ts:1)
  - [src/app/api/formularios/evaluacion/route.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/app/api/formularios/evaluacion/route.test.ts:1)
  - [e2e/evaluacion.spec.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/e2e/evaluacion.spec.ts:1)
- Comandos verificados en esta fase:
  - `npx vitest run src/lib/evaluacionSections.test.ts src/lib/evaluacionValidationNavigation.test.ts src/lib/evaluacion.test.ts src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx src/lib/finalization/idempotency.test.ts src/lib/finalization/textReview.test.ts src/lib/google/companySpreadsheet.test.ts src/lib/finalization/evaluacionSheet.test.ts src/lib/finalization/evaluacionPayload.test.ts src/app/api/formularios/evaluacion/route.test.ts`
  - `npx playwright test e2e/evaluacion.spec.ts --workers=1`
  - `npm run build`
  - `npm run spellcheck`

## Cierre F5

F5 ya quedo cerrada en preview y deja `evaluacion` lista para salir del acceso por ruta directa al hub visible del corte actual.

- La tarjeta del hub ya quedo habilitada en [src/components/layout/HubMenu.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/layout/HubMenu.tsx:1).
- La cobertura del hub y del formulario ya quedo alineada al estado expuesto en [src/components/layout/HubMenu.test.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/layout/HubMenu.test.tsx:1), [e2e/hub-smoke.spec.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/e2e/hub-smoke.spec.ts:1) y [e2e/evaluacion.spec.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/e2e/evaluacion.spec.ts:1).
- El preview final del corte quedo en `https://reca-inclusion-laboral-nuevo-7cu6xpudi-auyabans-projects.vercel.app` con inspector `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/3xqvmSwHXjCJK5yBMs8SxYjfoHWq`.
- Verificacion focal del deploy: login real en preview, apertura de `/hub` y acceso a `/formularios/evaluacion` desde la tarjeta del hub.
- `evaluacion` sigue sin PDF, mantiene visible `2.1 EVALUACION FOTOS` y deja `Solicitar interprete` fuera de alcance.

### Verificacion F5

- `npx vitest run src/components/layout/HubMenu.test.tsx src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx src/app/api/formularios/evaluacion/route.test.ts`
- `npx playwright test e2e/evaluacion.spec.ts e2e/hub-smoke.spec.ts --workers=1`
- `npm run build`

## Follow-up preview Test

- `evaluacion` ya expone el boton `Test` en preview con el mismo patron de los otros formularios largos.
- El helper de relleno manual quedo agregado en [src/lib/manualTestFill.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/manualTestFill.ts:1) y el hook ahora lo renderiza desde [src/hooks/useEvaluacionFormState.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/useEvaluacionFormState.tsx:1).
- La cobertura focal se amplio en [src/lib/manualTestFill.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/manualTestFill.test.ts:1) y [e2e/evaluacion.spec.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/e2e/evaluacion.spec.ts:1) para validar schema + visibilidad del boton + finalizacion desde ese relleno.
- Preview actualizado: `https://reca-inclusion-laboral-nuevo-7pcoyg91x-auyabans-projects.vercel.app`
- Inspector: `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/GDLnZ9YbyEz3Lx1Gx89KJojUrgeW`
- Verificacion local del corte:
  - `npx vitest run src/lib/manualTestFill.test.ts src/components/layout/HubMenu.test.tsx src/app/api/formularios/evaluacion/route.test.ts`
  - `npx playwright test e2e/evaluacion.spec.ts --workers=1`
  - `npm run build`

## Follow-up preview Finalizar

- Se corrigio un drift especifico de `evaluacion`: [src/hooks/useEvaluacionFormState.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/useEvaluacionFormState.tsx:1) ya no depende del submit implicito del `<form>` para abrir la confirmacion de cierre.
- `LongFormFinalizeButton` ahora sigue el mismo patron estable del resto de formularios largos: `type="button"` y `onClick={handleSubmit(handlePrepareSubmit, onInvalid)}`.
- `formProps.onSubmit` quedo reducido a `preventDefault()` para bloquear el comportamiento nativo del navegador sin duplicar el flujo de cierre.
- La route [src/app/api/formularios/evaluacion/route.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/app/api/formularios/evaluacion/route.ts:1) no requirió cambios; el fallo quedaba antes del dialogo de confirmacion.
- Preview actualizado con el fix: `https://reca-inclusion-laboral-nuevo-1d19jwllq-auyabans-projects.vercel.app`
- Inspector: `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/5rqdiQnWxQJXcmiSw3XiEvAGhZox`
- Verificacion local del corte:
  - `npx vitest run src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx src/app/api/formularios/evaluacion/route.test.ts`
  - `npx playwright test e2e/evaluacion.spec.ts --workers=1`
  - `npm run build`

## Follow-up preview UX y validacion

- `observaciones_generales` dejo de ser obligatoria en [src/lib/validations/evaluacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/validations/evaluacion.ts:1), en la completitud del hook [src/hooks/useEvaluacionFormState.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/useEvaluacionFormState.tsx:1) y en la UI narrativa [src/components/forms/evaluacion/EvaluacionFormPresenter.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/evaluacion/EvaluacionFormPresenter.tsx:1), donde la seccion 6 ahora renderiza sin requerimiento visual.
- El catalogo declarativo de `evaluacion` ahora corrige texto visible dañado y referencias de Sheets al cargar el modulo en [src/lib/evaluacionSections.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionSections.ts:1), corrigiendo labels como `¿`, `Selección`, `Descripción` y `EVALUACIÓN` sin reabrir IDs ni estructura.
- `evaluacion` ya preserva `activeSectionId`, colapsados y `scrollY` durante autosave/rehydration con la misma familia de helpers de `seleccion/contratacion`; el fix vive en [src/hooks/useEvaluacionFormState.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/useEvaluacionFormState.tsx:1) usando `longFormViewState` para evitar que el blur/autosave devuelva el documento al inicio.
- La navegación al error ahora fuerza expansion de la seccion, actualiza `activeSectionId` y hace focus/scroll sobre el campo con error mediante `focusFieldByNameAfterPaint(...)`, reduciendo el caso donde `Finalizar` mostraba error sin llevar al campo faltante.
- `getEvaluacionValidationTarget()` ahora además evita aterrizar en derivados readonly sin foco (`section_4.descripcion`, `section_5.*.nota`, `section_5.*.ajustes`) y redirige esos errores al control editable asociado (`section_4.nivel_accesibilidad` o `section_5.*.aplica`), para que la navegación de `Finalizar` siempre apunte a un campo accionable.
- El schema de [src/lib/validations/evaluacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/validations/evaluacion.ts:1) ya quedó alineado con esa misma UX: las inconsistencias derivadas de `section_4` y `section_5` ahora se adjuntan a los controles editables en lugar de los readonly, y el caso de asistentes insuficientes ya marca una fila accionable además del mensaje general del bloque.
- QA dejó además dos ajustes ya verificados en este mismo corte: [src/lib/manualTestFill.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/manualTestFill.ts:1) ahora rellena fallbacks de prueba para campos derivados readonly de empresa cuando el registro base viene incompleto, y [src/lib/evaluacionValidationNavigation.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionValidationNavigation.ts:1) ya prioriza todos los `EVALUACION_COMPANY_FIELD_IDS` en vez de solo `fecha_visita/modalidad/nit_empresa`, para que cualquier error de snapshot tenga navegación accionable.
- El follow-up siguiente dejó cerrada además la causa raíz de esa validación invisible: [src/lib/validations/evaluacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/validations/evaluacion.ts:1) ahora omite en `validateCompanyFields()` los descriptores `readonly`, de modo que los campos derivados de empresa ya no pueden bloquear el cierre cuando vienen vacíos desde el registro base y el usuario no tiene cómo corregirlos en web.
- Cobertura ampliada:
  - `npx vitest run src/lib/validations/evaluacion.test.ts src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx src/lib/evaluacionValidationNavigation.test.ts`
  - `npx playwright test e2e/evaluacion.spec.ts --workers=1`
  - `npm run build`
  - `npm run spellcheck`

## Follow-up hardening local (2026-04-19)

- `evaluacion` ya absorbio un hardening local adicional sin abrir preview nuevo todavia.
- [src/hooks/useEvaluacionFormState.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/useEvaluacionFormState.tsx:1) ya alinea el gate de `loading` con el patron estable de los otros long forms: el formulario no vuelve a "recuperando mi acta" despues de un autosave normal o una promocion `session -> draft`, y preserva `activeSectionId`, colapsados y `scrollY`.
- Ese mismo hook vuelve a fijar `step=0` cuando aun no hay empresa cargada, para no empujar el documento a `section_2_1` durante restore parcial.
- La base de asistentes del formulario cambio al negocio real en [src/lib/evaluacionSections.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionSections.ts:1): `EVALUACION_BASE_ASISTENTES_ROWS = 2` y `EVALUACION_MIN_SIGNIFICANT_ATTENDEES = 2`.
- [src/lib/evaluacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacion.ts:1) y [src/lib/evaluacionHydration.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionHydration.ts:1) ya normalizan los asistentes hacia `RECA + asistentes intermedios + Asesor Agencia`, sin volver a sembrar filas base vacias extra.
- [src/lib/validations/evaluacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/validations/evaluacion.ts:1) ya corrige el minimo de asistentes a una fila accionable valida (`asistentes.0.nombre`), mantiene documentado que los errores derivados se enrutan al control editable fuente y corrige el copy visible a `"Selecciona una opción válida"`.
- [src/app/api/formularios/evaluacion/route.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/app/api/formularios/evaluacion/route.ts:1) ahora expone `maxDuration = 60`, evita ejecutar `reviewFinalizationText` cuando no hay texto revisable y deja comentarios inline para las dos excepciones permanentes del formulario: no hace sync a `usuarios_reca` y no genera PDF.
- [src/lib/finalization/evaluacionSheet.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/finalization/evaluacionSheet.ts:1) ya emite `console.warn` cuando un `path` del registry con `sheetCell` resuelve `undefined`, para que el drift de mapping no falle en silencio; ademas se elimino el export muerto `buildEvaluacionSection5ApplySnapshot`.

### Verificacion focal

- `npx vitest run src/lib/evaluacion.test.ts src/lib/evaluacionHydration.test.ts src/lib/evaluacionSections.test.ts src/lib/validations/evaluacion.test.ts src/lib/evaluacionLoadingState.test.ts src/lib/finalization/evaluacionSheet.test.ts src/app/api/formularios/evaluacion/route.test.ts src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx src/lib/manualTestFill.test.ts`
- `npm run build`
- `npm run spellcheck`

## Follow-up limpieza estructural local (2026-04-19)

- `evaluacionRuntimeSchema` y `evaluacionSchema` ahora salen de un factory interno unico en [src/lib/validations/evaluacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/validations/evaluacion.ts:1), manteniendo el mismo contrato exportado.
- [src/lib/evaluacionHydration.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionHydration.ts:1) ya deja documentadas las tres variantes de compatibilidad legacy: `v3 nested`, `v2 flat por seccion` y `v1 flat raiz`.
- [src/lib/evaluacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacion.ts:1) ahora acepta `quinaria` como alias de lectura, pero mantiene `quinary` como key persistida para no romper drafts ni mappings existentes.
- El parche local de mojibake quedo encapsulado en [src/lib/evaluacionCatalogText.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionCatalogText.ts:1), sin reescribir manualmente el descriptor gigante.
- No se toco `useWatch` ni los effects de `section_4` porque en esta fase no aparecio evidencia suficiente de churn real que justificara un refactor del hook.
- El handoff consolidado de `F1 + F2` ya quedo absorbido en [memory/MEMORY.md](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/memory/MEMORY.md:1), [memory/roadmap.md](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/memory/roadmap.md:1) y la pagina canonica de QA en Notion.

### Verificacion focal

- `npx vitest run src/lib/evaluacionCatalogText.test.ts src/lib/evaluacion.test.ts src/lib/evaluacionHydration.test.ts src/lib/evaluacionSections.test.ts src/lib/validations/evaluacion.test.ts`
- `npm run build`
- `npm run spellcheck`

## Follow-up paridad UX local (2026-04-19)

- `evaluacion` ya entro al piloto de `draft invisible` desde [src/lib/drafts/invisibleDraftConfig.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/drafts/invisibleDraftConfig.ts:1) y [src/components/layout/DraftsHub.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/layout/DraftsHub.tsx:1) ahora prioriza `?session=` para este slug cuando existe `sessionId`, evitando seguir promoviendo `?draft=` desde el hub.
- [src/hooks/useEvaluacionFormState.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/useEvaluacionFormState.tsx:1) ya no deshabilita `Finalizar` por `!isFormComplete`; vuelve a seguir el mismo patron de los otros long forms, dejando que el click dispare `onInvalid` y navegue al primer error accionable.
- `observaciones` de preguntas `2.1` a `3` ya dejaron de ser obligatorias en [src/lib/validations/evaluacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/validations/evaluacion.ts:1) y en la completitud declarativa de [src/lib/evaluacionSections.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionSections.ts:1); `detalle` conserva su semantica actual.
- El doble contador de finalizacion ya quedo corregido de forma shared en [src/lib/longFormFinalization.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/longFormFinalization.ts:1): mientras el dialogo de publicacion esta abierto, el shell deja de renderizar feedback inline duplicado. El ajuste aplica tambien a los otros long forms que usan el mismo patron.
- Validacion focal de este follow-up:
  - `npx vitest run src/lib/drafts/invisibleDraftConfig.test.ts src/components/layout/DraftsHub.test.tsx src/lib/longFormFinalization.test.ts src/lib/evaluacionSections.test.ts src/lib/validations/evaluacion.test.ts`
  - `npm run build`

## Follow-up navegacion agrupada local (2026-04-19)

- [src/components/forms/shared/LongFormSectionNav.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/LongFormSectionNav.tsx:1) ahora soporta items planos y grupos con hijos sin romper el contrato plano de los otros formularios largos.
- `evaluacion` ya modela `Seccion 2` como grupo desplegable con hijos `2.1` a `2.6` desde [src/lib/evaluacionSections.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionSections.ts:1), y [src/hooks/useEvaluacionFormState.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/useEvaluacionFormState.tsx:1) construye `navItems` a partir de `EVALUACION_NAV_ITEMS` en lugar de la lista lineal previa.
- El grupo padre es solo toggle, el `activeSectionId` sigue apuntando a secciones reales, y el estado expandido vive solo en memoria mientras el componente sigue montado.
- Cobertura focal agregada en [src/components/forms/shared/LongFormSectionNav.test.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/LongFormSectionNav.test.tsx:1), [src/lib/evaluacionSections.test.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/evaluacionSections.test.ts:1) y [src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx:1).
- Validacion focal:
  - `npx vitest run src/components/forms/shared/LongFormSectionNav.test.tsx src/lib/evaluacionSections.test.ts src/components/forms/evaluacion/EvaluacionFormPresenter.test.tsx`
  - `npm run build`

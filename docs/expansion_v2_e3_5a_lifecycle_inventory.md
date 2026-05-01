# E3.5a - Inventario del Ciclo de Vida

**Estado:** cerrado para decision de E3.5b.
**Worktree:** `codex/e3-profesionales-empresas`  
**Fecha de inventario:** 2026-04-30
**Objetivo:** documentar que evidencia real de `formatos_finalizados_il.payload_normalized` puede alimentar el ciclo de vida read-only de una empresa.

Este archivo es el inventario vivo de E3.5a. No es una especificacion visual ni un plan de implementacion. Las consultas fueron read-only, limitadas o agregadas, y no se copiaron valores personales completos al documento.

## Resultado ejecutivo

E3.5a confirma que si hay base suficiente para construir E3.5b como motor read-only del arbol:

- Empresa se puede identificar principalmente por `parsed_raw.nit_empresa` y `parsed_raw.nombre_empresa`.
- Fecha operativa se puede tomar de `parsed_raw.fecha_servicio`; `created_at` queda como fallback de orden.
- Perfil/cargo se puede crear desde `condiciones-vacante` usando `parsed_raw.cargo_objetivo`.
- Personas se pueden crear o actualizar desde `seleccion`, `contratacion`, `induccion-operativa`, `induccion-organizacional` y `seguimientos` usando `parsed_raw.participantes[].cedula_usuario`.
- Seleccion y contratacion soportan actas grupales porque `participantes` puede traer varias personas.
- Seguimientos ya traen `seguimiento_numero` y una sola persona por acta en la muestra revisada, aunque siguen siendo deuda de captura para robustecer el formulario.
- Hay variantes historicas de nombres de formato; el motor debe mapear por `nombre_formato`, no por una columna `form_slug`, porque `formatos_finalizados_il` no tiene `form_slug`.

Recomendacion: avanzar a E3.5b con motor read-only, sin UI grafica compleja todavia. El motor debe ser conservador: clasificar lo confiable, poner personas sin perfil cuando falte relacion segura y enviar evidencia dudosa a `Evidencia sin clasificar`.

## Reglas base aprobadas

- El ciclo de vida sera un arbol operativo de empresa.
- `condiciones-vacante` crea una rama de perfil/cargo.
- Una acta de `condiciones-vacante` siempre corresponde a un solo perfil.
- Desde `seleccion` en adelante, la cedula es la llave principal de persona.
- Seleccion y contratacion pueden ser grupales.
- Seguimientos son individuales: una acta por persona.
- Personas sin perfil relacionado se muestran en una rama propia.
- Personas seleccionadas sin contratacion se archivan despues de 6 meses, sin borrarse.
- Notas y bitacora global quedan separadas del arbol en la primera version.
- Evidencia no clasificable va a `Evidencia sin clasificar`.

## Fuente real y alcance de consultas

Tabla revisada: `public.formatos_finalizados_il`.

Columnas utiles confirmadas:

- `registro_id`
- `nombre_formato`
- `nombre_empresa`
- `created_at`
- `finalizado_at_colombia`
- `finalizado_at_iso`
- `path_formato`
- `payload_source`
- `payload_schema_version`
- `payload_normalized`
- `payload_generated_at`
- `acta_ref`

Observacion importante: la tabla no tiene columna `form_slug`. Para E3.5b se necesita una funcion de normalizacion de tipo de formato desde `nombre_formato`.

Consultas ejecutadas:

- Metadatos de columnas con `information_schema.columns`.
- Conteo agregado de 403 registros por `nombre_formato`.
- Muestras limitadas por familia de formato, con maximo 8 payloads por grupo.
- Cobertura agregada de presencia de NIT, empresa, fecha, cargo, cedula y participantes sobre 403 registros.

No se ejecutaron mutaciones, migraciones ni consultas sin control de volumen.

## Formatos encontrados

| Grupo canonico | Nombres reales encontrados | Total | Ultimo registro | Fuentes |
|---|---|---:|---|---|
| `presentacion` | `Presentacion Programa`, `Presentacion del Programa` | 75 | 2026-04-30 | `draft_session`, `form_cache`, `form_web` |
| `evaluacion` | `Evaluacion Accesibilidad`, `Evaluacion de Accesibilidad` | 27 | 2026-04-29 | `draft_session`, `form_cache`, `form_web` |
| `condiciones-vacante` | `Condiciones de Vacante`, `Revision Condicion` | 82 | 2026-04-30 | `draft_session`, `form_cache`, `form_web` |
| `seleccion` | `Proceso de Seleccion Incluyente`, `Seleccion Incluyente` | 93 | 2026-04-30 | `draft_session`, `form_cache`, `form_web` |
| `contratacion` | `Contratacion Incluyente` | 36 | 2026-04-29 | `draft_session`, `form_cache`, `form_web` |
| `sensibilizacion` | `Sensibilizacion` | 9 | 2026-04-30 | `draft_session`, `form_cache`, `form_web` |
| `induccion-organizacional` | `Induccion Organizacional` | 14 | 2026-04-28 | `draft_session`, `form_cache`, `form_web` |
| `induccion-operativa` | `Induccion Operativa` | 24 | 2026-04-29 | `draft_session`, `form_cache`, `form_web` |
| `seguimientos` | `Seguimiento al Proceso de Inclusion Laboral #1`, `#2`, `#3` | 6 | 2026-04-17 | `seguimientos_sheet` |
| `otro` | `Servicio de Interpretacion LSC`, `Servicio de Interpretación LSC`, `Reactivacion Programa` | 37 | 2026-04-30 | `form_cache`, `form_web` |

`otro` queda fuera del arbol inicial. Puede alimentar `Evidencia sin clasificar` si se decide mostrar toda actividad de empresa en una fase posterior.

## Cobertura agregada

| Grupo | NIT | Empresa | Fecha servicio | Profesional | Caja | Cargo | Participantes | Cedula | Persona | Seguimiento |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `presentacion` | 68/75 | 68/75 | 68/75 | 68/75 | 68/75 | 0/75 | 0/75 | 0/75 | 0/75 | 0/75 |
| `evaluacion` | 25/27 | 25/27 | 25/27 | 25/27 | 25/27 | 0/27 | 0/27 | 0/27 | 0/27 | 0/27 |
| `condiciones-vacante` | 77/82 | 77/82 | 77/82 | 76/82 | 77/82 | 77/82 | 0/82 | 0/82 | 0/82 | 0/82 |
| `seleccion` | 91/93 | 91/93 | 91/93 | 91/93 | 87/93 | 81/93 | 91/93 | 88/93 | 88/93 | 0/93 |
| `contratacion` | 36/36 | 36/36 | 36/36 | 36/36 | 36/36 | 33/36 | 35/36 | 33/36 | 33/36 | 0/36 |
| `sensibilizacion` | 8/9 | 8/9 | 8/9 | 5/9 | 5/9 | 0/9 | 0/9 | 0/9 | 0/9 | 0/9 |
| `induccion-organizacional` | 14/14 | 14/14 | 14/14 | 14/14 | 14/14 | 12/14 | 14/14 | 13/14 | 14/14 | 0/14 |
| `induccion-operativa` | 24/24 | 24/24 | 24/24 | 24/24 | 24/24 | 22/24 | 24/24 | 24/24 | 24/24 | 0/24 |
| `seguimientos` | 6/6 | 6/6 | 6/6 | 6/6 | 6/6 | 6/6 | 6/6 | 6/6 | 6/6 | 6/6 |

La cobertura incompleta se debe tratar como warning de calidad de datos, no como razon para ocultar evidencia.

## Diferencial por tipo de empresa

| Tipo de empresa | Etapas diferenciales | Seguimientos esperados |
|---|---|---|
| `Compensar` | Evaluacion de accesibilidad, sensibilizacion, induccion organizacional | 6 por persona |
| `No Compensar` | No aplica diferencial | 3 por persona |

`caja_compensacion` aparece en la mayoria de payloads y debe ser la fuente primaria para decidir el diferencial. Si falta, el arbol debe marcar `companyType: "unknown"` y mostrar warnings.

## Matriz por formulario

| Formulario | Rol en ciclo | Llave empresa | Llave perfil | Llave persona | Grupal | Estado inventario | Decision |
|---|---|---|---|---|---|---|---|
| `presentacion` | Etapa de empresa | `nit_empresa` + `nombre_empresa` | No aplica | No aplica | No | Completo | Clasificable |
| `evaluacion` | Etapa Compensar | `nit_empresa` + `nombre_empresa` | No aplica | No aplica | No | Completo | Clasificable para Compensar |
| `condiciones-vacante` | Crea perfil/cargo | `nit_empresa` + `nombre_empresa` | `cargo_objetivo` | No aplica | No | Completo | Clasificable |
| `seleccion` | Crea/actualiza personas | `nit_empresa` + `nombre_empresa` | `cargo_objetivo`, debil | `participantes[].cedula_usuario` | Si | Completo con warnings | Parcialmente clasificable |
| `contratacion` | Actualiza personas contratadas | `nit_empresa` + `nombre_empresa` | `cargo_objetivo`, debil | `participantes[].cedula_usuario` | Si | Completo con warnings | Parcialmente clasificable |
| `sensibilizacion` | Etapa Compensar de empresa | `nit_empresa` + `nombre_empresa` | No aplica | No aplica | No | Completo con baja muestra | Clasificable para Compensar |
| `induccion-organizacional` | Etapa Compensar de empresa | `nit_empresa` + `nombre_empresa` | No aplica | `participantes[].cedula_usuario` o `vinculado_cedula` si existe | Puede traer personas, pero se modela como empresa | Completo con warnings | Clasificable como etapa de empresa |
| `induccion-operativa` | Etapa por persona | `nit_empresa` + `nombre_empresa` | `cargo_objetivo`, contextual | `linked_person_cedula` o `participantes[].cedula_usuario` | No en muestra | Completo | Clasificable por persona |
| `seguimientos` | Seguimiento por persona | `nit_empresa` + `nombre_empresa` | `cargo_objetivo`, contextual | `participantes[].cedula_usuario` | No | Completo con baja muestra | Clasificable por persona |

## Rutas JSON confiables

Rutas comunes:

- Empresa: `payload_normalized.parsed_raw.nit_empresa`
- Empresa: `payload_normalized.parsed_raw.nombre_empresa`
- Sede: `payload_normalized.parsed_raw.sede_empresa`
- Ciudad: `payload_normalized.parsed_raw.ciudad_empresa`
- Caja: `payload_normalized.parsed_raw.caja_compensacion`
- Fecha de servicio: `payload_normalized.parsed_raw.fecha_servicio`
- Profesional: `payload_normalized.parsed_raw.nombre_profesional`
- Asistentes RECA/empresa: `payload_normalized.parsed_raw.asistentes`
- Evidencia PDF/Sheet cuando exista: `payload_normalized.parsed_raw.pdf_link`, `payload_normalized.parsed_raw.sheet_link`

Rutas por perfil/persona:

- Perfil/cargo: `payload_normalized.parsed_raw.cargo_objetivo`
- Seleccion/contratacion: `payload_normalized.parsed_raw.participantes[].cedula_usuario`
- Seleccion/contratacion: `payload_normalized.parsed_raw.participantes[].nombre_usuario`
- Seleccion/contratacion: `payload_normalized.parsed_raw.participantes[].cargo_servicio`
- Induccion operativa: `payload_normalized.parsed_raw.linked_person_cedula`
- Induccion operativa: `payload_normalized.parsed_raw.linked_person_name`
- Induccion organizacional: `payload_normalized.parsed_raw.vinculado_cedula`, cuando exista
- Seguimientos: `payload_normalized.parsed_raw.participantes[].cedula_usuario`
- Seguimientos: `payload_normalized.parsed_raw.seguimiento_numero`

## Hallazgos por formulario

### `presentacion`

Clasificable como etapa de empresa.

Usa `nit_empresa`, `nombre_empresa`, `fecha_servicio`, `caja_compensacion`, `nombre_profesional` y links de evidencia en versiones nuevas. No trae personas ni perfil. En versiones nuevas aparece como `Presentación del Programa`; en historico aparece como `Presentacion Programa`.

Gaps:

- 7 de 75 registros no tienen NIT/empresa/fecha en `payload_normalized`.
- No sirve para crear ramas de persona ni perfil.

### `evaluacion`

Clasificable como etapa diferencial de empresa Compensar.

Usa llaves de empresa y agrega datos propios de accesibilidad: `nivel_accesibilidad`, `nivel_sugerido_accesibilidad`, `resumen_accesibilidad`, `porcentajes_accesibilidad`, `ajustes_razonables` y observaciones. No trae personas.

Gaps:

- 2 de 27 registros no tienen llaves de empresa completas.
- Debe mostrarse solo si la empresa es Compensar o si existe evidencia de evaluacion aunque la caja este incompleta.

### `condiciones-vacante`

Clasificable como creador de perfil/cargo.

La ruta confiable para la rama es `cargo_objetivo`. Una acta representa un solo perfil, consistente con la decision de negocio. No trae cedulas ni personas.

Gaps:

- 5 de 82 registros no tienen NIT/empresa/cargo en el payload normalizado.
- `Revision Condicion` es variante historica y debe mapear al mismo tipo canonico.

### `seleccion`

Parcialmente clasificable como creador/actualizador de personas.

Trae `participantes[]` con `cedula_usuario`, `nombre_usuario` y normalmente `cargo_servicio`. Puede ser grupal. El motor debe crear una rama por cedula y asociarla a perfil solo si existe coincidencia segura por empresa y cargo; si no, debe enviar la persona a `Personas sin perfil relacionado`.

Gaps:

- 88 de 93 registros tienen cedula; los restantes deben quedar como evidencia o warning.
- `cargo_objetivo` existe en 81 de 93, pero no debe ser llave fuerte.
- Hay variante historica `Proceso de Seleccion Incluyente`.

### `contratacion`

Parcialmente clasificable como actualizacion de persona contratada.

Trae `participantes[]` y puede ser grupal. Debe actualizar estado de cada persona por cedula. Si la persona no aparece antes en seleccion, se debe crear bajo `Personas sin perfil relacionado` con warning de secuencia.

Gaps:

- 33 de 36 registros tienen cedula y nombre de persona.
- 1 de 36 no trae participantes.
- `cargo_objetivo` existe en 33 de 36, pero sigue siendo contextual.

### `sensibilizacion`

Clasificable como etapa diferencial de empresa Compensar.

Trae llaves de empresa, fecha y observaciones. No trae personas. Debe aparecer despues de contratacion en el arbol conceptual, pero tecnicamente se representa como etapa de empresa con fecha.

Gaps:

- Muestra baja: 9 registros.
- Profesional y caja aparecen en 5 de 9; cuando falten, usar warning.

### `induccion-organizacional`

Clasificable como etapa diferencial de empresa Compensar.

Aunque algunos payloads traen participantes o `vinculado_cedula`, por decision de negocio se modela como proceso de empresa. Si trae personas, se pueden mostrar como evidencia contextual, no como ramas obligatorias.

Gaps:

- 13 de 14 tienen cedula, pero no debe convertir esta etapa en seguimiento individual.
- Si caja falta o no es Compensar, mostrar warning antes de ocultar.

### `induccion-operativa`

Clasificable como etapa por persona.

Trae `linked_person_cedula`, `linked_person_name` y/o `participantes[].cedula_usuario`. En la muestra todos los registros tienen cedula y una sola persona.

Gaps:

- `cargo_objetivo` aparece en 22 de 24; usarlo solo como contexto.
- Si falta cedula en algun registro futuro, enviarlo a evidencia sin clasificar o warning de persona.

### `seguimientos`

Clasificable como seguimiento por persona.

Aunque la muestra es baja, los 6 registros revisados tienen `participantes[]`, cedula, persona, `seguimiento_numero`, NIT, empresa y fecha. El source es `seguimientos_sheet`, no `form_web`, lo que confirma que esta familia sigue siendo distinta al resto.

Gaps:

- Muestra baja: 6 registros.
- Solo aparecen #1, #2 y #3 en datos actuales. No hay evidencia todavia de #4, #5 y #6.
- Debe mantenerse la deuda de mejorar el formulario de seguimientos, pero el motor read-only puede usar `seguimiento_numero` si existe y fecha como fallback.

## Reglas de clasificacion recomendadas para E3.5b

1. Normalizar tipo de formato desde `nombre_formato`.
2. Resolver empresa por NIT normalizado primero; usar nombre como fallback con warning.
3. Crear etapas de empresa desde `presentacion`, `evaluacion`, `sensibilizacion` e `induccion-organizacional`.
4. Crear perfiles desde `condiciones-vacante` usando `cargo_objetivo`.
5. Crear personas desde `seleccion` y `contratacion` por cedula.
6. Adjuntar `induccion-operativa` y `seguimientos` por cedula.
7. Asociar persona a perfil solo con coincidencia conservadora de empresa + cargo exacto normalizado; sin coincidencia, usar `Personas sin perfil relacionado`.
8. No usar matching difuso de cargo en E3.5b.
9. Mostrar evidencia incompleta con warnings, no ocultarla.
10. Mantener notas y bitacora global como secciones separadas.

## Gaps de datos

- No existe `form_slug`; hay que mapear variantes de `nombre_formato`.
- Algunos payloads historicos no tienen llaves completas de empresa.
- Cargo no es llave confiable entre etapas.
- Seguimientos tiene poca muestra y source distinto (`seguimientos_sheet`).
- No hay evidencia actual de seguimiento #4, #5 o #6, aunque Compensar debe esperar hasta 6.
- `Servicio de Interpretacion LSC` aparece con personas, pero queda fuera del ciclo inicial porque no hace parte del flujo laboral descrito.
- `Reactivacion Programa` aparece una vez; por ahora va a evidencia sin clasificar.

## Decisiones para E3.5b

E3.5b puede construir un motor read-only con contrato conservador:

- `companyStages`: presentacion, evaluacion, sensibilizacion, induccion organizacional y otros eventos de empresa clasificables.
- `profileBranches`: perfiles desde condiciones de vacante.
- `peopleWithoutProfile`: personas detectadas por cedula sin perfil asociado con seguridad.
- `archivedBranches`: personas seleccionadas sin contratacion despues de 6 meses.
- `unclassifiedEvidence`: registros con empresa pero sin clasificacion confiable.
- `dataQualityWarnings`: faltantes de NIT, empresa, fecha, cedula, cargo, caja o secuencia logica.

La primera UI posterior debe ser simple y expandible. El arbol visual rico queda para despues de validar el motor.

# Inventario de codigos del motor ODS

Este documento inventaria los campos comparables que el motor escribe en
`motor_suggestion` y que la telemetria contrasta contra `final_value`:
`codigo_servicio`, `modalidad_servicio` y `valor_base`.

F1 es discovery puro. No propone fixes, no cambia reglas y no infiere codigos
literales que no esten definidos en el repo. El motor no mantiene un catalogo
literal propio de codigos: consume filas de `tarifas` y aplica reglas sobre esas
filas.

## Alcance

Incluido:

- `codigo_servicio`
- `modalidad_servicio`
- `valor_base`
- Evidencia desde codigo y tests existentes.

Fuera de alcance:

- `confidence`: es metadata de la sugerencia, no codigo comparable. Ademas el
  comparador local de telemetria lo ignora explicitamente en
  `src/lib/ods/telemetry/mismatchFields.ts:4`.
- Cambios a reglas, tests, SQL, telemetria o `payload_normalized`.
- Backfill o auditoria de datos reales.

## Pipeline resumido

1. El importador obtiene un parse preliminar y usa `fecha_servicio` detectada
   para filtrar tarifas vigentes; si no detecta fecha usa la fecha actual
   (`src/app/api/ods/importar/route.ts:374`,
   `src/app/api/ods/importar/route.ts:379`).
2. Carga `tarifas` desde Supabase con filtros de vigencia, sin `order()`, y
   proyecta `codigo_servicio`, `modalidad_servicio` y `valor_base`
   (`src/app/api/ods/importar/route.ts:402`,
   `src/app/api/ods/importar/route.ts:406`,
   `src/app/api/ods/importar/route.ts:436`).
3. `runImportPipeline` llama a `suggestServiceFromAnalysis` con el analysis,
   las tarifas y el lookup de empresa por NIT
   (`src/lib/ods/import/pipeline.ts:610`).
4. Luego genera alternativas con modalidades mutadas y `process_hint`; cada
   alternativa vuelve a pasar por `suggestServiceFromAnalysis` antes del ranking
   (`src/lib/ods/import/pipeline.ts:331`,
   `src/lib/ods/import/pipeline.ts:343`,
   `src/lib/ods/import/pipeline.ts:346`,
   `src/lib/ods/import/pipeline.ts:361`,
   `src/lib/ods/import/pipeline.ts:619`).
5. `rankSuggestions` ordena la sugerencia principal y alternativas, y el
   pipeline conserva hasta 3 sugerencias para el wizard
   (`src/lib/ods/import/pipeline.ts:620`).
6. El rules-engine selecciona una tarifa y copia sus campos a la sugerencia:
   `codigo_servicio`, `modalidad_servicio` y `valor_base`
   (`src/lib/ods/rules-engine/rulesEngine.ts:375`,
   `src/lib/ods/rules-engine/rulesEngine.ts:387`,
   `src/lib/ods/rules-engine/rulesEngine.ts:390`,
   `src/lib/ods/rules-engine/rulesEngine.ts:391`).
7. El snapshot de telemetria conserva esos campos como comparables
   (`src/lib/ods/telemetry/importSnapshot.ts:54`,
   `src/lib/ods/telemetry/importSnapshot.ts:56`,
   `src/lib/ods/telemetry/importSnapshot.ts:59`,
   `src/lib/ods/telemetry/importSnapshot.ts:60`).
8. Al finalizar, `buildFinalValue` vuelve a calcular `valor_base` desde la ODS
   final y ordena tarifas por `vigente_desde desc`
   (`src/lib/ods/telemetry/buildFinalValue.ts:36`,
   `src/lib/ods/telemetry/buildFinalValue.ts:40`).

## Tabla principal

| Codigo | Que representa | Inputs requeridos | Regla actual | Edge cases conocidos | Estado |
|---|---|---|---|---|---|
| `codigo_servicio` | Codigo de la tarifa seleccionada para el servicio ODS. No existe como lista hardcodeada del motor; viene de `TarifaRow.codigo_servicio` (`src/lib/ods/rules-engine/rulesEngine.ts:1`, `src/lib/ods/rules-engine/rulesEngine.ts:387`). | `analysis.document_kind`, `process_hint`, `modalidad_servicio`, participantes, horas de interprete, `is_fallido`, empresa resuelta por NIT y catalogo `tarifas` (`src/lib/ods/rules-engine/rulesEngine.ts:354`, `src/lib/ods/rules-engine/rulesEngine.ts:358`, `src/lib/ods/rules-engine/rulesEngine.ts:367`). | Cada rama del rules-engine busca la primera tarifa que cumple el predicado del tipo documental y modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:148`). Las ramas principales cubren asistencia, interprete, revision de vacante, sensibilizacion, inducciones, seleccion, contratacion, reactivacion, presentacion, seguimiento y accesibilidad (`src/lib/ods/rules-engine/rulesEngine.ts:400`, `src/lib/ods/rules-engine/rulesEngine.ts:404`, `src/lib/ods/rules-engine/rulesEngine.ts:440`, `src/lib/ods/rules-engine/rulesEngine.ts:459`, `src/lib/ods/rules-engine/rulesEngine.ts:476`, `src/lib/ods/rules-engine/rulesEngine.ts:494`, `src/lib/ods/rules-engine/rulesEngine.ts:520`, `src/lib/ods/rules-engine/rulesEngine.ts:545`, `src/lib/ods/rules-engine/rulesEngine.ts:560`, `src/lib/ods/rules-engine/rulesEngine.ts:578`, `src/lib/ods/rules-engine/rulesEngine.ts:601`). | Si no hay tarifa que matchee, la sugerencia baja a fallback sin `codigo_servicio` (`src/lib/ods/rules-engine/rulesEngine.ts:623`, test en `src/lib/ods/rules-engine/rulesEngine.test.ts:257`). Si el documento es `attendance_support`, retorna `confidence: "low"` sin codigo ni campos comparables por diseno (`src/lib/ods/rules-engine/rulesEngine.ts:400`, test en `src/lib/ods/rules-engine/rulesEngine.test.ts:50`). Si hay varias tarifas vigentes que cumplen el mismo predicado, el motor depende del orden recibido desde Supabase porque `selectTarifa` itera con `for...of` y retorna la primera coincidencia (`src/lib/ods/rules-engine/rulesEngine.ts:148`). | Cumple con dependencia externa, con gap evidente de determinismo: import carga tarifas sin `order()` (`src/app/api/ods/importar/route.ts:402`), pero `final_value` usa `order("vigente_desde", desc)` (`src/lib/ods/telemetry/buildFinalValue.ts:40`). Esto puede contaminar telemetria con mismatch artificial de `codigo_servicio` si dos vigencias coinciden. El mismo riesgo aplica a alternativas, porque `generateAlternativeSuggestions` vuelve a consultar reglas con modalidades mutadas y `process_hint` (`src/lib/ods/import/pipeline.ts:346`, `src/lib/ods/import/pipeline.ts:363`). Tests cubren ramas de codigo por fixture de tarifas (`src/lib/ods/rules-engine/rulesEngine.test.ts:56`, `src/lib/ods/rules-engine/rulesEngine.test.ts:94`, `src/lib/ods/rules-engine/rulesEngine.test.ts:118`, `src/lib/ods/rules-engine/rulesEngine.test.ts:248`), pero no cubren orden de catalogo en import. |
| `modalidad_servicio` | Modalidad comparable del servicio sugerido: virtual, Bogota o fuera de Bogota en representacion interna del motor. | Modalidad parseada, asunto del archivo/correo, ciudad de empresa, tipo documental y modalidad de la tarifa seleccionada (`src/lib/ods/rules-engine/rulesEngine.ts:630`, `src/lib/ods/rules-engine/rulesEngine.ts:638`, `src/lib/ods/rules-engine/rulesEngine.ts:648`). | `inferModalidad` prioriza modalidad detectada directamente, luego asunto con "virtual", luego ciudad de empresa para tipos ODS presenciales (`src/lib/ods/rules-engine/rulesEngine.ts:635`, `src/lib/ods/rules-engine/rulesEngine.ts:638`, `src/lib/ods/rules-engine/rulesEngine.ts:641`). La sugerencia final usa `row.modalidad_servicio` de la tarifa, con fallback a la modalidad inferida (`src/lib/ods/rules-engine/rulesEngine.ts:390`). | La representacion interna usa `Bogota` y `Fuera de Bogota` sin acento en algunos paths (`src/lib/ods/rules-engine/rulesEngine.ts:651`), mientras la ODS final puede guardar valores acentuados; el comparador normaliza acentos y casing (`src/lib/ods/telemetry/mismatchFields.ts:33`, test en `src/lib/ods/telemetry/mismatchFields.test.ts:12`). Si no hay modalidad ni empresa, el motor devuelve razon de baja certeza (`src/lib/ods/rules-engine/rulesEngine.ts:668`). | Cumple por diseño para normalizacion basica. Tests cubren modalidad directa en muchas ramas (`src/lib/ods/rules-engine/rulesEngine.test.ts:74`, `src/lib/ods/rules-engine/rulesEngine.test.ts:102`, `src/lib/ods/rules-engine/rulesEngine.test.ts:163`) y evitan alternativa redundante `Bogota`/`Bogota` en pipeline (`src/lib/ods/import/pipeline.test.ts:388`). Sin cobertura directa del fallback completo asunto -> ciudad -> vacio; marcar para F4 si F3 prioriza tests de modalidad. |
| `valor_base` | Valor base unitario de la tarifa que acompana el codigo sugerido. En telemetria se compara contra el valor base recalculado desde la ODS final. | Fila de tarifa seleccionada por el motor, catalogo `tarifas` filtrado por vigencia, y en finalize `ods.fecha_servicio` + `ods.codigo_servicio` (`src/lib/ods/rules-engine/rulesEngine.ts:391`, `src/lib/ods/telemetry/buildFinalValue.ts:37`, `src/lib/ods/telemetry/buildFinalValue.ts:38`). | En motor, `valor_base` se copia de `row.valor_base` al finalizar la sugerencia (`src/lib/ods/rules-engine/rulesEngine.ts:391`). En finalizacion, `buildFinalValue` consulta `tarifas` por `codigo_servicio`, filtra por `ods.fecha_servicio`, ordena por `vigente_desde desc` y toma una fila (`src/lib/ods/telemetry/buildFinalValue.ts:36`, `src/lib/ods/telemetry/buildFinalValue.ts:40`). | Caso concreto: si el parser preliminar no extrae `fecha_servicio`, el importador usa `today` para cargar tarifas (`src/app/api/ods/importar/route.ts:374`, `src/app/api/ods/importar/route.ts:379`). Si el pipeline luego recupera o recibe una `fecha_servicio` real distinta, el motor ya sugirio `valor_base` con vigencia de `today`, mientras `buildFinalValue` usa la fecha real guardada en la ODS (`src/lib/ods/telemetry/buildFinalValue.ts:38`). | Gap evidente condicionado por fecha: cuando `detectedFecha` falta en la carga de catalogos pero la ODS final queda con fecha real, puede haber mismatch de `valor_base` aunque `codigo_servicio` sea correcto. Tambien comparte el riesgo de determinismo por falta de `order()` en import. Tests cubren derivacion final y vigencia mas reciente (`src/lib/ods/telemetry/buildFinalValue.test.ts:101`, `src/lib/ods/telemetry/buildFinalValue.test.ts:154`), pero no hay test que conecte import `fechaForVigencia = today` con `final_value` por `fecha_servicio` real. |

## Familias de reglas actuales

El rules-engine no usa una tabla interna de codigos. Usa familias de reglas que
filtran `tarifas` por descripcion, modalidad, bucket o senales del documento:

- Interprete LSC: horas, visita fallida y texto de interprete
  (`src/lib/ods/rules-engine/rulesEngine.ts:404`).
- Control de asistencia: clasifica `attendance_support`, retorna `confidence:
  "low"` sin codigo ni campos comparables
  (`src/lib/ods/rules-engine/rulesEngine.ts:400`).
- Revision de vacante: modalidad y descripcion de vacante
  (`src/lib/ods/rules-engine/rulesEngine.ts:440`).
- Sensibilizacion e inducciones: modalidad y palabras de familia
  (`src/lib/ods/rules-engine/rulesEngine.ts:459`,
  `src/lib/ods/rules-engine/rulesEngine.ts:476`).
- Seleccion y contratacion incluyente: modalidad y bucket de participantes
  (`src/lib/ods/rules-engine/rulesEngine.ts:494`,
  `src/lib/ods/rules-engine/rulesEngine.ts:520`).
- Reactivacion y presentacion: gestion, empresa o cantidad de empresas
  (`src/lib/ods/rules-engine/rulesEngine.ts:545`,
  `src/lib/ods/rules-engine/rulesEngine.ts:560`).
- Seguimiento: seguimiento normal vs visita adicional
  (`src/lib/ods/rules-engine/rulesEngine.ts:578`).
- Accesibilidad: modalidad y tamano de empresa
  (`src/lib/ods/rules-engine/rulesEngine.ts:601`).

Los parsers alimentan esas reglas con campos como `fecha_servicio`,
`modalidad_servicio`, `cargo_objetivo`, participantes y horas de interprete
(`src/lib/ods/import/parsers/index.ts:30`,
`src/lib/ods/import/parsers/index.ts:102`,
`src/lib/ods/import/parsers/index.ts:129`). Los perfiles de proceso refuerzan
que la modalidad debe salir de datos generales o datos de empresa, no de
secciones posteriores (`src/lib/ods/import/processProfiles.ts:175`,
`src/lib/ods/import/processProfiles.ts:205`,
`src/lib/ods/import/processProfiles.ts:235`,
`src/lib/ods/import/processProfiles.ts:391`).

## Bugs detectados durante inventario

### 1. `valor_base` puede quedar atado a la fecha de carga de catalogo

Evidencia:

- `detectedFecha` sale del parse preliminar y se trunca a ISO date
  (`src/app/api/ods/importar/route.ts:374`).
- Si falta, `fechaForVigencia` usa `new Date()`
  (`src/app/api/ods/importar/route.ts:379`).
- Las tarifas del motor se filtran con esa fecha antes de correr todo el
  pipeline (`src/app/api/ods/importar/route.ts:402`).
- `final_value` recalcula con `ods.fecha_servicio`
  (`src/lib/ods/telemetry/buildFinalValue.ts:38`).

Escenario concreto: un PDF no entrega `fecha_servicio` en el parse preliminar,
pero el flujo final termina con una fecha real en la ODS. Si entre `today` y la
fecha real hay cambio de vigencia, el motor puede sugerir un `valor_base`
vigente para `today`, mientras la telemetria final compara contra el valor
vigente para la fecha real. Este gap es condicionado: no aplica cuando
`detectedFecha` existe y coincide con la fecha final.

### 2. Riesgo de determinismo por orden de tarifas

Evidencia:

- Import carga tarifas vigentes sin `order()`
  (`src/app/api/ods/importar/route.ts:402`).
- `selectTarifa` itera con `for...of` y retorna la primera fila que cumple el
  predicado (`src/lib/ods/rules-engine/rulesEngine.ts:148`).
- `buildFinalValue` si ordena por `vigente_desde desc`
  (`src/lib/ods/telemetry/buildFinalValue.ts:40`).
- Las alternativas tambien pasan por el rules-engine con modalidades mutadas o
  `process_hint` antes del ranking (`src/lib/ods/import/pipeline.ts:331`,
  `src/lib/ods/import/pipeline.ts:346`,
  `src/lib/ods/import/pipeline.ts:361`,
  `src/lib/ods/import/pipeline.ts:620`).

Riesgo: con dos filas vigentes que matchean el mismo codigo/familia o la misma
descripcion, el motor puede elegir una fila por orden indeterminado del scan,
pero la finalizacion elige la mas reciente. Esto puede producir mismatch
artificial de `codigo_servicio` o `valor_base` y contaminar la lectura de
telemetria.

### 3. Fallo de catalogos degrada a sugerencias vacias

Evidencia:

- Los resultados de catalogos se consumen con `data || []`
  (`src/app/api/ods/importar/route.ts:436`).
- Si `tarifas` queda vacio, el rules-engine puede devolver fallback low sin
  `codigo_servicio` (`src/lib/ods/rules-engine/rulesEngine.ts:623`).

Esto no es bug nuevo del motor; es una dependencia externa de cobertura. Queda
documentado porque afecta los tres codigos del inventario.

## Cobertura de tests existente

- `codigo_servicio`: `rulesEngine.test.ts` cubre ramas de interprete,
  vacante, sensibilizacion, inducciones, seleccion, contratacion,
  reactivacion, presentacion, seguimiento, accesibilidad y fallback sin tarifa
  (`src/lib/ods/rules-engine/rulesEngine.test.ts:56`,
  `src/lib/ods/rules-engine/rulesEngine.test.ts:74`,
  `src/lib/ods/rules-engine/rulesEngine.test.ts:94`,
  `src/lib/ods/rules-engine/rulesEngine.test.ts:118`,
  `src/lib/ods/rules-engine/rulesEngine.test.ts:136`,
  `src/lib/ods/rules-engine/rulesEngine.test.ts:145`,
  `src/lib/ods/rules-engine/rulesEngine.test.ts:154`,
  `src/lib/ods/rules-engine/rulesEngine.test.ts:163`,
  `src/lib/ods/rules-engine/rulesEngine.test.ts:248`,
  `src/lib/ods/rules-engine/rulesEngine.test.ts:257`).
- `modalidad_servicio`: hay cobertura indirecta por ramas que requieren
  modalidad directa, por alternativas de modalidad y por normalizacion de
  acentos en el comparador (`src/lib/ods/rules-engine/rulesEngine.test.ts:74`,
  `src/lib/ods/import/pipeline.test.ts:388`,
  `src/lib/ods/telemetry/mismatchFields.test.ts:12`). No se encontro cobertura
  directa de toda la cadena de fallback de `inferModalidad`.
- `valor_base`: hay cobertura de `buildFinalValue` para derivar el valor,
  retornar null si no hay tarifa y elegir la vigencia mas reciente
  (`src/lib/ods/telemetry/buildFinalValue.test.ts:101`,
  `src/lib/ods/telemetry/buildFinalValue.test.ts:144`,
  `src/lib/ods/telemetry/buildFinalValue.test.ts:154`). No se encontro
  cobertura del desalineamiento entre `fechaForVigencia` del import y
  `ods.fecha_servicio` del finalize.

## Fuera de alcance / sospechas sin evidencia suficiente

- `confidence`: queda fuera de F1. El ranking pondera `confidence`,
  `codigo_servicio`, `modalidad_servicio`, `valor_base`, observaciones y
  rationale (`src/lib/ods/import/rankedSuggestions.ts:10`), pero este documento
  no audita si esos pesos son correctos.
- `proyeccion_servicios` y `service_key`: no se encontro puente activo hacia
  `motor_suggestion`; por tanto no se reporta como gap del motor de ODS en F1.
- Literalidad de codigos reales: el repo contiene codigos de fixture en tests,
  pero el motor productivo depende de la tabla `tarifas`. Listar codigos reales
  desde fixtures o desde supuestos de BD seria inventar catalogo.

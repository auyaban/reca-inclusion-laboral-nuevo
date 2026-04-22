# Inventario Legacy de Seguimientos

Fecha: 2026-04-21
Origen revisado:
- `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\seguimientos\seguimientos.py`
- `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\app.py`
- `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\completion_payloads.py`
- `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\drive_upload.py`
- `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\docs\seguimientos_flujo_operativo.md`
- `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\tests\test_seguimientos_runtime.py`

## Resumen ejecutivo

`Seguimientos` no es un formulario largo normal. En Legacy funciona como un modulo de gestion de casos sobre un Google Sheet por vinculado, con workflow propio, estados por etapa, borradores locales por hoja, exportacion parcial a PDF y reglas mixtas entre negocio, UX y estructura del spreadsheet.

Las tres piezas principales son:

1. `SeguimientosWindow`:
   Busca cedula, resuelve empresa, decide si el caso es `Compensar` o `No Compensar`, crea el caso si no existe y muestra la etapa sugerida.
2. `SeguimientoEditorWindow`:
   Edita una sola etapa del caso a la vez, pero puede guardar varias etapas pendientes en lote si hay borradores locales.
3. `formularios/seguimientos/seguimientos.py`:
   Resuelve todo lo operativo de Drive, Google Sheets, payloads, workflow, progress snapshots, lectura/escritura diff y export bundle para PDF.

## Funcionalidades inventariadas

### 1. Busqueda del vinculado

- Busca por cedula en `usuarios_reca`.
- La UI carga primero una lista de cedulas y permite filtrar en el combo.
- Si falla la carga de cedulas, deshabilita `Buscar`, muestra mensaje inline y permite `Recargar lista`.
- Traduce errores de permisos/red a mensajes operativos.

### 2. Resolucion de empresa

- Intenta resolver empresa desde los datos del vinculado en `usuarios_reca`:
  - `empresa_nit`
  - `empresa_nombre`
- Si encuentra empresa en `empresas`, precarga:
  - datos de la empresa
  - `caja_compensacion`
  - `profesional_asignado`
- Si no la encuentra, deja busqueda manual por:
  - NIT
  - nombre
- La clasificacion `Compensar / No Compensar` puede venir inferida desde `caja_compensacion`, o quedar a confirmacion manual.

### 3. Creacion y reapertura del caso

- Un caso equivale a:
  - una carpeta en Drive bajo `SEGUIMIENTOS`
  - un Google Sheet copiado desde plantilla
- El nombre de la carpeta se construye como:
  - `PrimerNombre PrimerApellido - cedula`
- Si el caso ya existe:
  - se reutiliza el mismo Sheet
  - se hace un `save_base_payload(..., overwrite=False)` para sembrar datos faltantes sin pisar valores ya diligenciados
- Si el caso no existe:
  - se crea carpeta
  - se copia la plantilla
  - se limpian protected ranges
  - se inicializa hoja base
  - se inicializan las 6 hojas de seguimiento con payload vacio

### 4. Distincion Compensar vs No Compensar

- `Compensar`:
  - `max_seguimientos = 6`
- `No Compensar`:
  - `max_seguimientos = 3`
- El editor y la sugerencia usan ese limite para decidir cuantas etapas visibles mostrar.
- El metadata del caso guarda `max_seguimientos` en `appProperties` del archivo de Drive.

### 5. Workflow por etapas visibles

La UX reciente ya no expone nombres tecnicos de hojas, sino estas etapas:

1. `Identificar vinculado`
2. `Confirmar empresa`
3. `Ficha inicial del proceso`
4. `Seguimiento actual`
5. `Historial de seguimientos`
6. `Resultado final`

Comportamientos clave:

- siempre hay una sola etapa sugerida
- se permite entrar a etapas previas para correccion
- `Resultado final` es solo lectura
- el boton principal es `Continuar donde voy`
- el editor tiene selector de etapa con nombres amigables

### 6. Ficha inicial del proceso

La base del caso se diligencia en la hoja `9. SEGUIMIENTO AL PROCESO DE INCLUSION LABORAL`.

Bloques visibles en UI:

- `Datos de visita`
- `Empresa`
- `Datos del vinculado`
- `Funciones y apoyos`
- `Linea de tiempo de seguimientos`

Reglas importantes:

- `Empresa` se muestra readonly en el editor
- `Fecha fin contrato` acepta fecha o texto libre, con accion rapida `No aplica`
- la linea de tiempo de seguimientos se muestra en readonly en la ficha base
- las fechas del historial realmente se alimentan desde cada hoja de seguimiento

### 7. Seguimientos 1..6

Cada seguimiento tiene su propia hoja:

- `SEGUIMIENTO PROCESO IL 1`
- ...
- `SEGUIMIENTO PROCESO IL 6`

Cada seguimiento tiene estos bloques:

- `Datos del seguimiento`
- `Desempeno del vinculado`
- `Evaluacion de la empresa`
- `Situacion encontrada y estrategias`
- `Asistentes`

Funcionalidades especiales:

- acciones rapidas para aplicar una misma evaluacion a todo un grupo
- `Copiar datos del seguimiento anterior`
- dictado de voz en textos largos
- autosave local por hoja
- guardado remoto diff a Google Sheets

### 8. Copiar seguimiento anterior

La accion `Copiar datos del seguimiento anterior`:

- solo existe para seguimiento `2+`
- copia:
  - modalidad
  - tipo de apoyo
  - observaciones y evaluaciones por item
  - evaluaciones empresariales
  - asistentes
- no copia:
  - `fecha_seguimiento`
  - `situacion_encontrada`
  - `estrategias_ajustes`

### 9. Resultado final

- corresponde a `PONDERADO FINAL`
- el editor lo trata como `solo lectura`
- no se diligencia manualmente
- se asume que el consolidado se alimenta por formulas del Sheet

### 10. Guardado y confirmacion de sobreescritura

`Guardar etapa` no solo guarda la hoja actual:

- primero recoge borradores locales pendientes del mismo caso
- arma save plans diff por hoja
- detecta cambios reales contra Google Sheets
- si hay sobreescrituras, resalta campos en amarillo y pide confirmacion explicita
- si hay borradores pendientes en otras etapas, tambien resume esas sobreescrituras ocultas antes de confirmar
- al guardar manualmente, limpia el draft local de las hojas persistidas

### 11. Borradores locales especiales

`Seguimientos` esta opt-out del runtime generico de drafts:

- `supports_drafts = False`
- no usa el autosave generico del hub
- usa un store local propio:
  - `seguimientos_local_drafts.json`
- guarda por:
  - caso
  - hoja
  - fingerprint del payload
  - metadata del usuario y del caso

El hub si los lista y permite:

- reabrir un borrador local de seguimiento
- borrarlo

### 12. Exportacion PDF

Despues de guardar manualmente, la UI ofrece generar PDF.

Opciones:

- solo `Ficha inicial`
- `Ficha inicial + un seguimiento visible`

No existe exportacion de:

- solo seguimiento
- multiples seguimientos en un mismo PDF

### 13. Registro de completitud

Cuando se guarda manualmente un seguimiento remoto con cambios:

- el hub registra una completion record
- usa `build_followup_completion_payload(...)`
- el source queda como `seguimientos_sheet`

Esto sirve para trazabilidad reciente, no para finalizacion completa del caso.

### 14. Handoff a Interprete LSC

Desde `SeguimientosWindow` hay acceso a `Solicitar Interprete LSC`.

Contexto que se transfiere:

- empresa actual, si existe
- oferente actual con `nombre`, `cedula` y proceso=`Seguimiento`

## Logica de codigo

### A. Archivo principal de dominio

`formularios/seguimientos/seguimientos.py` concentra:

- resolucion del caso en Drive
- lectura y escritura a Google Sheets
- normalizacion de payload base y followup
- calculo de progress snapshots
- stage model / workflow state
- export bundle para PDF

Es un modulo de dominio + integracion, no solo adapter de Sheets.

### B. UI Legacy

`app.py` concentra dos ventanas especificas:

- `SeguimientosWindow`
- `SeguimientoEditorWindow`

Responsabilidades de `SeguimientosWindow`:

- lookup de cedula
- lookup de empresa
- confirmacion Compensar / No Compensar
- bootstrap del caso
- resumen del workflow
- acceso al editor

Responsabilidades de `SeguimientoEditorWindow`:

- render de la hoja seleccionada
- diff local vs remoto
- highlighting de overwrite
- autosave local por hoja
- guardado remoto por lote
- decision de PDF

### C. Bootstrap del editor

Antes de abrir el editor, el runtime precarga:

- `meta = seguimientos.get_case_meta(...)`
- `workflow = seguimientos.get_workflow_state(...)`
- `suggestion = _build_followup_suggestion_from_workflow(...)`

Esto evita abrir el editor "a ciegas" y permite elegir etapa inicial.

### D. Guardado diff

Hay dos modos de save plan:

- `full`
- `diff`

En UI se usa `diff`.

El `diff`:

- lee payload remoto actual
- compara campo a campo
- devuelve:
  - `updates`
  - `changes`
  - `overwrite_fields`
  - `new_fields`
  - `has_changes`

### E. Progress snapshots

La sugerencia de etapa usa snapshots de cobertura, no validacion semantica completa.

Base:

- mira un set fijo de campos escalares
- mira funciones `1..10`
- calcula `% llenado`
- `>= 90%` => `completed`

Followup:

- mira:
  - modalidad
  - fecha
  - tipo_apoyo
  - textos largos
  - 19 autoevaluaciones
  - 19 evaluaciones de empresa
  - 8 evaluaciones empresariales
- `>= 90%` => `completed`

### F. Readonly y permisos operativos

No existe un sistema formal de permisos.
Las restricciones se implementan en UI y workflow:

- `Resultado final` no es editable
- si una etapa no esta en `sheet_options`, no se puede editar desde el editor
- la base puede seguir editandose aunque la etapa sugerida ya sea otro seguimiento
- un seguimiento previo no queda bloqueado: puede abrirse para correccion

## Logica de negocio

### 1. Un caso es por vinculado, no por empresa

La identidad operativa del caso es la cedula del vinculado, aunque:

- hereda empresa asociada
- usa nombre de empresa en contexto
- exporta documentos con metadata empresarial

### 2. La empresa define el alcance del proceso

La clasificacion `Compensar / No Compensar` cambia:

- el numero de seguimientos visibles
- la narrativa operativa del caso

### 3. La ficha inicial es prerequisito operacional

Sin completar la ficha base:

- el sistema sigue sugiriendo la base
- el historial no deberia ser el flujo principal

Pero no hay un bloqueo total de guardado de seguimientos basado en reglas de negocio duras; la UI funciona mas por sugerencia y por etapas visibles.

### 4. La completitud se define por cobertura, no por reglas de negocio profundas

El criterio fuerte actual es:

- `>= 90%` de campos considerados en el snapshot

Eso significa que:

- una etapa puede quedar `completed` aunque semanticamente tenga informacion debil
- una etapa puede quedar `in_progress` aunque ya tenga lo minimo operativo para trabajar

### 5. El consolidado final se asume formula-driven

La logica actual asume:

- el usuario no edita `PONDERADO FINAL`
- las formulas del template consolidan automaticamente

No existe en codigo una rutina que:

- audite formulas
- repare formulas
- regenere consolidado server-side

### 6. Se privilegia correccion sobre bloqueo

Legacy permite:

- reabrir seguimientos previos
- corregir etapas no sugeridas
- seguir guardando si el usuario sabe lo que esta haciendo

La proteccion principal no es bloquear, sino:

- mostrar etapa sugerida
- mostrar colores de estado
- advertir sobre sobreescrituras

### 7. El save manual puede consolidar varias etapas locales

Si hay drafts locales de varias hojas del mismo caso:

- `Guardar etapa` puede persistir varias hojas en el mismo flujo
- esto reduce riesgo de perder cambios locales
- pero mezcla persistencia multi-etapa en una sola accion

## Integraciones

### Supabase

Tablas consultadas:

- `usuarios_reca`
- `empresas`

Usos:

- cargar lista de cedulas
- resolver datos del vinculado
- resolver empresa por NIT o nombre
- mezclar cache de empresa con payload

### Google Drive

Usos:

- ubicar carpeta raiz `SEGUIMIENTOS`
- buscar carpeta del caso por nombre/sufijo
- copiar plantilla como Google Sheet
- listar archivos dentro de la carpeta del caso
- abrir Sheet por `webViewLink`
- encolar PDF

### Google Sheets

Usos:

- `batchGet` para lectura remota
- `batch_write_sheet_updates(...)` para escritura
- `clear_protected_ranges(...)`
- `get_spreadsheet(...)` para metadata y sheets

### PDF / Drive upload

Usos:

- construir bundle de exportacion
- seleccionar `base_only` o `base_plus_followup`
- encolar job de PDF en Drive
- usar naming `tipo_acta = seguimiento`

### Dictado

Los campos largos usan `attach_dictation(...)` con:

- `form_id = seguimientos`
- session provider basado en access token

### Hub / completions

Usos:

- listar drafts locales especiales
- registrar completions de seguimientos guardados

## Mapeos

### A. Supabase -> payload base

`SECTION_1_SUPABASE_MAP` mapea empresa desde `empresas` hacia estos campos del payload:

| Payload | Supabase |
|---|---|
| `nombre_empresa` | `nombre_empresa` |
| `ciudad_empresa` | `ciudad_empresa` |
| `direccion_empresa` | `direccion_empresa` |
| `nit_empresa` | `nit_empresa` |
| `correo_1` | `correo_1` |
| `telefono_empresa` | `telefono_empresa` |
| `contacto_empresa` | `contacto_empresa` |
| `cargo` | `cargo` |
| `asesor` | `asesor` |
| `sede_empresa` | `zona_empresa` |
| `caja_compensacion` | `caja_compensacion` |
| `profesional_asignado` | `profesional_asignado` |

Adicionalmente, desde `usuarios_reca` se siembran:

- `nombre_vinculado`
- `cedula`
- `telefono_vinculado`
- `correo_vinculado`
- `contacto_emergencia`
- `parentesco`
- `telefono_emergencia`
- `cargo_vinculado`
- `certificado_discapacidad`
- `certificado_porcentaje`
- `discapacidad`
- `tipo_contrato`

### B. Hoja base -> celdas clave

Escalares:

| Campo | Celda |
|---|---|
| `fecha_visita` | `D8` |
| `modalidad` | `R8` |
| `nombre_empresa` | `D9` |
| `ciudad_empresa` | `R9` |
| `direccion_empresa` | `D10` |
| `nit_empresa` | `R10` |
| `correo_1` | `D11` |
| `telefono_empresa` | `R11` |
| `contacto_empresa` | `D12` |
| `cargo` | `R12` |
| `asesor` | `D13` |
| `sede_empresa` | `R13` |
| `nombre_vinculado` | `A16` |
| `cedula` | `E16` |
| `telefono_vinculado` | `I16` |
| `correo_vinculado` | `K16` |
| `contacto_emergencia` | `P16` |
| `parentesco` | `S16` |
| `telefono_emergencia` | `U16` |
| `cargo_vinculado` | `A18` |
| `certificado_discapacidad` | `E18` |
| `certificado_porcentaje` | `I18` |
| `discapacidad` | `N18` |
| `tipo_contrato` | `C20` |
| `fecha_inicio_contrato` | `M20` |
| `fecha_fin_contrato` | `T20` |
| `apoyos_ajustes` | `E21` |

Arrays:

- `funciones_1_5` -> `B23:B27`
- `funciones_6_10` -> `N23:N27`
- `seguimiento_fechas_1_3` -> `C29:C31`
- `seguimiento_fechas_4_6` -> `P29:P31`

### C. Followup -> celdas clave

Escalares:

| Campo | Celda |
|---|---|
| `modalidad` | `E8` |
| `seguimiento_numero` | `P8` |
| `fecha_seguimiento` | `X8` |
| `tipo_apoyo` | `J31` |
| `situacion_encontrada` | `A43` |
| `estrategias_ajustes` | `A45` |

Arrays:

- labels de items -> `A12:A30`
- `item_observaciones` -> `G12:G30`
- `item_autoevaluacion` -> `O12:O30`
- `item_eval_empresa` -> `R12:R30`
- labels de empresa -> `A34:A41`
- `empresa_eval` -> `J34:J41`
- `empresa_observacion` -> `L34:L41`
- asistentes nombres -> `D47:D50`
- asistentes cargos -> `N47:N50`

### D. Base -> PONDERADO FINAL

El codigo escribe directamente a `PONDERADO FINAL` estos grupos:

Empresa:

| Campo | Celda |
|---|---|
| `fecha_visita` | `D6` |
| `modalidad` | `Q6` |
| `nombre_empresa` | `D7` |
| `ciudad_empresa` | `Q7` |
| `direccion_empresa` | `D8` |
| `nit_empresa` | `Q8` |
| `correo_1` | `D9` |
| `telefono_empresa` | `Q9` |
| `contacto_empresa` | `D10` |
| `cargo` | `Q10` |
| `caja_compensacion` | `D11` |
| `sede_empresa` | `Q11` |
| `asesor` | `D12` |
| `profesional_asignado` | `Q12` |

Usuario:

| Campo | Celda |
|---|---|
| `nombre_vinculado` | `K15` |
| `cedula` | `Q15` |
| `telefono_vinculado` | `S15` |
| `correo_vinculado` | `U15` |
| `cargo_vinculado` | `K17` |
| `certificado_discapacidad` | `Q17` |
| `certificado_porcentaje` | `U17` |
| `fecha_firma_contrato` | `N18` |
| `discapacidad` | `U18` |

Nota:

- `fecha_firma_contrato` solo vive en `PONDERADO FINAL!N18`; por eso hay excepcion explicita para no perderlo al reabrir el caso.

### E. Followup -> fecha en hoja base

Cada save de seguimiento replica la fecha hacia la timeline de la hoja base:

- seguimiento `1..3` -> `C29:C31`
- seguimiento `4..6` -> `P29:P31`

## Otros hallazgos relevantes

### 1. Inconsistencia: visibilidad real de hojas vs max_seguimientos

`_set_sheet_visibility(spreadsheet_id, max_seguimientos)` recibe `max_seguimientos`, pero la implementacion no lo usa para decidir que hojas ocultar. Solo oculta las hojas irrelevantes al modulo, no las adicionales `4..6`.

Implicacion:

- la UI si distingue `3` vs `6`
- el Google Sheet puede quedar con mas hojas visibles de las que el workflow expone

Esto huele a deuda o bug.

### 2. Inconsistencia: template id de Seguimientos

`get_seguimientos_template_id()` intenta primero `get_master_template_id()` y solo si eso falla usa `GOOGLE_SHEETS_SEGUIMIENTOS_TEMPLATE_ID`.

Implicacion:

- si el master template general existe, Seguimientos podria estar reutilizando ese template antes que el especifico
- vale la pena validar en produccion si ambos ids son realmente distintos

### 3. El consolidado depende del template, no del codigo

No hay ninguna logica para reparar formulas rotas del consolidado. Si `PONDERADO FINAL` esta mal formulado:

- el editor seguira mostrandolo como readonly
- el backend no lo corrigira
- el save no reconstituye formulas

### 4. Drafts especiales, no shared

Aunque `Seguimientos` ya tiene autosave local y recovery, ese runtime es especial y esta separado del framework shared de drafts del proyecto nuevo.

Implicacion:

- probablemente no conviene portar el comportamiento tal cual
- conviene reexpresarlo sobre la infraestructura shared del proyecto web, pero respetando la granularidad por etapa

### 5. La validacion dura de la base es minima

Para guardar manualmente la ficha base solo se exige:

- `fecha_visita`
- `modalidad`

El resto influye en coverage y sugerencia, pero no bloquea el save.

### 6. Hay codigo de empresa en el editor que parece drift

`SeguimientoEditorWindow` conserva metodos para buscar empresa por NIT/nombre y aplicar datos de empresa, pero la UI actual de la ficha base renderiza empresa como readonly y no expone esos controles.

Esto parece remanente de iteraciones anteriores o codigo listo para reactivar.

### 7. Completion tracking es por seguimiento, no por caso

El sistema registra completions del seguimiento guardado, no una finalizacion del caso completo. Esto es coherente con el flujo operativo, pero implica que `Seguimientos` no encaja 1:1 con la semantica de "formulario finalizado" del resto del proyecto.

## Implicaciones directas para la migracion web

1. `Seguimientos` debe modelarse como modulo de caso, no como formulario largo simple.
2. La entidad central debe ser `caso de seguimiento`, no solo `payload de formulario`.
3. Hay que separar claramente:
   - workflow por etapas
   - payloads por hoja
   - resumen/consolidado
   - drafts locales o remotos
4. Hay que decidir si el consolidado sigue siendo formula-driven en Google Sheets o si se recalcula de forma controlada.
5. Hay que hacer una matriz explicita de reglas por:
   - empresa Compensar / No Compensar
   - hoja base
   - seguimiento activo
   - historial
   - campos editables vs readonly
6. No conviene migrar ciegamente las deudas actuales:
   - visibilidad inconsistente de hojas
   - dependencia ambigua de template
   - readonly final sin verificacion de formulas
   - runtime de drafts paralelo al sistema shared del proyecto nuevo

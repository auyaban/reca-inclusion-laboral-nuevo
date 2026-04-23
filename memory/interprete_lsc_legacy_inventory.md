# Inventario Legacy de Intérprete LSC

Fecha: 2026-04-22
Origen revisado:
- `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\interprete_lsc\interprete_lsc.py`
- `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\app.py`
- `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\completion_payloads.py`
- `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\drive_upload.py`
- `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\src\components\forms\shared\AsistentesSection.tsx`
- `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\src\components\forms\shared\FixedAsistentesSection.tsx`
- `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\src\hooks\useProfesionalesCatalog.ts`

Ver también:

- `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\memory\interprete_lsc_migration_matrix.md`

## Resumen ejecutivo

Legacy manejaba `Servicio de Interpretación LSC` de dos maneras:

1. como formulario standalone desde el hub
2. como flujo embebido lanzado desde otros formularios, con espera y bloqueo de finalización del formulario padre

La decisión actual para web es migrar solo la versión standalone. Eso elimina la parte más costosa y menos rentable del legado:

- no se migra el botón `Solicitar Intérprete LSC` dentro de otros formularios
- no se migra el handoff contextual desde formularios padre
- no se migra la espera del formulario principal mientras se crea el acta LSC
- no se migra la lógica de reintento o cierre coordinado entre dos flujos

Lo que sí se necesita migrar es un formulario nuevo, separado, pequeño y con lógica puntual:

- empresa + fecha/modalidades
- oferentes o vinculados acompañados
- intérpretes con horas y sumatoria
- asistentes
- escritura al maestro LSC con filas dinámicas

## Lo que existía antes

### 1. Formulario standalone

Legacy exponía `LSCWindow` como ventana propia con 4 secciones:

1. `Datos de la empresa`
2. `Datos de los oferentes / vinculados`
3. `Intérpretes`
4. `Asistentes`

La finalización:

- validaba mínimos
- copiaba una plantilla de Google Sheets dedicada a LSC
- escribía los datos en la pestaña `Maestro`
- guardaba el archivo en Drive dentro de la carpeta de la empresa
- devolvía `output_path` del Sheet y `drive_file_id`
- construía `acta_metadata` para exportar PDF

Con la revisión posterior del usuario y del código legacy, queda confirmado que este flujo sí generaba PDF además del Google Sheet.

### 2. Modo embebido dentro de otros formularios

Legacy también podía abrir LSC desde:

- `presentacion_programa`
- `evaluacion_accesibilidad`
- `condiciones_vacante`
- `seleccion_incluyente`
- `contratacion_incluyente`
- `induccion_organizacional`
- `induccion_operativa`
- `sensibilizacion`
- `seguimientos`

Ese modo hacía esto:

- inyectaba empresa y, a veces, oferentes desde el formulario padre
- abría una ventana hija en `linked_mode`
- bloqueaba o difería el cierre del formulario principal mientras terminaba el acta LSC
- mostraba diálogos de espera o corrección si la acta hija seguía en proceso o fallaba

Esto queda explícitamente fuera de alcance en web.

## Contrato funcional del formulario standalone

### Sección 1. Datos de la empresa

Fuente legacy:

- búsqueda de empresa reutilizada desde `evaluacion_accesibilidad`
- datos de empresa leídos desde `empresas`
- campos del servicio diligenciados manualmente

Campos readonly provenientes de empresa:

- `nombre_empresa`
- `ciudad_empresa`
- `direccion_empresa`
- `nit_empresa`
- `contacto_empresa`
- `cargo`

Campos editables:

- `fecha_visita`
- `modalidad_interprete`
- `modalidad_profesional_reca`

Opciones legacy:

- `modalidad_interprete`: `Presencial`, `Virtual`, `Mixta`
- `modalidad_profesional_reca`: `Presencial`, `Virtual`, `No aplica`

Validación mínima:

- empresa seleccionada
- fecha del servicio obligatoria
- ambas modalidades obligatorias

### Sección 2. Oferentes / vinculados

Legacy la trataba como una lista manual de hasta `10` filas.

Campos por fila:

- `nombre_oferente`
- `cedula`
- `proceso`

Reglas:

- mínimo 1 fila significativa
- máximo 10 filas
- en standalone no había lookup a `usuarios_reca`; la carga automática solo venía cuando el formulario se abría embebido

### Sección 3. Intérpretes

Legacy la trataba como una lista dinámica de hasta `5` intérpretes.

Campos por fila:

- `nombre`
- `hora_inicial`
- `hora_final`
- `total_tiempo` calculado

Comportamiento:

- `nombre` usaba catálogo desde Supabase `interpretes`
- el combo era editable, así que también permitía escribir nombres nuevos
- `hora_inicial` y `hora_final` aceptaban formatos flexibles como `9 30 am`, `930 pm` o `14:30`
- `total_tiempo` se calculaba automáticamente a partir de hora inicial/final
- si la hora final era menor a la inicial, el cálculo asumía cruce de medianoche

Además había un bloque `Sabana`:

- checkbox `activo`
- input `horas`
- si estaba activo, esas horas se sumaban a la sumatoria general

Campo derivado adicional:

- `sumatoria_horas`

Validación mínima:

- mínimo 1 intérprete significativo
- máximo 5 intérpretes

### Sección 4. Asistentes

Legacy soportaba máximo `2` asistentes porque así viene el maestro.

Patrón real:

- fila 0: catálogo de personas RECA desde Supabase `profesionales`
- fila 1: entrada libre

Comportamiento:

- la primera fila permitía escoger desde catálogo, pero seguía siendo editable
- al escoger un profesional, el cargo se autocompletaba desde `cargo_profesional`
- la segunda fila era manual
- también se podían escribir asistentes nuevos en vez de restringirse al catálogo

Importante:

- el usuario mencionó `usuarios RECA`, pero en legacy la fuente concreta para asistentes era `profesionales`, no `usuarios_reca`

## Lógica de horas y sumatorias

### Normalización de hora

Legacy normalizaba a `HH:MM` y toleraba:

- `9`
- `930`
- `9:30`
- `9 30`
- `9 30 am`
- `930 pm`
- `21:30`

Si el valor no era interpretable, devolvía vacío.

### Cálculo por intérprete

- `total_tiempo = hora_final - hora_inicial`
- si el delta era negativo, sumaba 24 horas
- el resultado se guardaba como `H:MM`

### Cálculo global

`sumatoria_horas` = suma de todos los `total_tiempo` + horas de `Sabana` si `activo=true`

### Formato para Sheets

`Sabana` se escribía así:

- `No aplica` si el checkbox estaba apagado
- `H:MM Hora` si estaba activo

## Maestro LSC y layout dinámico

### Estructura base del template legacy

Pestaña: `Maestro`

- filas `1-9`: header + sección 1 fija
- fila `10`: label de oferentes
- fila `11`: header de tabla de oferentes
- filas `12-18`: `7` slots base de oferentes
- fila `19`: `1` slot base de intérprete
- fila `20`: `Sabana`
- fila `21`: `Sumatoria`
- filas `22-23`: observaciones fijas del template
- fila `24`: label de asistentes
- filas `25-26`: `2` slots base de asistentes

### Límites acoplados al maestro

- `MAX_OFERENTES = 10`
- `MAX_INTERPRETES = 5`
- `MAX_ASISTENTES = 2`

### Inserciones dinámicas de filas

Legacy insertaba filas extra en dos puntos:

1. si había más de `7` oferentes, insertaba filas antes del bloque de intérpretes copiando el formato de la última fila de oferente
2. si había más de `1` intérprete, insertaba filas después del primer intérprete copiando su formato

El bloque de asistentes no era dinámico. Se quedaba en 2 filas.

### Offsets derivados

Con base en el número real de oferentes e intérpretes, legacy recalculaba:

- primera fila real de intérprete
- fila real de `Sabana`
- fila real de `Sumatoria`
- fila real del label de asistentes
- primera fila real de asistentes

Eso significa que la lógica crítica no es solo el mapping de celdas fijas. También hay que portar la aritmética de offsets.

## Mapping legacy a Google Sheets

### Sección 1 fija

| Campo | Celda |
|---|---|
| `fecha_visita` | `D6` |
| `ciudad_empresa` | `N6` |
| `nombre_empresa` | `D7` |
| `direccion_empresa` | `N7` |
| `contacto_empresa` | `D8` |
| `cargo` | `N8` |
| `modalidad_interprete` | `I9` |
| `modalidad_profesional_reca` | `P9` |

### Oferentes / vinculados

Inicio base: fila `12`

| Campo | Columna |
|---|---|
| consecutivo | `A` |
| nombre | `B` |
| cédula | `F` |
| proceso | `J` |

### Intérpretes

Inicio base: fila `19`, pero desplazable por offsets

| Campo | Columna |
|---|---|
| nombre | `D` |
| hora inicial | `J` |
| hora final | `M` |
| total tiempo | `Q` |

### Sabana y sumatoria

Ambas se escriben en columna `Q`, con fila desplazable por offsets:

- `Q{sabana_row}`
- `Q{sumatoria_row}`

### Asistentes

Inicio real: después del bloque desplazado de sección 3

| Campo | Columna |
|---|---|
| nombre | `C` |
| cargo | `K` |

## Dependencias de datos legacy

### Supabase

Tablas efectivamente usadas:

- `empresas`
- `interpretes`
- `profesionales`

Uso por tabla:

- `empresas`: resolver y mostrar empresa
- `interpretes`: sugerir nombres de intérpretes
- `profesionales`: sugerir nombre/cargo del profesional RECA en asistentes

### Google Sheets / Drive

Necesita:

- un template LSC dedicado
- copia del template a carpeta de empresa
- soporte de `rowInsertions`
- escritura batch sobre la pestaña `Maestro`

### Completion metadata

Legacy normalizaba este documento como `lsc_interpretation` y guardaba, al menos:

- modalidades
- nombres de intérpretes
- `sumatoria_horas`
- participantes
- asistentes

Además, `export_to_excel()` devolvía un `acta_metadata` explícito con:

- `tipo_acta = "interprete_lsc"`
- `nit_empresa`
- `nombre_empresa`
- `fecha_servicio`
- `nombre_profesional`
- `modalidad_servicio`
- `modalidad_interprete`
- `sumatoria_horas`
- `sabana`
- `asistentes`
- `participantes`
- `interpretes`

Ese metadata se usaba para construir el PDF y sirve como referencia directa para el payload web.

## Qué ya existe en el repo web y se puede reutilizar

### Ya disponible

- `Section1Form` y el flujo estándar para escoger empresa
- runtime shared de formularios largos, drafts y finalización
- `LongFormShell`
- soporte general de `rowInsertions` en la capa Google del repo web
- `useProfesionalesCatalog` + `/api/profesionales`
- componentes de asistentes ya preparados para:
  - profesional RECA en fila 0
  - filas libres adicionales
- APIs de lookup de empresa y `usuarios_reca`

### Reutilizable con poco ajuste

- `AsistentesSection` en modo `reca_plus_generic_attendees`
- `FixedAsistentesSection` si se quiere fijar visualmente el máximo en 2 filas
- helpers de normalización de asistentes y personas
- patrón de formulario `sheet-only` tipo `Sensibilizacion` o `Evaluacion`

## Qué hace falta construir en web

### 1. Nuevo formulario y slug

Recomendación de slug: `interprete-lsc`

Trabajo:

- registrar el formulario en el dispatcher de `/formularios/[slug]`
- crear componente principal
- exponer tarjeta en `/hub` cuando llegue el momento

### 2. Contrato de validación y defaults

Crear:

- `src/lib/validations/interpreteLsc.ts`
- `getDefaultInterpreteLscValues()`
- `normalizeInterpreteLscValues()`
- tests de normalización y de reglas mínimas

### 3. Secciones y navegación

Crear:

- `src/lib/interpreteLscSections.ts`
- helper de target de validación por sección

La estructura lógica recomendada sigue siendo de 4 secciones:

1. Empresa y servicio
2. Participantes
3. Intérpretes y sumatoria
4. Asistentes

### 4. Catálogo de intérpretes

No existe todavía en web.

Hace falta:

- `GET /api/interpretes`
- `useInterpretesCatalog()`
- tipo compartido para filas de `interpretes`

Requisito funcional:

- catálogo sugerido desde Supabase
- input editable para permitir nombres nuevos

### 5. Repetidor de participantes

Hace falta una sección simple con:

- add/remove
- máximo 10
- nombre, cédula y proceso

No parece necesitar lookup a `usuarios_reca` mientras el alcance siga siendo standalone-only.

### 6. Repetidor de intérpretes

Hace falta construir un bloque específico para:

- add/remove
- máximo 5
- normalización flexible de hora
- total por fila
- sumatoria global
- `Sabana`

Esta es la única parte realmente especial del formulario.

### 7. Adapter de Google Sheets específico

Hace falta un builder dedicado para:

- writes fijos de sección 1
- writes de oferentes
- writes de intérpretes
- writes de `Sabana` y `Sumatoria`
- writes de asistentes
- cálculo de offsets
- `rowInsertions`

Recomendación:

- no hardcodear el template ID como en legacy
- moverlo a env o config explícita del repo web

### 8. API route de finalización

Hace falta:

- `POST /api/formularios/interprete-lsc`
- validación server-side
- preparación y copia del template LSC
- escritura del `Maestro`
- export PDF
- registro en `formatos_finalizados_il`
- payload normalizado + raw payload artifact
- `actaRef` / footer ID en el documento

Si se mantiene paridad con legacy y con el estándar actual del repo, este route no debe ser `sheet-only`.

### 9. Payload de completitud y observabilidad

Hace falta decidir si la metadata final en web incluirá:

- nombres de intérpretes
- `sumatoria_horas`
- asistentes
- participantes

Legacy sí la guardaba, así que conviene mantenerla.

Adicionalmente, con base en el estándar web actual, este formulario también debe persistir:

- `acta_ref`
- `sheet_link`
- `pdf_link`
- metadata de finalización (`form_slug`, `request_hash`, `idempotency_key`, `identity_key`)
- estado del `raw_payload_artifact`

Decisión cerrada:

- ODS debe consumir `payload_normalized` desde `formatos_finalizados_il`, igual que los demás formularios web
- no hace falta portar la inyección de metadata RECA dentro del PDF
- Legacy solo aporta la forma y el contenido útil de `parsed_raw`

## Qué no conviene portar tal cual

### 1. Cache local legacy por archivo

Legacy usaba un JSON local propio y además estaba excluido del sistema genérico de drafts.

En web no conviene repetir eso. Debe montarse sobre el runtime shared actual.

### 2. Handoff desde formularios padre

Queda descartado:

- pasar empresa u oferentes por contexto desde otros formularios
- abrir la acta LSC como subflujo bloqueante
- posponer la finalización del formulario principal

### 3. Acoplamientos de ventana

No hace falta migrar:

- diálogos de espera
- estados `linked_mode`
- callbacks `on_linked_export_started` y `on_linked_export_finished`
- guardas de cierre del formulario padre

## Decisiones cerradas para arrancar la migración

1. `Intérprete LSC` se migra como formulario independiente.
2. No se migra la versión embebida dentro de otros formularios.
3. El formulario web debe conservar el maestro LSC dedicado y su lógica de filas dinámicas.
4. El catálogo de intérpretes seguirá siendo sugerido desde Supabase, pero no restrictivo.
5. El catálogo RECA para asistentes se puede resolver con la infraestructura ya existente de `profesionales`.
6. La primera implementación web no necesita lookup automático de participantes desde otros formularios.

## Riesgos y validaciones pendientes

### 1. Confirmar el maestro vivo

Este punto ya quedó verificado por Google API en `2026-04-22`:

- la pestaña sigue siendo `Maestro`
- el layout base sigue teniendo `7` slots de oferentes, `1` de intérprete y `2` de asistentes
- `Sabana` y `Sumatoria` siguen viviendo inmediatamente debajo del bloque de intérpretes

La comparación detallada `maestro vivo vs legacy vs web propuesta` quedó documentada en `memory/interprete_lsc_migration_matrix.md`.

### 2. Confirmar el template ID actual

Legacy leía `google_sheets_lsc_template_id` desde `config.json` y tenía fallback hardcodeado.

En web conviene definir una variable explícita nueva y validar que apunte al maestro correcto.

### 3. Confirmar si seguirá siendo sheet-only

Este punto ya quedó resuelto: no será `sheet-only`.

### 4. Confirmar si el label de sección 2 seguirá siendo `Oferentes / Vinculados`

Si el formulario ahora vivirá solo, tal vez convenga un copy más neutral según uso operativo real.

## Siguiente paso recomendado

1. Montar el contrato web mínimo:
   - schema
   - defaults
   - catálogo de intérpretes
   - secciones
   - route sheet-only
2. Implementar primero el builder de Sheets y sus tests antes de cerrar la UI.
3. Registrar después el slug en finalización + prewarm para reutilizar el runtime shared completo.

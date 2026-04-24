---
name: Matriz de migracion de Interprete LSC
description: Contraste entre maestro vivo, comportamiento legacy y propuesta web para el formulario standalone de LSC
type: working-doc
updated: 2026-04-22
---

# Matriz de migracion - Interprete LSC

Fecha de contraste: 2026-04-22

## Evidencia usada

- Legacy:
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\interprete_lsc\interprete_lsc.py`
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\app.py`
- Web actual:
  - `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\src\app\formularios\[slug]\page.tsx`
  - `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\src\hooks\useSensibilizacionFormState.tsx`
  - `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\src\lib\forms.ts`
  - `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\src\lib\finalization\formSlugs.ts`
  - `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\src\lib\finalization\prewarmConfig.ts`
  - `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\src\lib\finalization\prewarmRegistry.ts`
  - `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\src\components\forms\shared\AsistentesSection.tsx`
  - `C:\Users\aaron\Desktop\INCLUSION_LABORAL_NUEVO\src\components\forms\shared\FixedAsistentesSection.tsx`
- Maestro vivo:
  - Comando:

```bash
npm run verify:mapping -- --spreadsheet-id 1WLAoc5lKHEoH3dkR1aQv6UYpEw97b9iNc2k43hCKrmk --sheet-name Maestro
```

## Confirmaciones del maestro vivo

El maestro actual sigue usando la pestana `Maestro` y conserva este layout base:

- filas `6-9`: datos fijos de empresa y modalidades
- fila `12`: primer oferente ya visible en template
- filas `13-18`: espacio base adicional listo para oferentes
- fila `19`: unico slot base de interprete
- fila `20`: `Sabana`
- fila `21`: `SUMATORIA HORAS INTÉRPRETES`
- fila `22`: observacion fija del acta
- fila `24`: label `3.ASISTENTES`
- filas `25-26`: dos slots base de asistentes
- fila `27`: footer `www.recacolombia.org`

Esto valida tres cosas operativas:

1. Oferentes no requieren insercion estructural hasta pasar de `7`.
2. Interpretes requieren insercion estructural desde el segundo registro.
3. Asistentes requieren insercion estructural desde el tercer registro.

## Decision de producto ya cerrada

- LSC se migra solo como formulario standalone.
- No se migra el flujo embebido dentro de otros formularios.
- La salida principal sigue siendo Google Sheets.
- Debe usar el mismo runtime de empresa, drafts, locks, drafts invisibles y finalizacion del resto de formularios web.

## Contraste maestro vs legacy vs web

| Tema | Maestro vivo | Legacy | Propuesta web |
|---|---|---|---|
| Modo de uso | Sheet dedicado de LSC | Standalone + embebido | Solo standalone |
| Selector de empresa | No aplica | Reutilizado desde legacy | Reutilizar `Section1` y el runtime de long form |
| Locks y takeover | No aplica | Ventana local + reglas propias | Reutilizar `useLongFormDraftController`, `DraftLockBanner` y takeover shared |
| Drafts visibles/invisibles | No aplica | Cache local especial | Reutilizar drafts shared e invisibles; no crear cache aparte |
| Prewarm | No aplica | No existia | Si aplica; mismo patron company-based del repo |
| Oferentes en UI | 7 slots fisicos ya listos | Lista manual hasta 10 | Mostrar `1` inicial, permitir agregar hasta `10` |
| Oferentes en Sheets | Base `12-18` | Insertar solo si > 7 | Igual que maestro; insercion solo si > 7 |
| Interpretes en UI | 1 slot fisico | Lista dinamica hasta 5 | Mostrar `1` inicial, permitir agregar hasta `5` |
| Interpretes en Sheets | Base `19` | Insertar si > 1 | Igual que maestro; insercion desde el segundo |
| Sabana y sumatoria | Filas `20-21` movibles por offset | Ya calculado | Mantener misma logica con builder dedicado |
| Asistentes en UI | 2 slots fisicos | Efectivamente 2 base en legacy | Mostrar `2` iniciales, permitir agregar hasta `10` |
| Asistentes en Sheets | Base `25-26` | No crecian en legacy | Insertar desde el tercer asistente |
| Catalogo interpretes | No aplica | Tabla `interpretes`, editable | Nuevo `/api/interpretes` + combobox editable |
| Catalogo asistentes RECA | No aplica | Tabla `profesionales`, editable | Reutilizar `useProfesionalesCatalog`; editable |
| Salida final | Google Sheet base para export | Google Sheet + PDF + metadata del acta | Route con Sheet + PDF + registro en `formatos_finalizados_il` |

## Implicaciones concretas para la web

### 1. LSC si cabe en el runtime estandar

No hace falta un flujo especial. La base correcta es el patron de `Sensibilizacion`:

- editor largo en `/formularios/interprete-lsc`
- empresa al inicio del documento
- `useLongFormDraftController`
- `DraftPersistenceStatus`
- `DraftLockBanner`
- drafts invisibles
- `useGooglePrewarm`
- finalizacion con polling y pantalla final

Eso implica usar el contrato completo de finalización del repo, no un atajo:

- `registroId` para `formatos_finalizados_il`
- `actaRef` para footer y payload
- request idempotente en `form_finalization_requests`
- recovery post-persistencia
- `raw_payload_artifact`

### 2. Prewarm si conviene, pero con firma estructural propia

LSC usa empresa + template dedicado + filas dinamicas. Eso encaja con el sistema actual de prewarm.

La firma estructural no deberia usar los totales crudos si no cambian la estructura. Debe usar solo overflow real del template:

- `oferentesOverflow = max(0, oferentesCount - 7)`
- `interpretesOverflow = max(0, interpretesCount - 1)`
- `asistentesOverflow = max(0, asistentesCount - 2)`

Con eso:

- pasar de `1` a `5` oferentes no obliga rebuild del draft prewarm
- pasar de `1` a `2` interpretes si obliga rebuild
- pasar de `2` a `3` asistentes si obliga rebuild

### 3. La asimetria UI vs template es aceptable

No hay problema en que la UI muestre menos filas iniciales que el template:

- oferentes: UI con `1`, template con `7`
- interpretes: UI con `1`, template con `1`
- asistentes: UI con `2`, template con `2`

El adapter solo escribe filas significativas. Las filas base sobrantes quedan vacias en la hoja.

### 4. El bloque especial de LSC es interpretes

La unica pieza nueva con logica propia real es la seccion de interpretes:

- nombre sugerido desde catalogo editable
- `hora_inicial`
- `hora_final`
- `total_tiempo` calculado
- `Sabana`
- `sumatoria_horas`

Eso necesita un componente especifico y utilidades de tiempo con tests.

### 5. LSC no es `sheet-only`

Queda confirmado por legacy y por definición de producto actual:

- genera Google Sheet
- exporta PDF
- persiste payload normalizado
- persiste raw payload
- registra el acta en `formatos_finalizados_il`

## Payload y persistencia requeridos

### Lo que Legacy ya exponia

`export_to_excel()` devolvía:

- `output_path`
- `drive_file_id`
- `tipo_acta`
- `fecha_servicio`
- `acta_metadata`

`acta_metadata` incluía:

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

### Lo que el web actual exige además

Para quedar alineado con el runtime vigente, LSC debe construir:

- `payloadRaw`
  - `schema_version`
  - `form_id`
  - `form_name`
  - `cache_snapshot`
  - `output.sheetLink`
  - `output.pdfLink`
  - `metadata.generated_at`
  - `metadata.payload_source`
  - `metadata.acta_ref`
- `payloadNormalized`
  - `attachment.document_kind`
  - `attachment.document_label`
  - `parsed_raw`
  - `metadata.acta_ref`
  - `metadata.finalization`
  - `metadata.raw_payload_artifact`

### Estructura recomendada para `parsed_raw`

Base shared:

- `nit_empresa`
- `nombre_empresa`
- `fecha_servicio`
- `nombre_profesional`
- `candidatos_profesional`
- `participantes`
- `asistentes`
- `ciudad_empresa`
- `sede_empresa`
- `caja_compensacion`
- `asesor_empresa`

Campos LSC:

- `modalidad_interprete`
- `modalidad_profesional_reca`
- `interpretes`
- `sumatoria_horas`
- `sabana`
- `sheet_link`
- `pdf_link`
- `tipo_acta`

## Propuesta de shape web

### Secciones

1. Empresa y servicio
2. Oferentes / vinculados
3. Interpretes y horas
4. Asistentes

### Reglas de UI

- `Empresa y servicio`
  - selector de empresa shared
  - `fecha_visita`
  - `modalidad_interprete`
  - `modalidad_profesional_reca`
- `Oferentes / vinculados`
  - 1 card inicial
  - add/remove hasta 10
  - `nombre_oferente`, `cedula`, `proceso`
- `Interpretes y horas`
  - 1 fila inicial
  - add/remove hasta 5
  - calculo de horas por fila
  - checkbox/input de `Sabana`
  - sumatoria visible
- `Asistentes`
  - 2 filas iniciales
  - fila 0 con `Profesional RECA`
  - fila 1 libre
  - add/remove hasta 10

## Mapping y offsets que debe respetar el builder

### Celdas fijas

- `fecha_visita -> D6`
- `ciudad_empresa -> N6`
- `nombre_empresa -> D7`
- `direccion_empresa -> N7`
- `contacto_empresa -> D8`
- `cargo -> N8`
- `modalidad_interprete -> I9`
- `modalidad_profesional_reca -> P9`

### Oferentes

- inicio base: fila `12`
- columnas:
  - consecutivo `A`
  - nombre `B`
  - cedula `F`
  - proceso `J`

### Interpretes

- inicio base real: fila `19 + oferentesOverflow`
- columnas:
  - nombre `D`
  - hora inicial `J`
  - hora final `M`
  - total tiempo `Q`

### Filas derivadas

Si `interpreteStartRow = 19 + oferentesOverflow`:

- `sabanaRow = interpreteStartRow + interpretesCount`
- `sumatoriaRow = sabanaRow + 1`
- `observacionesRow = sumatoriaRow + 1`
- `asistentesLabelRow = sumatoriaRow + 3`
- `asistentesStartRow = asistentesLabelRow + 1`

### Asistentes

- inicio base real: `25 + oferentesOverflow + interpretesOverflow`
- columnas:
  - nombre `C`
  - cargo `K`

### Inserciones estructurales

- oferentes extra:
  - insertar antes del bloque de interpretes si `oferentesCount > 7`
- interpretes extra:
  - insertar despues del primer slot si `interpretesCount > 1`
- asistentes extra:
  - insertar antes del footer si `asistentesCount > 2`

## Piezas que ya existen y sirven

- `src/app/formularios/[slug]/page.tsx`
  - ya monta formularios largos por slug
- `src/hooks/useSensibilizacionFormState.tsx`
  - ya muestra el patron exacto de `sheet-only` con drafts, locks y prewarm
- `src/components/forms/shared/AsistentesSection.tsx`
  - ya resuelve el patron dinamico hasta 10 asistentes
- `src/components/forms/shared/FixedAsistentesSection.tsx`
  - sirve de referencia si se quisiera fijar visualmente la tabla base
- `src/hooks/useProfesionalesCatalog.ts`
  - ya resuelve nombre/cargo de RECA desde Supabase
- `src/lib/google/companySpreadsheet.ts`
  - ya soporta `rowInsertions`

## Piezas que faltan

### Registro del formulario

- agregar `interprete-lsc` a `src/lib/forms.ts`
- agregar dynamic import en `src/app/formularios/[slug]/page.tsx`

### Contrato del formulario

- `src/lib/validations/interpreteLsc.ts`
- defaults
- normalizacion
- helper de secciones
- helper de validacion por seccion

### Catalogos

- `src/app/api/interpretes/route.ts`
- `src/hooks/useInterpretesCatalog.ts`

### UI especifica

- `src/components/forms/InterpreteLscForm.tsx`
- seccion repetible de oferentes
- seccion especifica de interpretes con calculo de horas

### Finalizacion

- agregar slug a `src/lib/finalization/formSlugs.ts`
- agregar slug a `src/lib/finalization/prewarmConfig.ts`
- nueva definicion en `src/lib/finalization/prewarmRegistry.ts`
- builder `src/lib/finalization/interpreteLscPayload.ts`
- builder `src/lib/finalization/interpreteLscSheet.ts`
- route `src/app/api/formularios/interprete-lsc/route.ts`

### PDF

- export del spreadsheet a PDF
- upload a carpeta Drive de la empresa
- respuesta final con `sheetLink` y `pdfLink`
- no hace falta replicar la inyección de metadata RECA dentro del PDF si ODS ya consume `payload_normalized` desde `formatos_finalizados_il`

## Decision cerrada sobre ODS

Para `Interprete LSC`, ODS debe leer desde el registro final del formulario en web:

- fuente canónica: `formatos_finalizados_il.payload_normalized`
- no se requiere dependencia de metadata embebida dentro del PDF
- Legacy solo se usa como referencia para definir qué campos operativos debe llevar `payload_normalized.parsed_raw`

Eso deja fuera de alcance la paridad estricta con `inject_reca_metadata()` del repo Tkinter.

## Recomendacion de implementacion

1. Crear primero el contrato tipado:
   - schema
   - defaults
   - normalizadores de hora
   - tests
2. Construir despues el builder de Sheets:
   - mapping fijo
   - offsets
   - row insertions
   - tests
3. Montar encima el form largo reutilizando el runtime shared.
4. Registrar al final el slug en finalizacion + prewarm.

## Decision operativa que queda cerrada con este contraste

Para `Interprete LSC`, la migracion correcta no es una excepcion del sistema. Es un long form con finalizacion completa del runtime actual, con:

- empresa shared
- drafts shared
- locks shared
- drafts invisibles shared
- prewarm shared
- un adapter de Sheets propio
- un repetidor de interpretes propio
- payload normalizado/raw propio
- PDF

Ver tambien:

- `memory/interprete_lsc_legacy_inventory.md`

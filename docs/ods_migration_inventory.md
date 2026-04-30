# Inventario unificado — Migración ODS al módulo nuevo

> **Documento canónico** de discovery para la migración del legacy ODS al sidebar del nuevo proyecto.
> Reemplaza al inventario PO original (preservado en git history).
> Combina los hallazgos del PO y del Dev Junior, e incorpora las **7 decisiones cerradas** por el owner el 2026-04-29.
>
> **Insumo directo del plan de trabajo** (`docs/ods_migration_plan.md`, escrito por el Dev Junior).

- **Mantenedor:** Product Owner
- **Última actualización:** 2026-04-29
- **Repos legacy:** `C:\Users\aaron\Desktop\RECA_ODS`
- **Documentos predecesores (preservados):**
  - `docs/ods_migration_inventory_junior.md` — inventario detallado del Dev Junior
  - `docs/ods_inventory_comparison.md` — diff PO vs Junior

---

## 0. Resumen ejecutivo

El legacy `RECA_ODS` (Tkinter desktop) se migra al módulo **ODS** del sidebar del nuevo proyecto web. El alcance es **muy estrecho**: solo se traen 2 flujos del menú principal del legacy — *Crear nueva entrada* (wizard de 5 secciones all-visible) y *Importar acta* (pipeline de extracción con 4 niveles de fallback). Todo lo demás del legacy se descarta (sync Drive, dashboards, factura, automation, packaging, updater).

El módulo nuevo será usado por **2 usuarios** (`jancam` y `aaron_vercel`) con un único rol `ods_operador`, modelado como permiso en la tabla `profesional_roles` ya existente del proyecto.

Se aprovecha la migración para limpiar **3 deudas técnicas** del legacy:

1. Renombrar la columna `año_servicio` (con ñ literal y 6 alias de encoding) a `ano_servicio`.
2. Agregar `vigente_desde` / `vigente_hasta` a la tabla `tarifas` para versionado.
3. Modelar FK explícita `ods.formato_finalizado_id → formatos_finalizados_il.registro_id` (nullable).

El **motor de códigos** (`rules_engine.py`, ~660 líneas) se porta tal cual en el día 1 con su lógica intacta. La opción de externalizarlo a una tabla de decisión (`tarifas_reglas`) queda como mejora propuesta para una iteración posterior.

---

## 1. Alcance

### 1.1 En scope (lo que se trae)

| Pieza legacy | Archivos clave | Notas |
|---|---|---|
| **Wizard "Crear nueva entrada"** | `services/wizard_service.py`, `services/sections/seccion1..5.py`, `services/sections/resumen_final.py`, `services/sections/terminar.py` | 5 secciones, all-visible, resumen reactivo |
| **Importar acta (4 niveles)** | `services/excel_acta_import.py`, `services/acta_llm_extractor.py`, `services/acta_import_pipeline.py` | Pipeline con metadata `/RECA_Data` → ACTA ID → LLM → regex |
| **Motor de códigos** | `automation/rules_engine.py` | ~660 líneas; corazón del negocio |
| **Document classifier** | `automation/document_classifier.py` | Rule-based, ~170 líneas |
| **Process profiles para LLM** | `automation/process_profiles.py` + `process_profiles.json` | Define perfiles de extracción por `document_kind` |
| **`DecisionSuggestion`** | `automation/models.py` | Solo este dataclass del módulo `models` |
| **Cálculo financiero** | `domain/service_calculation.py` | Decimal + cuantización; trivial portar a TS con `decimal.js` |
| **Edge Function `extract_structured_acta_pdf`** | (vive en Supabase) | Ya existe; el módulo nuevo solo la invoca. **Ver §8: requiere descubrimiento ligero.** |
| **Sync a Google Sheets post-insert** | `google_drive_sync.py:sync_new_ods_record` | Mantener con feature flag `ODS_DRIVE_SYNC_ENABLED` (decisión §2.D1) |

### 1.2 Out of scope (lo que NO se trae)

#### Botones del menú principal del Tkinter (legacy `main_gui.py`)

| Botón | Razón |
|---|---|
| Reintentar sincronización Drive | Cola de retry de Sheets/Drive. Si el sync falla, se reintenta manualmente desde el legacy. |
| Actualizar Base de Datos – Gestión | Importación desde un Sheet maestro. Operación de mantenimiento. |
| Actualizar Supabase | Sync Sheet → BD. Operación de mantenimiento. |
| Actualizar Versión de la Aplicación | Auto-updater de Tkinter (`app/updater.py`). N/A para web. |
| Actas Terminadas (377) | Vista de revisión + toggle `revisado`. Se reemplazará por la vista de actas en el módulo Empresas (E5 del plan v2). |

#### Módulos de código

- `app/automation/gmail_inbox.py` — lectura de Gmail.
- `app/automation/orchestrator.py` — orquestación del pipeline de email.
- `app/automation/process_catalog.py` — catálogo de tipos.
- `app/automation/staging.py` — casos de prueba.
- `app/automation/processed_log.py` — dedup log.
- `app/factura_calc.py`, `app/factura_models.py` — cálculo IVA / factura.
- `app/google_drive_sync.py` (excepto `sync_new_ods_record`) — sync genérica.
- `app/google_sheets_client.py`, `app/google_sheet_supabase_sync.py` — sync bidireccional.
- `app/catalog_index.py` — cache local SQLite (innecesaria en web).
- `app/updater.py` — auto-updater.
- `main_gui.py`, `start_gui.py` — UI Tkinter (se reescribe en Next.js).
- `templates/*.xlsx` (10 archivos) — los templates se generan desde el módulo nuevo.
- Toolchain de packaging: `build.ps1`, `release.ps1`, `installer.iss`, `installer_config.iss`, `RECA_ODS.spec`.

#### Carpetas

- `AUTOMATIZACION/ods_export/` (15 archivos) — proyecciones financieras, dashboards, exports masivos.
- `AUTOMATIZACION/supabase/functions/extract-acta-ods/` — código de la Edge Function. **Solo se invoca**, no se migra el código.

---

## 2. Decisiones cerradas

Estas decisiones ya no se discuten. Si un dev quiere modificarlas, abre conversación con el PO antes.

### 2.D1 Sync a Google Sheets post-insert: **mantener con feature flag**

`terminar_servicio` seguirá llamando a `sync_new_ods_record` (que escribe en el Sheet operativo mensual `ODS_{MES}_{YYYY}`) **detrás de una env var** `ODS_DRIVE_SYNC_ENABLED`. Default: `true`. Cuando los reportes web cubran lo operativo, se apaga sin deploy.

**Implicación:** se porta el código de `sync_new_ods_record` y sus dependencias mínimas (cliente Google Drive con service account ya configurado en el proyecto).

### 2.D2 Renombrar `año_servicio` → `ano_servicio`: **sí**

Migración SQL al inicio de la épica:

```sql
ALTER TABLE ods RENAME COLUMN "año_servicio" TO ano_servicio;
```

**Coordinación con el legacy:** el legacy ya tiene los 6 alias de encoding en `terminar.py:_YEAR_FIELD_ALIASES`, así que sigue funcionando con cualquiera de los nombres. No hay que parchar el legacy.

**Módulo nuevo:** Zod schema usa `ano_servicio` (sin ñ) desde el día 1. Sin alias, sin tolerancia.

### 2.D3 Profundidad del regex parser: **portar completo + phase-out a 6 meses**

Se porta `excel_acta_import.py` íntegro como Nivel 4 (red de seguridad para PDFs/Excels antiguos sin metadata ni ACTA ID).

**Plan de phase-out** (no se ejecuta en esta migración, queda agendado):

1. Auditar después de 30 días de uso real: ¿qué % de importaciones cae a cada nivel?
2. Si Nivel 4 < 5%, planificar deprecación.
3. Asegurar que **todos** los PDFs nuevos del INCLUSION_LABORAL embeben `/RECA_Data` y `ACTA ID` (verificar con el lead dev del módulo Empresas).
4. En 6 meses, eliminar Nivel 4. Los PDFs viejos que no se puedan importar pasan al wizard manual.

### 2.D4 Usuarios del módulo: `jancam` y `aaron_vercel`

Los 2 usuarios del módulo ODS son los `usuario_login`:

- `jancam`
- `aaron_vercel`

**Tarea operativa al iniciar la épica:**

1. Verificar que ambos `usuario_login` existen en `profesionales`. Si no, crearlos (probablemente `aaron_vercel` ya existe; `jancam` por verificar).
2. Insertar fila en `profesional_roles` con role = `'ods_operador'` para cada uno (siguiendo el patrón de E0).

### 2.D5 Edge Function `extract_structured_acta_pdf`: **caja negra + descubrimiento ligero**

Hoy el owner no conoce qué hace exactamente la Edge Function. La función seguirá invocándose desde el módulo nuevo igual que hoy desde el legacy, **sin tocarla**.

**Pre-épica corta (no bloquea el plan principal):** el junior dedica 1–2 horas a leer el código de la Edge Function (en el repo de Supabase functions o donde resida), documenta:

- Qué inputs acepta y qué retorna.
- Qué modelo usa (sospecha: `gpt-5-mini` por OpenAI).
- Qué prompts/perfiles aplica (relación con `process_profiles.py`).
- Si hay mejoras evidentes (mejor schema, prompts más claros, costos optimizables, etc.).

El reporte va al final de este inventario unificado (sección §8) o como apéndice. Si surgen mejoras, **se anotan en §13 y se evalúan como sub-épica posterior**, no día 1.

### 2.D6 FK explícita `ods.formato_finalizado_id → formatos_finalizados_il.registro_id`: **sí, nullable**

```sql
ALTER TABLE ods
  ADD COLUMN formato_finalizado_id uuid
    REFERENCES formatos_finalizados_il(registro_id) ON DELETE SET NULL;

CREATE INDEX ods_formato_finalizado_id_idx ON ods (formato_finalizado_id);
```

**Comportamiento:**

- Cuando una ODS se crea desde "Importar acta" con ACTA ID resuelto, se popula la FK.
- Cuando se crea manualmente (sin acta), queda `NULL`.
- Da trazabilidad sin obligar.

**Backfill de datos legacy:** opcional; se puede correr un script post-migración que use `acta_ref` o el match por `(nit_empresa, fecha_servicio, codigo_servicio)` para popular la FK en filas existentes. **No bloquea el día 1.**

### 2.D7 Versionado de `tarifas`: **sí, agregar `vigente_desde` / `vigente_hasta`**

```sql
ALTER TABLE tarifas
  ADD COLUMN vigente_desde date NOT NULL DEFAULT current_date,
  ADD COLUMN vigente_hasta date;

CREATE INDEX tarifas_vigencia_idx ON tarifas (codigo_servicio, vigente_desde DESC);
```

**Comportamiento:**

- El motor de códigos selecciona la fila de `tarifas` cuyo `(vigente_desde <= fecha_servicio)` y `(vigente_hasta IS NULL OR vigente_hasta >= fecha_servicio)`.
- Si una tarifa cambia de precio: se cierra la fila anterior con `vigente_hasta = ayer` y se inserta una nueva con `vigente_desde = hoy`.
- El `valor_base` ya se snapshottea en la fila de `ods` al INSERT (no hay regresión).

**Backfill:** todas las filas existentes de `tarifas` quedan con `vigente_desde = '2025-12-19'` (su `created_at` actual) y `vigente_hasta = NULL`.

### 2.D8 Roles: **un solo rol `ods_operador` como permiso en `profesional_roles`**

Consistente con el patrón E0 del proyecto (`inclusion_empresas_admin`, `inclusion_empresas_profesional`). No se crea rol de auth separado.

RLS por tabla (resumen — detalle en §12):

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `ods` | `ods_operador` (todas) | `ods_operador` | nadie día 1 | nadie día 1 |
| `usuarios_reca` | authenticated | server-only | server-only | server-only |
| `profesionales` | authenticated | server-only | server-only | server-only |
| `interpretes` | authenticated | server-only | server-only | server-only |
| `tarifas` | authenticated | — | — | — |
| `empresas` | authenticated | — | — | — |

**Justificación de UPDATE/DELETE = nadie día 1:** las ODS son registros contables. Si hay error, se crea una nueva. La habilitación de UPDATE se evalúa en una iteración posterior si la operación lo pide.

### 2.D9 Wizard all-visible (no secuencial)

**Confirmado** por evidencia directa de `main_gui.py:3810-3831`: las 5 secciones + resumen están apiladas en un mismo contenedor `main_col` con `grid(row=1..6)`. No hay tabs ni pasos.

**Decisión:** el módulo nuevo replica el patrón all-visible. Sin wizard secuencial, sin tabs, sin ocultamiento condicional. El operador llena en cualquier orden y el resumen se actualiza reactivamente (debounce 300 ms).

---

## 3. Wizard "Crear nueva entrada"

### 3.1 Estructura general

- **Layout:** all-visible. 5 secciones apiladas verticalmente + tarjeta de resumen al final.
- **State management:** un store (Zustand u otro) con `secciones: { seccion1, seccion2, seccion3, seccion4, seccion5 }` + `usuarios_nuevos: []` (staging hasta el save final).
- **Validación:** Zod schema por sección + Zod schema final (`OdsPayload`). Validación inline en cada sección y consolidada al confirmar.
- **Resumen:** card siempre visible que muestra `fecha_servicio`, `nombre_profesional`, `nombre_empresa`, `codigo_servicio`, `valor_total`. Update con debounce 300 ms.
- **Botón de cierre:** "Confirmar y terminar" → diálogo de confirmación → POST a `/api/ods/terminar` con `{ ods, usuarios_nuevos }`.

### 3.2 Sección 1 — Información básica y profesional

| Campo | Tipo | Obligatorio | Fuente | Validación |
|---|---|---|---|---|
| `orden_clausulada` | enum `'si' \| 'no'` | sí | estático | normalizar a lowercase |
| `nombre_profesional` | string | sí | tabla `profesionales` o `interpretes` | match exacto contra catálogo o creación on-the-fly |

**Reglas:**

- Catálogo de profesionales: `SELECT id, nombre_profesional, programa_servicio FROM profesionales WHERE deleted_at IS NULL`.
- Catálogo de intérpretes: `SELECT id, nombre FROM interpretes WHERE deleted_at IS NULL`. **Tabla separada** (verificado en §11.1).
- Si el profesional seleccionado proviene de `interpretes` (es intérprete) → en Sección 3, el checkbox `servicio_interpretacion` se fuerza a `true` y se bloquea.
- "Agregar profesional/intérprete" → modal pequeño que pide nombre + programa. El programa se resuelve por substring del cargo:
  - `"inclus" + "labor"` en programa → tabla `profesionales` con `programa_servicio = 'Inclusion Laboral'`.
  - `"interp"` en programa → tabla `interpretes`.
- Endpoint: `POST /api/ods/profesionales` (server-side) recibe `{ nombre, programa }`, decide qué tabla, inserta, devuelve la fila.

### 3.3 Sección 2 — Información de la empresa

| Campo | Tipo | Obligatorio | Fuente | Validación |
|---|---|---|---|---|
| `nit_empresa` | string | sí | tabla `empresas` | debe existir en BD; lookup bidireccional |
| `nombre_empresa` | string (auto-fill) | — | lookup por NIT | solo lectura |
| `caja_compensacion` | string (auto-fill) | — | lookup por NIT | solo lectura |
| `asesor_empresa` | string (auto-fill) | — | lookup por NIT | solo lectura |
| `sede_empresa` | string (auto-fill) | — | lookup por NIT | solo lectura |

**Reglas:**

- Búsqueda **bidireccional**: typing en el NIT autocompleta el resto; typing en el nombre busca por nombre y resuelve el NIT.
- Si el typing no tiene match exacto → fuzzy con `difflib.SequenceMatcher` (ratio 0.8) o token overlap (0.6).
- Si la empresa no existe en BD → bloquear envío. **No se crean empresas desde el módulo ODS** (eso vive en Empresas).

### 3.4 Sección 3 — Información del servicio + cálculo

| Campo | Tipo | Obligatorio | Fuente | Validación |
|---|---|---|---|---|
| `fecha_servicio` | ISO date | sí | input día/mes/año | día 1-31, año 2025-2027, fecha válida |
| `codigo_servicio` | string | sí | tabla `tarifas` (vigente a `fecha_servicio`) | debe existir |
| `referencia_servicio` | string (auto-fill) | — | lookup por código | solo lectura |
| `descripcion_servicio` | string (auto-fill) | — | lookup por código | solo lectura |
| `modalidad_servicio` | enum `'Virtual' \| 'Bogotá' \| 'Fuera de Bogotá' \| 'Todas'` | — | lookup por código | normalizada |
| `valor_base` | decimal | — | lookup por código | solo lectura |
| `servicio_interpretacion` | bool | — | checkbox | forzado `true` si profesional es intérprete |
| `horas_interprete` | int | si interpretación | input | ≥ 0 |
| `minutos_interprete` | int | si interpretación | input | ≥ 0, < 60 |

**Cálculo financiero (en `service_calculation.py`):**

```
horas_decimales = horas + minutos / 60               (Decimal, ROUND_HALF_UP, 2 decimales)
valor_interprete = horas_decimales × valor_base
valor_total = valor_interprete  (si interpretación)
            = suma de modalidades (sino)
```

Asignación por modalidad:

- `Virtual` → `valor_virtual = valor_base`, otros = 0
- `Bogotá` → `valor_bogota = valor_base`, otros = 0
- `Fuera de Bogotá` → `valor_otro = valor_base`, otros = 0
- `Todas` → `todas_modalidades = valor_base`, otros = 0

Endpoint del cálculo: `POST /api/ods/calcular` que reproduce server-side la lógica para garantizar consistencia con la BD. El cliente puede previsualizar localmente con la misma lógica TS.

### 3.5 Sección 4 — Oferentes (multi-fila)

**Característica única:** filas ilimitadas, cada fila es una persona. Al confirmar, los valores se agregan con separador `;` y se cuentan en `total_personas`. Esos campos agregados son la **fuente de verdad para reportes** (cuántas personas contratadas, qué cédulas, etc.), por eso la **normalización consistente** es crítica.

| Campo | Tipo | Obligatorio | Fuente | Validación |
|---|---|---|---|---|
| `cedula_usuario` | string | sí por fila | tabla `usuarios_reca` | solo dígitos (regex `^[0-9]+$` ya enforced en BD) |
| `nombre_usuario` | string (auto-fill) | — | lookup por cédula | `.title()` (cada palabra capitalizada) |
| `discapacidad_usuario` | enum | sí | catálogo estático canónico | debe estar en la lista |
| `genero_usuario` | enum | sí | catálogo estático canónico | debe estar en la lista |
| `fecha_ingreso` | ISO date | no | input | YYYY-MM-DD |
| `tipo_contrato` | enum | no | catálogo estático canónico | debe estar en la lista |
| `cargo_servicio` | string | no | texto libre | opcional |

**Catálogos canónicos (extraídos del legacy `seccion4.py`, capitalización EXACTA):**

```
DISCAPACIDADES: ["Intelectual", "Múltiple", "Física", "Visual",
                 "Auditiva", "Psicosocial", "N/A"]

GENEROS: ["Hombre", "Mujer", "Otro"]

TIPOS_CONTRATO: ["Laboral", "Contrato Aprendiz Especial", "Orientación Laboral"]
```

**Reglas operativas (cada fila, antes de agregar):**

- Lookup por cédula → auto-fill nombre/discapacidad/género de la BD (sobrescribe cualquier valor del staging).
- "Crear Usuario" → entra al staging `usuarios_nuevos` (NO se persiste hasta el save final).
- Cédula normalizada a solo dígitos al crear (`replace(/\D/g, "")`).
- Nombre normalizado a `.title()` (cada palabra capitalizada).
- **Discapacidad / Género / Tipo contrato deben coincidir EXACTAMENTE con los strings canónicos** (no `MUJER`, no `mujer`, no `Femenino` — solo `Mujer`).
- Prevención de duplicados por cédula client-side (dos filas con la misma cédula → error con highlight `#FFF2CC`).
- Filas con error de validación se resaltan en `#FFF2CC` (amarillo claro, igual que legacy).

**Agregación al confirmar (algoritmo exacto, replicado del legacy `seccion4.py:108-179`):**

```
1. Iterar las filas de seccion4.rows.
2. Para cada fila, hacer .strip() en cada campo string.
3. Filtrar filas COMPLETAMENTE vacías
   (donde TODOS los 7 campos están vacíos después del strip).
4. Si después del filtro no quedan filas válidas:
   → todos los campos agregados van como null
   → total_personas = 0
5. Si hay N filas válidas:
   → nombre_usuario = nombres.join(";")     ej: "Juan Sebastián;María;Pedro"
   → cedula_usuario = cedulas.join(";")     ej: "1010068023;52123456;79876543"
   → discapacidad_usuario = ...join(";")    ej: "Física;Auditiva;N/A"
   → genero_usuario = generos.join(";")     ej: "Hombre;Mujer;Hombre"
   → fecha_ingreso = ...join(";")           ej: "2025-06-15;;2025-06-20"  (vacíos preservados)
   → tipo_contrato = ...join(";")           ej: "Laboral;;Laboral"
   → cargo_servicio = ...join(";")          ej: "Auxiliar;Operario;Mensajero"
   → total_personas = N    ← INTEGER
6. Esta agregación + counting se hace client-side, antes de POST a /api/ods/terminar.
   El payload que llega al server ya tiene los strings agregados y total_personas correcto.
```

**Mejora intencional vs legacy:** el legacy NO normalizaba los valores en `confirmar_seccion_4` (solo hacía `.strip()`). Eso produjo en producción un caos de variantes mezcladas en la columna `genero_usuario`: `MUJER;MUJER`, `HOMBRE;Mujer`, `Mujer;Hombre`, `MUJER;MUJER;MUJER`, todos almacenados como texto libre. El nuevo módulo debe **rechazar cualquier valor que no esté en los catálogos canónicos** (Zod enum strict en cliente y server) para que los reportes futuros puedan agregar sin perder filas por variantes de capitalización. Ver `docs/ods_legacy_diffs.md`.

### 3.6 Sección 5 — Observaciones

| Campo | Tipo | Obligatorio | Fuente |
|---|---|---|---|
| `observaciones` | text | no | textarea (3 filas) |
| `observacion_agencia` | text | no | textarea (3 filas) |
| `seguimiento_servicio` | text | no | textarea (3 filas) |

**Campos computados** (derivados de `fecha_servicio`):

- `mes_servicio` = `fecha_servicio.getMonth() + 1` (1–12)
- `ano_servicio` = `fecha_servicio.getFullYear()` (sin ñ — ver §2.D2)

### 3.7 Persistencia (`POST /api/ods/terminar`)

Server-side route que recibe `{ ods: OdsPayload, usuarios_nuevos: UsuarioNuevo[] }` y ejecuta:

1. **Validación Zod** de ambos.
2. **Verificación de rol:** `ods_operador` requerido (server-side, vía `requireRole`).
3. **Inserción atómica de usuarios + ODS** vía RPC de Supabase. **(Mejora 2.D respecto al legacy:** ver §13.E7 — el legacy lo hace en pasos separados no transaccionales.)
4. **Insert en `ods`** con todos los campos del payload + `formato_finalizado_id` si aplica + `user_id` del actor.
5. **Sync a Google Sheets** si `ODS_DRIVE_SYNC_ENABLED=true` (background, no bloquea la respuesta).
6. Devuelve `{ ods_id, sync_status, sync_error?, sync_target? }`.

**Schema validation:** se sustituye el `_apply_schema()` runtime fetch del legacy por **Zod schema explícito** + tests de drift en CI (ver §13.E4).

---

## 4. Importar acta — pipeline de 4 niveles

### 4.1 Nivel 1 — PDF metadata `/RECA_Data` (instantáneo)

PDFs generados por el módulo INCLUSION_LABORAL embeben `/RECA_Data` con el payload completo en JSON. Si está, se devuelve directamente.

**Implementación:** `pypdf` (Python) o `pdf-lib`/`pdf-parse` (Node) leen `metadata['/RECA_Data']`, parsean JSON, retornan.

### 4.2 Nivel 2 — ACTA ID lookup (rápido, determinístico)

El footer del PDF contiene `ACTA ID: ABC12XYZ` (8 caracteres alfanuméricos, regex `[A-Z0-9]{8}`).

**Camino:**

1. Extraer ACTA ID del texto del PDF.
2. Query: `SELECT * FROM formatos_finalizados_il WHERE acta_ref = '<id>'`.
3. Si la fila tiene `payload_normalized` (jsonb) válido → usar como fuente de verdad.
4. Si la fila existe pero `payload_normalized` falla validación → fallback a Nivel 4 con `path_formato`.
5. Si no se encuentra → Nivel 3.

**Mejora 2.D6 aprovechable:** una vez la FK `ods.formato_finalizado_id` exista, importar acta también puebla la FK al insertar la nueva ODS.

### 4.3 Nivel 3 — Extracción LLM (Edge Function)

Cuando no hay metadata ni ACTA ID:

1. Extraer texto del PDF con `pypdf` (server-side en Node: `pdf-parse`).
2. Clasificar documento con `document_classifier` → `document_kind`.
3. Construir texto curado filtrando por `keep_sections` del perfil del documento.
4. Construir instrucciones con `process_profiles` (campos prioritarios + reglas).
5. Invocar Edge Function de Supabase `extract_structured_acta_pdf` con:
   - JSON Schema (`_STRUCTURED_ACTA_SCHEMA`, ~25 campos)
   - Texto curado
   - PDF en base64 (si < 10 MB)
   - Modelo (default `gpt-5-mini`)
6. Recibir extracción, normalizar, aplicar post-procesamiento por perfil.
7. Guardar JSON crudo + normalizado en logs (auditoría).

**Estado en infra:** la Edge Function ya existe en Supabase. El módulo nuevo solo la invoca con `Authorization: Bearer <session.access_token>`. Ver §8.

### 4.4 Nivel 4 — Regex parser (red de seguridad)

`excel_acta_import.py` (~1400 líneas, ~700 efectivas para PDF). Maneja:

- PDFs antiguos sin metadata ni ACTA ID
- Excels (`.xlsx`, `.xlsm`)
- Google Sheets / Drive URLs (descarga + parser)

**Decisión 2.D3:** se porta completo en el día 1 + plan de phase-out a 6 meses. Audit del % que cae aquí después de 30 días.

**Detalles importantes que preserva:**

- Regex de oferentes con dedupe por cédula
- Cédulas + porcentaje pegados (`_split_joined_cedula_percentage`)
- Cédulas + teléfono pegados (`_split_joined_cedula_phone`)
- Nombre de empresa por dominio de email cuando el campo está vacío

### 4.5 Resolución contra catálogos (post-extracción)

Independiente del nivel, después de parsear:

| Entidad | Estrategia |
|---|---|
| **Empresa** | Match por NIT (estricto). Si solo nombre → fuzzy `SequenceMatcher` ≥ 0.8 ratio o ≥ 0.6 token overlap. **Bloquea import si no hay match.** |
| **Profesional** (no intérprete) | Fuzzy match contra `profesionales`. Threshold ≥ 0.55 (`exact=1.0`, `substring=0.97`, `token_subset=0.96/0.94`). |
| **Intérprete** | Fuzzy match contra `interpretes`. Threshold ≥ 0.85. Auto-create si `create_missing_interpreter=true`. |
| **Participantes** | Match por cédula contra `usuarios_reca`. Si existe → datos de BD sobrescriben los del acta. Si no existe → preparar como "crear" en `usuarios_nuevos`. |

### 4.6 UX nueva: pegar URL/ID directo (mejora §13.E6)

**Decisión:** se incluye en el día 1.

El modal "Importar acta" tiene 2 tabs:

- **Tab 1 (default): "Tengo el ID o URL del acta"** — input de texto que acepta `ABC12XYZ` o URL completa con el ID. Lookup directo en `formatos_finalizados_il` (~200 ms). Sin parser de PDF. Sin LLM.
- **Tab 2: "Subir archivo PDF/Excel"** — flujo con los 4 niveles de fallback.

### 4.7 Trazabilidad del origen (`import_resolution`)

Cada import incluye metadata:

```ts
{
  strategy: 'finalized_record' | 'parser',
  reason: 'acta_ref_lookup' | 'payload_normalized' | 'no_acta_ref'
        | 'acta_ref_lookup_failed' | 'acta_ref_invalid_payload'
        | 'acta_ref_not_found' | 'direct_parser',
  acta_ref: string  // '' si no hubo
}
```

**Strings user-facing** (preservar tal cual del legacy):

- `finalized_record` + `acta_ref_lookup` → "Info cargada usando ACTA ID `XXXXXXXX`. No fue necesario interpretar el archivo."
- `parser` + `no_acta_ref` → "No se encontró ACTA ID legible, se obtuvo interpretando el acta."
- `parser` + `acta_ref_not_found` → "Se encontró ACTA ID pero no existe registro finalizado asociado. Se obtuvo interpretando el acta."

### 4.8 Preview UI antes de aplicar

Diálogo que muestra:

- **Cards métricas:** Oferentes detectados | Usuarios existentes | Usuarios por crear
- **Bloque empresa:** detectada vs validada (NIT, nombre, sede, caja)
- **Bloque servicio:** fecha, modalidad, profesional detectado vs aplicado
- **Tabla participantes:** Nombre, cédula, discapacidad, acción (Crear/Existente)
- **Lista de warnings:** hasta 6 visibles
- **Botón "Aplicar al formulario"** → inyecta los valores en el state del wizard

### 4.9 Mapeo extracción → wizard (resumen)

| Resultado import | Campo wizard | Notas |
|---|---|---|
| `nit_empresa` | `seccion2.nit` + auto-fill empresa | Lookup directo |
| `nombre_empresa` | `seccion2.nombre` | Fallback si NIT no lo llenó |
| `fecha_servicio` | `seccion3.fecha` + `seccion5.mes/año` | Computados derivan |
| `professional_resolved` | `seccion1.profesional` | `ensure_profesional_option` antes de set |
| `codigo_servicio` | `seccion3.codigo` + auto-fill tarifa | Lookup tarifa vigente |
| `modalidad_servicio` | `seccion3.modalidad` | |
| `is_interpreter` | `seccion3.servicio_interpretacion` | Forzado |
| `interpreter_hours` | `seccion3.horas` + `seccion3.minutos` | Conversión decimal → h/m |
| `observaciones` | `seccion5.observaciones` | |
| `observacion_agencia` | `seccion5.observacion_agencia` | |
| `seguimiento_servicio` | `seccion5.seguimiento_servicio` | |
| `participants_prepared[]` | `seccion4` filas | Limpia filas, agrega una por participante |

---

## 5. Document classifier (`document_classifier.py`)

Rule-based: lista de tuplas `(tokens, DocumentClassification)`. Si filename o subject contiene cualquiera de los tokens, gana esa clasificación.

| `document_kind` | Tokens de match | Score | `is_ods_candidate` |
|---|---|---|---|
| `interpreter_service` | "interprete lsc", "interprete", "servicio interprete" | 0.95 | true |
| `attendance_support` | "control de asistencia" | 0.99 | **false** |
| `vacancy_review` | "levantamiento del perfil", "condiciones de la vacante", "revision de las condiciones" | 0.92 | true |
| `program_presentation` | "presentacion del programa" | 0.92 | true |
| `accessibility_assessment` | "evaluacion de accesibilidad" | 0.92 | true |
| `program_reactivation` | "reactivacion del programa" | 0.90 | true |
| `follow_up` | "seguimiento", "seguimientos" | 0.88 | true |
| `sensibilizacion` | "sensibilizacion" | 0.90 | true |
| `inclusive_selection` | "seleccion incluyente" | 0.90 | true |
| `inclusive_hiring` | "contratacion incluyente" | 0.90 | true |
| `operational_induction` | "induccion operativa" | 0.90 | true |
| `organizational_induction` | "induccion organizacional" | 0.90 | true |

**Fallbacks:**

1. `process_hint` con `process_score ≥ 0.5` → `document_kind = "process_match"`.
2. Sin match → `document_kind = "needs_review"`, score = 0.0, `is_ods_candidate = false`.

---

## 6. Motor de códigos (`rules_engine.py`) — anatomía completa

### 6.1 Función central

```python
suggest_service_from_analysis(*, analysis: dict, message: dict) -> DecisionSuggestion
```

**Inputs del `analysis`:** `nit_empresa`, `document_kind`, `modalidad_servicio`, `gestion_*`, `tamano_empresa_*`, `participantes`, `cantidad_empresas`, `nits_empresas`, `is_fallido`, `sumatoria_horas_interpretes`, `total_horas_interprete`, `cargo_objetivo`, `total_vacantes`, `numero_seguimiento`.

**Inputs del `message`:** `subject` (para inferir modalidad).

### 6.2 Funciones auxiliares de inferencia

| Función | Output | Notas |
|---|---|---|
| `_infer_modalidad()` | `(modalidad, reason)` | PDF → subject email → ciudad empresa → `""` |
| `_management_family()` | `(family, reason, is_default)` | "compensar" o "reca"; default RECA |
| `_company_size_bucket()` | `(bucket, reason, is_default)` | "hasta_50" o "desde_51"; default `hasta_50` |
| `_promotion_company_count()` | `(count, reason, is_default)` | count explícito → conteo de NITs → 1 |
| `_promotion_bucket_token()` | `(token, reason)` | `individual`, `2-3 empresas`, `4-5`, `6-10`, `11-15`, `mas de 15` |
| `_selection_size_bucket()` | `(bucket, reason)` | `individual`, `2-4`, `5-7`, `8+` |
| `_interpreter_tarifa_from_hours()` | `(row, reason)` | ≥1h→"hora", 0.75→"45", 0.5→"30", 0.25→"15" |
| `_interpreter_tarifa_from_text()` | `(row, reason)` | tokens: "visita fallida", "15/30/45 min", "1 hora" |
| `_select_tarifa(predicate)` | `dict \| None` | Itera `tarifas` y devuelve primera que matchee |

### 6.3 Los 11 `document_kind` — tabla compacta

(Detalle uno-por-uno preservado en `docs/ods_migration_inventory_junior.md` §C.3. Aquí la tabla resumen lista para traducir a TS.)

| `document_kind` | Buckets que evalúa | Predicado LIKE | Confidence | Rationale clave |
|---|---|---|---|---|
| `interpreter_service` | horas (4 buckets), `is_fallido` | `"interprete" + ("hora"\|"45"\|"30"\|"15") in descripcion` o `"visita fallida"` | siempre `medium` cuando matchea | "Se detectó documento de intérprete LSC." + razón específica |
| `vacancy_review` | solo modalidad | `"vacante" in descripcion AND modalidad ==` | `high` si Virtual, `medium` otra, `low` no match | "Se asignó familia de código de revisión de vacante." |
| `sensibilizacion` | solo modalidad | `"sensibilizacion" + modalidad ==` | igual | "Se asignó familia de código de sensibilización." |
| `organizational_induction` | solo modalidad | `"organizacional" + modalidad ==` | igual | "Se asignó familia de código de inducción organizacional." |
| `operational_induction` | solo modalidad | `"operativa" + modalidad ==` | igual | "Se asignó familia de código de inducción operativa." |
| `inclusive_selection` | modalidad + bucket de oferentes (4) | `"seleccion incluyente" + token + modalidad ==` | `medium` si hay oferentes, `low` si no | "Cantidad de oferentes detectada: X." + "Se asignó familia de código de selección incluyente." |
| `inclusive_hiring` | modalidad + bucket de oferentes | `"contratacion incluyente" + token + modalidad ==` | igual | "Cantidad de oferentes…" + "Se asignó familia de código de contratación incluyente." |
| `program_reactivation` | modalidad + family (Compensar/RECA) | `"reactivacion" + family + modalidad ==` | `low` si family default, `medium` si detectada | "Gestión detectada: COMPENSAR/RECA." + "Se asignó familia de código de mantenimiento/reactivación." |
| `program_presentation` | modalidad + family + bucket de empresas (6) | `"promocion" + bucket_token + family + modalidad ==` | `low` si family o count default, `medium` si ambos detectados | 4 strings: gestión + count + bucket + "Se asignó familia de código de promoción del programa." |
| `follow_up` | modalidad + (visita adicional vs normal) | `description_token + modalidad ==` | siempre `medium` cuando matchea | "Se asignó familia de código de seguimiento." (o "visita adicional…") |
| `accessibility_assessment` | modalidad + tamaño empresa (2 buckets) | `"accesibilidad" + ("hasta 50"\|"desde 51") + modalidad ==` | `low` si size default, `medium` si detectado | "Tamaño de empresa detectado…" + "Se asignó familia de código de evaluación de accesibilidad." |

**Caso especial `attendance_support`:** retorna `confidence="low"` sin código. Rationale: "El documento fue clasificado como control de asistencia."

**Fallback final:** si ningún `document_kind` matchea → retorna `DecisionSuggestion(modalidad_servicio=modalidad, confidence="low", rationale=rationale)`.

### 6.4 Estructura `DecisionSuggestion`

```ts
type DecisionSuggestion = {
  codigo_servicio: string
  referencia_servicio: string
  descripcion_servicio: string
  modalidad_servicio: string
  valor_base: number
  observaciones: string
  observacion_agencia: string
  seguimiento_servicio: string
  confidence: 'low' | 'medium' | 'high'
  rationale: string[]   // explicación legible para el operador
}
```

### 6.5 Auto-generación de campos

- `_build_document_observaciones()` (para `vacancy_review`, `inclusive_selection`, `inclusive_hiring`):
  `"cargo_objetivo (total_vacantes)"` o solo `cargo_objetivo`.
- `_build_document_seguimiento()` (para `follow_up`):
  `_extract_follow_up_number(analysis)` (extrae el número del seguimiento).

---

## 7. Process profiles para LLM (`process_profiles.py`)

Define perfiles de extracción por `document_kind`. Cada perfil:

- `keep_sections`: secciones a extraer
- `ignore_sections`: secciones a ignorar
- `section_aliases`: nombre canónico → nombre real
- `required_fields`: campos con `label, seccion, row, col, type`
- `field_priority`: orden de preferencia de labels
- `forbid_fields`: campos que deben quedar vacíos
- `line_mode`: e.g., `"labeled_only"`

**Overrides hardcodeados** (`_DETAILED_INSTRUCTION_OVERRIDES`) para 5 tipos: `vacancy_review`, `inclusive_selection`, `inclusive_hiring`, `follow_up`, `interpreter_service`. Cada uno con `description`, `extract_sections`, `ignore_sections`, `field_rules`, `hard_rules`.

**Reglas globales** (aplican a todos los perfiles):

1. `modalidad_servicio` siempre sale de DATOS GENERALES o DATOS DE LA EMPRESA.
2. `cargo_objetivo` nunca sale de asistentes.
3. `cargo_objetivo` solo válido si viene junto a etiqueta explícita (Cargo, Nombre de la vacante, Cargo que ocupa).
4. `nombre_profesional` siempre sale de ASISTENTES (excepto `interpreter_service`).
5. PDF como fuente primaria; ignora OCR local faltante.

**Migración:** se porta el JSON completo y se invoca server-side antes de enviar a la Edge Function.

---

## 8. Edge Function `extract_structured_acta_pdf` (caja negra + descubrimiento)

**Estado actual:** vive en Supabase (en `AUTOMATIZACION/supabase/functions/extract-acta-ods/`). Owner declaró desconocer su comportamiento exacto.

**Decisión 2.D5:** caja negra. Se invoca igual que en el legacy. Pre-épica corta de 1–2 horas para descubrimiento ligero del Dev Junior — output va al final de este inventario o al plan de trabajo.

**Lo que se sabe sin abrirla:**

- Acepta `{ schema_name, schema, source_label, filename, subject, text, pdf_base64?, model_override?, provider_override? }`.
- Header: `Authorization: Bearer <SUPABASE_ANON_KEY>` + `apikey` + opcionalmente `x-acta-extraction-secret`.
- Default provider: OpenAI. Default model: `gpt-5-mini`.
- Timeout: 240 s.
- Devuelve JSON con la extracción según el schema enviado.
- Output esperado: campos del `_STRUCTURED_ACTA_SCHEMA` (~25 campos).

**Tarea de descubrimiento (junior):**

1. Localizar el código de la Edge Function.
2. Documentar: prompts usados, manejo de errores, costos por invocación, modelos disponibles.
3. Identificar mejoras evidentes (mejor schema, prompts más claros, costos optimizables).
4. Reportar al PO. Si hay mejoras, se anotan en §13 (oportunidades) y se evalúan como sub-épica posterior.

---

## 9. Servicios externos y arquitectura del módulo nuevo

| Servicio | Uso | Implementación en web |
|---|---|---|
| Supabase tabla `ods` | Persistencia | API route server-side con service role + RPC para atomicidad (§13.E7) |
| Supabase tablas catálogo | Lectura | API routes con `revalidate` Next.js (~60 s) |
| Supabase Edge Function `extract_structured_acta_pdf` | LLM extraction | Invocación server-side desde API route con `Bearer <session.access_token>` |
| Google Drive API | Descargar acta desde URL Drive | Server-side con `GOOGLE_SERVICE_ACCOUNT_JSON` ya configurado |
| Google Sheets API | Sync post-insert | Server-side con feature flag `ODS_DRIVE_SYNC_ENABLED` |
| OpenAI API | Backend de la Edge Function | No expuesto al cliente |

**Decisión arquitectónica:** parsing PDF/Excel y todas las llamadas externas son **server-side** en API routes de Next.js. Razones:

- Librerías pesadas (`pdf-parse`, `xlsx`) fuera del bundle del cliente.
- Acceso a `formatos_finalizados_il` requiere service role.
- Edge Function recibe el PDF directamente desde server, sin pasar por el cliente.
- El cliente solo sube el archivo → recibe el preview parseado.

---

## 10. Modelo de datos (`OdsPayload`)

Pydantic en legacy → Zod en TS. Mapping uno-a-uno.

```ts
const OdsPayload = z.object({
  orden_clausulada: z.enum(['si', 'no']),
  nombre_profesional: z.string(),
  nit_empresa: z.string(),
  nombre_empresa: z.string(),
  caja_compensacion: z.string().optional(),
  asesor_empresa: z.string().optional(),
  sede_empresa: z.string().optional(),
  fecha_servicio: z.string().date(),  // YYYY-MM-DD
  codigo_servicio: z.string(),
  referencia_servicio: z.string(),
  descripcion_servicio: z.string(),
  modalidad_servicio: z.enum(['Virtual', 'Bogotá', 'Fuera de Bogotá', 'Todas']),
  valor_virtual: z.number(),
  valor_bogota: z.number(),
  valor_otro: z.number(),
  todas_modalidades: z.number(),
  horas_interprete: z.number().optional(),
  valor_interprete: z.number(),
  valor_total: z.number(),
  nombre_usuario: z.string().optional(),     // agregado con ; si multi-fila
  cedula_usuario: z.string().optional(),     // idem
  discapacidad_usuario: z.string().optional(),
  genero_usuario: z.string().optional(),
  fecha_ingreso: z.string().optional(),
  tipo_contrato: z.string().optional(),
  cargo_servicio: z.string().optional(),
  total_personas: z.number().int().default(0),
  observaciones: z.string().optional(),
  observacion_agencia: z.string().optional(),
  seguimiento_servicio: z.string().optional(),
  mes_servicio: z.number().int().min(1).max(12),
  ano_servicio: z.number().int(),  // SIN ñ — ver §2.D2
  formato_finalizado_id: z.string().uuid().optional(),  // FK — §2.D6
  session_id: z.string().uuid().optional(),
  started_at: z.string().datetime().optional(),
  submitted_at: z.string().datetime().optional(),
}).refine(/* valor_total ≈ suma o valor_interprete */, /* msg */)
  .refine(/* submitted_at >= started_at */, /* msg */);
```

---

## 11. Schema Supabase verificado y cambios planeados

### 11.1 Estado actual (verificado por el junior)

| Tabla | Hallazgo | Evidencia |
|---|---|---|
| `interpretes` | **Tabla separada** de `profesionales`. Columnas: `id, nombre, created_at, nombre_key, deleted_at`. | Query a `information_schema.columns` |
| `profesionales` | NO tiene columna `es_interprete`. | Query a `information_schema.columns` |
| `ods.año_servicio` | Tiene ñ literal. | Evidencia de código (`terminar.py:19`) + 6 alias de encoding en `_YEAR_FIELD_ALIASES` |
| `tarifas` | Sin versionado. Columnas: `id, codigo_servicio, referencia_servicio, programa_servicio, descripcion_servicio, modalidad_servicio, valor_base, iva, total, created_at, updated_at`. | Query directa a `tarifas` |

### 11.2 Cambios planeados (decididos)

| Cambio | Razón | Decisión |
|---|---|---|
| `ALTER TABLE ods RENAME COLUMN "año_servicio" TO ano_servicio` | Eliminar bug-trap de encoding | 2.D2 |
| `ALTER TABLE ods ADD COLUMN formato_finalizado_id uuid REFERENCES formatos_finalizados_il(registro_id) ON DELETE SET NULL` | Trazabilidad acta → ODS | 2.D6 |
| `CREATE INDEX ods_formato_finalizado_id_idx ON ods (formato_finalizado_id)` | Performance | 2.D6 |
| `ALTER TABLE tarifas ADD COLUMN vigente_desde date NOT NULL DEFAULT current_date` | Versionado | 2.D7 |
| `ALTER TABLE tarifas ADD COLUMN vigente_hasta date` | Versionado | 2.D7 |
| `CREATE INDEX tarifas_vigencia_idx ON tarifas (codigo_servicio, vigente_desde DESC)` | Performance | 2.D7 |
| Backfill `tarifas`: `vigente_desde = created_at::date`, `vigente_hasta = NULL` para todas | Compatibilidad con datos existentes | 2.D7 |
| Insertar `ods_operador` en `profesional_roles` para `jancam` y `aaron_vercel` | Habilitar acceso al módulo | 2.D4 + 2.D8 |

### 11.3 Decisión abierta sobre `interpretes`

El junior detectó que `interpretes` es tabla separada de `profesionales`. Esto introduce una **decisión opcional**: ¿consolidar a una sola tabla con flag `es_interprete` para simplificar?

**Recomendación PO:** **NO consolidar día 1.** Mantener `interpretes` como tabla separada para no tocar el legacy ni el módulo Empresas (que ya consume ambas tablas). Si en una iteración futura se evalúa la consolidación, será una mini-épica de refactor de catálogos de profesionales/intérpretes que afecta múltiples módulos. **Anotada como deuda menor, no acción inmediata.**

---

## 12. Roles y RLS

### 12.1 Rol único: `ods_operador`

Modelo: permiso en la tabla `profesional_roles` (consistente con el patrón E0 vigente). No se crea rol de auth Supabase separado.

Asignación día 1: 2 filas en `profesional_roles`, una por usuario:

```sql
INSERT INTO profesional_roles (profesional_id, role)
VALUES
  ((SELECT id FROM profesionales WHERE usuario_login = 'jancam'), 'ods_operador'),
  ((SELECT id FROM profesionales WHERE usuario_login = 'aaron_vercel'), 'ods_operador');
```

### 12.2 RLS por tabla

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `ods` | **diferido a E5** — el legacy sigue activo | **diferido a E5** — el legacy sigue activo | nadie día 1 | nadie día 1 |
| `usuarios_reca` | authenticated | server-only (API route con service role) | server-only | server-only |
| `profesionales` | authenticated | server-only | server-only | server-only |
| `interpretes` | authenticated | server-only | server-only | server-only |
| `tarifas` | authenticated | — | — | — |
| `empresas` | authenticated | — | — | — |

**Nota RLS ods:** Las RLS estrictas de E0 fueron revertidas por el hotfix `20260429213000_e0_hotfix_legacy_access.sql` (2026-04-29). El módulo nuevo usa `service_role` via RPC `ods_insert_atomic`, que ignora RLS. Se reaplicarán en E5 (cutover).

**Justificación UPDATE/DELETE = nadie día 1:** las ODS son registros contables. Errores se corrigen creando una nueva ODS. Habilitación de UPDATE se evalúa en una iteración posterior si la operación lo pide.

### 12.3 Helper de gating en server

Reusar el patrón existente del proyecto:

```ts
import { requireRole } from '@/lib/auth/role'

export async function POST(request: Request) {
  await requireRole(request, ['ods_operador'])
  // ...
}
```

---

## 13. Oportunidades de mejora consolidadas

Clasificadas por mandatoriedad para el día 1.

### Mandatorio día 1 (entran al plan)

- **§2.D2** Renombrar `año_servicio` → `ano_servicio`.
- **§2.D6** FK explícita `ods.formato_finalizado_id`.
- **§2.D7** Versionado de `tarifas` con `vigente_desde` / `vigente_hasta`.
- **§2.D8 / §12** Rol único `ods_operador` en `profesional_roles`.
- **§13.E4** Reemplazar el schema fetching runtime de `terminar.py` por **Zod schema explícito + tests de drift en CI**. Beneficio: elimina round-trip innecesario, fail-fast en build.
- **§13.E7** Inserción atómica de `usuarios_nuevos` + `ods` vía RPC de Supabase (Postgres function). Sustituye los 2 INSERT separados del legacy.
- **§13.E6** UX: tab "Tengo el ID o URL del acta" en el modal de Importar acta.

### Recomendado (entran si caben en la épica, sino quedan agendados)

- **§13.E1** Externalizar la matriz de tarifas a tabla `tarifas_reglas` con evaluador genérico. Reduce ~660 líneas de if/elif a ~200 + filas en BD editables. **No bloquea día 1**, el motor sigue funcional, pero abre la puerta a que admins ajusten reglas sin redeploy.
- **§13.E2** Fusión del classifier por reglas + clasificación implícita del LLM: pedirle al LLM que devuelva `document_kind` explícito. Si coincide con reglas → confidence `high`. Si difiere → marcar para revisión.

### Diferido (no en esta épica)

- **§13.E5** Phase-out del regex parser (Nivel 4). Plan está aprobado (auditoría a 30 días, deprecación a 6 meses). No es trabajo del día 1.
- **§11.3** Consolidación `profesionales` + `interpretes` en una sola tabla con flag. Refactor cross-módulo. Deuda menor, sin urgencia.
- Mejoras a la Edge Function `extract_structured_acta_pdf` — pendientes del descubrimiento del junior (§8).

---

## 14. Próximo paso

1. **Dev Junior:**
   - Ejecuta el descubrimiento ligero de la Edge Function (§8). Reporta al PO.
   - Escribe el plan de trabajo en `docs/ods_migration_plan.md`, formato igual al `expansion_v2_plan.md`. Estructura sugerida:
     - Resumen ejecutivo
     - Decisiones cerradas (referenciar este inventario §2)
     - Épicas con scope, datos, permisos, UX, criterios de aceptación, dependencias
     - Modelo de datos consolidado
     - Plan de testing
     - Migration scripts (SQL)
2. **Product Owner:** revisa el plan, propone ajustes o aprueba.
3. **Dev Junior:** implementa según el plan aprobado.

**Tiempo objetivo hasta plan aprobado:** 1 ciclo de revisión (este inventario ya cierra los gaps).

---

### 8.1 Reporte de descubrimiento - 2026-04-29

**Archivo auditado:** `AUTOMATIZACION/supabase/functions/extract-acta-ods/index.ts` (363 lineas, Deno/TypeScript)

#### Inputs aceptados (`ExtractRequest`)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `schema_name` | string | no | Default `"acta_ods_extraction"` |
| `schema` | object | **si** | JSON Schema estructurado |
| `source_label` | string | no | Label de la fuente |
| `filename` | string | no | Nombre del archivo |
| `subject` | string | no | Asunto del email |
| `text` | string | no | Texto extraido del PDF (curado por process_profiles) |
| `pdf_base64` | string | no | PDF completo en base64 |
| `provider_override` | string | no | `"openai"` o `"anthropic"` |
| `model_override` | string | no | Modelo especifico |

#### Modelos y providers

| Provider | Modelo default | Env var | Endpoint |
|---|---|---|---|
| OpenAI | `gpt-5-mini` | `OPENAI_ACTA_EXTRACTION_MODEL` | `https://api.openai.com/v1/responses` |
| Anthropic | `claude-sonnet-4-6` | `CLAUDE_ACTA_EXTRACTION_MODEL` | `https://api.anthropic.com/v1/messages` |

Inferencia automatica: si `model_override` empieza con `"claude-"` -> Anthropic; si no -> OpenAI.

#### Prompt

System prompt hardcoded en `buildInstructions()` (~20 lineas): extractor estructurado de actas ODS, PDF como fuente primaria, solo JSON valido, cadenas cortas, no inventar, seguir perfil_documento, cargo_objetivo solo de etiqueta explicita, extraction_status = needs_review si ambiguo, is_fallido si aparece "fallido". El schema JSON se envia por separado como `json_schema` (OpenAI) o texto inline (Anthropic).

#### Formato OpenAI

Endpoint `/v1/responses` (nuevo). User message puede incluir `input_file` (PDF base64) + `input_text`. `text.format`: `{ type: "json_schema", strict: true, schema }`. `max_output_tokens: 2200`.

#### Formato Anthropic

No usa JSON Schema nativo - envia schema como texto en system prompt. `max_tokens: 2200`. Parsing manual de la respuesta (busca JSON en content[].text).

#### Respuesta

```json
{ "data": { /* extraccion */ }, "model": "gpt-5-mini", "usage": { ... }, "provider": "openai", "raw": { ... } }
```

#### Autenticacion

- Shared secret: header `x-acta-extraction-secret` vs env `ACTA_EXTRACTION_SHARED_SECRET`.
- `verify_jwt = false` - funcion publica.
- API keys como secrets: `OPENAI_API_KEY`, `CLAUDE_API_KEY`.

#### Manejo de errores

| Escenario | HTTP |
|---|---|
| Secret incorrecto | 401 |
| Schema faltante | 400 |
| Sin text ni pdf_base64 | 400 |
| Missing API key | 500 |
| Provider request falla | 500 |
| Response sin JSON parseable | 500 |
| Error no manejado | 500 |

#### Costos estimados por invocacion

| Provider | Modelo | Solo texto | Con PDF |
|---|---|---|---|
| OpenAI | gpt-5-mini | ~$0.005-0.01 | ~$0.02-0.05 |
| Anthropic | claude-sonnet-4-6 | ~$0.02-0.04 | ~$0.05-0.10 |

#### Mejoras evidentes

1. **Anthropic sin JSON Schema nativo** - menos robusto que OpenAI. Mejora: usar `tools` de Anthropic.
2. **Sin timeout en fetch** - si el provider tarda >240s, Edge Function se cancela sin error claro. Agregar AbortController con 230s.
3. **`verify_jwt = false`** - funcion publica, depende solo del shared secret. Si no esta configurado, cualquiera puede invocar y gastar tokens.
4. **Prompt hardcoded** - reglas de extraccion requieren redeploy para cambiar. Mover a config o tabla.
5. **Sin logging de auditoria** - no guarda logs de invocacion en BD.
6. **Costo optimizable** - Niveles 1 y 2 evitan LLM; la mejora 2.D6 (pegar ID directo) reduce invocaciones innecesarias.

#### Veredicto

La Edge Function es **estable y funcional**. No requiere cambios para el dia 1. Se invoca igual que en el legacy. Las mejoras se anotan como oportunidades para iteracion posterior.

---

## 15. Histórico de revisiones

### 2026-04-29 — Inventario unificado + descubrimiento Edge Function

- Reemplaza al inventario PO original (preservado en git).
- Combina hallazgos PO + junior.
- Cierra las 7 decisiones del owner: sync Sheets (mantener con flag), renombrar `año_servicio` (sí), regex parser (portar + phase-out 6 meses), usuarios (`jancam` + `aaron_vercel`), Edge Function (caja negra + descubrimiento ligero), FK ods → formatos_finalizados_il (sí, nullable), versionado tarifas (sí).
- Confirma wizard all-visible (corrige asunción del PO original §9.10).
- Confirma `interpretes` como tabla separada (no flag).
- Locks rol `ods_operador` como permiso en `profesional_roles`.
- **Descubrimiento Edge Function completado** (§8.1): funcion estable, 363 lineas Deno/TS, soporta OpenAI + Anthropic, endpoint /v1/responses con JSON Schema estricto, Anthropic sin schema nativo, costos ~0.005-0.10 USD/invocacion, 6 mejoras identificadas (ninguna bloquea dia 1).

### 2026-04-29 — Corrección de typo en `usuario_login`

- Owner corrigió: el segundo usuario es `jancam` (no `jancar`). PO re-query a Supabase confirmó que `jancam` existe en `profesionales` (id=10, Janeth Carolina Camargo Escarraga).
- Reemplazos masivos `jancar` → `jancam` en este inventario.
- §2.D4 actualizado.

### 2026-04-29 — Corrección PK de `formatos_finalizados_il`

- Dev Junior detectó al implementar E1-M2 que la tabla `formatos_finalizados_il` usa `registro_id` (uuid) como PK, no `id`.
- PO re-query a `pg_index` confirmó: PK = `registro_id`. La tabla tampoco tiene columna `id`.
- §2.D6 y §11.2 actualizados: la FK ahora apunta a `formatos_finalizados_il(registro_id)`.
- La migración remota aplicada (`20260429210001_e1_m2_fk_formato_finalizado.sql`) ya usa `registro_id`. El error original estaba en la propuesta del PO, no en la implementación.

### 2026-04-29 — Incidente de producción: hotfix de acceso legacy

- Las RLS estrictas + REVOKE de E0 bloquearon al legacy ODS para todos los usuarios excepto `jancam` y `aaron_vercel`.
- Hotfix `20260429213000_e0_hotfix_legacy_access.sql` aplicado: desactiva RLS en `ods`, elimina policies de E0, restaura grants directos a `authenticated`.
- El rol `ods_operador` y el CHECK constraint de `profesional_roles` quedan intactos.
- El módulo nuevo no se ve afectado porque usa `service_role` via RPC `ods_insert_atomic`, que ignora RLS.
- §12.2 actualizado: fila de `ods` marcada como "diferido a E5".
- Nueva épica E5 — Cutover creada en el plan de trabajo para re-aplicar RLS cuando el módulo nuevo reemplace al legacy.

### 2026-04-29 — Segundo hotfix: shadow column `año_servicio`

- El rename de E1-M1 (`año_servicio` → `ano_servicio`) rompió el legacy desktop por cache LRU stale del schema OpenAPI (TTL 180s).
- Hotfix `20260429220000_e1_hotfix_ano_servicio_shadow.sql` aplicado: restaura `año_servicio` como columna shadow nullable + trigger `ods_sync_ano_servicio_trigger` que sincroniza bidireccionalmente con `ano_servicio` (canónica).
- La columna canónica sigue siendo `ano_servicio`. El shadow + trigger se eliminan en E5 (Cutover).
- §2.D2 y §11.2 actualizados con nota sobre el shadow column.

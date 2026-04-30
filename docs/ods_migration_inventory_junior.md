# Inventario ampliado ODS — Dev Junior

> **Tipo de documento:** discovery, inventario extendido con analisis estrategico.
> Extiende el inventario original entregado por chat el 2026-04-29.
> Este documento es insumo para el plan de trabajo (`docs/ods_migration_plan.md`).

- **Autor:** Dev Junior
- **Fecha:** 2026-04-29
- **Repo legacy auditado:** `C:\Users\aaron\Desktop\RECA_ODS`
- **Alcance:** Wizard "Crear nueva entrada" + "Importar acta" + motor de codigos + document classifier

---

## A. Inventario original (resumen)

Las secciones A.1 a A.12 son el inventario original entregado por chat. Se mantienen intactas como referencia rapida. Para el detalle completo (campo-por-campo, validaciones, mapeo import→wizard, etc.), remitirse al inventario original.

### A.1 WizardState
```
secciones: dict         # {"seccion1": {...}, ..., "seccion5": {...}}
usuarios_nuevos: list   # Persistidos al final en usuarios_reca
```

### A.2 Seccion 1 — Info Basica y Profesional
- `orden_clausulada` (si/no), `nombre_profesional` (de `profesionales`)
- Si `es_interprete=true` → Seccion 3 interpretacion forzada ON

### A.3 Seccion 2 — Info Empresa
- `nit_empresa` (lookup bidireccional NIT↔nombre), `nombre_empresa`, `caja_compensacion`, `asesor_empresa`, `sede_empresa`

### A.4 Seccion 3 — Info Servicio
- `fecha_servicio`, `codigo_servicio` (de `tarifas`), referencia/descripcion/modalidad/valor_base auto-fill
- `servicio_interpretacion`, `horas_interprete`, `minutos_interprete`
- Calculo: `horas_decimales = horas + minutos/60`, `valor_interprete = horas_decimales × valor_base`

### A.5 Seccion 4 — Oferentes (multi-fila)
- Filas ilimitadas: `cedula_usuario`, `nombre_usuario`, `discapacidad_usuario`, `genero_usuario`, `fecha_ingreso`, `tipo_contrato`, `cargo_servicio`
- Agregacion con separador `;` al confirmar

### A.6 Seccion 5 — Observaciones
- `observaciones`, `observacion_agencia`, `seguimiento_servicio`
- Campos computados: `mes_servicio`, `ano_servicio`

### A.7 Payload final (`OdsPayload`)
- ~30 campos con validaciones: `valor_total ≈ suma`, `mes 1-12`, `orden_clausulada ∈ {si,no}`, etc.

### A.8 Tablas Supabase escritas
- `ods` (INSERT), `usuarios_reca` (INSERT nuevos), `profesionales` (INSERT on-demand), `interpretes` (INSERT on-demand)

### A.9 Escaner de Actas — 4 niveles de fallback
1. `/RECA_Data` metadata (instantaneo)
2. ACTA ID `[A-Z0-9]{8}` → lookup en `formatos_finalizados_il`
3. LLM via Edge Function (`extract-acta-ods`)
4. Regex parser (~700 lineas)

### A.10 Campos extraidos de actas
- PDF: regex patterns para NIT, nombre, fecha, modalidad, profesional, participantes
- Excel: labeled-value extraction, participant tables
- Interprete PDF: `interpretes[]`, `sumatoria_horas_interpretes`, `total_horas_interprete`, `is_fallido`

### A.11 Validaciones contra DB
- Empresa: NIT estricto, fuzzy nombre (threshold 0.8 ratio / 0.6 token overlap)
- Profesional: fuzzy match threshold ≥0.55 (no-interprete), ≥0.85 (interprete)
- Participantes: lookup por cedula en `usuarios_reca`

### A.12 Mapeo import→wizard
- Cada campo del import result se mapea a un campo especifico del wizard (tabla completa en inventario original)

---

## B. Out of scope explicito

Lo que **NO** se trae al modulo ODS nuevo. Todo lo que no esta en esta lista ni en el scope principal (wizard + importar acta + motor de codigos + document classifier) se considera fuera de scope.

### B.1 Botones del menu principal (Tkinter)

| Boton legacy | Estado | Razon |
|---|---|---|
| **Crear nueva entrada** | **EN SCOPE** | Flujo principal del wizard |
| **Importar acta** | **EN SCOPE** | Pipeline de importacion |
| Reintentar sincronizacion Drive | FUERA | Cola de retry de Google Sheets/Drive |
| Actualizar Base de Datos – Gestion | FUERA | Importacion desde Sheet maestro |
| Actualizar Supabase | FUERA | Sync Sheet → BD |
| Actualizar Version de la Aplicacion | FUERA | Auto-updater de Tkinter (`app/updater.py`) |
| Actas Terminadas (377) | FUERA | Vista de revision + toggle `revisado` |

### B.2 Modulo `app/automation/`

| Archivo | Estado | Razon |
|---|---|---|
| `rules_engine.py` | **EN SCOPE** | Motor de codigos — corazon del negocio |
| `document_classifier.py` | **EN SCOPE** | Clasificacion por reglas |
| `process_profiles.py` + `process_profiles.json` | **EN SCOPE** | Perfiles de extraccion para LLM |
| `models.py` | **EN SCOPE** (parcial) | `DecisionSuggestion` se reusa |
| `gmail_inbox.py` | FUERA | Lectura de Gmail — no se migra |
| `orchestrator.py` | FUERA | Orquestacion de automatizacion email |
| `process_catalog.py` | FUERA | Catalogo de tipos de proceso |
| `staging.py` | FUERA | Casos de prueba de automatizacion |
| `processed_log.py` | FUERA | Log de procesamiento para deduplicacion |

### B.3 Carpeta `AUTOMATIZACION/`

| Subcarpeta/Archivo | Estado | Razon |
|---|---|---|
| `AUTOMATIZACION/ods_export/*` (15 archivos) | FUERA | Proyecciones financieras, dashboards, exports masivos |
| `AUTOMATIZACION/supabase/functions/extract-acta-ods/` | **EN SCOPE** (solo invocacion) | Edge Function ya existe en Supabase; solo se invoca |

### B.4 Otros modulos fuera de scope

| Modulo | Archivos | Razon |
|---|---|---|
| Facturacion | `factura_calc.py`, `factura_models.py` | Calculos de IVA/factura no entran |
| Google Drive sync | `google_drive_sync.py`, `google_sheets_client.py`, `google_sheet_supabase_sync.py` | Sync post-insert — decision pendiente (ver §E) |
| Cache local SQLite | `catalog_index.py` | Innecesario en web; se reemplaza por revalidate de Next.js |
| GUI Tkinter | `main_gui.py`, `start_gui.py` | UI legacy — se reescribe en Next.js |
| Packaging | `build.ps1`, `release.ps1`, `RECA_ODS.spec`, `installer.iss`, `installer_config.iss` | App desktop — no aplica a web |
| Updater | `app/updater.py` | Auto-update de desktop |
| Templates Excel | `templates/*.xlsx` (10 archivos) | Los templates se generan desde el nuevo modulo, no se portan |

---

## C. Motor de codigos — `rules_engine.py` (analisis profundo)

**Archivo:** `C:\Users\aaron\Desktop\RECA_ODS\app\automation\rules_engine.py` (661 lineas)

### C.1 Funcion central

```python
suggest_service_from_analysis(*, analysis: dict, message: dict) -> DecisionSuggestion
```

**Inputs que consume del `analysis`:**
- `nit_empresa` → lookup en `empresas` para obtener `caja_compensacion`
- `document_kind` → ramificacion principal (11 branches)
- `modalidad_servicio` → inferida o directa del PDF
- `gestion_empresarial`, `gestion`, `tipo_gestion`, `gestion_servicio` → familia Compensar/RECA
- `tamano_empresa`, `tamano_empresa_servicio`, `size_bucket`, `cantidad_trabajadores` → bucket de tamano
- `participantes` → lista de oferentes (para buckets de seleccion/contratacion)
- `cantidad_empresas`, `nits_empresas` → conteo de empresas en promocion
- `is_fallido` → visita fallida de interprete
- `sumatoria_horas_interpretes`, `total_horas_interprete` → horas de interpretacion
- `cargo_objetivo`, `total_vacantes`, `numero_seguimiento` → campos especificos por tipo

**Inputs que consume del `message`:**
- `subject` → inferencia de modalidad ("virtual" en asunto)

### C.2 Funciones auxiliares de inferencia

| Funcion | Que hace | Output |
|---|---|---|
| `_infer_modalidad()` | PDF → subject email → ciudad empresa → default `""` | `(modalidad, reason)` |
| `_management_family()` | Detecta "compensar" o "reca" en gestion; default RECA | `(family, reason, is_default)` |
| `_company_size_bucket()` | Detecta "hasta 50" / "desde 51" o infiere de `cantidad_trabajadores`; default `hasta_50` | `(bucket, reason, is_default)` |
| `_promotion_company_count()` | Count explicito → count de NITs → default 1 | `(count, reason, is_default)` |
| `_promotion_bucket_token()` | Mapea count a token: `individual`, `2-3 empresas`, `4-5`, `6-10`, `11-15`, `mas de 15` | `(token, reason)` |
| `_selection_size_bucket()` | Mapea `len(participantes)` a: `individual`, `2-4`, `5-7`, `8+` | `(bucket, reason)` |
| `_interpreter_tarifa_from_hours()` | Mapea horas a tarifa: ≥1h→"hora", 0.75→"45", 0.5→"30", 0.25→"15" | `(row, reason)` |
| `_interpreter_tarifa_from_text()` | Busca tokens en signal_text: "visita fallida", "15 min", "30 min", etc. | `(row, reason)` |
| `_extract_vacancy_count()` | Extrae de `total_vacantes` o de `(N)` en texto | `int` |
| `_extract_cargo_objetivo()` | Extrae de `cargo_objetivo` o limpia `process_name_hint` | `str` |
| `_extract_follow_up_number()` | Extrae numero de seguimiento | `str` |
| `_select_tarifa(predicate)` | Itera `tarifas` y devuelve primera fila que matchee el predicado | `dict | None` |

### C.3 Los 11 `document_kind` — analisis uno por uno

#### 1. `interpreter_service`

**Inputs consultados:** `is_fallido`, `sumatoria_horas_interpretes`, `total_horas_interprete`, signal_text (subject, file_path, interpreter_total_time_raw, sumatoria_horas_interpretes_raw)

**Logica:**
1. Si `is_fallido=true` o "fallido" en signal_text → busca tarifa con "visita fallida" en descripcion → confidence `medium`
2. Si hay horas detectadas → `_interpreter_tarifa_from_hours()`:
   - ≥1.0h → tarifa con "interprete" + "hora" → confidence `medium`
   - 0.75h (±0.02) → tarifa con "interprete" + "45" → confidence `medium`
   - 0.5h (±0.02) → tarifa con "interprete" + "30" → confidence `medium`
   - 0.25h (±0.02) → tarifa con "interprete" + "15" → confidence `medium`
3. Si no hay horas pero hay tokens en signal_text → `_interpreter_tarifa_from_text()`:
   - "visita fallida" → tarifa "visita fallida" → confidence `medium`
   - "15 min/mn/minuto" → tarifa "15" → confidence `medium`
   - "30 min/minuto" → tarifa "30" → confidence `medium`
   - "45 min/minuto" → tarifa "45" → confidence `medium`
   - "1 hora/60 min/por hora" → tarifa "hora" → confidence `medium`
4. Si nada matchea → `confidence="low"`, sin codigo

**Predicado LIKE sobre tarifas:**
- `"interprete" in descripcion AND "hora" in descripcion`
- `"interprete" in descripcion AND "45" in descripcion`
- `"interprete" in descripcion AND "30" in descripcion`
- `"interprete" in descripcion AND "15" in descripcion`
- `"visita fallida" in descripcion`

**Confidence:** siempre `medium` cuando matchea, `low` cuando no.

**Rationale:** tupla de strings con: "Se detecto documento de interprete LSC." + razon especifica (horas, visita fallida, duracion).

---

#### 2. `vacancy_review`

**Inputs consultados:** `modalidad_servicio` (inferida), NIT → `caja_compensacion`

**Buckets evaluados:** Solo modalidad (no hay buckets de cantidad ni gestion).

**Predicado LIKE:**
```python
"vacante" in descripcion AND modalidad == modalidad_tarifa
```

**Confidence:** `high` si modalidad == "Virtual", `medium` si otra modalidad, `low` si no hay tarifa match.

**Rationale:** "Se asigno familia de codigo de revision de vacante."

---

#### 3. `sensibilizacion`

**Inputs consultados:** `modalidad_servicio` (inferida)

**Predicado LIKE:**
```python
"sensibilizacion" in descripcion AND modalidad == modalidad_tarifa
```

**Confidence:** `high` si "Virtual", `medium` si otra, `low` si no match.

**Rationale:** "Se asigno familia de codigo de sensibilizacion."

---

#### 4. `organizational_induction`

**Inputs consultados:** `modalidad_servicio` (inferida)

**Predicado LIKE:**
```python
"organizacional" in descripcion AND modalidad == modalidad_tarifa
```

**Confidence:** `high` si "Virtual", `medium` si otra, `low` si no match.

**Rationale:** "Se asigno familia de codigo de induccion organizacional."

---

#### 5. `operational_induction`

**Inputs consultados:** `modalidad_servicio` (inferida)

**Predicado LIKE:**
```python
"operativa" in descripcion AND modalidad == modalidad_tarifa
```

**Confidence:** `high` si "Virtual", `medium` si otra, `low` si no match.

**Rationale:** "Se asigno familia de codigo de induccion operativa."

---

#### 6. `inclusive_selection`

**Inputs consultados:** `modalidad_servicio` (inferida), `participantes` (lista)

**Buckets evaluados:** `_selection_size_bucket(participantes)`:
- 1 → `"individual"`
- 2-4 → `"2-4"`
- 5-7 → `"5-7"`
- 8+ → `"8+"`

**Token mapeado** (`_selection_bucket_token`):
- `individual` → `"individual"`
- `2-4` → `"2 a 4"`
- `5-7` → `"5 a 7"`
- `8+` → `"8 oferentes"`

**Predicado LIKE:**
```python
"seleccion incluyente" in descripcion
AND token in descripcion          # ej: "2 a 4"
AND modalidad == modalidad_tarifa
```

**Confidence:** `medium` si hay participantes, `low` si no.

**Rationale:** "Cantidad de oferentes detectada: X." + "Se asigno familia de codigo de seleccion incluyente."

---

#### 7. `inclusive_hiring`

**Inputs consultados:** `modalidad_servicio` (inferida), `participantes` (lista)

**Buckets evaluados:** mismos que `inclusive_selection` (`_selection_size_bucket`).

**Predicado LIKE:**
```python
"contratacion incluyente" in descripcion
AND token in descripcion
AND modalidad == modalidad_tarifa
```

**Confidence:** `medium` si hay participantes, `low` si no.

**Rationale:** "Cantidad de oferentes detectada: X." + "Se asigno familia de codigo de contratacion incluyente."

---

#### 8. `program_reactivation`

**Inputs consultados:** `modalidad_servicio` (inferida), `gestion_empresarial`/`gestion`/etc.

**Buckets evaluados:** `_management_family()` → `"compensar"` o `"reca"` (default RECA con `is_default=true`).

**Predicado LIKE:**
```python
"reactivacion" in descripcion
AND family in descripcion          # "compensar" o "reca"
AND modalidad == modalidad_tarifa
```

**Confidence:** `low` si `family_is_default=true`, `medium` si no.

**Rationale:** "Gestion detectada en el acta: COMPENSAR/RECA." + "Se asigno familia de codigo de mantenimiento/reactivacion."

---

#### 9. `program_presentation`

**Inputs consultados:** `modalidad_servicio` (inferida), `gestion_empresarial`, `cantidad_empresas`, `nits_empresas`

**Buckets evaluados:**
1. `_management_family()` → `"compensar"` o `"reca"`
2. `_promotion_company_count()` → count de empresas
3. `_promotion_bucket_token(count)` → token: `individual`, `2-3 empresas`, `4-5`, `6-10`, `11-15`, `mas de 15`

**Predicado LIKE (4 condiciones):**
```python
"promocion" in descripcion
AND bucket_token in descripcion    # ej: "2 a 3 empresas"
AND family in descripcion          # "compensar" o "reca"
AND modalidad == modalidad_tarifa
```

**Confidence:** `low` si `family_is_default` o `count_is_default`, `medium` si ambos detectados.

**Rationale:** 4 strings: gestion reason + count reason + bucket reason + "Se asigno familia de codigo de promocion del programa."

---

#### 10. `follow_up`

**Inputs consultados:** `modalidad_servicio` (inferida), signal_text

**Buckets evaluados:** Si signal_text contiene "visita adicional", "casos especiales" o "apoyo" → usa token `"visita adicional"`, sino `"seguimiento y acompanamiento"`.

**Predicado LIKE:**
```python
description_token in descripcion   # "visita adicional" o "seguimiento y acompanamiento"
AND modalidad == modalidad_tarifa
```

**Confidence:** siempre `medium` cuando matchea.

**Rationale:** "Se asigno familia de codigo de seguimiento." o "Se asigno familia de visita adicional de seguimiento/apoyo."

---

#### 11. `accessibility_assessment`

**Inputs consultados:** `modalidad_servicio` (inferida), `tamano_empresa`/`cantidad_trabajadores`

**Buckets evaluados:** `_company_size_bucket()` → `"hasta_50"` o `"desde_51"` (default `hasta_50` con `is_default=true`).

**Predicado LIKE (si hay modalidad):**
```python
"accesibilidad" in descripcion
AND ("hasta 50" in descripcion if bucket=="hasta_50" else "desde 51" in descripcion)
AND modalidad == modalidad_tarifa
```

**Confidence:** `low` si `size_is_default=true`, `medium` si detectado. Si no hay modalidad → `low` con solo `modalidad_servicio` sugerido.

**Rationale:** "Tamano de empresa detectado: hasta 50/desde 51." + "Se asigno familia de codigo de evaluacion de accesibilidad."

---

### C.4 Caso especial: `attendance_support`

No es uno de los 11 con tarifa, pero se maneja explícitamente:
- Retorna `confidence="low"` sin codigo.
- Rationale: "El documento fue clasificado como control de asistencia."

### C.5 Fallback final

Si ningun `document_kind` matchea:
- Retorna `DecisionSuggestion(modalidad_servicio=modalidad, confidence="low", rationale=rationale)`
- Sin codigo, sin valor, solo la modalidad inferida.

### C.6 Estructura del `DecisionSuggestion`

```python
@dataclass
class DecisionSuggestion:
    codigo_servicio: str = ""
    referencia_servicio: str = ""
    descripcion_servicio: str = ""
    modalidad_servicio: str = ""
    valor_base: float = 0.0
    observaciones: str = ""
    observacion_agencia: str = ""
    seguimiento_servicio: str = ""
    confidence: str = "low"           # "low" | "medium" | "high"
    rationale: tuple[str, ...] = ()
```

### C.7 Auto-generacion de observaciones y seguimiento

- `_build_document_observaciones()`: para `vacancy_review`, `inclusive_selection`, `inclusive_hiring` → `"cargo_objetivo (total_vacantes)"` o solo `cargo_objetivo`.
- `_build_document_seguimiento()`: para `follow_up` → `_extract_follow_up_number(analysis)`.

---

## D. Document classifier — `document_classifier.py`

**Archivo:** `C:\Users\aaron\Desktop\RECA_ODS\app\automation\document_classifier.py` (172 lineas)

### D.1 Mecanismo

Puro rule-based: lista de tuplas `(tokens, DocumentClassification)`. Si el filename o subject contiene cualquiera de los tokens, gana esa clasificacion.

### D.2 Clasificaciones posibles

| document_kind | document_label | Tokens de match | Score | is_ods_candidate |
|---|---|---|---|---|
| `interpreter_service` | Servicio interprete | "interprete lsc", "interprete", "servicio interprete", "int rprete lsc", "servicio int rprete", "servicio int rprete lsc" | 0.95 | True |
| `attendance_support` | Control de asistencia | "control de asistencia" | 0.99 | **False** |
| `vacancy_review` | Revision de condicion o vacante | "levantamiento del perfil", "condiciones de la vacante", "revision de las condiciones" | 0.92 | True |
| `program_presentation` | Presentacion del programa | "presentacion del programa" | 0.92 | True |
| `accessibility_assessment` | Evaluacion de accesibilidad | "evaluacion de accesibilidad" | 0.92 | True |
| `program_reactivation` | Reactivacion del programa | "reactivacion del programa", "reactivacion programa" | 0.90 | True |
| `follow_up` | Seguimiento | "seguimiento", "seguimientos" | 0.88 | True |
| `sensibilizacion` | Sensibilizacion | "sensibilizacion" | 0.90 | True |
| `inclusive_selection` | Seleccion incluyente | "seleccion incluyente", "seleccion_incluyente" | 0.90 | True |
| `inclusive_hiring` | Contratacion incluyente | "contratacion incluyente", "contratacion_incluyente" | 0.90 | True |
| `operational_induction` | Induccion operativa | "induccion operativa" | 0.90 | True |
| `organizational_induction` | Induccion organizacional | "induccion organizacional" | 0.90 | True |

### D.3 Fallbacks

1. Si hay `process_hint` con `process_score >= 0.5` → `document_kind="process_match"`, score = process_score.
2. Si nada matchea → `document_kind="needs_review"`, score=0.0, is_ods_candidate=False.

### D.4 Oportunidad de fusion con LLM

El LLM en la Edge Function ya clasifica implicitamente el documento al extraer campos (el `document_kind` se usa para seleccionar el perfil de extraccion). Se podria:
- Pedirle al LLM que devuelva `document_kind` como campo explicito en su output.
- Si el clasificador por reglas y el LLM coinciden → confidence `high`.
- Si difieren → marcar para revision manual.
- Cuando hay ACTA ID disponible, leer el `form_slug` de `formatos_finalizados_il` como source-of-truth del `document_kind`.

---

## E. Oportunidades de mejora detectadas

### E.1 Matriz de tarifas externalizable a tabla `tarifas_reglas`

**Problema:** 660 lineas de if/elif en `rules_engine.py`. Cada nueva tarifa requiere editar codigo.

**Propuesta:** Crear tabla `tarifas_reglas`:
```
CREATE TABLE tarifas_reglas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_kind text NOT NULL,
  modalidad text,                     -- null = aplica a todas
  gestion text,                       -- "compensar", "reca", null
  bucket_size text,                   -- "hasta_50", "desde_51", null
  participants_bucket text,           -- "individual", "2-4", "5-7", "8+"
  companies_bucket text,              -- "individual", "2-3 empresas", etc.
  match_descripcion text NOT NULL,    -- patron LIKE
  match_modalidad boolean DEFAULT true,
  prioridad integer NOT NULL DEFAULT 0,
  confidence_default text DEFAULT 'medium',
  notas text,
  vigente_desde date NOT NULL DEFAULT current_date,
  vigente_hasta date,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Un evaluador generico (~200 lineas TS) recorre las reglas en orden de prioridad, evalua predicados contra el `analysis`, y devuelve la primera tarifa que matchee. Los admins podrian ajustar reglas desde una pantalla sin tocar codigo.

**Trade-off:** la logica de buckets, normalizacion de modalidad y inferencia sigue siendo codigo. Solo la **matriz de tarifas** se externaliza.

### E.2 Fusion del document classifier por reglas + clasificador implicito del LLM

**Problema:** Duplicacion de esfuerzo. El LLM ya "sabe" que tipo de documento es al extraer campos.

**Propuesta:**
1. Cuando hay ACTA ID → usar `form_slug` de `formatos_finalizados_il` como source-of-truth.
2. Cuando no hay ACTA ID → usar clasificador por reglas + pedirle al LLM que devuelva `document_kind` explicito.
3. Si coinciden → confidence `high`. Si difieren → marcar para revision.

### E.3 Bug-trap de la columna `año_servicio` con ñ

**Hallazgo confirmado** (ver §G.2): la columna en BD se llama literalmente `año_servicio` (con ñ). El legacy mantiene **6 alias de encoding** en `terminar.py`:
```python
_YEAR_FIELD_ALIASES = (
    "ano_servicio",
    "año_servicio",         # \u00f1
    "aÃ±o_servicio",        # UTF-8 doble-codificado
    "a?o_servicio",         # corrupted
    "aï¿½o_servicio",       # replacement char
    "aÃƒÂ±o_servicio",      # doble UTF-8
)
```

**Propuesta:**
1. Migracion SQL: `ALTER TABLE ods RENAME COLUMN "año_servicio" TO ano_servicio;`
2. El legacy puede coexistir leyendo ambos durante la transicion (ya tiene los alias).
3. El nuevo modulo usa solo `ano_servicio` (sin ñ).
4. Zod schema del nuevo modulo usa `ano_servicio`.

### E.4 Schema fetching en runtime reemplazado por Zod

**Problema:** `terminar.py` hace GET a `${SUPABASE_URL}/rest/v1/` antes de cada INSERT para coercionar tipos. Es lazy y defensivo pero agrega un round-trip innecesario.

**Propuesta:** Zod schema explicito + tests de drift que comparan contra el schema real en CI. Evitamos el GET en cada insercion y movemos la deteccion de drift a build-time.

### E.5 Plan de phase-out del regex parser (Nivel 4)

**Problema:** ~700 lineas de regex fragil en `excel_acta_import.py`. Existen por compatibilidad con PDFs viejos.

**Propuesta:**
1. Dia 1: portar tal cual como red de seguridad.
2. Auditar: que % de importaciones del ultimo mes cae a Nivel 4 vs Niveles 1-3.
3. Asegurar que TODOS los PDFs nuevos del INCLUSION_LABORAL embeben `/RECA_Data` y ACTA ID.
4. En 6 meses, eliminar Nivel 4. Los PDFs viejos que no se puedan importar pasan al wizard manual.

### E.6 UX: pegar URL/ID directo sin subir archivo

**Problema:** Hoy el flujo de importar pide subir el archivo PDF entero. Si el footer ya tiene la URL/ID, no hace falta el PDF.

**Propuesta:** En el modal "Importar acta", dos tabs:
- **Tab 1 (default): "Tengo el ID o URL del acta"** — input de texto que acepta `ABC12XYZ` o URL completa. Lookup directo en `formatos_finalizados_il`. ~200 ms.
- **Tab 2: "Subir archivo PDF/Excel"** — flujo actual con los 4 niveles de fallback.

### E.7 Atomicidad de `terminar_servicio`

**Problema:** INSERT en `usuarios_reca` y INSERT en `ods` son operaciones separadas. Si la red falla en medio, hay usuarios huerfanos.

**Propuesta:** Usar una RPC de Supabase (Postgres function) que reciba ambos en un solo round-trip atomico, o una Edge Function que orqueste con transacciones reales.

---

## F. Process profiles — `process_profiles.py` + `process_profiles.json`

### F.1 Estructura

Cada `document_kind` tiene un perfil que define:
- `keep_sections`: secciones del Excel/PDF que se deben extraer
- `ignore_sections`: secciones que se deben ignorar
- `section_aliases`: mapeo de nombre canonico a nombre real en el documento
- `required_fields`: lista de campos con label, seccion, row, col, type
- `field_sources`: campos que vienen de formulas de Sheet (heredados de otras hojas)
- `field_priority`: orden de preferencia de labels para cada campo extraido
- `forbid_fields`: campos que deben ir vacios en este tipo de documento
- `line_mode`: modo de parsing (`"labeled_only"`, etc.)

### F.2 Instruction overrides hardcodeados

`_DETAILED_INSTRUCTION_OVERRIDES` en `process_profiles.py` tiene reglas especificas para 5 tipos:
- `vacancy_review`: extract_sections, ignore_sections, field_rules, hard_rules
- `inclusive_selection`: mismo patron
- `inclusive_hiring`: mismo patron
- `follow_up`: mismo patron
- `interpreter_service`: mismo patron

Cada override incluye:
- `description`: descripcion del tipo de documento
- `extract_sections`: secciones de donde extraer
- `ignore_sections`: secciones a ignorar
- `field_rules`: reglas de campo (ej: "cargo_objetivo sale solo de 'Nombre de la vacante'")
- `hard_rules`: reglas duras (ej: "cargo_objetivo nunca sale de asistentes")

### F.3 Reglas globales (aplicadas a todos los perfiles)

1. `modalidad_servicio` siempre sale de DATOS GENERALES o DATOS DE LA EMPRESA.
2. `cargo_objetivo` nunca puede salir de asistentes.
3. `cargo_objetivo` solo es valido si viene junto a una etiqueta explicita (Cargo, Nombre de la vacante, Cargo que ocupa).
4. `nombre_profesional` siempre sale de ASISTENTES (excepto interpreter_service).
5. Usa el PDF como fuente primaria; ignora OCR local faltante.

---

## G. Verificacion de schema real de Supabase

### G.1 Tabla `interpretes` vs flag `es_interprete` en `profesionales`

**Query:**
```sql
-- Verificar si existe columna es_interprete en profesionales
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profesionales' AND column_name = 'es_interprete';
```

**Resultado:** La columna `profesionales.es_interprete` **NO EXISTE**. Error: `column profesionales.es_interprete does not exist`.

**Query:**
```sql
-- Verificar columnas de la tabla interpretes
SELECT column_name FROM information_schema.columns
WHERE table_name = 'interpretes' ORDER BY ordinal_position;
```

**Resultado:** La tabla `interpretes` **EXISTE** como tabla separada con columnas:
- `id`
- `nombre`
- `created_at`
- `nombre_key`
- `deleted_at`

**Conclusion:** Los interpretes viven en una tabla `interpretes` **separada** de `profesionales`. No hay flag `es_interprete`. El legacy inserta en `interpretes` cuando crea un interprete on-the-fly (Seccion 1), y en `profesionales` cuando crea un profesional de inclusion laboral.

**Implicacion para la migracion:** Hay una decision de diseño aqui. Se podria consolidar a una sola tabla `profesionales` con flag `es_interprete = true`, eliminando la duplicacion. Esto simplifica el catalogo y las queries.

### G.2 Columna `año_servicio` con ñ

**Intento de query:**
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'ods' ORDER BY ordinal_position;
```

**Resultado:** El CLI `supabase:query --linked` fallo por problemas de autenticacion temporal (rate limiting del pooler). Sin embargo, la evidencia del codigo legacy es concluyente:

En `terminar.py` linea 19:
```python
_ODS_YEAR_DB_FIELD = "a\u00f1o_servicio"  # = "año_servicio"
```

Y los 6 alias de encoding (lineas 20-27):
```python
_YEAR_FIELD_ALIASES = (
    "ano_servicio",
    _ODS_YEAR_DB_FIELD,          # "año_servicio"
    "a\u00c3\u00b1o_servicio",   # UTF-8 doble
    "a?o_servicio",              # corrupted
    "a\u00ef\u00bf\u00bdo_servicio",  # replacement char
    "a\u00c3\u0192\u00c2\u00b1o_servicio",  # doble UTF-8
)
```

**Conclusion:** La columna en BD se llama `año_servicio` (con ñ). El fallback schema hardcodeado (linea 61) tambien usa `_ODS_YEAR_DB_FIELD` como key.

**Implicacion:** Ver §E.3 para la propuesta de renombrar.

### G.3 Tabla `tarifas` — versionado

**Query (via `supabase:table` helper):**
```bash
npm run supabase:table -- --table public.tarifas --select "*" --limit 1
```

**Resultado:**
```json
{
  "id": 2,
  "codigo_servicio": "2",
  "referencia_servicio": "IL1.PP.B.R",
  "programa_servicio": "Inclusion Laboral 1",
  "descripcion_servicio": "Promoción del Programa de Inclusión Laboral Individual - Gestion empresarial RECA-Bogotá",
  "modalidad_servicio": "Bogotá",
  "valor_base": 563440,
  "iva": 107054,
  "total": 670494,
  "created_at": "2025-12-19T23:48:07.993308",
  "updated_at": "2025-12-19T23:48:07.993308"
}
```

**Columnas de `tarifas`:** `id`, `codigo_servicio`, `referencia_servicio`, `programa_servicio`, `descripcion_servicio`, `modalidad_servicio`, `valor_base`, `iva`, `total`, `created_at`, `updated_at`.

**Conclusion:** **NO hay columnas de versionado** (`vigente_desde`, `vigente_hasta`, `version`). Las tarifas se sobreescriben directamente. Si el precio cambia, todas las ODS pasadas que consulten esa tarifa veran el precio nuevo (aunque el valor ya esta guardado en la fila de `ods` al momento del INSERT).

**Implicacion:** Para la migracion, se recomienda agregar columnas `vigente_desde` y `vigente_hasta` a `tarifas`, y que el motor de codigos seleccione la tarifa vigente a la `fecha_servicio` de la ODS.

---

## H. Wizard legacy: secuencial o all-visible?

**Evidencia directa** de `main_gui.py` lineas 3810-3831:

```python
self.seccion1 = Seccion1Frame(main_col, self.api, self.state)
self.seccion1.grid(row=1, column=0, sticky="ew", pady=8)

self.seccion2 = Seccion2Frame(main_col, self.api)
self.seccion2.grid(row=2, column=0, sticky="ew", pady=8)

self.seccion3 = Seccion3Frame(main_col, self.api)
self.seccion3.grid(row=3, column=0, sticky="ew", pady=8)

self.seccion4 = Seccion4Frame(main_col, self.api, self.state)
self.seccion4.grid(row=4, column=0, sticky="ew", pady=8)

self.seccion5 = Seccion5Frame(main_col, self.api)
self.seccion5.grid(row=5, column=0, sticky="ew", pady=8)

self.resumen = ResumenFrame(main_col, self.terminar_servicio, ...)
self.resumen.grid(row=6, column=0, sticky="ew", pady=8)
```

**Conclusion:** El wizard legacy es **ALL-VISIBLE** (todas las secciones apiladas verticalmente en rows 1-6 del mismo contenedor `main_col`). No hay tabs, ni pasos secuenciales, ni ocultamiento condicional. El operador puede llenar en cualquier orden.

**El PO debe corregir su §9.10** del inventario — no es "mejora pendiente", ya funciona asi en legacy. En la migracion mantenemos el patron all-visible.

---

## I. Roles y permisos — propuesta

### I.1 Propuesta inicial

Un solo rol `ods_operador` dia 1 para los 2 usuarios del modulo ODS.

**Critica de la propuesta del PO:**

La propuesta del PO (`ods_operador` con RLS: SELECT = dueño o cualquier operador, INSERT = cualquier operador, UPDATE/DELETE = definir) es razonable para dia 1. Sin embargo, hay matices:

1. **Consistencia con el patron E0:** El proyecto ya usa `profesional_roles` con permisos como `inclusion_empresas_admin` y `inclusion_empresas_profesional`. El rol ODS deberia seguir el mismo patron: `ods_operador` como permiso en `profesional_roles`, no como rol de auth separado.

2. **RLS para `ods`:**
   - SELECT: cualquier `ods_operador` puede ver todas las ODS (no hay necesidad de restringir por dueño dia 1 — son 2 usuarios que trabajan en equipo).
   - INSERT: cualquier `ods_operador`.
   - UPDATE: **nadie** dia 1. Si hay error, se crea una nueva ODS. Esto simplifica y evita inconsistencias. Se habilita en una epica futura si la operacion lo pide.
   - DELETE: **nadie**. Las ODS son registros contables/facturables.

3. **RLS para `usuarios_reca`:**
   - SELECT: cualquier autenticado (catalogo).
   - INSERT: solo desde la API route de `terminar_servicio` (server-side con service_role).

4. **RLS para `profesionales` / `interpretes`:**
   - SELECT: cualquier autenticado (catalogo).
   - INSERT: solo desde la API route de crear profesional (server-side).

### I.2 Propuesta refinada

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `ods` | `ods_operador` (todas) | `ods_operador` | nadie | nadie |
| `usuarios_reca` | authenticated | server-only (API) | server-only | server-only |
| `profesionales` | authenticated | server-only (API) | server-only | server-only |
| `interpretes` | authenticated | server-only (API) | server-only | server-only |
| `tarifas` | authenticated | — | — | — |
| `empresas` | authenticated | — | — | — |

**Nota:** Si en el futuro se necesita que un usuario vea solo sus propias ODS, se agrega una columna `user_id` a `ods` y se ajusta la policy SELECT. Dia 1 no hace falta.

---

## J. Decisiones abiertas (para Aaron)

Estas 7 preguntas deben resolverse antes de escribir el plan de trabajo. El Dev Junior no las responde — las plantea.

| # | Pregunta | Contexto | Impacto si no se resuelve |
|---|---|---|---|
| **1** | ¿Sync a Google Sheets post-insert se mantiene dia 1 o se elimina? | `terminar_servicio` llama a `sync_new_ods_record` tras cada INSERT. Los reportes operativos de Sandra/Adriana dependen del Sheet mensual `ODS_{MES}_{YYYY}`. | Si se elimina sin avisar, se rompen reportes. Si se mantiene, hay que migrar el codigo de sync. |
| **2** | ¿Renombramos `año_servicio` → `ano_servicio` en BD? | La columna tiene ñ literal. El legacy maneja 6 alias de encoding. | Si no se renombra, el nuevo modulo hereda el bug-trap. Si se renombra, hay que coordinar con el legacy durante la transicion. |
| **3** | ¿Hasta que profundidad portamos el regex parser (Nivel 4)? | ~700 lineas de regex fragil. Cubre PDFs/Excels antiguos sin metadata ni ACTA ID. | Portarlo completo = mucho esfuerzo para pocos casos. Portarlo minimo = riesgo de no poder importar actas viejas. |
| **4** | ¿Quienes son los 2 usuarios del modulo ODS? ¿Existen ya en `profesionales`? | El owner mencionó "2 personas tienen acceso". Se necesitan para crear el rol `ods_operador`. | Sin saber quienes son, no se pueden asignar los permisos. |
| **5** | ¿La Edge Function `extract_structured_acta_pdf` entra al scope de revision o se mantiene como caja negra estable? | Ya existe en Supabase. Usa OpenAI gpt-5-mini. El owner pidio revisar "orquestador y motor de codigos". | Si entra al scope, hay que leer su codigo y evaluar mejoras. Si no, solo se invoca como API. |
| **6** | ¿Modelamos FK explicita `ods.formato_finalizado_id → formatos_finalizados_il.id`? | Hoy el legacy relaciona ODS con actas solo por contenido (NIT, fecha, etc.). Una ODS tipicamente referencia un acta finalizada. | Sin FK, la trazabilidad es debil. Con FK, hay que decidir si es obligatoria o nullable (ODS manuales no tendrian acta). |
| **7** | ¿Versionado de tarifas: como evitar que cambios futuros afecten ODS pasadas? | Hoy `tarifas` no tiene columnas de versionado. Se sobreescribe. El valor queda guardado en la fila de `ods` al INSERT, pero el motor de codigos lee la tarifa actual. | Sin versionado, el motor de codigos podria sugerir precios incorrectos para actas viejas si las tarifas cambian. |

---

## K. Resumen de hallazgos de verificacion Supabase

| Verificacion | Resultado | Evidencia |
|---|---|---|
| **a) `interpretes` separada o flag en `profesionales`** | Tabla `interpretes` **separada**. No existe `profesionales.es_interprete`. | Query `information_schema` confirmo: `interpretes` tiene columnas `id, nombre, created_at, nombre_key, deleted_at`. `profesionales` no tiene `es_interprete`. |
| **b) Columna `año_servicio` con ñ** | **Confirmado** por codigo legacy (`terminar.py:19`). Query directa fallo por rate limiting del pooler, pero la evidencia del codigo es concluyente. | `_ODS_YEAR_DB_FIELD = "a\u00f1o_servicio"` + 6 alias de encoding. |
| **c) Tabla `tarifas` con versionado** | **Sin versionado.** Columnas: `id, codigo_servicio, referencia_servicio, programa_servicio, descripcion_servicio, modalidad_servicio, valor_base, iva, total, created_at, updated_at`. | Query `supabase:table` confirmo schema actual. |

---

## L. Proximo paso

1. **Aaron** responde las 7 preguntas de §J.
2. **PO** verifica este inventario ampliado y produce el inventario unificado en `docs/ods_migration_inventory.md`.
3. **Dev Junior** con todo cerrado, escribe el plan de trabajo en `docs/ods_migration_plan.md` (formato igual al `expansion_v2_plan.md`).
4. **PO** revisa el plan, propone ajustes o aprueba.
5. **Dev Junior** implementa segun el plan aprobado.

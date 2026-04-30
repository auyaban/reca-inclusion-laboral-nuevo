# Comparación de inventarios ODS — PO vs Dev Junior

> **Propósito:** comparar el inventario independiente del Product Owner ([`ods_migration_inventory.md`](./ods_migration_inventory.md)) contra el del Dev Junior, identificar coincidencias (alta confianza), puntos ciegos de cada lado y discrepancias de interpretación, y dejar instrucciones concretas al junior antes de avanzar al plan de trabajo.
>
> **Flujo del proyecto:** el PO dirige, el Dev Junior planea, el PO verifica, el Dev Junior implementa.

- **Fecha:** 2026-04-29
- **Inventario PO:** `docs/ods_migration_inventory.md`
- **Inventario Junior:** entregado por chat al owner el 2026-04-29 (no versionado en repo todavía; se sugiere subirlo a `docs/ods_migration_inventory_junior.md` para trazabilidad)

---

## 0. Veredicto ejecutivo

El inventario del junior es **fuerte en detalle de UX y campos individuales** y **débil en análisis estratégico y oportunidades de mejora**. El del PO es lo opuesto: cubre la lógica crítica de negocio (motor de códigos, bug-traps de schema, decisiones abiertas) pero pasa por encima del nivel de campo-por-campo de las pantallas legacy.

**Los dos inventarios son complementarios.** Combinados cubren la migración. Por separado, ninguno alcanza.

Antes de que el junior produzca el plan de trabajo, debe **extender su inventario** para incorporar los puntos ciegos listados en §3 y resolver (con el owner) las preguntas abiertas en §6.

---

## 1. Coincidencias (alta confianza compartida)

Ambos inventarios coinciden en estos puntos. Trabajamos sobre estos como base segura del plan.

| Tema | PO | Junior |
|---|---|---|
| Wizard de 5 secciones (1: profesional, 2: empresa, 3: servicio, 4: oferente, 5: observaciones) | ✓ §3.1 | ✓ §1.2-1.6 |
| Estructura del `OdsPayload` y validaciones (`valor_total ≈ suma`, `mes 1-12`, `submitted_at >= started_at`, `orden_clausulada` ∈ {si,no}, normalización de espacios) | ✓ §7 | ✓ §1.9 |
| 4 niveles de fallback en importar acta (RECA metadata → ACTA ID → LLM → regex) | ✓ §4 | ✓ §2.2 |
| Patrón del ACTA ID `[A-Z0-9]{8}` extraído del footer | ✓ §4.2 | ✓ §2.3 |
| `/RECA_Data` metadata como ruta rápida del PDF | ✓ §4.1 | ✓ §2.3 |
| LLM via Edge Function de Supabase con JSON Schema estructurado | ✓ §4.3 | ✓ §2.4 |
| Cálculos: horas decimales, `valor_interprete`, suma de modalidades, redondeo 2 decimales | ✓ §3.2 | ✓ §1.4 |
| Tablas escritas: `ods`, `usuarios_reca`, `profesionales`, `interpretes` | ✓ §3.4 | ✓ §1.10 |
| Resolución contra catálogos: empresa por NIT/nombre fuzzy, profesional por nombre fuzzy, intérprete con auto-create | ✓ §4.5 | ✓ §2.5 |
| Cédula partida con porcentaje o teléfono pegado (`_split_joined_cedula_*`) | ✓ §4.4 | ✓ §2.6 |
| Trazabilidad `import_resolution` con strategy + reason + acta_ref | ✓ §4 | ✓ §2.8 |
| Document classifier rule-based con tokens de filename/subject | ✓ §5.1 | ✓ §2.2 (mención) |

---

## 2. Hallazgos del JUNIOR que el PO no capturó (puntos ciegos del PO)

Estos son aportes reales del junior que enriquecen el inventario combinado. **El PO debe asumirlos como ciertos** y agradecidos.

| # | Hallazgo | Importancia |
|---|---|---|
| 2.1 | **Sección 4 es multi-fila (oferentes ilimitados).** Cada fila es una persona; al confirmar se agregan con separador `;` (e.g., `"Juan;María;Pedro"`). Filas vacías se excluyen. | **Alta.** Cambia la UI radicalmente respecto a las otras secciones. |
| 2.2 | **`es_interprete = true` bloquea el checkbox de interpretación en Sección 3** (forzado activado). | **Alta.** Regla de interacción cruzada entre secciones. |
| 2.3 | **Programa del profesional se resuelve por substring del cargo:** `"inclus" + "labor"` → `"Inclusion Laboral"`, `"interp"` → `"Interprete"`. | **Media.** Es business rule específico para crear profesionales on-the-fly. |
| 2.4 | **Búsqueda bidireccional NIT ↔ nombre en Sección 2:** typing en NIT autocompleta nombre y viceversa, con fuzzy match si no hay exacto. | **Alta.** UX detail importante. |
| 2.5 | **Catálogos estáticos enumerados:** Discapacidad (Intelectual, Múltiple, Física, Visual, Auditiva, Psicosocial, N/A), Género (Hombre, Mujer, Otro), Tipo contrato (Laboral, Contrato Aprendiz Especial, Orientación Laboral). | **Alta.** El PO los marcó como "enums" pero no listó los valores. |
| 2.6 | **Modalidad normalizada a 4 valores canónicos:** `Virtual`, `Bogotá`, `Fuera de Bogotá`, `Todas`. | **Media.** Confirma normalización exacta. |
| 2.7 | **Mapeo explícito import → wizard (tabla §2.7 del junior).** Lista campo-por-campo cómo cada resultado de import se inyecta en el state del wizard. | **Alta.** Bloque listo para portar a TS. |
| 2.8 | **Strings user-facing del `import_resolution`** ("Info cargada usando ACTA ID...", "No se encontró ACTA ID legible..."). | **Media.** UX copy ya validada. |
| 2.9 | **Preview UI antes de aplicar import:** cards métricas (oferentes detectados, usuarios existentes, usuarios por crear), tabla detalle empresa/NIT/fecha/modalidad/profesional con doble columna detectado-vs-aplicado, tabla participantes con acción Crear/Existente, lista de hasta 6 warnings, botón "Aplicar al formulario". | **Alta.** El PO solo mencionó que existe; el junior lo describe completo. |
| 2.10 | **Resumen final en tiempo real** (debounce 300 ms) que muestra: fecha, profesional, empresa, código, valor total. | **Baja.** UX nice-to-have. |
| 2.11 | **Botón "Lista de códigos"** en Sección 3 abre popup con todos los códigos navegables. | **Baja.** UX detail. |
| 2.12 | **Error highlighting color `#FFF2CC`** en filas con error de validación. | **Baja.** Detalle puramente cosmético. |
| 2.13 | **Cache local SQLite** (no genérico "local cache"). | **Baja.** Detalle técnico de implementación legacy. |
| 2.14 | **Modelo LLM: `gpt-5-mini`, timeout 240 s, base64 < 10 MB.** | **Media.** Confirmaciones operativas. |
| 2.15 | **Umbrales fuzzy de profesional precisos:** `exact=1.0`, `substring=0.97`, `token_subset=0.96/0.94`, threshold no-intérprete `≥0.55`, threshold intérprete `≥0.85`. | **Media.** Útil para portar el algoritmo. |
| 2.16 | **Integración con "Actas Terminadas":** doble-click en columna `Revisado` dispara `_importar_acta_revisada` usando `build_import_result_from_finalized_record`. | **Baja.** Está fuera de scope (Actas Terminadas no se migra), pero es contexto útil. |
| 2.17 | **Campos extraídos de PDFs de intérprete específicamente:** `interpretes[]`, `sumatoria_horas_interpretes`, `total_horas_interprete`, `interpreter_process_name`, `is_fallido`. | **Media.** El PO los mencionó en passing; el junior los lista limpios. |
| 2.18 | **Casos borde concretos:** PDF sin texto legible, archivo no existe, tipo desconocido, sin NIT, sin match empresa, sin participantes, LLM timeout, LLM no configurado, PDF > 10 MB, cédula unida con %, cédula unida con teléfono, nombre empresa desde dominio de email. | **Media.** Útil como lista de tests. |

---

## 3. Hallazgos del PO que el JUNIOR no capturó (puntos ciegos del Junior)

Estos son los puntos donde el inventario del junior **debe extenderse antes de pasar al plan de trabajo**. Cada uno tiene impacto en el plan.

| # | Hallazgo / Tema | Por qué importa | Impacto |
|---|---|---|---|
| 3.1 | **Bug-trap de la columna `año_servicio` con ñ.** La tabla `ods` tiene literalmente la columna `año_servicio` (con ñ). El legacy mantiene **6 alias de encoding** para soportar UTF-8 doble-codificado, Latin-1, etc. | Sin saberlo, se va a reproducir el bug en el nuevo código. | **Alto.** Hay que decidir si renombrar la columna o convivir. |
| 3.2 | **Schema fetching en runtime de Supabase OpenAPI** (`terminar.py:_fetch_ods_schema`). El legacy hace GET a `/rest/v1/` antes de cada INSERT para coercionar tipos. Es lazy y defensivo. | El nuevo módulo en Next.js con Zod no necesita esto y debería evitarlo. | **Medio.** Decisión de arquitectura. |
| 3.3 | **Atomicidad de `terminar_servicio`.** El INSERT en `usuarios_reca` y el INSERT en `ods` son operaciones separadas, no transaccionales. Si la red falla en medio, hay usuarios huérfanos. | Hay que decidir si lo dejamos así, lo movemos a una RPC o lo orquestamos en una Edge Function. | **Medio.** |
| 3.4 | **Sync a Google Sheets post-insert** (`sync_new_ods_record` en `google_drive_sync.py`). Después del INSERT, el legacy escribe el registro a un Sheet operativo mensual. | **No está en la lista de "se pierde" del owner.** Si lo eliminamos sin avisar, rompemos reportes operativos. Si lo mantenemos, hay que migrar el código. | **Alto.** Decisión de producto pendiente. |
| 3.5 | **Análisis profundo del motor de códigos (`rules_engine.py`).** El junior solo dice "Sugerir código servicio (rules engine)". El motor de códigos tiene ~660 líneas con 11 ramificaciones por `document_kind`, lógica de buckets (selección 1/2-4/5-7/8+, promoción individual/2-3/4-5/6-10/11-15/>15), normalización de gestión Compensar/RECA, inferencia de modalidad por subject/ciudad, scoring de confianza, y rationale explicable. | **El owner pidió evaluarlo para mejoras.** Sin entender el motor a fondo, no se puede proponer mejora. | **Crítico.** |
| 3.6 | **Sección de oportunidades de mejora detectadas.** El owner pidió explícitamente: *"sistema de orquestación y motor de códigos... Quizás ahora podamos hacerla mejor y que funcione un poco mejor, por si le falta algo o algo".* El inventario del junior **no propone ninguna mejora**. | El owner no lo va a aceptar como input al plan de trabajo sin esta sección. | **Crítico.** |
| 3.7 | **Sección de preguntas abiertas / decisiones pendientes.** El junior describe el sistema "as-is" sin marcar qué decisiones bloquean el plan. | Sin esto, el plan se construye sobre supuestos no validados. | **Alto.** |
| 3.8 | **Sección "out of scope" explícita.** El junior no enumera lo que NO se trae (ODS retry Drive, Actualizar BD Gestión, Actualizar Supabase, Actas Terminadas, AUTOMATIZACION/, factura, etc.). | Si no está escrito, alguien va a asumir que entra. | **Medio.** |
| 3.9 | **Relación entre `ods` (legacy) y `formatos_finalizados_il` (nueva).** Son tablas distintas. ODS = orden de servicio facturable; `formatos_finalizados_il` = el acta misma. Una entrada de ODS típicamente referencia un acta finalizada. | Hay una decisión de diseño aquí: ¿modelamos un FK explícito (`ods.formato_finalizado_id`)? Hoy el legacy las relaciona solo por contenido (NIT, fecha, etc.). | **Alto.** |
| 3.10 | **Versionado de tarifas.** Si el precio de `IL.1.PP.B.C.V` cambia, ¿se sobreescribe la fila o se agrega con `vigente_desde`? Las ODS pasadas deben mantener su precio histórico. | El legacy probablemente sobreescribe (no hay evidencia de versionado). En el nuevo módulo hay que decidir. | **Medio.** |
| 3.11 | **Roles y RLS para el módulo ODS.** El owner mencionó "2 personas tienen acceso, hay que crear roles nuevos". El junior no aborda esto. | Define gating de la UI y políticas RLS. | **Alto.** |
| 3.12 | **Recomendación de hacer parsing PDF/Excel server-side.** El junior describe los parsers pero no propone arquitectura de migración. Las librerías son pesadas, la lógica usa service role para queries a `formatos_finalizados_il`, el cliente solo necesita subir archivo y mostrar resultado. | Decisión de arquitectura clave. | **Medio.** |
| 3.13 | **Plan de phase-out del regex parser (Nivel 4).** ~700 líneas de regex frágil que existen por compatibilidad con PDFs viejos. Si todos los PDFs nuevos del INCLUSION_LABORAL llevan `/RECA_Data`, este nivel se puede deprecar gradualmente. | Define cuánto esfuerzo invertir en portar exactamente vs simplificar. | **Medio.** |
| 3.14 | **Process profiles para LLM (`process_profiles.py`).** Definen `keep_sections`, `field_priority`, `forbid_fields`, `line_mode`, alias de secciones por document_kind. El junior los menciona pero no los inventaría. | Si la Edge Function se mantiene como está, los profiles son input crítico de su contrato. | **Bajo (solo si revisamos la Edge Function).** |

---

## 4. Discrepancias / interpretaciones distintas

Casos donde los dos inventarios chocan o difieren en lectura. Hay que cerrarlos.

### 4.1 ¿El wizard legacy es secuencial o todo-visible-a-la-vez?

- **Junior** (§1.8): *"Llenado de secciones (cualquier orden, todas visibles) → resumen auto-actualiza (debounce 300 ms)".*
- **PO** (§9.10): asumió secuencial 1 → 2 → 3 → 4 → 5 y propuso como "mejora" hacerlo long form (todo visible a la vez).

**Resolución probable:** el junior tiene la razón; ya es todo visible. El PO debe corregir su §9.10 — no es "mejora pendiente", ya está así en legacy. En la migración mantenemos el patrón all-visible.

### 4.2 ¿Qué se llama "scanner" / "importador"?

- **Junior** lo llama "Escáner de Actas" (Sección 2 de su doc).
- **PO** lo llama "Importar acta" (idéntico al label del botón en la UI legacy).
- **Owner** lo llama "escanear" (verbatim del chat).

**Resolución:** los tres son sinónimos. En el módulo nuevo usar **"Importar acta"** como label oficial — coincide con el botón legacy y con la operación real (importar un archivo o ID, no escanear con cámara). "Escáner" puede confundir.

### 4.3 ¿`profesionales` con flag `es_interprete` o tabla `interpretes` separada?

- **Junior** (§1.2 y §1.10): habla de `interpretes` como tabla separada al crear ("inserta en `profesionales` o `interpretes`").
- **PO** (§4.5): asumió que intérpretes son rows de `profesionales` con `es_interprete = true` (inferido de `acta_import_pipeline._interpreters()`).

**Resolución:** ambos pueden ser ciertos a la vez si hay tabla `interpretes` y además flag `es_interprete` en `profesionales`. Hay que verificar el schema actual de Supabase. Si hay duplicación, es deuda técnica que aprovechamos para limpiar en la migración (consolidar a una sola tabla con flag).

### 4.4 Granularidad del `import_resolution.reason`

- **Junior** lista 3 razones: `acta_ref_lookup`, `payload_normalized`, `no_acta_ref` (más implícitos).
- **PO** lee del código 5 razones: `no_acta_ref`, `acta_ref_lookup_failed`, `acta_ref_invalid_payload`, `acta_ref_not_found`, `direct_parser`, `payload_normalized`.

**Resolución:** lista del PO es más completa. El junior puede ampliar.

---

## 5. Decisión sobre cómo combinar los inventarios

**Recomendación:** producir un **único inventario unificado** que reemplace a ambos para el plan de trabajo, escrito por el PO incorporando los hallazgos del junior. Los dos inventarios originales se mantienen como insumo histórico (no se borran).

**Por qué el PO escribe la versión unificada (no el junior):**
- El plan de trabajo va a vivir como documento PO (igual que `expansion_v2_plan.md`).
- El junior debe enfocar su tiempo en producir el plan de trabajo, no en mantener el inventario.
- La sección de oportunidades de mejora, preguntas abiertas, roles y arquitectura son responsabilidad PO.

**Cuándo se hace:** cuando el junior cierre los gaps de §3 vía amplaición de su propio inventario o respondiendo a las preguntas en §6.

---

## 6. Instrucciones para el Dev Junior antes de pasar al plan de trabajo

Estas son las extensiones que debe hacer el junior a su inventario antes de proponer plan. **No es que su inventario esté mal**: es que está en nivel "implementador". Para proponer un plan de trabajo necesita una pasada con visión más amplia.

### 6.1 Agregar sección "Out of scope explícito"

Listar lo que NO se trae (botones del menú principal, módulo `automation/` excepto rules+classifier, factura, dashboards, etc.). Mismo nivel de detalle que las secciones del scope.

### 6.2 Agregar sección "Oportunidades de mejora detectadas"

El owner explícitamente pidió evaluar el orquestador y el motor de códigos para mejoras. El inventario actual no las propone. Mínimo a cubrir:

- Análisis del `rules_engine.py`: ¿la matriz de tarifas se podría externalizar a una tabla editable? ¿El árbol de decisión se simplifica?
- Análisis del `document_classifier.py`: ¿el LLM ya clasifica, vale la pena duplicarlo en reglas?
- Análisis del fallback regex: ¿hace sentido portarlo entero o solo un subset?
- Análisis del `año_servicio` con ñ.
- Análisis del schema-fetch en runtime.
- UX: pegar URL/ID directo sin subir archivo cuando hay ACTA ID.

### 6.3 Profundizar en `rules_engine.py`

Documentar por cada `document_kind` (los 11 que maneja: `interpreter_service`, `vacancy_review`, `sensibilizacion`, `organizational_induction`, `operational_induction`, `inclusive_selection`, `inclusive_hiring`, `program_reactivation`, `program_presentation`, `follow_up`, `accessibility_assessment`):
- Inputs que consulta del `analysis`
- Buckets que evalúa (cantidades, modalidades, gestión)
- Cómo selecciona la fila de `tarifas` (predicado LIKE sobre `descripcion_servicio`)
- Confidence scoring: cuándo `low`, `medium`, `high`
- Estructura del `rationale` que devuelve

Esto es **el corazón del negocio**. Sin entenderlo, no se puede migrar ni mejorar.

### 6.4 Agregar sección "Decisiones abiertas"

Listar y priorizar las preguntas que deben resolverse con el owner antes del plan:

1. ¿Sync a Google Sheets post-insert se mantiene día 1 o se elimina?
2. ¿Renombramos `año_servicio` → `ano_servicio`?
3. ¿Hasta qué profundidad portamos el regex parser?
4. ¿Quiénes son los 2 usuarios del módulo? ¿Existen ya en `profesionales`?
5. ¿Edge Function `extract_structured_acta_pdf` entra al scope de revisión o se mantiene como caja negra estable?
6. ¿Modelamos FK explícita `ods.formato_finalizado_id → formatos_finalizados_il.id`?
7. ¿Versionado de tarifas: cómo evita que cambios futuros afecten ODS pasadas?

### 6.5 Agregar sección "Roles y permisos"

Recomendación PO: un solo rol `ods_operador` día 1 para los 2 usuarios. RLS:
- `ods` SELECT: dueño o cualquier `ods_operador`
- `ods` INSERT: cualquier `ods_operador`
- `ods` UPDATE/DELETE: definir.

El junior debe validar y pulir esta recomendación.

### 6.6 Verificar el schema real de Supabase

Tres puntos a verificar conectándose al Supabase real (con las credenciales del proyecto):
1. ¿La tabla `interpretes` existe como tabla separada o son rows de `profesionales` con `es_interprete = true`? (resolver §4.3)
2. ¿La columna `año_servicio` realmente tiene ñ? (validar §3.1)
3. ¿La tabla `tarifas` tiene alguna columna de versionado (`vigente_desde`, `vigente_hasta`, `version`)? (validar §3.10)

### 6.7 Corregir el supuesto "wizard secuencial"

Si el wizard legacy es all-visible (como dice el junior), el PO actualizará su inventario eliminando esa "mejora" de §9.10. Pero antes hay que confirmar — si en realidad es secuencial, el junior debería corregir su §1.8.

---

## 7. Próximo paso

1. **Junior:** extiende su inventario incorporando §6 arriba. Lo sube como `docs/ods_migration_inventory_junior.md` (versionado en repo).
2. **PO:** verifica la extensión. Si está completa, escribe el inventario unificado en `docs/ods_migration_inventory.md` reemplazando el actual (manteniendo histórico en commits).
3. **Owner:** responde las preguntas abiertas de §6.4.
4. **Junior:** con todo lo anterior cerrado, escribe el primer borrador del plan de trabajo en `docs/ods_migration_plan.md`, formato similar al `expansion_v2_plan.md` (épicas con scope, datos, permisos, UX, criterios de aceptación, dependencias).
5. **PO:** revisa el plan, propone ajustes o aprueba.
6. **Junior:** implementa según el plan aprobado.

Tiempo estimado para llegar al plan aprobado: **2 ciclos de revisión** (uno por inventario, uno por plan).

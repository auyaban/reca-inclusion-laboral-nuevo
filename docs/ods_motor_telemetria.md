# Telemetria ODS

Esta guia explica como interpretar la telemetria silenciosa del motor de codigos ODS y como convertir hallazgos en trabajo accionable.

## Que se mide y que NO

La telemetria mide la accuracy del motor de codigos. Compara lo que el motor sugirio en `motor_suggestion` contra lo que finalmente se guardo en la ODS como `final_value`.

No mide desempeno del operador, no bloquea el flujo y no cambia el comportamiento visible del wizard. Si la telemetria falla, la ODS se puede crear igual; el fallo queda como warning server-side.

## Como activar y desactivar

La escritura depende de `ODS_TELEMETRY_START_AT` en Vercel Production.

- Ausente: no escribe filas.
- Fecha futura: no escribe filas hasta que la fecha UTC actual sea mayor o igual.
- ISO invalida: no escribe filas y emite warning.
- Fecha activa: los callers server-side invocan los RPCs de record/finalize.

No hay backfill automatico. Al activar la variable, se mide desde ese momento en adelante.

Stage names utiles en logs:

- `[ods/telemetry/record]`: snapshot del path de import.
- `[ods/telemetry/manual-record]`: snapshot manual al confirmar sin import.
- `[ods/telemetry/finalize]`: comparacion final contra la ODS guardada.
- `[ods/telemetry/final-value]`: derivacion de valores finales, incluyendo `valor_base`.

El gate runtime vive en `src/lib/ods/telemetry/gate.ts`. La migracion solo documenta la variable porque la base de datos no lee env vars de Vercel.

## Estructura de ods_motor_telemetria

La tabla esta definida en `supabase/migrations/20260504023257_ods_motor_telemetria.sql`.

Columnas principales:

| Columna | Proposito |
|---|---|
| `id` | Identificador de la fila de telemetria. |
| `ods_id` | FK nullable a `ods`. Usa `ON DELETE SET NULL` para preservar historial si una ODS se borra. |
| `idempotency_key` | Llave opcional para dedupe de retries. Tiene unique partial index cuando no es null. |
| `import_origin` | Origen cerrado: `acta_pdf`, `acta_excel`, `acta_id_directo`, `manual`. |
| `motor_suggestion` | Snapshot JSON de la sugerencia inicial del motor. |
| `confidence` | Confianza top-level: `low`, `medium` o `high`. |
| `final_value` | JSON comparable construido desde la ODS final. Es null hasta finalize. |
| `mismatch_fields` | `text[]` calculado por SQL en finalize. Lista campos donde motor y final difieren. |
| `created_at` | Fecha de captura del snapshot. |
| `confirmed_at` | Fecha de finalize. Si es null, la fila esta pendiente. |

Los RPCs `ods_motor_telemetria_record` y `ods_motor_telemetria_finalize` retornan envelope JSON:

```json
{ "ok": true, "code": "created", "message": "...", "data": { "telemetria_id": "..." } }
```

El comparador SQL `ods_motor_telemetria_mismatch_fields` es la fuente de verdad. El helper TS `src/lib/ods/telemetry/mismatchFields.ts` existe solo como preview/paridad local.

## Los dos paths

### Import: `acta_pdf`, `acta_excel`, `acta_id_directo`

El path de import registra snapshot despues de `runImportPipeline` y antes de responder al wizard. En ese momento la ODS todavia no existe, por eso `p_ods_id = null`.

Implementacion: `src/lib/ods/telemetry/importSnapshot.ts`.

Reglas importantes:

- `import_origin` sale server-side del path: PDF, Excel o input directo.
- `idempotency_key` se deriva server-side con SHA-256 sobre `v1|import_origin|acta_ref|actor_user_id` cuando hay `acta_ref` estable.
- Si no hay `acta_ref`, la key es null y se aceptan duplicados.
- `motor_suggestion` persiste la mejor sugerencia y `alternatives`.
- `MAX_ALTERNATIVES = 5` limita alternativas para evitar payloads grandes.
- Solo `created` y `deduped` propagan `telemetria_id` al wizard; `already_finalized` no se reutiliza.

### Manual: wizard sin import

El path manual registra snapshot despues de crear la ODS en `POST /api/ods/terminar`. Como ya existe `ods_id`, el record manual usa `p_ods_id = ods_id` y luego finaliza inmediatamente.

Implementacion: `src/lib/ods/telemetry/terminarSnapshot.ts`.

Reglas importantes:

- `import_origin = manual`.
- `idempotency_key = null`; un doble submit puede generar duplicados, aceptado por diseno.
- El motor manual usa `src/lib/ods/rules-engine/` con catalogos cargados server-side.
- `buildFinalValue.ts` deriva `valor_base` con tarifas vigentes a `fecha_servicio`.

## Como leer la vista admin

Ruta: `/hub/admin/ods-telemetria`.

La vista es solo lectura y esta protegida por el rol `ods_telemetria_admin`. La capa de datos vive en `src/lib/ods/telemetry/admin.ts` y el acceso en `src/lib/ods/telemetry/access.ts`.

Columnas:

- Fecha: `created_at` formateada.
- Origen: badge de `import_origin`.
- Confianza: badge de `confidence`.
- Codigo motor: `motor_suggestion.codigo_servicio`.
- Codigo final: `final_value.codigo_servicio`; queda en blanco si no finalizo.
- Mismatch: `Pendiente`, `Match exacto` o `Con diferencias`.
- ODS: muestra `ods_id` truncado cuando existe; el detalle ODS aun no tiene ruta.

Filtros:

- Rango de fechas por `created_at`.
- `import_origin` multi-value.
- `confidence` multi-value.
- `mismatch`: si, no o pendiente.

Paginacion:

- Server-side con `page` y `pageSize`.
- Orden principal por `created_at`, por defecto descendente.

Metricas:

- Total de filas bajo filtros activos.
- Porcentaje confirmadas vs pendientes.
- Accuracy por campo: confirmadas sin ese campo en `mismatch_fields` / total confirmadas.
- Top 10 campos con mas mismatch.

Top mismatch tiene cap de 10000 filas recientes. Si aparece la nota tecnica del cap, significa que el ranking se calculo sobre la muestra reciente y no sobre todo el universo filtrado. Si el volumen real llega a ese punto, abrir un issue para reemplazar el scan TS-side por RPC agregada. Supabase JS no expresa `unnest(mismatch_fields) + GROUP BY` desde `.select()` sin migracion.

## Casos a interpretar

### Match exacto

`confirmed_at` no es null y `mismatch_fields = []`. El motor sugirio los campos comparables igual a lo que se guardo.

Accion tipica: no requiere fix. Si el volumen de matches sube, la regla actual esta funcionando para ese tipo de acta.

### Mismatch parcial

`mismatch_fields` contiene uno o varios campos. Ejemplo: `["modalidad_servicio"]`.

Accion tipica: revisar el campo en top mismatch y contrastar con el tipo de documento/origen. Si se concentra en `modalidad_servicio`, revisar normalizacion o reglas de modalidad. Si se concentra en `valor_base`, revisar vigencias de tarifas y criterio D7.

### Sin sugerencia

`confidence = low` y `motor_suggestion.codigo_servicio` vacio/null. Esto puede pasar cuando las senales manuales o de import son insuficientes.

Accion tipica: no asumir bug automaticamente. Revisar si faltan senales en el parser/import o si el rules-engine necesita una regla nueva para ese documento.

### Edicion humana mayor

El operador cambia codigo o modalidad por criterio operativo. Puede verse como mismatch aunque el motor haya sugerido algo razonable.

Accion tipica: revisar `motor_suggestion.alternatives`. Si el valor final coincide con una alternativa rankeada, probablemente el motor tenia una opcion valida en rank #2 o #3 y el problema es ranking, no extraccion.

### Operador eligio rank #2

`motor_suggestion.alternatives` guarda hasta 5 sugerencias secundarias. Si el valor final aparece alli, el fix probable esta en scoring/ranking de `src/lib/ods/import/rankedSuggestions.ts` o en la regla que asigna `score`.

### Motor erro real

El valor final no coincide con la sugerencia principal ni con `alternatives`, y el mismatch se repite en muchos casos similares.

Accion tipica: abrir issue con ejemplos, origen, tipo de acta y campo. El fix probablemente vive en `src/lib/ods/rules-engine/` o en el parser que alimenta el analysis.

### `confirmed_at = null`

Fila pendiente. El snapshot se registro, pero la ODS no fue confirmada o finalize no corrio.

Accion tipica: no cuenta para accuracy. Si hay muchas pendientes, revisar flujo operativo o warnings `[ods/telemetry/finalize]`.

## Como traducir hallazgos en fixes

1. Empezar por "Campos con mas mismatch" en la vista admin.
2. Filtrar por `import_origin` para separar problemas de import vs manual.
3. Revisar si el campo aparece en `alternatives`.
4. Identificar si el problema es extraccion, mapeo, ranking, tarifa o comparador.
5. Abrir issue pequeno con ejemplos y criterio de aceptacion.

Referencias:

- Inventario ODS y decisiones: `docs/ods_migration_inventory.md`.
- Motor de reglas: `src/lib/ods/rules-engine/`.
- Ranking de sugerencias: `src/lib/ods/import/rankedSuggestions.ts`.
- Snapshot import: `src/lib/ods/telemetry/importSnapshot.ts`.
- Snapshot/finalize al terminar: `src/lib/ods/telemetry/terminarSnapshot.ts`.
- Valor final comparable: `src/lib/ods/telemetry/buildFinalValue.ts`.
- Comparador SQL: `supabase/migrations/20260504023257_ods_motor_telemetria.sql`.

## Riesgos conocidos

- #82: la tabla aun no guarda `actor_user_id`. Mientras un snapshot pre-ODS tiene `ods_id = null`, el RPC finalize no puede probar propiedad por actor. El threat model actual es bajo, pero antes de ampliar usuarios ODS se debe extender tabla/RPC con ownership auditable.
- #73: queda pendiente RPC `security definer` para lookup `formatos_finalizados_il`, reemplazando admin queries directas.
- #74: existe schema drift de `formatos_finalizados_il.path_formato` entre remoto y migraciones locales.
- #75: `ods_import_failures` queda como deuda para reemplazar warnings server-side por persistencia auditada.
- El link de la UI apunta a GitHub porque `docs/` no es ruta publica de Next. Si se necesita acceso sin permisos al repo, crear una ruta interna que sirva este markdown.

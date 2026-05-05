# Inventory de migraciones / schema drift ODS

Este documento registra drifts entre el schema remoto de Supabase y las migraciones locales relacionadas con ODS. Su objetivo es que futuros cambios de base de datos partan de una fuente versionada y no dependan de columnas que solo existen en produccion.

## Schema drifts detectados y resueltos

### formatos_finalizados_il.path_formato (PR #71 -> #74)

- Detectado: durante Tanda 1, al planear #70 `actaIdOrUrl`, se encontro que `public.formatos_finalizados_il.path_formato` existe en la base remota pero no en `supabase/migrations/`.
- Auditoria remota:
  - Tipo: `text`.
  - Nullable: si.
  - Default: `null`.
  - Indices sobre la columna: ninguno.
  - Total: 490 filas.
  - `path_formato is not null`: 490 filas.
  - `trim(path_formato) != ''`: 489 no-blank.
  - Samples: URLs reales de Google Sheets con forma `https://docs.google.com/spreadsheets/d/.../edit#gid=...`.
- Consumidores locales: `src/lib/finalization/*` y `src/lib/empresas/lifecycle-tree-server.ts`.
- Decision: alinear schema local con remoto mediante `ADD COLUMN IF NOT EXISTS`.
- Migracion: `20260504222458_align_formatos_finalizados_il_path_formato.sql`.
- No-goal: No usar en `/api/ods/importar` en este PR.
- No-goal: No usar `path_formato` como resolucion alternativa de Sheet/Drive URLs en este PR.
- No-goal: No renombrar ni dropear la columna remota.

## Schema drifts pendientes

ninguno conocido al cierre de #74.

## RPCs server-only agregados

### formato_finalizado_lookup_by_acta_ref (issue #73)

- Detectado: tras Tanda 1, `POST /api/ods/importar` resolvia `public.formatos_finalizados_il` con `createSupabaseAdminClient()` y query directa por `acta_ref`.
- Decision: encapsular el lookup en `public.formato_finalizado_lookup_by_acta_ref(p_acta_ref text)` con `security definer`, `set search_path = ''` y proyeccion acotada.
- Retorno: `jsonb` con `{ acta_ref, registro_id, payload_normalized }` o `null` si no hay match.
- Grants: `revoke execute` para `public`, `anon` y `authenticated`; `grant execute` solo para `service_role`.
- Migracion: `20260504230749_rpc_formato_finalizado_lookup_by_acta_ref.sql`.
- No-goal: No tocar `resolveArtifactActaRef` ni `public.form_finalization_requests`; ese hardening queda en el sibling #113.
- No-goal: No cambiar `/api/ods/importar`, el pipeline ni el shape externo de preview mas alla de reemplazar la lectura directa por RPC.

## Tablas de auditoria / observabilidad ODS

### ods_import_failures (issue #75)

- Detectado: `POST /api/ods/importar` registraba fallos recuperables solo en `console.warn`, invisibles fuera de logs Vercel.
- Decision: persistir fallos no-sensibles en `public.ods_import_failures` mediante RPC server-only `public.ods_record_import_failure(...)`.
- Columnas: `user_id`, `stage`, `error_message`, `error_kind`, `input_summary` y `created_at`.
- Politica no-PII: `input_summary` guarda solo metadata cerrada (`origin`, tipo de archivo, longitudes y flags); no guarda ACTA IDs raw, URLs, nombres, NITs, cedulas, filenames ni payloads.
- RLS: lectura solo para usuarios con rol `ods_telemetria_admin`; escritura append-only via `service_role`.
- Migracion: `20260505001351_ods_import_failures.sql`.
- No-goal: No crear vista admin para failures hasta tener volumen real.
- No-goal: No instrumentar warnings de `terminar`, `telemetry/*` ni `usuariosRecaCorrections` en este PR.

## Mitigaciones de seguridad ODS

### ods_motor_telemetria.actor_user_id (issue #82)

- Detectado: QA dual de #63/#64 encontro que snapshots pre-ODS con `ods_id = null` podian ser finalizados por otro operador si conocia el `telemetria_id`.
- Decision: agregar `actor_user_id` nullable a `public.ods_motor_telemetria` y validar ownership en las RPCs `ods_motor_telemetria_record` y `ods_motor_telemetria_finalize`.
- Compatibilidad: filas legacy con `actor_user_id = null` siguen finalizando sin validar actor; no hay backfill retroactivo.
- Rolling deploy: callers que aun no envian `p_actor_user_id` siguen funcionando porque el parametro nuevo tiene `default null`.
- Migracion: `20260505005954_ods_motor_telemetria_actor_user_id.sql`.
- No-goal: No exponer `actor_user_id` ni filtros por actor en `/hub/admin/ods-telemetria` en este PR.
- No-goal: No modificar RLS, comparador SQL ni otros RPCs de telemetria.

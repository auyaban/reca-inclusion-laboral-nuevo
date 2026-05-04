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

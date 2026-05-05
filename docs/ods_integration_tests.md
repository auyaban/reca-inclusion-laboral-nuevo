# Integration tests ODS

Este documento registra la cobertura integration gated de los RPCs y contratos ODS que dependen de Supabase real. Los tests conviven con unit tests: los unit tests siguen cubriendo transformaciones TS, UI y mocks; estos integration tests validan firmas, grants, RLS, constraints y envelopes contra una base Supabase con las migraciones aplicadas.

## Matriz RPC / contrato

| RPC o contrato | Archivo | Cobertura |
|---|---|---|
| `ods_insert_atomic` | `src/lib/ods/odsInsertAtomic.integration.test.ts` | Inserta ODS con cedula nueva, ignora cedulas existentes sin duplicar `usuarios_reca`, preserva agregados `fecha_ingreso`, `cargo_servicio`, `tipo_contrato` en `ods`, mantiene idempotencia por `session_id`. |
| `formato_finalizado_lookup_by_acta_ref` | `src/lib/ods/formatoFinalizadoLookup.integration.test.ts` | Service role retorna `{ acta_ref, registro_id, payload_normalized }`, acta inexistente retorna `null`, anon/authenticated sin grant quedan denegados. |
| `form_finalization_request_lookup_by_artifact` | `src/lib/ods/formFinalizationRequestLookup.integration.test.ts` | Service role resuelve `google_sheet` y `google_drive_file`, kind invalido y artifact inexistente retornan `{ rows: [] }`, anon queda denegado. |
| `ods_record_import_failure` | `src/lib/ods/importFailures.integration.test.ts` | Service role inserta fila y retorna `{ id, created_at }`, anon/authenticated sin grant quedan denegados, SELECT queda bloqueado por RLS salvo rol `ods_telemetria_admin`. |
| `ods_motor_telemetria_record` | `src/lib/ods/telemetry/telemetry.integration.test.ts`, `src/lib/ods/telemetry/importSnapshot.integration.test.ts`, `src/lib/ods/telemetry/actorUserId.integration.test.ts`, `src/lib/ods/telemetry/envelopeCodes.integration.test.ts` | `created`, `deduped`, shape persistida de snapshots import, no-ACTA sin idempotency key, permisos/RLS, `actor_mismatch`, `already_finalized`, `ods_id_mismatch`, early envelopes `invalid_origin`, `invalid_confidence`, `invalid_payload`, `ods_not_found`. |
| `ods_motor_telemetria_finalize` | `src/lib/ods/telemetry/telemetry.integration.test.ts`, `src/lib/ods/telemetry/terminarSnapshot.integration.test.ts`, `src/lib/ods/telemetry/actorUserId.integration.test.ts`, `src/lib/ods/telemetry/envelopeCodes.integration.test.ts` | `finalized`, `mismatch_fields`, link pre-ODS a ODS real, `ods_not_found`, `already_finalized`, `actor_mismatch`, `ods_id_mismatch`, `invalid_payload`, `not_found`. |
| `formatos_finalizados_il.path_formato` drift | `src/lib/ods/pathFormatoDrift.test.ts` | Contrato textual de migracion idempotente y integration remote `select("path_formato").limit(0)`. No es RPC. |

## Tests de telemetria complementarios

| Archivo | Proposito |
|---|---|
| `src/lib/ods/telemetry/telemetry.integration.test.ts` | Base de schema/RPC telemetry: record, dedupe, finalize, RLS y parity TS/SQL para `mismatch_fields`. |
| `src/lib/ods/telemetry/importSnapshot.integration.test.ts` | Helper TS del path import: idempotency key, shape persistida y dedupe por ACTA/origen. |
| `src/lib/ods/telemetry/terminarSnapshot.integration.test.ts` | Helper TS de `POST /api/ods/terminar`: import finalize, manual record+finalize y mitigacion cross-actor. |
| `src/lib/ods/telemetry/actorUserId.integration.test.ts` | Mitigacion #82: mismo actor, actor distinto, legacy `actor_user_id null`, dedupe actor mismatch y caller transicional sin actor. |
| `src/lib/ods/telemetry/envelopeCodes.integration.test.ts` | Gaps #108: early envelopes y guards post-link de `record`/`finalize`. |

## Env vars

Requeridas para que corran los integration tests contra Supabase real:

- `SUPABASE_TEST_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Opcionales:

- `SUPABASE_TEST_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: permite verificar denegacion anon.
- `SUPABASE_TEST_NON_ADMIN_JWT`: permite verificar denegacion de usuario autenticado sin rol admin.
- `SUPABASE_TEST_TELEMETRIA_ADMIN_JWT`: permite verificar lectura con rol `ods_telemetria_admin`.

Si faltan las env vars requeridas, los bloques `describe.runIf(...)` quedan skipped. Eso es intencional: no se agrega infraestructura CI para correr integration tests en este PR.

## Comandos

Suite ODS completa:

```powershell
npm run test -- src/lib/ods
```

Suite telemetry:

```powershell
npm run test -- src/lib/ods/telemetry
```

Archivo especifico:

```powershell
npm run test -- src/lib/ods/telemetry/envelopeCodes.integration.test.ts
```

En PowerShell, para cargar `.env.local` en la sesion antes de ejecutar:

```powershell
Get-Content .env.local | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim().Trim('"'), 'Process')
  }
}
```

## Politica

Todo RPC ODS server-only nuevo debe nacer con integration test gated que cubra:

- service role en path feliz;
- permisos anon/authenticated cuando aplique;
- shape de retorno o envelope codes relevantes;
- cleanup de fixtures remotos;
- contrato textual de grants/RLS/security definer cuando el RPC nace por migracion.

Los helpers SQL puros sin dependencia de schema, como `canonical_text`, `numeric_value`, `normalized_value`, `values_equal` y `mismatch_fields`, no requieren integration tests propios mientras el parity test TS/SQL de `mismatch_fields` siga cubriendo el contrato observable. El envelope `dedupe_conflict` de `ods_motor_telemetria_record` queda fuera por ser recovery de carrera `unique_violation`; probarlo de forma deterministica requeriria infraestructura concurrente fragil y no aporta suficiente valor frente a los guards deterministas cubiertos.

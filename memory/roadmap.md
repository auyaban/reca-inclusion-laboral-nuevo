---
name: Roadmap de implementacion
description: Frentes activos, decisiones abiertas y siguiente orden del repo
type: roadmap
updated: 2026-04-29
---

## Regla operativa

- Este archivo guarda solo frentes abiertos, decisiones activas y siguiente orden.
- El backlog vivo, QA abierta y decisiones amplias viven en Notion (`20`, `30`, `40`).
- No registrar aqui changelog de PRs, previews viejos ni QA cerrada.

## Estado del proyecto

### Formularios

- Los formularios activos ya estan migrados; ver `forms_catalog.md` para estado real por formulario.
- `Evaluacion` sigue en preview y publica solo Sheet; no genera PDF por decision de producto.
- `Interprete LSC` y `Seguimientos` estan migrados y no tienen frente especial abierto.

### Drafts, finalizacion y prewarm

- La base shared de drafts/finalizacion ya protege contra duplicados por identidad y contra cleanup destructivo de Sheets publicados o en publicacion.
- Prewarm y finalizacion segura completaron Fases 0-7:
  - baseline reproducible;
  - rename async fuera del path critico;
  - claim atomico por `identity_key`;
  - delete/cleanup seguro;
  - hint canonico server-side con caps;
  - piloto temprano de `presentacion`;
  - reuse confiable con `templateRevision`/`validatedAt`;
  - text review directo/paralelo;
  - cold path de Google Sheets optimizado;
  - cache de text review en `external_artifacts` para retries consistentes.
- Decision vigente: dejar correr una semana antes de Fase 8 para medir con datos reales.

### Borradores

- El hub elimina optimistamente y luego soft-deletea remoto.
- Cleanup de Drive queda trazable como `trashed`, `skipped`, `pending` o `failed`.
- Existe UI admin minima en `/hub/admin/borradores` para `aaron_vercel`: listar cleanup pendiente/fallido, reintentar trash y purgar soft-deleted resueltos.
- No hay queue ni cron; se reevalua solo si aparece volumen o falla recurrente.

### Visita fallida

- Implementada localmente en long forms estandar con presets/optionalidad segun formulario.
- `presentacion` y `sensibilizacion` no muestran CTA visible por decision de producto.
- Pendiente: QA manual del lote completo antes de promoverlo o extenderlo a `interprete-lsc`.
- `condiciones-vacante` queda congelado hasta revision con profesional RECA.

### Robustez de asistentes

- Riesgo abierto en `evaluacion`: si el catalogo de profesionales no carga antes del submit, `asistentes[0].cargo` puede llegar vacio y el server rechaza.
- Opciones pendientes: robustecer `ensureEvaluacionBaseAsistentes`, hacer cargo editable/requerido cuando falte, o bloquear submit hasta que cargue el catalogo.

### Expansion v2

- E0 Roles completada: permisos multiples con `profesional_roles`, rol `inclusion_empresas_admin`, helpers server/client, `GET /api/auth/me` y migracion remota verificada.
- E1 Shell + sidebar implementada localmente: layout persistente en `/hub`, sidebar colapsable, borradores conservados por query param y roles iniciales sin flicker.
- E2A Empresas backoffice completada post-QA: `/hub/empresas` es role-aware; admins con `inclusion_empresas_admin` tienen home gerencial, listado, crear, editar, soft delete y actividad reciente.
- E2B Profesionales gerencia cerrada post-QA local: Profesionales queda activo para admins con CRUD, acceso Auth, roles de Inclusión, reset de contraseña temporal, soft delete/restauración, auditoría y defensas server-side para autoeliminación, vínculos Auth duplicados y APIs con contraseña temporal; Asesores/Gestores/Interpretes siguen visibles deshabilitados.
- Siguiente frente de expansion: plan de E3 Empresas profesional + ciclo de vida.

## Siguiente orden recomendado

1. Planear E3 Empresas profesional + ciclo de vida: experiencia para `inclusion_empresas_profesional`, reclamar/soltar, notas y estados propios.
2. Esperar una semana de uso tras Fase 7.
3. Correr `npm run finalization:baseline -- --days 30 --limit 100` y comparar por `prewarm_status`: `reused_ready`, `inline_cold`, `inline_after_stale`, `inline_after_busy`.
4. Planear Fase 8 con datos: decidir si `seleccion` y `contratacion` ameritan setup/prewarm temprano propio o si basta el contrato canonico + cold path optimizado.
5. Mantener QA de `visita fallida`, borradores y autosave como frentes separados del rollout de prewarm.

## Decisiones activas

- No agregar TTL al cache `failed` de text review hasta medir; por ahora pesa mas la consistencia Sheet/DB en retries que reintentar OpenAI.
- Mantener el batch separado de protected ranges cuando hay `templateBlockInsertions`; ahorra menos, pero preserva orden defensivo con merges/alturas/protecciones.
- Fase 8 no debe implementar formularios por inercia: cada formulario necesita beneficio esperado claro y medible.
- El permiso admin de Empresas es `inclusion_empresas_admin`; no usar `is_admin` ni columna unica `rol` para este modulo.
- E2A/E2B mantienen mutaciones + eventos como best-effort en API server-side; decidir RPC transaccional o reconciliador al diseñar E3/E2C.
- E3 debe ampliar el `CHECK` de `empresa_eventos.tipo` antes de agregar reclamos, soltados, quitadas o notas.
- Roles user-facing de Inclusión: `inclusion_empresas_admin` se muestra como `Admin Inclusión`; `inclusion_empresas_profesional` se muestra como `Profesional Inclusión`.
- Solo `aaron_vercel` puede asignar o quitar `Admin Inclusión`; cualquier `Admin Inclusión` puede soft-deletear otro admin sin editar roles.
- Ningún admin puede autoeliminarse; y solo `aaron_vercel` podría eliminar el perfil super-admin. En la práctica, `aaron_vercel` queda protegido por el guard de autoeliminación para evitar lock-out.
- Perfiles con acceso Auth requieren `correo_profesional`, `usuario_login` y al menos un rol; perfiles catálogo no tienen roles ni login.
- Antes de habilitar acceso Auth se valida que el usuario Auth encontrado por correo no esté vinculado a otro profesional activo.
- Al soft-deletear un profesional se liberan sus empresas asignadas; restaurar no devuelve roles ni acceso Auth.
- Supabase Admin API permite ban/update de Auth, pero no revocación universal por `user_id` en este flujo; access tokens existentes expiran por TTL.
- Un usuario con contraseña temporal no puede usar APIs protegidas por `requireAppRole` hasta completar `/auth/cambiar-contrasena-temporal`.

## Completado

- Migracion base de long forms, drafts, finalizacion y prewarm.
- Fases 0-7 del proyecto de prewarm/finalizacion segura.
- Expansion v2 E0 Roles.
- Expansion v2 E1 Shell + sidebar.
- Expansion v2 E2A Empresas backoffice.
- Expansion v2 E2B Profesionales gerencia.

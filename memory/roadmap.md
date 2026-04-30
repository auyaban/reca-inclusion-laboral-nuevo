---
name: Roadmap de implementacion
description: Frentes activos, decisiones abiertas y siguiente orden del repo
type: roadmap
updated: 2026-04-30
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
- E2B Profesionales gerencia cerrada post-QA local: Profesionales queda activo para admins con CRUD, acceso Auth, roles de Inclusión, reset de contraseña temporal, soft delete/restauración, auditoría y defensas server-side para autoeliminación, vínculos Auth duplicados y APIs con contraseña temporal.
- QA manual Fases 1/2 cerradas: `Nuevo profesional` cubierto, ortografía visible de Empresas corregida, normalización server-side de escrituras nuevas y migración remota conservadora para variantes seguras de `estado`/`caja_compensacion`.
- QA manual Fase 3 implementada y con la mayor parte del checklist verde: formulario Empresa usa `Zona Compensar`, contactos estructurados, asesor con correo autocompletado y escritura legacy alineada; Profesionales normaliza nombre, correo RECA, login generado y programa cerrado.
- QA manual Fase 3/3.1 cerrada para avanzar: crear/editar Empresa muestra errores visibles, exige datos operativos completos, permite eliminar contactos adicionales, normaliza teléfonos, desactiva autocomplete intrusivo y mejora la respuesta del filtro de Profesionales. Hallazgos menores pasan a Fase 4.
- QA manual Fase 4 implementada localmente: sorting reusable por headers en Empresas y Profesionales, ciudad con ortografía conservadora, actividad reciente más útil, guardado de observaciones corregido y primer contacto readonly alineado.
- QA manual Fase 5 validada en preview y QA final de código cerrado localmente: `/hub/empresas*` usa capa visual backoffice reusable con contraste alto, acentos RECA/legacy, headers, cards, badges, feedback, tablas coherentes con el hub de formularios y placeholders guía en campos editables. El polish final corrige mensaje duplicado de contacto, export reusable de `SortableTableHeader`, detalle de eliminación y hard gate para que sólo `inclusion_empresas_admin` vea el módulo en producción inicial.
- Expansion v2 Fases 1-5 ya salieron a producción para uso inicial de gerencia en Empresas y Profesionales.
- E2C Catálogos simples implementada con migración remota aplicada y QA de código cerrado: Asesores, Gestores e Intérpretes quedan activos para admins con CRUD server-side, soft delete, restore, búsqueda, paginación y sorting reusable.
- E2D Performance y Egress queda cerrado localmente antes de E3: feedback visual y compatibilidad legacy, listado liviano, catálogos por RPC con migración remota alineada, asesores activos, búsqueda reducida, auditoría de consumidores browser/directos y filtros `deleted_at` en autocomplete/lookups. `pg_trgm` y `count: "exact"` siguen diferidos porque las mediciones no superaron umbrales.
- E3 Empresas profesional + ciclo de vida queda planificada por capas en `docs/expansion_v2_e3_profesional_ciclo_vida_plan.md`; E3.1, E3.2 y E3.3 ya salieron a produccion. E3.5a queda cerrada como inventario read-only: `formatos_finalizados_il.payload_normalized` tiene base suficiente para motor conservador del arbol, con gaps documentados para seguimiento y datos historicos incompletos.

## Siguiente orden recomendado

1. Planear E3.5b en worktree `codex/e3-profesionales-empresas`: motor read-only conservador del arbol de ciclo de vida.
2. Definir contrato tipado para empresa, etapas, ramas de perfil, ramas de persona, evidencia sin clasificar y warnings de calidad.
3. Planear E3.5c: UI expandible simple antes de intentar el arbol visual rico.
4. Planear E3.4 con Aaron: calendario interno, proyecciones semanales y visibilidad metrica para gerencia.
5. Reabrir `pg_trgm` solo si la medicion post-despliegue mantiene busquedas >1.5 s.
6. Esperar una semana de uso tras Fase 7.
7. Correr `npm run finalization:baseline -- --days 30 --limit 100` y comparar por `prewarm_status`: `reused_ready`, `inline_cold`, `inline_after_stale`, `inline_after_busy`.
8. Planear Fase 8 con datos: decidir si `seleccion` y `contratacion` ameritan setup/prewarm temprano propio o si basta el contrato canonico + cold path optimizado.
9. Mantener QA de `visita fallida`, borradores y autosave como frentes separados del rollout de prewarm.

## Decisiones activas

- No agregar TTL al cache `failed` de text review hasta medir; por ahora pesa mas la consistencia Sheet/DB en retries que reintentar OpenAI.
- Mantener el batch separado de protected ranges cuando hay `templateBlockInsertions`; ahorra menos, pero preserva orden defensivo con merges/alturas/protecciones.
- Fase 8 no debe implementar formularios por inercia: cada formulario necesita beneficio esperado claro y medible.
- El permiso admin de Empresas es `inclusion_empresas_admin`; no usar `is_admin` ni columna unica `rol` para este modulo.
- E2A/E2B mantienen mutaciones + eventos como best-effort en API server-side; decidir RPC transaccional o reconciliador al diseñar E3/E2C.
- E3 debe ampliar el `CHECK` de `empresa_eventos.tipo` antes de agregar reclamos, soltados, quitadas o notas.
- E3 resuelve la atomicidad con RPCs transaccionales server-only: funciones `security invoker`, sin `execute` para `anon` ni `authenticated`, llamadas solo desde API routes con service role.
- E3.3 cuenta empresas nuevas solo desde `E3_3_ASSIGNMENT_ALERTS_START_AT`; si falta en local/test, el fallback evita contar legacy como nuevo.
- En E3.3 la busqueda global de empresas vive dentro de `Mis empresas`, requiere minimo 3 caracteres y busca por nombre/NIT para controlar performance y egress.
- Profesionales ven detalle completo read-only de empresas activas, pero no pueden editar datos maestros; solo pueden asignarse/tomar control/liberar con comentario y agregar notas explicitas.
- Solo una nota explicita posterior a la asignacion/toma elimina la alerta de empresa nueva; comentarios de tomar/liberar no cuentan como nota.
- E3.5a define el ciclo de vida como arbol operativo, no lista lineal: `condiciones-vacante` crea una rama de perfil/cargo; desde `seleccion` en adelante la cedula es la llave principal de persona.
- En ciclo de vida, `Compensar` agrega evaluacion de accesibilidad, sensibilizacion, induccion organizacional y 6 seguimientos; `No Compensar` no tiene esas etapas diferenciales y espera 3 seguimientos.
- Seleccion y contratacion pueden ser grupales: una acta puede crear o actualizar varias ramas por cedula. Seguimientos no son grupales: una acta corresponde a una persona.
- Personas seleccionadas sin contratacion registrada quedan activas por 6 meses y luego pasan a ramas archivadas; no se borran.
- El ciclo de vida read-only no mezcla notas globales dentro del arbol. Notas y bitacora siguen como secciones separadas hasta tener metadata contextual por nodo.
- Evidencia que pertenece a la empresa pero no se puede clasificar con confianza se muestra como `Evidencia sin clasificar`, no se oculta ni se asigna por matching difuso agresivo.
- E3.5b debe mapear tipo de acta desde `nombre_formato`, porque `formatos_finalizados_il` no tiene `form_slug`; variantes historicas como `Revision Condicion`, `Proceso de Seleccion Incluyente` y nombres sin tilde deben normalizarse.
- E3.5b puede usar `nit_empresa` como llave primaria de empresa y `nombre_empresa` como fallback con warning; `cargo_objetivo` crea perfiles, pero no es llave fuerte para personas.
- E3.5b puede clasificar seguimientos por `seguimiento_numero` cuando exista y fecha como fallback; hoy solo hay muestra de seguimientos #1 a #3.
- Escrituras nuevas de Empresas se normalizan en API antes de Supabase: trim de invisibles, colapso de espacios, capitalización principal, NIT sin puntos/espacios y catalogos canonicos. Valores historicos ambiguos quedan fuera de saneamiento automatico.
- Fase 3 mantiene `empresas` en columnas legacy, pero serializa contactos con `;` conservando posiciones entre nombre, cargo, telefono y correo.
- `Zona Compensar` queda como dropdown cerrado desde valores unicos actuales en Supabase; no permite texto libre.
- Quickfix de asesor solo escribe `asesor` y `correo_asesor` en la empresa; nunca crea ni modifica la tabla `asesores`.
- Fase 3.1 exige que Empresa no se pueda guardar sin nombre, NIT, dirección, ciudad, sede, Zona Compensar, gestión, estado, responsable completo, datos Compensar completos y profesional asignado.
- Contactos adicionales de Empresa son opcionales, pero cada fila creada debe tener minimo nombre y cargo; telefono y correo pueden quedar vacios. Debe existir accion para eliminar filas adicionales.
- Teléfonos de Empresa deben guardarse solo con dígitos, máximo 10, eliminando espacios y rechazando signos/letras.
- Fase 4 deja sorting por headers como patrón reusable para tablas de backoffice. Hoy aplica a Empresas y Profesionales; Asesores/Gestores/Intérpretes lo reutilizarán cuando existan sus paneles.
- Fase 4 mantiene columnas fijas; reacomodar columnas queda fuera.
- Ciudad se normaliza con mapa ortográfico conservador basado en valores únicos actuales; no se inventan correcciones ambiguas.
- Fase 5 fija la dirección visual **RECA + acentos legacy** para `/hub/empresas*`: cards compactas, headers morados/teal, badges de alto contraste, feedback explícito y texto secundario mínimo `gray-600/700`.
- Los campos editables del backoffice deben usar placeholders de ejemplo como ayuda visual; esos textos no sustituyen validaciones ni se persisten como dato.
- E2C muestra `localidad` en Asesores como campo opcional porque existe en Supabase y puede servir a gerencia.
- E2C no impone `nombre` único en Gestores; agrega `id uuid` como llave estable para editar/eliminar sin depender del texto visible.
- E2C aplica soft delete con `deleted_at` en Asesores, Gestores e Intérpretes y los catálogos públicos existentes devuelven solo activos.
- E2C no crea Auth, roles, contraseñas ni importación Excel; son CRUDs gerenciales simples.
- E2D ya no bloquea E3 a nivel de código local; el HAR real de gerencia queda como validación operativa posterior.
- E2D no optimiza finalización de actas; si el baseline muestra lentitud ahí, se abre una fase separada.
- E2D debe mantener el egress proyectado del backoffice por debajo del 50% del free tier de Supabase como margen operativo.
- E2D.2a mantiene creación de Empresas estricta, pero edición de empresas existentes opera en compatibilidad legacy: no bloquea por campos históricos incompletos, contactos antiguos, teléfonos largos o correos antiguos, y preserva separadores legacy para no perder múltiples teléfonos/correos en un mismo campo; cambio de estado sigue exigiendo comentario.
- E2D.3/E2D.4 mantienen `count: "exact"` y difieren `pg_trgm`: la medición read-only mostró reducción suficiente con payload liviano, filtros por RPC, búsqueda limitada a nombre/NIT/ciudad y consumidores browser acotados. Autocomplete/lookups de empresa excluyen soft-deleted.
- Profesionales exige nombre de 2 a 5 palabras, correo RECA con dominio fijo `@recacolombia.org`, `usuario_login` generado por nombre/apellido con deduplicacion y programa cerrado `Inclusión Laboral`.
- Roles user-facing de Inclusión: `inclusion_empresas_admin` se muestra como `Admin Inclusión`; `inclusion_empresas_profesional` se muestra como `Profesional Inclusión`.
- Solo `aaron_vercel` puede asignar o quitar `Admin Inclusión`; cualquier `Admin Inclusión` puede soft-deletear otro admin sin editar roles.
- Ningun admin puede autoeliminarse; y solo `aaron_vercel` podria eliminar el perfil super-admin. En la practica, `aaron_vercel` queda protegido por el guard de autoeliminacion para evitar lock-out.
- Perfiles con acceso Auth requieren `correo_profesional` y al menos un rol; `usuario_login` lo genera el servidor. Perfiles catalogo no tienen roles ni acceso Auth.
- Antes de habilitar acceso Auth se valida que el usuario Auth encontrado por correo no este vinculado a otro profesional activo.
- Al soft-deletear un profesional se liberan sus empresas asignadas; restaurar no devuelve roles ni acceso Auth.
- Supabase Admin API permite ban/update de Auth, pero no revocacion universal por `user_id` en este flujo; access tokens existentes expiran por TTL.
- Un usuario con contraseña temporal no puede usar APIs protegidas por `requireAppRole` hasta completar `/auth/cambiar-contrasena-temporal`.

## Completado

- Migracion base de long forms, drafts, finalizacion y prewarm.
- Fases 0-7 del proyecto de prewarm/finalizacion segura.
- Expansion v2 E0 Roles.
- Expansion v2 E1 Shell + sidebar.
- Expansion v2 E2A Empresas backoffice.
- Expansion v2 E2B Profesionales gerencia.
- Expansion v2 QA manual Fases 1/2.
- Expansion v2 QA manual Fase 3.
- Expansion v2 QA manual Fase 3.1.
- Expansion v2 QA manual Fase 4 local.
- Expansion v2 QA manual Fase 5 local.
- Expansion v2 QA final de código Fases 1-5 local.
- Expansion v2 E2C Catálogos simples local.
- Expansion v2 E2D Performance y Egress local.

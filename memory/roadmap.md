---
name: Roadmap de implementacion
description: Frentes activos, decisiones abiertas y siguiente orden del repo
type: roadmap
updated: 2026-05-02
---

## Regla operativa

- Este archivo guarda solo frentes abiertos, decisiones activas y siguiente orden.
- El backlog vivo, QA abierta y decisiones amplias viven en Notion (`20`, `30`, `40`).
- No registrar aqui changelog de PRs, previews viejos ni QA cerrada.

## Estado del proyecto

### Formularios

- Los formularios activos ya estan migrados; ver `forms_catalog.md` para estado real por formulario.
- `Evaluacion` sigue en preview y publica solo Sheet; no genera PDF por decision de producto.
- `Interprete LSC` esta migrado y sin frente especial abierto.
- `Seguimientos` restructure UX (F0-F4) completado: permisos por rol Inclusión, gate ampliado con asignación manual de empresa, case overview con timeline, base stage summary plegable, copy-forward por grupos, CTA "Confirmar ficha inicial", botón "Finalizar Seguimiento N", modal PDF al cerrar followup. Ver `forms_catalog.md`.

- Seguimientos v1 en milestone GitHub `Cerrar Seguimientos v1`: F1 #53 bugs latentes criticos cerrado; siguiente F2 #54 UX consistency finalizacion, luego F3 #55 Empresas cleanup y F4 #56 polish.

### ODS

- Modulo ya migrado y vivo (wizard 5 secciones + importar acta 4 niveles + motor de codigos). Inventario canonico: `docs/ods_migration_inventory.md`.
- Frente activo: milestone GitHub `ODS - bug fixes y medicion del motor` (PO de ODS distinto al de Seguimientos).
- Tanda 1 cerrada via PR #71 (rebase merge, commit `f94eb95` en `main`):
  - #67 nombre_empresa via upload PDF: causa raiz RLS de `formatos_finalizados_il`. Fix: admin client acotado al lookup por `acta_ref` dentro del role-gate, resolucion en route con `preResolvedFinalizedRecord` pre-resuelto al pipeline (no inyectar admin al closure de deps), fallback catalogo de empresas con proyeccion minima + `.limit(500)` cuando no hay hints, propagacion de FK D6 (`registro_id` viaja en `PipelineResult`, store, wizard, payload, INSERT como UUID o `null`).
  - #68 cleanup Nivel 1 metadata `/RECA_Data`: confirmado que ningun PDF actual lo embebe; eliminado del pipeline, route, `parsers/index.ts`, `pdfMetadata.ts` deleted, inventario §2.D3/§4.1/§4.7 actualizado.
  - #70 path directo `actaIdOrUrl`: branch separado, parser DRY `actaIdParser.ts` (con `extractPdfActaId` como wrapper de compat), errores 400 (no parsea) / 404 (no match) / 422 (payload nulo), validacion cross-user de Google file ID por igualdad exacta (no substring), `import_resolution.reason = "direct_input_lookup"`.
- Tanda 2 en progreso: epic #69 telemetria silenciosa.
  - #61 schema BD cerrado via PR #76 (commit 9a49f7b): tabla `ods_motor_telemetria` con FK ods_id SET NULL e idempotency_key UNIQUE partial; RPCs `record/finalize` security definer set search_path = '' con envelope jsonb (`record` acepta `p_ods_id default null` para snapshot pre-ODS, `finalize` enlaza ods_id via coalesce); rol nuevo `ods_telemetria_admin` agregado a `profesional_roles_role_check` y `APP_ROLES`, seedeado para aaron_vercel; policy SELECT siguiendo patron e0_roles_ods.sql; comparador SQL fuente de verdad + mirror TS preview-only con parity test obligatorio entre fixtures comunes. Migracion remota aplicada exitosa.
  - #62 snapshot motor en path de import cerrado via PR #79 (commit c905ebc): instrumentacion best-effort en `/api/ods/importar` con helpers `src/lib/ods/telemetry/gate.ts` y `importSnapshot.ts`, gate por env var `ODS_TELEMETRY_START_AT` (ausente/futura/invalida desactiva), idempotency_key SHA-256 server-side de `v1|import_origin|acta_ref|actor_user_id` (null para PDF Nivel 4 / Excel sin ACTA ID), `motor_suggestion` persiste primary `suggestions[0]` + `alternatives` capadas a `MAX_ALTERNATIVES=5` como metadata para #65, wrapper local en route propaga `telemetria_id` solo cuando RPC retorna `created`/`deduped`, store/wizard retienen el id (limpio en `reset()` explicito) para #64.
  - #63 snapshot motor en path manual + #64 captura completa de campos + calculo de mismatch_fields cerrados unificados via PR #81 (commit 98d6527). Helpers `terminarSnapshot.ts` y `buildFinalValue.ts` orquestan: path import (con `telemetria_id` del wizard) -> finalize directo; path manual (sin id) -> carga catalogos server-side (tarifas vigentes con LIMIT 500, empresa por NIT con maybeSingle), corre `suggestServiceFromAnalysis`, llama record manual con `p_idempotency_key=null`, luego finalize. `valor_base` derivado server-side de `tarifas` con vigencia D7 (`vigente_desde IS NULL OR <= fecha; vigente_hasta IS NULL OR >= fecha; ORDER BY vigente_desde DESC NULLS LAST LIMIT 1`). Telemetria en `after()` separado del de Sheets; ambos fallan aislados. `actorUserId` enhebrado por toda la cadena TS como preparacion para mitigacion futura (deuda registrada en #82).
  - Siguiente: #65 vista admin `/hub/admin/ods-telemetria`. Despues #66 doc.
  - Owner configurara `ODS_TELEMETRY_START_AT` en Vercel Production cuando epic completo (probablemente al cerrar #66).
- Hotfix P0 #92 cerrado via PR #94 (commit 4ef316e): reportado por jancam que en Nivel 2 (lookup `formatos_finalizados_il`) se populaba `nombre_profesional` con el responsable de empresa en vez del primer asistente. Causa raiz: `pipeline.ts` tomaba `payload.nombre_profesional` directo sin re-derivar. Fix: helper compartido `deriveNombreProfesionalFromActaSources` en `parsers/common.ts` con prioridad asistentes -> candidatos_profesional -> profesional_asignado/reca/asesor -> nombre_profesional, soporta arrays de strings (shape real) y de objetos `{nombre}`. Volumen del bug confirmado en produccion: 281/453 filas. Nivel 4 sin cambios.
- Telemetria mide motor vs ODS final sin que el operador note el cambio. Visibilidad solo para `aaron_vercel`. Sin backfill.
- Mejoras radar (no en milestone): mejoras a intepretes cross-modulo (`payload_normalized` + lectura ODS) y ODS sombra automatica al finalizar `payload_normalized`. Atacar despues del motor confiable.
- Follow-ups acordados en plan v2 (pendientes de abrir como issues `ods` + `tech-debt`): RPC `security definer formato_finalizado_lookup_by_acta_ref(acta_ref text)` para reemplazar admin queries directas, schema-drift `formatos_finalizados_il.path_formato` (existe en remoto, falta en migraciones locales), telemetry `ods_import_failures` para reemplazar `console.warn` server-side por persistencia auditada.

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
- E3 Empresas profesional + ciclo de vida queda planificada por capas en `docs/expansion_v2_e3_profesional_ciclo_vida_plan.md`; E3.1, E3.2, E3.3, E3.4b y E3.5b/E3.5c/E3.5d ya salieron a produccion. E3.4a/E3.4a.2 cerraron inventario y contrato operativo; E3.4b dejo listo el modelo/API server-side de proyecciones con catalogo versionado, tabla de agenda, RPCs transaccionales y linea vinculada de interprete.

## Decisiones activas

### Seguimientos restructure

- **Permisos**: scope abierto a todo rol Inclusión (`inclusion_empresas_admin`, `inclusion_empresas_profesional`). `ods_operador` rechazado con 403.
- **Gate ampliado**: si el vinculado existe en `usuarios_reca` pero sin `empresa_nit`, se muestra paso explícito de asignación manual de empresa con autocomplete (reusa `useEmpresaSearch` de E3.3). La asignación persiste en `usuarios_reca`.
- **Case overview**: reemplaza sidebar de stages con timeline visual (✓ · ▶ · ○ · 🔒) + ficha inicial plegable. Timeline consume `getSeguimientosStageRules(companyType)` (todos los stages), futuros visibles pero no clickables.
- **Copy-forward**: banda superior con checkboxes por grupo (Modalidad y tipo de apoyo, Evaluaciones) default ON, botón "Aplicar prellenado" explícito. Delega al motor `copySeguimientosFollowupIntoEmptyFields` (into-empty-only).
- **Editor remodelado**: "Finalizar Seguimiento N" reemplaza "Guardar seguimiento en Google Sheets". CTA "Confirmar ficha inicial y abrir Seguimiento X" en primer ingreso, disabled hasta cumplir minimos + contenido significativo; `isCompleted` conserva el umbral del 90% para badges, proteccion historica y PDF.
- **Modal PDF al cerrar followup**: reemplaza toast post-followup. Opción filtrada a `base_plus_followup_${N}`. Lee `persistedFollowups` (A1).
- **Override desde summary**: "Reabrir ficha inicial" dispara dialog de confirmación existente (no bypass).
- **Drafts existentes**: se hidratan en la nueva UX sin pérdida (el motor no cambia).

## Siguiente orden recomendado

1. Para Seguimientos, esperar brief PO y arrancar F2 #54 UX consistency finalizacion.
2. Planear E3.4c: UI calendario profesional con vistas mensual/semanal/diaria sobre la base server-side de proyecciones ya desplegada.
3. Disenar fase posterior del ciclo de vida rico solo despues de validar E3.5d con datos reales.
4. Reabrir ciclo de vida solo si QA/uso real detecta timelines demasiado largos; el siguiente fix esperado seria `ver mas`/paginacion por rama.
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
- E3.4a define que una proyeccion es un solo servicio/proceso asociado a empresa. La UI profesional no debe exponer codigos contables crudos; debe usar nombres operativos mapeables a tarifas.
- La matriz de servicios de E3.4 puede vivir en Supabase como tabla/config versionada, pero no sera editable por gerencia hasta tener validaciones, auditoria y reglas estables.
- E3.4b mantiene Google Calendar, Google Maps, conciliacion automatica y metricas gerenciales fuera de alcance inicial.
- E3.4b guarda el catalogo de servicios proyectables en Supabase mediante migracion versionada, no en UI editable. La edicion por gerencia requiere fase futura con auditoria y validaciones.
- E3.4b crea/actualiza/cancela proyecciones con RPCs transaccionales service-role-only para preservar la linea vinculada de `interpreter_service`.
- E3.4b mantiene `Cache-Control: private, no-store` en APIs; el catalogo usa cache server-side de TTL corto porque no varia por usuario operativo.
- E3.4b no agrega `active`/`deleted_at` a servicios todavia; `proyectable=false` excluye del calendario inicial, y deprecacion historica queda para una fase con auditoria.
- E3.4b no agrega bitacora de proyecciones; cambios/auditoria se reabren en E3.4d o metricas gerenciales.
- E3.4c debe revisar double booking, rangos de fecha, retencion de canceladas, posible indice `(estado, inicio_at)` y si el detalle por UUID debe mostrar lineas hijas de interprete.
- E3.4a.2 separa campos de calendario de campos de acta: `duracion_minutos` vive en proyecciones, `cantidad_empresas` queda fuera porque siempre es 1, y `projection_id` solo se copia si el formulario nace desde calendario.
- E3.4a.2 prohibe buscar o actualizar proyecciones durante finalizacion; la conciliacion se hace despues para no aumentar el tiempo critico de publicar actas.
- E3.4a.2 modela interpretes como segunda linea vinculada: servicios con personas sugieren `requires_interpreter`, otros servicios pueden pedirlo como excepcion justificada, y se crea `interpreter_service` con `parent_projection_id`.
- En E3.4, modalidades iniciales son `presencial` y `virtual`; `todas_las_modalidades` aplica solo a `interpreter_service`.
- E3.5a define el ciclo de vida como arbol operativo, no lista lineal: `condiciones-vacante` crea una rama de perfil/cargo; desde `seleccion` en adelante la cedula es la llave principal de persona.
- En ciclo de vida, `Compensar` agrega evaluacion de accesibilidad, sensibilizacion, induccion organizacional y 6 seguimientos; `No Compensar` no tiene esas etapas diferenciales y espera 3 seguimientos.
- Seleccion y contratacion pueden ser grupales: una acta puede crear o actualizar varias ramas por cedula. Seguimientos no son grupales: una acta corresponde a una persona.
- Personas seleccionadas sin contratacion registrada quedan activas por 6 meses y luego pasan a ramas archivadas; no se borran.
- El ciclo de vida read-only no mezcla notas globales dentro del arbol. Notas y bitacora siguen como secciones separadas hasta tener metadata contextual por nodo.
- Evidencia que pertenece a la empresa pero no se puede clasificar con confianza se muestra como `Evidencia sin clasificar`, no se oculta ni se asigna por matching difuso agresivo.
- E3.5b debe mapear tipo de acta desde `nombre_formato`, porque `formatos_finalizados_il` no tiene `form_slug`; variantes historicas como `Revision Condicion`, `Proceso de Seleccion Incluyente` y nombres sin tilde deben normalizarse.
- E3.5b puede usar `nit_empresa` como llave primaria de empresa y `nombre_empresa` como fallback con warning; `cargo_objetivo` crea perfiles, pero no es llave fuerte para personas.
- E3.5b puede clasificar seguimientos por `seguimiento_numero` cuando exista y fecha como fallback; hoy solo hay muestra de seguimientos #1 a #3.
- E3.5b no expone `payload_normalized` crudo al browser; el endpoint entrega solo evidencia resumida y renderizable.
- E3.5b limita la consulta de evidencia por empresa a 250 registros. Si una empresa alcanza ese limite, se reabre con RPC/indice especifico antes de intentar UI mas pesada.
- E3.5c mantiene, por decision de producto, ciclo de vida read-only visible para cualquier `inclusion_empresas_profesional` sobre empresas activas. Antes de datos mas sensibles, acciones sobre ramas o UI rica, reevaluar scoping por empresas asignadas/tomadas o gerencia.
- E3.5c no agrega feature flag: la ruta esta role-gated, password-temp-gated y no esta en navegacion masiva. Reabrir flag si el arbol entra en produccion amplia o requiere apagado operativo independiente.
- E3.5d esta en produccion y smoke verde. Mantiene el ciclo de vida read-only y resuelve solo la lectura visual: timeline vertical, conectores CSS, ramas simples de perfiles/personas y plegables con boton/chevron. No agrega acciones sobre nodos ni mutaciones.
- `LifecycleCollapsible` vive por ahora en Empresas; extraerlo a backoffice solo si otra pantalla adopta el mismo patron.
- E3.5d no pagina ni trunca `EvidenceList` por seccion. Antes de rollout amplio, reabrir si QA detecta timelines con demasiadas personas/seguimientos o lectura lenta; el fix esperado seria `ver mas`/paginacion por rama, no bajar el limite global del motor.
- E3.5/E5 deben considerar endpoint batch/summary multiempresa y telemetria de calidad solo cuando haya UI o metricas que lo necesiten; no multiplicar llamadas `ciclo-vida` por fila.
- E3.5b mantiene extractores conservadores: si aparece `payload_schema_version` nuevo, NIT legacy con letras, empresa/evidencia sin NIT ni nombre, o variantes nuevas de cedula, se documenta y se amplian extractores con ejemplos reales; no se adivinan matches.
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
- Expansion v2 E3 Empresas profesional base y ciclo de vida read-only visual hasta E3.5d.
- Expansion v2 E3.4a inventario read-only de proyecciones, tarifas, ODS y payloads.
- Expansion v2 E3.4b modelo/API server-side de proyecciones con migracion remota aplicada.
- Seguimientos v1 F1 #53 bugs latentes criticos.

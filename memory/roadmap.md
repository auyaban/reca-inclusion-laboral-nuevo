---
name: Roadmap de implementacion
description: Frentes activos, decisiones vigentes y siguiente orden del repo. Sin changelog de PRs cerrados (vive en GitHub).
type: roadmap
updated: 2026-05-06c
---

## Regla operativa

- Este archivo guarda solo frentes abiertos, decisiones vigentes y siguiente orden.
- El changelog de PRs cerrados vive en GitHub (milestone, board, PR list). No duplicar aqui.
- Backlog vivo, QA abierta y decisiones amplias viven en Notion (`20`, `30`, `40`).
- No registrar previews viejos ni QA cerrada.

## Anclas externas

- Milestone ODS general: <https://github.com/auyaban/reca-inclusion-laboral-nuevo/milestone/2>
- Milestone Empresas General Work: <https://github.com/auyaban/reca-inclusion-laboral-nuevo/milestone/3>
- Board RECA: <https://github.com/users/auyaban/projects/2/views/2>

(Milestone `Cerrar Seguimientos v1` cerrado mayo 6, 2026; sin frente Seguimientos abierto.)

## Estado del proyecto por frente

### Formularios

- Formularios activos migrados; detalle vive en codigo.
- `evaluacion` en preview, solo publica Sheet; sin PDF por decision producto.
- `interprete-lsc` migrado, sin frente especial.
- `visita fallida` local en long forms estandar; QA manual pendiente antes de promover o extender a `interprete-lsc`. `condiciones-vacante` congelado hasta revision con profesional RECA.
- `presentacion` y `sensibilizacion` no muestran CTA por decision producto.
- Riesgo abierto en `evaluacion`: si catalogo de profesionales no carga antes del submit, `asistentes[0].cargo` puede llegar vacio y server rechaza. Opciones: robustecer `ensureEvaluacionBaseAsistentes`, hacer cargo editable/requerido cuando falte, o bloquear submit hasta que cargue catalogo.

### Seguimientos

- PO Seguimientos distinto al PO ODS.
- Restructure UX F0-F4 cubierta. Milestone v1 cerrado mayo 6, 2026 (21/21).
- F1 #53 bugs latentes + F2 #54 UX consistency finalizacion + F3 #55 Empresas cleanup + F4 #56 polish todos cerrados. F4 (PR #161) cerro 6 childs: #47 copy-forward `excludePaths`, #48 `FormField` label vacio, #49 `clearCriticalBannerStates` helper, #50 test wiring `lastCommittedUpdatedAtRef`, #93 in-flight guard double-submit, #116 cleanup `onConfirmFirstEntry`/`TimelineReadonlyField` muertos.
- Sin frente Seguimientos abierto.
- Pendientes backlog (sin milestone): #156 consolidar `findEmpresasByNit`/`listActiveEmpresasByNit` (cross con Empresas, reconcilia clients Supabase), #157 decision PO Evaluacion sobre `Justificacion` cspell, #88 `useFocusTrap`/`useFocusRestore` shared (deuda transversal repo).
- **Integracion con motor ODS**: Seguimientos hoy NO genera `payload_normalized` ni `acta_id`. Razon: bugs upstream del modulo + adopcion web baja. Integracion con motor (via `payload_normalized` + `acta_id`) queda fuera de scope hasta que el frente Seguimientos lo retome. PO de ODS no fuerza esto; espera al PO de Seguimientos. LSC tiene prioridad sobre Seguimientos para integracion con motor (ver #109).

### ODS

- Modulo migrado y vivo (wizard 5 secciones + importar acta 4 niveles + motor de codigos).
- Sweep tech-debt mayo 2026 cerrado: schema-drift, RPCs server-only, telemetry import_failures, actor_user_id, sibling RPCs, cobertura integration, lint cleanup. Hito arquitectonico: en `/api/ods/importar` ya no hay admin client directos a tablas; todos via RPC server-only.
- Telemetria silenciosa lista. **Pendiente unico de owner**: activar `ODS_TELEMETRY_START_AT` en Vercel Production. Tras ~30 dias de uso, abrir Tanda 3 dirigida por top mismatch fields reales del motor.
- Mejoras radar (no en milestone): #109 interpretes cross-modulo (`payload_normalized` + lectura ODS), #110 ODS sombra automatica al finalizar `payload_normalized`. Atacar despues del motor confiable.
- Telemetria mide motor vs ODS final sin que operador note el cambio. Visibilidad solo para `ods_telemetria_admin`. Sin backfill.
- **LSC operativo end-to-end** post-Tanda 3a Grupo A (#127/#128/#129) y #141: motor reconoce alias `lsc_interpretation`/`interpreter_service`, lee aliases de horas LSC, builder usa `modalidad_interprete`, ODS lookup `usuarios_reca` trae discapacidad+genero por cedula. **Decision PO mayo 2026 (Aaron)**: NO crear campos discapacidad/genero en formulario LSC web — la persona LSC ya pasa por Seleccion antes, BD tiene los datos, lookup los reusa. Edge case (persona LSC sin Seleccion previa) queda como flujo manual de jancam, baja probabilidad. Pendiente unico LSC: modelo 1:N (#109, post-Tanda 3a).
- **Notas latentes Tanda 3a Grupo C (#131/#132 cerrado)**: (a) G5 parcialmente mitigado — el fix #132 (`earlyPdfFecha` antes de fallback `today`) cubre PDFs sin payload pre-resuelto pero CON fecha en primera linea del texto preliminar. Si tanto `detectedFecha` como `earlyPdfFecha` quedan vacios (ej. PDF con saltos de linea atipicos antes del header con fecha, o sin fecha extraible), sigue cayendo a `today` con posible mismatch residual vs `final_value` que usa `ods.fecha_servicio`. Tanda 3b revelara volumen real del residual via telemetria. (b) Edge case `extractEarlyFechaServicioFromPdfText`: helper procesa solo la primera linea del texto concatenado (no la primera pagina del PDF). Si el header con fecha vive en linea posterior, el helper devuelve `""` y cae a `today`. Aceptable segun scope acotado del fix incremental.
- **Hallazgo append-only `ods_import_failures` (bundle telemetria hotfixes #146/#147/#148)**: la migracion original de #75 (`20260505001351_ods_import_failures.sql`) concedio explicitamente `select, insert` a `service_role`, sin `delete`. El cleanup de fixtures de test (`delete().like("stage", "vitest.%")` en #148) funciona empiricamente porque `service_role` en Supabase managed bypasea grants de tabla por defecto. Decision PO mayo 2026 (Aaron, Opcion A): aceptar comportamiento implicito de Supabase managed, mergear bundle sin cambiar grants explicitos. Tech-debt menor latente: si en el futuro migran a self-hosted o cambian config de Supabase, el cleanup fallara. Mitigacion preventiva si se materializa: agregar `GRANT DELETE` explicito (Opcion B descartada en mayo 2026) o RPC dedicado `ods_clear_test_import_failures` con filtro hardcoded `WHERE stage LIKE 'vitest.%'` (Opcion C descartada en mayo 2026).
- **Hallazgos post-Tanda 3a Grupo F (#136 cerrado)**: (a) Pipeline path import Nivel 3 — `result.participants` vs `analysis.participantes` son campos distintos. Cuando Edge gana sin `parseResult`, `result.participants` queda `[]` aunque `analysis.participantes` tenga datos del fallback `extractPdfParticipants`. Comportamiento previo (no introducido por #136), semantica de pipeline a documentar en doc canonico cuando se actualice. No es bug. (b) Limitacion consciente fallback parcial: si Edge devuelve `participantes: ["X"]` (1 de 5 reales), el fallback `fillEmptyBucketParticipantsFromPdfText` no corre porque `hasNonEmptyParticipants` retorna true. `analysis.participantes` queda con 1 entrada en lugar de 5. Decision PO Tanda 3a (no combinar Edge parcial con regex evita inconsistencia entre fuentes). Tanda 3b revelara via telemetria si el caso aparece en data real con frecuencia significativa. (c) Tech-debt #151 abierto: duplicacion probable `selectionPdfParser.ts` vs `generalPdfParser.ts` — `extractPdfGroupalOferenteChunks` byte-a-byte identica entre archivos, sin caller en produccion en el primero. Auditoria post-Tanda 3a.
- **Hallazgos post-Tanda 3a Grupo E (#135 cerrado, PR #153)**: (a) Decision PO basada en telemetria real (32 filas mayo 2026) acoto el scope de F4: brief original era ampliar inferencia con heuristicas nuevas (4-6h, 8 ramas), pero `inferModalidad` funciona en 29/32 filas (90.6%) — los 3 mismatch son LSC fuera de scope #135 (1 cubierto por bundle PR #149; 2 son gaps de pipeline LSC: deteccion `document_kind` upstream cuando llega null + acceso a horas LSC al motor cuando solo viven en `final_value.horas_interprete`). Sin evidencia que valide gap de modalidad incremental, se acoto a refactor preventivo (1-2h, cero cambios funcionales) consolidando `Set odsKinds` hardcoded en helper `isOdsModalityRequiredKind`. (b) Deuda preexistente expuesta por QA dual: `pipeline.ts:263-265` define `isInterpreterServiceDocumentKind` local que duplica `isInterpreterServiceKind` canonico de `rulesEngine.ts:67-69` (acepta `unknown` en vez de `string`, no reusa el helper canonico). Reusar via export del canonico cuando se actualice pipeline. (c) Riesgo arquitectonico no resuelto: agregar una rama nueva al motor en `suggestServiceFromAnalysis` requiere acordarse manualmente de actualizar `ODS_MODALITY_REQUIRED_KINDS`. Sin linkage TS, si se olvida el segundo paso degrada silencioso (`modalidad.value` queda `""` -> fallback low). Idea futura: derivar el Set de un type union o test de cobertura cruzada (kinds manejados ⊆ Set requerido). (d) Casos LSC restantes con telemetria mismatch: brief separado post-Tanda 3a si el volumen sube en data nueva (<6.25% en data del 6 mayo).

### Drafts, finalizacion y prewarm

- Base shared protege contra duplicados por identidad y cleanup destructivo de Sheets publicados o en publicacion.
- Fases 0-7 completas: baseline reproducible, rename async fuera del path critico, claim atomico por `identity_key`, delete/cleanup seguro, hint canonico server-side con caps, piloto temprano de `presentacion`, reuse confiable con `templateRevision`/`validatedAt`, text review directo/paralelo, cold path Google Sheets optimizado, cache text review en `external_artifacts` para retries consistentes.
- **Decision vigente**: dejar correr una semana antes de Fase 8 para medir con datos reales.

### Borradores

- Hub elimina optimistamente y luego soft-deletea remoto.
- Cleanup de Drive trazable como `trashed`, `skipped`, `pending` o `failed`.
- UI admin minima en `/hub/admin/borradores` para `aaron_vercel`: listar pendiente/fallido, reintentar trash, purgar resueltos.
- No hay queue ni cron; reevaluar solo si aparece volumen o falla recurrente.

### Expansion v2

- E0 Roles: completada. `profesional_roles`, rol `inclusion_empresas_admin`, helpers, `GET /api/auth/me`, migracion remota verificada.
- E1 Shell + sidebar: implementada. Layout persistente en `/hub`, sidebar colapsable, borradores conservados por query param.
- E2A Empresas backoffice: en produccion. CRUD server-side, soft delete, actividad reciente, defensas server-side.
- E2B Profesionales gerencia: en produccion. CRUD, acceso Auth, roles Inclusion, contraseña temporal, soft delete/restauracion, defensas server-side.
- QA manual Fases 1-5: cerradas. Migracion remota conservadora aplicada. Capa visual backoffice reusable con contraste alto, headers, cards, badges, feedback, tablas coherentes.
- E2C Catalogos simples: en produccion. Asesores, Gestores, Intérpretes activos para admins. CRUD admin-only, soft delete, sorting reusable.
- E2D Performance y Egress: cerrada local antes de E3. Listado liviano, catalogos por RPC, asesores activos, busqueda reducida, filtros `deleted_at`.
- E3.1: en produccion. Migracion de eventos profesionales y RPCs transaccionales server-only para reclamar/soltar/cambiar estado/notas.
- E3.3: en produccion. UI profesional Empresas con home operativo, `Mis empresas`, buscador interno, detalle read-only, notas explicitas, asignacion/liberacion. `E3_3_ASSIGNMENT_ALERTS_START_AT` configurado.
- E3.4a/E3.4a.2: cerradas como inventario y contrato operativo.
- E3.4b: en produccion. Modelo/API server-side de proyecciones, catalogo versionado, tabla agenda, RPCs transaccionales, cancelacion idempotente, cache catalogo, linea vinculada interprete.
- E3.5a: cerrada como inventario read-only.
- E3.5b/E3.5c/E3.5d: en produccion. Motor/API read-only ciclo de vida, UI timeline vertical guiado en `/hub/empresas/[id]/ciclo-vida`, conectores CSS, ramas plegables.

### Empresas (frente activo continuo)

- PO Empresas distinto al PO ODS y al PO Seguimientos (antes solo QA, ahora rol PO).
- Modulo en produccion via fases E2A/E2B/E2C/E2D/E3.x de Expansion v2 (ver arriba).
- Milestone GitHub `Empresas General Work` (#3) abre frente continuo (estilo ODS, no sprint cerrado).
- **Prioridad inmediata**: #158 P0 discovery — investigar performance del panel Gerencia + Profesional. Reportado por gerencia mayo 2026 (lentitud entre ventanas + CRUD lento). Discovery primero, sub-issues incrementales estilo Tanda 3a tras diagnostico medido (HAR, server-timing, Supabase logs, profiling).
- Otros issues en milestone: #85 data cleanup NITs duplicados (68 NITs duplicados + 10 rows con NIT null en tabla `empresas`).
- Cross-cutting sin milestone (PO Empresas decide absorber): #156 consolidar `findEmpresasByNit`/`listActiveEmpresasByNit` (cross con Seguimientos), #88 `useFocusTrap`/`useFocusRestore` shared.
- E3.4c calendario UI mensual/semanal/diaria sigue pendiente sin issue. No empujar hasta que el panel base este optimo.
- **Restricciones globales vigentes**: backwards compatibility / no bloqueo (panel debe seguir operativo durante optimizacion). Egress Supabase debajo del 50% del free tier (decision E2D). `pg_trgm` diferido salvo medicion `>1.5s` busquedas.

## Decisiones activas

### Seguimientos restructure

- **Permisos**: scope abierto a todo rol Inclusion (`inclusion_empresas_admin`, `inclusion_empresas_profesional`). `ods_operador` rechazado con 403.
- **Gate ampliado**: si vinculado existe en `usuarios_reca` pero sin `empresa_nit`, paso explicito de asignacion manual de empresa con autocomplete (reusa `useEmpresaSearch` de E3.3). Persistir en `usuarios_reca`.
- **Case overview**: timeline visual (✓ · ▶ · ○ · 🔒) + ficha inicial plegable. Consume `getSeguimientosStageRules(companyType)` (todos los stages); futuros visibles pero no clickables.
- **Copy-forward**: banda superior con checkboxes por grupo (Modalidad y tipo de apoyo, Evaluaciones) default ON, boton "Aplicar prellenado" explicito. Delega a `copySeguimientosFollowupIntoEmptyFields` (into-empty-only).
- **Editor**: "Finalizar Seguimiento N" reemplaza "Guardar seguimiento en Google Sheets". CTA "Confirmar ficha inicial y abrir Seguimiento X" en primer ingreso, disabled hasta minimos + contenido significativo. `isCompleted` conserva umbral 90% para badges, proteccion historica y PDF.
- **Modal PDF al cerrar followup**: reemplaza toast post-followup. Opcion filtrada a `base_plus_followup_${N}`. Lee `persistedFollowups` (A1).
- **Override desde summary**: "Reabrir ficha inicial" dispara dialog de confirmacion existente.
- **Drafts existentes**: hidratan en nueva UX sin perdida (motor no cambio).

### Drafts/finalizacion/prewarm

- No agregar TTL al cache `failed` de text review hasta medir; pesa mas la consistencia Sheet/DB en retries que reintentar OpenAI.
- Mantener batch separado de protected ranges cuando hay `templateBlockInsertions`; ahorra menos pero preserva orden defensivo con merges/alturas/protecciones.
- Fase 8 no debe implementar formularios por inercia: cada formulario necesita beneficio esperado claro y medible.

### Expansion v2 - permisos y datos

- Permiso admin de Empresas es `inclusion_empresas_admin`; no usar `is_admin` ni columna unica `rol`.
- E2A/E2B mantienen mutaciones + eventos como best-effort en API server-side; decidir RPC transaccional o reconciliador al disenar E3/E2C.
- Profesionales: nombre 2-5 palabras, correo RECA con dominio fijo `@recacolombia.org`, `usuario_login` generado con dedup, programa cerrado `Inclusion Laboral`.
- Roles user-facing: `inclusion_empresas_admin` -> `Admin Inclusion`; `inclusion_empresas_profesional` -> `Profesional Inclusion`.
- Solo `aaron_vercel` puede asignar/quitar `Admin Inclusion`; cualquier `Admin Inclusion` puede soft-deletear otro admin sin editar roles.
- Ningun admin puede autoeliminarse; `aaron_vercel` queda protegido por guard de autoeliminacion.
- Perfiles con acceso Auth: `correo_profesional` + al menos un rol; `usuario_login` lo genera el servidor.
- Perfiles catalogo: sin roles ni acceso Auth.
- Antes de habilitar acceso Auth: validar que usuario Auth por correo no este vinculado a otro profesional activo.
- Soft-delete profesional: libera empresas asignadas; restaurar no devuelve roles ni acceso Auth.
- Supabase Admin API: ban/update Auth si, revocacion universal por `user_id` no; access tokens existentes expiran por TTL.
- Usuario con contrasena temporal no puede usar APIs `requireAppRole` hasta `/auth/cambiar-contrasena-temporal`.

### Expansion v2 - normalizacion

- Escrituras nuevas de Empresas se normalizan en API antes de Supabase: trim de invisibles, colapso espacios, capitalizacion, NIT sin puntos/espacios, catalogos canonicos. Valores historicos ambiguos quedan fuera de saneamiento automatico.
- Fase 3 mantiene `empresas` con columnas legacy, contactos serializados con `;` conservando posiciones nombre/cargo/telefono/correo.
- `Zona Compensar`: dropdown cerrado desde valores unicos actuales; sin texto libre.
- Quickfix de asesor: solo escribe `asesor` y `correo_asesor` en empresa; nunca crea ni modifica `asesores`.
- Crear/editar Empresa exige nombre, NIT, direccion, ciudad, sede, Zona Compensar, gestion, estado, responsable completo, datos Compensar completos, profesional asignado.
- Contactos adicionales opcionales pero cada fila requiere minimo nombre y cargo. Telefono y correo opcionales. Accion para eliminar filas.
- Telefonos: solo digitos, max 10; rechazar signos/letras.
- Edicion empresas existentes: compatibilidad legacy. No bloquea por campos historicos incompletos. Cambio de estado sigue exigiendo comentario.
- Ciudad: mapa ortografico conservador basado en valores unicos actuales; sin correcciones ambiguas.
- Sorting por headers como patron reusable para tablas backoffice. Aplicado en Empresas/Profesionales; Asesores/Gestores/Interpretes lo reutilizan.
- Direccion visual `/hub/empresas*`: RECA + acentos legacy. Cards compactas, headers morados/teal, badges alto contraste, feedback explicito, secundario `gray-600/700`. Placeholders de ejemplo en campos editables.

### E2C / E2D

- E2C muestra `localidad` en Asesores como opcional.
- E2C no impone `nombre` unico en Gestores; agrega `id uuid` como llave estable.
- E2C aplica soft delete con `deleted_at` en Asesores/Gestores/Interpretes; catalogos publicos devuelven solo activos.
- E2C: sin Auth, sin roles, sin contrasenas, sin importacion Excel.
- E2D no bloquea E3 a nivel codigo local; HAR real de gerencia queda como validacion operativa posterior.
- E2D no optimiza finalizacion de actas; lentitud allá abre fase separada.
- E2D mantiene egress proyectado del backoffice debajo del 50% del free tier de Supabase.
- E2D.3/E2D.4 mantienen `count: "exact"` y difieren `pg_trgm`.

### E3 ciclo de vida

- E3 amplia el `CHECK` de `empresa_eventos.tipo` antes de agregar reclamos/soltados/quitadas/notas.
- E3 resuelve atomicidad con RPCs transaccionales server-only: `security invoker`, sin `execute` para `anon`/`authenticated`, llamadas solo desde API routes con service role.
- E3.3 cuenta empresas nuevas solo desde `E3_3_ASSIGNMENT_ALERTS_START_AT`; fallback evita contar legacy como nuevo.
- En E3.3 busqueda global vive dentro de `Mis empresas`, minimo 3 caracteres, busca por nombre/NIT.
- Profesionales ven detalle completo read-only de empresas activas; sin editar datos maestros; solo asignarse/tomar/liberar con comentario y agregar notas.
- Solo nota explicita posterior a asignacion/toma elimina alerta de empresa nueva.
- E3.4a: una proyeccion = un solo servicio/proceso asociado a empresa. UI no expone codigos contables crudos; usa nombres operativos mapeables a tarifas.
- Matriz de servicios E3.4 puede vivir en Supabase como tabla/config versionada; no editable por gerencia hasta validaciones, auditoria y reglas estables.
- E3.4b: Google Calendar/Maps, conciliacion automatica y metricas gerenciales fuera de alcance inicial.
- E3.4b guarda catalogo de servicios proyectables via migracion versionada; edicion por gerencia espera fase futura con auditoria.
- E3.4b crea/actualiza/cancela proyecciones con RPCs transaccionales service-role-only.
- E3.4b mantiene `Cache-Control: private, no-store` en APIs; catalogo cachea server-side TTL corto.
- E3.4b no agrega `active`/`deleted_at` a servicios; `proyectable=false` excluye del calendario inicial.
- E3.4b no agrega bitacora; cambios/auditoria reabren en E3.4d o metricas gerenciales.
- E3.4c debe revisar double booking, rangos de fecha, retencion de canceladas, posible indice `(estado, inicio_at)`, lineas hijas de interprete.
- E3.4a.2 separa campos calendario de campos acta: `duracion_minutos` en proyecciones, `cantidad_empresas` fuera (siempre 1), `projection_id` solo se copia si formulario nace desde calendario.
- E3.4a.2 prohibe buscar/actualizar proyecciones durante finalizacion; conciliacion despues.
- E3.4a.2 modela interpretes como segunda linea: servicios con personas sugieren `requires_interpreter`; otros pueden pedirlo como excepcion justificada; crea `interpreter_service` con `parent_projection_id`.
- Modalidades iniciales en E3.4: `presencial` y `virtual`; `todas_las_modalidades` aplica solo a `interpreter_service`.
- E3.5a: ciclo de vida es arbol operativo, no lista lineal. `condiciones-vacante` crea rama de perfil/cargo; desde `seleccion` la cedula es llave principal de persona.
- En ciclo de vida: `Compensar` agrega evaluacion accesibilidad, sensibilizacion, induccion organizacional y 6 seguimientos; `No Compensar` no tiene esas etapas y espera 3 seguimientos.
- Seleccion y contratacion pueden ser grupales: una acta puede crear/actualizar varias ramas por cedula. Seguimientos no son grupales.
- Personas seleccionadas sin contratacion: activas 6 meses, luego ramas archivadas; no se borran.
- Ciclo de vida read-only no mezcla notas globales en el arbol; viven en secciones separadas.
- Evidencia que no clasifica con confianza: `Evidencia sin clasificar`, no se oculta ni asigna por matching difuso.
- E3.5b: tipo acta desde `nombre_formato` (no hay `form_slug`); variantes historicas (`Revision Condicion`, `Proceso de Seleccion Incluyente`, sin tilde) se normalizan.
- E3.5b: `nit_empresa` como llave primaria empresa; `nombre_empresa` como fallback con warning. `cargo_objetivo` crea perfiles, no es llave fuerte para personas.
- E3.5b: clasifica seguimientos por `seguimiento_numero` cuando exista; fecha como fallback. Hoy solo seguimientos #1 a #3.
- E3.5b: no expone `payload_normalized` crudo al browser; endpoint entrega evidencia resumida y renderizable.
- E3.5b: limita evidencia por empresa a 250 registros; si alcanza, reabre con RPC/indice antes de UI mas pesada.
- E3.5c: ciclo de vida read-only visible para cualquier `inclusion_empresas_profesional` sobre empresas activas. Antes de datos sensibles, acciones sobre ramas o UI rica, reevaluar scoping por empresas asignadas/tomadas o gerencia.
- E3.5c: sin feature flag (ruta role-gated, password-temp-gated, no en navegacion masiva). Reabrir flag si entra en produccion amplia.
- E3.5d: en produccion. Mantiene read-only. Resuelve solo lectura visual: timeline vertical, conectores CSS, ramas simples, plegables con boton/chevron.
- `LifecycleCollapsible` vive en Empresas; extraer a backoffice solo si otra pantalla adopta el patron.
- E3.5d: no pagina ni trunca `EvidenceList` por seccion. Reabrir si QA detecta timelines lentos; fix esperado seria `ver mas`/paginacion por rama.
- E3.5/E5: endpoint batch/summary multiempresa y telemetria de calidad solo cuando UI/metricas lo requieran; no multiplicar llamadas `ciclo-vida` por fila.
- E3.5b: extractores conservadores. `payload_schema_version` nuevo, NIT legacy con letras, empresa/evidencia sin NIT ni nombre, variantes nuevas de cedula -> documentar y ampliar con ejemplos reales; no adivinar matches.

## Siguiente orden recomendado

1. Para Seguimientos (PO distinto al de ODS), milestone v1 cerrado mayo 6, 2026. Sin frente abierto. Deudas backlog (#156, #157, #88, #109) no se trabajan sin brief PO nuevo.
2. Para Empresas (PO distinto al de ODS y Seguimientos), arrancar discovery #158 P0 (performance panel Gerencia + Profesional). Sub-issues incrementales tras diagnostico medido. No empujar E3.4c calendario hasta que el panel base este optimo.
3. Planear E3.4c: UI calendario profesional mensual/semanal/diaria sobre la base server-side de proyecciones (post-optimizacion #158).
4. Disenar fase posterior del ciclo de vida rico solo despues de validar E3.5d con datos reales.
5. Reabrir ciclo de vida solo si QA/uso real detecta timelines demasiado largos; fix esperado: `ver mas`/paginacion por rama.
6. Reabrir `pg_trgm` solo si medicion post-despliegue mantiene busquedas >1.5s.
7. Esperar una semana de uso tras Fase 7 y correr `npm run finalization:baseline -- --days 30 --limit 100`. Comparar `prewarm_status`: `reused_ready`, `inline_cold`, `inline_after_stale`, `inline_after_busy`.
8. Planear Fase 8 con datos: decidir si `seleccion` y `contratacion` ameritan setup/prewarm temprano propio o si basta el contrato canonico + cold path optimizado.
9. Mantener QA de `visita fallida`, borradores y autosave como frentes separados del rollout de prewarm.
10. Tras ~30 dias de telemetria ODS activa, abrir Tanda 3 dirigida por top mismatch fields reales.

## Completado (lista compacta)

- Migracion base de long forms, drafts, finalizacion y prewarm.
- Fases 0-7 del proyecto de prewarm/finalizacion segura.
- Expansion v2 E0 Roles.
- Expansion v2 E1 Shell + sidebar.
- Expansion v2 E2A Empresas backoffice.
- Expansion v2 E2B Profesionales gerencia.
- Expansion v2 QA manual Fases 1-5 + QA final de codigo.
- Expansion v2 E2C Catalogos simples.
- Expansion v2 E2D Performance y Egress.
- Expansion v2 E3 Empresas profesional base y ciclo de vida read-only visual hasta E3.5d.
- Expansion v2 E3.4a inventario y E3.4b modelo/API server-side de proyecciones.
- ODS Tanda 1 (#67, #68, #70, #71) y Tanda 2 epic #69 telemetria silenciosa completos.
- ODS sweep tech-debt mayo 2026: #74, #73, #75, #82, #113, #108, #115.
- Hotfixes P0 ODS: #92, #98, #101, #106.
- Seguimientos v1 completo: F1 #53 bugs latentes + F2 #54 UX finalizacion + F3 #55 Empresas cleanup + F4 #56 polish (cleanup, a11y, helpers, in-flight guard). Milestone cerrado mayo 6, 2026 (21/21). PR #159 (F3) y PR #161 (F4).

## Memory Index - RECA Inclusion Laboral (Web)

Leer solo el archivo relevante para la tarea actual.

| Archivo | Cuando leerlo |
|---|---|
| [user_profile.md](user_profile.md) | Primera sesion o si hay dudas sobre el contexto del usuario |
| [architecture.md](architecture.md) | Antes de agregar componentes, rutas o decisiones tecnicas |
| [roadmap.md](roadmap.md) | Al inicio de cada sesion para saber el siguiente frente |
| [forms_catalog.md](forms_catalog.md) | Al trabajar en un formulario especifico |
| [form_production_standard.md](form_production_standard.md) | Antes de migrar o endurecer formularios al estandar productivo |
| [supabase_integration.md](supabase_integration.md) | Al tocar auth, datos o API routes de Supabase |
| [google_integration.md](google_integration.md) | Al tocar Google Sheets o Drive |
| [migration_reference.md](migration_reference.md) | Al contrastar con el repo Tkinter original |
| [notion_workflow.md](notion_workflow.md) | Al documentar en Notion o cerrar fases/QA |
| [transicion_drafts_invisibles_plan.md](transicion_drafts_invisibles_plan.md) | Solo si hace falta recordar invariantes del rollout invisible |

## Estado local breve

- `Finalizacion / hardening F1`, `limpieza estructural F2` y `prewarm hardening F3` ya quedaron aplicados localmente.
- `Prewarm hardening F3` deja estados terminales reales, lease server-side por draft, cleanup remoto best-effort, rollout por `env + pilot`, rate limit y observabilidad mas fina para reuso vs rebuild.
- `Prewarm resiliencia F2` ya quedo aplicada localmente sobre esa base: delete remoto distinguible/idempotente, retencion de cleanup pendiente, backoff cliente por key, validacion de bundle fuera del polling y constraint SQL para `google_prewarm_status`.
- `Prewarm consolidacion estructural F3` ya quedo aplicada localmente: pipeline shared de prewarm/finalizacion en las 8 routes, rollout separado de la registry de dominio, contrato comun de trackers, tipos explicitos en la superficie prewarm/finalizacion y documentacion de la divergencia `legacy_company` vs `draft_prewarm`.
- `Prewarm hardening operativo F3` ya quedo aplicado sobre esa base: rollout `opt-in` real por `env`, registry tipada por formulario, constantes estructurales shared para `Presentacion` y `Sensibilizacion`, firma deterministica de estructura, boundary shared para los 8 `*FormEditor`, helper de gate renombrado a logica pura, tests directos de naming y eliminacion de `serverClient.ts` muerto. Este corte ya tiene preview nuevo y queda pendiente solo QA manual antes de decidir rollout global en prod.
- `Drafts invisibles` ya quedaron armonizados de forma shared para todos los long forms del piloto. La URL nominal ya no debe exponer `?session=draft:<uuid>`.
- `Drafts durante finalizacion` ya quedaron endurecidos de forma shared para bloquear checkpoints automaticos y evitar huerfanos remotos.
- `Observabilidad / Sentry` ya quedo limpiada: el ruido de finalizacion paso a breadcrumbs-only y el backlog reciente del proyecto quedo triageado.
- `Induccion Operativa` e `Induccion Organizacional` ya ejecutan `textReview` real en finalizacion con el mismo patron de los formularios homologados, sin cambiar request hash ni coordinar distinto la idempotencia.
- `Condiciones de la Vacante` ya dejo de observar el formulario completo para el estado de UI; ahora usa un conjunto explicito de campos observados y mantiene el prewarm acotado a `asistentes` y `discapacidades`.
- `Evaluacion` ya recibio un pase conservador de fluidez: la lectura reactiva del formulario quedo separada en grupos logicos (`empresa`, preguntas/accesibilidad y narrativas/asistentes) sin tocar las derivaciones de `section_4` ni `section_5`.
- `Integridad de guardado y salida final F1` ya quedo aplicada localmente: `LongFormShell` fuerza `flush` local al salir de campos editables, el feedback de borrador prioriza el guardado local del dispositivo sin esperar sincronizacion remota, `Evaluacion` mantiene opcionales `section_6` y las observaciones cortas de `2.1` a `3`, y el path shared `draft_prewarm` ahora oculta la hoja provisional vacia para evitar paginas/hojas extra en `Sheet` y `PDF`.
- `Follow-up local de autosave + Evaluacion` ya quedo aplicado sobre esa base shared: todos los long forms siembran una copia local inicial en cuanto el formulario queda listo tras escoger empresa, `flushAutosave()` ya no depende de refs desfasadas para ver cambios pendientes al salir del campo y `Evaluacion` deja de pintar como requeridas las observaciones cortas de `2.1` a `3`. Este follow-up todavia no tiene preview nuevo.
- `Consistencia operativa shared F2` ya quedo aplicada localmente sobre esa base: lookup por cedula mas homogeneo en `Seleccion`, `Contratacion` e inducciones (nombre visible, sin cedula-resumen duplicada y sin alerta duplicada dentro del lookup), gate liviano antes de escoger empresa para los 8 long forms, delete de borradores en `/hub` con desaparicion inmediata sin boton bloqueado persistente y regresion adicional para que `FormCompletionActions` limpie mensajes viejos cuando el siguiente intento si abre recursos. Este corte todavia no tiene preview nuevo.
- `Ergonomia y productividad F3` ya quedo aplicada localmente sobre esa base: `RepeatedPeopleSection` ahora expone el CTA de agregado arriba y abajo para `Seleccion` y `Contratacion`, `AsistentesSection` adopta el patron de lista simple con el CTA solo al final y `Condiciones Vacante` queda cubierto como referencia correcta del patron `solo abajo`. Este corte todavia no tiene preview nuevo.
- `Follow-up local de autosave shared` ya quedo aplicado sobre ese lote: `Seleccion`, `Evaluacion`, `Contratacion`, `Sensibilizacion` y `Condiciones Vacante` dejaron de depender de `isBootstrappingForm` para sembrar la copia local inicial y suscribirse al autosave por cambios. Queda pendiente validarlo en preview porque este fix apunta directamente al riesgo de perdida de datos reportado por QA.
- `Preview integrado de autosave + consistencia shared`: ya disponible en [preview](https://reca-inclusion-laboral-nuevo-hb9xvv292-auyabans-projects.vercel.app) · [inspector](https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/7KyVmyCN1WvcQjQqtSSDtg3RwJfJ). Este corte consolida `follow-up local de autosave + Evaluacion`, `Consistencia operativa shared F2`, `Ergonomia y productividad F3` y el `follow-up local de autosave shared` sobre la misma base actual. Siguiente paso real: QA manual enfocado primero en riesgo de perdida de datos.
- `Preview F3 de prewarm hardening`: ya disponible en [preview](https://reca-inclusion-laboral-nuevo-punvytdw5-auyabans-projects.vercel.app) · [inspector](https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/FAt6ffSYDWW5WeUGeFknLg9trh9f). Este corte consolida el rollout `opt-in`, el endurecimiento de la registry prewarm, la centralizacion estructural de Sheets y el cleanup final de wrappers/tests. Siguiente paso real: QA manual focal de reuse/rebuild, variantes de `Presentacion/Reactivacion`, naming y decision de rollout global.
- `Evaluacion` ya corre como formulario largo en preview, con tarjeta habilitada en `/hub`, publicacion solo a Google Sheets y sin PDF.
- `Delete del hub + apertura guiada acta/PDF` ya quedo aplicado localmente sobre esa base: `useDraftsHub` hace remove optimista con rollback real si el backend falla, `DraftsHub` muestra aviso inline cuando hay rollback y el route DELETE registra timings estructurados por fase (`read_prewarm`, `drive_cleanup`, `db_delete`, `total`). En paralelo, `FormCompletionActions` deja de intentar dos popups en un solo click: el CTA combinado ahora abre primero el acta y guia al usuario para abrir el PDF manualmente desde el CTA separado. Este corte requiere preview nuevo para validar percepcion y UX final.

## Siguiente foco recomendado

- Prioridad inmediata: validar en el preview F3 nuevo que el rollout `opt-in` deja el prewarm apagado por defecto y que el piloto solo se activa cuando `NEXT_PUBLIC_RECA_PREWARM_ENABLED=true`.
- Luego, en ese mismo preview, validar `Presentacion`/`Reactivacion`, `Sensibilizacion` y al menos uno entre `Seleccion` o `Contratacion` con foco en reuse/rebuild, estructura de hojas y naming final.
- Finalmente, cerrar un smoke corto de los 8 long forms y de `/hub` para confirmar que el boundary shared de editores y el helper de gate no introdujeron regresiones laterales.

1. Ejecutar QA manual del preview F3 confirmando rollout por `env`, variante correcta de `Presentacion/Reactivacion`, estructura correcta en `Sensibilizacion` y al menos un formulario con repetidores.
2. Si ese QA pasa, decidir si el siguiente cambio en prod es solo habilitar `NEXT_PUBLIC_RECA_PREWARM_ENABLED=true` y mantener o expandir `NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS`.
3. Solo despues de ese QA, retomar pendientes secundarios de `/hub`, autosave y el frente funcional grande de `Seguimientos`.

## Referencias rapidas

- App original (solo lectura): `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`
- Produccion: <https://reca-inclusion-laboral-nuevo.vercel.app>
- Notion canonico: `10 - Estado actual`, `20 - Pendientes priorizados`, `30 - QA y validacion`, `40 - Iniciativas y decisiones`, `50 - Formularios y migracion`

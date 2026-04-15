# Memory Index — RECA Inclusión Laboral (Web)

Leer **solo el archivo relevante** para la tarea actual. No leer todos en cada sesión.

| Archivo | Cuándo leerlo |
|---|---|
| [user_profile.md](user_profile.md) | Primera sesión o si hay dudas sobre el contexto del usuario |
| [architecture.md](architecture.md) | Antes de agregar cualquier componente, ruta o decisión técnica nueva |
| [roadmap.md](roadmap.md) | **Al inicio de cada sesión** — dice qué sigue y en qué fase estamos |
| [forms_catalog.md](forms_catalog.md) | Al trabajar en cualquier formulario específico |
| [form_production_standard.md](form_production_standard.md) | Antes de migrar o endurecer cualquier formulario hacia estándar productivo |
| [supabase_integration.md](supabase_integration.md) | Al trabajar con auth, datos o API routes de Supabase |
| [google_integration.md](google_integration.md) | Al trabajar con Google Sheets o Google Drive |
| [migration_reference.md](migration_reference.md) | Al migrar un formulario desde el proyecto Tkinter original |
| [notion_workflow.md](notion_workflow.md) | Al documentar en Notion, abrir una nueva sesión de trabajo o registrar fases/QA |
| [qa_hardening_summary_2026-04-14.md](qa_hardening_summary_2026-04-14.md) | Al revisar o retomar el cierre del hardening post-QA |

---

## Contexto rápido (leer siempre)

- **Proyecto:** Reescritura web de app Tkinter de gestión de formularios de inclusión laboral
- **Stack:** Next.js 16 + Tailwind v4 + Supabase + Google Sheets/Drive + OpenAI Whisper
- **Restricción crítica:** $0 infra — todo free tier
- **Dev:** Solo developer + Codex como equipo
- **Fase actual:** producción real publicada para piloto con usuarios. `Presentación/Reactivación` sigue siendo la referencia canónica del estándar productivo, `Sensibilización` ya cerró S1-S6 sobre `/formularios/sensibilizacion` y la infraestructura compartida de formularios largos ya quedó endurecida con shell reusable, slugs centralizados y módulos puros de secciones/hydration. El siguiente frente recomendado es `Inducción Operativa`.
- **Actual local (2026-04-14):** el drawer de borradores ahora deriva labels visuales desde el snapshot local para distinguir mejor drafts del mismo formulario y empresa. `condiciones-vacante` prioriza `nombre_vacante`, `numero_vacantes` y `fecha_visita`; si dos drafts siguen viéndose iguales, el hub agrega badge `Similar x/n`.
- **Estado reportado por usuario:** se autorizó el lanzamiento real a producción para empezar pruebas con usuarios. El deployment productivo quedó publicado desde el workspace actual en Vercel, con alias activo en `reca-inclusion-laboral-nuevo.vercel.app`; el cierre local más reciente del baseline compartido de formularios largos pasó `npm run lint` y `npm run test` (`251/251`) sin crear preview nuevo.
- **Hardening local post-QA:** auth server-side, integración Google, serialización de drafts, limpieza de artefactos huérfanos, unificación de modalidad (`Mixta` canónica con compatibilidad para restore de `Mixto`) y convergencia de formularios largos (`LongFormShell`, `LONG_FORM_SLUGS`, `longFormHydration`, `<slug>Sections`, `<slug>Hydration`) ya quedaron listos localmente y documentados.
- **Actual local adicional (2026-04-14):** `Presentacion` y `Sensibilizacion` ya usan contenedor delgado + hook de estado + presenter puro sobre `useLongFormDraftController`; `npm run lint`, `npm run test` y `npm run build` pasaron localmente.
- **App original (NO tocar):** `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`
- **Dev server:** `npm run dev` → http://localhost:3000
- **Producción:** https://reca-inclusion-laboral-nuevo.vercel.app
- **Notion canónico:** `00 — Start Here`, `10 — Estado actual`, `20 — Pendientes priorizados`, `30 — QA y validación`, `40 — Iniciativas y decisiones`, `50 — Formularios y migración`, `60 — Sesiones de trabajo`, `70 — Legacy y referencias`, `80 — Operación GitHub`
- **Lectura Notion por defecto:** empezar por `10` y `20`; abrir `30`, `40` o `50` solo si la tarea lo necesita; no leer `60` o `70` salvo bloqueo real

## Lo que ya está construido

### Infraestructura
- ✅ Setup completo Next.js 16 + Tailwind v4 + shadcn/ui + dependencias
- ✅ Paleta de colores RECA (`#81398A`) en globals.css
- ✅ Deploy en Vercel conectado a GitHub (auto-deploy en push a `main`)
- ✅ MCP de Vercel y Supabase configurados en Codex

### Auth
- ✅ Auth con Supabase — login por `usuario_login` (no email directo)
- ✅ `src/proxy.ts` (Next.js 16) — protege `/hub` y `/formularios/*`
- ✅ `src/hooks/useAuth.ts` — expone `user`, `session`, `loading`, `signOut()`
- ✅ Login UI (`/`) — lookup de `usuario_login` en tabla `profesionales`, luego `signInWithPassword()`
- ✅ Hardening mínimo de auth/API — `lookup` con validación Zod, throttling best-effort por IP, errores genéricos y límites de longitud en login
- ✅ Hub / menú con 9 tarjetas (`/hub`) — auth guard activo
- ✅ Usuario de prueba: `aaron_vercel` / `Password1234`

### Búsqueda de empresa
- ✅ `Section1Form` con búsqueda debounce (300ms) en tabla `empresas` (1134 registros)
- ✅ Zustand store (`src/lib/store/empresaStore.ts`) — empresa persiste en `sessionStorage`
- ✅ Ruta dinámica `/formularios/[slug]` → editor canónico para `presentacion` y `sensibilizacion`; `Section1Form` para los demás slugs
- ✅ `/formularios/[slug]/seccion-2` → ruta legacy; en `sensibilizacion` redirige a la canónica

### Formulario Presentación/Reactivación (`presentacion`) — base funcional completa, en hardening para MVP piloto ✅
- ✅ Documento largo en una sola página sobre `/formularios/presentacion`
- ✅ Secciones visibles: empresa, datos de la visita, motivación, acuerdos y observaciones, asistentes
- ✅ Búsqueda y selección de empresa integrada dentro del mismo documento
- ✅ Navegación lateral por secciones en desktop + navegación compacta en móvil
- ✅ Flujo Google Sheets: copia template → escribe celdas → checkboxes → PDF → Drive
- ✅ Guarda en `formatos_finalizados_il` en Supabase
- ✅ Pantalla de éxito con links al Sheet y PDF

### Formulario Sensibilización (`sensibilizacion`) — baseline productivo cerrado ✅
  - ✅ Documento largo funcional sobre `/formularios/sensibilizacion`
  - ✅ Shell reutilizable compartido con `Presentación/Reactivación`: navegación lateral, tarjetas colapsables y `DraftPersistenceStatus`
  - ✅ Superficie simplificada: se retiraron `Temas` y `Registro fotográfico` del formulario web
  - ✅ Finalización solo genera Google Sheet; este formulario ya no exporta PDF
  - ✅ Compatibilidad de borradores preservada mediante mapping `step -> section`
  - ✅ Ruta legacy `/formularios/sensibilizacion/seccion-2` redirige preservando `draft`, `session` y `new`
  - ✅ API `POST /api/formularios/sensibilizacion`
  - ✅ Flujo Google Sheets: hoja `8. SENSIBILIZACIÓN` → observaciones + asistentes
  - ✅ Guarda en `formatos_finalizados_il` en Supabase
  - ✅ S3 técnico cerrado: asistentes significativos, `cargo` obligatorio por fila usada, saneamiento antes de finalización y restore/checkpoint con precedencia explícita
  - ✅ S4 técnico cerrado: política explícita de asistentes por formulario, helpers compartidos por modo y cobertura automática del shell largo
  - ✅ S5 cerrado: QA funcional + QA de regresión aprobadas
  - ✅ S6 cerrado: documentación local/Notion actualizada y promoción del playbook como base para `Inducción Operativa`

### Features reutilizables (disponibles para todos los formularios)
- ✅ `useFormDraft` hook — autosave local-first por sesión/acta + checkpoints remotos low-egress con promoción lazy `session -> draft` + bloqueo multi-pestaña
- ✅ Ciclo de drafts endurecido: alias `session -> draft`, proyección única para hub+contador, timeout visible de guardado manual, purga completa local/remota al finalizar o borrar y retorno al hub sin depender de `window.opener`
- ✅ QA manual ya validó en `Presentación`: warning antes de recargar/cerrar, recuperación del mismo draft tras reload, ausencia de duplicados en el caso probado de cierre con operación colgada, contador consistente y limpieza correcta después de finalizar con éxito
- ✅ Ajuste aplicado en formularios: el submit inválido ya no hace `reset(...)` ni espera el guardado del borrador dentro de `handleSubmit`; el checkpoint ocurre en background para evitar que `Finalizar` quede colgado cuando falla validación
- ✅ Hub canónico: al abrir un borrador desde el drawer ahora se limpia `?panel=drafts`, por lo que refrescar el hub debe volver a `/hub`
- ✅ CSP de preview: `https://vercel.live` se habilita solo en previews de Vercel para eliminar el warning del script de feedback sin relajar producción
- ✅ QA manual cerrada en `Presentación` para el caso crítico del asesor: blur vacío sin crash, bloqueo correcto al finalizar y sin duplicados
- ✅ `AsistentesSection` — modo explícito por formulario: `Profesional RECA + Asesor Agencia` o `Profesional RECA + asistentes libres`
- ✅ `ProfesionalCombobox` — busca en tabla `profesionales`, auto-llena cargo
- ✅ `useProfesionalesCatalog` + `useAsesoresCatalog` — caché por pestaña (TTL 5 min) para catálogos reutilizados
- ✅ `DictationButton` — dictado con OpenAI `gpt-4o-mini-transcribe` via edge function `dictate-transcribe`
- ✅ `LongFormShell` — shell compartido para formularios largos con navegación lateral, tarjetas colapsables y estado de borrador
- ✅ Módulos puros reutilizables para formularios largos — `src/lib/longFormHydration.ts`, `src/lib/presentacionHydration.ts`, `src/lib/sensibilizacionHydration.ts`, `src/lib/presentacionSections.ts` y `src/lib/sensibilizacionSections.ts`
- ✅ Formularios largos: navegación lateral desktop que acompaña el documento
- ✅ Formularios largos: textareas extensos autoexpandibles sin scroll interno
- ✅ `FormField` — wrapper label + input + error + hint
- ✅ Hub persistente en `/hub` con drawer de borradores, deep link `?panel=drafts` y apertura de actas en nuevas pestañas
- ✅ Hub de borradores unificado (local + Supabase) con contador low-egress basado en metadata
- ✅ Apertura segura de borradores ya bloqueados con modal previo y reutilización de locks cliente-only

### APIs disponibles
- ✅ `POST /api/formularios/presentacion` — flujo completo Sheets + PDF + Supabase
- ✅ `POST /api/formularios/sensibilizacion` — flujo Sheets + Supabase, sin PDF
- ✅ `GET /api/asesores` — catálogo de asesores desde tabla `asesores` con cache headers privados
- ✅ `GET /api/profesionales` — lista de profesionales RECA desde tabla `profesionales` con cache headers privados
- ✅ `POST /api/auth/lookup` — lookup de `usuario_login` para auth

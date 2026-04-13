# Memory Index — RECA Inclusión Laboral (Web)

Leer **solo el archivo relevante** para la tarea actual. No leer todos en cada sesión.

| Archivo | Cuándo leerlo |
|---|---|
| [user_profile.md](user_profile.md) | Primera sesión o si hay dudas sobre el contexto del usuario |
| [architecture.md](architecture.md) | Antes de agregar cualquier componente, ruta o decisión técnica nueva |
| [roadmap.md](roadmap.md) | **Al inicio de cada sesión** — dice qué sigue y en qué fase estamos |
| [forms_catalog.md](forms_catalog.md) | Al trabajar en cualquier formulario específico |
| [supabase_integration.md](supabase_integration.md) | Al trabajar con auth, datos o API routes de Supabase |
| [google_integration.md](google_integration.md) | Al trabajar con Google Sheets o Google Drive |
| [migration_reference.md](migration_reference.md) | Al migrar un formulario desde el proyecto Tkinter original |
| [notion_workflow.md](notion_workflow.md) | Al documentar en Notion, abrir una nueva sesión de trabajo o registrar fases/QA |

---

## Contexto rápido (leer siempre)

- **Proyecto:** Reescritura web de app Tkinter de gestión de formularios de inclusión laboral
- **Stack:** Next.js 16 + Tailwind v4 + Supabase + Google Sheets/Drive + OpenAI Whisper
- **Restricción crítica:** $0 infra — todo free tier
- **Dev:** Solo developer + Codex como equipo
- **Fase actual:** UX/UI — queda pendiente solo el pulido visual mobile (`fade-out` en tabs horizontales de `Presentación`). La fase de `Confirmación y transición` ya quedó aprobada en QA.
- **Estado reportado por usuario:** QA manual aprobó la fase de confirmación/transición en preview `dduz5rtqg`: `Presentación` y `Sensibilización` muestran confirmación antes de publicar, login ahora mantiene transición visible hacia el hub y el guardado manual de borrador ya no devuelve al tope de la página. La fase de claridad de borradores ya estaba aprobada en `fsl4gpq39` y los borradores críticos siguen cerrados desde `7cplunvc9`.
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
- ✅ Ruta dinámica `/formularios/[slug]` → renderiza `Section1Form`
- ✅ `/formularios/[slug]/seccion-2` → despacha al componente por slug

### Formulario Presentación/Reactivación (`presentacion`) — base funcional completa, en hardening para MVP piloto ✅
- ✅ Documento largo en una sola página sobre `/formularios/presentacion`
- ✅ Secciones visibles: empresa, datos de la visita, motivación, acuerdos y observaciones, asistentes
- ✅ Búsqueda y selección de empresa integrada dentro del mismo documento
- ✅ Navegación lateral por secciones en desktop + navegación compacta en móvil
- ✅ Flujo Google Sheets: copia template → escribe celdas → checkboxes → PDF → Drive
- ✅ Guarda en `formatos_finalizados_il` en Supabase
- ✅ Pantalla de éxito con links al Sheet y PDF

### Formulario Sensibilización (`sensibilizacion`) — COMPLETO ✅
- ✅ Wizard 5 pasos: datos empresa, temas, observaciones, registro fotográfico, asistentes
- ✅ API `POST /api/formularios/sensibilizacion`
- ✅ Flujo Google Sheets: hoja 8 → observaciones + asistentes → PDF → Drive
- ✅ Guarda en `formatos_finalizados_il` en Supabase

### Features reutilizables (disponibles para todos los formularios)
- ✅ `useFormDraft` hook — autosave local-first por sesión/acta + checkpoints remotos low-egress con promoción lazy `session -> draft` + bloqueo multi-pestaña
- ✅ Ciclo de drafts endurecido: alias `session -> draft`, proyección única para hub+contador, timeout visible de guardado manual, purga completa local/remota al finalizar o borrar y retorno al hub sin depender de `window.opener`
- ✅ QA manual ya validó en `Presentación`: warning antes de recargar/cerrar, recuperación del mismo draft tras reload, ausencia de duplicados en el caso probado de cierre con operación colgada, contador consistente y limpieza correcta después de finalizar con éxito
- ✅ Ajuste aplicado en formularios: el submit inválido ya no hace `reset(...)` ni espera el guardado del borrador dentro de `handleSubmit`; el checkpoint ocurre en background para evitar que `Finalizar` quede colgado cuando falla validación
- ✅ Hub canónico: al abrir un borrador desde el drawer ahora se limpia `?panel=drafts`, por lo que refrescar el hub debe volver a `/hub`
- ✅ CSP de preview: `https://vercel.live` se habilita solo en previews de Vercel para eliminar el warning del script de feedback sin relajar producción
- ✅ QA manual cerrada en `Presentación` para el caso crítico del asesor: blur vacío sin crash, bloqueo correcto al finalizar y sin duplicados
- ✅ `AsistentesSection` — fila Profesional RECA (combobox + auto-cargo) + fila Asesor Agencia con catálogo editable y normalización
- ✅ `ProfesionalCombobox` — busca en tabla `profesionales`, auto-llena cargo
- ✅ `useProfesionalesCatalog` + `useAsesoresCatalog` — caché por pestaña (TTL 5 min) para catálogos reutilizados
- ✅ `DictationButton` — dictado con OpenAI `gpt-4o-mini-transcribe` via edge function `dictate-transcribe`
- ✅ `FormWizard` — barra de progreso multi-paso
- ✅ Formularios largos: navegación lateral desktop que acompaña el documento
- ✅ Formularios largos: textareas extensos autoexpandibles sin scroll interno
- ✅ `FormField` — wrapper label + input + error + hint
- ✅ Hub persistente en `/hub` con drawer de borradores, deep link `?panel=drafts` y apertura de actas en nuevas pestañas
- ✅ Hub de borradores unificado (local + Supabase) con contador low-egress basado en metadata
- ✅ Apertura segura de borradores ya bloqueados con modal previo y reutilización de locks cliente-only

### APIs disponibles
- ✅ `POST /api/formularios/presentacion` — flujo completo Sheets + PDF + Supabase
- ✅ `POST /api/formularios/sensibilizacion` — flujo completo Sheets + PDF + Supabase
- ✅ `GET /api/asesores` — catálogo de asesores desde tabla `asesores` con cache headers privados
- ✅ `GET /api/profesionales` — lista de profesionales RECA desde tabla `profesionales` con cache headers privados
- ✅ `POST /api/auth/lookup` — lookup de `usuario_login` para auth

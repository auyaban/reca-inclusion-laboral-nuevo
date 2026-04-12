---
name: Arquitectura del proyecto
description: Decisiones arquitectónicas, patrones usados y cómo está estructurado el código
type: architecture
updated: 2026-04-12
---

## Stack completo

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server + client en un repo, API routes gratis en Vercel |
| Estilos | Tailwind CSS v4 | Utility-first, compatible con shadcn/ui |
| Componentes UI | shadcn/ui | Accesibles, personalizables, no opinionados |
| Formularios | React Hook Form + Zod | Validación tipada, mínimo re-render |
| Auth + DB | Supabase | Free tier, Auth + Postgres + Edge Functions |
| Google APIs | Next.js API Routes | Reemplaza FastAPI — sin servidor extra, $0 |
| Estado global | Zustand | Simple, sin boilerplate de Redux, sessionStorage |
| Dictado de voz | OpenAI `gpt-4o-mini-transcribe` via Supabase Edge Function | Alta calidad, reutiliza secret existente en Supabase |
| Iconos | lucide-react | Ligero, consistente con shadcn/ui |
| Deploy | Vercel | Free tier, deploy automático desde GitHub |

---

## Decisiones de arquitectura

### 1. No hay backend separado (sin FastAPI)
Toda la lógica server-side vive en **Next.js API Routes** (`src/app/api/`).
Esto elimina la necesidad de un servidor FastAPI en Render ($7/mes) → $0.

### 2. Supabase JS directo desde el cliente para auth y lectura
El frontend llama a Supabase directamente para:
- `supabase.auth.signInWithPassword()` — login
- `supabase.from('empresas').select()` — búsqueda de empresas
- `supabase.from('form_drafts').upsert()` — borradores (via hook)

Las escrituras críticas (Google Sheets, Drive) pasan por API Routes para proteger las credenciales del service account.

### 3. Un formulario = Un componente
Cada formulario es un componente React independiente en `src/components/forms/`.
Esto resuelve el problema del monolito Tkinter (20k líneas en app.py).

### 4. Wizard de secciones como componente reutilizable
`FormWizard` maneja la barra de progreso y navegación entre secciones.
Cada formulario le pasa sus secciones como props — no hay lógica de wizard duplicada.

### 5. Validación Zod en frontend Y en API route
El schema Zod se define una vez en `src/lib/validations/<form>.ts` y se usa en:
- React Hook Form (validación client-side)
- API Route (validación server-side antes de escribir a Supabase/Sheets)

### 6. Autosave dual: localStorage + Supabase
- **localStorage** (`autosave()`): guardado instantáneo con debounce de 800ms. Sobrevive recargas de página en el mismo dispositivo. Sin latencia de red.
- **Supabase `form_drafts`** (`saveDraft()`): persistencia remota. El usuario hace clic en "Guardar borrador" explícitamente. Permite continuar desde otro dispositivo.
- Al abrir un formulario con borrador remoto: `DraftBanner` ofrece Restaurar o Descartar.
- Al finalizar el formulario: `clearDraft()` elimina ambas copias.

### 7. Dictado de voz via Supabase Edge Function
No se usa la Web Speech API del browser (calidad inconsistente).
Se usa el modelo OpenAI `gpt-4o-mini-transcribe` via la Edge Function `dictate-transcribe` en Supabase.
- El componente `DictationButton` graba audio con `MediaRecorder` (formato webm/ogg)
- Al parar: obtiene JWT de la sesión Supabase → envía `multipart/form-data` a `/functions/v1/dictate-transcribe`
- La transcripción se **añade** (append) al valor actual del textarea
- La API key de OpenAI vive como secret en Supabase, no en el frontend

---

## Componentes compartidos reutilizables

Ubicación: `src/components/forms/shared/`

### `AsistentesSection`
Sección de asistentes usada en **todos los formularios**.
- Fila 0 (badge morado "Profesional RECA"): combobox de profesionales + cargo auto-llenado
- Filas intermedias: texto libre (nombre + cargo), con botón eliminar
- Última fila (badge ámbar "Asesor Agencia"): texto libre pre-labelled
- Botón "Agregar" inserta filas antes de la última
- Mínimo 2 filas, máximo 10
- Props: `control, register, setValue, watch, errors` (typed `any` para evitar conflictos con RHF generics), `profesionales`, `profesionalAsignado`

### `ProfesionalCombobox`
Autocomplete para seleccionar profesionales RECA desde tabla `profesionales`.
- Filtra por `nombre_profesional` (búsqueda case-insensitive)
- `onCargoChange` callback auto-rellena el campo cargo del formulario
- Cierra el dropdown al hacer clic fuera (via `mousedown` listener)

### `DictationButton`
Botón de dictado de voz para campos de texto.
- Graba con `MediaRecorder` API del browser
- Envía audio a Edge Function `dictate-transcribe` con JWT de sesión
- Añade la transcripción al valor actual del campo (append, no reemplaza)
- Props: `onTranscript: (text: string) => void`

---

## Hooks compartidos reutilizables

### `useFormDraft` (`src/hooks/useFormDraft.ts`)
Hook de autosave + borradores para todos los formularios.
```typescript
const {
  hasDraft,       // boolean — existe borrador remoto
  draftMeta,      // { step, data, empresa_nombre, updated_at }
  savingDraft,    // boolean — loading state
  draftSavedAt,   // Date | null
  autosave,       // (step, data) => void — debounced 800ms a localStorage
  loadLocal,      // () => DraftMeta | null — lee localStorage
  saveDraft,      // async (step, data) => boolean — persiste en Supabase
  clearDraft,     // async () => void — elimina local + remoto
} = useFormDraft({ slug, empresaNit, empresaNombre })
```

### `useAuth` (`src/hooks/useAuth.ts`)
Expone `user`, `session`, `loading`, `signOut()`.

---

## APIs disponibles

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/formularios/presentacion` | POST | Flujo completo: Sheets + PDF + Drive + Supabase |
| `/api/profesionales` | GET | Lista de profesionales desde tabla `profesionales` |
| `/api/auth/lookup` | POST | Lookup de `usuario_login` para auth |

---

## Flujo de datos de un formulario

```
Usuario llena formulario
    ↓
watch() → autosave() → localStorage (debounce 800ms)
    ↓ (opcional, click del usuario)
saveDraft() → Supabase form_drafts
    ↓ (submit final)
React Hook Form valida con Zod (client-side)
    ↓
onSubmit → fetch POST /api/formularios/[slug]
    ↓
API Route valida de nuevo con Zod (server-side)
    ↓
┌─────────────────────────────────────────┐
│  Google Sheets: copia template + escribe │
│  Drive: exporta PDF + sube a carpeta    │
│  Supabase upsert en formatos_finalizados │
└─────────────────────────────────────────┘
    ↓
clearDraft() → elimina localStorage + form_drafts
    ↓
Pantalla de éxito con links al Sheet y PDF
```

---

## Estructura de rutas

```
/                          ← Login (no autenticado)
/hub                       ← Menú principal (requiere auth)
/formularios/[slug]        ← Section 1: buscar empresa (requiere auth)
/formularios/[slug]/seccion-2  ← Formulario principal (requiere auth + empresa en store)
```

**Protección:** `src/proxy.ts` (nombre usado en lugar de middleware.ts por convención del proyecto).

---

## Variables de entorno

Archivo: `.env.local` (nunca commitear)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...  # formato nuevo
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Solo server-side

# Google (el JSON del service account en una sola línea, sin saltos de línea)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_SHEETS_MASTER_ID=1Gom7jSNE5TJkGBQ1wQrjPbcgyc6Pv8EwavythP9f4kU
# Drive folders (uno por tipo de formulario)
GOOGLE_DRIVE_FOLDER_PRESENTACION=<folder-id>

# Rate limit distribuido (solo producción)
UPSTASH_REDIS_REST_URL=https://<upstash-instance>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
```

⚠️ `GOOGLE_SERVICE_ACCOUNT_JSON` debe ser JSON en una sola línea. Si Vercel lo muestra con error, re-pegar el contenido del archivo `.json` directamente en el campo de Vercel (sin comillas externas).

---

## Tabla Supabase de referencia

Tablas conocidas y confirmadas:

| Tabla | Descripción |
|---|---|
| `empresas` | Empresas visitadas (1134 registros) |
| `profesionales` | Profesionales RECA — `nombre_profesional`, `cargo_profesional`, `email` |
| `formatos_finalizados_il` | Actas finalizadas de todos los formularios |
| `form_drafts` | Borradores de formularios (autosave remoto) |

---

## Google Sheets — Hoja maestra

**ID:** `1Gom7jSNE5TJkGBQ1wQrjPbcgyc6Pv8EwavythP9f4kU`

**Patrón:** Cada acta completada crea un nuevo tab en la hoja maestra duplicando el tab plantilla correspondiente y escribiendo los datos en celdas específicas (notación A1).

Los mapeos exactos de columna están en cada módulo del proyecto Tkinter:
`C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\<nombre>\<nombre>.py`

---

## Update 2026-04-07

Esta nota reemplaza cualquier referencia anterior a `DraftBanner`, `upsert` por empresa o una fila final de asesor puramente libre.

- `useFormDraft` ahora modela multiples borradores por acta. El draft activo se identifica por `id`, expone `matchingDrafts` y `allDrafts`, y `clearDraft()` elimina solo el borrador activo.
- `form_drafts` deja de diseñarse como `user + formulario + empresa` unico. El flujo nuevo guarda `empresa_snapshot`, soporta `loadDraft(draftId)` y permite abrir borradores desde `/hub/borradores`.
- Al entrar a `/formularios/[slug]/seccion-2` sin `draft`, la app consulta borradores coincidentes y muestra un selector contextual para reanudar uno o crear una acta nueva.
- El hub principal ahora muestra `Borradores (N)` y existe una vista dedicada en `/hub/borradores`.
- `AsistentesSection` ahora usa un combobox editable para la fila `Asesor Agencia`, alimentado por `GET /api/asesores`, con texto libre y normalizacion del nombre.

## Guardrails de mantenimiento

- `useFormDraft` y `lib/drafts` son zonas criticas. Si vuelven a crecer mezclando identidad, locks, storage local y sync remota, extraer helpers o modulos antes de agregar mas comportamiento.
- La persistencia local no debe fallar en silencio. Cualquier degradacion de IndexedDB debe exponer estado explicito para que la UI pueda comunicar "solo local" o una falla recuperable.
- Los nombres base de tabs y plantillas de Google Sheets no deben dispersarse en routes, tests y helpers. Centralizarlos en constantes compartidas.
- Integraciones transversales reutilizables no deben forkearse por formulario. Si dictado, borradores, resultados de finalizacion o estados de persistencia se repiten, convertirlos en componente o helper compartido.
- Los entrypoints compartidos actuales para este frente son `DictationButton`, `FormCompletionActions` y `useFormDraftLifecycle`. Extenderlos antes de duplicar logica en formularios nuevos.
- En Next.js 16 la convencion valida del proyecto es `src/proxy.ts`; no reintroducir `middleware.ts` salvo una migracion deliberada.
- Las dependencias acopladas al framework deben mantenerse alineadas por version objetivo del repo. En este proyecto `next` y `eslint-config-next` deben coincidir por version exacta, y `react`, `react-dom`, `@types/react` y `@types/react-dom` deben compartir major.
- La verificacion de alineacion ya no es manual: usar `npm run check:framework` y mantenerla en CI para bloquear drift antes de merge.
- El lockfile es la referencia operativa de instalaciones reproducibles y CI debe seguir usando `npm ci`, no `npm install`.
- La cobertura minima de tests debe priorizar logica pura de borradores, reconciliacion e integraciones con retry, no solo payload builders y helpers de Sheets.
- La CSP vive en `next.config.ts` pero debe construirse desde un helper testeable. `connect-src` debe mantenerse alineado con `NEXT_PUBLIC_SUPABASE_URL` y su origen realtime para no romper auth, edge functions ni Realtime.
- `/api/auth/lookup` no debe depender de rate limiting en memoria en `production`. La politica del repo es fail-closed: si Upstash no esta configurado o falla, el endpoint responde `503` generico en lugar de degradar silenciosamente.
- Las queries de Google Drive deben escapar valores mediante helper compartido y validar `id` y campos obligatorios de la respuesta antes de asumir que Google devolvio un recurso utilizable.

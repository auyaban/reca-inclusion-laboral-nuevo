---
name: Arquitectura del proyecto
description: Decisiones arquitectónicas, patrones usados y cómo está estructurado el código
type: architecture
updated: 2026-04-07
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

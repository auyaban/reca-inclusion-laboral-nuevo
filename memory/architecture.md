---
name: Arquitectura del proyecto
description: Decisiones arquitectónicas, patrones usados y cómo está estructurado el código
type: architecture
updated: 2026-04-04
---

## Stack completo

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server + client en un repo, API routes gratis en Vercel |
| Estilos | Tailwind CSS v4 | Utility-first, compatible con shadcn/ui |
| Componentes UI | shadcn/ui | Accesibles, personalizables, no opinionados |
| Formularios | React Hook Form + Zod | Validación tipada, mínimo re-render |
| Auth + DB | Supabase | Ya existe, free tier, Auth + Postgres + Realtime |
| Google APIs | Next.js API Routes | Reemplaza FastAPI — sin servidor extra, $0 |
| Estado global | Zustand (a instalar en Fase 2) | Simple, sin boilerplate de Redux |
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

---

## Flujo de datos de un formulario

```
Usuario llena formulario
    ↓
React Hook Form valida con Zod (client-side)
    ↓
onSubmit → fetch POST /api/formularios/[slug]
    ↓
API Route valida de nuevo con Zod (server-side)
    ↓
┌─────────────────────────────┐
│  Supabase upsert (datos)     │ → tabla: actas_<formulario>
│  Google Sheets write         │ → master spreadsheet
│  (Drive upload — Fase 6)     │ → carpeta Drive empresa
└─────────────────────────────┘
    ↓
Response: { success: true, acta_id: "..." }
    ↓
Router push → /hub (con toast de éxito)
```

---

## Estructura de rutas

```
/                          ← Login (no autenticado)
/hub                       ← Menú principal (requiere auth)
/formularios/[slug]        ← Formulario dinámico (requiere auth + empresa)
/formularios/[slug]/editar/[id]  ← Editar acta existente (TODO - Fase 5+)
```

**Middleware:** `src/middleware.ts` protege todas las rutas excepto `/`.

---

## Patrón de componentes de formulario

```tsx
// src/components/forms/[Form]Form.tsx

"use client"

// 1. Schema Zod (importado de lib/validations/)
// 2. Tipo TypeScript inferido del schema
// 3. Array de secciones con sus campos
// 4. Componente con useForm + zodResolver
// 5. Wizard de secciones
// 6. onSubmit → fetch a API route
```

---

## Variables de entorno

Archivo: `.env.local` (nunca commitear)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Solo server-side

# Google (el JSON del service account stringificado)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_SHEETS_MASTER_ID=1Gom7jSNE5TJkGBQ1wQrjPbcgyc6Pv8EwavythP9f4kU
```

---

## Tabla Supabase de referencia

> ⚠️ Pendiente: generar tipos TypeScript con Supabase CLI
> Comando: `npx supabase gen types typescript --project-id <id> > src/types/supabase.ts`

Tablas conocidas (del proyecto Tkinter original):
- `empresas` — datos de las empresas visitadas
- `actas_*` — una tabla por tipo de formulario (por confirmar nombre exacto)
- `usuarios` — gestionados por Supabase Auth

---

## Google Sheets — Hoja maestra

**ID:** `1Gom7jSNE5TJkGBQ1wQrjPbcgyc6Pv8EwavythP9f4kU`

**Patrón:** Cada acta completada crea un nuevo tab en la hoja maestra duplicando el tab plantilla correspondiente y escribiendo los datos en celdas específicas (notación A1).

Los mapeos exactos de columna están en cada módulo del proyecto Tkinter:
`C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\<nombre>\<nombre>.py`

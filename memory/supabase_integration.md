---
name: Integración con Supabase
description: Cómo conectar auth, leer y escribir datos en Supabase desde Next.js
type: integration
updated: 2026-04-21
---

## Setup inicial

### 1. Dependencias (ya instaladas)
```bash
@supabase/supabase-js   # cliente JS
@supabase/ssr           # helpers para Next.js App Router
```

### 2. Variables de entorno en `.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...  # formato nuevo (NO anon JWT)
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # privada, SOLO en API routes
```

**Dónde encontrar estos valores:**
Supabase Dashboard → Project → Settings → API

---

## Workflow operativo en este repo

### CLI local del repo

No asumir un binario global `supabase` en PATH. En este proyecto el flujo soportado es:

```bash
npm run supabase:doctor
npm run supabase:query -- --linked "select 1 as ok"
npm run supabase:migration:list -- --linked
```

Notas:
- `npm run supabase:query` usa el CLI repo-local instalado en `node_modules`
- el proyecto ya usa la carpeta `supabase/` y su estado de link queda en `supabase/.temp/`
- `supabase login` usa PAT / `SUPABASE_ACCESS_TOKEN`; **no** usa `SUPABASE_SERVICE_ROLE_KEY`

### Queries server-side con `service_role`

Para inspeccionar datos aunque el login del CLI o el MCP fallen, usar el helper local:

```bash
npm run supabase:table -- --table public.empresas --select "nombre_empresa,nit_empresa" --limit 5
npm run supabase:table -- --table public.form_drafts --select "id,form_slug,updated_at" --eq user_id=<uuid>
```

Notas:
- este helper usa `@supabase/supabase-js` + `SUPABASE_SERVICE_ROLE_KEY`
- sirve para queries de tablas/PostgREST, no para autenticar CLI o MCP
- al correr en Node local bypassa RLS, asi que tratarlo como herramienta administrativa

### MCP del repo

El repo incluye `.mcp.json` con el proyecto scopeado:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=zvhjosktmfisryqcjxbh&read_only=true"
    }
  }
}
```

Notas:
- el MCP hospedado sigue autenticando por OAuth o PAT
- `SUPABASE_SERVICE_ROLE_KEY` no autentica el MCP
- el config local queda en `read_only=true` para reducir riesgo sobre datos reales

---

## Cliente browser (componentes client-side)

**Archivo:** `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

**Uso en componentes:**
```typescript
"use client"
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
await supabase.auth.signInWithPassword({ email, password })
```

---

## Cliente server (API Routes y Server Components)

**Archivo:** `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

---

## Admin client (solo en API routes — service role)

Para operaciones que requieren bypassear RLS:

```typescript
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## Middleware de protección de rutas

**Archivo:** `src/proxy.ts` (nombre del proyecto — funciona igual que middleware.ts)

Protege `/hub` y `/formularios/*`. Redirige a login si no hay sesión activa.

---

## Tablas Supabase confirmadas

| Tabla | Descripción | Columnas clave |
|---|---|---|
| `empresas` | Empresas visitadas (1134 registros) | `nombre_empresa`, `nit`, `ciudad`, `sede`, `profesional_asignado` |
| `profesionales` | Profesionales RECA | `nombre_profesional`, `cargo_profesional`, `email`, `usuario_login` |
| `formatos_finalizados_il` | Actas finalizadas de todos los formularios | `form_slug`, `empresa_nit`, `empresa_nombre`, `user_id`, `data jsonb`, `sheet_url`, `pdf_url` |
| `form_drafts` | Borradores (autosave remoto) | ver esquema abajo |

---

## Tabla `form_drafts` — Esquema completo

```sql
CREATE TABLE form_drafts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_slug   text NOT NULL,
  empresa_nit text NOT NULL,
  empresa_nombre text,
  step        integer NOT NULL DEFAULT 0,
  data        jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Un borrador por usuario × formulario × empresa
CREATE UNIQUE INDEX form_drafts_unique
  ON form_drafts (user_id, form_slug, empresa_nit);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_form_drafts_updated_at
  BEFORE UPDATE ON form_drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: cada usuario solo ve y modifica sus propios borradores
ALTER TABLE form_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus borradores"
  ON form_drafts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios crean sus borradores"
  ON form_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios modifican sus borradores"
  ON form_drafts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus borradores"
  ON form_drafts FOR DELETE USING (auth.uid() = user_id);
```

---

## Tabla `profesionales` — Uso

```typescript
// En API route GET /api/profesionales
const admin = createAdmin(url, serviceKey)
const { data } = await admin
  .from("profesionales")
  .select("nombre_profesional, cargo_profesional")
  .order("nombre_profesional")

// Retorna: [{ nombre_profesional: "Ana García", cargo_profesional: "Profesional de Inclusión" }, ...]
```

---

## Edge Functions — Supabase

### `dictate-transcribe`
Transcripción de audio con OpenAI.

```typescript
// Cómo llamarla desde el cliente:
const { data: { session } } = await supabase.auth.getSession()
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const form = new FormData()
form.append("audio", audioBlob, "recording.webm")

const res = await fetch(`${SUPABASE_URL}/functions/v1/dictate-transcribe`, {
  method: "POST",
  headers: { Authorization: `Bearer ${session!.access_token}` },
  body: form,
})
const { text } = await res.json()
// text = transcripción del audio
```

La API key de OpenAI vive como secret en Supabase Edge Functions — no se expone al cliente.

---

## Patrones de queries frecuentes

### Buscar empresa
```typescript
const { data } = await supabase
  .from('empresas')
  .select('*')
  .ilike('nombre_empresa', `%${query}%`)
  .limit(10)
```

### Upsert de borrador (hook useFormDraft)
```typescript
await supabase.from('form_drafts').upsert(
  { user_id, form_slug, empresa_nit, empresa_nombre, step, data },
  { onConflict: 'user_id,form_slug,empresa_nit' }
)
```

### Guardar acta finalizada
```typescript
await supabase.from('formatos_finalizados_il').upsert({
  user_id: session.user.id,
  form_slug: 'presentacion',
  empresa_nit,
  empresa_nombre,
  data: formPayload,
  sheet_url,
  pdf_url,
})
```

### Obtener actas de una empresa
```typescript
const { data } = await supabase
  .from('formatos_finalizados_il')
  .select('*')
  .eq('empresa_nit', nit)
  .order('created_at', { ascending: false })
```

---

## Update 2026-04-07

El modelo vigente de `form_drafts` ya no es `user_id + form_slug + empresa_nit` unico. La migracion actual espera este esquema operativo:

```sql
ALTER TABLE form_drafts
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS empresa_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP INDEX IF EXISTS form_drafts_unique;

CREATE INDEX IF NOT EXISTS form_drafts_user_updated_at_idx
  ON form_drafts (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS form_drafts_user_form_empresa_updated_at_idx
  ON form_drafts (user_id, form_slug, empresa_nit, updated_at DESC);
```

Notas de comportamiento:
- `id` es la identidad publica del borrador (`draftId`).
- `empresa_snapshot` permite abrir borradores desde el hub sin depender de Section 1.
- `saveDraft()` ahora hace `insert` para actas nuevas y `update ... where id = draftId` para actas existentes.
- `clearDraft()` y `deleteDraft()` eliminan por `id`, no por combinacion empresa/formulario.
- Existe `GET /api/asesores` para poblar el combobox editable del asesor de agencia.

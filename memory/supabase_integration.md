---
name: Integración con Supabase
description: Cómo conectar auth, leer y escribir datos en Supabase desde Next.js
type: integration
updated: 2026-04-04
---

## Setup inicial (Fase 1)

### 1. Dependencias (ya instaladas)
```bash
@supabase/supabase-js   # cliente JS
@supabase/ssr           # helpers para Next.js App Router
```

### 2. Variables de entorno en `.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...    # pública, segura para el browser
SUPABASE_SERVICE_ROLE_KEY=eyJ...         # privada, SOLO en API routes
```

**Dónde encontrar estos valores:**
Supabase Dashboard → Project → Settings → API

---

## Cliente browser (componentes client-side)

**Archivo:** `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

## Middleware de protección de rutas

**Archivo:** `src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirigir a login si no hay sesión en rutas protegidas
  if (!user && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirigir al hub si ya hay sesión y van al login
  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/hub', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Tablas Supabase conocidas

> ⚠️ Pendiente confirmar nombres exactos consultando el proyecto Supabase original

| Tabla | Descripción | Referencia en Tkinter |
|---|---|---|
| `empresas` | Empresas visitadas | `common._find_cached_company_row` |
| `actas_sensibilizacion` | Actas del formulario de sensibilización | Por confirmar |
| `actas_evaluacion` | Evaluación de accesibilidad | Por confirmar |
| `actas_condiciones` | Condiciones de la vacante | Por confirmar |
| `actas_seleccion` | Selección incluyente | Por confirmar |
| `actas_contratacion` | Contratación incluyente | Por confirmar |
| `actas_induccion_org` | Inducción organizacional | Por confirmar |
| `actas_induccion_op` | Inducción operativa | Por confirmar |
| `actas_seguimientos` | Seguimientos | Confirmado en `seguimientos.py` |

**Comando para generar tipos TypeScript:**
```bash
npx supabase gen types typescript --project-id <project-ref> > src/types/supabase.ts
```

---

## Patrones de queries frecuentes

### Buscar empresa
```typescript
const { data } = await supabase
  .from('empresas')
  .select('*')
  .ilike('nombre', `%${query}%`)
  .limit(10)
```

### Upsert de acta
```typescript
const { data, error } = await supabase
  .from('actas_sensibilizacion')
  .upsert({ ...payload, updated_at: new Date().toISOString() })
  .select()
  .single()
```

### Obtener actas de una empresa
```typescript
const { data } = await supabase
  .from('actas_sensibilizacion')
  .select('*')
  .eq('empresa_id', empresaId)
  .order('created_at', { ascending: false })
```

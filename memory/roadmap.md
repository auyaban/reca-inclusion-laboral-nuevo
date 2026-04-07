---
name: Roadmap de implementación
description: Plan paso a paso de todo lo que queda por construir, en orden de dependencia
type: roadmap
updated: 2026-04-04
---

## Fase 0 — Completada ✅

- [x] Setup Next.js 16 + TypeScript + Tailwind v4
- [x] Paleta de colores RECA (#81398A) en globals.css
- [x] Dependencias: Supabase JS, React Hook Form, Zod, lucide-react, shadcn utils
- [x] Página de login (`/`) — UI completa con validación Zod
- [x] Hub / menú principal (`/hub`) — 9 tarjetas de formularios
- [x] Estructura de carpetas del proyecto
- [x] Documentación: CLAUDE.md + archivos memory/

---

## Fase 1 — Autenticación con Supabase ✅ COMPLETA

- [x] `.env.local` con URL y publishable key (formato `sb_publishable_...`, NO anon JWT)
- [x] `src/lib/supabase/client.ts` — cliente browser con `@supabase/ssr`
- [x] `src/lib/supabase/server.ts` — cliente server con cookies
- [x] `src/middleware.ts` — protege `/hub` y `/formularios/*`, redirige si hay sesión en `/`
- [x] `src/hooks/useAuth.ts` — expone `user`, `session`, `loading`, `signOut()`
- [x] `LoginForm.tsx` — conectado con `signInWithPassword()`, redirige a `/hub`
- [x] `HubMenu.tsx` — nombre de usuario desde sesión, logout funcional

**Pendiente manual:** agregar `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (Dashboard > Settings > API)

---

## Fase 2 — Búsqueda de empresa (Section 1) ✅ COMPLETA

**Objetivo:** Replicar `Section1Window` de Tkinter — buscar empresa en Supabase antes de abrir cualquier formulario.

### 2.1 Componente Section1Form ✅
- [x] Input de búsqueda con debounce (300ms)
- [x] Llama a Supabase: `SELECT * FROM empresas WHERE nombre_empresa ILIKE '%query%'`
- [x] Lista de resultados con selección (nombre, NIT, ciudad, sede)
- [x] Al seleccionar: guarda empresa en store Zustand y navega a seccion-2

### 2.2 Estado global de empresa seleccionada ✅
- [x] Zustand instalado
- [x] Store: `src/lib/store/empresaStore.ts` — persiste en `sessionStorage`

### 2.3 Flujo de navegación ✅
- [x] `src/middleware.ts` — protege `/hub` y `/formularios/*`, redirige si hay sesión en `/`
- [x] `src/app/formularios/[slug]/page.tsx` — ruta dinámica que renderiza Section1Form
- [x] Al seleccionar empresa → navega a `/formularios/[slug]/seccion-2` (se construye en Fase 4)

---

## Fase 3 — Componentes UI base (shadcn/ui) ✅ COMPLETA

- [x] shadcn/ui inicializado con Tailwind v4
- [x] Button, Input, Textarea, Select, Checkbox, Label, Badge, Alert
- [x] `src/components/ui/FormField.tsx` — wrapper label+input+error+hint
- [x] `src/components/layout/FormWizard.tsx` — barra de progreso multi-paso

---

## Fase 4 — Formulario piloto: Presentación/Reactivación del Programa ✅ COMPLETA

- [x] Schema Zod: `src/lib/validations/presentacion.ts`
- [x] `PresentacionForm.tsx`: wizard 4 pasos (datos empresa, motivación, acuerdos, asistentes)
- [x] Ruta `/formularios/[slug]/seccion-2` con despacho por slug
- [x] API route `POST /api/formularios/presentacion` → guarda en `formatos_finalizados_il`
- [x] `empresaStore` expandido con todos los campos del formulario
- [ ] API Google Sheets (pendiente — Fase 4.4)

---

## Fase 4-ORIGINAL — Primer formulario piloto: Sensibilización

**Objetivo:** Un formulario completo de punta a punta como plantilla para los demás.

**Por qué Sensibilización primero:** Es el más simple (~5 campos), sin lógica compleja.

### 4.1 Schema Zod
- Leer `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\sensibilizacion\sensibilizacion.py`
- Extraer todos los campos y sus validaciones
- Crear `src/lib/validations/sensibilizacion.ts`

### 4.2 Componente del formulario
- `src/components/forms/SensibilizacionForm.tsx`
- Secciones en wizard (usar FormWizard)
- Autosave a localStorage en cada cambio de sección
- Validación inline con React Hook Form

### 4.3 API Route: guardar en Supabase
- `src/app/api/formularios/sensibilizacion/route.ts`
- POST: upsert en tabla Supabase correspondiente

### 4.4 API Route: exportar a Google Sheets
- `src/app/api/sheets/sensibilizacion/route.ts`
- Replicar lógica de `sensibilizacion.py:export_to_sheets()`

### 4.5 Flujo completo
```
Section1Form (empresa) → SensibilizacionForm → API Supabase + API Sheets → Confirmación
```

---

## Fase 5 — Migrar los 8 formularios restantes

**Orden sugerido** (de menor a mayor complejidad):

| # | Formulario | Complejidad |
|---|---|---|
| 1 | Sensibilización | ⭐ Más simple — PILOTO (Fase 4) |
| 2 | Inducción Operativa | ⭐⭐ |
| 3 | Inducción Organizacional | ⭐⭐ |
| 4 | Presentación del Programa | ⭐⭐ |
| 5 | Evaluación de Accesibilidad | ⭐⭐⭐ |
| 6 | Contratación Incluyente | ⭐⭐⭐ |
| 7 | Selección Incluyente | ⭐⭐⭐ |
| 8 | Condiciones de la Vacante | ⭐⭐⭐⭐ Más complejo |
| 9 | Seguimientos | ⭐⭐⭐⭐ Lógica especial (sub-registros) |

**Para cada formulario, el proceso es:**
1. Leer `formularios/<nombre>/<nombre>.py` en el repo original
2. Extraer campos + validaciones → schema Zod
3. Extraer mapeo a columnas Sheets → API route
4. Construir componente React con wizard
5. Testear flujo completo

---

## Fase 6 — Google Drive (subida de PDFs)

**Objetivo:** Replicar `drive_upload.py` — generar PDF del acta y subirlo a Drive.

### Opciones técnicas:
- **Opción A:** `jsPDF` o `react-pdf` en el browser → subir a Drive via API route
- **Opción B:** Supabase Edge Function (Deno) que genera y sube el PDF
- **Decisión pendiente** — evaluar en esta fase

**Archivos a crear:**
- `src/app/api/drive/upload/route.ts`
- `src/lib/google/drive.ts`

---

## Fase 7 — Borradores y autosave

**Objetivo:** Replicar `drafts.json` — guardar progreso de formulario sin perder datos.

### Implementación:
- `localStorage` para persistir borradores por formulario + empresa
- Hook `useAutosave` que guarda cada 30s y en cada cambio de sección
- Indicador visual "Guardado automáticamente hace X segundos"
- Al entrar a un formulario: detectar borrador existente y ofrecer recuperarlo

**Archivos a crear:**
- `src/hooks/useAutosave.ts`
- `src/lib/drafts.ts` — helpers de lectura/escritura en localStorage

---

## Fase 8 — Deploy en Vercel

**Objetivo:** App en producción accesible desde cualquier laptop del equipo.

### Pasos:
1. Crear cuenta en Vercel (gratis)
2. Conectar repo GitHub
3. Configurar variables de entorno en Vercel dashboard
4. Deploy automático en cada push a `main`
5. Configurar dominio custom (opcional — Vercel da subdominio gratis)

### Variables de entorno a configurar en Vercel:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_SHEETS_MASTER_ID
```

---

## Fase 9 — Pulido y features adicionales

- Dictado de voz (migrar `dictation.py` → Supabase Edge Function)
- Revisión ortográfica (migrar `text_review.py` → Edge Function)
- Notificaciones de formularios pendientes
- Vista de historial de actas por empresa
- Modo offline básico (service worker para borradores)

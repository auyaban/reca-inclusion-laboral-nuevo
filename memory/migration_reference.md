---
name: Referencia de migración desde Tkinter
description: Guía para traducir código Python/Tkinter a React/TypeScript
type: reference
updated: 2026-04-04
---

## Repositorio original

**Ruta:** `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`

**No tocar** — está en producción. Solo leer para migrar.

---

## Equivalencias Tkinter → React

| Tkinter (original) | React (nuevo) |
|---|---|
| `app.py` (20k líneas) | Dividido en componentes individuales |
| `Section1Window` | `Section1Form.tsx` |
| `HubWindow` | `HubMenu.tsx` ✅ |
| `<Form>Window` | `<Form>Form.tsx` |
| `FormMousewheelMixin` | Scroll nativo del browser |
| `_wizard_*` functions | `FormWizard.tsx` componente |
| `ui_feedback.py` | React Hook Form + clases de error en CSS |
| `finalize_validation.py` | Schema Zod |
| `drafts.json` | `localStorage` + `useAutosave` hook |
| `supabase_write_queue.json` | API Route síncrona (sin queue — conexión garantizada en web) |
| `drive_upload_queue.json` | API Route con retry (Fase 6) |
| `_dpapi_encrypt/decrypt` | Cookies httpOnly gestionadas por Supabase Auth |
| `FORM_CACHE` dict | Estado de React Hook Form |
| `_run_async_ui_task` | `async/await` + estado `isSubmitting` de RHF |
| `LoadingDialog` | Spinner en botón de submit |
| `user_messages.py` | Mensajes inline en el schema Zod |

---

## Proceso de migración de un formulario

### Paso 1: Leer el formulario original
```bash
# En el repo original:
cat "C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\<nombre>\<nombre>.py"
```

Buscar y anotar:
- [ ] Nombre de cada campo (variables de Python)
- [ ] Tipo de cada campo (texto, select, fecha, checkbox, número)
- [ ] Validaciones (`validate_before_finalize`)
- [ ] Mapeo de celdas (`SHEET_COLUMN_MAP` o similar)
- [ ] Número de secciones del wizard

### Paso 2: Crear schema Zod
```typescript
// src/lib/validations/<nombre>.ts
import { z } from 'zod'

export const nombreSchema = z.object({
  // Un campo por campo del formulario Tkinter
  empresa_nombre: z.string().min(1, 'Campo obligatorio'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  // ...
})

export type NombreValues = z.infer<typeof nombreSchema>
```

### Paso 3: Crear el componente
```typescript
// src/components/forms/<Nombre>Form.tsx
"use client"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { nombreSchema, type NombreValues } from '@/lib/validations/nombre'
// ...
```

### Paso 4: Crear la API Route
```typescript
// src/app/api/formularios/<nombre>/route.ts
// POST: valida + upsert Supabase + escribe Sheets
```

### Paso 5: Crear la ruta de página
```typescript
// src/app/formularios/<slug>/page.tsx
import { NombreForm } from '@/components/forms/NombreForm'
export default function NombrePage() {
  return <NombreForm />
}
```

---

## Tipos de campos frecuentes en los formularios

| Campo Tkinter | Componente React | Validación Zod |
|---|---|---|
| `tk.Entry` | `<Input>` | `z.string().min(1)` |
| `tk.Text` (multilinea) | `<Textarea>` | `z.string().min(1)` |
| `ttk.Combobox` (opciones fijas) | `<Select>` | `z.enum([...])` |
| `tk.Checkbutton` | `<Checkbox>` | `z.boolean()` |
| Fecha (DateEntry) | `<Input type="date">` | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` |
| Número | `<Input type="number">` | `z.number().min(0)` |
| Selección múltiple | Grupo de `<Checkbox>` | `z.array(z.string()).min(1)` |

---

## Sección 1 — Campos comunes a todos

Estos campos están en TODOS los formularios como "Sección 1":

```typescript
const section1Schema = z.object({
  empresa_nit:          z.string().min(1, 'NIT obligatorio'),
  empresa_nombre:       z.string().min(1, 'Nombre de empresa obligatorio'),
  empresa_direccion:    z.string().optional(),
  empresa_ciudad:       z.string().min(1, 'Ciudad obligatoria'),
  empresa_telefono:     z.string().optional(),
  contacto_nombre:      z.string().min(1, 'Nombre del contacto obligatorio'),
  contacto_cargo:       z.string().optional(),
  contacto_correo:      z.string().email().optional(),
  fecha_visita:         z.string().min(1, 'Fecha de visita obligatoria'),
  profesional_reca:     z.string().min(1),  // viene del usuario autenticado
})
```

---

## Notas de migración importantes

1. **Cola offline:** En Tkinter hay una cola JSON para escrituras offline. En la web no es necesario — si no hay internet, el submit simplemente falla con un error claro. El autosave en `localStorage` protege los datos del usuario.

2. **DPAPI:** La encriptación de credenciales en Windows no aplica en web. Supabase Auth maneja las sesiones con cookies httpOnly seguras.

3. **Voice/Dictation:** `dictation.py` usa OpenAI STT via Supabase Edge Function. Se puede migrar en Fase 9 — no es bloqueante.

4. **Labs windows** (`CondicionesVacanteLabsWindow`, `SeleccionIncluyenteLabsWindow`): Son variantes experimentales. Migrar las versiones normales primero.

5. **Mapeo de celdas Sheets:** Los mapeos en los `.py` originales son en notación A1 (`"B5"`, `"C12"`, etc.). Son directamente compatibles con la API de Google Sheets — no hay que traducir nada.

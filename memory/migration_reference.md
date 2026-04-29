---
name: Referencia de migración desde Tkinter
description: Guía para traducir código Python/Tkinter a React/TypeScript
type: reference
updated: 2026-04-14
---

## Repositorio original

**Ruta:** `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`

**No tocar** — está en producción. Solo leer para migrar.

---

## Equivalencias Tkinter → React

| Tkinter (original) | React (nuevo) |
|---|---|
| `app.py` (20k líneas) | Dividido en componentes individuales |
| `Section1Window` | `Section1Form.tsx` ✅ |
| `HubWindow` | `HubFormatsHome.tsx` dentro de `HubShell.tsx` ✅ |
| `<Form>Window` | `<Form>Form.tsx` |
| `FormMousewheelMixin` | Scroll nativo del browser |
| `_wizard_*` functions | `LongFormShell` + navegación por secciones para formularios largos; wizard legacy solo si el formulario aún no ha migrado |
| `ui_feedback.py` | React Hook Form + clases de error en CSS |
| `finalize_validation.py` | Schema Zod |
| `drafts.json` | `localStorage` (autosave) + `form_drafts` Supabase (borrador remoto) via `useFormDraft` ✅ |
| `supabase_write_queue.json` | API Route síncrona (sin queue — conexión garantizada en web) |
| `drive_upload_queue.json` | API Route síncrona (integrado en mismo endpoint) |
| `_dpapi_encrypt/decrypt` | Cookies httpOnly gestionadas por Supabase Auth |
| `FORM_CACHE` dict | Estado de React Hook Form |
| `_run_async_ui_task` | `async/await` + estado `isSubmitting` de RHF |
| `LoadingDialog` | Spinner en botón de submit |
| `user_messages.py` | Mensajes inline en el schema Zod |
| `dictation.py` (OpenAI STT) | `DictationButton` componente + Edge Function `dictate-transcribe` ✅ |
| Sección de asistentes | `AsistentesSection` componente reutilizable ✅ |
| Combobox de profesionales | `ProfesionalCombobox` componente ✅ |

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
- [ ] Estructura final del formulario: documento largo o wizard temporal

### Paso 2: Crear schema Zod
```typescript
// src/lib/validations/<nombre>.ts
import { z } from 'zod'

export const nombreSchema = z.object({
  // Campos del formulario...
  empresa_nombre: z.string().min(1, 'Campo obligatorio'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),

  // SIEMPRE al final: asistentes
  asistentes: z.array(z.object({
    nombre: z.string(),
    cargo:  z.string(),
  })).min(2, 'Se requieren al menos 2 asistentes'),
})

export type NombreValues = z.infer<typeof nombreSchema>
```

### Paso 3: Crear el componente
```typescript
// src/components/forms/<Nombre>Form.tsx
"use client"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEmpresaStore } from '@/lib/store/empresaStore'
import { useFormDraft } from '@/hooks/useFormDraft'
import { AsistentesSection } from './shared/AsistentesSection'
import { DictationButton } from './shared/DictationButton'
import { LongFormShell } from './shared/LongFormShell'
import { LongFormSectionCard } from './shared/LongFormSectionCard'
import { nombreSchema, type NombreValues } from '@/lib/validations/nombre'

export function NombreForm() {
  const empresa = useEmpresaStore(s => s.empresa)
  const [profesionales, setProfesionales] = useState([])

  const { hasDraft, draftMeta, autosave, saveDraft, clearDraft, savingDraft } =
    useFormDraft({ slug: '<nombre>', empresaNit: empresa?.nit ?? '', empresaNombre: empresa?.nombre })

  const form = useForm<NombreValues>({
    resolver: zodResolver(nombreSchema),
    defaultValues: {
      // ...
      asistentes: [
        { nombre: empresa?.profesional_asignado ?? '', cargo: '' },
        { nombre: '', cargo: 'Asesor Agencia' },
      ],
    },
  })

  // Autosave en cada cambio
  useEffect(() => {
    const sub = form.watch((data) => autosave(currentStep, data as any))
    return () => sub.unsubscribe()
  }, [form.watch, autosave, currentStep])

  // Cargar profesionales
  useEffect(() => {
    fetch('/api/profesionales').then(r => r.json()).then(setProfesionales)
  }, [])

  async function onSubmit(values: NombreValues) {
    const res = await fetch('/api/formularios/<nombre>', {
      method: 'POST', body: JSON.stringify(values),
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) {
      await clearDraft()
      // mostrar pantalla de éxito
    }
  }

  return (
    <LongFormShell>
      {/* DraftBanner si hay borrador */}
      {hasDraft && draftMeta && (
        <DraftBanner
          meta={draftMeta}
          onRestore={() => form.reset(draftMeta.data)}
          onDiscard={() => clearDraft()}
        />
      )}

      <LongFormSectionCard title="Asistentes" status="idle">
        <AsistentesSection
          control={form.control}
          register={form.register}
          setValue={form.setValue}
          watch={form.watch}
          errors={form.formState.errors}
          profesionales={profesionales}
          profesionalAsignado={empresa?.profesional_asignado}
        />
      </LongFormSectionCard>
    </LongFormShell>
  )
}
```

### Paso 4: Crear la API Route
```typescript
// src/app/api/formularios/<nombre>/route.ts
import { NextResponse } from 'next/server'
import { nombreSchema } from '@/lib/validations/nombre'
import { createClient } from '@/lib/supabase/server'
// Importar helpers de Google Sheets/Drive (ver PresentacionForm como referencia)

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = nombreSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // 1. Google Sheets: copiar template + escribir celdas
  // 2. Drive: exportar PDF + subir
  // 3. Supabase: upsert en formatos_finalizados_il
  // Ver /api/formularios/presentacion/route.ts como plantilla

  return NextResponse.json({ success: true, sheetUrl, pdfUrl })
}
```

### Paso 5: Registrar la ruta
```typescript
// src/app/formularios/[slug]/seccion-2/page.tsx
// Agregar case al switch/dispatch:
case 'nombre':
  return <NombreForm />
```

---

## Componentes reutilizables disponibles

### `AsistentesSection`
**Siempre en el último paso** de todos los formularios.
```typescript
import { AsistentesSection } from '@/components/forms/shared/AsistentesSection'

<AsistentesSection
  control={form.control}
  register={form.register}
  setValue={form.setValue}
  watch={form.watch}
  errors={form.formState.errors}
  profesionales={profesionales}       // array de { nombre_profesional, cargo_profesional }
  profesionalAsignado={empresa?.profesional_asignado}  // pre-carga fila 0
/>
```

### `DictationButton`
**Para campos textarea** con texto largo.
```typescript
import { DictationButton } from '@/components/forms/shared/DictationButton'

<div className="relative">
  <Textarea {...register('motivacion')} />
  <DictationButton
    onTranscript={(text) => {
      const current = form.getValues('motivacion') ?? ''
      form.setValue('motivacion', current + (current ? ' ' : '') + text)
    }}
  />
</div>
```

### `useFormDraft`
**En todos los formularios** para autosave y borradores.
```typescript
import { useFormDraft } from '@/hooks/useFormDraft'

const { hasDraft, draftMeta, autosave, saveDraft, clearDraft, savingDraft, draftSavedAt } =
  useFormDraft({ slug: 'mi-formulario', empresaNit: empresa.nit, empresaNombre: empresa.nombre })
```

---

## Tipos de campos frecuentes en los formularios

| Campo Tkinter | Componente React | Validación Zod |
|---|---|---|
| `tk.Entry` | `<Input>` | `z.string().min(1)` |
| `tk.Text` (multilinea) | `<Textarea>` + `DictationButton` | `z.string().min(1)` |
| `ttk.Combobox` (opciones fijas) | `<Select>` | `z.enum([...])` |
| `tk.Checkbutton` | `<Checkbox>` | `z.boolean()` |
| Fecha (DateEntry) | `<Input type="date">` | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` |
| Número | `<Input type="number">` | `z.number().min(0)` |
| Selección múltiple | Grupo de `<Checkbox>` | `z.array(z.string()).min(1)` |
| Combobox de profesionales RECA | `ProfesionalCombobox` via `AsistentesSection` | parte del schema asistentes |

---

## Notas de migración importantes

1. **Cola offline:** En Tkinter hay una cola JSON para escrituras offline. En la web no es necesario — si no hay internet, el submit falla con error claro. `useFormDraft` protege los datos del usuario con autosave local.

2. **DPAPI:** La encriptación de credenciales en Windows no aplica en web. Supabase Auth maneja las sesiones con cookies httpOnly seguras.

3. **Voice/Dictation:** Migrado ✅. Usa `DictationButton` + Edge Function `dictate-transcribe` (OpenAI `gpt-4o-mini-transcribe`). La API key de OpenAI vive en Supabase secrets.

4. **Labs windows** (`CondicionesVacanteLabsWindow`, `SeleccionIncluyenteLabsWindow`): Son variantes experimentales. Migrar las versiones normales primero.

5. **Mapeo de celdas Sheets:** Los mapeos en los `.py` originales son en notación A1 (`"B5"`, `"C12"`, etc.). Son directamente compatibles con la API de Google Sheets — no hay que traducir nada.

6. **Asistentes:** En todos los formularios la sección de asistentes es la misma. Siempre usar `AsistentesSection`. El valor por defecto es:
   ```typescript
   asistentes: [
     { nombre: empresa.profesional_asignado, cargo: '' },  // fila 0 — auto-cargo
     { nombre: '', cargo: 'Asesor Agencia' },               // última fila siempre
   ]
   ```

7. **Profesionales lista:** Cargar con `GET /api/profesionales` al montar el formulario. Pasar el array a `AsistentesSection`.

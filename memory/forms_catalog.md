---
name: Catálogo de formularios
description: Los 9 formularios de inclusión laboral, su estado de migración y referencia al código original
type: reference
updated: 2026-04-07
---

## Estado de migración

| Formulario | Slug URL | Archivo original (Tkinter) | UI | API | Sheets | Estado |
|---|---|---|---|---|---|---|
| Presentación/Reactivación | `presentacion` | `formularios/presentacion_programa/` | ✅ | ✅ | ✅ | **COMPLETO** |
| Sensibilización | `sensibilizacion` | `formularios/sensibilizacion/sensibilizacion.py` | ✅ | ✅ | ✅ | **COMPLETO** |
| Inducción Operativa | `induccion-operativa` | `formularios/induccion_operativa/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Inducción Organizacional | `induccion-organizacional` | `formularios/induccion_organizacional/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Evaluación de Accesibilidad | `evaluacion` | `formularios/evaluacion_programa/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Contratación Incluyente | `contratacion` | `formularios/contratacion_incluyente/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Selección Incluyente | `seleccion` | `formularios/seleccion_incluyente/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Condiciones de la Vacante | `condiciones-vacante` | `formularios/condiciones_vacante/condiciones_vacante.py` | ⏳ | ⏳ | ⏳ | Pendiente |
| Seguimientos | `seguimientos` | `formularios/seguimientos/` | ⏳ | ⏳ | ⏳ | Pendiente (lógica especial) |

---

## Formulario completado: Presentación/Reactivación ✅

**Slug:** `presentacion`
**Archivo original:** `formularios/presentacion_programa/`

### Secciones (wizard 4 pasos):
1. **Datos de la empresa** — confirmación de datos pre-llenados desde `empresaStore`
2. **Motivación** — textarea con dictado de voz (`DictationButton`)
3. **Acuerdos** — checkboxes de compromisos
4. **Asistentes** — `AsistentesSection` con profesional RECA + asesor agencia

### Flujo de envío:
```
PresentacionForm → POST /api/formularios/presentacion
    → Google Sheets: copia template "presentacion" → escribe celdas → checkboxes
    → Drive: exporta Sheet como PDF → sube a carpeta de la empresa
    → Supabase: upsert en formatos_finalizados_il
    → clearDraft()
    → Pantalla de éxito con link al Sheet y al PDF
```

---

## Formulario completado: Sensibilización ✅

**Slug:** `sensibilizacion`
**Archivo original:** `formularios/sensibilizacion/sensibilizacion.py`

### Secciones (wizard 5 pasos):
1. **Datos de la empresa** — confirmación de datos pre-llenados desde `empresaStore`
2. **Temas de sensibilización** — paso informativo con contenido fijo del template
3. **Observaciones** — textarea con dictado de voz (`DictationButton`)
4. **Registro fotográfico** — paso informativo reservado en el acta
5. **Asistentes** — `AsistentesSection` con profesional RECA + asesor agencia

### Flujo de envío:
```
SensibilizacionForm → POST /api/formularios/sensibilizacion
    → Google Sheets: copia template → escribe sección 1, observaciones y asistentes
    → Drive: exporta Sheet como PDF → sube a carpeta de la empresa
    → Supabase: insert en formatos_finalizados_il
    → clearDraft()
    → Pantalla de éxito con link al Sheet y al PDF
```

---

## Estructura común de todos los formularios

Todos los formularios del proyecto Tkinter siguen el mismo patrón:

```python
# En cada formularios/<nombre>/<nombre>.py:

SHEET_COLUMN_MAP = {
    "campo_nombre": "B5",  # mapeo a celda en Google Sheets
    ...
}

def validate_before_finalize(cache: dict) -> list[ValidationIssue]:
    """Validaciones antes de enviar."""
    ...

def export_to_sheets(cache: dict, sheet_service, spreadsheet_id: str):
    """Escribe los datos en la hoja maestra."""
    ...
```

**Al migrar cada formulario:**
1. Leer el `.py` original
2. Extraer `SHEET_COLUMN_MAP` → usar en la API Route de Sheets
3. Extraer validaciones → schema Zod
4. Extraer campos de la UI de Tkinter → componente React con componentes reutilizables

---

## Checklist por formulario (usar al migrar)

Para cada formulario nuevo, usar estos componentes ya disponibles:

- [ ] Schema Zod en `src/lib/validations/<slug>.ts`
  - Incluir `asistentes: z.array(z.object({ nombre, cargo }))` al final
- [ ] `<Nombre>Form.tsx` con:
  - [ ] `useFormDraft({ slug, empresaNit, empresaNombre })` para autosave
  - [ ] `DraftBanner` si `hasDraft && draftMeta`
  - [ ] `FormWizard` para progreso multi-paso
  - [ ] `DictationButton` en campos de texto largos
  - [ ] `AsistentesSection` en el último paso
  - [ ] `clearDraft()` en `onSubmit` exitoso
- [ ] API route `POST /api/formularios/<slug>` con:
  - [ ] Validación Zod server-side
  - [ ] Google Sheets: copiar template + escribir celdas
  - [ ] Drive: PDF + subir
  - [ ] Supabase: upsert en `formatos_finalizados_il`
- [ ] Agregar case en el dispatcher de `/formularios/[slug]/seccion-2/page.tsx`
- [ ] Testear flujo completo

---

## Sección 1 (compartida por todos los formularios)

La **Sección 1** es igual en todos los formularios: busca o confirma la empresa visitada.

En Tkinter: `Section1Window`
En React: `Section1Form` (ya construido) → datos guardados en `empresaStore` (Zustand)

**Datos disponibles en `empresaStore` al llegar a seccion-2:**
- `nit`, `nombre`, `ciudad`, `direccion`, `telefono`, `sede`
- `contacto_nombre`, `contacto_cargo`, `contacto_correo`
- `profesional_asignado` (nombre del profesional RECA asignado a la empresa)

---

## Formulario especial: Seguimientos

**Archivo original:** `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\seguimientos\`

**Particularidad:** Sub-registros — múltiples seguimientos por empresa/trabajador. Requiere lógica adicional de listado y edición.

En Tkinter: `SeguimientosWindow` + `SeguimientoEditorWindow`
En React: Necesitará una vista de listado + modal/página de edición.

**Dejar para el final** (último formulario en Fase 5).

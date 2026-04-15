---
name: Catálogo de formularios
description: Los 9 formularios de inclusión laboral, su estado de migración y referencia al código original
type: reference
updated: 2026-04-14
---

## Estado de migración

| Formulario | Slug URL | Archivo original (Tkinter) | UI | API | Sheets | Estado |
|---|---|---|---|---|---|---|
| Presentación/Reactivación | `presentacion` | `formularios/presentacion_programa/` | ✅ | ✅ | ✅ | **Referencia canónica / lista para piloto** |
| Sensibilización | `sensibilizacion` | `formularios/sensibilizacion/sensibilizacion.py` | ✅ | ✅ | ✅ | **Lista para producción / baseline reutilizable** |
| Inducción Operativa | `induccion-operativa` | `formularios/induccion_operativa/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Inducción Organizacional | `induccion-organizacional` | `formularios/induccion_organizacional/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Evaluación de Accesibilidad | `evaluacion` | `formularios/evaluacion_programa/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Contratación Incluyente | `contratacion` | `formularios/contratacion_incluyente/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Selección Incluyente | `seleccion` | `formularios/seleccion_incluyente/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Condiciones de la Vacante | `condiciones-vacante` | `formularios/condiciones_vacante/condiciones_vacante.py` | ⏳ | ⏳ | ⏳ | Pendiente |
| Seguimientos | `seguimientos` | `formularios/seguimientos/` | ⏳ | ⏳ | ⏳ | Pendiente (lógica especial) |

---

## Formulario de referencia: Presentación/Reactivación ✅

**Slug:** `presentacion`
**Archivo original:** `formularios/presentacion_programa/`

### Patrón actual:
Documento largo de una sola página con:

1. **Empresa** — búsqueda y confirmación integradas dentro del mismo documento
2. **Datos de la visita** — fecha, modalidad, tipo de visita
3. **Motivación** — selección de motivaciones
4. **Acuerdos y observaciones** — bloque narrativo largo
5. **Asistentes** — `AsistentesSection` en modo `Profesional RECA + Asesor Agencia`

Además incluye:

- navegación lateral por secciones
- estados de sección (`idle/active/completed/error`)
- borradores endurecidos con estado visual
- confirmación previa a finalizar
- pantalla final homogénea

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

## Formulario baseline reutilizable: Sensibilización ✅

**Slug:** `sensibilizacion`
**Archivo original:** `formularios/sensibilizacion/sensibilizacion.py`

### Estado actual:
1. **Empresa** — búsqueda, selección o snapshot readonly dentro del mismo documento
2. **Datos de la visita** — fecha y modalidad
3. **Observaciones** — textarea con dictado de voz (`DictationButton`)
4. **Asistentes** — `AsistentesSection` en modo `Profesional RECA + asistentes libres`

Nota de parity con maestro:
- `Empresa` ya muestra el resumen completo del bloque inicial del maestro: `fecha_visita`, `modalidad`, `nombre_empresa`, `ciudad_empresa`, `direccion_empresa`, `nit_empresa`, `correo_1`, `telefono_empresa`, `contacto_empresa`, `cargo`, `asesor` y `sede_empresa`.
- `Datos de la visita` conserva los campos editables `fecha_visita`, `modalidad` y `nit_empresa`; el resumen de `Empresa` se sincroniza con esos valores actuales.
- El `SECTION_1_MAP` del route de `Sensibilizacion` sigue alineado con la plantilla viva (`D7:N12`); el ajuste reciente fue de representacion en la webapp, no de escritura en Sheets.

### Estado frente al estándar productivo:

- ya usa el shell canónico de documento largo con navegación lateral y secciones colapsables
- ya pasó QA manual completa de apertura, guardado, takeover entre pestañas, asistentes libres, restore y finalización
- S3 ya cerró el contrato de asistentes significativos, la navegación de validación y el restore/checkpoint determinista
- S4 ya cerró la política explícita de asistentes y la cobertura automática mínima del shell largo
- ya no tiene fases pendientes internas; queda como baseline operativo para la siguiente migración

### Política reusable de asistentes

- `Presentación/Reactivación` usa `Profesional RECA + Asesor Agencia`
- `Sensibilización` usa `Profesional RECA + asistentes libres`
- `Condiciones de la Vacante` queda documentado desde ya para migrarse con `Profesional RECA + Asesor Agencia`
- ningún formulario nuevo debe asumir un modo por defecto; debe declararlo explícitamente al montar `AsistentesSection`

### Flujo de envío:
```
SensibilizacionForm → POST /api/formularios/sensibilizacion
    → Google Sheets: prepara archivo de empresa → escribe sección 1, observaciones y asistentes
    → Supabase: insert en formatos_finalizados_il
    → clearDraft()
    → Pantalla de éxito con link al Sheet
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
- [ ] `getDefault<Nombre>Values()` + `normalize<Nombre>Values()` con tests
- [ ] `src/lib/<slug>Sections.ts` con IDs, labels, completitud y compatibilidad `step -> section`
- [ ] `src/lib/<slug>Hydration.ts` con restore/redirect del editor; reutilizar `src/lib/longFormHydration.ts` si encaja
- [ ] helper `get<Nombre>ValidationTarget()` con tests
- [ ] `<Nombre>Form.tsx` con:
  - [ ] patrón de documento largo en una sola página
  - [ ] `LongFormShell` + `LongFormSectionCard` + `LongFormSectionNav`
  - [ ] navegación lateral por secciones
  - [ ] `useFormDraft(...)` para autosave y persistencia remota
  - [ ] `DraftPersistenceStatus` para estado visible de guardado
  - [ ] `DraftLockBanner` para apertura segura de borradores bloqueados
  - [ ] `DictationButton` en campos de texto largos
  - [ ] `AsistentesSection` con `mode` explícito
  - [ ] `FormSubmitConfirmDialog` antes de publicar
  - [ ] `FormCompletionActions` en la pantalla final
  - [ ] `clearDraft()` en `onSubmit` exitoso
- [ ] API route `POST /api/formularios/<slug>` con:
  - [ ] Validación Zod server-side
  - [ ] Google Sheets: copiar template + escribir celdas
  - [ ] Drive: PDF + subir, solo si ese formulario realmente lo necesita
  - [ ] Supabase: upsert en `formatos_finalizados_il`
- [ ] Agregar case en el dispatcher de `/formularios/[slug]/seccion-2/page.tsx`
- [ ] Ejecutar QA funcional + QA de regresión del estándar productivo

Ver también: `memory/form_production_standard.md`

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

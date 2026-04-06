---
name: Catálogo de formularios
description: Los 9 formularios de inclusión laboral, su estado de migración y referencia al código original
type: reference
updated: 2026-04-04
---

## Estado de migración

| Formulario | Slug URL | Archivo original (Tkinter) | UI | API | Sheets | Estado |
|---|---|---|---|---|---|---|
| Presentación del Programa | `presentacion` | `formularios/presentacion_programa/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Evaluación de Accesibilidad | `evaluacion` | `formularios/evaluacion_programa/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Condiciones de la Vacante | `condiciones-vacante` | `formularios/condiciones_vacante/condiciones_vacante.py` | ⏳ | ⏳ | ⏳ | Pendiente |
| Selección Incluyente | `seleccion` | `formularios/seleccion_incluyente/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Contratación Incluyente | `contratacion` | `formularios/contratacion_incluyente/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Inducción Organizacional | `induccion-organizacional` | `formularios/induccion_organizacional/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Inducción Operativa | `induccion-operativa` | `formularios/induccion_operativa/` | ⏳ | ⏳ | ⏳ | Pendiente |
| Sensibilización | `sensibilizacion` | `formularios/sensibilizacion/sensibilizacion.py` | ⏳ | ⏳ | ⏳ | **Fase 4 — Piloto** |
| Seguimientos | `seguimientos` | `formularios/seguimientos/` | ⏳ | ⏳ | ⏳ | Pendiente |

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
4. Extraer campos de la UI de Tkinter → componente React

---

## Sección 1 (compartida por todos los formularios)

La **Sección 1** es igual en todos los formularios: busca o confirma la empresa visitada.

En Tkinter: `Section1Window` (app.py línea ~5874)
En React: `Section1Form` — componente compartido que se muestra antes de cualquier formulario.

**Campos de Sección 1:**
- NIT de la empresa
- Nombre de la empresa
- Dirección
- Ciudad
- Teléfono
- Nombre del contacto
- Cargo del contacto
- Correo del contacto
- Fecha de visita
- Profesional RECA (usuario autenticado)

---

## Formulario piloto: Sensibilización

**Archivo original:** `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\sensibilizacion\sensibilizacion.py`

**Por qué es el piloto:** Es el formulario más sencillo, con menos secciones y campos.

**Secciones típicas:**
- Sección 1: Datos de la empresa (compartida — Section1Form)
- Sección 2: Datos de la actividad de sensibilización
- Sección 3: Participantes y evidencias

**Al construir el piloto, establecer los patrones que se replican en los demás:**
- Schema Zod con todas las validaciones
- Componente con FormWizard
- API Route con validación server-side
- Escritura a Supabase
- Escritura a Google Sheets
- Autosave con useAutosave hook
- Toast de éxito al finalizar

---

## Formulario especial: Seguimientos

**Archivo original:** `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\seguimientos\`

**Particularidad:** Este formulario tiene sub-registros — múltiples seguimientos por empresa/trabajador. Requiere lógica adicional de listado y edición.

En Tkinter: `SeguimientosWindow` + `SeguimientoEditorWindow`
En React: Necesitará una vista de listado + modal/página de edición.

**Dejar para el final** (Fase 5, último formulario).

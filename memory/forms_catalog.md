---
name: Catálogo de formularios
description: Los 9 formularios de inclusión laboral, su estado de migración y referencia al código original
type: reference
updated: 2026-04-19
---

## Estado de migración

| Formulario | Slug URL | Archivo original (Tkinter) | UI | API | Sheets | Estado |
|---|---|---|---|---|---|---|
| Presentación/Reactivación | `presentacion` | `formularios/presentacion_programa/` | ✅ | ✅ | ✅ | **Producción / referencia canónica** |
| Sensibilización | `sensibilizacion` | `formularios/sensibilizacion/sensibilizacion.py` | ✅ | ✅ | ✅ | **Producción / baseline reutilizable** |
| Inducción Operativa | `induccion-operativa` | `formularios/induccion_operativa/` | ✅ | ✅ | ✅ | Producción; path especial de inducciones activo |
| Inducción Organizacional | `induccion-organizacional` | `formularios/induccion_organizacional/` | ✅ | ✅ | ✅ | Producción; path especial de inducciones activo |
| Evaluación de Accesibilidad | `evaluacion` | `formularios/evaluacion_programa/` | ✅ | ✅ | ✅ | Preview vigente; tarjeta habilitada en hub |
| Contratación Incluyente | `contratacion` | `formularios/contratacion_incluyente/` | ✅ | ✅ | ✅ | Producción base; follow-ups locales pendientes |
| Selección Incluyente | `seleccion` | `formularios/seleccion_incluyente/` | ✅ | ✅ | ✅ | Producción base; follow-ups locales pendientes |
| Condiciones de la Vacante | `condiciones-vacante` | `formularios/condiciones_vacante/condiciones_vacante.py` | ✅ | ✅ | ✅ | Producción; sin frente activo abierto |
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

## Migracion local productiva: Evaluacion de Accesibilidad

**Slug:** `evaluacion`
**Archivo original:** `formularios/evaluacion_programa/`

> Estado actual (`2026-04-19`): formulario largo productivo en preview vigente, con tarjeta habilitada en `/hub`, publicación solo a Google Sheets y pantalla final únicamente con `sheetLink`.

### Estado actual

- ya usa documento largo completo sobre `/formularios/evaluacion`
- ya renderiza las 91 preguntas de `2.1` a `3` desde descriptor declarativo
- `section_4` calcula resumen cliente, porcentajes, nivel sugerido y descripcion derivada
- `section_5` ya es productiva con 9 items fijos, `nota` readonly, `aplica` editable y `ajustes` readonly
- `section_8` mantiene el modo `reca_plus_agency_advisor`
- `Finalizar` ya usa dialogo compartido, polling de confirmacion y pantalla final solo con `sheetLink`
- la tarjeta del hub ya quedó habilitada y el corte vigente sigue en preview

### Finalizacion actual

```
EvaluacionForm → POST /api/formularios/evaluacion
    → reviewFinalizationText sobre narrativas editables
    → Google Sheets: prepara archivo de empresa + conserva visible `2.1 EVALUACION FOTOS`
    → escribe `2. EVALUACION DE ACCESIBILIDAD` con `section_4`, `section_5` y asistentes normalizados
    → Supabase: insert en `formatos_finalizados_il`
    → clearDraft()
    → Pantalla de exito con link al Sheet
```

### Decisiones cerradas en F4

- no genera PDF en este corte
- `2.1 EVALUACION FOTOS` se preserva como hoja auxiliar visible, pero no recibe payload web
- `W61:W69` sigue fuera del contrato y del adapter
- `Solicitar interprete` sigue fuera de alcance
- `F5` ya cerro la decision de exposicion y la tarjeta del hub quedo habilitada

---

## Migraciones locales listas para QA: Contratación y Selección

### Contratación Incluyente

- `contratacion` ya quedó montado como documento largo productivo sobre el patrón modular del repo.
- Estructura actual: `Empresa`, `Desarrollo de la actividad`, `Vinculados`, `Ajustes y recomendaciones`, `Asistentes`.
- `desarrollo_actividad` vive en la raíz del formulario y `vinculados` usa `RepeatedPeopleSection`.
- `Contratacion` ya consume `usuarios_reca`: lookup manual por cédula dentro de cada card, botón explícito `Cargar datos`, precarga de campos mapeados y highlight amarillo cuando el usuario modifica campos cargados desde `usuarios_reca`.
- Finalización actual: `POST /api/formularios/contratacion` → hoja `5. CONTRATACIÓN INCLUYENTE` + PDF + registro en `formatos_finalizados_il`.
- Finalización adicional: sync best-effort a `usuarios_reca` con la fila final del vinculado y empresa asociada (`empresa_nit`, `empresa_nombre`).
- `Contratacion` ya tiene smoke E2E local en Playwright para gate, repetibles, lookup por cédula y sync de dropdowns prefijados.

### Selección Incluyente

- `seleccion` ya quedó montado como documento largo productivo sobre la misma infraestructura compartida.
- Estructura actual: `Empresa`, `Desarrollo de la actividad`, `Oferentes`, `Ajustes y recomendaciones`, `Asistentes`.
- `desarrollo_actividad` vive en la raíz del formulario, `oferentes` usa `RepeatedPeopleSection` y `section_5` mantiene `ajustes_recomendaciones` + `nota` con helpers legacy.
- `Seleccion` ahora también consume `usuarios_reca`: lookup manual por cédula dentro de cada card, `Cargar/Reemplazar datos`, snapshot cargado fuera del payload validado y highlight amarillo cuando el valor final diverge del snapshot.
- Las reglas legacy de sync para dropdowns prefijados de `Seleccion` ya quedaron extraídas a `src/lib/seleccionPrefixedDropdowns.ts` y cubiertas con tests.
- `Seleccion` ahora centraliza sus 22 statements operativos en `src/lib/seleccionAdjustmentLibrary.ts`, agrupados por categoría, con sugerencias universales y sugerencias por discapacidad detectada desde los oferentes.
- `SeleccionRecommendationsSection` mantiene los botones legacy, pero ahora los organiza por categoría, muestra contexto/preview de contenido y permite insertar grupos o ajustes puntuales sin duplicar texto.
- `RepeatedPeopleSection` ya usa watch por fila para `Seleccion`, reduciendo recomputos globales cuando hay múltiples oferentes y dejando el flujo de add/remove/collapse más estable para QA manual y Playwright.
- Finalización actual: `POST /api/formularios/seleccion` → hoja `4. SELECCIÓN INCLUYENTE` + PDF + registro en `formatos_finalizados_il`.
- Finalización adicional: sync best-effort a `usuarios_reca` con el subset legacy de datos del oferente.
- `Seleccion` ya tiene smoke E2E local en Playwright para gate, repetibles, lookup por cédula, sync de dropdowns prefijados y botón `Test`.

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

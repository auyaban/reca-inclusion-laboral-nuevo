# Plan de trabajo — Migración ODS al módulo nuevo

> Documento vivo. Es la guía maestra del Product Owner para la migración ODS.
> Cualquier dev que vaya a tomar trabajo aquí debe leer este archivo entero antes de pedir tickets.
> Las decisiones se versionan en la sección **Histórico de decisiones** al final.

- **Autor:** Dev Junior (revisado por PO)
- **Owner humano:** Aaron Uyaban
- **Fecha de creación:** 2026-04-29
- **Estado:** pendiente de aprobacion (revision 2 en curso)
- **Inventario de referencia:** `docs/ods_migration_inventory.md` (leer primero)
- **Repositorio legacy:** `C:\Users\aaron\Desktop\RECA_ODS`
- **Worktree:** `C:\Users\aaron\Desktop\INCLUSION_LABORAL_MIGRACION_ODS` (branch `migracion-ods`)

---

## 1. Visión y objetivo de negocio

El módulo ODS del sidebar del proyecto web replica los 2 flujos principales del legacy `RECA_ODS` (Tkinter desktop):

1. **Crear nueva entrada** — wizard all-visible de 5 secciones con catálogos, cálculos financieros y persistencia en la tabla `ods` de Supabase.
2. **Importar acta** — pipeline de 4 niveles de fallback que pre-llena el wizard a partir de un PDF/Excel/ID de acta.

El módulo será usado por **2 usuarios** (`jancam` y `aaron_vercel`) con un único rol `ods_operador` como permiso en `profesional_roles`.

Se aprovecha la migración para limpiar **3 deudas técnicas** del legacy: renombrar `año_servicio` → `ano_servicio`, agregar versionado a `tarifas`, y modelar FK explícita `ods.formato_finalizado_id`.

### Principios rectores

1. **No tocar lo que ya funciona.** Los formularios, drafts, finalización, prewarm, autosave del hub: intactos. El módulo ODS se monta al lado.
2. **Server-side parsing.** Parsing PDF/Excel y llamadas a la Edge Function son server-side en API routes. El cliente solo sube archivos y muestra resultados.
3. **Zod como contrato.** Todos los schemas de validación son Zod explícitos. No más schema fetching runtime del legacy.
4. **Atomicidad.** Inserción de usuarios + ODS en una sola transacción RPC (mejora sobre el legacy no-transaccional).
5. **Sin cache local.** Los catálogos se consumen vía API routes con `revalidate` de Next.js (~60s).

---

## 2. Decisiones cerradas

Referenciar `docs/ods_migration_inventory.md` §2. No se copian aquí para evitar divergencia. Resumen:

| Decisión | Qué |
|---|---|
| 2.D1 | Sync Google Sheets post-insert: mantener con feature flag `ODS_DRIVE_SYNC_ENABLED` |
| 2.D2 | Renombrar `año_servicio` → `ano_servicio`: sí |
| 2.D3 | Regex parser: portar completo + phase-out a 6 meses |
| 2.D4 | Usuarios: `jancam` + `aaron_vercel` |
| 2.D5 | Edge Function: caja negra + descubrimiento ligero (completado §8.1) |
| 2.D6 | FK `ods.formato_finalizado_id`: sí, nullable |
| 2.D7 | Versionado tarifas: `vigente_desde` / `vigente_hasta` |
| 2.D8 | Rol: `ods_operador` en `profesional_roles` |
| 2.D9 | Wizard: all-visible (no secuencial) |

---

## 3. Constraints técnicos durables

- **Stack:** Next.js 16 (App Router), Tailwind v4, shadcn/ui, React Hook Form + Zod, Supabase, Zustand.
- **No fetch directo a Supabase desde componentes.** API routes en `src/app/api/ods/...`.
- **RLS pesimista.** RLS como red de seguridad; lógica fina en API routes con `service_role`.
- **Cero infra paga adicional.** Todo dentro de Supabase + Vercel.
- **No tocar código de formatos.** `src/components/forms/*`, `src/lib/finalization/*`, `src/hooks/use*FormState*`: intocable.
- **No introducir `middleware.ts`.** El proxy es `src/proxy.ts`.
- **Convenciones:** PascalCase en componentes, camelCase en hooks/utils, schemas Zod antes que componentes.
- **Parsing server-side:** `pdf-parse` (PDF), `xlsx` (Excel) en API routes, nunca en bundle del cliente.

---

## 4. Épicas — orden de ejecución

Cada épica es **entregable independiente**. No se mezclan. La E0 desbloquea las demás.

### E0 — Roles y permisos ODS

**Objetivo.** Habilitar el permiso `ods_operador` en `profesional_roles` para los 2 usuarios, con RLS y gating server-side.

**Alcance — entra:**
- Migración SQL para agregar `ods_operador` al CHECK de `profesional_roles`.
- Insertar filas en `profesional_roles` para `jancam` y `aaron_vercel` (verificar que existen en `profesionales` primero).
- Helper server `requireRole(['ods_operador'])` para API routes ODS (reusar patrón de E0 Empresas).
- Helper client `useCurrentRole()` ya existe del E0 Empresas — solo agregar `'ods_operador'` al CHECK si aplica.
- RLS para tabla `ods`:
  - SELECT: usuarios con rol `ods_operador` pueden ver todas las filas.
  - INSERT: usuarios con rol `ods_operador`.
  - UPDATE: nadie día 1.
  - DELETE: nadie día 1.

**Alcance — fuera:**
- UI de administración de roles.
- Permisos adicionales (admin ODS, etc.).

**Datos:**
```sql
-- Ampliar CHECK de profesional_roles
ALTER TABLE profesional_roles
  DROP CONSTRAINT IF EXISTS profesional_roles_role_check;

ALTER TABLE profesional_roles
  ADD CONSTRAINT profesional_roles_role_check
  CHECK (role IN (
    'inclusion_empresas_admin',
    'inclusion_empresas_profesional',
    'ods_operador'
  ));

-- Asignar ods_operador a los 2 usuarios
INSERT INTO profesional_roles (profesional_id, role)
SELECT id, 'ods_operador'
FROM profesionales
WHERE usuario_login IN ('jancam', 'aaron_vercel')
ON CONFLICT (profesional_id, role) DO NOTHING;

-- RLS para ods (tabla ya existe)
ALTER TABLE ods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ods_operador puede leer ods"
  ON ods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profesional_roles pr
      JOIN profesionales p ON p.id = pr.profesional_id
      JOIN auth.users u ON u.id = p.auth_user_id
      WHERE u.id = auth.uid() AND pr.role = 'ods_operador'
    )
  );

CREATE POLICY "ods_operador puede insertar ods"
  ON ods FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profesional_roles pr
      JOIN profesionales p ON p.id = pr.profesional_id
      JOIN auth.users u ON u.id = p.auth_user_id
      WHERE u.id = auth.uid() AND pr.role = 'ods_operador'
    )
  );
```

**Criterios de aceptación:**
- `GET /api/auth/me` retorna `ods_operador` para `jancam` y `aaron_vercel`.
- `requireRole(['ods_operador'])` rechaza con 403 cuando el rol no coincide.
- Un usuario sin `ods_operador` no puede leer ni insertar en `ods`.
- No hay regresiones en los roles de Empresas (`inclusion_empresas_admin`, `inclusion_empresas_profesional`).

**Dependencias:** ninguna. E0 Empresas ya creó la tabla `profesional_roles`.

⚠️ **Nota:** Las RLS estrictas + REVOKE incluidos en esta migración fueron revertidos por el hotfix `20260429213000_e0_hotfix_legacy_access.sql` el 2026-04-29. La razón: el legacy desktop sigue vivo y lo usan más de 2 personas. Las RLS se reaplicarán en E5 (cutover).

---

### E1 — Migraciones de schema + plumbing ODS

**Objetivo.** Preparar la base de datos y el plumbing del módulo ODS: renombrar columnas, agregar FK, versionado de tarifas, estructura de carpetas, schemas Zod base.

**Alcance — entra:**
- **Migración SQL 1:** Renombrar `año_servicio` → `ano_servicio` en tabla `ods`.
- ⚠️ **Nota:** El rename fue revertido parcialmente por el hotfix `20260429220000_e1_hotfix_ano_servicio_shadow.sql` (2026-04-29). La columna `año_servicio` se restauró como shadow nullable sincronizada via trigger con `ano_servicio` (canónica). El shadow + trigger se eliminan en E5 (Cutover).
- **Migración SQL 2:** Agregar `formato_finalizado_id` a `ods` con FK a `formatos_finalizados_il`.
- **Migración SQL 3:** Agregar `vigente_desde` / `vigente_hasta` a `tarifas` + backfill.
- **Migración SQL 4:** Agregar `user_id` a `ods` (FK a `auth.users.id`) para trazabilidad del actor.
- **Estructura de carpetas:**
  - `src/app/hub/ods/` — ruta del módulo ODS.
  - `src/app/api/ods/` — API routes.
  - `src/components/ods/` — componentes UI.
  - `src/lib/ods/` — schemas Zod, utilidades, helpers.
  - `src/lib/ods/rules-engine/` — motor de códigos portado.
  - `src/lib/ods/import/` — pipeline de importación.
  - `src/hooks/useOdsStore.ts` — Zustand store del wizard.
- **Schemas Zod base:**
  - `src/lib/ods/schemas.ts` — `OdsPayload`, `UsuarioNuevo`, `TerminarServicioRequest`, `ImportarResult`.
  - Tests de drift contra schema real de Supabase (compara columnas de `ods` con keys del Zod).
- **RPC de Supabase:** Postgres function para inserción atómica de `usuarios_nuevos` + `ods` con columnas explícitas (NO usar `jsonb_populate_record` — pisa defaults como `gen_random_uuid()`).

**Alcance — fuera:**
- UI del wizard (es E2).
- UI de importar acta (es E3).
- Motor de códigos completo (es E3, pero el plumbing del schema entra aquí).

**Datos:**
```sql
-- Migración 1: Renombrar año_servicio
ALTER TABLE ods RENAME COLUMN "año_servicio" TO ano_servicio;

-- Migración 2: FK formato_finalizado_id
ALTER TABLE ods
  ADD COLUMN formato_finalizado_id uuid
    REFERENCES formatos_finalizados_il(id) ON DELETE SET NULL;
CREATE INDEX ods_formato_finalizado_id_idx ON ods (formato_finalizado_id);

-- Migración 3: Versionado de tarifas
ALTER TABLE tarifas
  ADD COLUMN vigente_desde date NOT NULL DEFAULT current_date,
  ADD COLUMN vigente_hasta date;
CREATE INDEX tarifas_vigencia_idx ON tarifas (codigo_servicio, vigente_desde DESC);

-- Backfill tarifas
UPDATE tarifas SET vigente_desde = created_at::date WHERE vigente_desde = current_date;

-- Migración 4: user_id en ods
ALTER TABLE ods
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX ods_user_id_idx ON ods (user_id);

-- RPC para inserción atómica (columnas explícitas, NO jsonb_populate_record)
CREATE OR REPLACE FUNCTION ods_insert_atomic(
  p_ods jsonb,
  p_usuarios_nuevos jsonb
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_user jsonb;
  v_cedulas text[];
  v_existentes text[];
  v_ods_id uuid;
BEGIN
  -- Insertar usuarios nuevos (skip duplicates)
  IF p_usuarios_nuevos IS NOT NULL AND jsonb_array_length(p_usuarios_nuevos) > 0 THEN
    SELECT ARRAY_AGG(elem->>'cedula_usuario')
    INTO v_cedulas
    FROM jsonb_array_elements(p_usuarios_nuevos) elem
    WHERE elem->>'cedula_usuario' IS NOT NULL;

    IF v_cedulas IS NOT NULL THEN
      SELECT ARRAY_AGG(cedula_usuario)
      INTO v_existentes
      FROM usuarios_reca
      WHERE cedula_usuario = ANY(v_cedulas);
    END IF;

    FOR v_user IN
      SELECT elem
      FROM jsonb_array_elements(p_usuarios_nuevos) elem
      WHERE elem->>'cedula_usuario' IS NOT NULL
        AND (v_existentes IS NULL OR NOT (elem->>'cedula_usuario' = ANY(v_existentes)))
    LOOP
      INSERT INTO usuarios_reca (
        nombre_usuario, cedula_usuario, discapacidad_usuario, genero_usuario
      ) VALUES (
        v_user->>'nombre_usuario',
        v_user->>'cedula_usuario',
        v_user->>'discapacidad_usuario',
        v_user->>'genero_usuario'
      ) ON CONFLICT (cedula_usuario) DO NOTHING;
    END LOOP;
  END IF;

  -- Insertar ODS con columnas explícitas para no pisar defaults
  INSERT INTO ods (
    orden_clausulada,
    nombre_profesional,
    nit_empresa,
    nombre_empresa,
    caja_compensacion,
    asesor_empresa,
    sede_empresa,
    fecha_servicio,
    codigo_servicio,
    referencia_servicio,
    descripcion_servicio,
    modalidad_servicio,
    valor_virtual,
    valor_bogota,
    valor_otro,
    todas_modalidades,
    horas_interprete,
    valor_interprete,
    valor_total,
    nombre_usuario,
    cedula_usuario,
    discapacidad_usuario,
    genero_usuario,
    fecha_ingreso,
    tipo_contrato,
    cargo_servicio,
    total_personas,
    observaciones,
    observacion_agencia,
    seguimiento_servicio,
    mes_servicio,
    ano_servicio,
    formato_finalizado_id,
    session_id,
    started_at,
    submitted_at,
    user_id
  ) VALUES (
    NULLIF(p_ods->>'orden_clausulada', '')::boolean,
    NULLIF(p_ods->>'nombre_profesional', ''),
    NULLIF(p_ods->>'nit_empresa', ''),
    NULLIF(p_ods->>'nombre_empresa', ''),
    NULLIF(p_ods->>'caja_compensacion', ''),
    NULLIF(p_ods->>'asesor_empresa', ''),
    NULLIF(p_ods->>'sede_empresa', ''),
    NULLIF(p_ods->>'fecha_servicio', '')::date,
    NULLIF(p_ods->>'codigo_servicio', ''),
    NULLIF(p_ods->>'referencia_servicio', ''),
    NULLIF(p_ods->>'descripcion_servicio', ''),
    NULLIF(p_ods->>'modalidad_servicio', ''),
    NULLIF(p_ods->>'valor_virtual', '')::numeric,
    NULLIF(p_ods->>'valor_bogota', '')::numeric,
    NULLIF(p_ods->>'valor_otro', '')::numeric,
    NULLIF(p_ods->>'todas_modalidades', '')::numeric,
    NULLIF(p_ods->>'horas_interprete', '')::numeric,
    NULLIF(p_ods->>'valor_interprete', '')::numeric,
    NULLIF(p_ods->>'valor_total', '')::numeric,
    NULLIF(p_ods->>'nombre_usuario', ''),
    NULLIF(p_ods->>'cedula_usuario', ''),
    NULLIF(p_ods->>'discapacidad_usuario', ''),
    NULLIF(p_ods->>'genero_usuario', ''),
    NULLIF(p_ods->>'fecha_ingreso', '')::date,
    NULLIF(p_ods->>'tipo_contrato', ''),
    NULLIF(p_ods->>'cargo_servicio', ''),
    NULLIF(p_ods->>'total_personas', '')::integer,
    NULLIF(p_ods->>'observaciones', ''),
    NULLIF(p_ods->>'observacion_agencia', ''),
    NULLIF(p_ods->>'seguimiento_servicio', ''),
    NULLIF(p_ods->>'mes_servicio', '')::integer,
    NULLIF(p_ods->>'ano_servicio', '')::integer,
    CASE WHEN p_ods->>'formato_finalizado_id' IS NOT NULL AND p_ods->>'formato_finalizado_id' != '' THEN (p_ods->>'formato_finalizado_id')::uuid END,
    CASE WHEN p_ods->>'session_id' IS NOT NULL AND p_ods->>'session_id' != '' THEN (p_ods->>'session_id')::uuid END,
    NULLIF(p_ods->>'started_at', '')::timestamptz,
    NULLIF(p_ods->>'submitted_at', '')::timestamptz,
    CASE WHEN p_ods->>'user_id' IS NOT NULL AND p_ods->>'user_id' != '' THEN (p_ods->>'user_id')::uuid END
  )
  RETURNING id INTO v_ods_id;

  RETURN jsonb_build_object('ods_id', v_ods_id);
END;
$$;
```

**Nota sobre la RPC:** `jsonb_populate_record(NULL::ods, p_ods)` mete NULL en columnas con DEFAULT (como `id` con `gen_random_uuid()`), pisa los defaults y el INSERT falla. La versión con columnas explícitas es verbosa pero correcta.

**Criterios de aceptación:**
- La columna `ano_servicio` existe en `ods` (sin ñ).
- La columna `formato_finalizado_id` existe con FK válida.
- `tarifas` tiene `vigente_desde` / `vigente_hasta` con backfill correcto.
- La RPC `ods_insert_atomic` inserta usuarios + ODS en una transacción.
- Los schemas Zod compilan y los tests de drift pasan.
- Las carpetas y archivos base existen.

**Dependencias:** E0 (roles).

---

### E2 — Wizard "Crear nueva entrada"

**Objetivo.** Implementar el wizard all-visible de 5 secciones con catálogos, cálculos y persistencia.

**Alcance — entra:**

#### UI
- **Ruta:** `/hub/ods` — página principal del módulo ODS.
- **Layout:** all-visible. 5 secciones apiladas verticalmente + tarjeta de resumen al final.
- **Store:** Zustand (`useOdsStore`) con `secciones`, `usuarios_nuevos`, `resumen`.
- **Resumen reactivo:** card con `fecha_servicio`, `nombre_profesional`, `nombre_empresa`, `codigo_servicio`, `valor_total`. Update debounce 300 ms.
- **Botón "Confirmar y terminar":** diálogo de confirmación → POST a `/api/ods/terminar`.

#### Sección 1 — Info básica y profesional
- `orden_clausulada` (select: Si/No), `nombre_profesional` (combobox con búsqueda).
- Catálogos: `GET /api/ods/profesionales` devuelve array combinado con campo `source: 'profesionales' | 'interpretes'`. El cliente deriva `es_interprete = (item.source === 'interpretes')`.
- "Agregar profesional/intérprete" → modal → `POST /api/ods/profesionales`.
- Si `es_interprete = true` → en Sección 3, checkbox `servicio_interpretacion` se fuerza ON y se bloquea.

#### Sección 2 — Info empresa
- `nit_empresa` (combobox bidireccional NIT↔nombre).
- `GET /api/ods/empresas` — lista de empresas.
- Lookup por NIT: `GET /api/ods/empresas?nit=...` → auto-fill nombre, caja, asesor, sede.
- Si empresa no existe → bloquear envío.

#### Sección 3 — Info servicio + cálculo
- `fecha_servicio` (día/mes/año inputs), `codigo_servicio` (combobox).
- Lookup tarifa: `GET /api/ods/tarifas?codigo=...&fecha=...` → auto-fill referencia, descripción, modalidad, valor_base.
- `servicio_interpretacion` (checkbox, forzado si intérprete).
- `horas_interprete`, `minutos_interprete` (inputs numéricos).
- Cálculo financiero: **un solo módulo** `src/lib/ods/serviceCalculation.ts` importado tanto por el cliente (preview en tiempo real) como por `POST /api/ods/calcular` (validación server-side). Sin duplicación de lógica. Usa `decimal.js` para precisión.

#### Sección 4 — Oferentes (multi-fila)
- Filas ilimitadas con campos: cédula, nombre, discapacidad, género, fecha_ingreso, tipo_contrato, cargo.
- Lookup cédula: `GET /api/ods/usuarios?cedula=...` → auto-fill.
- "Crear Usuario" → modal → staging en `usuarios_nuevos` del store.
- Prevención de duplicados por cédula en el store.
- Filas vacías se excluyen. Filas con error resaltadas en amarillo claro.

#### Sección 5 — Observaciones
- 3 textareas: `observaciones`, `observacion_agencia`, `seguimiento_servicio`.
- Campos computados: `mes_servicio`, `ano_servicio` derivados de `fecha_servicio`.

#### Persistencia
- `POST /api/ods/terminar` — recibe `{ ods: OdsPayload, usuarios_nuevos: UsuarioNuevo[] }`.
- Valida Zod, verifica rol `ods_operador`, llama RPC `ods_insert_atomic`.
- Sync a Google Sheets si `ODS_DRIVE_SYNC_ENABLED=true` (background).
- Devuelve `{ ods_id, sync_status, sync_error?, sync_target? }`.

**Alcance — fuera:**
- Importar acta (es E3).
- UI de lista de ODS creadas (diferida).

**Permisos:**
| Acción | ods_operador | Sin rol |
|---|---|---|
| Ver `/hub/ods` | ✓ | ✗ (403) |
| Crear ODS | ✓ | ✗ |
| Crear profesional | ✓ | ✗ |

**UX / rutas:**
- `/hub/ods` — wizard all-visible.

**Datos:**
- Tablas leídas: `profesionales`, `interpretes`, `empresas`, `tarifas`, `usuarios_reca`.
- Tablas escritas: `ods`, `usuarios_reca` (nuevos), `profesionales`/`interpretes` (on-demand).

**Componentes sugeridos:**
- `src/components/ods/OdsWizard.tsx`
- `src/components/ods/sections/Seccion1.tsx`
- `src/components/ods/sections/Seccion2.tsx`
- `src/components/ods/sections/Seccion3.tsx`
- `src/components/ods/sections/Seccion4.tsx`
- `src/components/ods/sections/Seccion5.tsx`
- `src/components/ods/SummaryCard.tsx`
- `src/components/ods/PersonaRow.tsx`
- `src/components/ods/CreateProfessionalDialog.tsx`
- `src/components/ods/CreateUserDialog.tsx`
- `src/components/ods/ConfirmDialog.tsx`

**API routes:**
- `GET /api/ods/profesionales` — catálogo combinado profesionales + interpretes.
- `POST /api/ods/profesionales` — crear profesional o intérprete.
- `GET /api/ods/empresas` — lista de empresas (con filtro por nit).
- `GET /api/ods/tarifas` — lista de tarifas vigentes (con filtro por codigo y fecha).
- `POST /api/ods/calcular` — cálculo financiero server-side.
- `GET /api/ods/usuarios` — lookup usuario por cédula.
- `POST /api/ods/terminar` — inserción atómica + sync Sheets.

**Criterios de aceptación:**
- Un `ods_operador` puede llenar las 5 secciones y crear una ODS.
- El resumen se actualiza reactivamente con debounce 300 ms.
- Si el profesional es intérprete, el checkbox de interpretación se fuerza ON y se bloquea.
- La búsqueda bidireccional NIT↔nombre funciona en Sección 2.
- El cálculo financiero usa un único módulo `serviceCalculation.ts` importado por cliente y server; no hay lógica duplicada.
- Sección 4 permite filas ilimitadas, con lookup de cédula y creación de usuarios staging.
- `POST /api/ods/terminar` inserta usuarios nuevos + ODS en una transacción.
- Sync a Google Sheets se ejecuta si `ODS_DRIVE_SYNC_ENABLED=true`.
- Un usuario sin `ods_operador` recibe 403 en todas las API routes ODS.
- Zod schema valida `valor_total ≈ suma` y `submitted_at >= started_at`.

**Dependencias:** E0 (roles), E1 (migraciones + schemas).

---

### E3 — Importar acta + Motor de códigos

**Objetivo.** Implementar el pipeline de importación de actas (4 niveles) + motor de códigos + preview UI + inyección al wizard.

**Alcance — entra:**

#### Modal "Importar acta"
- 2 tabs:
  - **Tab 1 (default): "Tengo el ID o URL del acta"** — input de texto. Acepta `ABC12XYZ` (8 chars) o URL completa. Lookup directo en `formatos_finalizados_il`.
  - **Tab 2: "Subir archivo PDF/Excel"** — file picker → upload a `POST /api/ods/importar`.

#### Pipeline server-side (`POST /api/ods/importar`)
Recibe archivo o ID y ejecuta:

1. **Nivel 1:** Leer metadata `/RECA_Data` del PDF. Si existe → retornar payload.
2. **Nivel 2:** Extraer ACTA ID del PDF (`[A-Z0-9]{8}`). Si match → query `formatos_finalizados_il` por `acta_ref`. Si `payload_normalized` válido → retornar.
3. **Nivel 3:** Invocar Edge Function `extract-acta-ods`. El cliente concatena el perfil del documento (de `process_profiles`) + texto curado en el campo `text` antes de enviar. La Edge Function solo acepta `text`, no recibe el perfil como parámetro separado.
4. **Nivel 4:** Regex parser (portado de `excel_acta_import.py`). Maneja PDFs/Excels antiguos.

#### Resolución contra catálogos (post-extracción)
- Empresa: match por NIT (estricto) o fuzzy nombre (≥0.8 ratio / ≥0.6 token overlap). **Bloquea si no hay match.**
- Profesional: fuzzy match contra `profesionales` (threshold ≥0.55) o `interpretes` (≥0.85).
- Participantes: lookup por cédula contra `usuarios_reca`.
- Motor de códigos: `suggest_service_from_analysis()` → sugiere `codigo_servicio`, `modalidad`, `valor_base`.

#### Motor de códigos
- Portado de `rules_engine.py` a TypeScript en `src/lib/ods/rules-engine/`.
- 11 `document_kind` con lógica intacta (ver inventario §6).
- Lee tarifas vigentes de `tarifas` (con `vigente_desde` / `vigente_hasta`).
- Retorna `DecisionSuggestion` con `codigo_servicio`, `confidence`, `rationale`.

#### Preview UI
- Diálogo que muestra:
  - Cards métricas: Oferentes detectados | Usuarios existentes | Usuarios por crear.
  - Bloque empresa: detectada vs validada.
  - Bloque servicio: fecha, modalidad, profesional, código sugerido.
  - Tabla participantes: Nombre, cédula, discapacidad, acción (Crear/Existente).
  - Lista de warnings (hasta 6).
  - Botón "Aplicar al formulario" → inyecta valores en el store del wizard.

#### Trazabilidad
- Cada import incluye `import_resolution` con `strategy`, `reason`, `acta_ref`.
- Strings user-facing preservados del legacy.

#### Document classifier
- Portado de `document_classifier.py` a TypeScript en `src/lib/ods/import/classifier.ts`.
- Rule-based: tokens de filename/subject → `document_kind`.
- Fallbacks: `process_hint` con score ≥0.5, o `needs_review`.

#### Process profiles
- Portado de `process_profiles.json` a `src/lib/ods/import/profiles.json`.
- Funciones de `process_profiles.py` portadas a TS: `getProcessProfile()`, `buildProfilePromptContext()`, `buildDetailedExtractionInstructions()`.

**Alcance — fuera:**
- Mejoras al motor de códigos (tabla `tarifas_reglas` — diferida).
- Fusión classifier + LLM (diferida).
- Phase-out del regex parser (diferida a 6 meses).
- Tabla `ods_import_failures` para registro de fallos de importacion (diferida para iterar con datos reales de produccion — los `// TODO E4` en `route.ts` y `pipeline.ts` permanecen como marcadores).

**Permisos:**
| Acción | ods_operador | Sin rol |
|---|---|---|
| Importar acta | ✓ | ✗ |
| Ver preview | ✓ | ✗ |

**UX / rutas:**
- Botón "Importar acta" en el header del wizard `/hub/ods`.
- Modal con 2 tabs.
- Preview dialog antes de aplicar.

**Datos:**
- Tablas leídas: `formatos_finalizados_il`, `empresas`, `profesionales`, `interpretes`, `usuarios_reca`, `tarifas`.
- Edge Function invocada: `extract-acta-ods`.

**Componentes sugeridos:**
- `src/components/ods/ImportActaModal.tsx`
- `src/components/ods/ImportActaTabs.tsx`
- `src/components/ods/ImportPreviewDialog.tsx`
- `src/components/ods/MetricCards.tsx`
- `src/components/ods/ParticipantsTable.tsx`

**API routes:**
- `POST /api/ods/importar` — endpoint principal del pipeline.
- `GET /api/ods/importar/acta-ref/:id` — lookup por ACTA ID.

**Criterios de aceptación:**
- Nivel 1: PDF con `/RECA_Data` retorna payload instantáneamente.
- Nivel 2: ACTA ID válido retorna `payload_normalized` de `formatos_finalizados_il`.
- Nivel 2: ID o URL pegado en Tab 1 retorna datos sin subir archivo.
- Nivel 3: Edge Function `extract-acta-ods` se invoca correctamente con texto curado (perfil concatenado por el cliente en el campo `text`).
- Nivel 4: Regex parser maneja PDFs/Excels antiguos sin crash.
- Resolución de empresa bloquea import si no hay match en BD.
- Motor de códigos sugiere `codigo_servicio` correcto para los 11 `document_kind`.
- Preview dialog muestra métricas, empresa, servicio, participantes y warnings.
- "Aplicar al formulario" inyecta valores en el store del wizard correctamente.
- `import_resolution` se incluye en la respuesta con strategy/reason/acta_ref.
- Strings user-facing coinciden con los del legacy.

**Dependencias:** E0 (roles), E1 (migraciones + schemas), E2 (wizard — el import inyecta al wizard).

---

### E4 — QA + polish

**Objetivo.** QA integral del módulo ODS, corrección de bugs, y ajustes de UX.

**Alcance — entra:**
- QA manual completo de E2 + E3 con los 2 usuarios reales (`jancam`, `aaron_vercel`).
- Tests unitarios del motor de códigos (todos los 11 `document_kind`).
- Tests unitarios del cálculo financiero (`service_calculation`).
- Tests unitarios del document classifier.
- Tests unitarios del regex parser (casos borde: cédula+%, cédula+teléfono, email domain).
- Tests de integración de `POST /api/ods/terminar` (atomicidad).
- Tests de integración de `POST /api/ods/importar` (4 niveles).
- Tests E2E (Playwright): flujo completo crear ODS + importar acta.
- Ajustes de UX basados en feedback de los 2 usuarios.

**Alcance — fuera:**
- Nuevas funcionalidades.
- Mejoras diferidas (tarifas_reglas, fusion classifier, phase-out regex).

**Criterios de aceptación:**
- Todos los tests unitarios pasan.
- Todos los tests de integración pasan.
- Tests E2E cubren: crear ODS manual, importar acta por ID, importar acta por archivo, preview + aplicar.
- Los 2 usuarios reales validan el flujo completo sin blockers.
- No hay regresiones en los módulos existentes (Empresas, Formularios).

**Dependencias:** E0, E1, E2, E3.

---

### E5 — Cutover legacy → nuevo

**Objetivo.** Re-aplicar las RLS estrictas de E0 sobre la tabla `ods`, comunicar el corte a los usuarios del legacy, y asegurar que el módulo nuevo reemplaza al legacy sin interrupción.

**Alcance — entra:**
- Re-aplicar RLS estricta sobre `ods`:
  - `ALTER TABLE ods ENABLE ROW LEVEL SECURITY`
  - Policies SELECT/INSERT solo para `ods_operador`
  - `REVOKE insert, update, delete on table public.ods from authenticated`
- Eliminar shadow column + trigger de compatibilidad legacy:
  - `DROP TRIGGER ods_sync_ano_servicio_trigger ON ods`
  - `DROP FUNCTION ods_sync_ano_servicio_columns()`
  - `ALTER TABLE ods DROP COLUMN "año_servicio"`
- Comunicar corte a usuarios del legacy (email/notificación interna).
- Verificar que el módulo nuevo funciona correctamente con las RLS activas.
- Ajustar el cliente legacy si sigue corriendo (opcional: mostrar mensaje de "módulo migrado" en el Tkinter).
- Monitoreo post-cutover: verificar que no hay errores de permisos en logs de Supabase.

**Alcance — fuera:**
- Migración de datos del legacy al nuevo módulo (las filas de `ods` ya existen en la BD compartida).
- Eliminación del código legacy Tkinter (se mantiene como referencia).

**Permisos:**
| Acción | ods_operador | Legacy (sin rol) |
|---|---|---|
| Leer ods | ✓ | ✗ (solo via legacy si se mantiene acceso) |
| Insertar ods | ✓ | ✗ |

**Criterios de aceptación:**
- RLS estricta activa en `ods` con policies solo para `ods_operador`.
- El módulo nuevo puede leer e insertar ODS sin errores.
- Los usuarios del legacy reciben notificación del corte.
- No hay errores de permisos en logs de Supabase post-cutover.
- El hotfix `20260429213000_e0_hotfix_legacy_access.sql` queda documentado como revertido.

**Dependencias:** E0 (roles), E4 (QA + polish completado).

---

## 5. Modelo de datos consolidado

### Tablas que existen y se reusan

| Tabla | Uso en ODS | Modificaciones |
|---|---|---|
| `ods` | Persistencia de ODS | `ano_servicio` (renombrada), `formato_finalizado_id` (nueva FK), `user_id` (nueva) |
| `usuarios_reca` | Catálogo + inserción de nuevos | Ninguna |
| `profesionales` | Catálogo + creación on-demand | Ninguna |
| `interpretes` | Catálogo + creación on-demand | Ninguna |
| `tarifas` | Catálogo de servicios | `vigente_desde`, `vigente_hasta` (nuevas) |
| `empresas` | Catálogo de empresas | Ninguna |
| `formatos_finalizados_il` | Lookup por ACTA ID | Ninguna |
| `profesional_roles` | Permiso `ods_operador` | Ampliar CHECK |

### Tablas nuevas (ninguna)

No se crean tablas nuevas. Solo se modifican existentes.

### RPC nueva

```sql
ods_insert_atomic(p_ods jsonb, p_usuarios_nuevos jsonb) → jsonb
```

Inserta usuarios nuevos (skip duplicates) + ODS en una transacción.

---

## 6. Plan de testing

### Unit tests

| Módulo | Archivo | Qué cubre |
|---|---|---|
| Motor de códigos | `src/lib/ods/rules-engine/rulesEngine.test.ts` | Los 11 `document_kind` con inputs de ejemplo, confidence, rationale |
| Cálculo financiero | `src/lib/ods/serviceCalculation.test.ts` | Horas decimales, valor_interprete, suma de modalidades, redondeo |
| Document classifier | `src/lib/ods/import/classifier.test.ts` | Todos los tokens de match, fallbacks, process_hint |
| Process profiles | `src/lib/ods/import/profiles.test.ts` | `getProcessProfile`, `buildProfilePromptContext`, `buildDetailedExtractionInstructions` |
| Regex parser | `src/lib/ods/import/regexParser.test.ts` | Cédula+%, cédula+teléfono, email domain, NIT extraction, ACTA ID |
| Schemas Zod | `src/lib/ods/schemas.test.ts` | `OdsPayload` validaciones: valor_total, mes_servicio, orden_clausulada, fechas |
| Fuzzy matching | `src/lib/ods/import/fuzzyMatch.test.ts` | Empresa por nombre, profesional por nombre, thresholds |

### Integration tests

| Endpoint | Archivo | Qué cubre |
|---|---|---|
| `POST /api/ods/terminar` | `src/app/api/ods/terminar/route.test.ts` | Atomicidad usuarios+ODS, rol gating, sync Sheets conditional |
| `POST /api/ods/importar` | `src/app/api/ods/importar/route.test.ts` | 4 niveles, resolución catálogos, motor de códigos |
| `GET /api/ods/tarifas` | `src/app/api/ods/tarifas/route.test.ts` | Filtrado por vigencia (vigente_desde/vigente_hasta) |
| `POST /api/ods/profesionales` | `src/app/api/ods/profesionales/route.test.ts` | Crear en profesionales vs interpretes según programa |

### E2E tests (Playwright)

| Test | Qué cubre |
|---|---|
| `ods-wizard-complete.spec.ts` | Flujo completo: llenar 5 secciones → confirmar → verificar ODS creada |
| `ods-import-by-id.spec.ts` | Importar acta pegando ACTA ID → preview → aplicar → verificar wizard pre-llenado |
| `ods-import-by-file.spec.ts` | Importar acta subiendo PDF → Nivel 1 o 2 → preview → aplicar |
| `ods-import-fallback.spec.ts` | Importar acta sin metadata ni ID → Nivel 3 (Edge Function) → preview |
| `ods-role-gating.spec.ts` | Usuario sin `ods_operador` recibe 403 en `/hub/ods` y API routes |
| `ods-no-regression.spec.ts` | Formularios existentes siguen funcionando (smoke test) |

---

## 7. Migration scripts SQL

Los 8 cambios planeados (del inventario §11.2):

```sql
-- 1. Renombrar año_servicio → ano_servicio
ALTER TABLE ods RENAME COLUMN "año_servicio" TO ano_servicio;

-- 2. Agregar FK formato_finalizado_id
ALTER TABLE ods
  ADD COLUMN formato_finalizado_id uuid
    REFERENCES formatos_finalizados_il(id) ON DELETE SET NULL;
CREATE INDEX ods_formato_finalizado_id_idx ON ods (formato_finalizado_id);

-- 3. Versionado de tarifas
ALTER TABLE tarifas
  ADD COLUMN vigente_desde date NOT NULL DEFAULT current_date,
  ADD COLUMN vigente_hasta date;
CREATE INDEX tarifas_vigencia_idx ON tarifas (codigo_servicio, vigente_desde DESC);

-- 4. Backfill tarifas
UPDATE tarifas SET vigente_desde = created_at::date WHERE vigente_desde = current_date;

-- 5. Agregar user_id a ods
ALTER TABLE ods
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX ods_user_id_idx ON ods (user_id);

-- 6. Ampliar CHECK de profesional_roles
ALTER TABLE profesional_roles
  DROP CONSTRAINT IF EXISTS profesional_roles_role_check;
ALTER TABLE profesional_roles
  ADD CONSTRAINT profesional_roles_role_check
  CHECK (role IN (
    'inclusion_empresas_admin',
    'inclusion_empresas_profesional',
    'ods_operador'
  ));

-- 7. Asignar ods_operador a los 2 usuarios
INSERT INTO profesional_roles (profesional_id, role)
SELECT id, 'ods_operador'
FROM profesionales
WHERE usuario_login IN ('jancam', 'aaron_vercel')
ON CONFLICT (profesional_id, role) DO NOTHING;

-- 8. RLS para ods
ALTER TABLE ods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ods_operador puede leer ods"
  ON ods FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profesional_roles pr
      JOIN profesionales p ON p.id = pr.profesional_id
      JOIN auth.users u ON u.id = p.auth_user_id
      WHERE u.id = auth.uid() AND pr.role = 'ods_operador'
    )
  );

CREATE POLICY "ods_operador puede insertar ods"
  ON ods FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profesional_roles pr
      JOIN profesionales p ON p.id = pr.profesional_id
      JOIN auth.users u ON u.id = p.auth_user_id
      WHERE u.id = auth.uid() AND pr.role = 'ods_operador'
    )
  );
```

---

## 8. Estado de implementación

**Última actualización:** 2026-04-29

| Épica | Estado | Notas |
|---|---|---|
| E0 — Roles ODS | 🟡 En progreso | Migraciones SQL + RLS + requireRole helper |
| E1 — Migraciones + plumbing | ⚪ Pendiente | — |
| E2 — Wizard | ⚪ Pendiente | — |
| E3 — Importar acta + motor | ⚪ Pendiente | — |
| E4 — QA + polish | ⚪ Pendiente | — |

Leyenda: ⚪ pendiente · 🔵 lista para iniciar · 🟡 en progreso · 🟢 completada · 🔴 bloqueada

---

## 9. Histórico de decisiones

### 2026-04-29 — Plan inicial

- 5 épicas: E0 Roles, E1 Migraciones, E2 Wizard, E3 Importar+Motor, E4 QA.
- Wizard all-visible (no secuencial) — confirmado por evidencia del legacy.
- Motor de códigos se porta tal cual día 1 (sin externalizar a tabla).
- Regex parser se porta completo + phase-out a 6 meses.
- Sync Sheets se mantiene con feature flag.
- Inserción atómica vía RPC (mejora sobre legacy).
- Edge Function = caja negra, descubrimiento completado (§8.1 del inventario).
- 2 usuarios: `jancam` + `aaron_vercel` con rol `ods_operador`.
- FK `ods.formato_finalizado_id` nullable.
- Versionado tarifas con `vigente_desde` / `vigente_hasta`.
- Renombrar `año_servicio` → `ano_servicio`.
- Parsing server-side (no en bundle del cliente).
- Zod schema explícito + tests de drift (no schema fetching runtime).

### 2026-04-29 — Correcciones revision 2 (PO)

- **RPC `ods_insert_atomic` corregida:** columnas explícitas en lugar de `jsonb_populate_record` (evita pisar defaults como `gen_random_uuid()`).
- **Nombre Edge Function corregido:** `extract-acta-ods` (no `extract_structured_acta-pdf` ni `extract_structured_acta-ods`).
- **Detección de intérprete:** `GET /api/ods/profesionales` devuelve campo `source: 'profesionales' | 'interpretes'`; el cliente deriva `es_interprete` de ahí.
- **Cálculo financiero:** módulo único `serviceCalculation.ts` importado por cliente y server, sin duplicación.
- **Edge Function profile:** el cliente concatena perfil + texto curado en `text` antes de enviar; la Edge Function no recibe perfil como parámetro separado.
- **`user_id` en `ods`:** columna nueva para trazabilidad del actor. Decisión tomada en esta revisión (no estaba en inventario §11.2 original). Aprobada por PO.

### 2026-04-29 — Corrección de typo en `usuario_login`

- Owner corrigió typo: el segundo usuario es **`jancam`** (no `jancar`). Re-query a Supabase (PO) confirmó que `jancam` existe en `profesionales` (id=10, Janeth Carolina Camargo Escarraga).
- Verificación 5 de §10 actualizada: ambos usuarios existen, sin acción pendiente. La migración E0 ejecuta el INSERT de roles directamente.
- §10.1 reescrita: ya no hay opción A/B, la migración E0 ejecuta el INSERT de roles directamente.
- 19 menciones de `jancar` reemplazadas por `jancam` en el plan + inventario.

### 2026-04-29 — Incidente de producción: hotfix de acceso legacy

- Las RLS estrictas de E0 se difieren a E5.
- Hotfix `20260429213000_e0_hotfix_legacy_access.sql` aplicado: desactiva RLS en `ods`, elimina policies de E0, restaura grants directos a `authenticated`.
- Razón: el legacy desktop sigue vivo y lo usan más de 2 personas. El hotfix restaura el estado pre-E0 sobre la tabla `ods`.
- El rol `ods_operador` y el CHECK constraint de `profesional_roles` quedan intactos.
- El módulo nuevo no se ve afectado porque usa `service_role` server-side via la RPC `ods_insert_atomic`, que ignora RLS.
- Nueva épica E5 — Cutover creada para re-aplicar RLS cuando el módulo nuevo reemplace al legacy.

### 2026-04-29 — Segundo hotfix: shadow column `año_servicio`

- El rename de E1-M1 (`año_servicio` → `ano_servicio`) rompió el legacy desktop por cache LRU stale del schema OpenAPI (TTL 180s).
- Hotfix `20260429220000_e1_hotfix_ano_servicio_shadow.sql` aplicado: restaura `año_servicio` como columna shadow nullable + trigger `ods_sync_ano_servicio_trigger` que sincroniza bidireccionalmente con `ano_servicio` (canónica).
- La columna canónica sigue siendo `ano_servicio`. El shadow + trigger se eliminan en E5 (Cutover).

---

## 10. Verificación pre-implementación

Queries ejecutadas el 2026-04-29 contra Supabase remoto (project `zvhjosktmfisryqcjxbh`).

| # | Query | Resultado | Impacto en el plan |
|---|---|---|---|
| 1 | `SELECT conname FROM pg_constraint WHERE conrelid = 'profesional_roles'::regclass AND contype = 'c'` | `profesional_roles_role_check` | **OK.** El nombre del constraint en el plan es correcto. |
| 2 | `SELECT indexdef FROM pg_indexes WHERE tablename = 'profesional_roles'` | UNIQUE en `(profesional_id, role)` via PK | **OK.** El `ON CONFLICT (profesional_id, role)` del plan es correcto. |
| 3 | `SELECT indexdef FROM pg_indexes WHERE tablename = 'usuarios_reca'` | UNIQUE en `cedula_usuario` via `usuarios_reca_cedula_unique` | **OK.** El `ON CONFLICT (cedula_usuario)` de la RPC es correcto. |
| 4 | `SELECT column_name FROM information_schema.columns WHERE table_name = 'profesionales' AND column_name = 'auth_user_id'` | `auth_user_id` existe | **OK.** Las policies RLS que usan `p.auth_user_id` son válidas. |
| 5 | `SELECT id, usuario_login, nombre_profesional FROM profesionales WHERE usuario_login IN ('jancam', 'aaron_vercel')` | Ambos existen: `aaron_vercel` (id=30), `jancam` (id=10, Janeth Carolina Camargo Escarraga). | **OK.** Sin acción pendiente. La migración E0 puede insertar los roles directamente. |

### 10.1 Resolución de verificación 5

Verificación cerrada el 2026-04-29 tras corregir un typo del owner (`jancar` → `jancam`). Re-query confirmó que ambos `usuario_login` existen en la tabla `profesionales`. La migración E0 puede ejecutar el `INSERT INTO profesional_roles ... WHERE usuario_login IN ('jancam', 'aaron_vercel')` sin pasos previos manuales.

### 10.2 Notas adicionales del descubrimiento Edge Function (§8.1 del inventario)

- **Modelo `claude-sonnet-4-6`:** no es un nombre típico de Anthropic. Antes de invocaciones reales hay que validar que existe en el provider; si no, devuelve 404. Punto a verificar en producción.
- **Shared secret opcional:** el código de la Edge Function solo valida el secret si `ACTA_EXTRACTION_SHARED_SECRET` está configurado (`if (sharedSecret) { ... }`). Si el env var no está, **cualquier persona con la URL puede invocar la función y gastar tokens**. Esto es más preocupante que lo reportado inicialmente en la mejora #3 del §8.1. **Acción:** verificar que `ACTA_EXTRACTION_SHARED_SECRET` está configurado en Supabase antes de poner el módulo en producción.

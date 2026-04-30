# E3.5a - Inventario del Ciclo de Vida

**Estado:** iniciado.  
**Worktree:** `codex/e3-profesionales-empresas`  
**Objetivo:** documentar qué evidencia real de `formatos_finalizados_il.payload_normalized` puede alimentar el ciclo de vida read-only de una empresa.

Este archivo es el inventario vivo de E3.5a. Se actualiza a medida que revisamos formularios y muestras reales. No es una especificación visual ni un plan de implementación.

## Reglas base aprobadas

- El ciclo de vida será un árbol operativo de empresa.
- `condiciones-vacante` crea una rama de perfil/cargo.
- Una acta de `condiciones-vacante` siempre corresponde a un solo perfil.
- Desde `seleccion` en adelante, la cédula es la llave principal de persona.
- Selección y contratación pueden ser grupales.
- Seguimientos son individuales: una acta por persona.
- Personas sin perfil relacionado se muestran en una rama propia.
- Personas seleccionadas sin contratación se archivan después de 6 meses, sin borrarse.
- Notas y bitácora global quedan separadas del árbol en la primera versión.
- Evidencia no clasificable va a `Evidencia sin clasificar`.

## Diferencial por tipo de empresa

| Tipo de empresa | Etapas diferenciales | Seguimientos esperados |
|---|---|---|
| `Compensar` | Evaluación de accesibilidad, sensibilización, inducción organizacional | 6 por persona |
| `No Compensar` | No aplica diferencial | 3 por persona |

## Checklist de inventario

Para cada formulario:

- [ ] Revisar muestras reales de `formatos_finalizados_il`.
- [ ] Identificar llaves de empresa.
- [ ] Identificar fecha útil.
- [ ] Identificar profesional/autor.
- [ ] Identificar si crea etapa de empresa, perfil o persona.
- [ ] Identificar si puede ser grupal.
- [ ] Identificar cédulas/personas.
- [ ] Registrar gaps de `payload_normalized`.
- [ ] Decidir clasificación inicial.

## Matriz por formulario

| Formulario | Rol en ciclo | Llave empresa | Llave perfil | Llave persona | Grupal | Estado inventario | Decisión |
|---|---|---|---|---|---|---|---|
| `presentacion` | Etapa de empresa | Pendiente | No aplica | No aplica | No | Pendiente | Pendiente |
| `evaluacion` | Etapa Compensar | Pendiente | No aplica | No aplica | No | Pendiente | Pendiente |
| `condiciones-vacante` | Crea perfil/cargo | Pendiente | Cargo/perfil | No aplica | No | Pendiente | Pendiente |
| `seleccion` | Crea/actualiza personas | Pendiente | Cargo contextual, no llave fuerte | Cédula | Sí | Pendiente | Pendiente |
| `contratacion` | Actualiza personas contratadas | Pendiente | Cargo contextual, no llave fuerte | Cédula | Sí | Pendiente | Pendiente |
| `sensibilizacion` | Etapa Compensar de empresa | Pendiente | No aplica | No aplica | No | Pendiente | Pendiente |
| `induccion-organizacional` | Etapa Compensar de empresa | Pendiente | No aplica | No aplica | No | Pendiente | Pendiente |
| `induccion-operativa` | Etapa por persona | Pendiente | Cargo contextual, no llave fuerte | Cédula | Pendiente | Pendiente | Pendiente |
| `seguimientos` | Seguimiento por persona | Pendiente | No aplica | Cédula | No | Pendiente | Pendiente |

## Hallazgos por formulario

### `presentacion`

Pendiente.

### `evaluacion`

Pendiente.

### `condiciones-vacante`

Pendiente.

### `seleccion`

Pendiente.

### `contratacion`

Pendiente.

### `sensibilizacion`

Pendiente.

### `induccion-organizacional`

Pendiente.

### `induccion-operativa`

Pendiente.

### `seguimientos`

Pendiente. Riesgo conocido: el payload actual puede ser insuficiente o no estar normalizado para derivar ordinales de seguimiento; si no hay número explícito, se inferirá por orden cronológico de actas por cédula.

## Gaps de datos

Pendiente de inventario.

## Decisiones para E3.5b

Pendiente de inventario.

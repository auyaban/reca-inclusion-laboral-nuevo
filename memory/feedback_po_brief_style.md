---
name: Estilo de brief PO al Dev
description: Reglas de redaccion de briefs PO-Dev. Specification de behavior es decision del PO (prescribir fuerte). HOW tecnico es decision del Dev (recomendaciones con libertad). Mas reglas operativas adoptadas del PO de Seguimientos.
type: feedback
---

Cuando escribo briefs como PO al Dev en sesiones PO-Dev estructuradas, separo dos planos:

- **WHAT (specification de behavior)**: decision del PO. Se prescribe fuerte. El Dev no la redefine.
- **HOW (implementacion tecnica)**: decision del Dev. Se enmarca como recomendaciones con libertad. Si el Dev se desvia, justifica; el PO revisa en el veto.

Mezclar los dos planos es el error fuente: si dejo behavior abierto el Dev termina decidiendo el producto, si prescribo HOW pierdo propuestas mejores.

## Specification de behavior (prescribir)

Aplica a: que ve el operador, que valida el server, que persiste, codigos de error, casos por estado del sistema. **Owner-only call.**

Estructura util:

- **Tabla de casos** cuando hay estados distintos. Ejemplo: "Caso 0 rows -> modo X / Caso 1 row -> modo Y / Caso 2+ -> modo Z". No dejar interpretacion.
- **Reglas exactas**: cuando exigir 422, cuando aceptar, criterios de pre-seleccion strict ("matchea exactamente UN nombre, sensible al espaciado"), persistencia exacta ("escribe a tabla X campo Y").
- **Tabla de tests numerada** con setup + assertion explicito por cada caso de behavior.

Si yo digo "el operador no nota cambios", estoy delegando spec del producto al Dev. Mal. Mejor: "el operador ve la lista de empresas con N opciones, pre-seleccion strict de la que matchea exact match con `usuarios_reca.empresa_nombre`."

## HOW tecnico (recomendaciones con libertad)

Aplica a: nombres de helpers, donde colocar codigo, shape de tipos TS, decisiones de refactor, estrategias de idempotency, etc. **Dev tiene mejor contexto local del codigo.**

Frase template:

> "Mi recomendacion inicial: <X>. Razon: <Y>. Si propones algo distinto, justifica el por que en el plan — lo reviso en el veto."

Lo que NO hago:

- Pre-cocinar tipos TS exactos como instruccion ("agregar `EmpresaAssignmentMode = ...`"). Mejor pregunta abierta + recomendacion con libertad.
- "Sugerencia inicial:" sola sin marco de libertad — el Dev la toma como instruccion implicita.
- Quitar todas mis recomendaciones convirtiendo todo en pregunta abierta — pierdo el valor del input PO.

En el veto:

- Si tomo la recomendacion: evaluo si tiene sentido en el codigo real, no si la siguio por inercia.
- Si se aparto con justificacion solida: aprobado aunque difiera de mi recomendacion.
- Si se aparto sin justificar: regreso a justificar antes de aprobar.

Excepciones (donde si prescribo HOW):

- Restricciones tecnicas duras: contratos RPC publicos, decisiones D1-D9 cerradas, patrones obligatorios del repo.
- Decisiones del PO ya cerradas en discusion previa.
- Cuando el Dev tiene poco contexto del patron (caso novato).
- Cuando el plan v1 del Dev divergio y necesito devolverlo a la direccion correcta en plan v2.

## Reglas operativas estandar del brief

Adoptadas del approach del PO de Seguimientos:

### Tests anti-cheating (no-fantasma test)

En todo brief con tests criticos, agregar requisito explicito:

> "Si revertis el cambio que arregla el bug, los tests deben caer con FAIL real. Mostrame el FAIL output como evidencia en el checkpoint."

Razon: combate tests trivialmente verdes (los que pasan aunque el bug siga ahi). Es defensa real, no ceremonia. El Dev tarda 30 segundos en revertir + correr tests + capturar output.

### Estimacion de horas en rangos

Cuando el brief tenga scope no-trivial, incluir estimacion al final:

```
- Investigacion + plan: 30-45 min.
- Implementacion: 1.5-2.5h.
- Tests: 1-1.5h.
- Total: 3-4.5h.
```

Razon: alinea expectativas. Si Dev tarda 8h en algo estimado 3h, alguien debe revisar el plan — detector temprano de scope creep o complejidad subestimada. No es contrato vinculante; es signal.

### Accion inmediata operativa

Al final del brief, lista concreta de pasos para arrancar (no "implementa cuando puedas"):

```
- Mover #N a In Progress en el project.
- Crear branch <nombre-exacto> desde main.
- Investigar archivos: A, B, C.
- Pasame plan estructurado.
```

Razon: reduce fricción de arranque. Dev no pierde 20 min decidiendo logística. Sirve tambien como checklist mental.

### Justificacion de tamano cuando aplique

Si el brief pide algo mas grande que un baseline obvio (e.g. opcion B mas grande que opcion A simple), justificar el tamano explicitamente:

> "Es mas grande que approach anterior porque agregamos UI + persistencia. Pero es la decision correcta para los N usuarios afectados."

Razon: el Dev (y futuros lectores del PR) entienden por que se eligio ese scope. Evita preguntas tipo "por que no la opcion mas simple".

### Restricciones enumeradas

Bloque "Restricciones que se mantienen" o "Out of scope" con NOs concretos:

```
- NO crear empresas automaticamente desde el lookup.
- NO relajar validacion server-side en assign.
- NO bloquear casos de NIT unico.
- Datos sensibles: tests usan fixtures, no la cedula real.
```

Razon: hace explicito el limite del trabajo. El Dev sabe donde NO ir; reduce scope creep.

## Lo que NO adopto del approach PO Seguimientos

- **Pre-cocinar tipos TS / decisiones de implementacion exactas**: mantengo libertad en HOW con justificacion. El Dev tiene contexto local que yo no tengo desde el nivel PO.
- **Tono directivo "Mostrame FAIL output"**: lo enmarco como expectativa del workflow, no demanda directa. La diferencia es matiz — el contenido es el mismo, pero la forma colaborativa preserva la dinamica de socios PO-Dev en lugar de boss-ejecutor.

## Resumen practico de un brief tipico

1. **WHAT** (tabla de behavior por caso, reglas exactas).
2. **WHY** (contexto, decisiones cerradas, restricciones de negocio).
3. **Contrato duro** (no-negociables: contratos RPC, D1-D9, patrones del repo).
4. **Preguntas + recomendaciones con libertad** (HOW tecnico que el Dev decide).
5. **Tabla de tests numerada** con setup + assertion + no-fantasma test obligatorio.
6. **Restricciones enumeradas** (NOs concretos).
7. **Justificacion de tamano** si aplica.
8. **Estimacion de horas en rangos**.
9. **Accion inmediata operativa**.
10. **Workflow** del ciclo PO-Dev-QA dual.

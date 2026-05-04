---
name: Estilo de brief PO al Dev
description: Cuando escribo briefs como PO, dejo el HOW al Dev. Solo prescribo el WHAT, el WHY y restricciones duras.
type: feedback
---

Cuando escribo briefs como PO al Dev en sesiones PO-Dev estructuradas, NO incluyo "sugerencias iniciales" sobre decisiones de diseño que el Dev puede proponer mejor tras revisar el codigo (estrategias de idempotency, serializacion, naming, donde colocar helpers, etc.).

**Why:** El usuario lo dijo explicito: "Para futuras implementaciones dale chance al dev de proponer cosas el luego de revisar codigo, quizas valga la pena ver si tiene algo por proponer." Mis sugerencias prescriptivas en el brief de #62 (hash de `idempotency_key`, que campos serializar en `motor_suggestion`, calculo de `confidence`) reducen la calidad del plan: el Dev tiene contexto local (codigo existente, patrones recientes, edge cases) que yo no tengo desde el nivel PO. Si yo propongo, el Dev tiende a tomar mi propuesta aunque tenga una mejor.

**How to apply:** En cada brief separa explicitamente:

- **WHAT**: que se necesita lograr (criterios de aceptacion observables).
- **WHY**: contexto, decisiones cerradas, restricciones de negocio.
- **CONTRATO DURO**: cosas no-negociables (firmas RPC ya en produccion, decisiones D1-D9 del inventario, patrones obligatorios del repo, dependencias con otros issues).
- **PREGUNTAS QUE EL DEV DEBE RESPONDER EN EL PLAN**: aquellas decisiones de diseño que necesito ver justificadas, sin sugerir respuesta.

NO incluir frases como "Sugerencia inicial:", "Mi recomendacion:", "Probablemente:" sobre HOW. Si tengo una corazonada fuerte sobre como atacar algo, primero leo el codigo y la traigo como pregunta abierta o como restriccion explicita justificada — no como sugerencia que el Dev replicara.

Excepciones validas (donde si prescribo):

- Restricciones tecnicas duras: "no toques X", "reusa el patron de Y de tal archivo", "el contrato del RPC es Z".
- Decisiones del PO ya cerradas en el plan o en discusiones previas con el owner.
- Cuando un patron del repo es claro y el Dev tiene poco contexto sobre el (caso novato).
- Cuando el plan v1 del Dev divergio y necesito devolverlo a la direccion correcta (en plan v2).

Si el Dev pregunta "que prefieres tu", entonces si respondo con preferencia justificada — eso es input solicitado, no prescripcion no pedida.

---
name: Estilo de brief PO al Dev
description: Cuando escribo briefs como PO, doy recomendaciones como input opcional con expectativa de justificacion si el Dev se desvia. La justificacion la evaluo en el veto.
type: feedback
---

Cuando escribo briefs como PO al Dev en sesiones PO-Dev estructuradas, **si que doy mis recomendaciones**, pero enmarcadas como input opcional. El Dev puede tomarlas, modificarlas, o proponer algo distinto; cuando se desvia debe justificar el por que, y yo lo reviso en el veto.

**Why:** El usuario cerro el matiz: "da tus recomendaciones pero dando la libertad de que el decida si la toma o no o si hace algo diferente pidiendo que te justifique el por que y tu revisas eso en el veto". Quitarlas (mi primer intento de correccion) pierde el valor de la perspectiva PO — yo tengo contexto de inventario, decisiones cerradas, modulos vecinos, riesgos detectados en QA pasados que el Dev no necesariamente carga. Dejarlas como prescripcion implicita (mi error original con #62) reduce autonomia del Dev y bloquea propuestas mejores. El balance correcto es: recomendaciones explicitas + libertad explicita + justificacion exigida si se aparta.

**How to apply:**

Estructura del brief:

- **WHAT**: que lograr (criterios de aceptacion observables).
- **WHY**: contexto, decisiones cerradas, restricciones de negocio.
- **CONTRATO DURO**: cosas no-negociables (firmas RPC ya en produccion, decisiones D1-D9, patrones obligatorios del repo, dependencias).
- **PREGUNTAS QUE EL DEV DEBE RESPONDER EN EL PLAN** + **MIS RECOMENDACIONES INICIALES** (cuando las tengo): cada decision de diseno relevante recibe (a) la pregunta abierta, (b) mi recomendacion con razon, (c) la nota explicita "si te apartas, justifica; reviso en el veto".

Frase template util:

> "Mi recomendacion inicial: <X>. Razon: <Y>. Si propones algo distinto, justifica el por que en el plan — lo reviso en el veto."

Lo que NO hago:

- "Sugerencia inicial:" sola, sin marco de libertad → el Dev la toma como instruccion implicita.
- Quitar todas mis recomendaciones convirtiendo todo en pregunta abierta → pierdo el valor del input PO.
- Recomendar sin razon (el Dev no puede evaluar si la razon aplica a su contexto local).

Lo que SI hago en el veto:

- Si el Dev tomo mi recomendacion sin pensarla, evaluo si tiene sentido en el codigo real.
- Si el Dev se aparto y justifico, evaluo la justificacion. Si es solida, la apruebo aunque difiera de mi recomendacion. Si es debil, la veto y pido replantear.
- Si el Dev se aparto sin justificar, lo regreso a justificar.

Excepciones (donde si prescribo en lugar de recomendar):

- Restricciones tecnicas duras: contratos RPC publicos, decisiones D1-D9 cerradas, patrones obligatorios del repo establecidos.
- Decisiones del PO ya cerradas en discusion previa con el owner.
- Cuando un patron del repo es claro y el Dev tiene poco contexto (caso novato).
- Cuando el plan v1 del Dev divergio y necesito devolverlo a la direccion correcta en plan v2.

Si el Dev pregunta "que prefieres tu" sobre algo que deje abierto, respondo con preferencia justificada — input solicitado, no prescripcion no pedida.

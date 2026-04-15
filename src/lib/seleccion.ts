import {
  getDefaultAsistentesForMode,
  normalizePersistedAsistentesForMode,
} from "@/lib/asistentes";
import { normalizeModalidad } from "@/lib/modalidad";
import {
  getDefaultRepeatedPeopleRows,
  normalizeRestoredRepeatedPeopleRows,
  type RepeatedPeopleConfig,
} from "@/lib/repeatedPeople";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  SELECCION_OFERENTE_FIELDS,
  SELECCION_OFERENTE_MEANINGFUL_FIELDS,
  SELECCION_OFERENTE_REQUIRED_FIELDS,
  type SeleccionOferenteFieldId,
  type SeleccionOferenteRow,
  type SeleccionValues,
} from "@/lib/validations/seleccion";

export const SELECCION_OFERENTES_CONFIG: RepeatedPeopleConfig<SeleccionOferenteRow> =
  {
    itemLabelSingular: "Oferente",
    itemLabelPlural: "Oferentes",
    primaryNameField: "nombre_oferente",
    meaningfulFieldIds: [...SELECCION_OFERENTE_MEANINGFUL_FIELDS],
    createEmptyRow: createEmptySeleccionOferenteRow,
  };

export const SELECCION_RECOMMENDATION_HELPERS = [
  {
    id: "preparacion_proceso",
    label: "Preparacion del proceso",
    text: `Ajustes razonables para entrevista.

Contactar a la Agencia de Empleo para el apoyo de adaptacion y organizacion de las pruebas psicotecnicas de la empresa.

Realizar una organizacion de la entrevista de forma que se pueda anticipar a los oferentes el paso a paso de lo que se realizara en el proceso, permitiendo que logren organizar su tiempo y la constancia que requiere el mismo.

Promover la aplicacion de formatos para la hoja de vida con disenos sencillos, faciles de diligenciar y a traves de medios accesibles; estos pueden ser virtuales o fisicos.

Para mantener un contacto directo con los oferentes que han sido preseleccionados, se recomienda evaluar alternativas hasta identificar el mejor canal de comunicacion: contacto telefonico, mensajes de texto, mensajes por chat, correo electronico y, en algunos casos, a traves de familiares que hayan sido referenciados en la hoja de vida. Los mensajes deben ser precisos y concretos, incluyendo solamente la informacion basica y utilizando frases simples.`,
  },
  {
    id: "trato_respetuoso",
    label: "Trato respetuoso",
    text: `Evitar conductas, palabras, frases, sentimientos, preconcepciones y estigmas que impidan u obstaculicen el acceso en igualdad de condiciones de las personas con y/o en situacion de discapacidad a los espacios, objetos, servicios y, en general, a las posibilidades que ofrece la sociedad.

Evitar, durante el proceso de entrevista, preguntar sobre como fue la adquisicion de la discapacidad.

Informar a los candidatos que no fueron seleccionados sobre la finalizacion del proceso, basandose en sus habilidades residuales individuales. De esta manera no tendran que esperar innecesariamente y se respeta su tiempo.

La evaluacion de desempeno debe ajustarse de acuerdo con el perfil del cargo y no enfocarse en la discapacidad de la persona.

Mantener contacto visual con la persona, mirando a sus ojos y evitando enfocar su discapacidad.`,
  },
  {
    id: "accesibilidad_entrevista",
    label: "Accesibilidad entrevista",
    text: `Asegurarse de que el lugar de la entrevista sea accesible para personas con discapacidad fisica. Esto incluye la disponibilidad de rampas, ascensores o espacios adecuados para sillas de ruedas, si es necesario.

Si el candidato tiene dificultades de comunicacion, ofrecer alternativas como permitir el uso de comunicacion por texto, proporcionar un interprete de lengua de senas si es necesario o permitir que el candidato responda por escrito.

Considerar la posibilidad de ofrecer tiempo adicional para completar la entrevista si la discapacidad del candidato afecta su velocidad de procesamiento o comunicacion.

Ser flexible en cuanto al formato de la entrevista. Algunas personas pueden necesitar entrevistas en un formato diferente, como entrevistas virtuales o en un entorno menos estimulante para quienes presentan sensibilidad sensorial.

Formular preguntas claras y directas y ser paciente al esperar la respuesta del candidato. Evitar jergas o frases complicadas que puedan ser dificiles de entender.

Al proporcionar retroalimentacion al candidato, ser claro, conciso y constructivo. Destacar sus fortalezas y ofrecer sugerencias de mejora, si es necesario, de manera util y respetuosa.

Realizar preguntas orientadoras que permitan identificar que la informacion esta siendo recibida correctamente por el oferente durante el proceso de seleccion.`,
  },
  {
    id: "accesibilidad_documentos",
    label: "Accesibilidad documentos",
    text: `Aumentar el tamano de letra, utilizar colores de fondo en el texto y emplear fuentes de facil lectura como Arial o Verdana. Adicionalmente, proporcionar esos documentos de manera virtual para facilitar el uso de herramientas tiflotecnologicas.`,
  },
  {
    id: "pruebas_seleccion",
    label: "Pruebas de seleccion",
    text: `La aplicacion de pruebas de tipo visual y grafico, como por ejemplo Test de Percepcion Tematica, Wartegg, Tecnica de dibujo proyectivo HTP por sus siglas en ingles (Casa, Arbol, Persona) y Test de la Figura Humana, no es recomendable para personas con discapacidad visual.

Para los procesos de seleccion en los que participen candidatos usuarios de lengua de senas, es clave contar con un servicio de interpretacion profesional y no apoyarse en amigos o familiares de los candidatos que tengan conocimiento.

No se recomienda hacer interpretacion en lengua de senas de las pruebas psicotecnicas, dado que se puede sesgar la informacion que se espera recoger y, por ende, los resultados. Es preferible reemplazar este tipo de pruebas por entrevistas por competencias.

En el caso de personas con discapacidad que cuentan con familias sobreprotectoras, se deben establecer limites claros con estas, restringiendo su participacion durante el proceso de seleccion.

Se recomienda minimizar el uso de pruebas psicotecnicas y reemplazarlas por otras estrategias de seleccion que permitan alcanzar los mismos objetivos. Solo en caso de que lo anterior no sea posible, se sugiere priorizar la aplicacion de pruebas graficas proyectivas que buscan identificar rasgos de personalidad.`,
  },
] as const;

function normalizeTextValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getRowCandidate(row: unknown) {
  return row && typeof row === "object" ? (row as Record<string, unknown>) : {};
}

function extractLegacyDesarrolloActividad(
  values: Partial<SeleccionValues> | Record<string, unknown>
) {
  if (
    typeof values.desarrollo_actividad === "string" &&
    values.desarrollo_actividad.trim()
  ) {
    return values.desarrollo_actividad;
  }

  const rawRows = Array.isArray(values.oferentes) ? values.oferentes : [];
  for (const row of rawRows) {
    const candidate = getRowCandidate(row);
    if (
      typeof candidate.desarrollo_actividad === "string" &&
      candidate.desarrollo_actividad.trim()
    ) {
      return candidate.desarrollo_actividad;
    }
  }

  return "";
}

export function createEmptySeleccionOferenteRow(): SeleccionOferenteRow {
  const row = {} as SeleccionOferenteRow;

  (SELECCION_OFERENTE_FIELDS.map((field) => field.id) as readonly SeleccionOferenteFieldId[]).forEach(
    (fieldId) => {
      row[fieldId] = "";
    }
  );

  return row;
}

export function normalizeSeleccionOferenteRow(
  row: unknown,
  index: number
): SeleccionOferenteRow {
  const candidate = getRowCandidate(row);
  const normalized = {
    ...createEmptySeleccionOferenteRow(),
  };

  (
    SELECCION_OFERENTE_FIELDS.map((field) => field.id) as readonly SeleccionOferenteFieldId[]
  ).forEach((fieldId) => {
    normalized[fieldId] = normalizeTextValue(candidate[fieldId], "");
  });

  normalized.numero = String(index + 1);

  return normalized;
}

export function normalizeSeleccionOferentes(rows: unknown) {
  return normalizeRestoredRepeatedPeopleRows(rows, SELECCION_OFERENTES_CONFIG).map(
    (row, index) => normalizeSeleccionOferenteRow(row, index)
  );
}

export function getDefaultSeleccionValues(
  empresa?: Empresa | null
): SeleccionValues {
  return {
    fecha_visita: new Date().toISOString().split("T")[0],
    modalidad: "Presencial",
    nit_empresa: empresa?.nit_empresa ?? "",
    desarrollo_actividad: "",
    ajustes_recomendaciones: "",
    nota: "",
    oferentes: getDefaultRepeatedPeopleRows(SELECCION_OFERENTES_CONFIG).map(
      (row, index) => normalizeSeleccionOferenteRow(row, index)
    ),
    asistentes: getDefaultAsistentesForMode({
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

export function normalizeSeleccionValues(
  values: Partial<SeleccionValues> | Record<string, unknown>,
  empresa?: Empresa | null
): SeleccionValues {
  const defaults = getDefaultSeleccionValues(empresa);
  const source = values as Partial<SeleccionValues> & Record<string, unknown>;

  return {
    fecha_visita:
      typeof source.fecha_visita === "string" && source.fecha_visita.trim()
        ? source.fecha_visita
        : defaults.fecha_visita,
    modalidad: normalizeModalidad(source.modalidad, defaults.modalidad),
    nit_empresa:
      typeof source.nit_empresa === "string" && source.nit_empresa.trim()
        ? source.nit_empresa
        : defaults.nit_empresa,
    desarrollo_actividad:
      extractLegacyDesarrolloActividad(source) || defaults.desarrollo_actividad,
    ajustes_recomendaciones: normalizeTextValue(
      source.ajustes_recomendaciones,
      defaults.ajustes_recomendaciones
    ),
    nota: normalizeTextValue(source.nota, defaults.nota),
    oferentes: normalizeSeleccionOferentes(source.oferentes),
    asistentes: normalizePersistedAsistentesForMode(source.asistentes, {
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

function isFilled(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export function isSeleccionOferenteComplete(row: SeleccionOferenteRow) {
  return SELECCION_OFERENTE_REQUIRED_FIELDS.every((fieldId) =>
    isFilled(row[fieldId])
  );
}

export function appendSeleccionRecommendationTemplate(
  currentValue: string,
  templateId: (typeof SELECCION_RECOMMENDATION_HELPERS)[number]["id"]
) {
  const helper = SELECCION_RECOMMENDATION_HELPERS.find(
    (entry) => entry.id === templateId
  );

  if (!helper) {
    return currentValue;
  }

  const normalizedCurrent = currentValue.trim();
  const normalizedBlock = helper.text.trim();
  if (!normalizedBlock) {
    return currentValue;
  }

  if (normalizedCurrent.includes(normalizedBlock)) {
    return currentValue;
  }

  return normalizedCurrent
    ? `${normalizedCurrent}\n\n${normalizedBlock}`
    : normalizedBlock;
}

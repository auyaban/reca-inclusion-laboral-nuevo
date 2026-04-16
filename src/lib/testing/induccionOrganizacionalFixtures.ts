import {
  getDefaultInduccionOrganizacionalValues,
  getInduccionOrganizacionalSection3ItemIds,
  type InduccionOrganizacionalValues,
} from "@/lib/induccionOrganizacional";
import type { Empresa } from "@/lib/store/empresaStore";

export const INDUCCION_ORGANIZACIONAL_TEST_EMPRESA: Empresa = {
  id: "empresa-1",
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123456",
  direccion_empresa: "Calle 1 # 2-3",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: null,
  correo_1: "contacto@acme.com",
  contacto_empresa: "Laura Gomez",
  telefono_empresa: "3000000000",
  cargo: "Gerente",
  profesional_asignado: "Marta Ruiz",
  correo_profesional: "marta@reca.com",
  asesor: "Carlos Ruiz",
  correo_asesor: "carlos@reca.com",
  caja_compensacion: "Compensar",
};

export function buildValidInduccionOrganizacionalValues(
  overrides: Partial<InduccionOrganizacionalValues> = {}
): InduccionOrganizacionalValues {
  const { section_3: section3Overrides, ...restOverrides } = overrides;
  const defaults = getDefaultInduccionOrganizacionalValues(
    INDUCCION_ORGANIZACIONAL_TEST_EMPRESA
  );

  const section3 = Object.fromEntries(
    getInduccionOrganizacionalSection3ItemIds().map((itemId) => [
      itemId,
      {
        visto: "Si",
        responsable: "Laura Gomez",
        medio_socializacion: "Video",
        descripcion: "Descripcion breve",
      },
    ])
  ) as InduccionOrganizacionalValues["section_3"];

  return {
    ...defaults,
    fecha_visita: "2026-04-15",
    modalidad: "Presencial",
    nit_empresa: "900123456",
    vinculado: {
      numero: "1",
      nombre_oferente: "Ana Perez",
      cedula: "123456",
      telefono_oferente: "3000000000",
      cargo_oferente: "Analista",
    },
    section_3: {
      ...section3,
      ...section3Overrides,
    },
    section_4: restOverrides.section_4 ?? [
      {
        medio: "Video",
        recomendacion:
          "1. Subtitulos precisos y sincronizados con dialogo y sonidos.\n2. Descripciones de audio sobre lo que sucede en video.\n3. Iluminacion adecuada y contraste alto.\n4. Audio claro, entendible y con transcripcion.\n5. Evitar parpadeos, destellos y patrones moviles.\n6. Navegabilidad e interaccion adecuadas para discapacidad cognitiva o movilidad reducida.\n7. Duracion sugerida: difusion maximo 2 minutos; formacion maximo 5 minutos.\n8. Incluir LSC para discapacidad auditiva; interprete en angulo inferior derecho.\n\nRECOMENDACION GENERAL\n- Si el video supera 10 minutos, hacer pausas cada 2-3 minutos para retroalimentacion.\n- Acompanamiento permanente durante el video para resolver preguntas.",
      },
      {
        medio: "Documentos Escritos, Presentaciones, Imagenes y Evaluaciones escritas",
        recomendacion:
          "1. Usar letra legible (Arial, Calibri, Times New Roman o Tahoma).\n2. Tamano de letra no menor a 12 puntos, ajustado a necesidad.\n3. Contraste adecuado entre fondo y letra.\n4. Interlineado sugerido de 1.5 o 2.\n5. Texto en posicion vertical de izquierda a derecha.\n6. Diseno sencillo, evitando exceso de elementos decorativos.\n7. Imagenes con tamano y resolucion adecuados.\n8. Lenguaje claro y sencillo, evitando jerga tecnica.\n9. Encabezados y subtitulos para organizar informacion.\n10. Uso de listas y tablas para estructura.\n11. Incluir descripcion en imagenes, graficos y tablas.\n12. Estructura estandar con tabla de contenido y navegacion facil.\n13. Formato estandar (PDF o HTML) compatible con lectores de pantalla.\n14. Para imagenes usar formatos estandar (JPEG o PNG) compatibles.",
      },
      {
        medio: "No aplica",
        recomendacion: "No aplica",
      },
    ],
    section_5: {
      observaciones: "Observaciones amplias de la induccion organizacional.",
    },
    asistentes: [
      { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
      { nombre: "Laura Gomez", cargo: "Gerente" },
    ],
    ...restOverrides,
  };
}

import { describe, expect, it } from "vitest";
import {
  induccionOrganizacionalSchema,
  induccionOrganizacionalFinalizeRequestSchema,
} from "@/lib/validations/induccionOrganizacional";
import { buildValidInduccionOrganizacionalValues } from "@/lib/testing/induccionOrganizacionalFixtures";
import { INDUCCION_ORGANIZACIONAL_TEST_EMPRESA } from "@/lib/testing/induccionOrganizacionalFixtures";

describe("induccionOrganizacional schema", () => {
  it("accepts a fully populated organizational induction", () => {
    const values = buildValidInduccionOrganizacionalValues();

    expect(induccionOrganizacionalSchema.safeParse(values).success).toBe(true);
  });

  it("rejects a recommendation that does not match the selected medium", () => {
    const values = buildValidInduccionOrganizacionalValues({
      section_4: [
        {
          medio: "Video",
          recomendacion: "No aplica",
        },
        {
          medio: "Documentos Escritos, Presentaciones, Imagenes y Evaluaciones escritas",
          recomendacion: "wrong",
        },
        {
          medio: "No aplica",
          recomendacion: "No aplica",
        },
      ],
    });

    expect(induccionOrganizacionalSchema.safeParse(values).success).toBe(false);
  });

  it("rejects a 'No aplica' row when the derived recommendation drifts", () => {
    const values = buildValidInduccionOrganizacionalValues({
      section_4: [
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
          recomendacion: "Video",
        },
      ],
    });

    expect(induccionOrganizacionalSchema.safeParse(values).success).toBe(false);
  });

  it("parses the finalize request envelope", () => {
    const values = buildValidInduccionOrganizacionalValues();

    expect(
      induccionOrganizacionalFinalizeRequestSchema.safeParse({
        empresa: INDUCCION_ORGANIZACIONAL_TEST_EMPRESA,
        formData: values,
        finalization_identity: {
          local_draft_session_id: "session-1",
        },
      }).success
    ).toBe(true);
  });

  it("accepts empty observations because the section note is optional", () => {
    const values = buildValidInduccionOrganizacionalValues({
      section_5: {
        observaciones: "",
      },
    });

    expect(induccionOrganizacionalSchema.safeParse(values).success).toBe(true);
  });
});

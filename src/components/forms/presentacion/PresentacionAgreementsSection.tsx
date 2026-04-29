"use client";

import { useEffect, useRef } from "react";
import type {
  FieldErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { ClipboardPaste, Plus } from "lucide-react";
import { DictationButton } from "@/components/forms/shared/DictationButton";
import { FormField } from "@/components/ui/FormField";
import type { PresentacionValues } from "@/lib/validations/presentacion";
import { cn } from "@/lib/utils";

const ACUERDOS_TEMPLATES: { key: string; label: string; text: string }[] = [
  {
    key: "objetivo_y_participantes",
    label: "Objetivo y participantes",
    text: `Se llevó a cabo una reunión virtual con el objetivo de dar a conocer Ruta de inclusión ante las iniciativas de inclusión laboral en la empresa bajo el cumplimiento Normativo.

En el encuentro participó representante clave del área de Gestión Humana, Asesora desde Agencia de Empleo y Fomento Empresarial Compensar, y desde RECA Coordinación de Empleo Inclusivo.

El espacio inicia con presentación de representante de la empresa, el cual dialoga sobre el interés de conocer la ruta y acompañamiento ante iniciativas de vinculación de personas con discapacidad.`,
  },
  {
    key: "roles_proceso_seleccion",
    label: "Roles y selección",
    text: `Seguidamente la Asesora de la Agencia clarificó que la Agencia es la entidad encargada de la selección y envío de candidatos que se ajusten a los perfiles requeridos y el proceso de envío de hojas de vida y la evaluación por competencias será ejecutado por la analista de la Agencia, y se informa el rol de RECA como operador del programa de inclusión siendo este brindar acompañamiento técnico y especializado durante todo el proceso de inclusión, sin costo alguno para la empresa.

Se informa tiempo de respuesta en el envío de candidatos siendo de 4 días hábiles a partir de la publicación de la vacante y la importancia de la flexibilización del perfil, y la no creación de un cargo en específico para población con discapacidad.`,
  },
  {
    key: "certificado_discapacidad",
    label: "Certificado",
    text: `Se reitera que la Agencia no realiza el envío del Certificado de Discapacidad, no obstante, desde Compensar, la psicóloga encargada verifica durante el contacto con el candidato si este cuenta con dicho documento siendo este proceso de preselección, posteriormente, en el proceso de firma de contrato, corresponde a la empresa validar el certificado emitido por la Secretaría de Salud.`,
  },
  {
    key: "acompanamiento_reca",
    label: "Acompañamiento RECA",
    text: `Seguidamente desde RECA se comunica los procesos a ejecutar, los cuales no tienen costo al estar con la Caja Compensar:
* Evaluación accesibilidad
* Revisión de la vacante
* Acompañamiento en procesos de entrevistas
* Acompañamiento a firma de contrato
* Inducción organizacional (Se ejecuta un único acompañamiento por cada primera firma. Para acceder nuevamente al servicio de inducción de nuevos ingresos, deberán transcurrir seis (6) meses desde el último acompañamiento realizado)
* Inducción operativa
* Sensibilización (Se ejecuta en una única oportunidad, una vez la empresa haya notificado el ingreso del candidato remitido por la agencia Compensar; antes de esto no será posible realizar la sensibilización.)
* Seguimiento a cada vinculado se realizarán seis (6) de manera individual tanto con el nuevo colaborador como con su jefe directo para asegurar una adaptación exitosa, se reitera el acompañamiento al proceso a candidatos exclusivamente remitidos por la agencia, y en el caso de la empresa tener candidatos, estos deberán ser remitido al asesor de la Agencia vía correo electrónico para así ingresar a la ruta de la Agencia y ejecutar el acompañamiento desde RECA.`,
  },
  {
    key: "seguimiento_y_normativa",
    label: "Seguimiento y normativa",
    text: `Se reitera la importancia de contar con la retroalimentación vía correo electrónico a la Agencia con copia a RECA, ante procesos de entrevista en el caso de no pasar candidatos filtros de selección y solicitar nuevos candidatos; y firma de contrato.

Se dialoga de la nueva ley 2466 del 2025, en donde se orienta ante totalidad de colaboradores la vinculación de 2 personas con discapacidad, se informa beneficios tangibles y no tangibles bajo la ley 361 art. 31 deducción en la renta por vinculación de personas con discapacidad y el apoyo que está entregando la secretaria de desarrollo.

El Decreto 0223 de 2026 es explícito al indicar en el numeral 1 de su artículo 2.2.6.3.3.33. que:

"Los aprendices no integran la base de trabajadores de carácter permanente de la empresa, para efectos del cálculo de la cuota de empleo para personas en situación de discapacidad, prevista en el numeral 17 del artículo 57 del Código Sustantivo del Trabajo."

En consecuencia y a la luz de esta nueva norma, contratar aprendices con discapacidad no sirve para aumentar el número de personas con discapacidad computables dentro de la cuota de empleo exigida, por lo cual la cuota se calculará ahora sobre la base de trabajadores permanentes, y el decreto 0223 excluye a los aprendices de esa base.

Sin embargo, el Decreto genera un incentivo distinto en el numeral 2 del mismo artículo, donde establece que:

"La cuota de aprendices se reducirá en un 50% si las personas contratadas tienen una discapacidad comprobada no inferior al 25%", en cumplimiento del parágrafo del artículo 31 de la Ley 361 de 1997.

Es decir, que sí es posible contratar aprendices con discapacidad, pero el efecto jurídico directo es sobre la cuota de aprendices (Ley 789 de 2002), no sobre la cuota de empleo para personas con discapacidad (Ley 2466 de 2025 art. 57 num. 17 CST).


Se reitera a la empresa la importancia de contactar a los candidatos en el menor tiempo posible una vez se revisen los correos con las hojas de vida. Debido a la alta demanda y a la dinámica actual del mercado laboral, si no se realiza el contacto oportunamente, es probable que los candidatos ya se encuentren en otros procesos de selección o vinculados laboralmente.`,
  },
  {
    key: "casos_alcance_cierre",
    label: "Casos, alcance y cierre",
    text: `Durante la reunión, se socializaron casos exitosos de inclusión y el apoyo de interprete lengua de señas en el caso de vincular personas con discapacidad auditiva.

Se reitera que el alcance operativo de la ruta de inclusión abarca Bogotá y Cundinamarca.

Se agradece espacio, se informa envío de presentación y se estará a la espera de contacto para dar continuidad a la ruta.

Se finaliza reunión sin novedad`,
  },
];

type PresentacionAgreementsSectionProps = {
  register: UseFormRegister<PresentacionValues>;
  errors: FieldErrors<PresentacionValues>;
  acuerdos: string;
  getValues: UseFormGetValues<PresentacionValues>;
  setValue: UseFormSetValue<PresentacionValues>;
};

export function PresentacionAgreementsSection({
  register,
  errors,
  acuerdos,
  getValues,
  setValue,
}: PresentacionAgreementsSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const acuerdosField = register("acuerdos_observaciones");

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [acuerdos]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardPaste className="h-4 w-4 text-reca" />
          <h3 className="text-sm font-semibold text-gray-700">
            Insertar texto preestablecido
          </h3>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          Haz clic en cualquier bloque para añadirlo al campo de acuerdos.
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACUERDOS_TEMPLATES.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => {
                const current = getValues("acuerdos_observaciones");
                setValue(
                  "acuerdos_observaciones",
                  current ? `${current}\n\n${template.text}` : template.text,
                  { shouldValidate: true }
                );
              }}
              className={cn(
                "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium leading-snug transition-colors",
                "border-reca-200 bg-reca-50 text-reca hover:border-reca hover:bg-reca-100"
              )}
            >
              <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {template.label}
            </button>
          ))}
        </div>
      </div>

      <FormField
        label="Acuerdos y observaciones de la reunión"
        htmlFor="acuerdos_observaciones"
        required
        error={errors.acuerdos_observaciones?.message}
      >
        <div className="space-y-2">
          <textarea
            id="acuerdos_observaciones"
            rows={1}
            {...acuerdosField}
            ref={(element) => {
              acuerdosField.ref(element);
              textareaRef.current = element;
            }}
            placeholder="Describe los acuerdos, compromisos y observaciones relevantes de la visita, o usa los bloques de arriba para insertar texto preestablecido."
            className={cn(
              "min-h-[18rem] w-full overflow-hidden rounded-xl border px-3.5 py-3 text-sm",
              "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
              errors.acuerdos_observaciones
                ? "border-red-400 bg-red-50"
                : "border-gray-200"
            )}
          />

          <div className="flex items-center justify-between gap-3">
            <DictationButton
              onTranscript={(text) => {
                const current = getValues("acuerdos_observaciones");
                setValue(
                  "acuerdos_observaciones",
                  current ? `${current} ${text}` : text,
                  { shouldValidate: true }
                );
              }}
            />

            <div className="flex items-center gap-3">
              {acuerdos.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setValue("acuerdos_observaciones", "", {
                      shouldValidate: true,
                    })
                  }
                  className="text-xs text-gray-400 transition-colors hover:text-red-500"
                >
                  Limpiar
                </button>
              )}
              <span className="text-xs text-gray-400">
                {acuerdos.length} caracteres
              </span>
            </div>
          </div>
        </div>
      </FormField>
    </div>
  );
}

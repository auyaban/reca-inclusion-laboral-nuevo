"use client";

import { useEffect, useRef, useState } from "react";
import type {
  FieldErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import {
  ClipboardPaste,
  Loader2,
  Mic,
  MicOff,
  Plus,
} from "lucide-react";
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
    text: `Seguidamente desde RECA se comunica los procesos a ejecutar, los cuales no tienen costo al estar con la caja Compensar:
* Evaluación accesibilidad
* Revisión de la vacante
* Acompañamiento en procesos de entrevistas
* Acompañamiento a firma de contrato
* Inducción organizacional
* Inducción operativa
* Sensibilización
* Seguimiento a cada vinculado se realizarán seis (6) de manera individual tanto con el nuevo colaborador como con su jefe directo para asegurar una adaptación exitosa, se reitera el acompañamiento al proceso a candidatos exclusivamente remitidos por la agencia, y en el caso de la empresa tener candidatos estos deberán ser remitido al asesor de la Agencia vía correo electrónico para asi ingresar a la ruta de la Agencia y ejecutar el acompañamiento desde RECA.`,
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

Es decir, que sí es posible contratar aprendices con discapacidad, pero el efecto jurídico directo es sobre la cuota de aprendices (Ley 789 de 2002), no sobre la cuota de empleo para personas con discapacidad (Ley 2466 de 2025 art. 57 num. 17 CST).`,
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

function DictationButton({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function toggle() {
    setError(null);
    if (recording) {
      mediaRef.current?.stop();
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Sin acceso al micrófono");
      return;
    }

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      setLoading(true);

      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Sin sesión activa");
        }

        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        const form = new FormData();
        form.append("audio_file", blob, "dictation.webm");
        form.append("language", "es");

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dictate-transcribe`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: form,
          }
        );
        const json = await response.json();

        if (!response.ok || !json.ok) {
          throw new Error(json.error?.message ?? "Error al transcribir");
        }

        onTranscript(json.text);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Error al transcribir"
        );
      } finally {
        setLoading(false);
      }
    };

    mediaRecorder.start();
    mediaRef.current = mediaRecorder;
    setRecording(true);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        title={recording ? "Detener y transcribir" : "Dictar con OpenAI Whisper"}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          recording
            ? "animate-pulse bg-red-100 text-red-600 hover:bg-red-200"
            : loading
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        )}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : recording ? (
          <MicOff className="h-3.5 w-3.5" />
        ) : (
          <Mic className="h-3.5 w-3.5" />
        )}
        {loading ? "Transcribiendo..." : recording ? "Detener" : "Dictar"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

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

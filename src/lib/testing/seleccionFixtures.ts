import { normalizeSeleccionValues } from "@/lib/seleccion";
import type { SeleccionOferenteRow, SeleccionValues } from "@/lib/validations/seleccion";

export const SELECCION_TEST_EMPRESA = {
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
} as const;

export function buildValidSeleccionOferenteRow(
  overrides: Partial<SeleccionOferenteRow> = {}
): SeleccionOferenteRow {
  return {
    numero: "1",
    nombre_oferente: "Ana Perez",
    cedula: "123456",
    certificado_porcentaje: "45",
    discapacidad: "Discapacidad auditiva",
    genero: "",
    telefono_oferente: "3000000000",
    resultado_certificado: "Aprobado",
    cargo_oferente: "Analista",
    nombre_contacto_emergencia: "Mario Perez",
    parentesco: "Hermano",
    telefono_emergencia: "3010000000",
    fecha_nacimiento: "1990-01-01",
    edad: "34",
    pendiente_otros_oferentes: "No",
    lugar_firma_contrato: "Bogota",
    fecha_firma_contrato: "2026-04-15",
    cuenta_pension: "No",
    tipo_pension: "No aplica",
    medicamentos_nivel_apoyo: "0. No requiere apoyo.",
    medicamentos_conocimiento: "1. Conoce los medicamentos que consume.",
    medicamentos_horarios:
      "1. Conoce los horarios de toma de medicamentos que consume.",
    medicamentos_nota: "Sin novedad",
    alergias_nivel_apoyo: "0. No requiere apoyo.",
    alergias_tipo: "0. No presenta alergias.",
    alergias_nota: "Sin novedad",
    restriccion_nivel_apoyo: "0. No requiere apoyo.",
    restriccion_conocimiento: "0. No tiene restricciones medicas.",
    restriccion_nota: "Sin novedad",
    controles_nivel_apoyo: "0. No requiere apoyo.",
    controles_asistencia:
      "1. Asiste a controles medicos con especialista y conoce el manejo.",
    controles_frecuencia: "Mensual",
    controles_nota: "Sin novedad",
    desplazamiento_nivel_apoyo: "0. No requiere apoyo.",
    desplazamiento_modo:
      "0. Se desplaza de manera independiente sin necesidad de apoyos (ortesis, baston, silla de ruedas entre otros).",
    desplazamiento_transporte: "Caminando.",
    desplazamiento_nota: "Sin novedad",
    ubicacion_nivel_apoyo: "0. No requiere apoyo.",
    ubicacion_ciudad: "0. Sabe ubicarse en la ciudad de manera autonoma.",
    ubicacion_aplicaciones: "Se ubica por puntos de referencia y direcciones.",
    ubicacion_nota: "Sin novedad",
    dinero_nivel_apoyo: "0. No requiere apoyo.",
    dinero_reconocimiento: "Autonomo.",
    dinero_manejo: "0. Reconoce y maneja el dinero de manera autonoma.",
    dinero_medios: "Dinero fisico.",
    dinero_nota: "Sin novedad",
    presentacion_nivel_apoyo: "0. No requiere apoyo.",
    presentacion_personal: "0. Su codigo de vestuario es acorde al contexto.",
    presentacion_nota: "Sin novedad",
    comunicacion_escrita_nivel_apoyo: "0. No requiere apoyo.",
    comunicacion_escrita_apoyo:
      "0. Si conoce y maneja los apoyos (Jaws, Magic, el lector de pantalla de Windows/IOS).",
    comunicacion_escrita_nota: "Sin novedad",
    comunicacion_verbal_nivel_apoyo: "0. No requiere apoyo.",
    comunicacion_verbal_apoyo:
      "0. Si conoce y maneja los apoyos (Centro de relevo, entre otros).",
    comunicacion_verbal_nota: "Sin novedad",
    decisiones_nivel_apoyo: "0. No requiere apoyo.",
    toma_decisiones: "0. Toma las decisiones de manera autonoma.",
    toma_decisiones_nota: "Sin novedad",
    aseo_nivel_apoyo: "0. No requiere apoyo.",
    alimentacion:
      "0. No requiere apoyo en sus actividades de la vida diaria.",
    aseo_criar_apoyo: "No aplica",
    aseo_comunicacion_apoyo: "No aplica",
    aseo_ayudas_apoyo: "No aplica",
    aseo_alimentacion: "No aplica",
    aseo_movilidad_funcional: "No aplica",
    aseo_higiene_aseo: "No aplica",
    aseo_nota: "Sin novedad",
    instrumentales_nivel_apoyo: "0. No requiere apoyo.",
    instrumentales_actividades:
      "0. No requiere apoyo en actividades instrumentales de la vida diaria.",
    instrumentales_criar_apoyo: "No aplica",
    instrumentales_comunicacion_apoyo: "No aplica",
    instrumentales_movilidad_apoyo: "No aplica",
    instrumentales_finanzas: "No aplica",
    instrumentales_cocina_limpieza: "No aplica",
    instrumentales_crear_hogar: "No aplica",
    instrumentales_salud_cuenta_apoyo: "No aplica",
    instrumentales_nota: "Sin novedad",
    actividades_nivel_apoyo: "0. No requiere apoyo.",
    actividades_apoyo:
      "0. No requiere apoyo en sus actividades laborales.",
    actividades_esparcimiento_apoyo: "No aplica",
    actividades_esparcimiento_cuenta_apoyo: "No aplica",
    actividades_complementarios_apoyo: "No aplica",
    actividades_complementarios_cuenta_apoyo: "No aplica",
    actividades_subsidios_cuenta_apoyo: "No aplica",
    actividades_nota: "Sin novedad",
    discriminacion_nivel_apoyo: "0. No requiere apoyo.",
    discriminacion: "0. No ha sufrido de discriminacion.",
    discriminacion_violencia_apoyo: "No aplica",
    discriminacion_violencia_cuenta_apoyo: "No aplica",
    discriminacion_vulneracion_apoyo: "No aplica",
    discriminacion_vulneracion_cuenta_apoyo: "No aplica",
    discriminacion_nota: "Sin novedad",
    ...overrides,
  };
}

export function buildValidSeleccionValues(
  overrides: Partial<SeleccionValues> = {}
): SeleccionValues {
  const normalized = normalizeSeleccionValues(
    {
      fecha_visita: "2026-04-15",
      modalidad: "Presencial",
      nit_empresa: "900123456",
      desarrollo_actividad: "Actividad compartida",
      ajustes_recomendaciones: "Ajuste final",
      nota: "Nota final",
      asistentes: [
        { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
        { nombre: "Laura Gomez", cargo: "Gerente" },
      ],
      oferentes: [buildValidSeleccionOferenteRow()],
      ...overrides,
    },
    SELECCION_TEST_EMPRESA
  );

  return normalized;
}

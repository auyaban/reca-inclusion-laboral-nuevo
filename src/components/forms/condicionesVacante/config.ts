"use client";

export const CONDICIONES_DISABLED_SECTION_MESSAGE =
  "Selecciona una empresa para habilitar esta sección del documento.";

export const CONDICIONES_COMPANY_SECTION_DESCRIPTION =
  "Confirma la empresa, revisa el snapshot operativo y ajusta los datos base del acta.";

export const CONDICIONES_VACANCY_TEXT_FIELDS = [
  {
    id: "nombre_vacante",
    label: "Nombre de la vacante",
    placeholder: "Ej: Auxiliar administrativo",
  },
  {
    id: "numero_vacantes",
    label: "Número de vacantes",
    placeholder: "Ej: 2",
  },
  {
    id: "edad",
    label: "Edad",
    placeholder: "Ej: 18 a 35 años",
  },
  {
    id: "modalidad_trabajo",
    label: "Modalidad de trabajo",
    placeholder: "Ej: Presencial de lunes a viernes",
  },
  {
    id: "lugar_trabajo",
    label: "Lugar de trabajo",
    placeholder: "Ej: Sede norte",
  },
  {
    id: "salario_asignado",
    label: "Salario asignado",
    placeholder: "Ej: 1.800.000 + prestaciones",
  },
  {
    id: "firma_contrato",
    label: "Firma de contrato",
    placeholder: "Describe el proceso o condición",
  },
  {
    id: "aplicacion_pruebas",
    label: "Aplicación de pruebas",
    placeholder: "Describe si aplica o no",
  },
  {
    id: "beneficios_adicionales",
    label: "Beneficios adicionales",
    placeholder: "Ej: Ruta, alimentación, bonos",
  },
  {
    id: "cargo_flexible_genero",
    label: "Cargo flexible según género",
    placeholder: "Describe la condición definida",
  },
  {
    id: "beneficios_mujeres",
    label: "Beneficios adicionales a mujeres",
    placeholder: "Describe si aplica",
  },
] as const;

export const CONDICIONES_EDUCATION_CHECKBOXES = [
  { id: "nivel_primaria", label: "Primaria" },
  { id: "nivel_bachiller", label: "Bachiller" },
  { id: "nivel_tecnico_profesional", label: "Técnico Profesional" },
  { id: "nivel_profesional", label: "Profesional" },
  { id: "nivel_especializacion", label: "Especialización" },
  { id: "nivel_tecnologo", label: "Tecnólogo" },
] as const;

export const CONDICIONES_EDUCATION_TEXTAREAS = [
  {
    id: "especificaciones_formacion",
    label: "Especificaciones de la formación académica",
    placeholder: "Detalla requisitos o estudios clave para el cargo.",
  },
  {
    id: "conocimientos_basicos",
    label: "Conocimientos básicos / programas",
    placeholder: "Ej: Excel intermedio, SAP, servicio al cliente.",
  },
  {
    id: "observaciones",
    label: "Observaciones",
    placeholder: "Añade condiciones relevantes del bloque educativo.",
  },
  {
    id: "funciones_tareas",
    label: "Principales funciones y tareas asignadas al cargo",
    placeholder: "Describe las actividades centrales del rol.",
  },
  {
    id: "herramientas_equipos",
    label: "Herramientas, equipos e implementos a utilizar",
    placeholder: "Lista herramientas, equipos o software del cargo.",
  },
] as const;

export const CONDICIONES_EDUCATION_TEXT_FIELDS = [
  {
    id: "hora_ingreso",
    label: "Hora de ingreso",
    placeholder: "Ej: 8:00 a. m.",
  },
  {
    id: "hora_salida",
    label: "Hora de salida",
    placeholder: "Ej: 5:00 p. m.",
  },
  {
    id: "dias_laborables",
    label: "Días laborables",
    placeholder: "Ej: Lunes a viernes",
  },
  {
    id: "dias_flexibles",
    label: 'Días laborables flexibles "familia e hijo"',
    placeholder: "Describe la flexibilidad definida",
  },
] as const;

export const CONDICIONES_CAPABILITIES_CATEGORIES = [
  {
    title: "Habilidades cognitivas",
    observationsField: "observaciones_cognitivas",
    items: [
      { id: "lectura", label: "Lectura" },
      { id: "comprension_lectora", label: "Comprensión lectora" },
      { id: "escritura", label: "Escritura" },
      { id: "comunicacion_verbal", label: "Comunicación verbal" },
      { id: "razonamiento_logico", label: "Razonamiento lógico - matemático" },
      { id: "conteo_reporte", label: "Conteo y reporte de cantidad" },
      { id: "clasificacion_objetos", label: "Clasificación de objetos" },
      { id: "velocidad_ejecucion", label: "Velocidad de ejecución" },
      { id: "concentracion", label: "Concentración" },
      { id: "memoria", label: "Memoria" },
      { id: "ubicacion_espacial", label: "Ubicación espacial" },
      { id: "atencion", label: "Atención" },
    ],
  },
  {
    title: "Habilidades básicas (Motricidad fina)",
    observationsField: "observaciones_motricidad_fina",
    items: [
      { id: "agarre", label: "Agarre" },
      { id: "precision", label: "Precisión" },
      { id: "digitacion", label: "Digitación" },
      { id: "agilidad_manual", label: "Agilidad manual" },
      { id: "coordinacion_ojo_mano", label: "Coordinación ojo - mano" },
    ],
  },
  {
    title: "Habilidades básicas (Motricidad gruesa)",
    observationsField: "observaciones_motricidad_gruesa",
    items: [
      { id: "esfuerzo_fisico", label: "Esfuerzo físico" },
      { id: "equilibrio_corporal", label: "Equilibrio corporal" },
      { id: "lanzar_objetos", label: "Lanzar objetos" },
    ],
  },
  {
    title: "Competencias transversales",
    observationsField: "observaciones_transversales",
    items: [
      { id: "seguimiento_instrucciones", label: "Seguimiento de instrucciones" },
      { id: "resolucion_conflictos", label: "Resolución de conflictos" },
      { id: "autonomia_tareas", label: "Autonomía en desarrollo de tareas" },
      { id: "trabajo_equipo", label: "Trabajo en equipo" },
      { id: "adaptabilidad", label: "Adaptabilidad" },
      { id: "flexibilidad", label: "Flexibilidad" },
      { id: "comunicacion_asertiva", label: "Comunicación asertiva y efectiva" },
      { id: "manejo_tiempo", label: "Manejo del tiempo" },
      { id: "liderazgo", label: "Liderazgo" },
      { id: "escucha_activa", label: "Escucha activa" },
      { id: "proactividad", label: "Proactividad" },
    ],
  },
] as const;

export const CONDICIONES_POSTURES = [
  { id: "sentado", label: "Sentado" },
  { id: "semisentado", label: "Semisentado" },
  { id: "de_pie", label: "De pie recto" },
  { id: "agachado", label: "Agachado" },
  { id: "uso_extremidades_superiores", label: "Uso extremidades superiores" },
] as const;

export const CONDICIONES_RISK_CATEGORIES = [
  {
    title: "Físico",
    items: [
      { id: "ruido", label: "Ruido" },
      { id: "iluminacion", label: "Iluminación" },
      { id: "temperaturas_externas", label: "Temperaturas externas" },
      { id: "vibraciones", label: "Vibraciones" },
      { id: "presion_atmosferica", label: "Presión atmosférica" },
      { id: "radiaciones", label: "Radiaciones ionizantes y no ionizantes" },
    ],
  },
  {
    title: "Químico",
    items: [
      { id: "polvos_organicos_inorganicos", label: "Polvos orgánicos inorgánicos" },
      { id: "fibras", label: "Fibras" },
      { id: "liquidos", label: "Líquidos" },
      { id: "gases_vapores", label: "Gases y vapores" },
      { id: "humos_metalicos", label: "Humos metálicos" },
      { id: "humos_no_metalicos", label: "Humos no metálicos" },
      { id: "material_particulado", label: "Material particulado" },
    ],
  },
  {
    title: "Condiciones de seguridad",
    items: [
      { id: "electrico", label: "Eléctrico" },
      { id: "locativo", label: "Locativo" },
      { id: "accidentes_transito", label: "Accidentes de tránsito" },
      { id: "publicos", label: "Públicos" },
      { id: "mecanico", label: "Mecánico" },
    ],
  },
  {
    title: "Psicosocial",
    items: [
      { id: "gestion_organizacional", label: "Gestión organizacional" },
      {
        id: "caracteristicas_organizacion",
        label: "Características de la organización del trabajo",
      },
      {
        id: "caracteristicas_grupo_social",
        label: "Características del grupo social del trabajo",
      },
      { id: "condiciones_tarea", label: "Condiciones de la tarea" },
      { id: "interfase_persona_tarea", label: "Interfase persona tarea" },
      { id: "jornada_trabajo", label: "Jornada de trabajo" },
    ],
  },
  {
    title: "Ergonómico",
    items: [
      { id: "postura_trabajo", label: "Postura de trabajo" },
      { id: "puesto_trabajo", label: "Puesto de trabajo" },
      { id: "movimientos_repetitivos", label: "Movimientos repetitivos" },
      { id: "manipulacion_cargas", label: "Manipulación de cargas" },
      { id: "herramientas_equipos_riesgo", label: "Herramientas - Equipos" },
      { id: "organizacion_trabajo", label: "Organización del trabajo" },
    ],
  },
] as const;

export const CONDICIONES_DISABILITIES_INTRO =
  "Este bloque resume los tipos de discapacidad compatibles con el cargo y deja visible el espacio donde se mostrarán los ajustes razonables sugeridos.";

export const CONDICIONES_RECOMMENDATIONS_TEMPLATE = {
  key: "proceso_vacante",
  label: "Proceso vacante",
  text: `* Ejecutar el proceso de retroalimentación a los candidatos sobre quién continúa o no en el proceso.

* Acompañamiento desde RECA durante el proceso.

* La empresa debe dar el visto bueno al perfil levantado junto al asesor de la Agencia y RECA, para que desde la Agencia se publique la vacante y se realice el envío de candidatos dentro de los 4 días hábiles.

* Remisión del perfil para el proceso correspondiente.

El presente perfil describe los tipos de discapacidad que, tras el análisis de las funciones del cargo, el entorno de trabajo, los factores de riesgo y las demandas propias del rol, se consideran compatibles para la vinculación laboral de personas con discapacidad, bajo un enfoque de inclusión social y laboral.`,
} as const;

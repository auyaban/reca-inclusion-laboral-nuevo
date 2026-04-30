import { create } from "zustand";
import { type UsuarioNuevo } from "@/lib/ods/schemas";
import { calculateService } from "@/lib/ods/serviceCalculation";

export type ProfesionalSource = "profesionales" | "interpretes";

export type OdsPersonaRow = {
  // _id local para `key` estable en React. NO se envía a la BD; sirve para
  // que al borrar/reordenar filas no se re-monten todas las que sobreviven
  // (lo cual perdería foco/seleccion del operador).
  _id?: string;
  cedula_usuario: string;
  nombre_usuario: string;
  discapacidad_usuario: string;
  genero_usuario: string;
  fecha_ingreso: string;
  tipo_contrato: string;
  cargo_servicio: string;
};

export type OdsSeccion1 = {
  orden_clausulada: "si" | "no";
  nombre_profesional: string;
  profesionalSource: ProfesionalSource | null;
};

export type OdsSeccion2 = {
  nit_empresa: string;
  nombre_empresa: string;
  caja_compensacion: string;
  asesor_empresa: string;
  sede_empresa: string;
};

export type OdsSeccion3 = {
  fecha_servicio: string;
  codigo_servicio: string;
  referencia_servicio: string;
  descripcion_servicio: string;
  modalidad_servicio: string;
  valor_base: number;
  valor_virtual: number;
  valor_bogota: number;
  valor_otro: number;
  todas_modalidades: number;
  valor_interprete: number;
  servicio_interpretacion: boolean;
  horas_interprete: number;
  minutos_interprete: number;
};

export type OdsSeccion4 = {
  rows: OdsPersonaRow[];
};

export type OdsSeccion5 = {
  observaciones: string;
  observacion_agencia: string;
  seguimiento_servicio: string;
};

export type OdsResumen = {
  fecha_servicio: string;
  nombre_profesional: string;
  nombre_empresa: string;
  codigo_servicio: string;
  valor_total: number;
};

export type OdsStore = {
  seccion1: OdsSeccion1;
  seccion2: OdsSeccion2;
  seccion3: OdsSeccion3;
  seccion4: OdsSeccion4;
  seccion5: OdsSeccion5;
  usuarios_nuevos: UsuarioNuevo[];
  resumen: OdsResumen;
  setSeccion1: (patch: Partial<OdsSeccion1>) => void;
  setSeccion2: (patch: Partial<OdsSeccion2>) => void;
  setSeccion3: (patch: Partial<OdsSeccion3>) => void;
  setSeccion4Rows: (rows: OdsPersonaRow[]) => void;
  setSeccion5: (patch: Partial<OdsSeccion5>) => void;
  addUsuarioNuevo: (usuario: UsuarioNuevo) => void;
  removeUsuarioNuevo: (index: number) => void;
  clearUsuariosNuevos: () => void;
  setUsuariosNuevos: (usuarios: UsuarioNuevo[]) => void;
  computeResumen: () => void;
  reset: () => void;
};

function defaultSeccion1(): OdsSeccion1 {
  return { orden_clausulada: "no", nombre_profesional: "", profesionalSource: null };
}

function defaultSeccion2(): OdsSeccion2 {
  return { nit_empresa: "", nombre_empresa: "", caja_compensacion: "", asesor_empresa: "", sede_empresa: "" };
}

function defaultSeccion3(): OdsSeccion3 {
  return { fecha_servicio: "", codigo_servicio: "", referencia_servicio: "", descripcion_servicio: "", modalidad_servicio: "", valor_base: 0, valor_virtual: 0, valor_bogota: 0, valor_otro: 0, todas_modalidades: 0, valor_interprete: 0, servicio_interpretacion: false, horas_interprete: 0, minutos_interprete: 0 };
}

function defaultSeccion4(): OdsSeccion4 {
  return { rows: [] };
}

function defaultSeccion5(): OdsSeccion5 {
  return { observaciones: "", observacion_agencia: "", seguimiento_servicio: "" };
}

function computeResumenFromState(state: OdsStore): OdsResumen {
  const calc = calculateService({
    valor_base: state.seccion3.valor_base,
    servicio_interpretacion: state.seccion3.servicio_interpretacion,
    horas_interprete: state.seccion3.horas_interprete,
    minutos_interprete: state.seccion3.minutos_interprete,
    modalidad_servicio: state.seccion3.modalidad_servicio,
  });
  return {
    fecha_servicio: state.seccion3.fecha_servicio,
    nombre_profesional: state.seccion1.nombre_profesional,
    nombre_empresa: state.seccion2.nombre_empresa,
    codigo_servicio: state.seccion3.codigo_servicio,
    valor_total: calc.valor_total,
  };
}

export const useOdsStore = create<OdsStore>((set, get) => ({
  seccion1: defaultSeccion1(),
  seccion2: defaultSeccion2(),
  seccion3: defaultSeccion3(),
  seccion4: defaultSeccion4(),
  seccion5: defaultSeccion5(),
  usuarios_nuevos: [],
  resumen: { fecha_servicio: "", nombre_profesional: "", nombre_empresa: "", codigo_servicio: "", valor_total: 0 },

  setSeccion1: (patch) => set((state) => ({ seccion1: { ...state.seccion1, ...patch } })),
  setSeccion2: (patch) => set((state) => ({ seccion2: { ...state.seccion2, ...patch } })),
  setSeccion3: (patch) => set((state) => ({ seccion3: { ...state.seccion3, ...patch } })),
  setSeccion4Rows: (rows) => set(() => ({ seccion4: { rows } })),
  setSeccion5: (patch) => set((state) => ({ seccion5: { ...state.seccion5, ...patch } })),
  addUsuarioNuevo: (usuario) => set((state) => ({ usuarios_nuevos: [...state.usuarios_nuevos, usuario] })),
  removeUsuarioNuevo: (index) => set((state) => ({ usuarios_nuevos: state.usuarios_nuevos.filter((_, i) => i !== index) })),
  clearUsuariosNuevos: () => set(() => ({ usuarios_nuevos: [] })),
  setUsuariosNuevos: (usuarios) => set(() => ({ usuarios_nuevos: usuarios })),
  computeResumen: () => set((state) => ({ resumen: computeResumenFromState(state) })),
  reset: () => set({
    seccion1: defaultSeccion1(),
    seccion2: defaultSeccion2(),
    seccion3: defaultSeccion3(),
    seccion4: defaultSeccion4(),
    seccion5: defaultSeccion5(),
    usuarios_nuevos: [],
    resumen: { fecha_servicio: "", nombre_profesional: "", nombre_empresa: "", codigo_servicio: "", valor_total: 0 },
  }),
}));

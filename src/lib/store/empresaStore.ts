import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Empresa {
  id: string;
  nombre_empresa: string;
  nit_empresa: string | null;
  direccion_empresa: string | null;
  ciudad_empresa: string | null;
  sede_empresa: string | null;
  zona_empresa: string | null;
  correo_1: string | null;
  contacto_empresa: string | null;
  telefono_empresa: string | null;
  cargo: string | null;
  profesional_asignado: string | null;
  correo_profesional: string | null;
  asesor: string | null;
  correo_asesor: string | null;
  caja_compensacion: string | null;
}

interface EmpresaStore {
  empresa: Empresa | null;
  setEmpresa: (empresa: Empresa) => void;
  clearEmpresa: () => void;
}

export const useEmpresaStore = create<EmpresaStore>()(
  persist(
    (set) => ({
      empresa: null,
      setEmpresa: (empresa) => set({ empresa }),
      clearEmpresa: () => set({ empresa: null }),
    }),
    {
      name: "reca-empresa-seleccionada",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

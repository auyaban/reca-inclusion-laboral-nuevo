export type CalculationInput = {
  valor_base: number;
  servicio_interpretacion: boolean;
  horas_interprete: number;
  minutos_interprete: number;
  modalidad_servicio: string;
};

export type CalculationResult = {
  valor_virtual: number;
  valor_bogota: number;
  valor_otro: number;
  todas_modalidades: number;
  valor_interprete: number;
  valor_total: number;
  horas_decimales: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateService(input: CalculationInput): CalculationResult {
  const horas_decimales = round2(input.horas_interprete + input.minutos_interprete / 60);

  if (input.servicio_interpretacion) {
    const valor_interprete = round2(horas_decimales * input.valor_base);
    return {
      valor_virtual: 0,
      valor_bogota: 0,
      valor_otro: 0,
      todas_modalidades: 0,
      valor_interprete,
      valor_total: valor_interprete,
      horas_decimales,
    };
  }

  let valor_virtual = 0;
  let valor_bogota = 0;
  let valor_otro = 0;
  let todas_modalidades = 0;

  switch (input.modalidad_servicio) {
    case "Virtual":
      valor_virtual = input.valor_base;
      break;
    case "Bogotá":
      valor_bogota = input.valor_base;
      break;
    case "Fuera de Bogotá":
      valor_otro = input.valor_base;
      break;
    case "Todas":
      todas_modalidades = input.valor_base;
      break;
  }

  const valor_total = round2(valor_virtual + valor_bogota + valor_otro + todas_modalidades);

  return {
    valor_virtual,
    valor_bogota,
    valor_otro,
    todas_modalidades,
    valor_interprete: 0,
    valor_total,
    horas_decimales,
  };
}

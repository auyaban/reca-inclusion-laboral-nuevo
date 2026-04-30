import Decimal from "decimal.js";

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

function d2(n: Decimal): number {
  return n.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function calculateService(input: CalculationInput): CalculationResult {
  // Pre-condición: si interpretación está activa pero aún no hay horas/minutos,
  // devolvemos un resultado en cero. NO lanzamos: la función se llama desde
  // `computeResumen` en cada render del store, y un throw allí rompe el wizard
  // mientras el operador está editando. La validación dura se hace al submit.
  if (input.servicio_interpretacion && input.horas_interprete === 0 && input.minutos_interprete === 0) {
    return {
      valor_virtual: 0,
      valor_bogota: 0,
      valor_otro: 0,
      todas_modalidades: 0,
      valor_interprete: 0,
      valor_total: 0,
      horas_decimales: 0,
    };
  }

  const horas = new Decimal(input.horas_interprete);
  const minutos = new Decimal(input.minutos_interprete);
  const sesenta = new Decimal(60);
  const horas_decimales = d2(horas.plus(minutos.div(sesenta)));

  const valorBase = new Decimal(input.valor_base);

  // Routing del valor_base a la columna de modalidad correspondiente.
  // Replica el comportamiento del legacy: las 4 columnas (valor_virtual,
  // valor_bogota, valor_otro, todas_modalidades) se llenan según
  // modalidad_servicio incluso cuando hay servicio de interpretación
  // — para que el reporte mantenga la tarifa por modalidad junto con
  // la suma del intérprete.
  let valor_virtual = new Decimal(0);
  let valor_bogota = new Decimal(0);
  let valor_otro = new Decimal(0);
  let todas_modalidades = new Decimal(0);

  switch (input.modalidad_servicio) {
    case "Virtual":
      valor_virtual = valorBase;
      break;
    case "Bogotá":
      valor_bogota = valorBase;
      break;
    case "Fuera de Bogotá":
      valor_otro = valorBase;
      break;
    case "Todas las modalidades":
      todas_modalidades = valorBase;
      break;
  }

  if (input.servicio_interpretacion) {
    const horasDec = new Decimal(horas_decimales);
    const valor_interprete = d2(horasDec.mul(valorBase));
    return {
      valor_virtual: d2(valor_virtual),
      valor_bogota: d2(valor_bogota),
      valor_otro: d2(valor_otro),
      todas_modalidades: d2(todas_modalidades),
      valor_interprete,
      // valor_total = valor_interprete cuando hay interpretación (schema check).
      valor_total: valor_interprete,
      horas_decimales,
    };
  }

  const valor_total = d2(
    valor_virtual.plus(valor_bogota).plus(valor_otro).plus(todas_modalidades)
  );

  return {
    valor_virtual: d2(valor_virtual),
    valor_bogota: d2(valor_bogota),
    valor_otro: d2(valor_otro),
    todas_modalidades: d2(todas_modalidades),
    valor_interprete: 0,
    valor_total,
    horas_decimales,
  };
}

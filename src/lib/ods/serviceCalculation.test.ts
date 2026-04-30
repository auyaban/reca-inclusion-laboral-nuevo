import { describe, it, expect } from "vitest";
import { calculateService } from "./serviceCalculation";

describe("serviceCalculation", () => {
  describe("modalidad sin interpretacion", () => {
    it("Virtual asigna valor_virtual = valor_base", () => {
      const result = calculateService({
        valor_base: 100000,
        servicio_interpretacion: false,
        horas_interprete: 0,
        minutos_interprete: 0,
        modalidad_servicio: "Virtual",
      });
      expect(result.valor_virtual).toBe(100000);
      expect(result.valor_bogota).toBe(0);
      expect(result.valor_otro).toBe(0);
      expect(result.todas_modalidades).toBe(0);
      expect(result.valor_interprete).toBe(0);
      expect(result.valor_total).toBe(100000);
    });

    it("Bogota asigna valor_bogota = valor_base", () => {
      const result = calculateService({
        valor_base: 150000,
        servicio_interpretacion: false,
        horas_interprete: 0,
        minutos_interprete: 0,
        modalidad_servicio: "Bogotá",
      });
      expect(result.valor_bogota).toBe(150000);
      expect(result.valor_total).toBe(150000);
    });

    it("Fuera de Bogota asigna valor_otro = valor_base", () => {
      const result = calculateService({
        valor_base: 200000,
        servicio_interpretacion: false,
        horas_interprete: 0,
        minutos_interprete: 0,
        modalidad_servicio: "Fuera de Bogotá",
      });
      expect(result.valor_otro).toBe(200000);
      expect(result.valor_total).toBe(200000);
    });

    it("Todas asigna todas_modalidades = valor_base", () => {
      const result = calculateService({
        valor_base: 175000,
        servicio_interpretacion: false,
        horas_interprete: 0,
        minutos_interprete: 0,
        modalidad_servicio: "Todas",
      });
      expect(result.todas_modalidades).toBe(175000);
      expect(result.valor_total).toBe(175000);
    });
  });

  describe("interpretacion", () => {
    it("horas enteras: 3h * 100.005 = 300.02 (ROUND_HALF_UP)", () => {
      const result = calculateService({
        valor_base: 100.005,
        servicio_interpretacion: true,
        horas_interprete: 3,
        minutos_interprete: 0,
        modalidad_servicio: "Virtual",
      });
      expect(result.valor_interprete).toBe(300.02);
      expect(result.valor_total).toBe(300.02);
      expect(result.horas_decimales).toBe(3);
    });

    it("horas + minutos: 2h 30m = 2.5h * 100000 = 250000", () => {
      const result = calculateService({
        valor_base: 100000,
        servicio_interpretacion: true,
        horas_interprete: 2,
        minutos_interprete: 30,
        modalidad_servicio: "Virtual",
      });
      expect(result.horas_decimales).toBe(2.5);
      expect(result.valor_interprete).toBe(250000);
      expect(result.valor_total).toBe(250000);
    });

    it("15 min = 0.25h * 80000 = 20000", () => {
      const result = calculateService({
        valor_base: 80000,
        servicio_interpretacion: true,
        horas_interprete: 0,
        minutos_interprete: 15,
        modalidad_servicio: "Virtual",
      });
      expect(result.horas_decimales).toBe(0.25);
      expect(result.valor_interprete).toBe(20000);
      expect(result.valor_total).toBe(20000);
    });

    it("45 min = 0.75h * 80000 = 60000", () => {
      const result = calculateService({
        valor_base: 80000,
        servicio_interpretacion: true,
        horas_interprete: 0,
        minutos_interprete: 45,
        modalidad_servicio: "Virtual",
      });
      expect(result.horas_decimales).toBe(0.75);
      expect(result.valor_interprete).toBe(60000);
      expect(result.valor_total).toBe(60000);
    });

    it("interpretacion con 0h y 0m devuelve ceros (no lanza, evita rompe-render en computeResumen)", () => {
      const result = calculateService({
        valor_base: 100000,
        servicio_interpretacion: true,
        horas_interprete: 0,
        minutos_interprete: 0,
        modalidad_servicio: "Virtual",
      });
      expect(result.valor_interprete).toBe(0);
      expect(result.valor_total).toBe(0);
      expect(result.valor_virtual).toBe(0);
      expect(result.valor_bogota).toBe(0);
      expect(result.valor_otro).toBe(0);
      expect(result.todas_modalidades).toBe(0);
      expect(result.horas_decimales).toBe(0);
    });
  });

  describe("precision decimal (ROUND_HALF_UP)", () => {
    it("100.005 * 1 = 100.01 (no 100.00)", () => {
      const result = calculateService({
        valor_base: 100.005,
        servicio_interpretacion: true,
        horas_interprete: 1,
        minutos_interprete: 0,
        modalidad_servicio: "Virtual",
      });
      expect(result.valor_interprete).toBe(100.01);
      expect(result.valor_total).toBe(100.01);
    });

    it("100.005 * 2 = 200.01 (comparable bit-a-bit)", () => {
      const result = calculateService({
        valor_base: 100.005,
        servicio_interpretacion: true,
        horas_interprete: 2,
        minutos_interprete: 0,
        modalidad_servicio: "Virtual",
      });
      expect(result.valor_interprete).toBe(200.01);
      expect(result.valor_total).toBe(200.01);
    });

    it("33333.333 * 3 = 99999.999 → 100000.00 (redondeo exacto)", () => {
      const result = calculateService({
        valor_base: 33333.333,
        servicio_interpretacion: true,
        horas_interprete: 3,
        minutos_interprete: 0,
        modalidad_servicio: "Virtual",
      });
      expect(result.valor_interprete).toBe(100000);
      expect(result.valor_total).toBe(100000);
    });
  });
});

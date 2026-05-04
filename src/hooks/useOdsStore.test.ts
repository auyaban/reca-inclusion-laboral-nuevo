import { beforeEach, describe, expect, it } from "vitest";
import { useOdsStore } from "./useOdsStore";

describe("useOdsStore import metadata", () => {
  beforeEach(() => {
    useOdsStore.getState().reset();
  });

  it("persiste formato_finalizado_id aplicado desde preview y reset lo limpia", () => {
    expect(useOdsStore.getState().formato_finalizado_id).toBe("");

    useOdsStore.getState().setFormatoFinalizadoId("11111111-1111-4111-8111-111111111111");

    expect(useOdsStore.getState().formato_finalizado_id).toBe("11111111-1111-4111-8111-111111111111");

    useOdsStore.getState().reset();

    expect(useOdsStore.getState().formato_finalizado_id).toBe("");
  });

  it("persiste telemetria_id aplicado desde preview y reset lo limpia", () => {
    expect(useOdsStore.getState().telemetria_id).toBe("");

    useOdsStore.getState().setTelemetriaId("55555555-5555-4555-8555-555555555555");

    expect(useOdsStore.getState().telemetria_id).toBe("55555555-5555-4555-8555-555555555555");

    useOdsStore.getState().reset();

    expect(useOdsStore.getState().telemetria_id).toBe("");
  });
});

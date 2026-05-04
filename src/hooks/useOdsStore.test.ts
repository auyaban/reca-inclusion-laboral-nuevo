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
});

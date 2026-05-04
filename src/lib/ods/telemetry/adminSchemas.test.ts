import { describe, expect, it } from "vitest";
import { parseOdsTelemetryAdminParams } from "@/lib/ods/telemetry/adminSchemas";

describe("parseOdsTelemetryAdminParams", () => {
  it("lee filtros multi-value con repeated keys y paginacion server-side", () => {
    const params = parseOdsTelemetryAdminParams(
      new URLSearchParams(
        "origin=manual&origin=acta_pdf&confidence=low&confidence=medium&mismatch=si&from=2026-05-01&to=2026-05-04&page=2&pageSize=75&sort=created_at&direction=asc"
      )
    );

    expect(params).toMatchObject({
      origins: ["manual", "acta_pdf"],
      confidences: ["low", "medium"],
      mismatch: "si",
      from: "2026-05-01",
      to: "2026-05-04",
      page: 2,
      pageSize: 75,
      sort: "created_at",
      direction: "asc",
    });
  });

  it("descarta valores invalidos y aplica defaults conservadores", () => {
    const params = parseOdsTelemetryAdminParams(
      new URLSearchParams(
        "origin=legacy&confidence=urgent&mismatch=talvez&page=-4&pageSize=999&sort=id&direction=sideways"
      )
    );

    expect(params).toMatchObject({
      origins: [],
      confidences: [],
      mismatch: "",
      from: "",
      to: "",
      page: 1,
      pageSize: 100,
      sort: "created_at",
      direction: "desc",
    });
  });
});

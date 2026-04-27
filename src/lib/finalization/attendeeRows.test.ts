import { describe, expect, it } from "vitest";
import { buildUnusedAttendeeRowHides } from "@/lib/finalization/attendeeRows";

describe("buildUnusedAttendeeRowHides", () => {
  it("does not hide rows when all base attendee rows are used", () => {
    expect(
      buildUnusedAttendeeRowHides({
        sheetName: "Acta",
        startRow: 70,
        baseRows: 4,
        usedRows: 4,
      })
    ).toEqual([]);
  });

  it("hides only unused base attendee rows", () => {
    expect(
      buildUnusedAttendeeRowHides({
        sheetName: "Acta",
        startRow: 70,
        baseRows: 4,
        usedRows: 2,
      })
    ).toEqual([
      {
        sheetName: "Acta",
        startRow: 72,
        count: 2,
      },
    ]);
  });

  it("does not hide base rows when attendee overflow is present", () => {
    expect(
      buildUnusedAttendeeRowHides({
        sheetName: "Acta",
        startRow: 70,
        baseRows: 4,
        usedRows: 6,
      })
    ).toEqual([]);
  });
});

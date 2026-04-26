import type { HiddenRows } from "@/lib/google/sheets";

export function buildUnusedAttendeeRowHides({
  sheetName,
  startRow,
  baseRows,
  usedRows,
}: {
  sheetName: string;
  startRow: number;
  baseRows: number;
  usedRows: number;
}): HiddenRows[] {
  const normalizedStartRow = Math.trunc(startRow || 0);
  const normalizedBaseRows = Math.max(0, Math.trunc(baseRows || 0));
  const normalizedUsedRows = Math.max(0, Math.trunc(usedRows || 0));
  const unusedRows = normalizedBaseRows - normalizedUsedRows;

  if (!sheetName || normalizedStartRow <= 0 || unusedRows <= 0) {
    return [];
  }

  return [
    {
      sheetName,
      startRow: normalizedStartRow + normalizedUsedRows,
      count: unusedRows,
    },
  ];
}

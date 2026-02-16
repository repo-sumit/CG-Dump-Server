import ExcelJS from "exceljs";

import { getDataset, updateDatasetRows } from "@cg-dump/core";

import { withAuth } from "@/server/auth";
import { handleDomainError } from "@/server/domain";
import { err, ok } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

type Params = { params: Promise<{ datasetId: string }> };

function normalizeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    const objectValue = value as { text?: string; result?: unknown; richText?: Array<{ text?: string }> };
    if (objectValue.text) return objectValue.text;
    if (objectValue.result !== undefined) return objectValue.result;
    if (objectValue.richText) return objectValue.richText.map((part) => part.text || "").join("");
  }
  return value;
}

export async function POST(request: Request, { params }: Params) {
  const limited = rateLimit(request, "datasets:import-xlsx", 25);
  if (limited) return limited;

  const auth = await withAuth(request, ["admin", "state_user"]);
  if (!auth.ok) return auth.response;

  try {
    const { datasetId } = await params;
    const dataset = await getDataset(auth.context, datasetId);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return err(400, "No file uploaded");
    }
    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      return err(400, "Only XLSX/XLS files are supported");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(new Uint8Array(await file.arrayBuffer()) as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return err(400, "Workbook is empty");
    }

    const templateSchema = dataset.template.schema as {
      columns?: Array<{ key: string; label: string }>;
    };
    const templateColumns = templateSchema.columns || [];

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, columnNumber) => {
      headers[columnNumber] = String(normalizeCell(cell.value)).trim();
    });

    const keyByHeader = new Map<string, string>();
    templateColumns.forEach((column) => {
      keyByHeader.set(column.label, column.key);
      keyByHeader.set(column.key, column.key);
    });

    const rows: Array<{ rowIndex: number; data: Record<string, unknown> }> = [];
    let rowIndex = 0;
    sheet.eachRow((row, excelRowIndex) => {
      if (excelRowIndex === 1) return;
      const data: Record<string, unknown> = {};
      let hasValue = false;
      row.eachCell((cell, columnNumber) => {
        const header = headers[columnNumber];
        if (!header) return;
        const key = keyByHeader.get(header) || header;
        const value = normalizeCell(cell.value);
        if (value !== "") hasValue = true;
        data[key] = value;
      });
      if (hasValue) {
        rows.push({
          rowIndex,
          data
        });
        rowIndex += 1;
      }
    });

    const updated = await updateDatasetRows(auth.context, dataset.id, {
      version: dataset.version,
      rows
    });

    return ok({
      message: "Import successful",
      rowsImported: updated.rows.length,
      datasetId: updated.id,
      version: updated.version
    });
  } catch (error) {
    return handleDomainError(error, "Failed to import dataset XLSX");
  }
}

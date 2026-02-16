import ExcelJS from "exceljs";

import { getDataset } from "@cg-dump/core";

import { withAuth } from "@/server/auth";
import { config } from "@/server/config";
import { handleDomainError } from "@/server/domain";
import { ok } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { createPresignedDownloadUrl, uploadObject } from "@/server/s3";

export const runtime = "nodejs";

type Params = { params: Promise<{ datasetId: string }> };

export async function GET(request: Request, { params }: Params) {
  const limited = rateLimit(request, "datasets:export-xlsx", 40);
  if (limited) return limited;

  const auth = await withAuth(request, ["admin", "state_user"]);
  if (!auth.ok) return auth.response;

  try {
    const { datasetId } = await params;
    const dataset = await getDataset(auth.context, datasetId);

    const templateSchema = dataset.template.schema as {
      columns?: Array<{ key: string; label: string }>;
    };
    const columns = templateSchema.columns || [];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dataset");
    worksheet.columns = columns.map((column) => ({
      header: column.label,
      key: column.key,
      width: 24
    }));

    dataset.rows
      .sort((left, right) => left.rowIndex - right.rowIndex)
      .forEach((row) => {
        const value: Record<string, unknown> = {};
        columns.forEach((column) => {
          value[column.key] = (row.data as Record<string, unknown>)[column.key] ?? "";
        });
        worksheet.addRow(value);
      });

    const buffer = new Uint8Array((await workbook.xlsx.writeBuffer()) as ArrayBuffer);
    const filename = `${dataset.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${dataset.id}.xlsx`;
    const key = `${config.S3_EXPORT_PREFIX}/${dataset.id}/${Date.now()}-${filename}`;
    await uploadObject(key, buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const download = await createPresignedDownloadUrl(key);

    return ok({
      datasetId: dataset.id,
      key,
      downloadUrl: download.url,
      expiresInSeconds: 600
    });
  } catch (error) {
    return handleDomainError(error, "Failed to export dataset XLSX");
  }
}

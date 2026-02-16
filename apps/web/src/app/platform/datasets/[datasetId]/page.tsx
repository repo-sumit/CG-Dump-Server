"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/platform/api";

type TemplateColumn = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "date";
  required?: boolean;
  maxLength?: number;
};

type DatasetPayload = {
  id: string;
  name: string;
  version: number;
  rows: Array<{ rowIndex: number; data: Record<string, unknown> }>;
  product: {
    code: string;
    name: string;
  };
  template: {
    code: string;
    name: string;
    schema: {
      columns: TemplateColumn[];
    };
  };
};

type CellError = {
  rowIndex: number;
  field: string;
  message: string;
};

function validateCell(value: string, column: TemplateColumn): string | null {
  if (column.required && !value.trim()) {
    return `${column.label} is required`;
  }
  if (!value.trim()) {
    return null;
  }
  if (column.maxLength && value.length > column.maxLength) {
    return `${column.label} must be <= ${column.maxLength} chars`;
  }
  if (column.type === "number" && Number.isNaN(Number(value))) {
    return `${column.label} must be numeric`;
  }
  if (column.type === "boolean" && !["true", "false", "yes", "no", "1", "0"].includes(value.toLowerCase())) {
    return `${column.label} must be boolean`;
  }
  return null;
}

export default function DatasetEditorPage() {
  const params = useParams<{ datasetId: string }>();
  const datasetId = String(params.datasetId || "");

  const [dataset, setDataset] = useState<DatasetPayload | null>(null);
  const [rows, setRows] = useState<Array<{ rowIndex: number; data: Record<string, string> }>>([]);
  const [version, setVersion] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<CellError[]>([]);

  const columns = useMemo(() => dataset?.template.schema.columns || [], [dataset]);

  const loadDataset = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = (await apiFetch(`/api/datasets/${datasetId}`)) as DatasetPayload;
      setDataset(payload);
      setVersion(payload.version);
      setRows(
        payload.rows.map((row) => ({
          rowIndex: row.rowIndex,
          data: Object.fromEntries(
            (payload.template.schema.columns || []).map((column) => [
              column.key,
              String(row.data[column.key] === undefined || row.data[column.key] === null ? "" : row.data[column.key])
            ])
          )
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dataset");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataset().catch(() => {});
  }, [datasetId]);

  const setCellValue = (rowIndex: number, key: string, value: string) => {
    setRows((current) =>
      current.map((row) =>
        row.rowIndex === rowIndex
          ? {
              ...row,
              data: {
                ...row.data,
                [key]: value
              }
            }
          : row
      )
    );
  };

  const addRow = () => {
    const nextIndex = rows.length > 0 ? Math.max(...rows.map((row) => row.rowIndex)) + 1 : 0;
    const data = Object.fromEntries(columns.map((column) => [column.key, ""])) as Record<string, string>;
    setRows((current) => [...current, { rowIndex: nextIndex, data }]);
  };

  const validateRows = () => {
    const errors: CellError[] = [];
    rows.forEach((row) => {
      columns.forEach((column) => {
        const value = row.data[column.key] || "";
        const message = validateCell(value, column);
        if (message) {
          errors.push({
            rowIndex: row.rowIndex,
            field: column.key,
            message
          });
        }
      });
    });
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const saveRows = async () => {
    if (!validateRows()) {
      setError("Please fix validation errors before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = (await apiFetch(`/api/datasets/${datasetId}/rows`, {
        method: "PUT",
        body: JSON.stringify({
          version,
          rows: rows.map((row) => ({
            rowIndex: row.rowIndex,
            data: row.data
          }))
        })
      })) as { version: number };
      setVersion(payload.version);
      await loadDataset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rows");
    } finally {
      setSaving(false);
    }
  };

  const importXlsx = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      await apiFetch(`/api/datasets/${datasetId}/import/xlsx`, {
        method: "POST",
        body: formData
      });
      await loadDataset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import XLSX");
    }
  };

  const exportXlsx = async () => {
    try {
      const payload = (await apiFetch(`/api/datasets/${datasetId}/export/xlsx`)) as { downloadUrl: string };
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export XLSX");
    }
  };

  if (loading) {
    return <main style={{ padding: "2rem" }}>Loading dataset...</main>;
  }

  if (!dataset) {
    return <main style={{ padding: "2rem" }}>Dataset not found.</main>;
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 1400, margin: "0 auto" }}>
      <Link href={`/platform/products/${dataset.product.code}`}>Back to {dataset.product.code}</Link>
      <h1>{dataset.name}</h1>
      <p>
        Template: {dataset.template.name} ({dataset.template.code}) | version {version}
      </p>

      {error && <p style={{ color: "#b60000" }}>{error}</p>}
      {validationErrors.length > 0 && (
        <div style={{ color: "#b60000", marginBottom: 12 }}>
          {validationErrors.slice(0, 10).map((entry) => (
            <div key={`${entry.rowIndex}-${entry.field}`}>{`Row ${entry.rowIndex + 1} - ${entry.message}`}</div>
          ))}
          {validationErrors.length > 10 && <div>...and {validationErrors.length - 10} more errors.</div>}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={addRow}>Add Row</button>
        <button onClick={saveRows} disabled={saving}>
          {saving ? "Saving..." : "Save Rows"}
        </button>
        <label style={{ border: "1px solid #ccc", padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>
          Import XLSX
          <input
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                importXlsx(file).catch(() => {});
                event.target.value = "";
              }
            }}
          />
        </label>
        <button onClick={exportXlsx}>Export XLSX</button>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ddd", padding: 8, textAlign: "left" }}>#</th>
              {columns.map((column) => (
                <th key={column.key} style={{ borderBottom: "1px solid #ddd", padding: 8, textAlign: "left" }}>
                  {column.label}
                  {column.required ? " *" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowIndex}>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{row.rowIndex + 1}</td>
                {columns.map((column) => {
                  const value = row.data[column.key] || "";
                  const message = validateCell(value, column);
                  return (
                    <td key={column.key} style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                      <input
                        value={value}
                        onChange={(event) => setCellValue(row.rowIndex, column.key, event.target.value)}
                        style={{
                          width: "100%",
                          border: message ? "1px solid #b60000" : "1px solid #bbb",
                          borderRadius: 4,
                          padding: 6
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

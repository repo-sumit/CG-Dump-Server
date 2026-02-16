"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/platform/api";

type EnabledProduct = {
  product: {
    code: string;
    name: string;
  };
};

type Template = {
  id: string;
  code: string;
  name: string;
};

type Dataset = {
  id: string;
  name: string;
  version: number;
  updatedAt: string;
  template: {
    code: string;
    name: string;
  };
};

export default function ProductDatasetsPage() {
  const params = useParams<{ productCode: string }>();
  const productCode = useMemo(() => String(params.productCode || "").toUpperCase(), [params.productCode]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetName, setDatasetName] = useState("");
  const [templateCode, setTemplateCode] = useState("");

  const loadPageData = async () => {
    setLoading(true);
    setError("");
    try {
      const enabledProducts = (await apiFetch("/api/state/products")) as EnabledProduct[];
      const enabledCodes = new Set(enabledProducts.map((item) => item.product.code.toUpperCase()));
      if (!enabledCodes.has(productCode)) {
        setIsEnabled(false);
        setTemplates([]);
        setDatasets([]);
        return;
      }

      setIsEnabled(true);
      const templateResponse = (await apiFetch(`/api/templates?productCode=${productCode}`)) as Template[];
      const datasetResponse = (await apiFetch(`/api/datasets?productCode=${productCode}`)) as Dataset[];
      setTemplates(templateResponse);
      setDatasets(datasetResponse);
      if (templateResponse.length > 0) {
        setTemplateCode((current) => current || templateResponse[0].code);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load product data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData().catch(() => {});
  }, [productCode]);

  const createDataset = async () => {
    if (!datasetName.trim()) {
      setError("Dataset name is required");
      return;
    }
    if (!templateCode) {
      setError("Template selection is required");
      return;
    }
    try {
      setError("");
      await apiFetch("/api/datasets", {
        method: "POST",
        body: JSON.stringify({
          name: datasetName.trim(),
          productCode,
          templateCode
        })
      });
      setDatasetName("");
      await loadPageData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create dataset");
    }
  };

  return (
    <main style={{ padding: "2rem", maxWidth: 1024, margin: "0 auto" }}>
      <Link href="/platform">Back to products</Link>
      <h1>Product: {productCode}</h1>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "#b60000" }}>{error}</p>}

      {!loading && !isEnabled && (
        <p style={{ color: "#b60000" }}>
          This product is not enabled for your state. Ask an admin to enable it from state-product settings.
        </p>
      )}

      {!loading && isEnabled && (
        <>
          <section style={{ marginBottom: 24, border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <h2>Create Dataset</h2>
            <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
              <input
                value={datasetName}
                onChange={(event) => setDatasetName(event.target.value)}
                placeholder="Dataset name"
              />
              <select value={templateCode} onChange={(event) => setTemplateCode(event.target.value)}>
                {templates.map((template) => (
                  <option key={template.id} value={template.code}>
                    {template.name} ({template.code})
                  </option>
                ))}
              </select>
              <button onClick={createDataset}>Create Dataset</button>
            </div>
          </section>

          <section>
            <h2>Datasets</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {datasets.map((dataset) => (
                <Link
                  key={dataset.id}
                  href={`/platform/datasets/${dataset.id}`}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 10,
                    textDecoration: "none",
                    color: "#111"
                  }}
                >
                  <strong>{dataset.name}</strong> | {dataset.template.name} ({dataset.template.code}) | version{" "}
                  {dataset.version}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

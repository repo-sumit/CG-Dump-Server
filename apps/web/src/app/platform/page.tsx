"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch, getAuthToken, setAuthToken } from "@/platform/api";

type ProductRow = {
  product: {
    code: string;
    name: string;
    description?: string | null;
  };
};

export default function PlatformHomePage() {
  const [token, setToken] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await apiFetch("/api/state/products");
      setProducts(payload as ProductRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const existing = getAuthToken();
    setToken(existing);
  }, []);

  return (
    <main style={{ padding: "2rem", maxWidth: 920, margin: "0 auto" }}>
      <h1>CG Dump Server Platform</h1>
      <p>Enter your Cognito bearer token and load products enabled for your state.</p>

      <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        <label htmlFor="token">Bearer Token</label>
        <textarea
          id="token"
          rows={4}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="eyJraWQiOi..."
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              setAuthToken(token);
              loadProducts().catch(() => {});
            }}
          >
            Save Token + Load Products
          </button>
          <button
            onClick={() => {
              setToken("");
              setProducts([]);
              setError("");
              setAuthToken("");
            }}
          >
            Clear Token
          </button>
        </div>
      </div>

      {loading && <p>Loading products...</p>}
      {error && <p style={{ color: "#b60000" }}>{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p>No enabled products found for your state. Ask admin to enable at least one product.</p>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {products.map((row) => (
          <Link
            key={row.product.code}
            href={`/platform/products/${row.product.code}`}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              textDecoration: "none",
              color: "#111"
            }}
          >
            <strong>{row.product.name}</strong>
            <div>{row.product.code}</div>
            <small>{row.product.description || "No description"}</small>
          </Link>
        ))}
      </div>
    </main>
  );
}

"use client";

export function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("cg_dump_token") || "";
}

export function setAuthToken(value: string) {
  if (typeof window === "undefined") return;
  if (value.trim()) {
    window.localStorage.setItem("cg_dump_token", value.trim());
  } else {
    window.localStorage.removeItem("cg_dump_token");
  }
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "error" in payload ? String(payload.error) : "Request failed";
    throw new Error(message);
  }
  return payload;
}

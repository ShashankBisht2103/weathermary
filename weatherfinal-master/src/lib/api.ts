export const API_BASE = "http://127.0.0.1:5000";

export async function apiGet<T = any>(path: string) {
  const res = await fetch(`${API_BASE}${path}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T = any>(path: string, body: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

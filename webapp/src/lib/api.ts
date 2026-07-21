const TOKEN_KEY = "mpp_user_jwt";
const ROLE_KEY = "mpp_user_role";

export function apiBase() {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE as string;
  if (typeof window === "undefined") return "";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "http://localhost:8099";
  return window.location.origin;
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string, role?: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    if (role) localStorage.setItem(ROLE_KEY, role);
  },
  role: () => localStorage.getItem(ROLE_KEY),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api<T = unknown>(
  path: string,
  opts: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  const t = tokenStore.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  let body: BodyInit | undefined;
  if (opts.body !== undefined && opts.body !== null) {
    headers["Content-Type"] = "application/json";
    body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  }
  const { body: _ignored, ...rest } = opts;
  let res: Response;
  try {
    res = await fetch(apiBase() + path, {
      ...rest,
      method: opts.method || "GET",
      cache: "no-store",
      headers,
      body,
    });
  } catch {
    throw new ApiError("Impossible de joindre l'API.", 0, null);
  }
  if (res.status === 204) return null as T;
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!res.ok) {
    const d = data as { message?: string; error?: string } | null;
    throw new ApiError(d?.message || d?.error || `Erreur ${res.status}`, res.status, data);
  }
  return data as T;
}

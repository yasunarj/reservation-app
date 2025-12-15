import { getAuthToken } from "./auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

export type ApiErrorBody = {
  error?: string;
  details?: unknown;
};

export class ApiError extends Error {
  status: number;
  body?: ApiErrorBody;

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export const apiFetch = async <T>(
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let body: ApiErrorBody | undefined = undefined;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {}
    const msg = body?.error ?? `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
};

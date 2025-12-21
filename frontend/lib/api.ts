import { RequestInit } from "next/dist/server/web/spec-extension/request";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

export type ApiErrorBody = {
  error?: string;
  details?: unknown;
};

type ApiFetchInit = RequestInit & {
  _retried?: boolean;
}

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

const shouldSkipRefresh = (path: string) => {
  // 認証型はリフレッシュ対象外(無限ループ・意味がない等を防ぐ)
  return (
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/refresh") ||
    path.startsWith("/auth/logout")
  );
};

const refreshAuth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const apiFetch = async <T>(
  path: string,
  init: ApiFetchInit = {}
): Promise<T> => {
  const headers = new Headers(init.headers);

  // bodyがある時だけJSON扱いにする（FormDataの邪魔をしない）
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  if (init.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const alreadyRetried = (init)._retried === true;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include", // ★ Cookie送信の要
  });

  if (res.status === 401 && !alreadyRetried && !shouldSkipRefresh(path)) {
    const ok = await refreshAuth();
    if (ok) {
      const retryInit = { ...init, headers };
      retryInit._retried = true;

      const retryRes = await fetch(`${API_BASE_URL}${path}`, {
        ...retryInit,
        credentials: "include",
      });

      if (retryRes.ok) {
        if (retryRes.status === 204) return undefined as T;
        return (await retryRes.json()) as T;
      }

      let body: ApiErrorBody | undefined = undefined;
      try {
        body = (await retryRes.json()) as ApiErrorBody;
      } catch {}
      const msg = body?.error ?? `Request failed (${retryRes.status})`;
      throw new ApiError(msg, retryRes.status, body);
    }
    // refresh失敗 → そのまま元の401を通常エラーとして扱う(下へ落ちる)e
  }

  if (!res.ok) {
    let body: ApiErrorBody | undefined = undefined;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {}
    const msg = body?.error ?? `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
};


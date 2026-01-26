"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "./api";

type OnUnauthorized = (() => void) | undefined;

export const useApi = (onUnauthorized?: OnUnauthorized) => {
  const router = useRouter();

  const handleApiError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        if (onUnauthorized) onUnauthorized();
      } else {
        alert("ログインが必要です");
        router.push("/login");
        return true;
      }
      return false;
    },
    [router, onUnauthorized],
  );

  const toMessage = useCallback((e: unknown) => {
    return e instanceof ApiError ? e.message : "通信エラーが発生しました。";
  }, []);

  return {
    handleApiError,
    toMessage,
  };
};

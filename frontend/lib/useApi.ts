"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "./api";

type Options = {
  onUnauthorized: () => void;
};

export const useApi = (options?: Options) => {
  const router = useRouter();

  const handleApiError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        if (options?.onUnauthorized) {
          options.onUnauthorized();
        } else {
          alert("ログインが必要です");
          router.push("/login");
        }
        return true;
      }
      return false;
    },
    [options, router]
  );

  const toMessage = (e: unknown) =>
    e instanceof ApiError ? e.message : "通信エラーが発生しました。";
  return {
    handleApiError,
    toMessage,
  };
};

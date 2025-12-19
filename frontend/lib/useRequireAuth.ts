import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "./api";

export const useRequireAuth = () => {
  const router = useRouter();
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    const run = async () => {
      try {
        await apiFetch("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
        } else {
          console.error(e);
        }
      } finally {
        setChecking(false);
      }
    };
    run();
  }, [router]);

  return {
    checking,
  };
};

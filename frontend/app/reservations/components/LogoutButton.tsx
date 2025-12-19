"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    if (!confirm("ログアウトしますか？")) return;
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
      });
      router.push("/login");
    } catch (e) {
      console.error(e);
      alert("ログアウトに失敗しました");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-600 hover:text-red-600"
    >
      ログアウト
    </button>
  );
};

export default LogoutButton;

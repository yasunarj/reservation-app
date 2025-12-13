"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

const LoginPage = () => {
  const router = useRouter();

  const [email, setEmail] = useState<string>("test@example.com");
  const [password, setPassword] = useState<string>("password123");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Login failed", data);
        setErrorMessage(data?.error ?? "ログインに失敗しました");
        return;
      }

      const { user, token } = data;

      localStorage.setItem("authToken", token);
      localStorage.setItem("authUser", JSON.stringify(user));

      router.push("/reservations");
    } catch (e) {
      console.error(e);
      setErrorMessage("通信エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-300 text-black">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-lg p-6">
        <h1 className="text-xl font-bold mb-4 text-center">ログイン</h1>

        {errorMessage && (
          <div className="mb-4 text-sm text-red-600 border-red-200 bg-red-50 p-2 rounded">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              パスワード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 text-sm text-white bg-blue-600 rounded disabled:opacity-60 cursor-pointer hover:bg-blue-700"
          >
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default LoginPage;

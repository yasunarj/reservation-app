"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";

const SignUpPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await apiFetch<{ ok: boolean; needsLogin: boolean }>(
        "/auth/signup",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );

      if (res.needsLogin) {
        router.push("/login");
        return;
      }

      if (res.ok) {
        router.push("/reservations");
        return;
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(
        e instanceof ApiError ? e.message : "通信エラーが発生しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-300 text-black">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-lg p-6">
        {errorMessage && (
          <div className="mb-4 text-sm text-red-600 border-red-200 bg-red-50 p-2 rounded">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email">メールアドレス</label>
            <input
              disabled={isSubmitting}
              required
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              autoComplete="email" //autoCompletedはブラウザにこれはemailだよ記憶してもらい過去に入力した値の候補を出してくれるようになる。
            />
          </div>

          <div>
            <label htmlFor="password">パスワード</label>
            <input
              disabled={isSubmitting}
              required
              minLength={6}
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className=" w-full py-2 text-sm text-white bg-blue-600 rounded disabled:opacity-60 cursor-pointer hover:bg-blue-700"
          >
            {isSubmitting ? "サインアップ中..." : "サインアップ"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default SignUpPage;

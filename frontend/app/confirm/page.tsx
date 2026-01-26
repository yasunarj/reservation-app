"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";

const ConfirmPage = () => {
  const router = useRouter();
  const sp = useSearchParams();
  const presetEmail = sp.get("email") ?? "";

  const [email, setEmail] = useState<string>(presetEmail);
  const [code, setCode] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    setEmail(presetEmail);
  }, [presetEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((s) => s - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ ok: boolean; needsLogin: boolean }>(
        "/auth/confirm",
        {
          method: "POST",
          body: JSON.stringify({ email, code }),
        },
      );

      if (res.ok) {
        router.push(`/login?email=${encodeURIComponent(email)}`);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(
        e instanceof ApiError ? e.message : "通信エラーが発生しました",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setErrorMessage(null);
    setIsResending(true);
    try {
      await apiFetch<{ ok: boolean }>("/auth/resend", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setCooldown(30);
      alert("確認コードを再送しました。メールをご確認ください。");
    } catch (e) {
      console.error(e);
      if (e instanceof ApiError && e.status === 429) {
        setCooldown(30);
        setErrorMessage(
          "短時間に再送しすぎです。30秒待ってから再送してください。",
        );
      } else {
        setErrorMessage(
          e instanceof ApiError ? e.message : "再送に失敗しました",
        );
      }
    } finally {
      setIsResending(false);
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
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="code">確認コード</label>
            <input
              disabled={isSubmitting}
              required
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              inputMode="numeric"
              placeholder="メールに届いたコード"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 text-sm text-white bg-blue-600 rounded disabled:opacity-60 cursor-pointer hover:bg-blue-700"
          >
            {isSubmitting ? "確認中" : "確認する"}
          </button>
        </form>
        <button
          type="button"
          onClick={handleResend}
          disabled={isSubmitting || isResending}
          className="w-full py-2 mt-4 text-sm bg-gray-200 rounded disabled:opacity-60 hover:bg-gray-300"
        >
          {cooldown > 0
            ? `再送は ${cooldown}秒後`
            : isResending
              ? "再送中"
              : "確認コードを再送"}
        </button>
      </div>
    </main>
  );
};

export default ConfirmPage;

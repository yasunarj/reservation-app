"use client";

import { useState, FormEvent, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useRouter } from "next/navigation";

type ReservationStatus = "pending" | "confirmed" | "cancelled";

const NewReservationPage = () => {
  const router = useRouter();
  const onUnauthorized = useCallback(() => {
    router.push("/login");
  }, [router]);
  const { handleApiError, toMessage } = useApi(onUnauthorized);
  const [name, setName] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [status, setStatus] = useState<ReservationStatus>("pending");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("名前は必須です");
      return;
    }

    if (!date) {
      setErrorMessage("日付は必須です");
      return;
    }

    setIsSubmitting(true);

    try {
      const isoDate = new Date(date).toISOString();

      await apiFetch(`/reservations`, {
        method: "POST",
        body: JSON.stringify({
          name,
          date: isoDate,
          note: note.trim() ? note.trim() : undefined,
          status,
        }),
      });

      router.push("/reservations");
    } catch (e) {
      if (handleApiError(e)) return;
      console.error(e);
      setErrorMessage(toMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 text-black">
      <div className="max-w-xl mx-auto p-4 bg-blue-100">
        <h1 className="text-2xl font-bold mb-6">新規予約の作成</h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-white p-6 rounded-lg shadow-2xl"
        >
          {errorMessage && (
            <div className="text-sm text-red-600 border border-red-200 bg-red-50 p-2 rounded">
              {errorMessage}
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              名前<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              id="name"
              type="text"
              className="w-full border rounded px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前入れ太郎"
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-1">
              日付・時間<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="datetime-local"
              className="w-full border rounded px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="note" className="block text-sm font-medium mb-1">
              メモ
            </label>
            <textarea
              name="note"
              id="note"
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              placeholder="オンライン打ち合わせ など"
            ></textarea>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">
              ステータス
            </label>
            <select
              name="status"
              id="status"
              className="w-full border rounded px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as ReservationStatus)}
            >
              <option value="pending">保留</option>
              <option value="confirmed">確定</option>
              <option value="cancelled">キャンセル</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/reservations")}
              className="px-4 py-2 text-sm border rounded"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded disabled:opacity-60"
            >
              {isSubmitting ? "送信中..." : "予約を作成"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default NewReservationPage;

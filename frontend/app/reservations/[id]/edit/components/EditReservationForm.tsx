"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/lib/useApi";

type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string; //ISO文字列
  note: string | null;
  status: ReservationStatus;
};

type Props = {
  reservation: Reservation;
};

const EditReservationForm = ({ reservation }: Props) => {
  const router = useRouter();
  const { handleApiError, toMessage } = useApi();

  const toLocalDateTimeInputValue = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");

    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const initialDateTimeLocal = toLocalDateTimeInputValue(reservation.date);

  const [name, setName] = useState<string>(reservation.name);
  const [date, setDate] = useState<string>(initialDateTimeLocal);
  const [note, setNote] = useState<string>(reservation.note ?? "");
  const [status, setStatus] = useState<ReservationStatus>(reservation.status);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("名前は必須です。");
      return;
    }

    if (!date) {
      setErrorMessage("日付は必須です");
      return;
    }

    setIsSubmitting(true);

    try {
      const isoDate = new Date(date).toISOString();

      await apiFetch(`/reservations/${reservation.id}`, {
        method: "PATCH",
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
          value={name}
          className="w-full border rounded px-3 py-2 text-sm"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium mb-1">
          日付・時間<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="date"
          type="datetime-local"
          value={date}
          className="w-full border rounded px-3 py-2 text-sm"
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="note" className="block text-sm font-medium mb-1">
          メモ
        </label>
        <textarea
          id="note"
          rows={3}
          value={note}
          className="w-full border rounded px-3 py-2 text-sm"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium mb-1">
          ステータス
        </label>
        <select
          name="status"
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ReservationStatus)}
          className="w-full border rounded px-3 py-2 text-sm"
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
          {isSubmitting ? "更新中..." : "保存する"}
        </button>
      </div>
    </form>
  );
};

export default EditReservationForm;

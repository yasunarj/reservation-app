"use client";

import { useState, useTransition } from "react";

type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string;
  note?: string;
  status: ReservationStatus;
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "保留",
  confirmed: "確定",
  cancelled: "キャンセル",
};

const STATUS_CLASS: Record<ReservationStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  confirmed: "bg-green-100 text-green-800 border border-green-200",
  cancelled: "bg-red-100 text-red-800 border border-red-200",
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

type Props = {
  initialReservation: Reservation[];
};

const ReservationsList = ({ initialReservation }: Props) => {
  const [reservations, setReservations] = useState(initialReservation);
  const [isPending, startTransition] = useTransition();

  const handleDelete = async (id: number) => {
    const ok = confirm("この予約を削除してもよろしいですか？");
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/reservations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Failed to delete reservation", data);
        alert(data?.error ?? "削除に失敗しました");
        return;
      }

      startTransition(() => {
        setReservations((prev: Reservation[]) =>
          prev.filter((r) => r.id !== id)
        );
      });
    } catch (e) {
      console.error(e);
      alert("通信中にエラーが発生しました。");
    }
  };

  if (reservations.length === 0) {
    return <p>予約はまだありません</p>;
  }

  return (
    <ul className={`space-y-4 ${isPending ? "opacity-70" : ""}`}>
      {reservations.map((r: Reservation) => (
        <li key={r.id} className="border rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">{r.name}</span>
            <span className="text-sm text-gray-500">
              {new Date(r.date).toLocaleString("ja-JP")}
            </span>
          </div>
          {r.note && (
            <p className="text-sm text-gray-700 mb-1">メモ: {r.note}</p>
          )}
          <div>
            <p
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                STATUS_CLASS[r.status]
              }`}
            >
              ステータス: {STATUS_LABEL[r.status]}
            </p>

            <button
              type="button"
              onClick={() => handleDelete(r.id)}
              className="text-xs text-red-600 hover:underline"
            >
              削除
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ReservationsList;

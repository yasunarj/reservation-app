"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReservationsList from "./components/ReservationsList";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/lib/useApi";

type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string;
  note: string | null;
  status: ReservationStatus;
};

type ReservationResponse = {
  items: Reservation[];
  totalCount: number;
  page: number;
  perPage: number;
  totalPages: number;
};

const ReservationsPage = () => {
  const { handleApiError } = useApi();
  const [data, setData] = useState<ReservationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await apiFetch<ReservationResponse>("/reservations");
        setData(data);
      } catch (e) {
        if (handleApiError(e)) return;
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [handleApiError]);

  if (loading) {
    return <p className="p-6">読み込み中...</p>;
  }

  if (!data) {
    return <p className="p-6">データが取得できませんでした</p>;
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 text-black">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">予約一覧</h1>
          <Link href="/reservations/new">+ 新規予約を作成</Link>
        </div>

        {/* ここでは data は必ず存在 */}
        <ReservationsList initialData={data} />
      </div>
    </main>
  );
};

export default ReservationsPage;

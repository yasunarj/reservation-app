"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import EditReservationForm from "./components/EditReservationForm";

type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string;
  note: string | null;
  status: ReservationStatus;
};

const EditReservationPage = () => {
  const { handleApiError, toMessage } = useApi();
  const params = useParams<{ id: string }>();
  const idParams = params?.id;
  const [data, setData] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        if (!idParams) {
          setErrorMessage("idが取得できませんでした");
          return;
        }

        const postId = Number(idParams);
        if (Number.isNaN(postId)) {
          setErrorMessage("idが不正です");
          return;
        }

        const data = await apiFetch<Reservation>(`/reservations/${postId}`);

        setData(data);
      } catch (e) {
        if (handleApiError(e)) return;
        console.error(e);
        setErrorMessage(toMessage(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [handleApiError, toMessage, idParams]);

  if (loading) {
    return <p>読み込み中...</p>;
  }

  if (errorMessage) {
    return <p className="text-sm text-red-600">{errorMessage}</p>;
  }

  if (!data) {
    return <p>データが取得できませんでした</p>;
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 text-black">
      <div className="max-w-xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">予約の編集</h1>
        <EditReservationForm reservation={data} />
      </div>
    </main>
  );
};

export default EditReservationPage;

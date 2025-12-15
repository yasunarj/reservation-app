"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";
import EditReservationForm from "./components/EditReservationForm";

type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string;
  note: string | null;
  status: ReservationStatus;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

const EditReservationPage = () => {
  const router = useRouter();
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
          setLoading(false);
          return;
        }

        const postId = Number(idParams);
        if (Number.isNaN(postId)) {
          setErrorMessage("idが不正です");
          setLoading(false);
          return;
        }

        const token = getAuthToken();
        if (!token) {
          router.push("/login");
          setLoading(false);
          return;
        }

        const headers = new Headers();
        headers.set("Authorization", `Bearer ${token}`);

        const res = await fetch(`${API_BASE_URL}/reservations/${postId}`, {
          headers,
        });

        if (res.status === 401) {
          router.push("/login");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setErrorMessage("データの取得に失敗しました");
          setLoading(false);
          return;
        }

        setData(await res.json());
      } catch (e) {
        console.error("通信エラーが発生しました", e);
        setErrorMessage("通信エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [idParams, router]);

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


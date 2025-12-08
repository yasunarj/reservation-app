import Link from "next/link";
import ReservationsList from "./components/ReservationsList";

type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string; // ISO文字列
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

const fetchReservations = async () => {
  const res = await fetch(`${API_BASE_URL}/reservations`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("予約一覧の取得に失敗しました");
  }

  const data: ReservationResponse = await res.json();

  return data;
};

const ReservationsPage = async () => {
  const data = await fetchReservations();

  return (
    <main className="min-h-screen bg-gray-50 py-10 text-black">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">予約一覧</h1>
          <Link href="/reservations/new">+ 新規予約を作成</Link>
        </div>

        <ReservationsList initialData={data} />
      </div>
    </main>
  );
};

export default ReservationsPage;

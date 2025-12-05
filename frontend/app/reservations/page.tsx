import Link from "next/link";

type ReservationStatus = "pending" | "confirmed" | "cancelled";

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

type Reservation = {
  id: number;
  name: string;
  date: string;
  note?: string;
  status: ReservationStatus;
};

// const statusLabel = (status: ReservationStatus): string => {
//   switch (status) {
//     case "pending":
//       return "保留";
//     case "confirmed":
//       return "確定";
//     case "cancelled":
//       return "キャンセル";
//     default:
//       return status;
//   }
// };

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

const fetchReservations = async (): Promise<Reservation[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/reservations`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error("Failed to fetch reservations");
    }

    const json = await res.json();
    return json as Reservation[];
  } catch (e) {
    console.error("Error fetching reservations:", e);
    return [];
  }
};
const ReservationsPage = async () => {
  const reservations = await fetchReservations();

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">予約一覧</h1>
          <Link
            href="/reservations/new"
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-blue-600 rounded hover:bg-blue-700"
          >
            + 新規予約を作成
          </Link>
        </div>
        {reservations.length === 0 ? (
          <p>予約はまだありません</p>
        ) : (
          <ul className="space-y-4">
            {reservations.map((r) => (
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
                <p className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[r.status]}`}>
                  ステータス: {STATUS_LABEL[r.status]}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default ReservationsPage;

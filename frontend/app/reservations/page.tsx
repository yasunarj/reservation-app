type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string;
  note?: string;
  status: ReservationStatus;
};

const statusLabel = (status: ReservationStatus): string => {
  switch (status) {
    case "pending":
      return "保留";
    case "confirmed":
      return "確定";
    case "cancelled":
      return "キャンセル";
    default:
      return status;
  }
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

const fetchReservations = async (): Promise<Reservation[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/reservations`);
    if (!res.ok) {
      throw new Error("Failed to fetch reservations");
    }

    const json = await res.json();
    return json.data as Reservation[];
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">予約一覧</h1>
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
                  <p className="text-sm text-gray-700 mb-1">メモ:{r.note}</p>
                )}
                <p className="text-xs text-gray-500">
                  ステータス:{statusLabel(r.status)}
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

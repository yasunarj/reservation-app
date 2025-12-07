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

const fetchReservation = async (id: string): Promise<Reservation> => {
  const res = await fetch(`${API_BASE_URL}/reservations/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("予約の取得に失敗しました");
  }

  return res.json();
};

const EditReservationPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const reservation = await fetchReservation(id);
  return (
    <main className="min-h-screen bg-gray-50 py-10 text-black">
      <div className="max-w-xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">予約の編集</h1>
        <EditReservationForm reservation={reservation} />
      </div>
    </main>
  );
};

export default EditReservationPage;

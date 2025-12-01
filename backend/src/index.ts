import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string; // ISO文字列で日付
  note?: string;
  status: ReservationStatus;
};

const mockReservations: Reservation[] = [
  {
    id: 1,
    name: "山田太郎",
    date: "2025-01-10T14:00:00+09:00",
    note: "初回カウンセリング",
    status: "confirmed",
  },
  {
    id: 2,
    name: "後藤花子",
    date: "2025-01-12T10:30:00+09:00",
    note: "オンライン打ち合わせ",
    status: "pending",
  },
  {
    id: 3,
    name: "鈴木一郎",
    date: "2025-01-15T16:00:00+09:00",
    status: "cancelled",
  },
];

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/health", (c) => {
  return c.json({ status: "ok", message: "Hono API is running" });
});

app.get("/reservations", (c) => {
  return c.json({
    data: mockReservations,
  });
});

serve(
  {
    fetch: app.fetch,
    port: 8787,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "./prisma.js";
import { cors } from "hono/cors";

const app = new Hono();

// Zod スキーマ(リクエストボディ用)
const createReservationSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  date: z.iso
    .datetime({ error: () => "日付形式が正しくありません" })
    .or(z.string().min(1, { message: "日付は必須です" })),
  note: z.string().optional(),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(), //値がなくても自動的に"pending"が入る
});

type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string; // ISO文字列で日付
  note?: string;
  status: ReservationStatus;
};

app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/health", (c) => {
  return c.json({ status: "ok", message: "Hono API is running" });
});

app.get("/reservations", async (c) => {
  try {
    const reservations = await prisma.reservation.findMany({
      orderBy: { date: "asc" },
    });
    return c.json(reservations);
  } catch (e) {
    console.error("Error fetching reservation:", e);
    return c.json({ error: "Failed to fetch reservations" }, 500);
  }
});

app.post("/reservations", async (c) => {
  try {
    const body = await c.req.json();

    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({
        error: "Invalid request body",
        details: parsed.error,
      });
    }

    const { name, date, note, status } = parsed.data;

    const created = await prisma.reservation.create({
      data: {
        name,
        date: new Date(date),
        note: note ?? null,
        status: status ?? "pending",
      },
    });

    return c.json(created, 200);
  } catch (e) {
    console.error("Error creating reservation", e);
    return c.json({ error: "Failed to create reservation" }, 500);
  }
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

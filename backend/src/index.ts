import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "./prisma.js";
import type { Prisma } from "@prisma/client";
import { cors } from "hono/cors";

const app = new Hono();

// Zod スキーマ(リクエストボディ用)
const baseReservationSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  date: z.coerce.date({ message: "日付形式が正しくありません" }),
  note: z.string().optional(),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(), //値がなくても自動的に"pending"が入る
});

const createReservationSchema = baseReservationSchema;

const updateReservationSchema = baseReservationSchema.partial();

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
    allowMethods: ["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
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
    const q = c.req.query("q")?.trim();
    const sort = c.req.query("sort") ?? "date_asc";
    const where: Prisma.ReservationWhereInput = {};

    if (q && q !== "") {
      where.OR = [
        {
          name: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          note: {
            contains: q,
            mode: "insensitive",
          },
        },
      ];
    }

    let orderBy: Prisma.ReservationOrderByWithRelationInput = {
      date: "asc",
    };

    if (sort === "date_desc") {
      orderBy = { date: "desc" };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy,
    });
    return c.json(reservations);
  } catch (e) {
    console.error("Error fetching reservation:", e);
    return c.json({ error: "Failed to fetch reservations" }, 500);
  }
});

app.get("/reservations/:id", async (c) => {
  try {
    const idParams = c.req.param("id");
    if (!idParams) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const id = parseInt(idParams, 10);

    if (Number.isNaN(id)) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return c.json({ error: "Reservation not found" }, 404);
    }

    return c.json(reservation);
  } catch (e) {
    console.error("Error fetching reservation by id:", e);
    return c.json({ error: "Failed to fetch reservation" }, 500);
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
        date,
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

app.patch("/reservations/:id", async (c) => {
  try {
    const idParams = c.req.param("id");
    const updateId = parseInt(idParams, 10);
    if (!idParams || Number.isNaN(updateId)) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const body = await c.req.json();

    const parsed = updateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid request body",
        },
        400
      );
    }

    const { name, date, note, status } = parsed.data;

    const data: Prisma.ReservationUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    }
    if (date !== undefined) {
      data.date = date;
    }
    if (note !== undefined) {
      data.note = note.trim() === "" ? null : note;
    }
    if (status !== undefined) {
      data.status = status;
    }

    const updated = await prisma.reservation.update({
      where: { id: updateId },
      data,
    });

    return c.json(updated, 200);
  } catch (e) {
    console.error("Error updating reservation", e);
    return c.json({ error: "Failed to update reservation" }, 500);
  }
});

app.delete("/reservations/:id", async (c) => {
  try {
    const idParams = c.req.param("id");
    const deleteId = parseInt(idParams, 10);
    if (!idParams || Number.isNaN(deleteId)) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const deleted = await prisma.reservation.delete({
      where: { id: deleteId },
    });

    return c.json({ deleted }, 200);
  } catch (e) {
    console.error("Error deleting reservation", e);

    return c.json({ error: "Failed to delete reservation" }, 500);
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

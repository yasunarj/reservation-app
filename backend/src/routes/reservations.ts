import { Hono } from "hono";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string;
  note: string | null;
  status: ReservationStatus;
};

const baseReservationSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  date: z.coerce.date({ message: "日付形式が正しくありません" }),
  note: z.string().optional(),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
});

const createReservationSchema = baseReservationSchema;
const updateReservationSchema = baseReservationSchema.partial();

export const reservationRoute = new Hono();

reservationRoute.get("/", async (c) => {
  try {
    const q = c.req.query("q")?.trim();
    const sort = c.req.query("sort") ?? "date_asc";

    const pageParam = c.req.query("page");
    const perPageParam = c.req.query("perPage");

    const page = pageParam ? Math.max(Number(pageParam), 1) : 1;
    const perPage = perPageParam ? Math.max(Number(perPageParam), 1) : 10;

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

    if(sort === "date_desc") {
      orderBy = {date: "desc"}
    }

    const totalCount = await prisma.reservation.count({ where });

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return c.json({
      items: reservations,
      totalCount,
      page,
      perPage,
      totalPages: Math.ceil(totalCount / perPage),
    });
  } catch (e) {
    console.error("Error fetching reservations:", e);
    return c.json({ error: "Failed to fetch reservations" }, 500);
  }
});

reservationRoute.get("/:id", async (c) => {
  try {
    const idParam = c.req.param("id");
    if (!idParam) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const id = Number(idParam);
    if (Number.isNaN(id)) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return c.json({ error: "reservation not found" }, 404);
    }

    return c.json(reservation, 200);
  } catch (e) {
    console.error("Error fetching reservation by id:", e);
    return c.json({ error: "Failed to fetch reservation" }, 500);
  }
});

reservationRoute.post("/", async (c) => {
  try {
    const body = await c.req.json();

    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid request body",
          details: parsed.error,
        },
        400
      );
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

    return c.json(created, 201);
  } catch (e) {
    console.error("Error creating reservation", e);
    return c.json({ error: "Failed to create reservation" }, 500);
  }
});

reservationRoute.patch("/:id", async (c) => {
  try {
    const idParam = c.req.param("id");

    if (!idParam) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const id = Number(idParam);

    if (Number.isNaN(id)) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const body = await c.req.json();

    const parsed = updateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", details: parsed.error },
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
      where: { id },
      data,
    });

    return c.json(updated, 200);
  } catch (e) {
    console.error("Error updating reservation", e);
    return c.json({ error: "Failed to update reservation" }, 500);
  }
});

reservationRoute.delete("/:id", async (c) => {
  try {
    const idParam = c.req.param("id");
    if (!idParam) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }
    const id = Number(idParam);
    if (Number.isNaN(id)) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const deleted = await prisma.reservation.delete({
      where: { id },
    });
    return c.json({ deleted }, 200);
  } catch (e) {
    console.error("Error deleting reservation", e);
    return c.json({ error: "Failed to delete reservation" }, 500);
  }
});

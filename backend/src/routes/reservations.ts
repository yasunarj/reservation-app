import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";

type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string;
  note: string | null;
  status: ReservationStatus;
};

type UpdateReservation = {
  name?: string;
  date?: string;
  note?: string | null;
  status?: ReservationStatus;
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

reservationRoute.use("*", authMiddleware);
//

reservationRoute.get("/", async (c) => {
  try {
    const user = c.get("user");

    const lambdaBase = process.env.AWS_API_BASE_URL;
    if (!lambdaBase)
      return c.json({ error: "AWS_API_BASE_URL is not set" }, 500);

    const url = new URL(lambdaBase.replace(/\/+$/, "") + "/reservations");
    url.searchParams.set("userId", user.id);

    const q = c.req.query("q");
    const sort = c.req.query("sort");
    const page = c.req.query("page");
    const perPage = c.req.query("perPage");

    if (q) url.searchParams.set("q", q);
    if (sort) url.searchParams.set("sort", sort);
    if (page) url.searchParams.set("page", page);
    if (perPage) url.searchParams.set("perPage", perPage);

    const res = await fetch(url.toString(), { method: "GET" });

    const raw = await res.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      return c.json(
        { error: data?.error ?? "failed", detail: data },
        res.status as any
      );
    }

    return c.json(
      {
        items: data.items ?? [],
        totalCount: data.totalCount ?? 0,
        page: data.page ?? 1,
        perPage: data.perPage ?? 5,
        totalPages: data.totalPages ?? 1,
      },
      200
    );
  } catch (e) {
    console.error("Proxy Get /reservations failed:", e);
    return c.json({ error: "Failed to fetch reservations" }, 500);
  }
});

reservationRoute.get("/:id", async (c) => {
  try {
    const user = c.get("user");

    const idParam = c.req.param("id");
    const id = Number(idParam);
    if (!idParam || Number.isNaN(id)) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const lambdaBase = process.env.AWS_API_BASE_URL;
    if (!lambdaBase)
      return c.json({ error: "AWS_API_BASE_URL is not set" }, 500);

    const url = new URL(lambdaBase.replace(/\/+$/, "") + `/reservations/${id}`);
    url.searchParams.set("userId", user.id);

    const res = await fetch(url.toString(), { method: "GET" });
    const raw = await res.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      return c.json(
        { error: data?.error ?? "failed", detail: data },
        res.status as any
      );
    }

    return c.json(data.reservation, 200);
  } catch (e) {
    console.error("Error fetching reservation by id:", e);
    return c.json({ error: "Failed to fetch reservation" }, 500);
  }
});

reservationRoute.post("/", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json().catch(() => null);
    if (!body) return c.json({ error: "Invalid JSON body" }, 400);

    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", details: parsed.error },
        400
      );
    }

    const lambdaBase = process.env.AWS_API_BASE_URL;
    if (!lambdaBase)
      return c.json({ error: "AWS_API_BASE_URL is not set" }, 500);

    const url = new URL(lambdaBase.replace(/\/+$/, "") + "/reservations");
    url.searchParams.set("userId", user.id);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const raw = await res.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      return c.json(
        { error: data?.error ?? "failed", detail: data },
        res.status as any
      );
    }

    return c.json(data.reservation, 201);
  } catch (e) {
    console.error("Error creating reservation", e);
    return c.json({ error: "Failed to create reservation" }, 500);
  }
});

reservationRoute.patch("/:id", async (c) => {
  try {
    const user = c.get("user");
    const idParam = c.req.param("id");
    const id = Number(idParam);
    if (!idParam || Number.isNaN(id)) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const body = await c.req.json();
    if (!body) return c.json({ error: "Invalid JSON body" }, 400);

    const parsed = updateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", details: parsed.error },
        400
      );
    }

    const lambdaBase = process.env.AWS_API_BASE_URL;
    if (!lambdaBase) {
      return c.json({ error: "AWS_API_BASE_URL is not set" }, 500);
    }

    const url = new URL(lambdaBase.replace(/\/+$/, "") + `/reservations/${id}`);
    url.searchParams.set("userId", user.id);

    const { name, date, note, status } = parsed.data;

    const data: UpdateReservation = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (date !== undefined) {
      data.date = date.toISOString();
    }

    if (note !== undefined) {
      data.note = note.trim() === "" ? null : note;
    }

    if (status !== undefined) {
      data.status = status;
    }

    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const raw = await res.text();
    let resData: any = null;
    try {
      resData = raw ? JSON.parse(raw) : null;
    } catch {
      resData = { raw };
    }

    if (!res.ok) {
      return c.json(
        { error: resData?.error ?? "failed", detail: data },
        res.status as any
      );
    }

    return c.json({ ok: true, reservation: resData.reservation }, 200);
  } catch (e) {
    console.error("Error updating reservation", e);
    return c.json({ error: "Failed to update reservation" }, 500);
  }
});

reservationRoute.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    const idParam = c.req.param("id");
    const id = Number(idParam);
    if (!idParam || Number.isNaN(id)) {
      return c.json({ error: "Invalid reservation id" }, 400);
    }

    const lambdaBase = process.env.AWS_API_BASE_URL;
    if (!lambdaBase) {
      return c.json({ error: "AWS_API_BASE_URL is not set" }, 500);
    }

    const url = new URL(lambdaBase.replace(/\/+$/, "") + `/reservations/${id}`);
    url.searchParams.set("userId", user.id);

    const res = await fetch(url.toString(), {
      method: "DELETE",
    });

    const raw = await res.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      return c.json(
        { error: data?.error ?? "failed", detail: data },
        res.status as any
      );
    }

    return c.json({ ok: true, deletedId: data?.deletedId ?? id }, 200);
  } catch (e) {
    console.error("Error deleting reservation", e);
    return c.json({ error: "Failed to delete reservation" }, 500);
  }
});

//・front側でdetailページが作成されていない。
//・予約一覧ページのページングの処理が未実装になっている(現在は適当な数字で代入してある)

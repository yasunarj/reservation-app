import type { Context, Next } from "hono";
import { jwtVerify } from "jose";
import { getCookie } from "hono/cookie";

const supabaseUrl = process.env.SUPABASE_URL!;
const issuer = `${supabaseUrl}/auth/v1`;

const getSupabaseJwtSecretKey = () => {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not set");
  return new TextEncoder().encode(secret.trim());
};

export const authMiddleware = async (c: Context, next: Next) => {
  const token = getCookie(c, "authToken");
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, getSupabaseJwtSecretKey(), {
      issuer
    });

    c.set("user", {
      id: payload.sub,
      email: payload.email ?? null,
      name: (payload as any).user_metadata?.name ?? payload.email ?? null,
    });

    await next();
  } catch (e) {
    console.error("Error in authMiddleware:", e);
    return c.json({ error: "MW_INVALID_TOKEN" }, 401);
  }
};

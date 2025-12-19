import type { Context, Next } from "hono";
import { jwtVerify } from "jose";
import { getCookie } from "hono/cookie";

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
};

export const authMiddleware = async (c: Context, next: Next) => {
  let token = getCookie(c, "authToken");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());

    c.set("user", {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    });

    await next();
  } catch (e) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
};

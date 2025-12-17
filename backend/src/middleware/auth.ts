import type { Context, Next } from "hono";
import { jwtVerify } from "jose";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
};

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthrized" }, 401);
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey);

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

// localStorageからCookieに変更しましょう。auth.tsの方は変更が終わっているので続けてこのファイル(Middleware.ts)を変更してください。
// ※cookieに保存するためのルールをもう一度見返してください。重要なところになるのでできれば自分で説明できるように内容を暗記するようにすると良いです。

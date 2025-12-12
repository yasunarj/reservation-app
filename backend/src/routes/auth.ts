import { Hono } from "hono";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";

// バイト形式に変換する関数↓
const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
};

const authRoute = new Hono();

// ログイン用のスキーマを定義する
const loginSchema = z.object({
  email: z.email("メールアドレスの形式が正しくありません"),
  password: z.string().min(4, "パスワードは４文字以上で入力してください"),
});

// ダミーユーザー
const dummyUser = {
  id: 1,
  name: "Test User",
  email: "test@example.com",
  password: "password123",
};

authRoute.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", details: parsed.error },
        400
      );
    }

    const { email, password } = parsed.data;

    if (email !== dummyUser.email || password !== dummyUser.password) {
      return c.json({ error: "メールアドレスまたはパスワードが違います" }, 401);
    }

    const secretKey = getJwtSecretKey();

    const token = await new SignJWT({
      sub: String(dummyUser.id),
      email: dummyUser.email,
      name: dummyUser.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secretKey);

    return c.json(
      {
        token,
        user: {
          id: dummyUser.id,
          name: dummyUser.name,
          email: dummyUser.email,
        },
      },
      200
    );
  } catch (e) {
    console.log("Error in login:", e);
    return c.json({ error: "Failed to login" }, 500);
  }
});

authRoute.get("/me", async (c) => {
  try {
    const authHeader = c.req.header("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.slice("Bearer ".length);
    const secretKey = getJwtSecretKey();

    const { payload } = await jwtVerify(token, secretKey);

    return c.json(
      {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      },
      200
    );
  } catch (e) {
    console.error("Error in /auth/me:", e);
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

export { authRoute };

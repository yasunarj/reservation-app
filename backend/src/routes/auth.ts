import { Hono } from "hono";
import { z } from "zod";
import { jwtVerify } from "jose";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { supabase } from "../lib/supabase.js";

const authRoute = new Hono();

const authSchema = z.object({
  email: z.email("メールアドレスの形式が正しくありません"),
  password: z.string().min(6, "パスワードは６文字以上で入力してください"),
});

const supabaseUrl = process.env.SUPABASE_URL!;
const issuer = `${supabaseUrl}/auth/v1`;

const getSupabaseJwtSecretKey = () => {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not set");
  return new TextEncoder().encode(secret.trim());
};

const cookieBaseOptions = {
  httpOnly: true, //javaScriptからcookieを取得できないようにしている。
  secure: false, //HTTPSのみでcookieが扱える。開発時にはHTTPを使用するため、falseにしておく必要がある。
  sameSite: "Lax" as const, //クロスサイトからcookieを取得することができないように設定する。
  path: "/",
};

authRoute.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = authSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", detail: parsed.error },
        400
      );
    }

    const { email, password } = parsed.data;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    const session = data.session;
    if (session) {
      setCookie(c, "authToken", session.access_token, {
        ...cookieBaseOptions,
        maxAge: 60 * 60 * 2,
      });

      setCookie(c, "refreshToken", session.refresh_token, {
        ...cookieBaseOptions,
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return c.json(
      {
        ok: true,
        needsLogin: !session,
      },
      201
    );
  } catch (e) {
    console.error("Error in /auth/signup:", e);
    return c.json({ error: "Failed to signup" }, 500);
  }
});

authRoute.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = authSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", details: parsed.error },
        400
      );
    }

    const { email, password } = parsed.data;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return c.json({ error: error?.message ?? "ログインに失敗しました" }, 401);
    }

    const accessToken = data.session.access_token;
    const refreshToken = data.session.refresh_token;

    setCookie(c, "authToken", accessToken, {
      ...cookieBaseOptions,
      maxAge: 60 * 60 * 2, // ←おすすめ（2時間）
    });

    setCookie(c, "refreshToken", refreshToken, {
      ...cookieBaseOptions,
      maxAge: 60 * 60 * 24 * 30,
    });

    const { payload } = await jwtVerify(
      accessToken,
      getSupabaseJwtSecretKey(),
      { issuer }
    );
    const p = payload as any;

    return c.json(
      {
        user: {
          id: p.sub,
          email: p.email ?? null,
          name: p.user_metadata?.name ?? p.email ?? null,
        },
      },
      200
    );
  } catch (e) {
    console.log("Error in login:", e);
    return c.json({ error: "Failed to login" }, 500);
  }
});

authRoute.post("/logout", async (c) => {
  deleteCookie(c, "authToken", { path: "/" });
  deleteCookie(c, "refreshToken", { path: "/" });
  return c.json({ ok: true }, 200);
});

authRoute.post("/refresh", async (c) => {
  try {
    const refreshToken = getCookie(c, "refreshToken");
    if (!refreshToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return c.json({ error: error?.message ?? "Failed to refresh" }, 401);
    }

    setCookie(c, "authToken", data.session.access_token, {
      ...cookieBaseOptions,
      maxAge: 60 * 60 * 2,
    });

    setCookie(c, "refreshToken", data.session.refresh_token, {
      ...cookieBaseOptions,
      maxAge: 60 * 60 * 24 * 30,
    });

    return c.json({ ok: true }, 200);
  } catch (e) {
    console.error("Error in /auth/refresh:", e);
    return c.json({ error: "Failed to refresh" }, 500);
  }
});

authRoute.get("/me", async (c) => {
  try {
    const token = getCookie(c, "authToken");
    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { payload } = await jwtVerify(token, getSupabaseJwtSecretKey(), {
      issuer,
      algorithms: ["HS256"],
    });
    const p = payload as any;

    return c.json(
      {
        id: p.sub,
        email: p.email ?? null,
        name: p.user_metadata?.name ?? p.email ?? null,
      },
      200
    );
  } catch (e) {
    console.error("Error in authMiddleware:", e);
    return c.json({ error: "ME_INVALID_TOKEN" }, 401);
  }
});

export { authRoute };

// route/auth.tsへsignupのapi、froundEnd/app/signUp/page.tsxを追加しました。成功時に返す値にuserを追加した方が良いとアドバイスあり、またフロント側でも修正箇所が何点かあるのでそこを直して実際にサインアップできるかを確認しましょう。

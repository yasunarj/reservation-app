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

const verifyOptions = { issuer, algorithms: ["HS256"] };

const cookieBaseOptions = {
  httpOnly: true, //javaScriptからcookieを取得できないようにしている。
  secure: process.env.NODE_ENV === "production", //HTTPSのみでcookieが扱える。開発時にはHTTPを使用するため、falseにしておく必要がある。
  sameSite: "Lax" as const, //クロスサイトからcookieを取得することができないように設定する。
  path: "/",
};

const issueCookies = (c: any, accessToken: string, refreshToken: string) => {
  setCookie(c, "authToken", accessToken, {
    ...cookieBaseOptions,
    maxAge: 60 * 60 * 2,
  });
  setCookie(c, "refreshToken", refreshToken, {
    ...cookieBaseOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
};

const getSupabaseJwtSecretKey = () => {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not set");
  return new TextEncoder().encode(secret.trim());
};

authRoute.post("/signup", async (c) => {
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    const session = data.session;
    if (session) {
      issueCookies(c, session.access_token, session.refresh_token);

      const { payload } = await jwtVerify(
        session.access_token,
        getSupabaseJwtSecretKey(),
        verifyOptions
      );

      const p = payload as any;

      const id = p.sub;
      if (!id) {
        return c.json({ error: "Invalid token (no sub) " }, 401);
      }

      return c.json(
        {
          ok: true,
          needsLogin: false,
          user: {
            id,
            email: p.email ?? null,
            name: p.user_metadata?.name ?? p.email ?? null,
          },
        },
        201
      );
    }

    return c.json(
      {
        ok: true,
        needsLogin: true,
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

    issueCookies(c, data.session.access_token, data.session.refresh_token);

    const { payload } = await jwtVerify(
      data.session.access_token,
      getSupabaseJwtSecretKey(),
      verifyOptions
    );
    const p = payload as any;

    const id = p.sub;
    if (!id) return c.json({ error: "Invalid token (no sub)" }, 401);

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

    issueCookies(c, data.session.access_token, data.session.refresh_token);

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

    const { payload } = await jwtVerify(
      token,
      getSupabaseJwtSecretKey(),
      verifyOptions
    );
    const p = payload as any;

    const id = p.sub;
    if (!id) c.json({ error: "Invalid token (no sub)" }, 401);

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

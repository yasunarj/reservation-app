import { Hono } from "hono";
import { z } from "zod";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

// cognitoを使用した認証
import {
  cognitoLogin,
  cognitoSignUp,
  cognitoConfirmSignUp,
  cognitoRefresh,
  cognitoResendConfirmationCode,
} from "../lib/cognitoAuth.js";
import { verifyCognitoAccessToken } from "../lib/cognitoJwt.js";

const authRoute = new Hono()

const authSchema = z.object({
  email: z.email("メールアドレスの形式が正しくありません"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .regex(/[A-Z]/, "大文字を1文字以上含めてください")
    .regex(/[a-z]/, "小文字を1文字以上含めてください")
    .regex(/[0-9]/, "数字を1文字以上含めてください")
    .regex(/[^A-Za-z0-9]/, "記号を1文字以上含めてください"),
});

const resendSchema = z.object({
  email: z.email("メールアドレスの形式が正しくありません")
});

const confirmSchema = z.object({
  email: z.email(),
  code: z.string().min(1),
});

const cookieBaseOptions = {
  httpOnly: true, //javaScriptからcookieを取得できないようにしている。
  secure: process.env.NODE_ENV === "production", //HTTPSのみでcookieが扱える。開発時にはHTTPを使用するため、falseにしておく必要がある。
  sameSite: "Lax" as const, //クロスサイトからcookieを取得することができないように設定する。
  path: "/",
};

const issueCookies = (
  c: any,
  tokens: { accessToken: string; refreshToken?: string },
) => {
  setCookie(c, "authToken", tokens.accessToken, {
    ...cookieBaseOptions,
    maxAge: 60 * 60 * 2,
  });

  if (tokens.refreshToken) {
    setCookie(c, "refreshToken", tokens.refreshToken, {
      ...cookieBaseOptions,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
};

authRoute.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = authSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error }, 400);
    }

    const { email, password } = parsed.data;

    try {
      await cognitoSignUp(email, password);
      return c.json({ ok: true, needsConfirm: true }, 201);
    } catch (e: any) {
      if (e.name === "UsernameExistsException") {
        try {
          await cognitoResendConfirmationCode(email);

          return c.json({ ok: true, needsConfirm: true, info: "Confirmation code resent." }, 200)
        } catch (re: any) {
          console.warn("Resend failed:", re?.name, re?.message);
          return c.json(
            {
              ok: true,
              needsLogin: true,
              info: "Already registered. Please login.",
              reason: re?.name ?? null,
            },
            200
          )
        }
      }

      throw e;
    }
  } catch (e: any) {
    console.error("Error in /auth/signup:", e);
    return c.json({ error: e?.name ?? "Failed to signup", message: e?.message }, 400);
  }
})

authRoute.post("/confirm", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", details: parsed.error },
        400,
      );
    }

    const { email, code } = parsed.data;
    await cognitoConfirmSignUp(email, code);
    return c.json({ ok: true, needsConfirm: true }, 201);
  } catch (e: any) {
    console.error("Error in /auth/confirm:", e);
    return c.json(
      { error: e?.name ?? "Failed to confirm", message: e?.message },
      400,
    );
  }
});

authRoute.post("/resend", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = resendSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error }, 400);
    }

    await cognitoResendConfirmationCode(parsed.data.email);

    return c.json({ ok: true }, 200);
  } catch (e: any) {
    if (e?.name === "LimitExceededException") {
      return c.json({ error: "RATE_LIMITED", message: "しばらく待ってから再送してください。" }, 429)
    }

    console.error("Error in /auth/resend:", e);
    return c.json({ error: e?.name ?? "Failed to resend", message: e?.message }, 400)
  }
})

authRoute.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = authSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", details: parsed.error },
        400,
      );
    }

    const { email, password } = parsed.data;

    const result = await cognitoLogin(email, password);

    if (result.kind === "challenge") {
      return c.json(
        {
          error: "Auth Challenge required",
          challengeName: result.challengeName,
        },
        400,
      );
    }

    issueCookies(c, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    const user = await verifyCognitoAccessToken(result.accessToken);

    return c.json(
      {
        user: {
          id: user.user.id,
          email: user.user.email ?? null,
          name: user.user.email ?? null,
        },
      },
      200,
    );
  } catch (e) {
    console.error("Error in login:", e);
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
    if (!refreshToken) return c.json({ error: "Unauthorized" }, 401);

    const out = await cognitoRefresh(refreshToken);

    issueCookies(c, { accessToken: out.accessToken });

    const { user } = await verifyCognitoAccessToken(out.accessToken);

    return c.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email ?? null,
          name: user.email ?? null,
        },
        expiresIn: out.expiresIn ?? null,
      },
      200,
    );
  } catch (e) {
    console.error("Error in /auth/refresh:", e);
    return c.json({ error: "Failed to refresh" }, 401);
  }
});

authRoute.get("/me", async (c) => {
  try {
    const token = getCookie(c, "authToken");
    if (!token) return c.json({ error: "Unauthorized" }, 401);

    const { user } = await verifyCognitoAccessToken(token);

    return c.json(
      {
        id: user.id,
        email: user.email ?? null,
        name: user.email ?? null,
      },
      200,
    );
  } catch (e) {
    console.error("Error in /auth/me:", e);
    return c.json({ error: "ME_INVALID_TOKEN" }, 401);
  }
});

export { authRoute };

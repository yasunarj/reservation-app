import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyCognitoAccessToken } from "../lib/cognitoJwt.js";

export const authMiddleware = async (c: Context, next: Next) => {
  const token = getCookie(c, "authToken");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { user } = await verifyCognitoAccessToken(token);

    c.set("user", {
      id: user.id,
      name: user.email ?? null,
      email: user.email ?? null,
    });

    await next();
  } catch (e) {
    console.log("Error in authMiddleware:", e);
    return c.json({ error: "MW_INVALID_TOKEN" }, 401);
  }
};

// import type { Context, Next } from "hono";
// import { jwtVerify } from "jose";
// import { getCookie } from "hono/cookie";

// const supabaseUrl = process.env.SUPABASE_URL!;
// const issuer = `${supabaseUrl}/auth/v1`;

// const getSupabaseJwtSecretKey = () => {
//   const secret = process.env.SUPABASE_JWT_SECRET;
//   if (!secret) throw new Error("SUPABASE_JWT_SECRET is not set");
//   return new TextEncoder().encode(secret.trim());
// };

// export const authMiddleware = async (c: Context, next: Next) => {
//   const token = getCookie(c, "authToken");
//   if (!token) {
//     return c.json({ error: "Unauthorized" }, 401);
//   }

//   try {
//     const { payload } = await jwtVerify(token, getSupabaseJwtSecretKey(), {
//       issuer,
//       algorithms: ["HS256"],
//     });

//     const p = payload as any;

//     const id = p.sub;
//     if (!id) return c.json({ error: "Invalid token (no sub" }, 401);

//     const email = typeof p.email === "string" ? p.email : null;

//     const metaName =
//       p.user_metadata && typeof p.user_metadata.name === "string"
//         ? p.user_metadata.name
//         : null;

//     c.set("user", {
//       id,
//       email,
//       name: metaName ?? null
//     });

//     await next();
//   } catch (e) {
//     console.error("Error in authMiddleware:", e);
//     return c.json({ error: "MW_INVALID_TOKEN" }, 401);
//   }
// };

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { reservationRoute } from "./routes/reservations.js";
import { authRoute } from "./routes/auth.js";
import { workerData } from "worker_threads";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
    allowMethods: ["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/health", (c) => {
  return c.json({ status: "ok", message: "Hono API is running" });
});

app.route("/auth", authRoute);
app.route("/reservations", reservationRoute);

serve(
  {
    fetch: app.fetch,
    port: 8787,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);

// ログイン時に入力された情報をもとにDBからユーザーデータを取得してemailとpasswordがあっているか確認して、問題なければtokenを作成する"/auth/login"を作成。
// 作成されたtokenを毎回secretKeyで署名されているか確認をするための"/auth/me"を作成。
// ある程度は理解できたが、最終的にはフロント側と合わせて理解する必要があります。フロントが終わった時点で時系列でどのような流れになっているかをからなず確認をするように
// とりあえず次はログインフォームを作成するところから始めよう

// backend/src/index.js
import { handleFortuneToday } from "./routes/fortune.js";
import { handleRemoteConfig } from "./routes/config.js";

export default {
  async fetch(request, env, ctx) {
    try {
      const { pathname } = new URL(request.url);

      if (pathname === "/health") {
        return new Response(JSON.stringify({ ok: true, service: "fortune-backend" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (pathname === "/remote-config" && request.method === "GET") {
        return handleRemoteConfig(request, env, ctx);
      }

      if (pathname === "/fortune/today" && request.method === "POST") {
        return handleFortuneToday(request, env, ctx);
      }

      // 루트도 JSON으로 고정 (헷갈리지 않게)
      if (pathname === "/") {
        return new Response(JSON.stringify({ ok: true, message: "fortune-backend root" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ message: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

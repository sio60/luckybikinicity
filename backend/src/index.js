// src/index.js
import { handleFortuneToday } from "./routes/fortune.js";
import { handleRemoteConfig } from "./routes/config.js";

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // POST /fortune/today (운세 생성)
      if (path === "/fortune/today" && request.method === "POST") {
        return handleFortuneToday(request, env, ctx);
      }

      // GET /remote-config (앱 설정)
      if (path === "/remote-config" && request.method === "GET") {
        return handleRemoteConfig(request, env, ctx);
      }

      // 나머지 경로는 404
      return new Response(
        JSON.stringify({ message: "Not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (err) {
      console.error(err);
      return new Response(
        JSON.stringify({ message: "Internal error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};

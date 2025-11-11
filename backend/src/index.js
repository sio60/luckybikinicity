// src/index.js
import { handleFortuneToday } from "./routes/fortune.js";
import { handleRemoteConfig } from "./routes/config.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-device-id",
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extraHeaders },
  });
}

async function withCors(res) {
  const text = await res.text(); // 원 응답 바디
  const headers = Object.fromEntries(res.headers);
  return new Response(text, { status: res.status, headers: { ...headers, ...CORS } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // ✅ 뒤 슬래시 제거하여 /path 와 /path/ 를 동일 처리
    let path = url.pathname.replace(/\/+$/, "") || "/";

    // ✅ 프리플라이트 허용 (웹에서 테스트할 때 필수)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ✅ 사소한 404 소음 제거
    if (path === "/favicon.ico") return new Response(null, { status: 204, headers: CORS });

    // ✅ 헬스/루트
    if (path === "/health") return json({ ok: true, service: "fortune-backend" });
    if (path === "/") return json({ ok: true, message: "fortune-backend root" });

    // ✅ 앱 엔드포인트
    if (path === "/remote-config" && request.method === "GET") {
      const res = await handleRemoteConfig(request, env, ctx);
      return withCors(res);
    }
    if (path === "/fortune/today" && request.method === "POST") {
      const res = await handleFortuneToday(request, env, ctx);
      return withCors(res);
    }

    // 디버그 도움: 어떤 경로/메서드로 왔는지 찍어서 404
    return json({ message: "Not found", path, method: request.method }, 404);
  },
};

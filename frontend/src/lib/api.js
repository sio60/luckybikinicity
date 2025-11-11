// src/lib/api.js
import { Platform } from "react-native";

// 1) .env 우선 (EXPO_PUBLIC_ 접두사만 번들에 들어감)
//    예: EXPO_PUBLIC_API_BASE=https://fortune-backend.popple1101.workers.dev
const ENV_BASE = (process.env.EXPO_PUBLIC_API_BASE || "").replace(/\/$/, "");

// 2) 플랫폼별 합리적 기본값 (로컬 wrangler dev용)
const DEFAULT_BASE = Platform.select({
  // 안드로이드 에뮬레이터 → 호스트 PC
  android: "http://10.0.2.2:8787",
  // iOS 시뮬레이터 (맥/PC와 동일 머신)
  ios: "http://127.0.0.1:8787",
  // 웹/기타 환경
  default: "http://127.0.0.1:8787",
});

// 3) 최종 API_BASE 확정
export const API_BASE =
  (typeof ENV_BASE === "string" && ENV_BASE.trim()) ||
  (typeof DEFAULT_BASE === "string" && DEFAULT_BASE.trim()) ||
  "";

// 디버그용 로그
console.log("API_BASE =", API_BASE);

// JSON 안전 파서
async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`JSON Parse error: ${text.slice(0, 200)}`);
  }
}

export async function getRemoteConfig() {
  if (!API_BASE) throw new Error("API_BASE is not set");
  const res = await fetch(`${API_BASE}/remote-config`);
  if (!res.ok) throw new Error(`remote-config ${res.status}`);
  return safeJson(res);
}

export async function postFortuneToday({ body, deviceId }) {
  if (!API_BASE) throw new Error("API_BASE is not set");

  const url = `${API_BASE}/fortune/today`;

  // ✅ 호출 여부, 실제 body 확인
  console.log("[API] postFortuneToday →", url, "body =", body);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId || "anon",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("[API] network error:", e);
    throw e;
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("[API] HTTP error:", res.status, txt);
    throw new Error(`fortune ${res.status} ${txt}`);
  }

  const json = await safeJson(res);
  console.log("[API] postFortuneToday success:", json);
  return json;
}

export const api = { getRemoteConfig, postFortuneToday };

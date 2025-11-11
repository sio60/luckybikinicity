// src/lib/api.js
import { Platform } from "react-native";

// 1) .env 우선 (EXPO_PUBLIC_ 접두사만 번들에 들어감)
const ENV_BASE = (process.env.EXPO_PUBLIC_API_BASE || "").replace(/\/$/, "");

// 2) 플랫폼별 합리적 기본값 (에뮬/실기기)
const DEFAULT_BASE = Platform.select({
  android: "http://192.168.0.132:8787", // ← PC 로컬 IP로 수정 가능
  ios: "http://127.0.0.1:8787",
  default: "http://10.100.0.108:8787",
});

// 3) 최종 API_BASE 확정 (문자열만 통과)
export const API_BASE =
  (typeof ENV_BASE === "string" && ENV_BASE.trim()) ||
  (typeof DEFAULT_BASE === "string" && DEFAULT_BASE.trim());

console.log("API_BASE =", API_BASE); // ← 반드시 값이 찍혀야 정상

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
  const res = await fetch(`${API_BASE}/remote-config`);
  if (!res.ok) throw new Error(`remote-config ${res.status}`);
  return safeJson(res);
}

export async function postFortuneToday({ body, deviceId }) {
  const res = await fetch(`${API_BASE}/fortune/today`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": deviceId || "anon",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`fortune ${res.status} ${txt}`);
  }
  return safeJson(res);
}

export const api = { getRemoteConfig, postFortuneToday };

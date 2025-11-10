// src/lib/api.js
import { Platform } from 'react-native';
console.log("API_BASE =", API_BASE);

const ENV_BASE = process.env.EXPO_PUBLIC_API_BASE?.replace(/\/$/, '');

// 에뮬레이터/로컬 기본값 추정 (실기기면 ENV_BASE 꼭 지정)
const GUESSED_BASE = Platform.select({
  android: 'http://192.168.0.39:8787', // 안드 에뮬레이터에서 host 로컬
  ios: 'http://127.0.0.1:8787',    // iOS 시뮬레이터
  default: 'http://192.168.0.39:8787'
});

const API_BASE = (ENV_BASE || GUESSED_BASE).replace(/\/$/, '');

// 응답이 JSON이 아닐 때 에러 내용을 보기 쉽게
async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    // 맨 앞 200자만 노출
    const head = text?.slice(0, 200) || '';
    throw new Error(`JSON Parse error: ${head}`);
  }
}

export async function getRemoteConfig() {
  const res = await fetch(`${API_BASE}/remote-config`);
  if (!res.ok) throw new Error(`remote-config ${res.status}`);
  return safeJson(res);
}

export async function postFortuneToday({ body, deviceId }) {
  const res = await fetch(`${API_BASE}/fortune/today`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': deviceId || 'anon',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`fortune ${res.status} ${txt}`);
  }
  return safeJson(res);
}

export const api = { getRemoteConfig, postFortuneToday };

// src/routes/fortune.js
import { parseJson } from "../lib/validator.js";
import { getFortuneFromCache, setFortuneToCache } from "../lib/cache.js";
import { generateFortuneText } from "../lib/llm.js";

export async function handleFortuneToday(request, env, ctx) {
  const body = await parseJson(request);
  const {
    category = "today", timezone, name, birthdate, calendar, birthTime, gender,
    couple, // { a:{...}, b:{...} }
  } = body;

  // 이름 전용(name) 외에는 생년월일 요구(커플은 a/b 둘 다)
  if (category !== "name") {
    if (category === "compat") {
      if (!couple?.a?.birthdate || !couple?.b?.birthdate) {
        return new Response(JSON.stringify({ message: "couple a/b birthdate required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    } else {
      if (!birthdate) {
        return new Response(JSON.stringify({ message: "birthdate is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }
  }

  const deviceId = request.headers.get("x-device-id") || "anon";
  const todayKey = new Date().toISOString().slice(0, 10);

  // 카테고리 & 핵심입력 포함 캐시 키(디바이스별)
  const cacheKey = `fortune:v3:${deviceId}:${todayKey}:${category}:${name || ""}:${birthdate || ""}:${couple?.a?.birthdate || ""}:${couple?.b?.birthdate || ""}`;

  const cached = await getFortuneFromCache(env, cacheKey);
  if (cached) {
    return new Response(cached, { status: 200, headers: { "Content-Type": "application/json", "x-cache": "HIT" } });
  }

  let fortuneText, errorMessage;

  try {
    fortuneText = await generateFortuneText(env, {
      category, timezone, name, birthdate, calendar, birthTime, gender, couple,
    });
  } catch (e) {
    console.error("Gemini error:", e);
    errorMessage = e?.message || String(e);
    fortuneText = `오늘(${todayKey}) 운세를 불러오는 데 문제가 생겼어요.
그래도 짧은 스트레칭이나 산책처럼 몸과 마음을 풀어주는 시간을 가져보세요.`;
  }

  const resultObj = {
    date: todayKey,
    category,
    name, birthdate, calendar, birthTime, gender,
    couple,
    timezone,
    fortune: fortuneText,
    promptVersion: "v3-gemini",
    ...(env.DEBUG && errorMessage ? { error: errorMessage } : {}),
  };

  const result = JSON.stringify(resultObj);
  ctx.waitUntil(setFortuneToCache(env, cacheKey, result, 86400));

  return new Response(result, {
    status: 200,
    headers: { "Content-Type": "application/json", "x-cache": "MISS" },
  });
}

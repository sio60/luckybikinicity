// src/routes/fortune.js
import { parseJson } from "../lib/validator.js";
import { getFortuneFromCache, setFortuneToCache } from "../lib/cache.js";
import { generateFortuneText } from "../lib/llm.js";

export async function handleFortuneToday(request, env, ctx) {
  const body = await parseJson(request);
  let { birthdate, name, timezone, category } = body || {};

  // ✅ 카테고리 기본값 + 정규화
  const normalizedCategory = category || "today";
  timezone = timezone || "Asia/Seoul";

  // ✅ today / saju 만 생년월일 필수
  if (
    !birthdate &&
    (normalizedCategory === "today" || normalizedCategory === "saju")
  ) {
    return new Response(
      JSON.stringify({ message: "birthdate is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const deviceId = request.headers.get("x-device-id") || "anon";
  const todayKey = new Date().toISOString().slice(0, 10);

  const cacheKey = `fortune:v2:${deviceId}:${todayKey}:${normalizedCategory}`;

  const cached = await getFortuneFromCache(env, cacheKey);
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "x-cache": "HIT",
      },
    });
  }

  let fortuneText;
  let errorMessage;

  try {
    // ✅ llm.js에는 정규화된 카테고리, timezone 같이 넘김
    fortuneText = await generateFortuneText(env, {
      birthdate,
      name,
      timezone,
      category: normalizedCategory,
    });
  } catch (e) {
    console.error("Gemini error:", e);
    errorMessage = e?.message || String(e);

    fortuneText = `오늘(${todayKey})의 운세를 불러오는 데 잠시 문제가 생겼어요.
그래도 가벼운 산책이나 스트레칭을 하면서 하루를 차분하게 시작해 보시면 좋을 것 같아요.`;
  }

  const resultObj = {
    date: todayKey,
    birthdate,
    name,
    timezone,
    category: normalizedCategory,
    fortune: fortuneText,
    promptVersion: "v2-gemini",
  };

  if (env.DEBUG && errorMessage) {
    resultObj.error = errorMessage;
  }

  const result = JSON.stringify(resultObj);
  ctx.waitUntil(setFortuneToCache(env, cacheKey, result, 86400));

  return new Response(result, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "x-cache": "MISS",
    },
  });
}

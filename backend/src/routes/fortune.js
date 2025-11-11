// src/routes/fortune.js
import { parseJson } from "../lib/validator.js";
import { getFortuneFromCache, setFortuneToCache } from "../lib/cache.js";
import { generateFortuneText, FALLBACK_FORTUNE_TEXT } from "../lib/llm.js";

function normalizeKeyPart(value, { lower = true } = {}) {
  if (value === undefined || value === null) return "none";
  let str = String(value).trim();
  if (!str) return "none";
  if (lower) str = str.toLowerCase();
  try {
    return encodeURIComponent(str);
  } catch {
    return "none";
  }
}

function buildCacheKey({ deviceId, todayKey, category, name, birthdate, timezone, couple }) {
  const parts = ["fortune", "v2", deviceId || "anon", todayKey, category];

  if (category === "name") {
    parts.push(normalizeKeyPart(name));
  } else if (category === "today" || category === "saju") {
    parts.push(normalizeKeyPart(birthdate, { lower: false }));
    parts.push(normalizeKeyPart(timezone));
  } else if (category === "compat") {
    parts.push(normalizeKeyPart(name));
    if (couple?.a) {
      parts.push(normalizeKeyPart(couple.a.name));
      parts.push(normalizeKeyPart(couple.a.birthdate, { lower: false }));
    }
    if (couple?.b) {
      parts.push(normalizeKeyPart(couple.b.name));
      parts.push(normalizeKeyPart(couple.b.birthdate, { lower: false }));
    }
  } else {
    if (name) parts.push(normalizeKeyPart(name));
    if (birthdate) parts.push(normalizeKeyPart(birthdate, { lower: false }));
    if (timezone) parts.push(normalizeKeyPart(timezone));
  }

  return parts.join(":");
}

export async function handleFortuneToday(request, env, ctx) {
  const body = await parseJson(request);
  let { birthdate, name, timezone, category, couple } = body || {};

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

  const cacheKey = buildCacheKey({
    deviceId,
    todayKey,
    category: normalizedCategory,
    name,
    birthdate,
    timezone,
    couple,
  });

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
  let usedFallback = false;

  try {
    // ✅ llm.js에는 정규화된 카테고리, timezone 같이 넘김
    const { text, usedFallback: fallbackUsed, lastError } =
      await generateFortuneText(env, {
      birthdate,
      name,
      timezone,
      category: normalizedCategory,
    });
    fortuneText = text;
    usedFallback = Boolean(fallbackUsed);
    if (lastError) errorMessage = lastError.message;
  } catch (e) {
    console.error("Gemini error:", e);
    errorMessage = e?.message || String(e);

    fortuneText = FALLBACK_FORTUNE_TEXT;
    usedFallback = true;
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

  if (env.DEBUG && (errorMessage || usedFallback)) {
    resultObj.error =
      errorMessage || "LLM fallback text was used because no model succeeded.";
  }

  const result = JSON.stringify(resultObj);
  if (!usedFallback && !errorMessage) {
    ctx.waitUntil(setFortuneToCache(env, cacheKey, result, 86400));
  }

  return new Response(result, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "x-cache": "MISS",
    },
  });
}

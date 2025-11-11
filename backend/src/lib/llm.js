// src/lib/llm.js

// ✅ 기본 모델 후보 (빠름 → 정확)
const DEFAULT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-flash-latest",
  "gemini-pro-latest",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.5-pro-preview-06-05",
  "gemini-2.0-flash",
];

// ✅ API 버전 폴백: v1 → v1beta (신규 모델 다수는 v1beta에 먼저 노출됨)
const API_VERSIONS = ["v1", "v1beta"];

const makeEndpoint = (version, model) =>
  `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`;

// ✅ 여러 Gemini 키 자동 수집 (GEMINI_API_KEY, GEMINI_API_KEY_1~6)
function getGeminiApiKeys(env) {
  const entries = Object.entries(env || {});
  const keys = entries
    .filter(
      ([k]) => k === "GEMINI_API_KEY" || k.startsWith("GEMINI_API_KEY_")
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .filter(Boolean);
  return keys;
}

/**
 * category별 프롬프트 조립
 */
function buildPrompt(payload) {
  const {
    category = "today", // today | name | compat | saju
    timezone = "Asia/Seoul",
    // 공통(1인)
    name,
    birthdate, // YYYY-MM-DD
    calendar = "solar", // solar | lunar
    birthTime = "unknown", // e.g., 10:08 or "unknown"
    gender, // male | female | other | unknown
    // 커플(2인)
    couple,
  } = payload || {};

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `
당신은 한국어로 대답하는 친절한 운세 상담가입니다.
- 3~5문장 정도로 간단하고 밝게 말하세요.
- 의료/법률/투자에 대한 구체 보장은 피하고, "도움이 될 수 있어요" 같은 완곡한 표현을 쓰세요.
- 공포 마케팅 금지.
- 마지막에 오늘 실천 팁 1~2개를 덧붙이세요.
- 존댓말을 사용하세요.
`.trim();

  if (category === "name") {
    return {
      systemPrompt,
      userPrompt: `
오늘 날짜: ${today}
시간대: ${timezone}
카테고리: 이름으로 보는 나는?

이름: ${name || "이름 비공개"}

요청:
- 이름의 어감/운세적 상징을 중심으로 성향/강점/주의점 요약
- 오늘 하루에 어울리는 짧은 행동 팁 1~2개
`.trim(),
    };
  }

  if (category === "compat") {
    const a = couple?.a || {};
    const b = couple?.b || {};
    return {
      systemPrompt,
      userPrompt: `
오늘 날짜: ${today}
시간대: ${timezone}
카테고리: 커플 궁합

[사람 A]
이름: ${a.name || "비공개"}
생년월일: ${a.birthdate || "모름"}
달력: ${a.calendar || "solar"}
출생시: ${a.birthTime || "unknown"}
성별: ${a.gender || "unknown"}

[사람 B]
이름: ${b.name || "비공개"}
생년월일: ${b.birthdate || "모름"}
달력: ${b.calendar || "solar"}
출생시: ${b.birthTime || "unknown"}
성별: ${b.gender || "unknown"}

요청:
- 두 사람의 기본 성향 궁합 요약(동성/이성 여부 가정 없이 중립)
- 오늘 데이트/대화 팁 1~2개
- 단정적 예언/보장 금지
`.trim(),
    };
  }

  // today / saju (1인)
  return {
    systemPrompt,
    userPrompt: `
오늘 날짜: ${today}
시간대: ${timezone}
카테고리: ${category === "saju" ? "사주" : "오늘의 운세"}

이름: ${name || "비공개"}
생년월일: ${birthdate || "모름"}
달력: ${calendar}
출생시: ${birthTime || "unknown"}
성별: ${gender || "unknown"}

요청:
- 전체적인 하루 기운 요약
- 선택 카테고리 포인트(사주면 사주 관점도 언급 가능)
- 오늘 실천 팁 1~2개
- 단정적 표현 금지
`.trim(),
  };
}

/**
 * Gemini 호출 (여러 키 × 여러 모델 폴백)
 */
export const FALLBACK_FORTUNE_TEXT = `오늘은 결과보다 과정에 집중해 보시면 좋아요.
가벼운 산책이나 따뜻한 차처럼 몸과 마음을 풀어주는 작은 휴식을 챙겨 보세요.`;

export async function generateFortuneText(env, payload) {
  // ✅ 호출 여부 + env 안에 뭐 들어왔는지 확인
  console.log("=== [LLM] generateFortuneText called ===");
  console.log("[LLM] env keys:", Object.keys(env));
  console.log("[LLM] DEBUG:", env.DEBUG);

  const apiKeys = getGeminiApiKeys(env);
  console.log("[LLM] Gemini key count:", apiKeys.length);

  if (!apiKeys.length) throw new Error("Missing GEMINI_API_KEY(_1~_6) in env");

  const { systemPrompt, userPrompt } = buildPrompt(payload);
  const attemptTokenLimits = [300, 1024];

  const modelCandidates = [];
  if (env?.GEMINI_MODEL) modelCandidates.push(String(env.GEMINI_MODEL));
  for (const m of DEFAULT_MODELS)
    if (!modelCandidates.includes(m)) modelCandidates.push(m);

  console.log("[LLM] modelCandidates:", modelCandidates);

  let lastErr = null;

  // ✅ 키 → 버전 → 모델 → 토큰 순으로 폴백
  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const apiKey = apiKeys[keyIndex];

    for (const version of API_VERSIONS) {
      for (const model of modelCandidates) {
        for (const maxOutputTokens of attemptTokenLimits) {
          console.log(
            `[LLM] try key#${keyIndex + 1}, version=${version}, model=${model}, tokens=${maxOutputTokens}`
          );

          const body = {
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
              },
            ],
            generationConfig: { temperature: 0.8, maxOutputTokens },
          };

          let res;
          try {
            res = await fetch(`${makeEndpoint(version, model)}?key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
          } catch (e) {
            console.warn(
              `[LLM] Network error (key#${keyIndex + 1} ${version}/${model}):`,
              e.message
            );
            lastErr = new Error(
              `Network error (key#${keyIndex + 1} ${version}/${model}): ${e.message}`
            );
            continue;
          }

          console.log(
            `[LLM] response status (key#${keyIndex + 1} ${version}/${model}):`,
            res.status
          );

          if (res.status === 404) {
            const txt = await res.text().catch(() => "");
            console.warn(
              `[LLM] 404 body (key#${keyIndex + 1} ${version}/${model}):`,
              txt
            );
            lastErr = new Error(
              `404 Not Found for key#${keyIndex + 1} ${version}/${model}`
            );
            continue;
          }

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            console.warn(
              `[LLM] Gemini error (key#${keyIndex + 1} ${version}/${model}):`,
              res.status,
              txt
            );
            lastErr = new Error(
              `Gemini error (key#${keyIndex + 1} ${version}/${model}): ${res.status} ${txt}`
            );
            continue;
          }

          const data = await res.json();
          const candidate = data.candidates?.[0];
          const parts =
            candidate?.content?.parts?.filter(p => typeof p?.text === "string") ||
            [];
          const text = parts.map(p => p.text || "").join("\n").trim();
          const finishReason =
            candidate?.finishReason || data.finishReason || "unknown";

          console.log(
            `[LLM] finishReason (key#${keyIndex + 1} ${version}/${model}):`,
            finishReason
          );

          if (text) {
            console.log("[LLM] success text length:", text.length);
            const cleaned = text
              .replace(/100%/g, "꽤 높은 확률로")
              .replace(/반드시/g, "될 가능성이 커요");
            return { text: cleaned, usedFallback: false };
          }

          if (finishReason !== "MAX_TOKENS") break;
        }
      }
    }
  }

  if (env?.DEBUG && lastErr)
    console.warn("Gemini fallback used due to:", lastErr.message);

  return {
    text: FALLBACK_FORTUNE_TEXT,
    usedFallback: true,
    lastError: lastErr,
  };
}


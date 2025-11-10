// src/lib/llm.js

// ✅ 안정적인 모델 + v1 조합
const GEMINI_MODEL = "gemini-pro";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

/**
 * 운세 텍스트 생성 (Gemini 호출)
 */
export async function generateFortuneText(env, { birthdate, name, timezone, category }) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in env");
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const categoryLabel = category || "general";

  const systemPrompt = `
당신은 한국어로 대답하는 친절한 운세 상담가입니다.
- 너무 길게 말하지 말고, 3~5문장 정도로 간단하고 밝게 말하세요.
- 의료, 법률, 투자에 대한 구체적인 조언이나 보장은 하지 마세요.
- "반드시", "100%" 같은 단정적인 표현은 피하고, "도움이 될 수 있어요" 같은 완곡한 표현을 사용하세요.
- 사용자의 불안감을 키우는 공포 마케팅을 하지 마세요.
- 대신 오늘 하루를 긍정적으로 보낼 수 있는 작은 행동 팁을 1~2개 정도 제안하세요.
`;

  const userPrompt = `
오늘 날짜: ${today}
사용자 생년월일: ${birthdate}
이름(또는 닉네임): ${name || "이름 비공개"}
시간대: ${timezone || "Asia/Seoul (추정)"}
운세 카테고리: ${categoryLabel}

위 정보를 참고해서 오늘의 운세를 자연스러운 한국어로 작성해 주세요.
- 전체적인 하루 기운을 한두 문장으로 설명하고,
- 선택한 카테고리(${categoryLabel})와 관련된 포인트를 한두 문장 추가하고,
- 마지막에는 오늘 실천해보면 좋은 간단한 행동 팁 1~2개를 제안해 주세요.
- 말투는 부드럽고 친구 같은 느낌으로, 반말은 쓰지 말고 존댓말로 말해주세요.
`;

  const attemptTokenLimits = [300, 1024];
  let lastDebugInfo = null;

  for (const maxOutputTokens of attemptTokenLimits) {
    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens,
      },
    };

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Gemini API error: ${res.status} ${text}`);
    }

    const data = await res.json();

    try {
      console.log("[Gemini raw]", JSON.stringify(data).slice(0, 500) + "...");
    } catch { }

    const candidate = data.candidates?.[0];
    const parts =
      candidate?.content?.parts?.filter((part) => typeof part?.text === "string") || [];
    const text = parts.map((p) => p.text || "").join("\n").trim();
    const finishReason = candidate?.finishReason || data.finishReason || "unknown";

    lastDebugInfo = {
      finishReason,
      safetyRatings: candidate?.safetyRatings,
      promptFeedback: data.promptFeedback,
      tokenLimit: maxOutputTokens,
    };

    if (text) {
      return text
        .replace(/100%/g, "꽤 높은 확률로")
        .replace(/반드시/g, "될 가능성이 커요");
    }

    if (finishReason !== "MAX_TOKENS") {
      break;
    }
  }

  console.warn("Gemini 빈 응답으로 기본 문구 반환", JSON.stringify(lastDebugInfo, null, 2));

  return `오늘 하루는 너무 결과에 집착하기보다, 스스로를 돌보는 데 조금 더 신경 써보면 좋을 것 같아요.
가벼운 산책이나 스트레칭, 따뜻한 차 한 잔처럼 몸과 마음을 풀어줄 수 있는 작은 휴식을 꼭 챙겨보세요.`;
}

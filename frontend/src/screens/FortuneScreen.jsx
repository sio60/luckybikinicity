// src/screens/FortuneScreen.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../theme/colors";
import { api } from "../lib/api";
import { useDeviceId } from "../hooks/useDeviceId";

/** YYYYMMDD → YYYY-MM-DD 자동 포맷 */
function normalizeBirthdate(input) {
  const digits = (input || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits; // YYYY
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`; // YYYY-MM
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`; // YYYY-MM-DD
}

/** 날짜 유효성 체크 */
function isValidYYYYMMDD(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const last = new Date(y, m, 0).getDate();
  if (d < 1 || d > last) return false;
  return true;
}

/** 말풍선 */
function ChatBubble({ side = "bot", children }) {
  const isBot = side === "bot";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 10,
        gap: 8,
      }}
    >
      {isBot ? (
        <Image
          source={require("../../assets/icon.png")}
          style={{ width: 28, height: 28 }} // 원 제거 (잘림 방지)
          resizeMode="contain"
        />
      ) : (
        <View style={{ width: 28, height: 28 }} />
      )}
      <View
        style={{
          maxWidth: "82%",
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 14,
          backgroundColor: isBot ? "#ede7ff" : Colors.primary,
        }}
      >
        <Text
          style={{
            color: isBot ? Colors.text : "#fff",
            lineHeight: 20,
          }}
        >
          {children}
        </Text>
      </View>
    </View>
  );
}

/** 상단 카테고리 칩: 가로 스크롤 */
function CategoryRow({ value, onChange }) {
  const items = [
    { key: "today", label: "오늘의 운세" },
    { key: "name", label: "이름으로 보는 나는?" },
    { key: "couple", label: "커플 궁합" },
    { key: "saju", label: "사주" },
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4, gap: 10 }}
    >
      {items.map((it) => {
        const selected = value === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange?.(it.key)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: selected ? Colors.primary : "#f3f0ff",
              borderWidth: 1,
              borderColor: selected ? Colors.primary : Colors.border,
            }}
          >
            <Text
              style={{
                color: selected ? "#fff" : Colors.text,
                fontWeight: "700",
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** 퀵리플라이 (선택형 질문일 때만 노출) */
function QuickReplies({ options = [], onPick }) {
  if (!options?.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {options.map((opt) => (
        <Pressable
          key={String(opt)}
          onPress={() => onPick?.(String(opt))}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <Text style={{ color: Colors.text, fontWeight: "600" }}>
            {String(opt)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export default function FortuneScreen() {
  const deviceId = useDeviceId();
  const scrollRef = useRef(null);

  const [category, setCategory] = useState(null); // 미선택
  const [messages, setMessages] = useState([
    {
      side: "bot",
      text: "안녕하세요, 저는 쥬쥬예요. 오늘 보고 싶은 건 무엇인가요?",
    },
  ]);

  // 단계 플로우 상태
  const [stepIndex, setStepIndex] = useState(-1); // -1: 아직 플로우 시작 전
  const [answers, setAnswers] = useState({});
  const [input, setInput] = useState("");
  const [placeholder, setPlaceholder] = useState(
    "아래 칩에서 카테고리를 선택해 주세요"
  );
  const [loading, setLoading] = useState(false);

  // 선택형 질문일 때 퀵리플라이 표시용 (지금은 사용 X, 추후 확장)
  const quick = [];

  // 플로우 정의 (우선 '오늘의 운세'만 실제 호출, 나머진 TODO)
  const FLOW_DEFS = useMemo(
    () => ({
      today: [
        {
          key: "birthdate",
          type: "input",
          prompt: "생년월일은 언제인가요? (YYYY-MM-DD)",
          placeholder: "예) 20010923 또는 2001-09-23",
          normalize: normalizeBirthdate,
          validate: isValidYYYYMMDD,
          errorText: "YYYY-MM-DD 형식으로 입력해 주세요.",
        },
        {
          key: "name",
          type: "input",
          prompt: "이름이 있으면 알려주세요. (선택, 비워도 돼요)",
          placeholder: "닉네임도 좋아요",
          optional: true,
        },
      ],
      name: [
        {
          key: "name",
          type: "input",
          prompt: "이름이 무엇인가요?",
          placeholder: "예) 유나",
        },
      ],
      couple: [
        {
          key: "name1",
          type: "input",
          prompt: "커플 1의 이름은?",
          placeholder: "예) 민수",
        },
        {
          key: "birth1",
          type: "input",
          prompt: "커플 1의 생년월일 (YYYY-MM-DD)?",
          placeholder: "예) 2001-09-23",
          normalize: normalizeBirthdate,
          validate: isValidYYYYMMDD,
          errorText: "형식을 확인해 주세요.",
        },
        {
          key: "name2",
          type: "input",
          prompt: "커플 2의 이름은?",
          placeholder: "예) 예원",
        },
        {
          key: "birth2",
          type: "input",
          prompt: "커플 2의 생년월일 (YYYY-MM-DD)?",
          placeholder: "예) 2002-03-14",
          normalize: normalizeBirthdate,
          validate: isValidYYYYMMDD,
          errorText: "형식을 확인해 주세요.",
        },
      ],
      saju: [
        {
          key: "birthdate",
          type: "input",
          prompt: "생년월일 (YYYY-MM-DD)을 알려주세요.",
          placeholder: "예) 1999-12-31",
          normalize: normalizeBirthdate,
          validate: isValidYYYYMMDD,
          errorText: "형식을 확인해 주세요.",
        },
        {
          key: "name",
          type: "input",
          prompt: "이름(선택)도 알려주실래요?",
          placeholder: "선택 입력",
        },
      ],
    }),
    []
  );

  const currentFlow = category ? FLOW_DEFS[category] || [] : [];
  const currentStep = currentFlow[stepIndex];

  // 자동 스크롤
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 10);
  }, [messages.length]);

  // 카테고리 선택 시 플로우 시작
  function startFlow(catKey) {
    setCategory(catKey);
    setAnswers({});
    setInput("");
    setStepIndex(0);
    const first = (FLOW_DEFS[catKey] || [])[0];
    setPlaceholder(first?.placeholder || "");
    setMessages((prev) => [
      ...prev,
      { side: "bot", text: labelOf(catKey) + "를 볼게요." },
      ...(first ? [{ side: "bot", text: first.prompt }] : []),
    ]);
  }

  function labelOf(key) {
    switch (key) {
      case "today":
        return "오늘의 운세";
      case "name":
        return "이름으로 보는 나는?";
      case "couple":
        return "커플 궁합";
      case "saju":
        return "사주";
      default:
        return "";
    }
  }

  // 퀵리플라이 선택
  function onPickQuick(val) {
    setInput(String(val));
    onSend(String(val));
  }

  // 입력 전송
  async function onSend(textFromQuick) {
    if (!currentStep) return;
    const raw = textFromQuick ?? input.trim();
    const normalized = currentStep.normalize ? currentStep.normalize(raw) : raw;

    // 검증
    if (!currentStep.optional) {
      if (!normalized) return;
      if (currentStep.validate && !currentStep.validate(normalized)) {
        setMessages((prev) => [
          ...prev,
          {
            side: "bot",
            text: currentStep.errorText || "형식을 확인해 주세요.",
          },
        ]);
        return;
      }
    }

    // 사용자 말풍선
    setMessages((prev) => [
      ...prev,
      { side: "me", text: normalized || "(건너뜀)" },
    ]);
    setInput("");

    // 답 저장
    const nextAnswers = { ...answers, [currentStep.key]: normalized };
    setAnswers(nextAnswers);

    // 다음 스텝
    const nextIndex = stepIndex + 1;
    if (nextIndex < currentFlow.length) {
      const nextStep = currentFlow[nextIndex];
      setStepIndex(nextIndex);
      setPlaceholder(nextStep?.placeholder || "");
      setMessages((prev) => [...prev, { side: "bot", text: nextStep.prompt }]);
      return;
    }

    // 플로우 완료 → API 호출 (현재는 '오늘의 운세'만 실제 호출)
    setStepIndex(nextIndex);
    await submitFlow(category, nextAnswers);
  }

  // 실제 호출
  async function submitFlow(catKey, a) {
    if (catKey !== "today") {
      setMessages((prev) => [
        ...prev,
        {
          side: "bot",
          text: "이 기능은 곧 업데이트될 예정이에요. 지금은 '오늘의 운세'만 결과를 보여드려요 :)",
        },
      ]);
      return;
    }

    const birthdate = a.birthdate;
    const name = a.name || null;
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";

    setLoading(true);
    try {
      const res = await api.postFortuneToday({
        deviceId,
        body: { birthdate, name, timezone, category: "general" },
      });
      const dateLabel = res?.date || new Date().toISOString().slice(0, 10);
      const catLabel = res?.category || "general";
      const txt = `${dateLabel} — ${catLabel}\n\n${
        res?.fortune || "결과가 비어 있어요."
      }`;
      setMessages((prev) => [...prev, { side: "bot", text: txt }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          side: "bot",
          text:
            "운세를 불러오지 못했어요. 네트워크나 백엔드를 확인해 주세요." +
            (e?.message ? `\n(debug) ${e.message}` : ""),
        },
      ]);
    } finally {
      setLoading(false);
      // 플로우 재시작 유도
      setMessages((prev) => [
        ...prev,
        {
          side: "bot",
          text: "다른 것도 보고 싶다면 위 칩에서 다시 선택해 주세요!",
        },
      ]);
      setCategory(null);
      setStepIndex(-1);
      setPlaceholder("아래 칩에서 카테고리를 선택해 주세요");
      setAnswers({});
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <View style={{ flex: 1 }}>
          {/* 메시지 영역 */}
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
            }}
          >
            {messages.map((m, i) => (
              <ChatBubble key={i} side={m.side}>
                {m.text}
              </ChatBubble>
            ))}
          </ScrollView>

          {/* 하단 고정 영역 */}
          <View
            style={{
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: 12,
              backgroundColor: Colors.bg,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              gap: 8,
            }}
          >
            {/* 1) 카테고리 칩: 가로 슬라이드 */}
            <CategoryRow value={category} onChange={startFlow} />

            {/* 2) 선택형일 때 퀵리플라이 (현재 비활성 / 추후 확장) */}
            <QuickReplies options={quick} onPick={onPickQuick} />

            {/* 3) 입력 바 */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                alignItems: "center",
                padding: 8,
                borderRadius: 16,
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <TextInput
                style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 8 }}
                value={input}
                onChangeText={(t) =>
                  setInput(
                    currentStep?.key === "birthdate" ? normalizeBirthdate(t) : t
                  )
                }
                placeholder={placeholder}
                editable={
                  !loading && stepIndex >= 0 && currentStep?.type !== "select"
                }
                onSubmitEditing={() => onSend()}
                returnKeyType="send"
              />
              <Pressable
                disabled={
                  loading || stepIndex < 0 || currentStep?.type === "select"
                }
                onPress={() => onSend()}
                style={{
                  backgroundColor:
                    loading || stepIndex < 0 || currentStep?.type === "select"
                      ? "#cfcaf8"
                      : Colors.primary,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  minWidth: 76,
                  alignItems: "center",
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    보내기
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

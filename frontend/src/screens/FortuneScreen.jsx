import React, { useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Colors } from "../theme/colors";
import ChatBubble from "../components/ChatBubble"; // 이미 있음
import CategoryRow from "../components/CategoryRow"; // 이미 있음(오늘/이름/커플/사주)
import QuickReplies from "../components/QuickReplies"; // 신규
import { api } from "../lib/api";
import { useDeviceId } from "../hooks/useDeviceId";

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function normalizeBirthdate(input) {
  const digits = (input || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}
function isValidYYYYMMDD(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const last = new Date(y, m, 0).getDate();
  return d >= 1 && d <= last;
}
const LABELS = {
  today: "오늘의 운세",
  name: "이름으로 보는 나는?",
  compat: "커플 궁합",
  saju: "사주",
};

// ── 스텝 플로우 정의 ──────────────────────────────────────────────────────────
function getSteps(category) {
  // step: { key, type: 'text'|'date'|'select'|'time', prompt, placeholder, options?, optional? }
  if (category === "name") {
    return [
      {
        key: "name",
        type: "text",
        prompt: "이름은 무엇인가요?",
        placeholder: "예) 유나",
      },
    ];
  }
  if (category === "compat") {
    const pack = (p) => [
      {
        key: `${p}_name`,
        type: "text",
        prompt: `커플 ${p === "a" ? "1" : "2"} 이름은? (선택)`,
        placeholder: "없으면 건너뛰기",
        optional: true,
        skipLabel: "건너뛰기",
      },
      {
        key: `${p}_birth`,
        type: "date",
        prompt: `커플 ${p === "a" ? "1" : "2"} 생년월일은? (YYYY-MM-DD)`,
        placeholder: "20010923 또는 2001-09-23",
      },
      {
        key: `${p}_cal`,
        type: "select",
        prompt: "달력을 골라주세요.",
        options: [
          { label: "양력", value: "solar" },
          { label: "음력", value: "lunar" },
        ],
      },
      {
        key: `${p}_timeMode`,
        type: "select",
        prompt: "출생 시각은?",
        options: [
          { label: "모름", value: "unknown" },
          { label: "알고있음", value: "known" },
        ],
      },
      {
        key: `${p}_time`,
        type: "time",
        prompt: "출생 시각을 입력해 주세요. (예: 10:08)",
        placeholder: "예) 10:08",
        optional: true,
        dependsOn: { key: `${p}_timeMode`, equals: "known" },
      },
      {
        key: `${p}_gender`,
        type: "select",
        prompt: "성별을 선택해 주세요.",
        options: [
          { label: "모름", value: "unknown" },
          { label: "여성", value: "female" },
          { label: "남성", value: "male" },
          { label: "기타", value: "other" },
        ],
      },
    ];
    return [...pack("a"), ...pack("b")];
  }
  // today | saju
  return [
    {
      key: "birthdate",
      type: "date",
      prompt: "생년월일은 언제인가요? (YYYY-MM-DD)",
      placeholder: "20010923 또는 2001-09-23",
    },
    {
      key: "calendar",
      type: "select",
      prompt: "달력을 골라주세요.",
      options: [
        { label: "양력", value: "solar" },
        { label: "음력", value: "lunar" },
      ],
    },
    {
      key: "timeMode",
      type: "select",
      prompt: "출생 시각은?",
      options: [
        { label: "모름", value: "unknown" },
        { label: "알고있음", value: "known" },
      ],
    },
    {
      key: "birthTime",
      type: "time",
      prompt: "출생 시각을 입력해 주세요. (예: 10:08)",
      placeholder: "예) 10:08",
      optional: true,
      dependsOn: { key: "timeMode", equals: "known" },
    },
    {
      key: "gender",
      type: "select",
      prompt: "성별을 선택해 주세요.",
      options: [
        { label: "모름", value: "unknown" },
        { label: "여성", value: "female" },
        { label: "남성", value: "male" },
        { label: "기타", value: "other" },
      ],
    },
    {
      key: "name",
      type: "text",
      prompt: "이름(선택)이 있나요? 없다면 '건너뛰기'를 눌러 주세요.",
      placeholder: "닉네임도 좋아요",
      optional: true,
      skipLabel: "건너뛰기",
    },
  ];
}

// ── 본문 ─────────────────────────────────────────────────────────────────────
export default function FortuneScreen() {
  const deviceId = useDeviceId();
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
    } catch {
      return "Asia/Seoul";
    }
  }, []);

  const scrollRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      side: "left",
      text: "안녕하세요, 저는 쥬쥬예요. 오늘 보고 싶은 건 무엇인가요?",
    },
  ]);
  const [category, setCategory] = useState("today");
  const [steps, setSteps] = useState(getSteps("today"));
  const [index, setIndex] = useState(-1); // -1이면 아직 질문 시작 전
  const [answers, setAnswers] = useState({});
  const [quick, setQuick] = useState([]); // QuickReplies options
  const [input, setInput] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [loading, setLoading] = useState(false);
  const [adCfg] = useState({ adUnitId: "test-banner-001" });

  const ask = (i, nextSteps = steps) => {
    // 조건부 step skip
    let j = i;
    while (j < nextSteps.length) {
      const st = nextSteps[j];
      if (st.dependsOn) {
        const depVal = answers[st.dependsOn.key];
        if (depVal !== st.dependsOn.equals) {
          j++;
          continue;
        }
      }
      // 질문 출력
      setMessages((m) => [...m, { side: "left", text: st.prompt }]);
      setPlaceholder(st.placeholder || "");
      setQuick(
        st.type === "select"
          ? st.options
          : st.optional && st.skipLabel
          ? [{ label: st.skipLabel, value: "__skip__" }]
          : []
      );
      setIndex(j);
      setInput("");
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 0);
      return;
    }
    // 모든 질문 완료 → API 호출
    submitAnswers();
  };

  const startFlow = (cat) => {
    setMessages([
      {
        side: "left",
        text: "안녕하세요, 저는 쥬쥬예요. 오늘 보고 싶은 건 무엇인가요?",
      },
      { side: "left", text: `좋아요, ${LABELS[cat]}를 볼게요.` },
    ]);
    const s = getSteps(cat);
    setCategory(cat);
    setSteps(s);
    setAnswers({});
    setQuick([]);
    setInput("");
    setIndex(-1);
    setTimeout(() => ask(0, s), 40);
  };

  const onPickQuick = (opt) => {
    const st = steps[index];
    if (!st) return;
    if (opt.value === "__skip__") {
      recordAnswer(st.key, null, "(건너뛰기)");
      return;
    }
    recordAnswer(st.key, opt.value, opt.label);
  };

  const onSend = () => {
    const st = steps[index];
    if (!st) {
      // 아직 선택 전이면 카테고리 안내
      setMessages((m) => [...m, { side: "right", text: input || "..." }]);
      setInput("");
      return;
    }

    if (st.type === "select") return; // 선택형은 quick으로만

    let val = input.trim();
    if (st.optional && !val) {
      recordAnswer(st.key, null, "(건너뛰기)");
      return;
    }

    // 타입별 검증
    if (st.type === "date") {
      val = normalizeBirthdate(val);
      if (!isValidYYYYMMDD(val)) {
        Alert.alert("확인", "생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.");
        return;
      }
    }
    if (st.type === "time") {
      if (val && !/^\d{1,2}:\d{2}$/.test(val)) {
        Alert.alert(
          "확인",
          "출생 시각은 HH:MM 형식으로 입력해 주세요. (예: 10:08)"
        );
        return;
      }
    }

    recordAnswer(st.key, val, val || "(건너뛰기)");
  };

  const recordAnswer = (key, value, showText) => {
    setMessages((m) => [...m, { side: "right", text: showText }]);
    setAnswers((a) => {
      const next = { ...a, [key]: value };
      setQuick([]);
      setInput("");
      setTimeout(() => ask(index + 1), 20);
      return next;
    });
  };

  const buildRequestBody = () => {
    if (category === "compat") {
      return {
        category,
        timezone,
        couple: {
          a: {
            name: answers.a_name || null,
            birthdate: answers.a_birth,
            calendar: answers.a_cal || "solar",
            birthTime:
              answers.a_timeMode === "known"
                ? answers.a_time || null
                : "unknown",
            gender: answers.a_gender || "unknown",
          },
          b: {
            name: answers.b_name || null,
            birthdate: answers.b_birth,
            calendar: answers.b_cal || "solar",
            birthTime:
              answers.b_timeMode === "known"
                ? answers.b_time || null
                : "unknown",
            gender: answers.b_gender || "unknown",
          },
        },
      };
    }
    if (category === "name") {
      return { category, timezone, name: answers.name };
    }
    return {
      category,
      timezone,
      name: answers.name || null,
      birthdate: answers.birthdate,
      calendar: answers.calendar || "solar",
      birthTime:
        answers.timeMode === "known" ? answers.birthTime || null : "unknown",
      gender: answers.gender || "unknown",
    };
  };

  const submitAnswers = async () => {
    setLoading(true);
    setMessages((m) => [...m, { side: "right", text: "보내기" }]);
    try {
      const body = buildRequestBody();
      const data = await api.postFortuneToday({ deviceId, body });
      setMessages((m) => [...m, { side: "left", text: data.fortune }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          side: "left",
          text: "운세를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
        },
        ...(e?.message ? [{ side: "left", text: `(debug) ${e.message}` }] : []),
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 0);
    }
  };

  // 최초 진입 시 “오늘의 운세” 플로우 시작
  React.useEffect(() => {
    ask(0); /* index -1일 때 첫 질문 */
  }, []); // 첫 렌더에서 질문 시작

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      edges={["top"]}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16 }}>
        {/* 인사/메시지 */}
        {messages.map((m, i) => (
          <ChatBubble key={i} side={m.side}>
            {m.text}
          </ChatBubble>
        ))}

        {/* 카테고리 칩 */}
        <View style={{ marginTop: 8 }}>
          <CategoryRow value={category} onChange={(cat) => startFlow(cat)} />
        </View>

        {/* 현재 스텝이 선택형이면 퀵 리플라이 노출 */}
        <QuickReplies options={quick} onPick={onPickQuick} />

        {/* 입력 바 */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
            marginTop: 12,
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
            onChangeText={setInput}
            placeholder={placeholder || "메시지를 입력하세요"}
            editable={!loading && !(steps[index]?.type === "select")}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
          <Pressable
            disabled={loading || steps[index]?.type === "select"}
            onPress={onSend}
            style={{
              backgroundColor:
                loading || steps[index]?.type === "select"
                  ? "#cfcaf8"
                  : Colors.primary,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {loading ? "..." : "보내기"}
            </Text>
          </Pressable>
        </View>

        {/* 로딩 인디케이터(채팅 느낌 유지) */}
        {loading && (
          <View style={{ marginTop: 8 }}>
            <ChatBubble side="left">
              <ActivityIndicator />
            </ChatBubble>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

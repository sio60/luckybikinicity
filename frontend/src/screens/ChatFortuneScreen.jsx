import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Colors } from "../theme/colors";
import Logo from "../components/Logo";
import { useDeviceId } from "../hooks/useDeviceId";
import { getLocalFortune, getFollowup } from "../lib/localFortune";
import { calendarLabel, normGender, todayYMD } from "../lib/personalize";
import { getJSON, setJSON } from "../lib/store";

// ===== 설정 =====
const CATEGORIES = ["오늘의 운세", "이름으로 보는 나는?", "커플 궁합", "사주"];
const DEFAULT_TIMEZONE = "Asia/Seoul";
const CHAT_KEY_PREFIX = "chat.v1"; // 저장 키 prefix

const FOLLOWUP_CHIPS = [
  { key: "love", label: "연애운?" },
  { key: "money", label: "금전운?" },
  { key: "health", label: "건강운?" },
  { key: "work", label: "일·학업 팁?" },
];
const QUICK_CATEGORY_CHIPS = [
  { label: "오늘의 운세" },
  { label: "이름으로 보는 나는?" },
  { label: "사주" },
  { label: "커플 궁합" },
];

const defaultForm = () => ({
  name: "",
  birthdate: "",
  gender: "",
  calendar: "양력",
  couple: { a: { name: "", birthdate: "" }, b: { name: "", birthdate: "" } },
});

// ===== 유틸 =====
function stepsFor(cat) {
  switch (cat) {
    case "오늘의 운세":
    case "사주":
      return ["name", "birthdate", "gender", "calendar"];
    case "이름으로 보는 나는?":
      return ["name", "gender"];
    case "커플 궁합":
      return ["aName", "aBirthdate", "bName", "bBirthdate"];
    default:
      return ["name"];
  }
}
function toApiCategory(label) {
  return label === "오늘의 운세"
    ? "today"
    : label === "이름으로 보는 나는?"
    ? "name"
    : label === "사주"
    ? "saju"
    : label === "커플 궁합"
    ? "compat"
    : "today";
}
function askFor(step) {
  const map = {
    name: "이름(또는 닉네임)을 알려주세요.",
    birthdate: "생년월일은 언제인가요? (YYYY-MM-DD 또는 YYYYMMDD)",
    gender: "성별을 알려주세요. (남/여/기타/비공개 가능)",
    calendar: "양력/음력 중 무엇으로 볼까요? (양력 권장)",
    aName: "A의 이름을 알려주세요.",
    aBirthdate: "A의 생년월일은? (YYYY-MM-DD 또는 YYYYMMDD)",
    bName: "B의 이름을 알려주세요.",
    bBirthdate: "B의 생년월일은? (YYYY-MM-DD 또는 YYYYMMDD)",
  };
  return map[step] || "입력해 주세요.";
}
// YYYYMMDD/느슨한 입력 → YYYY-MM-DD
function normalizeBirth(input) {
  const s = String(input).trim();
  if (/^\d{8}$/.test(s)) {
    const y = s.slice(0, 4),
      m = s.slice(4, 6),
      d = s.slice(6, 8);
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const only = s.replace(/\D/g, "");
  if (only.length === 8) {
    const y = only.slice(0, 4),
      m = only.slice(4, 6),
      d = only.slice(6, 8);
    return `${y}-${m}-${d}`;
  }
  return null;
}

// ===== 화면 =====
export default function ChatFortuneScreen() {
  const insets = useSafeAreaInsets();
  useHeaderHeight(); // (안 쓰지만 react-navigation 내부 레이아웃 유지용)
  const deviceId = useDeviceId() || "anon";
  const today = todayYMD(DEFAULT_TIMEZONE);

  const [category, setCategory] = useState(null);
  const [steps, setSteps] = useState([]);
  const [curStepIdx, setCurStepIdx] = useState(0);
  const [form, setForm] = useState(defaultForm());

  const [messages, setMessages] = useState([
    {
      id: "sys1",
      who: "bot",
      text: "안녕하세요, 저는 쥬쥬예요. 오늘 보고 싶은 건 무엇인가요?",
    },
  ]);
  const [text, setText] = useState("");

  // 바/키보드 높이 추적
  const [barH, setBarH] = useState(0);
  const [kbHeight, setKbHeight] = useState(0);
  const [kbShown, setKbShown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [showFollowups, setShowFollowups] = useState(false);
  const scrollRef = useRef(null);

  // ---- 키보드 리스너 (안드로이드 절대 하단 바를 키보드 높이만큼 올림) ----
  useEffect(() => {
    const sh = Keyboard.addListener("keyboardDidShow", (e) => {
      setKbShown(true);
      setKbHeight(e?.endCoordinates?.height || 0);
    });
    const hi = Keyboard.addListener("keyboardDidHide", () => {
      setKbShown(false);
      setKbHeight(0);
    });
    return () => {
      sh.remove();
      hi.remove();
    };
  }, []);

  // ---- 저장된 대화 불러오기 (오늘/기기 기준) ----
  useEffect(() => {
    if (!deviceId) return;
    (async () => {
      const key = `${CHAT_KEY_PREFIX}:${deviceId}:${today}`;
      const saved = await getJSON(key, null);
      if (saved && saved.date === today && Array.isArray(saved.messages)) {
        setMessages(saved.messages);
        setCategory(saved.category ?? null);
        const s =
          saved.steps ?? (saved.category ? stepsFor(saved.category) : []);
        setSteps(s);
        setCurStepIdx(saved.curStepIdx ?? 0);
        setForm(saved.form ?? defaultForm());
        setShowFollowups(!!saved.showFollowups);
      }
    })();
  }, [deviceId, today]);

  // ---- 대화/상태 변경 시 자동 저장 ----
  useEffect(() => {
    if (!deviceId) return;
    const key = `${CHAT_KEY_PREFIX}:${deviceId}:${today}`;
    const payload = {
      date: today,
      messages,
      category,
      steps,
      curStepIdx,
      form,
      showFollowups,
    };
    setJSON(key, payload);
  }, [
    deviceId,
    today,
    messages,
    category,
    steps,
    curStepIdx,
    form,
    showFollowups,
  ]);

  // ---- 스크롤 맨 아래로 ----
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, category, barH, kbShown, kbHeight]);

  function pushBot(t) {
    setMessages((m) => [
      ...m,
      { id: `bot-${Date.now()}-${Math.random()}`, who: "bot", text: t },
    ]);
  }
  function pushMe(t) {
    setMessages((m) => [...m, { id: `me-${Date.now()}`, who: "me", text: t }]);
  }

  function onPick(cat) {
    setCategory(cat);
    const s = stepsFor(cat);
    setSteps(s);
    setCurStepIdx(0);
    setForm(defaultForm());
    setShowFollowups(false);

    setMessages((m) => [
      ...m,
      { id: `bot-${Date.now()}`, who: "bot", text: `${cat}를 볼게요.` },
      { id: `bot-q-${Date.now()}`, who: "bot", text: askFor(s[0]) },
    ]);
  }

  function parseCal(s) {
    const t = (s || "").trim();
    if (/^음/.test(t) || /lunar/i.test(t)) return "음력";
    return "양력";
  }

  async function onSend() {
    const v = text.trim();
    if (!v || !category || loading) return;

    pushMe(v);
    setText("");

    const step = steps[curStepIdx];
    if (step) {
      if (step === "name") setForm((f) => ({ ...f, name: v }));
      else if (step === "birthdate") {
        const nv = normalizeBirth(v);
        if (!nv)
          return pushBot(
            "형식은 YYYY-MM-DD 또는 YYYYMMDD 입니다. 예) 20010916"
          );
        setForm((f) => ({ ...f, birthdate: nv }));
      } else if (step === "gender")
        setForm((f) => ({ ...f, gender: normGender(v) }));
      else if (step === "calendar")
        setForm((f) => ({ ...f, calendar: parseCal(v) }));
      else if (step === "aName")
        setForm((f) => ({
          ...f,
          couple: { ...f.couple, a: { ...f.couple.a, name: v } },
        }));
      else if (step === "aBirthdate") {
        const nv = normalizeBirth(v);
        if (!nv)
          return pushBot(
            "형식은 YYYY-MM-DD 또는 YYYYMMDD 입니다. 예) 20010916"
          );
        setForm((f) => ({
          ...f,
          couple: { ...f.couple, a: { ...f.couple.a, birthdate: nv } },
        }));
      } else if (step === "bName")
        setForm((f) => ({
          ...f,
          couple: { ...f.couple, b: { ...f.couple.b, name: v } },
        }));
      else if (step === "bBirthdate") {
        const nv = normalizeBirth(v);
        if (!nv)
          return pushBot(
            "형식은 YYYY-MM-DD 또는 YYYYMMDD 입니다. 예) 20010916"
          );
        setForm((f) => ({
          ...f,
          couple: { ...f.couple, b: { ...f.couple.b, birthdate: nv } },
        }));
      }

      const next = curStepIdx + 1;
      if (next < steps.length) {
        setCurStepIdx(next);
        pushBot(askFor(steps[next]));
        return;
      }
    }

    // 모든 입력 수집 완료 → 로컬 운세
    setLoading(true);
    try {
      const payload = {
        category: toApiCategory(category),
        timezone: DEFAULT_TIMEZONE,
      };
      if (payload.category === "compat") {
        payload.couple = form.couple;
      } else {
        payload.name = form.name || v;
        payload.birthdate = form.birthdate || "";
        payload.gender = form.gender || "";
        payload.calendar = calendarLabel(form.calendar);
      }

      const res = await getLocalFortune(payload, deviceId);
      if (res.limited) pushBot(res.message);
      else pushBot(res.text);
      setShowFollowups(true);
    } catch {
      pushBot(
        "로컬 운세 생성 중 오류가 발생했어요. 입력을 다시 확인해 주세요."
      );
    } finally {
      setLoading(false);
    }
  }

  function onAskFollowup(tag) {
    pushBot(getFollowup(tag));
  }

  // ===== 렌더 =====
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
        contentContainerStyle={{
          paddingTop: 12,
          paddingHorizontal: 12,
          // 하단 바 + (키보드 떠있으면 키보드 높이만큼 더 확보)
          paddingBottom:
            barH + (kbShown ? kbHeight : Math.max(insets.bottom, 8)),
        }}
      >
        {messages.map((m) => {
          const isMe = m.who === "me";
          return (
            <View
              key={m.id}
              style={{
                flexDirection: "row",
                justifyContent: isMe ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}
            >
              {!isMe && (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    marginRight: 8,
                    marginTop: 2,
                  }}
                >
                  <Logo size={28} />
                </View>
              )}
              <View
                style={{
                  maxWidth: "78%",
                  backgroundColor: isMe ? Colors.primary : "#eee6ff",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                }}
              >
                <Text style={{ color: isMe ? "#fff" : "#333", lineHeight: 20 }}>
                  {m.text}
                </Text>
              </View>
            </View>
          );
        })}

        {showFollowups && (
          <View style={{ marginTop: 4, gap: 10 }}>
            <Text style={{ color: "#666", marginLeft: 4 }}>다른 질문하기</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {FOLLOWUP_CHIPS.map((ch) => (
                <Pressable
                  key={ch.key}
                  onPress={() => onAskFollowup(ch.key)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: "#f3f0ff",
                  }}
                >
                  <Text style={{ color: Colors.primary, fontWeight: "700" }}>
                    {ch.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={{ color: "#666", marginLeft: 4, marginTop: 6 }}>
              카테고리 바꾸기
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {QUICK_CATEGORY_CHIPS.map((ch) => (
                <Pressable
                  key={ch.label}
                  onPress={() => onPick(ch.label)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: "#f3f0ff",
                  }}
                >
                  <Text style={{ color: Colors.primary, fontWeight: "700" }}>
                    {ch.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ✅ 하단 바: absolute + 키보드 높이만큼 끌어올림(안드로이드 전용 느낌) */}
      <View
        onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: kbShown ? kbHeight : 0, // ← 키보드에 딱 붙음
          borderTopWidth: 1,
          borderColor: Colors.border,
          backgroundColor: "#fff",
        }}
      >
        {!category && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: 8,
              gap: 8,
            }}
          >
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => onPick(c)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  backgroundColor: "#f3f0ff",
                }}
              >
                <Text style={{ color: Colors.primary, fontWeight: "700" }}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            gap: 10,
          }}
        >
          <TextInput
            placeholder={
              category
                ? "메시지를 입력하세요"
                : "아래 칩에서 카테고리를 선택해 주세요"
            }
            value={text}
            onChangeText={setText}
            editable={!!category && !loading}
            style={{
              flex: 1,
              height: 44,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              backgroundColor: "#fff",
            }}
          />
          <Pressable
            onPress={onSend}
            disabled={!text.trim() || !category || loading}
            style={{
              height: 44,
              paddingHorizontal: 16,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                !text.trim() || !category || loading
                  ? "#cfcaf8"
                  : Colors.primary,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {loading ? "..." : "보내기"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// src/screens/ChatFortuneScreen.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Colors } from "../theme/colors";
import Logo from "../components/Logo";
import { api } from "../lib/api";

const CATEGORIES = ["오늘의 운세", "이름으로 보는 나는?", "커플 궁합", "사주"];
const DEVICE_ID = `${Platform.OS}-local-dev-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`;
const DEFAULT_TIMEZONE = "Asia/Seoul";

// ✅ 한국어 라벨 → 백엔드 category 값 매핑
function toApiCategory(label) {
  switch (label) {
    case "오늘의 운세":
      return "today";
    case "이름으로 보는 나는?":
      return "name";
    case "커플 궁합":
      return "compat";
    case "사주":
      return "saju";
    default:
      return "today";
  }
}

// ✅ 카테고리/입력값 → 백엔드로 보낼 payload 만드는 헬퍼
function buildRequestBody(categoryLabel, userInput) {
  const apiCategory = toApiCategory(categoryLabel);

  // 이름 운세: 이름만 전송
  if (apiCategory === "name") {
    return {
      category: "name",
      name: userInput,
      timezone: DEFAULT_TIMEZONE,
    };
  }

  // 오늘의 운세 / 사주: 생년월일만 전송 (YYYY-MM-DD 형식 기대)
  if (apiCategory === "today" || apiCategory === "saju") {
    return {
      category: apiCategory,
      birthdate: userInput,
      timezone: DEFAULT_TIMEZONE,
    };
  }

  // 커플 궁합: 일단 이름 한 명만 사용 (나중에 확장)
  if (apiCategory === "compat") {
    return {
      category: "compat",
      name: userInput,
      timezone: DEFAULT_TIMEZONE,
    };
  }

  // 안전용 기본값
  return {
    category: "today",
    name: userInput,
    timezone: DEFAULT_TIMEZONE,
  };
}

export default function ChatFortuneScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [category, setCategory] = useState(null); // 한국어 라벨 상태
  const [messages, setMessages] = useState([
    {
      id: "sys1",
      who: "bot",
      text: "안녕하세요, 저는 쥬쥬예요. 오늘 보고 싶은 건 무엇인가요?",
    },
  ]);
  const [text, setText] = useState("");
  const [barH, setBarH] = useState(0);
  const [kbShown, setKbShown] = useState(false);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    const sh = Keyboard.addListener("keyboardDidShow", () => setKbShown(true));
    const hi = Keyboard.addListener("keyboardDidHide", () => setKbShown(false));
    return () => {
      sh.remove();
      hi.remove();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, category, barH, kbShown]);

  function onPick(cat) {
    setCategory(cat);
    setMessages((m) => [
      ...m,
      { id: `bot-${Date.now()}`, who: "bot", text: `${cat}를 볼게요.` },
      ...(cat === "오늘의 운세"
        ? [
            {
              id: `bot-q1-${Date.now()}`,
              who: "bot",
              text: "생년월일은 언제인가요? (YYYY-MM-DD)",
            },
          ]
        : []),
      ...(cat === "이름으로 보는 나는?"
        ? [
            {
              id: `bot-q2-${Date.now()}`,
              who: "bot",
              text: "이름(또는 닉네임)을 알려주세요.",
            },
          ]
        : []),
      ...(cat === "사주"
        ? [
            {
              id: `bot-q3-${Date.now()}`,
              who: "bot",
              text: "사주를 보고 싶은 분의 생년월일을 알려주세요. (YYYY-MM-DD)",
            },
          ]
        : []),
      // 커플 궁합도 나중에 질문 추가 가능
    ]);
  }

  // ✅ 메세지 보내기 + 백엔드 호출
  async function onSend() {
    const v = text.trim();
    if (!v || !category || loading) return;

    // 1) 내 메시지 추가
    const myMsg = { id: `me-${Date.now()}`, who: "me", text: v };
    setMessages((m) => [...m, myMsg]);
    setText("");

    // 2) 백엔드 요청
    const body = buildRequestBody(category, v);
    console.log("[Chat] send fortune request:", body);

    setLoading(true);
    try {
      const res = await api.postFortuneToday({
        body,
        deviceId: DEVICE_ID,
      });

      console.log("[Chat] fortune response:", res);

      const fortuneText =
        res?.fortune ||
        res?.text ||
        "운세 응답을 불러오는 데 잠시 문제가 있었어요. 잠시 후 다시 시도해 주세요.";

      setMessages((m) => [
        ...m,
        {
          id: `bot-reply-${Date.now()}`,
          who: "bot",
          text: fortuneText,
        },
      ]);
    } catch (e) {
      console.error("[Chat] fortune error:", e);
      setMessages((m) => [
        ...m,
        {
          id: `bot-error-${Date.now()}`,
          who: "bot",
          text:
            "서버와 통신 중 오류가 발생했어요. 네트워크 상태를 확인하시고 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const Wrapper =
    Platform.OS === "ios" ? require("react-native").KeyboardAvoidingView : View;
  const wrapperProps =
    Platform.OS === "ios"
      ? { behavior: "padding", keyboardVerticalOffset: headerHeight }
      : {};

  return (
    <Wrapper style={{ flex: 1, backgroundColor: "#fff" }} {...wrapperProps}>
      {/* 대화 영역 */}
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
        contentContainerStyle={{
          paddingTop: 12,
          paddingHorizontal: 12,
          paddingBottom: kbShown ? 8 : barH + Math.max(insets.bottom, 8),
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
      </ScrollView>

      {/* 하단 바 */}
      <View
        onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
        style={{
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
            {CATEGORIES.map((c) => {
              const sel = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => onPick(c)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    backgroundColor: sel ? Colors.primary : "#f3f0ff",
                  }}
                >
                  <Text
                    style={{
                      color: sel ? "#fff" : Colors.primary,
                      fontWeight: "700",
                    }}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
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
            <Text style={{ color: "#fff", fontWeight: "700" }}>보내기</Text>
          </Pressable>
        </View>
      </View>
    </Wrapper>
  );
}

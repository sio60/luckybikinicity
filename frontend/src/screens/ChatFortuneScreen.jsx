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

const CATEGORIES = ["오늘의 운세", "이름으로 보는 나는?", "커플 궁합", "사주"];

export default function ChatFortuneScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [category, setCategory] = useState(null);
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

  const scrollRef = useRef(null);

  useEffect(() => {
    const sh = Keyboard.addListener("keyboardDidShow", () => setKbShown(true));
    const hi = Keyboard.addListener("keyboardDidHide", () => setKbShown(false));
    return () => {
      sh.remove();
      hi.remove();
    };
  }, []);

  // 새 메시지/레이아웃 변화 시 맨 아래로
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
    ]);
  }

  function onSend() {
    const v = text.trim();
    if (!v) return;
    setMessages((m) => [...m, { id: `me-${Date.now()}`, who: "me", text: v }]);
    setText("");
  }

  // ✅ 안드로이드는 KeyboardAvoidingView 사용 안 함 (adjustResize에만 의존)
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
          // 하단 바 높이 + 세이프 영역만큼 확보
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

      {/* 하단 바 (칩 + 입력창) */}
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
            paddingBottom: Math.max(insets.bottom, 8), // 바닥에 ‘딱’
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
            editable={!!category}
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
            disabled={!text.trim() || !category}
            style={{
              height: 44,
              paddingHorizontal: 16,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                !text.trim() || !category ? "#cfcaf8" : Colors.primary,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>보내기</Text>
          </Pressable>
        </View>
      </View>
    </Wrapper>
  );
}

// src/components/CategoryRow.jsx
import React from "react";
import { View, Pressable, Text } from "react-native";
import { Colors } from "../theme/colors";

const LABELS = {
  today: "오늘의 운세",
  name: "이름으로 보는 나는?",
  compat: "커플 궁합",
  saju: "사주",
};

export default function CategoryRow({ value, onChange }) {
  const items = ["today", "name", "compat", "saju"];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((k) => {
        const sel = value === k;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: sel ? Colors.primary : "#f5f5fb",
              borderWidth: 1,
              borderColor: sel ? Colors.primary : "#e9e9ee",
            }}
          >
            <Text
              style={{ color: sel ? "#fff" : "#5c5c70", fontWeight: "700" }}
            >
              {LABELS[k]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

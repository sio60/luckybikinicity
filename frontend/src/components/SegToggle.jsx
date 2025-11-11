// src/components/SegToggle.jsx
import React from "react";
import { View, Pressable, Text } from "react-native";
import { Colors } from "../theme/colors";

export default function SegToggle({ items, value, onChange }) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {items.map((it, idx) => {
        const sel = value === it.value;
        return (
          <Pressable
            key={it.value}
            onPress={() => onChange(it.value)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: sel ? Colors.primary : "#fff",
              borderRightWidth: idx < items.length - 1 ? 1 : 0,
              borderRightColor: Colors.border,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: sel ? "#fff" : Colors.text, fontWeight: "700" }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

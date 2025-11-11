import React from "react";
import { View, Pressable, Text } from "react-native";
import { Colors } from "../theme/colors";

export default function QuickReplies({ options = [], onPick }) {
  if (!options.length) return null;
  return (
    <View
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}
    >
      {options.map((opt) => (
        <Pressable
          key={String(opt.value)}
          onPress={() => onPick?.(opt)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: Colors.primary,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Colors } from "../theme/colors";

export default function CategoryChips({ categories, value, onChange }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {categories.map((c) => {
        const selected = value === c;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: selected ? Colors.primary : Colors.chipBg,
              borderWidth: 1,
              borderColor: selected ? Colors.primary : Colors.border,
            }}
          >
            <Text
              style={{
                color: selected ? "#fff" : Colors.chipText,
                fontWeight: "700",
              }}
            >
              {c}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

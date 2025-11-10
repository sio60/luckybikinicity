import React, { useMemo, useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { StatusBar } from "expo-status-bar";

const SIGNS = [
  { key: "aries", label: "양자리(Aries)" },
  { key: "taurus", label: "황소자리(Taurus)" },
  { key: "gemini", label: "쌍둥이자리(Gemini)" },
  { key: "cancer", label: "게자리(Cancer)" },
  { key: "leo", label: "사자자리(Leo)" },
  { key: "virgo", label: "처녀자리(Virgo)" },
  { key: "libra", label: "천칭자리(Libra)" },
  { key: "scorpio", label: "전갈자리(Scorpio)" },
  { key: "sagittarius", label: "사수자리(Sagittarius)" },
  { key: "capricorn", label: "염소자리(Capricorn)" },
  { key: "aquarius", label: "물병자리(Aquarius)" },
  { key: "pisces", label: "물고기자리(Pisces)" }
];

const SAMPLE_FORTUNES = [
  "오늘은 시작이 좋은 날. 가볍게 몸을 풀어보자!",
  "원하는 답이 주변에 있어. 대화를 먼저 걸어봐.",
  "작은 정리가 큰 성과를 만든다. 책상부터 정리 ㄱㄱ.",
  "예상 밖의 연락이 행운을 가져옴. 알림 켜두기!",
  "컨디션 UP. 오후에 집중타임 잡으면 효율 미쳤다.",
  "지출은 최소화, 아이디어는 극대화. 머릿속 MVP 적기.",
  "산책 15분이 운빨을 올려준다. 바람 쐬고 오자!"
];

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export default function App() {
  const [sign, setSign] = useState(SIGNS[0].key);
  const [fortune, setFortune] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const todayStr = useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}.${mm}.${dd}`;
  }, []);

  const pickLocal = () => {
    const idx = Math.floor(Math.random() * SAMPLE_FORTUNES.length);
    return SAMPLE_FORTUNES[idx];
  };

  const onPick = async () => {
    setErr("");
    setFortune("");
    setLoading(true);
    try {
      if (API_BASE) {
        const url = `${API_BASE}/fortune?sign=${encodeURIComponent(sign)}&date=${new Date().toISOString().slice(0,10)}`;
        const res = await fetch(url);
        const txt = await res.text();
        let data;
        try { data = JSON.parse(txt); } catch { data = { fortune: txt }; }
        const msg = data.fortune || data.message || data.text || pickLocal();
        setFortune(String(msg));
      } else {
        setFortune(pickLocal());
      }
    } catch (e) {
      setErr("네트워크 오류");
      setFortune(pickLocal());
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>오늘의 운세</Text>
        <Text style={s.date}>{todayStr}</Text>
      </View>

      <View style={s.card}>
        <Text style={s.label}>별자리 선택</Text>
        <View style={s.pickerWrap}>
          <Picker selectedValue={sign} onValueChange={setSign} style={s.picker}>
            {SIGNS.map((x) => (
              <Picker.Item key={x.key} label={x.label} value={x.key} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity style={s.button} onPress={onPick} disabled={loading}>
          <Text style={s.buttonText}>{loading ? "불러오는 중..." : "운세 보기"}</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator style={{ marginTop: 12 }} />}

        {!!err && <Text style={s.err}>{err}</Text>}

        {!!fortune && (
          <View style={s.resultBox}>
            <Text style={s.resultTitle}>Result</Text>
            <Text style={s.resultText}>{fortune}</Text>
          </View>
        )}
      </View>

      <Text style={s.footer}>v1 • API 없으면 로컬 랜덤, 있으면 Cloudflare 호출</Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7FB", paddingHorizontal: 16 },
  header: { paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: "800" },
  date: { marginTop: 6, color: "#555" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 3
  },
  label: { fontWeight: "700", marginBottom: 8 },
  pickerWrap: {
    borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12,
    overflow: "hidden", marginBottom: 12
  },
  picker: { height: Platform.OS === "ios" ? 180 : 48, width: "100%" },
  button: { backgroundColor: "#111", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
  err: { marginTop: 10, color: "#d00", fontWeight: "600" },
  resultBox: {
    marginTop: 16, backgroundColor: "#FAFAFD", borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: "#eee"
  },
  resultTitle: { fontWeight: "800", marginBottom: 6 },
  resultText: { lineHeight: 20 },
  footer: { textAlign: "center", color: "#888", marginTop: 14 }
});

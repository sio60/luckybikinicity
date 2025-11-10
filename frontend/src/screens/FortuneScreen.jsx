import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ActivityIndicator, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../theme/colors";
import { api } from "../lib/api";
import PrimaryButton from "../components/PrimaryButton";
import CategoryChips from "../components/CategoryChips";
import AdBanner from "../components/AdBanner";
import { useDeviceId } from "../hooks/useDeviceId";

// 🔧 YYYYMMDD → YYYY-MM-DD 자동 포맷
function normalizeBirthdate(input) {
  const digits = (input || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits; // YYYY
  if (digits.length <= 6) return `${digits.slice(0,4)}-${digits.slice(4)}`; // YYYY-MM
  return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;   // YYYY-MM-DD
}

// 🔧 날짜 유효성 체크
function isValidYYYYMMDD(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const last = new Date(y, m, 0).getDate();
  if (d < 1 || d > last) return false;
  return true;
}

export default function FortuneScreen() {
  const deviceId = useDeviceId();

  const [remoteCfg, setRemoteCfg] = useState(null);
  const [loadingCfg, setLoadingCfg] = useState(true);

  const [birthdate, setBirthdate] = useState(""); // YYYY-MM-DD
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
    } catch {
      return "Asia/Seoul";
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.getRemoteConfig();
        setRemoteCfg(cfg);
        const list = ["general", ...(cfg?.categories || [])];
        if (!list.includes(category)) setCategory(list[0]);
      } catch {/* ignore */}
      finally { setLoadingCfg(false); }
    })();
  }, []);

  const categories = useMemo(() => {
    const base = ["general"];
    const extra = remoteCfg?.categories || [];
    return [...new Set([...base, ...extra])];
  }, [remoteCfg]);

  async function onSubmit() {
    if (!isValidYYYYMMDD(birthdate)) {
      Alert.alert("확인", "생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await api.postFortuneToday({
        deviceId,
        body: { birthdate, name: name || null, timezone, category },
      });
      setResult(data);
    } catch (e) {
      // 에러 내용도 함께 보여줘서 원인 추적 쉽게
      Alert.alert("오류", `운세를 불러오지 못했습니다.\n${e?.message || ""}`);
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !isValidYYYYMMDD(birthdate);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>

        {/* 안내 카드 */}
        <View style={{ backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1, borderRadius: 16, padding: 16 }}>
          <Text style={{ fontFamily: "BMJUA", fontSize: 18, color: Colors.primary, marginBottom: 8 }}>오늘의 운세</Text>
          <Text style={{ color: Colors.subText, lineHeight: 20 }}>
            생년월일과(선택) 이름을 입력하고 카테고리를 고르면,
            부드러운 톤으로 3~5문장 운세가 나와요.
          </Text>
        </View>

        {/* 입력 */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: "700", color: Colors.text }}>생년월일 (YYYY-MM-DD)</Text>
          <TextInput
            placeholder="예) 20010923 또는 2001-09-23"
            value={birthdate}
            onChangeText={(t) => setBirthdate(normalizeBirthdate(t))}
            keyboardType="number-pad"  // ← 숫자패드
            style={{
              borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: "#fff",
            }}
          />

          <Text style={{ fontWeight: "700", color: Colors.text, marginTop: 8 }}>이름(선택)</Text>
          <TextInput
            placeholder="닉네임도 좋아요"
            value={name}
            onChangeText={setName}
            style={{
              borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: "#fff",
            }}
          />

          <Text style={{ fontWeight: "700", color: Colors.text, marginTop: 8 }}>카테고리</Text>
          <CategoryChips categories={categories} value={category} onChange={setCategory} />
        </View>

        <PrimaryButton title="오늘의 운세 보기" onPress={onSubmit} disabled={disabled} />

        {loading && (
          <View style={{ padding: 20, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", gap: 12 }}>
            <ActivityIndicator />
            <Text style={{ color: Colors.subText }}>생성 중…</Text>
          </View>
        )}

        {/* 결과 */}
        {result && (
          <View style={{ padding: 18, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, backgroundColor: "#fff", gap: 8 }}>
            <Text style={{ fontFamily: "BMJUA", color: Colors.primary, fontSize: 18, marginBottom: 6 }}>
              {result.date} — {result.category || "general"}
            </Text>
            <Text style={{ color: Colors.text, lineHeight: 22 }}>{result.fortune}</Text>
            {!!result.error && (
              <Text style={{ marginTop: 6, color: Colors.subText, fontSize: 12 }}>(debug) {result.error}</Text>
            )}
          </View>
        )}

        {/* 광고 자리 */}
        <AdBanner adUnitId={remoteCfg?.adUnitId} />
        <View style={{ height: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

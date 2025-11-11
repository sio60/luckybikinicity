// src/lib/personalize.js
const animals = ["쥐","소","호랑이","토끼","용","뱀","말","양","원숭이","닭","개","돼지"];
const weekdays = ["일","월","화","수","목","금","토"];

// YYYY-MM-DD (tz 안전)
export function todayYMD(tz = "Asia/Seoul") {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit"
    });
    return fmt.format(new Date()); // en-CA => 2025-11-11
  } catch {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
}

export function weekdayKor(dateStr, tz="Asia/Seoul") {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    const fmt = new Intl.DateTimeFormat("ko-KR", { timeZone: tz, weekday: "short" });
    const s = fmt.format(d); // 예: (화)
    return s.replace(/[()]/g, "").slice(0,1); // ‘화’ → 한 글자
  } catch {
    const d = dateStr ? new Date(dateStr) : new Date();
    return weekdays[d.getDay()];
  }
}

export function ageFrom(birthdate, tz="Asia/Seoul") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate||"")) return null;
  const today = new Date(new Date().toLocaleString("en-US",{timeZone: tz}));
  const b = new Date(birthdate+"T00:00:00");
  let age = today.getFullYear()-b.getFullYear();
  const mm = today.getMonth()-b.getMonth();
  if (mm<0 || (mm===0 && today.getDate()<b.getDate())) age--;
  return age;
}

export function yearAnimal(birthdate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate||"")) return "";
  const y = Number(birthdate.slice(0,4));
  return animals[(y-4) % 12];
}

export function normGender(g) {
  if (!g) return "비공개";
  const s = String(g).trim().toLowerCase();
  if (["남","남자","m","male"].includes(s)) return "남";
  if (["여","여자","f","female"].includes(s)) return "여";
  return "기타";
}

export const calendarLabel = (cal) => (cal==="음력"||/lunar/i.test(cal||"")?"음력":"양력");

// 보기 어색한 기호 정리
export function sanitize(str) {
  if (!str) return "";
  return String(str)
    .replace(/[—–ㅡ]/g, " ")      // 긴 대시/ㅡ 제거
    .replace(/\s{2,}/g, " ")      // 중복 공백 정리
    .replace(/\s*-\s*/g, " - ")   // 하이픈 주변 가독성
    .trim();
}

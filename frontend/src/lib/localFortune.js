// src/lib/localFortune.js
import { getJSON, setJSON, pushUnique } from "./store";
import { TODAY_POOL, NAME_POOL, SAJU_POOL, COMPAT_POOL, fillTemplate } from "../data/templates";
import { todayYMD, weekdayKor, ageFrom, yearAnimal, normGender, calendarLabel, sanitize } from "./personalize";

function djb2(str) {
  let h = 5381; for (let i=0;i<str.length;i++) h = ((h<<5)+h) + str.charCodeAt(i);
  return h >>> 0;
}
function mulberry32(a){return function(){a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t^=t+Math.imul(t^t>>>7,61|t); return ((t^t>>>14)>>>0)/4294967296;}}
function seededOrder(len, seed) {
  const arr = Array.from({length: len}, (_,i)=>i);
  const rnd = mulberry32(djb2(seed));
  for (let i=len-1;i>0;i--){
    const j = Math.floor(rnd()* (i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const POOLS = { today: TODAY_POOL, name: NAME_POOL, saju: SAJU_POOL, compat: COMPAT_POOL };

function makeVars(input) {
  const { category, name, birthdate, gender, calendar, couple } = input;
  const vars = {
    name: name || "손님",
    birthdate: birthdate || "",
    age: birthdate ? ageFrom(birthdate) : "",
    gender: normGender(gender),
    calendar: calendarLabel(calendar),
    today: todayYMD(),
    weekday: weekdayKor(),
    animal: birthdate ? yearAnimal(birthdate) : ""
  };
  if (category==="compat" && couple) {
    vars.aName = couple.a?.name || "A";
    vars.bName = couple.b?.name || "B";
    const seed = `${vars.aName}|${couple.a?.birthdate||""}|${vars.bName}|${couple.b?.birthdate||""}`;
    vars.compatScore = 70 + Math.floor(mulberry32(djb2(seed))()*26); // 70~95
  }
  return vars;
}

export async function getLocalFortune(input, deviceId) {
  const category = input.category || "today";
  const pool = POOLS[category] || TODAY_POOL;
  const tz = input.timezone || "Asia/Seoul";
  const dateKey = todayYMD(tz);

  const baseKey = `fortune.v4:${deviceId||"anon"}:${category}`;
  const dailyKey = `${baseKey}:daily:${dateKey}`;
  const orderKey = `${baseKey}:order`;
  const usedKey  = `${baseKey}:used`;

  const daily = await getJSON(dailyKey, null);
  if (daily?.done) {
    return { limited: true, message: "오늘은 이 카테고리를 이미 보셨어요. 내일 다시 보거나 다른 카테고리를 선택해 주세요." };
  }

  let order = await getJSON(orderKey, null);
  if (!order || order.length !== pool.length) {
    order = seededOrder(pool.length, baseKey);
    await setJSON(orderKey, order);
    await setJSON(usedKey, []);
  }

  const used = await getJSON(usedKey, []);
  const unseen = order.filter(idx => !used.includes(idx));
  const pick = unseen.length ? unseen[0] : order[0];
  await pushUnique(usedKey, pick);
  await setJSON(dailyKey, { done: true });

  const vars = makeVars(input);
  let text = fillTemplate(pool[pick], vars);
  text = sanitize(text);

  return { limited: false, text, meta: { index: pick, date: dateKey }};
}

const FOLLOWUP = {
  love: [
    "연애운은 말의 온도가 핵심이에요. 오늘은 먼저 안부를 건네보세요.",
    "감정 표현을 한 줄이라도 적어 보내면 거리감이 줄어요.",
    "답정너 톤은 피하고 열린 질문을 해보세요."
  ],
  money: [
    "금전운은 지출 파악에서 시작합니다. 오늘 카드 내역을 세 줄로 요약해보세요.",
    "작은 구독 하나만 줄여도 한 달 뒤 체감됩니다.",
    "수입 다각화 아이디어를 메모 앱에 모아두면 기회가 와요."
  ],
  health: [
    "건강은 수면 위에 쌓입니다. 오늘 목표 취침은 평소보다 10분 빨리.",
    "어깨와 목 스트레칭 3분이 집중력 회복에 좋아요.",
    "물을 마실 때만 폰을 내려두면 마음이 편안해집니다."
  ],
  work: [
    "일과 학업은 첫 줄 쓰기가 시동입니다. 문장 하나만 적고 시작해보세요.",
    "마감이 두렵다면 범위를 50%로 줄여서 지금 끝내보세요.",
    "피드백은 빠르고 짧게. 속도가 결과를 만듭니다."
  ]
};

export function getFollowup(tag="love") {
  const arr = FOLLOWUP[tag] || FOLLOWUP.love;
  const idx = Math.floor(Math.random()*arr.length);
  return sanitize(arr[idx]);
}

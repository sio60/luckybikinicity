// src/lib/localFortune.js
import { getJSON, setJSON, pushUnique } from "./store";
import {
  TODAY_POOL, NAME_POOL, SAJU_POOL, COMPAT_POOL,
  LOVE_POOL, MONEY_POOL, HEALTH_POOL, WORK_POOL,
  fillTemplate
} from "../data/templates";
import {
  todayYMD, weekdayKor, ageFrom, yearAnimal, normGender, calendarLabel, sanitize
} from "./personalize";

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

// ✅ 팔로우업 카테고리 추가
const POOLS = {
  today: TODAY_POOL,
  name: NAME_POOL,
  saju: SAJU_POOL,
  compat: COMPAT_POOL,
  love: LOVE_POOL,
  money: MONEY_POOL,
  health: HEALTH_POOL,
  work: WORK_POOL,
};

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

  // 디바이스+카테고리 단위로 하루 1회 + 중복 방지
  const baseKey = `fortune.v4:${deviceId||"anon"}:${category}`;
  const dailyKey = `${baseKey}:daily:${dateKey}`;
  const orderKey = `${baseKey}:order`;
  const usedKey  = `${baseKey}:used`;

  const daily = await getJSON(dailyKey, null);
  if (daily?.done) {
    return {
      limited: true,
      message: "오늘은 이 카테고리를 이미 보셨어요. 내일 다시 보거나 다른 카테고리를 선택해 주세요."
    };
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

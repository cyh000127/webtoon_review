import { existsSync, readFileSync } from "node:fs";

const archiveJsonPath = "webtoons/webtoons.json";
const archiveXmlPath = "webtoons/webtoons.xml";

function fail(message) {
  console.error(`검증 실패: ${message}`);
  process.exitCode = 1;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function getXmlCount(xml) {
  const countMatch = xml.match(/<webtoons\b[^>]*\bcount="(\d+)"/);
  return countMatch ? Number(countMatch[1]) : null;
}

function getXmlItemIds(xml) {
  return Array.from(xml.matchAll(/<webtoon\b[^>]*\bid="([^"]+)"/g)).map(
    (match) => match[1]
  );
}

function getXmlOfficialUrlCount(xml) {
  return Array.from(xml.matchAll(/<officialUrl>/g)).length;
}

const archive = readJson(archiveJsonPath);
const xml = readFileSync(archiveXmlPath, "utf8");

const items = archive.items ?? [];
const xmlCount = getXmlCount(xml);
const xmlIds = getXmlItemIds(xml);
const xmlOfficialUrlCount = getXmlOfficialUrlCount(xml);
const jsonIds = items.map((item) => item.id);
const duplicateIds = jsonIds.filter((id, index) => jsonIds.indexOf(id) !== index);

if (archive.collectedAt !== "2026-05-25") {
  fail(`collectedAt 값이 예상과 다릅니다: ${archive.collectedAt}`);
}

if (xmlCount !== items.length) {
  fail(`XML count(${xmlCount})와 JSON 항목 수(${items.length})가 다릅니다.`);
}

if (xmlIds.length !== items.length) {
  fail(`XML 웹툰 항목 수(${xmlIds.length})와 JSON 항목 수(${items.length})가 다릅니다.`);
}

if (xmlOfficialUrlCount !== items.length) {
  fail(`XML officialUrl 수(${xmlOfficialUrlCount})와 JSON 항목 수(${items.length})가 다릅니다.`);
}

if (duplicateIds.length > 0) {
  fail(`중복 id가 있습니다: ${[...new Set(duplicateIds)].join(", ")}`);
}

for (const item of items) {
  const requiredFields = [
    "id",
    "title",
    "author",
    "platform",
    "officialUrl",
    "genres",
    "description",
    "serializationStatus",
    "serializationLabel",
    "userReadingStatus",
    "userProgress",
    "updateScheduleLabel",
    "updateScheduleSource",
    "group",
    "coverImage",
    "descriptionFile"
  ];

  for (const field of requiredFields) {
    if (!item[field] || (Array.isArray(item[field]) && item[field].length === 0)) {
      fail(`${item.id} 항목의 ${field} 값이 비어 있습니다.`);
    }
  }

  if (!["ongoing", "completed"].includes(item.serializationStatus)) {
    fail(`${item.id} 항목의 serializationStatus 값이 올바르지 않습니다.`);
  }

  if (
    !["official", "latestEpisodeDate", "completed", "unknown"].includes(
      item.updateScheduleSource
    )
  ) {
    fail(`${item.id} 항목의 updateScheduleSource 값이 올바르지 않습니다.`);
  }

  if (!Array.isArray(item.updateWeekdays)) {
    fail(`${item.id} 항목의 updateWeekdays 값이 배열이 아닙니다.`);
  }

  for (const weekday of item.updateWeekdays) {
    if (!["월", "화", "수", "목", "금", "토", "일"].includes(weekday)) {
      fail(`${item.id} 항목의 updateWeekdays 값이 올바르지 않습니다: ${weekday}`);
    }
  }

  if (item.serializationStatus === "ongoing" && item.updateWeekdays.length === 0) {
    fail(`${item.id} 연재중 항목의 updateWeekdays 값이 비어 있습니다.`);
  }

  if (
    item.latestEpisodeUpdatedAt !== undefined &&
    !/^\d{4}-\d{2}-\d{2}$/.test(item.latestEpisodeUpdatedAt)
  ) {
    fail(`${item.id} 항목의 latestEpisodeUpdatedAt 날짜 형식이 올바르지 않습니다.`);
  }

  try {
    const officialUrl = new URL(item.officialUrl);

    if (officialUrl.protocol !== "https:") {
      fail(`${item.id} 항목의 officialUrl은 https URL이어야 합니다.`);
    }
  } catch {
    fail(`${item.id} 항목의 officialUrl 형식이 올바르지 않습니다.`);
  }

  if (!["reading", "finished", "dropped"].includes(item.userReadingStatus)) {
    fail(`${item.id} 항목의 userReadingStatus 값이 올바르지 않습니다.`);
  }

  if (
    item.userRating !== undefined &&
    (typeof item.userRating !== "number" || item.userRating < 0 || item.userRating > 5)
  ) {
    fail(`${item.id} 항목의 userRating 값이 올바르지 않습니다.`);
  }

  if (!existsSync(item.coverImage)) {
    fail(`${item.id} 항목의 표지 파일이 없습니다: ${item.coverImage}`);
  }

  if (!existsSync(item.descriptionFile)) {
    fail(`${item.id} 항목의 설명 파일이 없습니다: ${item.descriptionFile}`);
  }

  const description = readFileSync(item.descriptionFile, "utf8").trim();
  if (!description.startsWith(item.title)) {
    fail(`${item.id} 설명 파일이 작품 제목으로 시작하지 않습니다.`);
  }
}

if (!process.exitCode) {
  const statusCounts = items.reduce((counts, item) => {
    counts[item.userReadingStatus] = (counts[item.userReadingStatus] ?? 0) + 1;
    return counts;
  }, {});

  console.log(`검증 완료: 웹툰 ${items.length}개`);
  console.log(`표지 ${items.length}개, 설명 파일 ${items.length}개 확인`);
  console.log(
    `감상 상태: ${Object.entries(statusCounts)
      .map(([status, count]) => `${status} ${count}`)
      .join(", ")}`
  );
}

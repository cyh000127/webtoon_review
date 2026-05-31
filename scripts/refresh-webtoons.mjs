import { readFileSync, writeFileSync } from "node:fs";

const archiveJsonPath = "webtoons/webtoons.json";
const archiveXmlPath = "webtoons/webtoons.xml";
const dryRun = process.argv.includes("--dry-run");

const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

const englishDayToKorean = {
  MONDAY: "월",
  TUESDAY: "화",
  WEDNESDAY: "수",
  THURSDAY: "목",
  FRIDAY: "금",
  SATURDAY: "토",
  SUNDAY: "일"
};

const koreanDays = ["일", "월", "화", "수", "목", "금", "토"];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": userAgent,
        accept: "application/json,text/html;q=0.9,*/*;q=0.8",
        ...(options.headers ?? {})
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  return fetchWithTimeout(url).then((response) => response.json());
}

async function fetchText(url) {
  return fetchWithTimeout(url).then((response) => response.text());
}

function getKstDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(new Date());
}

function normalizeDate(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);

  if (isoMatch) {
    return isoMatch[1];
  }

  const naverMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);

  if (naverMatch) {
    const year = Number(naverMatch[1]);
    const fullYear = year >= 70 ? 1900 + year : 2000 + year;
    return `${fullYear}-${naverMatch[2]}-${naverMatch[3]}`;
  }

  return "";
}

function getWeekdayFromDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T00:00:00+09:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return koreanDays[date.getDay()];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function splitKoreanWeekdays(value) {
  if (!value || typeof value !== "string") {
    return [];
  }

  return unique([...value.matchAll(/[월화수목금토일]/g)].map((match) => match[0]));
}

function getScheduleLabel(item) {
  if (item.serializationStatus === "completed") {
    return "완결";
  }

  if (item.updateWeekdays?.length) {
    return item.updateWeekdays.join(", ");
  }

  return "확인 필요";
}

function makeScheduleFields(item, updateWeekdays, updateScheduleSource) {
  const next = {
    ...item,
    updateWeekdays,
    updateScheduleSource
  };

  return {
    ...next,
    updateScheduleLabel: getScheduleLabel(next)
  };
}

async function getNaverWeekdayMap() {
  const data = await fetchJson("https://comic.naver.com/api/webtoon/titlelist/weekday");
  const map = new Map();

  for (const [englishDay, titles] of Object.entries(data.titleListMap ?? {})) {
    const weekday = englishDayToKorean[englishDay];

    for (const title of titles) {
      const titleId = String(title.titleId);
      const current = map.get(titleId) ?? {
        weekdays: [],
        rest: false,
        finish: false,
        titleName: title.titleName
      };

      current.weekdays = unique([...current.weekdays, weekday]);
      current.rest = current.rest || title.rest === true;
      current.finish = current.finish || title.finish === true;
      current.titleName = title.titleName;
      map.set(titleId, current);
    }
  }

  return map;
}

function getNaverLatestDate(articleList) {
  return normalizeDate(articleList?.[0]?.serviceDateDescription);
}

async function refreshNaver(item, weekdayMap) {
  if (item.serializationStatus === "completed") {
    return makeScheduleFields(item, [], "completed");
  }

  const titleId = String(item.platformId);
  const officialWeekday = weekdayMap.get(titleId);
  const articleData = await fetchJson(
    `https://comic.naver.com/api/article/list?titleId=${titleId}&page=1`
  );
  const latestEpisodeUpdatedAt = getNaverLatestDate(articleData.articleList);
  const isCompleted = item.serializationStatus === "completed" || articleData.finished === true;

  if (isCompleted) {
    return makeScheduleFields(
      {
        ...item,
        latestEpisodeUpdatedAt: latestEpisodeUpdatedAt || item.latestEpisodeUpdatedAt
      },
      [],
      "completed"
    );
  }

  const inferredWeekday = getWeekdayFromDate(latestEpisodeUpdatedAt);
  const updateWeekdays = officialWeekday?.weekdays?.length
    ? officialWeekday.weekdays
    : inferredWeekday
      ? [inferredWeekday]
      : [];
  const updateScheduleSource = officialWeekday?.weekdays?.length
    ? "official"
    : inferredWeekday
      ? "latestEpisodeDate"
      : "unknown";
  const nextEpisodeCount = Number(articleData.totalCount) || item.episodeCount;
  const isResting = officialWeekday?.rest === true || item.serializationLabel.includes("휴재");

  return makeScheduleFields(
    {
      ...item,
      episodeCount: nextEpisodeCount,
      serializationLabel: isResting ? "연재중(휴재)" : "연재중",
      latestEpisodeUpdatedAt: latestEpisodeUpdatedAt || item.latestEpisodeUpdatedAt
    },
    updateWeekdays,
    updateScheduleSource
  );
}

function parseKakaoNextData(html, seriesId) {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );

  if (!match) {
    throw new Error(`${seriesId} 카카오페이지 __NEXT_DATA__를 찾지 못했습니다.`);
  }

  const data = JSON.parse(match[1]);
  const queries =
    data.props?.pageProps?.initialProps?.dehydratedState?.queries ?? [];
  const overviewQuery = queries.find((query) =>
    JSON.stringify(query.queryKey ?? []).includes("contentHomeOverview")
  );

  const content =
    overviewQuery?.state?.data?.contentHomeOverview?.content;

  if (!content) {
    throw new Error(`${seriesId} 카카오페이지 작품 개요를 찾지 못했습니다.`);
  }

  return content;
}

function parseEpisodeNumber(title) {
  const matches = [...String(title).matchAll(/(\d+)\s*(?:화|편)/g)].map((match) =>
    Number(match[1])
  );

  return matches.length ? Math.max(...matches) : 0;
}

async function getKakaoEpisodeCount(seriesId, fallbackCount) {
  const data = await fetchJson(
    `https://page.kakao.com/api/gateway/api/v2/content/product/list?series_id=${seriesId}&cursor_index=0&cursor_direction=INIT&window_size=500`
  );
  const productTitles = (data.result?.list ?? [])
    .map((entry) => entry.item?.title)
    .filter(Boolean);
  const maxEpisodeNumber = Math.max(0, ...productTitles.map(parseEpisodeNumber));

  return (
    maxEpisodeNumber ||
    Number(data.result?.series_item?.on_sale_count) ||
    Number(data.result?.total_count) ||
    fallbackCount
  );
}

async function refreshKakao(item) {
  if (item.serializationStatus === "completed") {
    return makeScheduleFields(item, [], "completed");
  }

  const seriesId = String(item.platformId);
  const html = await fetchText(`https://page.kakao.com/content/${seriesId}`);
  const content = parseKakaoNextData(html, seriesId);
  const latestEpisodeUpdatedAt = normalizeDate(content.lastSlideAddedDate);
  const isCompleted = item.serializationStatus === "completed" || content.onIssue === "End";

  if (isCompleted) {
    return makeScheduleFields(
      {
        ...item,
        latestEpisodeUpdatedAt: latestEpisodeUpdatedAt || item.latestEpisodeUpdatedAt
      },
      [],
      "completed"
    );
  }

  const updateWeekdays = splitKoreanWeekdays(content.pubPeriod);
  const episodeCount = await getKakaoEpisodeCount(seriesId, item.episodeCount);

  return makeScheduleFields(
    {
      ...item,
      episodeCount,
      serializationLabel: "연재중",
      latestEpisodeUpdatedAt: latestEpisodeUpdatedAt || item.latestEpisodeUpdatedAt
    },
    updateWeekdays,
    updateWeekdays.length ? "official" : "unknown"
  );
}

async function refreshFallback(item) {
  if (item.serializationStatus === "completed") {
    return makeScheduleFields(item, [], "completed");
  }

  return makeScheduleFields(item, item.updateWeekdays ?? [], "unknown");
}

async function refreshItem(item, naverWeekdayMap) {
  if (item.platform === "네이버웹툰" && item.platformId) {
    return refreshNaver(item, naverWeekdayMap);
  }

  if (item.platform === "카카오페이지" && item.platformId) {
    return refreshKakao(item);
  }

  return refreshFallback(item);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function renderWebtoonXml(item) {
  const inputTitleAttribute =
    item.inputTitle && item.inputTitle !== item.title
      ? ` inputTitle="${escapeXml(item.inputTitle)}"`
      : "";
  const latestEpisodeAttribute = item.latestEpisodeUpdatedAt
    ? ` latestEpisodeUpdatedAt="${escapeXml(item.latestEpisodeUpdatedAt)}"`
    : "";
  const platformIdNode = item.platformId
    ? `\n    <platformId>${escapeXml(item.platformId)}</platformId>`
    : "";
  const userRatingNode =
    item.userRating !== undefined
      ? `\n    <userRating>${item.userRating}</userRating>`
      : "";
  const noteNode = item.note
    ? `\n    <note>${escapeXml(item.note)}</note>`
    : "";

  return `  <webtoon id="${escapeXml(item.id)}"${inputTitleAttribute}>
    <title>${escapeXml(item.title)}</title>
    <author>${escapeXml(item.author)}</author>
    <platform>${escapeXml(item.platform)}</platform>${platformIdNode}
    <contentType>${escapeXml(item.contentType)}</contentType>
    <genres>
${item.genres.map((genre) => `      <genre>${escapeXml(genre)}</genre>`).join("\n")}
    </genres>
    <description>${escapeXml(item.description)}</description>
    <serialization status="${escapeXml(item.serializationStatus)}" label="${escapeXml(
      item.serializationLabel
    )}" episodeCount="${item.episodeCount}"${latestEpisodeAttribute}/>
    <updateSchedule label="${escapeXml(item.updateScheduleLabel)}" source="${escapeXml(
      item.updateScheduleSource
    )}">
${item.updateWeekdays.map((weekday) => `      <weekday>${escapeXml(weekday)}</weekday>`).join("\n")}
    </updateSchedule>
    <userReading status="${escapeXml(item.userReadingStatus)}" progress="${escapeXml(
      item.userProgress
    )}" group="${escapeXml(item.group)}"/>
    <coverImage>${escapeXml(item.coverImage)}</coverImage>
    <descriptionFile>${escapeXml(item.descriptionFile)}</descriptionFile>${userRatingNode}${noteNode}
  </webtoon>`;
}

function renderArchiveXml(archive) {
  return `<?xml version="1.0" encoding="utf-8"?>
<webtoons collectedAt="${escapeXml(archive.collectedAt)}" lastUpdatedAt="${escapeXml(
    archive.lastUpdatedAt
  )}" count="${archive.items.length}">
${archive.items.map(renderWebtoonXml).join("\n")}
</webtoons>
`;
}

function summarizeChanges(beforeItems, afterItems) {
  const changes = [];

  for (let index = 0; index < beforeItems.length; index += 1) {
    const before = beforeItems[index];
    const after = afterItems[index];
    const itemChanges = [];

    if (before.episodeCount !== after.episodeCount) {
      itemChanges.push(`화수 ${before.episodeCount} -> ${after.episodeCount}`);
    }

    if (
      JSON.stringify(before.updateWeekdays ?? []) !==
      JSON.stringify(after.updateWeekdays ?? [])
    ) {
      itemChanges.push(
        `요일 ${(before.updateWeekdays ?? []).join(", ") || "-"} -> ${
          after.updateWeekdays.join(", ") || "-"
        }`
      );
    }

    if (before.latestEpisodeUpdatedAt !== after.latestEpisodeUpdatedAt) {
      itemChanges.push(
        `최신일 ${before.latestEpisodeUpdatedAt ?? "-"} -> ${
          after.latestEpisodeUpdatedAt ?? "-"
        }`
      );
    }

    if (itemChanges.length > 0) {
      changes.push(`${after.id} ${after.title}: ${itemChanges.join(", ")}`);
    }
  }

  return changes;
}

async function main() {
  const archive = readJson(archiveJsonPath);
  const naverWeekdayMap = await getNaverWeekdayMap();
  const beforeItems = archive.items.map((item) => ({ ...item }));
  const refreshedItems = [];

  for (const item of archive.items) {
    try {
      const refreshedItem = await refreshItem(item, naverWeekdayMap);
      refreshedItems.push(refreshedItem);
      console.log(
        `${refreshedItem.id} ${refreshedItem.title}: ${refreshedItem.updateScheduleLabel} / ${refreshedItem.episodeCount}화`
      );
    } catch (error) {
      console.error(`${item.id} ${item.title}: ${error.message}`);
      refreshedItems.push(await refreshFallback(item));
    }
  }

  const nextArchive = {
    ...archive,
    lastUpdatedAt: getKstDate(),
    items: refreshedItems
  };
  const changes = summarizeChanges(beforeItems, refreshedItems);

  console.log(`변경 감지: ${changes.length}개`);
  changes.forEach((change) => console.log(`- ${change}`));

  if (dryRun) {
    console.log("dry-run 모드라 파일을 쓰지 않았습니다.");
    return;
  }

  writeFileSync(archiveJsonPath, `${JSON.stringify(nextArchive, null, 2)}\n`);
  writeFileSync(archiveXmlPath, renderArchiveXml(nextArchive));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

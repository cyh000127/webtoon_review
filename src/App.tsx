import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BookOpen,
  BookOpenCheck,
  BookmarkX,
  ChevronRight,
  Clock3,
  LayoutGrid,
  Library,
  List,
  Search,
  SlidersHorizontal,
  Star,
  X
} from "lucide-react";
import archive from "../webtoons/webtoons.json";
import type {
  ArchiveWebtoonRecord,
  SerializationStatus,
  UserReadingStatus,
  WebtoonArchive
} from "./types/webtoon";

type ReadingFilter = "all" | UserReadingStatus;
type RatingFilter = "all" | "rated" | "gte45" | "gte40";
type SortKey = "id" | "episode" | "title" | "creatorRating";
type ViewMode = "card" | "list";
type ReaderRatings = Record<string, number>;
type BarDatum = {
  id: string;
  label: string;
  value: number;
};

type WebtoonViewModel = ArchiveWebtoonRecord & {
  coverUrl: string;
};

const coverModules = import.meta.glob("../webtoons/covers/*.{jpg,png,svg}", {
  eager: true,
  import: "default",
  query: "?url"
}) as Record<string, string>;

const archiveData = archive as WebtoonArchive;
const archiveLastUpdatedAt = archiveData.lastUpdatedAt ?? archiveData.collectedAt;

const webtoons: WebtoonViewModel[] = archiveData.items.map((item) => ({
    ...item,
    coverUrl: coverModules[`../${item.coverImage}`] ?? item.coverImage
  }));

const serializationTabs: Array<{ id: SerializationStatus; label: string }> = [
  { id: "ongoing", label: "연재중" },
  { id: "completed", label: "완결" }
];

const readingTabs: Array<{ id: ReadingFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "reading", label: "읽는 중" },
  { id: "finished", label: "완주" },
  { id: "dropped", label: "중도 포기" }
];

const sortOptions: Array<{ id: SortKey; label: string }> = [
  { id: "id", label: "등록순" },
  { id: "creatorRating", label: "제작자 평점순" },
  { id: "episode", label: "화수순" },
  { id: "title", label: "가나다순" }
];

const ratingFilters: Array<{ id: RatingFilter; label: string }> = [
  { id: "all", label: "평점 전체" },
  { id: "rated", label: "평점 있음" },
  { id: "gte45", label: "4.5 이상" },
  { id: "gte40", label: "4.0 이상" }
];

const readerRatingStorageKey = "webtoon-review-reader-ratings-v1";
const readerRatingSteps = [1, 2, 3, 4, 5];

const platformMeta: Record<string, { shortLabel: string; color: string }> = {
  네이버웹툰: { shortLabel: "N", color: "#20c461" },
  카카오페이지: { shortLabel: "KP", color: "#ffd43b" },
  "네이버 시리즈": { shortLabel: "NS", color: "#42d392" },
  레진코믹스: { shortLabel: "L", color: "#eb445a" }
};

function getReadingTone(status: ReadingFilter) {
  return status === "all" ? "all" : status;
}

function getReadingLabel(status: UserReadingStatus) {
  return readingTabs.find((tab) => tab.id === status)?.label ?? status;
}

function getSerializationLabel(status: SerializationStatus) {
  return status === "ongoing" ? "연재중" : "완결";
}

function formatProgress(progress: string, episodeCount: number) {
  const match = progress.match(/(\d+)\s*(화|편)/);

  if (match) {
    return `${Number(match[1])}화`;
  }

  return Number.isFinite(episodeCount) ? `${episodeCount}화` : progress;
}

function parseArchiveDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatArchiveDate(dateString: string) {
  const date = parseArchiveDate(dateString);

  if (!date) {
    return dateString;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getUpdateDistanceLabel(dateString: string) {
  const updateDate = parseArchiveDate(dateString);

  if (!updateDate) {
    return "계산 불가";
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const diffDays = Math.floor(
    (todayStart.getTime() - updateDate.getTime()) / 86_400_000
  );

  if (diffDays === 0) {
    return "오늘 업데이트";
  }

  if (diffDays > 0) {
    return `${diffDays}일 전`;
  }

  return `${Math.abs(diffDays)}일 후`;
}

function getReadingIcon(status: ReadingFilter) {
  if (status === "reading") {
    return BookOpen;
  }

  if (status === "finished") {
    return BookOpenCheck;
  }

  if (status === "dropped") {
    return BookmarkX;
  }

  return Library;
}

function compareBySort(a: WebtoonViewModel, b: WebtoonViewModel, sortBy: SortKey) {
  if (sortBy === "creatorRating") {
    const ratingDiff = (b.userRating ?? -1) - (a.userRating ?? -1);

    if (ratingDiff !== 0) {
      return ratingDiff;
    }

    return Number(a.id) - Number(b.id);
  }

  if (sortBy === "episode") {
    return (b.episodeCount ?? 0) - (a.episodeCount ?? 0);
  }

  if (sortBy === "title") {
    return a.title.localeCompare(b.title, "ko");
  }

  return Number(a.id) - Number(b.id);
}

function getPlatformStyle(platform: string): CSSProperties {
  return {
    "--platform-color": platformMeta[platform]?.color ?? "#9aa4b2"
  } as CSSProperties;
}

function getPlatformShortLabel(platform: string) {
  return platformMeta[platform]?.shortLabel ?? "etc";
}

function getCardCopy(webtoon: WebtoonViewModel) {
  return webtoon.description;
}

function matchesRatingFilter(webtoon: WebtoonViewModel, filter: RatingFilter) {
  if (filter === "rated") {
    return typeof webtoon.userRating === "number";
  }

  if (filter === "gte45") {
    return (webtoon.userRating ?? 0) >= 4.5;
  }

  if (filter === "gte40") {
    return (webtoon.userRating ?? 0) >= 4;
  }

  return true;
}

function readReaderRatings(): ReaderRatings {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(readerRatingStorageKey);

    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as ReaderRatings;

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, rating]) =>
          typeof rating === "number" &&
          Number.isFinite(rating) &&
          rating >= 1 &&
          rating <= 5
      )
    );
  } catch {
    return {};
  }
}

function getBarStyle(value: number, maxValue: number): CSSProperties {
  return {
    "--bar-size": `${maxValue > 0 ? (value / maxValue) * 100 : 0}%`
  } as CSSProperties;
}

function formatAverageScore(score: number) {
  return score > 0 ? score.toFixed(1) : "미평가";
}

function ScorePills({
  webtoon,
  readerRating
}: {
  webtoon: WebtoonViewModel;
  readerRating?: number;
}) {
  return (
    <div className="score-row">
      {webtoon.userRating && (
        <div
          className="rating-row creator-rating"
          aria-label={`제작자 점수 ${webtoon.userRating}점`}
        >
          <span>제작자</span>
          <Star size={15} fill="currentColor" aria-hidden="true" />
          <strong>{webtoon.userRating.toFixed(1)}</strong>
        </div>
      )}

      <div
        className={`rating-row reader-rating ${readerRating ? "" : "empty"}`}
        aria-label={
          readerRating ? `독자 점수 ${readerRating}점` : "독자 점수 미평가"
        }
      >
        <span>독자</span>
        <Star
          size={15}
          fill={readerRating ? "currentColor" : "none"}
          aria-hidden="true"
        />
        <strong>{readerRating ? readerRating.toFixed(1) : "미평가"}</strong>
      </div>
    </div>
  );
}

function App() {
  const [serialization, setSerialization] =
    useState<SerializationStatus>("ongoing");
  const [reading, setReading] = useState<ReadingFilter>("all");
  const [platform, setPlatform] = useState<string>("전체");
  const [genre, setGenre] = useState<string>("전체");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("id");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readerRatings, setReaderRatings] =
    useState<ReaderRatings>(() => readReaderRatings());

  useEffect(() => {
    try {
      window.localStorage.setItem(
        readerRatingStorageKey,
        JSON.stringify(readerRatings)
      );
    } catch {
      // 저장소 접근이 막힌 브라우저에서도 화면은 계속 사용할 수 있게 둔다.
    }
  }, [readerRatings]);

  const saveReaderRating = (webtoonId: string, rating: number) => {
    setReaderRatings((currentRatings) => ({
      ...currentRatings,
      [webtoonId]: rating
    }));
  };

  const creatorRatingSummary = useMemo(() => {
    const ratings = webtoons
      .map((item) => item.userRating)
      .filter((rating): rating is number => typeof rating === "number");
    const total = ratings.reduce((sum, rating) => sum + rating, 0);

    return {
      average: ratings.length > 0 ? total / ratings.length : 0,
      count: ratings.length
    };
  }, []);

  const archiveStats = useMemo(() => {
    const statusBars = readingTabs
      .filter((tab) => tab.id !== "all")
      .map<BarDatum>((tab) => ({
        id: tab.id,
        label: tab.label,
        value: webtoons.filter((item) => item.userReadingStatus === tab.id).length
      }));

    const genreCounts = new Map<string, number>();
    webtoons.forEach((item) => {
      item.genres.forEach((itemGenre) => {
        genreCounts.set(itemGenre, (genreCounts.get(itemGenre) ?? 0) + 1);
      });
    });

    const genreBars = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
      .slice(0, 5)
      .map<BarDatum>(([label, value]) => ({
        id: label,
        label,
        value
      }));

    const ratingBars: BarDatum[] = [
      {
        id: "excellent",
        label: "4.5 이상",
        value: webtoons.filter((item) => (item.userRating ?? 0) >= 4.5).length
      },
      {
        id: "great",
        label: "4.0 이상",
        value: webtoons.filter(
          (item) => (item.userRating ?? 0) >= 4 && (item.userRating ?? 0) < 4.5
        ).length
      },
      {
        id: "good",
        label: "3점대",
        value: webtoons.filter(
          (item) => (item.userRating ?? 0) >= 3 && (item.userRating ?? 0) < 4
        ).length
      },
      {
        id: "unrated",
        label: "미기록",
        value: webtoons.filter((item) => typeof item.userRating !== "number").length
      }
    ];

    const readerRatingValues = Object.values(readerRatings).filter(
      (rating) => rating >= 1 && rating <= 5
    );
    const readerRatingTotal = readerRatingValues.reduce(
      (total, rating) => total + rating,
      0
    );
    const finishedCount = webtoons.filter(
      (item) => item.userReadingStatus === "finished"
    ).length;

    return {
      statusBars,
      statusMax: Math.max(1, ...statusBars.map((bar) => bar.value)),
      genreBars,
      genreMax: Math.max(1, ...genreBars.map((bar) => bar.value)),
      ratingBars,
      ratingMax: Math.max(1, ...ratingBars.map((bar) => bar.value)),
      readerAverage:
        readerRatingValues.length > 0
          ? readerRatingTotal / readerRatingValues.length
          : 0,
      readerCount: readerRatingValues.length,
      finishedRate: Math.round((finishedCount / webtoons.length) * 100)
    };
  }, [readerRatings]);

  const serializationScoped = useMemo(() => {
    return webtoons.filter((item) => item.serializationStatus === serialization);
  }, [serialization]);

  const visiblePlatforms = useMemo(() => {
    const nextPlatforms = new Set(serializationScoped.map((item) => item.platform));
    return ["전체", ...Array.from(nextPlatforms).sort((a, b) => a.localeCompare(b, "ko"))];
  }, [serializationScoped]);

  const visibleGenres = useMemo(() => {
    const nextGenres = new Set<string>();
    serializationScoped.forEach((item) => {
      item.genres.forEach((itemGenre) => nextGenres.add(itemGenre));
    });

    return ["전체", ...Array.from(nextGenres).sort((a, b) => a.localeCompare(b, "ko"))];
  }, [serializationScoped]);

  const readingCounts = useMemo(() => {
    return serializationScoped.reduce<Record<ReadingFilter, number>>(
      (counts, item) => {
        counts.all += 1;
        counts[item.userReadingStatus] += 1;
        return counts;
      },
      { all: 0, reading: 0, finished: 0, dropped: 0 }
    );
  }, [serializationScoped]);

  const visibleReadingTabs = readingTabs.filter(
    (tab) => tab.id === "all" || readingCounts[tab.id] > 0
  );

  const visibleWebtoons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return serializationScoped
      .filter((item) => reading === "all" || item.userReadingStatus === reading)
      .filter((item) => platform === "전체" || item.platform === platform)
      .filter((item) => genre === "전체" || item.genres.includes(genre))
      .filter((item) => matchesRatingFilter(item, ratingFilter))
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        const joined = [
          item.title,
          item.inputTitle,
          item.author,
          item.platform,
          item.contentType,
          item.userProgress,
          item.serializationLabel,
          item.description,
          item.note,
          ...item.genres
        ]
          .join(" ")
          .toLowerCase();

        return joined.includes(normalizedQuery);
      })
      .sort((a, b) => compareBySort(a, b, sortBy));
  }, [genre, platform, query, ratingFilter, reading, serializationScoped, sortBy]);

  const serializationCounts = useMemo(() => {
    return serializationTabs.reduce<Record<SerializationStatus, number>>(
      (counts, tab) => {
        counts[tab.id] = webtoons.filter(
          (item) => item.serializationStatus === tab.id
        ).length;
        return counts;
      },
      { ongoing: 0, completed: 0 }
    );
  }, []);

  const selectedWebtoon = selectedId
    ? webtoons.find((item) => item.id === selectedId)
    : null;
  const selectedReaderRating = selectedWebtoon
    ? readerRatings[selectedWebtoon.id]
    : undefined;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">WEBTOON ARCHIVE</p>
          <h1>내 웹툰 기록</h1>
        </div>
        <div className="header-stats" aria-label="현재 아카이브 요약">
          <span>{webtoons.length}개 작품</span>
          <span>
            제작자 평균 {creatorRatingSummary.average.toFixed(1)} /{" "}
            {creatorRatingSummary.count}개
          </span>
          <span>{archiveLastUpdatedAt} 업데이트</span>
        </div>
      </header>

      <nav className="serialization-tabs" aria-label="작품 연재 상태">
        {serializationTabs.map((tab) => (
          <button
            key={tab.id}
            className={serialization === tab.id ? "active" : ""}
            type="button"
            onClick={() => {
              setSerialization(tab.id);
              setReading("all");
              setPlatform("전체");
              setGenre("전체");
              setRatingFilter("all");
            }}
          >
            <span>{tab.label}</span>
            <strong>{serializationCounts[tab.id]}</strong>
          </button>
        ))}
      </nav>

      <section className="controls" aria-label="목록 필터">
        <div className="reading-row">
          <div className="reading-tabs" aria-label="나의 감상 상태">
            {visibleReadingTabs.map((tab) => {
              const Icon = getReadingIcon(tab.id);

              return (
                <button
                  key={tab.id}
                  className={`${reading === tab.id ? "active" : ""} ${getReadingTone(tab.id)}`}
                  type="button"
                  onClick={() => setReading(tab.id)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{tab.label}</span>
                  <strong>{readingCounts[tab.id]}</strong>
                </button>
              );
            })}
          </div>

          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목, 작가, 장르 검색"
            />
            {query && (
              <button
                className="clear-search"
                type="button"
                title="검색어 지우기"
                aria-label="검색어 지우기"
                onClick={() => setQuery("")}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </label>

          <label className="sort-field">
            <SlidersHorizontal size={18} aria-hidden="true" />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortKey)}
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="platform-row" aria-label="플랫폼 필터">
          {visiblePlatforms.map((platformName) => (
            <button
              key={platformName}
              className={platform === platformName ? "platform-button active" : "platform-button"}
              style={getPlatformStyle(platformName)}
              title={platformName}
              type="button"
              onClick={() => setPlatform(platformName)}
            >
              {platformName === "전체" ? "전체" : getPlatformShortLabel(platformName)}
            </button>
          ))}
        </div>

        <div className="genre-row" aria-label="장르 필터">
          {visibleGenres.map((genreName) => (
            <button
              key={genreName}
              className={genre === genreName ? "active" : ""}
              type="button"
              onClick={() => setGenre(genreName)}
            >
              {genreName}
            </button>
          ))}
        </div>

        <div className="rating-filter-row" aria-label="제작자 평점 필터">
          {ratingFilters.map((filter) => (
            <button
              key={filter.id}
              className={ratingFilter === filter.id ? "active" : ""}
              type="button"
              onClick={() => setRatingFilter(filter.id)}
            >
              <Star size={15} fill="currentColor" aria-hidden="true" />
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="result-bar" aria-label="현재 선택">
        <div className="result-filter-summary">
          <strong>{getSerializationLabel(serialization)}</strong>
          <span>{readingTabs.find((tab) => tab.id === reading)?.label}</span>
          <span>{platform}</span>
          <span>{genre}</span>
          <span>{ratingFilters.find((filter) => filter.id === ratingFilter)?.label}</span>
          <span>{sortOptions.find((option) => option.id === sortBy)?.label}</span>
        </div>
        <div className="result-actions">
          <p>{visibleWebtoons.length}개 기록</p>
          <div className="view-toggle" aria-label="목록 보기 방식">
            <button
              className={viewMode === "card" ? "active" : ""}
              type="button"
              title="카드 보기"
              aria-label="카드 보기"
              onClick={() => setViewMode("card")}
            >
              <LayoutGrid size={17} aria-hidden="true" />
            </button>
            <button
              className={viewMode === "list" ? "active" : ""}
              type="button"
              title="목록 보기"
              aria-label="목록 보기"
              onClick={() => setViewMode("list")}
            >
              <List size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <section className="stats-dashboard" aria-label="통계 대시보드">
        <div className="metric-strip">
          <div>
            <span>제작자 평균</span>
            <strong>{formatAverageScore(creatorRatingSummary.average)}</strong>
            <small>{creatorRatingSummary.count}개 기록</small>
          </div>
          <div>
            <span>독자 평균</span>
            <strong>{formatAverageScore(archiveStats.readerAverage)}</strong>
            <small>{archiveStats.readerCount}개 평가</small>
          </div>
          <div>
            <span>완주율</span>
            <strong>{archiveStats.finishedRate}%</strong>
            <small>전체 {webtoons.length}개 기준</small>
          </div>
        </div>

        <div className="chart-grid">
          <article className="chart-panel">
            <h2>감상 상태</h2>
            <div className="bar-list">
              {archiveStats.statusBars.map((bar) => (
                <div className="bar-row" key={bar.id}>
                  <span>{bar.label}</span>
                  <div className={`bar-track ${bar.id}`}>
                    <i style={getBarStyle(bar.value, archiveStats.statusMax)} />
                  </div>
                  <strong>{bar.value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="chart-panel">
            <h2>장르 TOP 5</h2>
            <div className="bar-list">
              {archiveStats.genreBars.map((bar) => (
                <div className="bar-row" key={bar.id}>
                  <span>{bar.label}</span>
                  <div className="bar-track genre">
                    <i style={getBarStyle(bar.value, archiveStats.genreMax)} />
                  </div>
                  <strong>{bar.value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="chart-panel">
            <h2>제작자 평점 분포</h2>
            <div className="bar-list">
              {archiveStats.ratingBars.map((bar) => (
                <div className="bar-row" key={bar.id}>
                  <span>{bar.label}</span>
                  <div className={`bar-track rating-${bar.id}`}>
                    <i style={getBarStyle(bar.value, archiveStats.ratingMax)} />
                  </div>
                  <strong>{bar.value}</strong>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      {visibleWebtoons.length > 0 && viewMode === "card" ? (
        <section className="webtoon-grid" aria-label="웹툰 목록">
          {visibleWebtoons.map((webtoon) => (
            <article className="webtoon-card" key={webtoon.id}>
              <div className="cover-frame">
                <img src={webtoon.coverUrl} alt={`${webtoon.title} 표지`} />
                <span
                  className="platform-badge"
                  style={getPlatformStyle(webtoon.platform)}
                >
                  {getPlatformShortLabel(webtoon.platform)}
                </span>
                <span className={`reading-badge ${webtoon.userReadingStatus}`}>
                  {getReadingLabel(webtoon.userReadingStatus)}
                </span>
              </div>

              <div className="card-body">
                <div className="title-row">
                  <h2 title={webtoon.title}>{webtoon.title}</h2>
                  <span className="id-badge">#{webtoon.id}</span>
                </div>

                <div className="meta-row">
                  <span>{webtoon.platform}</span>
                  <span>{webtoon.author}</span>
                </div>

                <div className="progress-row">
                  <span>
                    <Clock3 size={15} aria-hidden="true" />
                    {formatProgress(webtoon.userProgress, webtoon.episodeCount)}
                  </span>
                  <span>{webtoon.episodeCount}화</span>
                </div>

                <ScorePills
                  webtoon={webtoon}
                  readerRating={readerRatings[webtoon.id]}
                />

                <p className="description-copy">{getCardCopy(webtoon)}</p>

                <div className="tag-row">
                  {webtoon.genres.slice(0, 4).map((itemGenre) => (
                    <span key={itemGenre}>{itemGenre}</span>
                  ))}
                </div>

                <button
                  className="detail-button"
                  type="button"
                  onClick={() => setSelectedId(webtoon.id)}
                >
                  <span>상세</span>
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : visibleWebtoons.length > 0 ? (
        <section className="webtoon-list" aria-label="웹툰 목록">
          {visibleWebtoons.map((webtoon) => (
            <article className="webtoon-list-item" key={webtoon.id}>
              <img
                className="list-cover"
                src={webtoon.coverUrl}
                alt={`${webtoon.title} 표지`}
              />

              <div className="list-main">
                <div className="title-row">
                  <h2 title={webtoon.title}>{webtoon.title}</h2>
                  <span className={`list-status ${webtoon.userReadingStatus}`}>
                    {getReadingLabel(webtoon.userReadingStatus)}
                  </span>
                </div>

                <div className="meta-row list-meta">
                  <span>{webtoon.platform}</span>
                  <span>{webtoon.author}</span>
                  <span>{webtoon.episodeCount}화</span>
                </div>

                <p className="list-copy">{getCardCopy(webtoon)}</p>

                <div className="tag-row list-tags">
                  {webtoon.genres.slice(0, 5).map((itemGenre) => (
                    <span key={itemGenre}>{itemGenre}</span>
                  ))}
                </div>
              </div>

              <div className="list-side">
                <ScorePills
                  webtoon={webtoon}
                  readerRating={readerRatings[webtoon.id]}
                />
                <div className="progress-row list-progress">
                  <span>
                    <Clock3 size={15} aria-hidden="true" />
                    {formatProgress(webtoon.userProgress, webtoon.episodeCount)}
                  </span>
                </div>
                <button
                  className="detail-button"
                  type="button"
                  onClick={() => setSelectedId(webtoon.id)}
                >
                  <span>상세</span>
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state" aria-label="빈 목록">
          <p>조건에 맞는 기록이 없습니다.</p>
        </section>
      )}

      {selectedWebtoon && (
        <aside className="detail-panel" aria-label="웹툰 상세 정보">
          <div className="detail-backdrop" onClick={() => setSelectedId(null)} />
          <div className="detail-sheet">
            <button
              className="detail-close"
              type="button"
              title="닫기"
              aria-label="닫기"
              onClick={() => setSelectedId(null)}
            >
              <X size={20} aria-hidden="true" />
            </button>

            <img
              className="detail-cover"
              src={selectedWebtoon.coverUrl}
              alt={`${selectedWebtoon.title} 표지`}
            />

            <div className="detail-content">
              <div className="detail-heading">
                <p>{selectedWebtoon.platform}</p>
                <h2>{selectedWebtoon.title}</h2>
              </div>

              <dl className="detail-list">
                <div>
                  <dt>작가</dt>
                  <dd>{selectedWebtoon.author}</dd>
                </div>
                <div>
                  <dt>연재 상태</dt>
                  <dd>{selectedWebtoon.serializationLabel}</dd>
                </div>
                <div>
                  <dt>감상 상태</dt>
                  <dd>{getReadingLabel(selectedWebtoon.userReadingStatus)}</dd>
                </div>
                <div>
                  <dt>진도</dt>
                  <dd>
                    {formatProgress(
                      selectedWebtoon.userProgress,
                      selectedWebtoon.episodeCount
                    )}
                  </dd>
                </div>
                <div>
                  <dt>최신 업데이트</dt>
                  <dd>{formatArchiveDate(archiveLastUpdatedAt)}</dd>
                </div>
                <div>
                  <dt>오늘 기준</dt>
                  <dd>{getUpdateDistanceLabel(archiveLastUpdatedAt)}</dd>
                </div>
              </dl>

              <p className="detail-description">{selectedWebtoon.description}</p>

              <section className="reader-rating-panel" aria-label="독자 평점">
                <div className="reader-rating-heading">
                  <strong>독자 점수</strong>
                  <span>
                    {selectedReaderRating
                      ? `${selectedReaderRating.toFixed(1)}점`
                      : "미평가"}
                  </span>
                </div>
                <div className="reader-rating-buttons">
                  {readerRatingSteps.map((rating) => (
                    <button
                      key={rating}
                      className={selectedReaderRating === rating ? "active" : ""}
                      type="button"
                      aria-label={`독자 점수 ${rating}점`}
                      onClick={() => saveReaderRating(selectedWebtoon.id, rating)}
                    >
                      <Star
                        size={18}
                        fill={
                          selectedReaderRating && selectedReaderRating >= rating
                            ? "currentColor"
                            : "none"
                        }
                        aria-hidden="true"
                      />
                      <span>{rating}</span>
                    </button>
                  ))}
                </div>
              </section>

              {selectedWebtoon.userReadingStatus === "dropped" &&
                selectedWebtoon.dropReason && (
                  <section className="detail-drop" aria-label="중도 포기 사유">
                    <strong>중도 포기 사유</strong>
                    <p>{selectedWebtoon.dropReason}</p>
                  </section>
                )}

              <div className="detail-tags">
                {selectedWebtoon.genres.map((itemGenre) => (
                  <span key={itemGenre}>{itemGenre}</span>
                ))}
              </div>

              {selectedWebtoon.note && (
                <p className="detail-note">{selectedWebtoon.note}</p>
              )}
            </div>
          </div>
        </aside>
      )}
    </main>
  );
}

export default App;

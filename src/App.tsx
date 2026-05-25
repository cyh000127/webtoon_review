import { useMemo, useState, type CSSProperties } from "react";
import {
  BookOpenCheck,
  BookmarkX,
  Heart,
  Search,
  SlidersHorizontal,
  Star,
  X
} from "lucide-react";
import rawWebtoons from "./data/webtoons.json";
import type {
  PlatformId,
  ReadingStatus,
  SerializationStatus,
  WebtoonRecord
} from "./types/webtoon";

type SortKey = "updated" | "rating" | "title";

const webtoons = rawWebtoons as WebtoonRecord[];

const serializationTabs: Array<{ id: SerializationStatus; label: string }> = [
  { id: "ongoing", label: "연재중" },
  { id: "completed", label: "완결" }
];

const readingTabs: Array<{ id: ReadingStatus; label: string }> = [
  { id: "finished", label: "완주" },
  { id: "dropped", label: "중도 포기" }
];

const platformMeta: Record<
  PlatformId,
  { label: string; shortLabel: string; color: string }
> = {
  naver: { label: "네이버", shortLabel: "N", color: "#20c461" },
  kakao: { label: "카카오", shortLabel: "K", color: "#ffd43b" },
  "kakao-page": { label: "카카오페이지", shortLabel: "KP", color: "#f5c400" },
  ridibooks: { label: "리디", shortLabel: "R", color: "#1f7aff" },
  lezhin: { label: "레진", shortLabel: "L", color: "#eb445a" },
  bomtoon: { label: "봄툰", shortLabel: "B", color: "#ff4cc9" },
  peanutoon: { label: "피너툰", shortLabel: "P", color: "#f68b30" },
  other: { label: "기타", shortLabel: "etc", color: "#7f8792" }
};

const sortOptions: Array<{ id: SortKey; label: string }> = [
  { id: "updated", label: "최신순" },
  { id: "rating", label: "별점순" },
  { id: "title", label: "가나다순" }
];

const allPlatforms = Object.keys(platformMeta) as PlatformId[];

function formatDate(date: string) {
  return date.split("-").join(".");
}

function getStatusLabel(status: SerializationStatus) {
  return status === "ongoing" ? "연재중" : "완결";
}

function getReadingLabel(status: ReadingStatus) {
  return status === "finished" ? "완주" : "중도 포기";
}

function getReviewText(webtoon: WebtoonRecord) {
  return webtoon.readingStatus === "finished"
    ? webtoon.review
    : webtoon.dropReason;
}

function compareBySort(a: WebtoonRecord, b: WebtoonRecord, sortBy: SortKey) {
  if (sortBy === "rating") {
    return (b.rating ?? 0) - (a.rating ?? 0);
  }

  if (sortBy === "title") {
    return a.title.localeCompare(b.title, "ko");
  }

  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function App() {
  const [serialization, setSerialization] =
    useState<SerializationStatus>("ongoing");
  const [reading, setReading] = useState<ReadingStatus>("finished");
  const [platform, setPlatform] = useState<PlatformId | "all">("all");
  const [genre, setGenre] = useState<string>("전체");
  const [sortBy, setSortBy] = useState<SortKey>("updated");
  const [query, setQuery] = useState("");

  const visibleGenres = useMemo(() => {
    const nextGenres = new Set<string>();
    webtoons
      .filter((item) => item.serializationStatus === serialization)
      .forEach((item) => item.genres.forEach((itemGenre) => nextGenres.add(itemGenre)));

    return ["전체", ...Array.from(nextGenres).sort((a, b) => a.localeCompare(b, "ko"))];
  }, [serialization]);

  const visibleWebtoons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return webtoons
      .filter((item) => item.serializationStatus === serialization)
      .filter((item) => item.readingStatus === reading)
      .filter((item) => platform === "all" || item.platform === platform)
      .filter((item) => genre === "전체" || item.genres.includes(genre))
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        const joined = [
          item.title,
          item.author,
          item.platform,
          item.episodeProgress,
          item.review,
          item.dropReason,
          ...(item.tags ?? []),
          ...item.genres
        ]
          .join(" ")
          .toLowerCase();

        return joined.includes(normalizedQuery);
      })
      .sort((a, b) => compareBySort(a, b, sortBy));
  }, [genre, platform, query, reading, serialization, sortBy]);

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

  const readingCounts = useMemo(() => {
    return readingTabs.reduce<Record<ReadingStatus, number>>(
      (counts, tab) => {
        counts[tab.id] = webtoons.filter(
          (item) =>
            item.serializationStatus === serialization &&
            item.readingStatus === tab.id
        ).length;
        return counts;
      },
      { finished: 0, dropped: 0 }
    );
  }, [serialization]);

  const favoriteCount = visibleWebtoons.filter((item) => item.isFavorite).length;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">WEBTOON REVIEW</p>
          <h1>내 웹툰 기록</h1>
        </div>
        <div className="header-stats" aria-label="현재 목록 요약">
          <span>{visibleWebtoons.length}개</span>
          <span>{favoriteCount}개 즐겨찾기</span>
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
              setGenre("전체");
            }}
          >
            <span>{tab.label}</span>
            <strong>{serializationCounts[tab.id]}</strong>
          </button>
        ))}
      </nav>

      <section className="controls" aria-label="목록 필터">
        <div className="reading-row">
          <div className="reading-tabs" aria-label="나의 독서 상태">
            {readingTabs.map((tab) => {
              const Icon = tab.id === "finished" ? BookOpenCheck : BookmarkX;

              return (
                <button
                  key={tab.id}
                  className={reading === tab.id ? "active" : ""}
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
              placeholder="제목, 작가, 태그 검색"
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
          <button
            className={platform === "all" ? "platform-all active" : "platform-all"}
            type="button"
            onClick={() => setPlatform("all")}
          >
            전체
          </button>
          {allPlatforms.map((platformId) => (
            <button
              key={platformId}
              className={platform === platformId ? "platform-button active" : "platform-button"}
              style={{ "--platform-color": platformMeta[platformId].color } as CSSProperties}
              title={platformMeta[platformId].label}
              type="button"
              onClick={() => setPlatform(platformId)}
            >
              {platformMeta[platformId].shortLabel}
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
      </section>

      <section className="result-bar" aria-label="현재 선택">
        <div>
          <strong>{getStatusLabel(serialization)}</strong>
          <span>{getReadingLabel(reading)}</span>
          <span>{sortOptions.find((option) => option.id === sortBy)?.label}</span>
        </div>
        <p>{visibleWebtoons.length}개 기록</p>
      </section>

      {visibleWebtoons.length > 0 ? (
        <section className="webtoon-grid" aria-label="웹툰 목록">
          {visibleWebtoons.map((webtoon) => (
            <article className="webtoon-card" key={webtoon.id}>
              <div className="cover-frame">
                <img src={webtoon.coverImage} alt={`${webtoon.title} 표지`} />
                <span
                  className="platform-badge"
                  style={
                    {
                      "--platform-color": platformMeta[webtoon.platform].color
                    } as CSSProperties
                  }
                >
                  {platformMeta[webtoon.platform].shortLabel}
                </span>
                <span className={`reading-badge ${webtoon.readingStatus}`}>
                  {getReadingLabel(webtoon.readingStatus)}
                </span>
                <div className="cover-genres">
                  {webtoon.genres.slice(0, 2).map((itemGenre) => (
                    <span key={itemGenre}>{itemGenre}</span>
                  ))}
                </div>
              </div>

              <div className="card-body">
                <div className="title-row">
                  <h2>{webtoon.title}</h2>
                  {webtoon.isFavorite && (
                    <span className="favorite" title="즐겨찾기">
                      <Heart size={16} fill="currentColor" aria-hidden="true" />
                    </span>
                  )}
                </div>

                <div className="meta-row">
                  <span>{webtoon.episodeProgress}</span>
                  <span>{webtoon.author}</span>
                </div>

                <div className="score-row">
                  <span className="stars" aria-label={`별점 ${webtoon.rating ?? 0}점`}>
                    <Star size={16} fill="currentColor" aria-hidden="true" />
                    {webtoon.rating?.toFixed(1) ?? "미기록"}
                  </span>
                  <span>{formatDate(webtoon.updatedAt)}</span>
                </div>

                <p className="review-copy">{getReviewText(webtoon)}</p>

                <div className="tag-row">
                  {(webtoon.tags ?? []).slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state" aria-label="빈 목록">
          <p>조건에 맞는 기록이 없습니다.</p>
        </section>
      )}
    </main>
  );
}

export default App;

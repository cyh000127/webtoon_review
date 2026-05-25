import { useMemo, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  BookOpen,
  BookOpenCheck,
  BookmarkX,
  ChevronRight,
  Clock3,
  Library,
  Search,
  SlidersHorizontal,
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
type SortKey = "id" | "episode" | "title";

type WebtoonViewModel = ArchiveWebtoonRecord & {
  coverUrl: string;
};

const coverModules = import.meta.glob("../webtoons/covers/*.{jpg,png}", {
  eager: true,
  import: "default",
  query: "?url"
}) as Record<string, string>;

const webtoons: WebtoonViewModel[] = (archive as WebtoonArchive).items.map(
  (item) => ({
    ...item,
    coverUrl: coverModules[`../${item.coverImage}`] ?? item.coverImage
  })
);

const serializationTabs: Array<{ id: SerializationStatus; label: string }> = [
  { id: "ongoing", label: "연재중" },
  { id: "completed", label: "완결" }
];

const readingTabs: Array<{ id: ReadingFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "reading", label: "읽는 중" },
  { id: "finished", label: "완주" },
  { id: "dropped", label: "중도 포기" },
  { id: "ambiguous", label: "확인 필요" }
];

const sortOptions: Array<{ id: SortKey; label: string }> = [
  { id: "id", label: "등록순" },
  { id: "episode", label: "화수순" },
  { id: "title", label: "가나다순" }
];

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

  if (status === "ambiguous") {
    return AlertCircle;
  }

  return Library;
}

function compareBySort(a: WebtoonViewModel, b: WebtoonViewModel, sortBy: SortKey) {
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

function App() {
  const [serialization, setSerialization] =
    useState<SerializationStatus>("ongoing");
  const [reading, setReading] = useState<ReadingFilter>("all");
  const [platform, setPlatform] = useState<string>("전체");
  const [genre, setGenre] = useState<string>("전체");
  const [sortBy, setSortBy] = useState<SortKey>("id");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      { all: 0, reading: 0, finished: 0, dropped: 0, ambiguous: 0 }
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
  }, [genre, platform, query, reading, serializationScoped, sortBy]);

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

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">WEBTOON ARCHIVE</p>
          <h1>내 웹툰 기록</h1>
        </div>
        <div className="header-stats" aria-label="현재 아카이브 요약">
          <span>{webtoons.length}개 작품</span>
          <span>{archive.collectedAt} 기준</span>
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
      </section>

      <section className="result-bar" aria-label="현재 선택">
        <div>
          <strong>{getSerializationLabel(serialization)}</strong>
          <span>{readingTabs.find((tab) => tab.id === reading)?.label}</span>
          <span>{platform}</span>
          <span>{genre}</span>
          <span>{sortOptions.find((option) => option.id === sortBy)?.label}</span>
        </div>
        <p>{visibleWebtoons.length}개 기록</p>
      </section>

      {visibleWebtoons.length > 0 ? (
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
                    {webtoon.userProgress}
                  </span>
                  <span>{webtoon.episodeCount}화</span>
                </div>

                <p className="review-copy">{webtoon.description}</p>

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
                  <dd>{selectedWebtoon.userProgress}</dd>
                </div>
              </dl>

              <p className="detail-description">{selectedWebtoon.description}</p>

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

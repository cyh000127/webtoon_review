export type ReadingStatus = "reading" | "completed" | "dropped";

export type PendingWebtoonQueueEntry = {
  id: string;
  title: string;
  rating: number;
  readProgress: string;
  readingStatus: ReadingStatus;
  createdAt: string;
  updatedAt?: string;
  source: "mobile-queue-app";
  status: "pending";
};

function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

export function formatLocalIso(date: Date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffset / 60);
  const offsetRemainder = absoluteOffset % 60;

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}.${pad(date.getMilliseconds(), 3)}${sign}${pad(offsetHours)}:${pad(
    offsetRemainder
  )}`;
}

export function createQueueEntry({
  rating,
  readProgress,
  readingStatus,
  title
}: {
  rating: number;
  readProgress: string;
  readingStatus: ReadingStatus;
  title: string;
}): PendingWebtoonQueueEntry {
  const now = new Date();
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds()
  )}`;

  return {
    id: `wq_${datePart}_${timePart}`,
    title: title.trim(),
    rating,
    readProgress: readProgress.trim(),
    readingStatus,
    createdAt: formatLocalIso(now),
    source: "mobile-queue-app",
    status: "pending"
  };
}

export function updateQueueEntry(
  current: PendingWebtoonQueueEntry,
  {
    rating,
    readProgress,
    readingStatus,
    title
  }: {
    rating: number;
    readProgress: string;
    readingStatus: ReadingStatus;
    title: string;
  }
): PendingWebtoonQueueEntry {
  return {
    ...current,
    title: title.trim(),
    rating,
    readProgress: readProgress.trim(),
    readingStatus,
    updatedAt: formatLocalIso(new Date())
  };
}

export function normalizeQueueEntry(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<PendingWebtoonQueueEntry>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.rating !== "number" ||
    typeof candidate.createdAt !== "string" ||
    candidate.source !== "mobile-queue-app" ||
    candidate.status !== "pending"
  ) {
    return null;
  }

  const readingStatus: ReadingStatus =
    candidate.readingStatus === "completed" ||
    candidate.readingStatus === "dropped" ||
    candidate.readingStatus === "reading"
      ? candidate.readingStatus
      : "reading";

  return {
    id: candidate.id,
    title: candidate.title,
    rating: candidate.rating,
    readProgress:
      typeof candidate.readProgress === "string" ? candidate.readProgress : "",
    readingStatus,
    createdAt: candidate.createdAt,
    ...(typeof candidate.updatedAt === "string"
      ? { updatedAt: candidate.updatedAt }
      : {}),
    source: "mobile-queue-app" as const,
    status: "pending" as const
  };
}

export function serializeQueueEntry(entry: PendingWebtoonQueueEntry) {
  return JSON.stringify(entry);
}

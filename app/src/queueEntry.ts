export type PendingWebtoonQueueEntry = {
  id: string;
  title: string;
  rating: number;
  review: string;
  createdAt: string;
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
  review,
  title
}: {
  rating: number;
  review: string;
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
    review: review.trim(),
    createdAt: formatLocalIso(now),
    source: "mobile-queue-app",
    status: "pending"
  };
}

export function serializeQueueEntry(entry: PendingWebtoonQueueEntry) {
  return JSON.stringify(entry);
}

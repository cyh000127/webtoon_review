import { readFile } from "node:fs/promises";
import path from "node:path";

const queueFiles = [
  {
    path: "queue/pending-webtoons.jsonl",
    status: "pending",
    requiredFields: [
      "id",
      "title",
      "rating",
      "createdAt",
      "source",
      "status"
    ]
  },
  {
    path: "queue/processed-webtoons.jsonl",
    status: "processed",
    requiredFields: [
      "id",
      "title",
      "rating",
      "createdAt",
      "source",
      "status",
      "processedAt",
      "archiveId",
      "archiveTitle"
    ]
  }
];

const seenIds = new Set();
const errors = [];

function isValidDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validateRequiredString(entry, field, filePath, lineNumber) {
  if (typeof entry[field] !== "string" || entry[field].trim().length === 0) {
    errors.push(`${filePath}:${lineNumber} ${field} 값이 비어 있습니다.`);
  }
}

function validateEntry(entry, fileConfig, lineNumber) {
  const filePath = fileConfig.path;

  for (const field of fileConfig.requiredFields) {
    if (!(field in entry)) {
      errors.push(`${filePath}:${lineNumber} ${field} 필드가 없습니다.`);
    }
  }

  for (const field of [
    "id",
    "title",
    "createdAt",
    "source",
    "status"
  ]) {
    validateRequiredString(entry, field, filePath, lineNumber);
  }

  if (entry.status !== fileConfig.status) {
    errors.push(
      `${filePath}:${lineNumber} status는 ${fileConfig.status}여야 합니다.`
    );
  }

  if (typeof entry.rating !== "number" || entry.rating < 0 || entry.rating > 5) {
    errors.push(`${filePath}:${lineNumber} rating은 0부터 5까지의 숫자여야 합니다.`);
  }

  const hasReadingSchema =
    "readProgress" in entry || "readingStatus" in entry || "dropReason" in entry;

  if (hasReadingSchema) {
    validateRequiredString(entry, "readProgress", filePath, lineNumber);

    if (!["reading", "completed", "dropped"].includes(entry.readingStatus)) {
      errors.push(
        `${filePath}:${lineNumber} readingStatus는 reading, completed, dropped 중 하나여야 합니다.`
      );
    }

    if (
      entry.readingStatus === "dropped" &&
      (typeof entry.dropReason !== "string" ||
        entry.dropReason.trim().length === 0)
    ) {
      errors.push(
        `${filePath}:${lineNumber} 중도 이탈 항목은 dropReason이 필요합니다.`
      );
    }
  } else if (
    typeof entry.review !== "string" ||
    entry.review.trim().length === 0
  ) {
    errors.push(`${filePath}:${lineNumber} 기존 형식 항목은 review가 필요합니다.`);
  }

  if (!isValidDate(entry.createdAt)) {
    errors.push(`${filePath}:${lineNumber} createdAt 날짜 형식이 올바르지 않습니다.`);
  }

  if (entry.status === "processed") {
    for (const field of ["processedAt", "archiveId", "archiveTitle"]) {
      validateRequiredString(entry, field, filePath, lineNumber);
    }

    if (!isValidDate(entry.processedAt)) {
      errors.push(
        `${filePath}:${lineNumber} processedAt 날짜 형식이 올바르지 않습니다.`
      );
    }
  }

  if (seenIds.has(entry.id)) {
    errors.push(`${filePath}:${lineNumber} 중복 id입니다: ${entry.id}`);
  }

  seenIds.add(entry.id);
}

async function validateFile(fileConfig) {
  const absolutePath = path.resolve(fileConfig.path);
  const content = await readFile(absolutePath, "utf8");
  const lines = content.split(/\r?\n/);
  let entryCount = 0;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (line.trim().length === 0) {
      return;
    }

    let entry;

    try {
      entry = JSON.parse(line);
    } catch {
      errors.push(`${fileConfig.path}:${lineNumber} JSON 형식이 아닙니다.`);
      return;
    }

    entryCount += 1;
    validateEntry(entry, fileConfig, lineNumber);
  });

  return entryCount;
}

const counts = await Promise.all(queueFiles.map((fileConfig) => validateFile(fileConfig)));

if (errors.length > 0) {
  console.error("대기열 검증 실패");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `대기열 검증 완료: pending ${counts[0]}개, processed ${counts[1]}개`
);

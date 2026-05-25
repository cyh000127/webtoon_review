import { normalizeQueueEntry } from "./queueEntry";

export type GitHubQueueSettings = {
  owner: string;
  repo: string;
  branch: string;
  queuePath: string;
};

type GitHubContentResponse = {
  content?: string;
  encoding?: string;
  message?: string;
  sha?: string;
  type?: string;
};

type GitHubErrorResponse = {
  message?: string;
  documentation_url?: string;
};

export type QueueFile = {
  content: string;
  exists: boolean;
  sha?: string;
};

const apiVersion = "2022-11-28";

function toUtf8Bytes(value: string) {
  const bytes: number[] = [];

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(0xf0 | (codePoint >> 18));
      bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    }
  }

  return bytes;
}

function fromUtf8Bytes(bytes: number[]) {
  let output = "";
  let index = 0;

  while (index < bytes.length) {
    const first = bytes[index];

    if (first < 0x80) {
      output += String.fromCodePoint(first);
      index += 1;
    } else if (first < 0xe0) {
      output += String.fromCodePoint(
        ((first & 0x1f) << 6) | (bytes[index + 1] & 0x3f)
      );
      index += 2;
    } else if (first < 0xf0) {
      output += String.fromCodePoint(
        ((first & 0x0f) << 12) |
          ((bytes[index + 1] & 0x3f) << 6) |
          (bytes[index + 2] & 0x3f)
      );
      index += 3;
    } else {
      output += String.fromCodePoint(
        ((first & 0x07) << 18) |
          ((bytes[index + 1] & 0x3f) << 12) |
          ((bytes[index + 2] & 0x3f) << 6) |
          (bytes[index + 3] & 0x3f)
      );
      index += 4;
    }
  }

  return output;
}

function encodeBase64(value: string) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = toUtf8Bytes(value);
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const combined =
      (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    output += alphabet[(combined >> 18) & 0x3f];
    output += alphabet[(combined >> 12) & 0x3f];
    output += second === undefined ? "=" : alphabet[(combined >> 6) & 0x3f];
    output += third === undefined ? "=" : alphabet[combined & 0x3f];
  }

  return output;
}

function decodeBase64(value: string) {
  const normalized = value.replace(/\s/g, "");
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes: number[] = [];

  for (let index = 0; index < normalized.length; index += 4) {
    const first = alphabet.indexOf(normalized[index]);
    const second = alphabet.indexOf(normalized[index + 1]);
    const third =
      normalized[index + 2] === "=" ? -1 : alphabet.indexOf(normalized[index + 2]);
    const fourth =
      normalized[index + 3] === "=" ? -1 : alphabet.indexOf(normalized[index + 3]);
    const combined =
      (first << 18) |
      (second << 12) |
      ((third < 0 ? 0 : third) << 6) |
      (fourth < 0 ? 0 : fourth);

    bytes.push((combined >> 16) & 0xff);

    if (third >= 0) {
      bytes.push((combined >> 8) & 0xff);
    }

    if (fourth >= 0) {
      bytes.push(combined & 0xff);
    }
  }

  return fromUtf8Bytes(bytes);
}

function getContentsUrl(settings: GitHubQueueSettings) {
  const encodedPath = settings.queuePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `https://api.github.com/repos/${encodeURIComponent(
    settings.owner
  )}/${encodeURIComponent(settings.repo)}/contents/${encodedPath}`;
}

async function parseError(response: Response) {
  try {
    const body = (await response.json()) as GitHubErrorResponse;
    return body.message
      ? `${body.message} (${response.status})`
      : `GitHub API 오류가 발생했습니다. (${response.status})`;
  } catch {
    return `GitHub API 오류가 발생했습니다. (${response.status})`;
  }
}

function getHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": apiVersion
  };
}

export async function readQueueFile(
  settings: GitHubQueueSettings,
  token: string
): Promise<QueueFile> {
  const response = await fetch(`${getContentsUrl(settings)}?ref=${settings.branch}`, {
    headers: getHeaders(token)
  });

  if (response.status === 404) {
    return {
      content: "",
      exists: false
    };
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as GitHubContentResponse;

  if (body.type !== "file") {
    throw new Error("대기열 경로가 파일이 아닙니다.");
  }

  if (typeof body.content !== "string" || !body.sha) {
    throw new Error("대기열 파일 내용을 읽지 못했습니다.");
  }

  return {
    content: decodeBase64(body.content),
    exists: true,
    sha: body.sha
  };
}

export async function writeQueueFile({
  content,
  message,
  settings,
  sha,
  token
}: {
  content: string;
  message: string;
  settings: GitHubQueueSettings;
  sha?: string;
  token: string;
}) {
  const response = await fetch(getContentsUrl(settings), {
    body: JSON.stringify({
      branch: settings.branch,
      content: encodeBase64(content),
      message,
      ...(sha ? { sha } : {})
    }),
    headers: {
      ...getHeaders(token),
      "Content-Type": "application/json"
    },
    method: "PUT"
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function appendQueueLine({
  line,
  message,
  settings,
  token
}: {
  line: string;
  message: string;
  settings: GitHubQueueSettings;
  token: string;
}) {
  const append = (content: string) =>
    content.trimEnd().length > 0 ? `${content.trimEnd()}\n${line}\n` : `${line}\n`;
  const current = await readQueueFile(settings, token);

  try {
    return await writeQueueFile({
      content: append(current.content),
      message,
      settings,
      sha: current.sha,
      token
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("409")) {
      const latest = await readQueueFile(settings, token);

      return writeQueueFile({
        content: append(latest.content),
        message,
        settings,
        sha: latest.sha,
        token
      });
    }

    throw error;
  }
}

function replaceQueueLineContent({
  content,
  id,
  line
}: {
  content: string;
  id: string;
  line: string;
}) {
  const lines = content.split(/\r?\n/).filter((currentLine) => currentLine.trim());
  let replaced = false;
  const nextLines = lines.map((currentLine) => {
    try {
      const entry = JSON.parse(currentLine) as { id?: unknown };

      if (entry.id === id) {
        replaced = true;
        return line;
      }
    } catch {
      return currentLine;
    }

    return currentLine;
  });

  if (!replaced) {
    throw new Error("수정할 최근 제출 항목을 대기열에서 찾지 못했습니다.");
  }

  return nextLines.length > 0 ? `${nextLines.join("\n")}\n` : "";
}

export async function updateQueueLine({
  id,
  line,
  message,
  settings,
  token
}: {
  id: string;
  line: string;
  message: string;
  settings: GitHubQueueSettings;
  token: string;
}) {
  const current = await readQueueFile(settings, token);
  const nextContent = replaceQueueLineContent({
    content: current.content,
    id,
    line
  });

  try {
    return await writeQueueFile({
      content: nextContent,
      message,
      settings,
      sha: current.sha,
      token
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("409")) {
      const latest = await readQueueFile(settings, token);

      return writeQueueFile({
        content: replaceQueueLineContent({
          content: latest.content,
          id,
          line
        }),
        message,
        settings,
        sha: latest.sha,
        token
      });
    }

    throw error;
  }
}

export async function readPendingQueueEntries(
  settings: GitHubQueueSettings,
  token: string
) {
  const queueFile = await readQueueFile(settings, token);
  const entries = [];
  const lines = queueFile.content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line.trim()) {
      continue;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`대기열 ${index + 1}번째 줄의 JSON 형식이 올바르지 않습니다.`);
    }

    const entry = normalizeQueueEntry(parsed);

    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

export async function testGitHubConnection(
  settings: GitHubQueueSettings,
  token: string
) {
  const queueFile = await readQueueFile(settings, token);

  return queueFile.exists
    ? "GitHub 연결 성공. 대기열 파일을 읽었습니다."
    : "GitHub 연결 성공. 대기열 파일은 첫 제출 때 생성됩니다.";
}

export type SerializationStatus = "ongoing" | "completed";

export type ReadingStatus = "finished" | "dropped";

export type PlatformId =
  | "naver"
  | "kakao"
  | "kakao-page"
  | "ridibooks"
  | "lezhin"
  | "bomtoon"
  | "peanutoon"
  | "other";

export interface WebtoonRecord {
  id: string;
  title: string;
  author: string;
  platform: PlatformId;
  serializationStatus: SerializationStatus;
  readingStatus: ReadingStatus;
  genres: string[];
  coverImage: string;
  episodeProgress: string;
  rating?: number;
  review: string;
  dropReason: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
  isFavorite?: boolean;
  tags?: string[];
}

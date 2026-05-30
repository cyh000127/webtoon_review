export type SerializationStatus = "ongoing" | "completed";

export type UserReadingStatus =
  | "reading"
  | "finished"
  | "dropped";

export interface ArchiveWebtoonRecord {
  id: string;
  inputTitle: string;
  title: string;
  author: string;
  platform: string;
  contentType: string;
  platformId?: string;
  genres: string[];
  description: string;
  serializationStatus: SerializationStatus;
  serializationLabel: string;
  episodeCount: number;
  userReadingStatus: UserReadingStatus;
  userProgress: string;
  group: string;
  coverImage: string;
  descriptionFile: string;
  userRating?: number;
  userReview?: string;
  dropReason?: string;
  note: string;
}

export interface WebtoonArchive {
  collectedAt: string;
  lastUpdatedAt?: string;
  items: ArchiveWebtoonRecord[];
}

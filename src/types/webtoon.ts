export type SerializationStatus = "ongoing" | "completed";

export type UpdateScheduleSource =
  | "official"
  | "latestEpisodeDate"
  | "completed"
  | "unknown";

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
  updateWeekdays: string[];
  updateScheduleLabel: string;
  updateScheduleSource: UpdateScheduleSource;
  latestEpisodeUpdatedAt?: string;
  userReadingStatus: UserReadingStatus;
  userProgress: string;
  group: string;
  coverImage: string;
  descriptionFile: string;
  userRating?: number;
  note: string;
}

export interface WebtoonArchive {
  collectedAt: string;
  lastUpdatedAt?: string;
  items: ArchiveWebtoonRecord[];
}

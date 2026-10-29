export type MangaType = 'manga' | 'manhwa' | 'manhua' | 'comic';

export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';

export interface MangaTag {
  id: string;
  name: string;
  group: string;
}

export interface MangaItem {
  id: string;
  title: string;
  altTitles: string[];
  description: string;
  coverUrl: string;
  originalLanguage: string;
  type: MangaType;
  status: MangaStatus;
  year: number | null;
  contentRating: string;
  tags: MangaTag[];
  authors: string[];
  artists: string[];
  latestChapter?: string;
  updatedAt?: string;
}

export interface ChapterItem {
  id: string;
  chapter: string;
  volume: string | null;
  title: string;
  translatedLanguage: string;
  publishAt: string;
  pages: number;
  scanlationGroup?: string;
  externalUrl?: string | null;
}

export interface ChapterPagesData {
  chapterId: string;
  baseUrl: string;
  hash: string;
  pages: string[];
  dataSaverPages: string[];
}

export type BookmarkCategory = 'reading' | 'plan_to_read' | 'completed' | 'on_hold' | 'dropped';

export interface BookmarkItem {
  mangaId: string;
  title: string;
  coverUrl: string;
  type: MangaType;
  category: BookmarkCategory;
  addedAt: number;
  lastReadChapterId?: string;
  lastReadChapterNumber?: string;
}

export interface HistoryItem {
  mangaId: string;
  title: string;
  coverUrl: string;
  type: MangaType;
  chapterId: string;
  chapterNumber: string;
  chapterTitle?: string;
  page: number;
  totalPages: number;
  updatedAt: number;
}

export type ReaderMode = 'webtoon' | 'single' | 'double';
export type ReadingDirection = 'ltr' | 'rtl';
export type ImageFitMode = 'width' | 'height' | 'contain' | 'original';

export interface ReaderSettings {
  mode: ReaderMode;
  direction: ReadingDirection;
  dataSaver: boolean;
  fitMode: ImageFitMode;
  preloadPages: number;
}


import { MangaItem, MangaType, ChapterItem, ChapterPagesData, MangaStatus } from '@/types/manga';
import tagsData from './mangadex-tags.json';

const MANGADEX_API_BASE = 'https://api.mangadex.org';

export const MANGA_TAGS = tagsData;

// In-memory cache to avoid Next.js dev fetch-cache writing to disk (which causes infinite Turbopack HMR reloads)
const apiCache = new Map<string, { data: any; expiry: number }>();

async function cachedFetchJson(url: string, ttlMs = 120000) {
  const now = Date.now();
  const cached = apiCache.get(url);
  if (cached && cached.expiry > now) {
    return cached.data;
  }
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'MangaVerse-App/1.0',
    },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch from MangaDex: ${res.statusText}`);
  }
  const data = await res.json();
  apiCache.set(url, { data, expiry: now + ttlMs });
  return data;
}

export function mapOriginalLanguageToType(lang: string): MangaType {
  const l = (lang || '').toLowerCase();
  if (l === 'ko') return 'manhwa';
  if (l === 'zh' || l === 'zh-hk') return 'manhua';
  if (l === 'ja') return 'manga';
  return 'comic';
}

export function getPreferredText(obj?: Record<string, string> | null, defaultVal = ''): string {
  if (!obj) return defaultVal;
  if (obj.en) return obj.en;
  if (obj['ja-ro']) return obj['ja-ro'];
  if (obj['ko-ro']) return obj['ko-ro'];
  if (obj['zh-ro']) return obj['zh-ro'];
  const values = Object.values(obj);
  return values.length > 0 ? values[0] : defaultVal;
}

export function parseMangaItem(raw: any): MangaItem {
  const attrs = raw.attributes || {};
  const relationships = raw.relationships || [];

  const title = getPreferredText(attrs.title, 'Untitled');
  
  const altTitles: string[] = [];
  if (Array.isArray(attrs.altTitles)) {
    for (const item of attrs.altTitles) {
      const val = getPreferredText(item);
      if (val && !altTitles.includes(val) && val !== title) {
        altTitles.push(val);
      }
    }
  }

  const description = getPreferredText(attrs.description, 'No description available.');

  let coverFileName: string | null = null;
  const authors: string[] = [];
  const artists: string[] = [];

  for (const rel of relationships) {
    if (rel.type === 'cover_art' && rel.attributes?.fileName) {
      coverFileName = rel.attributes.fileName;
    } else if (rel.type === 'author' && rel.attributes?.name) {
      authors.push(rel.attributes.name);
    } else if (rel.type === 'artist' && rel.attributes?.name) {
      artists.push(rel.attributes.name);
    }
  }

  const coverUrl = coverFileName
    ? `https://uploads.mangadex.org/covers/${raw.id}/${coverFileName}.512.jpg`
    : '/placeholder-cover.png';

  const tags = (attrs.tags || []).map((t: any) => ({
    id: t.id,
    name: t.attributes?.name?.en || 'Unknown',
    group: t.attributes?.group || 'genre',
  }));

  const origLang = attrs.originalLanguage || 'ja';
  const type = mapOriginalLanguageToType(origLang);

  return {
    id: raw.id,
    title,
    altTitles: altTitles.slice(0, 5),
    description,
    coverUrl,
    originalLanguage: origLang,
    type,
    status: (attrs.status || 'ongoing') as MangaStatus,
    year: attrs.year || null,
    contentRating: attrs.contentRating || 'safe',
    tags,
    authors: authors.length > 0 ? authors : ['Unknown'],
    artists: artists.length > 0 ? artists : ['Unknown'],
    latestChapter: attrs.lastChapter || undefined,
    updatedAt: attrs.updatedAt,
  };
}

export interface FetchMangaOptions {
  limit?: number;
  offset?: number;
  title?: string;
  type?: 'all' | 'manga' | 'manhwa' | 'manhua';
  includedTags?: string[];
  excludedTags?: string[];
  status?: string[];
  order?: Record<string, 'asc' | 'desc'>;
}

export async function fetchMangaList(options: FetchMangaOptions = {}) {
  const {
    limit = 20,
    offset = 0,
    title,
    type = 'all',
    includedTags = [],
    excludedTags = [],
    status = [],
    order = { followedCount: 'desc' },
  } = options;

  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  params.set('offset', offset.toString());
  params.append('includes[]', 'cover_art');
  params.append('includes[]', 'author');
  params.append('includes[]', 'artist');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');

  if (title && title.trim()) {
    params.set('title', title.trim());
  }

  if (type === 'manga') {
    params.append('originalLanguage[]', 'ja');
  } else if (type === 'manhwa') {
    params.append('originalLanguage[]', 'ko');
  } else if (type === 'manhua') {
    params.append('originalLanguage[]', 'zh');
    params.append('originalLanguage[]', 'zh-hk');
  }

  for (const tagId of includedTags) {
    params.append('includedTags[]', tagId);
  }
  for (const tagId of excludedTags) {
    params.append('excludedTags[]', tagId);
  }

  for (const st of status) {
    params.append('status[]', st);
  }

  for (const [key, dir] of Object.entries(order)) {
    params.append(`order[${key}]`, dir);
  }

  const url = `${MANGADEX_API_BASE}/manga?${params.toString()}`;
  const json = await cachedFetchJson(url, 120000);
  const items: MangaItem[] = (json?.data || []).map(parseMangaItem);

  return {
    items,
    total: json?.total || 0,
    limit: json?.limit || limit,
    offset: json?.offset || offset,
  };
}

export async function fetchMangaById(id: string): Promise<MangaItem | null> {
  const url = `${MANGADEX_API_BASE}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`;
  const json = await cachedFetchJson(url, 300000);
  if (!json?.data) return null;
  return parseMangaItem(json.data);
}

export interface FetchChaptersOptions {
  limit?: number;
  offset?: number;
  translatedLanguage?: string[];
  order?: 'asc' | 'desc';
}

export async function fetchMangaChapters(
  mangaId: string,
  options: FetchChaptersOptions = {}
): Promise<{ chapters: ChapterItem[]; total: number }> {
  const {
    limit = 100,
    offset = 0,
    translatedLanguage = ['en'],
    order = 'asc',
  } = options;

  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  params.set('offset', offset.toString());
  params.append('includes[]', 'scanlation_group');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');
  params.append('order[chapter]', order);

  for (const lang of translatedLanguage) {
    params.append('translatedLanguage[]', lang);
  }

  const url = `${MANGADEX_API_BASE}/manga/${mangaId}/feed?${params.toString()}`;
  const json = await cachedFetchJson(url, 180000);
  const rawList = json?.data || [];

  // Deduplicate chapters if multiple groups translated same chapter
  // We keep the first one or latest
  const chapters: ChapterItem[] = [];
  const seenNumbers = new Set<string>();

  for (const item of rawList) {
    const attrs = item.attributes || {};
    const chapNum = attrs.chapter || '0';

    let scanlationGroup = 'Unknown Group';
    for (const rel of item.relationships || []) {
      if (rel.type === 'scanlation_group' && rel.attributes?.name) {
        scanlationGroup = rel.attributes.name;
        break;
      }
    }

    chapters.push({
      id: item.id,
      chapter: chapNum,
      volume: attrs.volume || null,
      title: attrs.title || (chapNum ? `Chapter ${chapNum}` : 'Oneshot'),
      translatedLanguage: attrs.translatedLanguage || 'en',
      publishAt: attrs.publishAt || attrs.createdAt,
      pages: attrs.pages || 0,
      scanlationGroup,
      externalUrl: attrs.externalUrl || null,
    });
  }

  return {
    chapters,
    total: json.total || chapters.length,
  };
}

export async function fetchChapterPages(chapterId: string): Promise<ChapterPagesData> {
  const url = `${MANGADEX_API_BASE}/at-home/server/${chapterId}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'MangaVerse-App/1.0',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch chapter pages: ${res.statusText}`);
  }

  const json = await res.json();
  const baseUrl = json.baseUrl;
  const hash = json.chapter?.hash;
  const dataFiles: string[] = json.chapter?.data || [];
  const dataSaverFiles: string[] = json.chapter?.dataSaver || [];

  const pages = dataFiles.map((file) => `${baseUrl}/data/${hash}/${file}`);
  const dataSaverPages = dataSaverFiles.map((file) => `${baseUrl}/data-saver/${hash}/${file}`);

  return {
    chapterId,
    baseUrl,
    hash,
    pages,
    dataSaverPages,
  };
}


import { MANGA } from '@consumet/extensions';
import { ChapterItem } from '@/types/manga';
import { MangaProviderId } from '@/types/providers';

export * from '@/types/providers';

function getProviderInstance(provider: MangaProviderId) {
  switch (provider) {
    case 'weebcentral':
      return new MANGA.WeebCentral();
    case 'mangapill':
      return new MANGA.MangaPill();
    case 'comick':
      return new MANGA.ComicK();
    case 'mangadex':
    default:
      return new MANGA.MangaDex();
  }
}

export async function searchProviderManga(provider: MangaProviderId, title: string) {
  if (provider === 'mangadex') return [];

  try {
    const inst = getProviderInstance(provider);
    const res = await inst.search(title);
    return (res.results || []).map((item: any) => ({
      id: item.id,
      title:
        typeof item.title === 'string'
          ? item.title
          : item.title?.english || item.title?.romaji || 'Untitled',
      image: item.image || item.cover,
      releaseDate: item.releaseDate,
    }));
  } catch (err: any) {
    console.error(`Error searching provider ${provider}:`, err);
    return [];
  }
}

export async function fetchProviderChapters(
  provider: MangaProviderId,
  sourceMangaId: string
): Promise<ChapterItem[]> {
  try {
    const inst = getProviderInstance(provider);
    const info = await inst.fetchMangaInfo(sourceMangaId);
    const rawChapters: any[] = info.chapters || [];

    return rawChapters.map((ch: any) => {
      let chapNumber = '0';
      if (typeof ch.chapterNumber === 'number' || typeof ch.chapterNumber === 'string') {
        chapNumber = ch.chapterNumber.toString();
      } else if (ch.title) {
        const match =
          ch.title.match(/chapter\s*([\d.]+)/i) || ch.title.match(/ch\.\s*([\d.]+)/i);
        if (match) chapNumber = match[1];
      }

      return {
        id: ch.id,
        chapter: chapNumber,
        volume: ch.volumeNumber ? ch.volumeNumber.toString() : null,
        title: ch.title || `Chapter ${chapNumber}`,
        translatedLanguage: 'en',
        publishAt: ch.releaseDate || '',
        pages: 0,
        scanlationGroup: provider.toUpperCase(),
      };
    });
  } catch (err: any) {
    console.error(`Error fetching chapters from ${provider}:`, err);
    return [];
  }
}

export async function fetchProviderPages(
  provider: MangaProviderId,
  chapterId: string
): Promise<string[]> {
  try {
    const inst = getProviderInstance(provider);
    const pages = await inst.fetchChapterPages(chapterId);
    return (pages || []).map((p: any) => p.img || p.url || '').filter(Boolean);
  } catch (err: any) {
    console.error(`Error fetching pages from ${provider}:`, err);
    return [];
  }
}

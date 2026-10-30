import * as cheerio from 'cheerio';
import { ChapterItem } from '@/types/manga';
import { MangaProviderId } from '@/types/providers';

export * from '@/types/providers';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function searchProviderManga(provider: MangaProviderId, title: string) {
  if (provider === 'mangadex') return [];

  if (provider === 'weebcentral') {
    try {
      const url = `https://weebcentral.com/search/data?limit=15&offset=0&text=${encodeURIComponent(
        title
      )}&sort=Best+Match&order=Descending&official=Any&anime=Any&adult=Any&display_mode=Full+Display`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': BROWSER_UA,
          'HX-Request': 'true',
          'HX-Current-URL': `https://weebcentral.com/search?text=${encodeURIComponent(title)}`,
        },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const items: { id: string; title: string; image?: string; releaseDate?: string }[] = [];

      $('article.bg-base-300').each((_, el) => {
        const linkElement = $(el).find('section a').first();
        const href = linkElement.attr('href') || '';
        const id = href.split('/series/')[1] || '';
        const seriesTitle =
          $(el).find('section a .text-ellipsis').text().trim() ||
          $(el).find('section.hidden.lg\\:block .tooltip a').text().trim() ||
          $(el).find('section a').text().trim();
        const image =
          $(el).find('picture source').first().attr('srcset') ||
          $(el).find('picture img').attr('src');

        if (id && seriesTitle) {
          items.push({ id, title: seriesTitle, image });
        }
      });

      return items;
    } catch (err) {
      console.error('Error searching WeebCentral:', err);
      return [];
    }
  }

  return [];
}

export async function fetchProviderChapters(
  provider: MangaProviderId,
  sourceMangaId: string
): Promise<ChapterItem[]> {
  if (provider === 'weebcentral') {
    try {
      const cleanId = sourceMangaId.split('/')[0];
      const url = `https://weebcentral.com/series/${cleanId}/full-chapter-list`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': BROWSER_UA,
          'HX-Request': 'true',
          'HX-Target': 'chapter-list',
          'HX-Current-URL': `https://weebcentral.com/series/${sourceMangaId}`,
        },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const chapters: ChapterItem[] = [];

      $('a[href*="/chapters/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const chapterId = href.split('/chapters/')[1];
        const chapterText = $(el).find('span.grow span').first().text().trim() || $(el).text().trim();
        const timeElement = $(el).find('time');
        const releaseDate = timeElement.attr('datetime') || '';

        // Extract clean chapter number
        let chapNumber = '0';
        const match =
          chapterText.match(/chapter\s*([\d.]+)/i) ||
          chapterText.match(/ch\.\s*([\d.]+)/i) ||
          chapterText.match(/([\d.]+)/);
        if (match) chapNumber = match[1];

        if (chapterId) {
          chapters.push({
            id: chapterId,
            chapter: chapNumber,
            volume: null,
            title: chapterText || `Chapter ${chapNumber}`,
            translatedLanguage: 'en',
            publishAt: releaseDate,
            pages: 0,
            scanlationGroup: 'WEEBCENTRAL',
          });
        }
      });

      return chapters;
    } catch (err) {
      console.error('Error fetching WeebCentral chapters:', err);
      return [];
    }
  }

  return [];
}

export async function fetchProviderPages(
  provider: MangaProviderId,
  chapterId: string
): Promise<string[]> {
  if (provider === 'weebcentral') {
    try {
      const url = `https://weebcentral.com/chapters/${chapterId}/images?is_prev=False&current_page=1&reading_style=long_strip`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': BROWSER_UA,
          Referer: `https://weebcentral.com/chapters/${chapterId}`,
          'HX-Request': 'true',
          'HX-Current-URL': `https://weebcentral.com/chapters/${chapterId}`,
        },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const pages: string[] = [];

      $('img').each((_, el) => {
        const src = $(el).attr('src');
        if (src && !src.includes('broken_image.jpg')) {
          pages.push(src);
        }
      });

      return pages;
    } catch (err) {
      console.error('Error fetching WeebCentral pages:', err);
      return [];
    }
  }

  return [];
}

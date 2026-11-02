import * as cheerio from 'cheerio';
import { ChapterItem } from '@/types/manga';
import { MangaProviderId } from '@/types/providers';

export * from '@/types/providers';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function searchProviderManga(provider: MangaProviderId, title: string) {
  if (provider === 'mangadex') return [];

  // 1. WEEBCENTRAL
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

  // 2. ASURA SCANS
  if (provider === 'asura') {
    try {
      const url = `https://asurascans.com/browse/comics?q=${encodeURIComponent(title)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const items: { id: string; title: string; image?: string }[] = [];

      $('a[href*="/comics/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('/chapter/')) return;
        const slug = href.replace('/comics/', '').replace(/^\//, '').split('?')[0];
        const seriesTitle =
          $(el).find('h3').text().trim() ||
          $(el).find('img').attr('alt')?.trim() ||
          '';
        const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

        if (slug && seriesTitle && !items.some((i) => i.id === slug)) {
          items.push({ id: slug, title: seriesTitle, image });
        }
      });

      return items;
    } catch (err) {
      console.error('Error searching Asura Scans:', err);
      return [];
    }
  }

  // 3. FLAME COMICS
  if (provider === 'flame') {
    try {
      const url = 'https://flamecomics.xyz/api/series';
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
      });

      if (!res.ok) return [];

      const list: {
        id: number;
        label: string;
        status: string;
        image: string;
        chapter_count: string;
      }[] = await res.json();

      const q = title.toLowerCase().trim();
      const matched = list.filter((item) => item.label.toLowerCase().includes(q));

      return matched.map((m) => ({
        id: String(m.id),
        title: m.label,
        image: `https://cdn.flamecomics.xyz/uploads/images/series/${m.id}/${m.image}`,
      }));
    } catch (err) {
      console.error('Error searching Flame Comics:', err);
      return [];
    }
  }

  // 4. MANGAPILL
  if (provider === 'mangapill') {
    try {
      const url = `https://mangapill.com/search?q=${encodeURIComponent(title)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const items: { id: string; title: string; image?: string }[] = [];

      $('a[href*="/manga/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const id = href.replace('/manga/', '').split('?')[0];
        const seriesTitle =
          $(el).find('.line-clamp-2').text().trim() ||
          $(el).find('h3, div').first().text().trim();
        const image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

        if (id && seriesTitle && !items.some((i) => i.id === id)) {
          items.push({ id, title: seriesTitle, image });
        }
      });

      return items;
    } catch (err) {
      console.error('Error searching MangaPill:', err);
      return [];
    }
  }

  return [];
}

export async function fetchProviderChapters(
  provider: MangaProviderId,
  sourceMangaId: string
): Promise<ChapterItem[]> {
  // 1. WEEBCENTRAL
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

  // 2. ASURA SCANS
  if (provider === 'asura') {
    try {
      const cleanSlug = sourceMangaId.split('/')[0];
      const url = `https://asurascans.com/comics/${cleanSlug}`;

      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const chapters: ChapterItem[] = [];

      $('a[href*="/chapter/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const parts = href.split('/chapter/');
        const chapNum = parts[1]?.split('/')[0]?.split('?')[0] || '0';
        const text = $(el).text().trim();
        const id = `${cleanSlug}::chapter::${chapNum}`;

        if (!chapters.some((c) => c.id === id)) {
          chapters.push({
            id,
            chapter: chapNum,
            volume: null,
            title: text || `Chapter ${chapNum}`,
            translatedLanguage: 'en',
            publishAt: '',
            pages: 0,
            scanlationGroup: 'ASURA SCANS',
          });
        }
      });

      return chapters;
    } catch (err) {
      console.error('Error fetching Asura Scans chapters:', err);
      return [];
    }
  }

  // 3. FLAME COMICS
  if (provider === 'flame') {
    try {
      const seriesId = sourceMangaId.trim();
      const url = `https://flamecomics.xyz/series/${seriesId}`;

      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const chapters: ChapterItem[] = [];

      $(`a[href*="/series/${seriesId}/"]`).each((_, el) => {
        const href = $(el).attr('href') || '';
        const hash = href.split(`/series/${seriesId}/`)[1]?.split('?')[0];
        if (!hash) return;

        const text = $(el).text().trim();
        let chapNum = '0';
        const match =
          text.match(/chapter\s*([\d.]+)/i) ||
          text.match(/ch\.\s*([\d.]+)/i) ||
          text.match(/([\d.]+)/);
        if (match) chapNum = match[1];

        const id = `${seriesId}::chapter::${hash}::num::${chapNum}`;

        if (!chapters.some((c) => c.id === id)) {
          chapters.push({
            id,
            chapter: chapNum,
            volume: null,
            title: text || `Chapter ${chapNum}`,
            translatedLanguage: 'en',
            publishAt: '',
            pages: 0,
            scanlationGroup: 'FLAME COMICS',
          });
        }
      });

      return chapters;
    } catch (err) {
      console.error('Error fetching Flame Comics chapters:', err);
      return [];
    }
  }

  // 4. MANGAPILL
  if (provider === 'mangapill') {
    try {
      const url = `https://mangapill.com/manga/${sourceMangaId}`;

      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const chapters: ChapterItem[] = [];

      $('#chapters a, a[href*="/chapters/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const chapId = href.replace('/chapters/', '').split('?')[0];
        const text = $(el).text().trim();

        let chapNum = '0';
        const match =
          text.match(/chapter\s*([\d.]+)/i) ||
          text.match(/ch\.\s*([\d.]+)/i) ||
          text.match(/([\d.]+)/);
        if (match) chapNum = match[1];

        if (chapId && !chapters.some((c) => c.id === chapId)) {
          chapters.push({
            id: chapId,
            chapter: chapNum,
            volume: null,
            title: text || `Chapter ${chapNum}`,
            translatedLanguage: 'en',
            publishAt: '',
            pages: 0,
            scanlationGroup: 'MANGAPILL',
          });
        }
      });

      return chapters;
    } catch (err) {
      console.error('Error fetching MangaPill chapters:', err);
      return [];
    }
  }

  return [];
}

export async function fetchProviderPages(
  provider: MangaProviderId,
  chapterId: string
): Promise<string[]> {
  // 1. WEEBCENTRAL
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

  // 2. ASURA SCANS
  if (provider === 'asura') {
    try {
      const parts = chapterId.split('::chapter::');
      const slug = parts[0];
      const chapNum = parts[1] || '1';

      const url = `https://asurascans.com/comics/${slug}/chapter/${chapNum}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const pages: string[] = [];

      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (
          src &&
          (src.includes('asura-images/chapter') ||
            src.includes('asura-images/chapters-merged')) &&
          !src.includes('cover')
        ) {
          pages.push(src);
        }
      });

      return pages;
    } catch (err) {
      console.error('Error fetching Asura Scans pages:', err);
      return [];
    }
  }

  // 3. FLAME COMICS
  if (provider === 'flame') {
    try {
      const parts = chapterId.split('::chapter::');
      const seriesId = parts[0];
      const hashPart = parts[1]?.split('::num::')[0];

      const url = `https://flamecomics.xyz/series/${seriesId}/${hashPart}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const pages: string[] = [];

      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (
          src &&
          src.includes('cdn.flamecomics.xyz/uploads/images/series/') &&
          !src.includes('thumbnail')
        ) {
          pages.push(src);
        }
      });

      return pages;
    } catch (err) {
      console.error('Error fetching Flame Comics pages:', err);
      return [];
    }
  }

  // 4. MANGAPILL
  if (provider === 'mangapill') {
    try {
      const url = `https://mangapill.com/chapters/${chapterId}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': BROWSER_UA,
          Referer: 'https://mangapill.com/',
        },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const pages: string[] = [];

      $('picture img, img[data-src]').each((_, el) => {
        const src = $(el).attr('data-src') || $(el).attr('src');
        if (src && !src.includes('broken') && !src.includes('logo')) {
          pages.push(src);
        }
      });

      return pages;
    } catch (err) {
      console.error('Error fetching MangaPill pages:', err);
      return [];
    }
  }

  return [];
}

export async function fetchProviderLatest(provider: MangaProviderId) {
  // 1. MANGADEX
  if (provider === 'mangadex') {
    try {
      const res = await fetch(
        'https://api.mangadex.org/manga?limit=24&order[latestUploadedChapter]=desc&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive'
      );
      if (!res.ok) return [];
      const json = await res.json();
      const items: { id: string; title: string; image?: string }[] = [];
      for (const item of json.data || []) {
        const title =
          item.attributes?.title?.en ||
          Object.values(item.attributes?.title || {})[0] ||
          'Unknown';
        const coverRel = (item.relationships || []).find((r: any) => r.type === 'cover_art');
        const fileName = coverRel?.attributes?.fileName;
        const image = fileName
          ? `https://uploads.mangadex.org/covers/${item.id}/${fileName}.256.jpg`
          : undefined;
        items.push({ id: item.id, title, image });
      }
      return items;
    } catch {
      return [];
    }
  }

  // 2. ASURA SCANS
  if (provider === 'asura') {
    try {
      const res = await fetch('https://asurascans.com/', {
        headers: { 'User-Agent': BROWSER_UA },
      });
      if (!res.ok) return [];
      const html = await res.text();
      const $ = cheerio.load(html);
      const items: { id: string; title: string; image?: string }[] = [];

      $('a[href*="/comics/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('/chapter/')) return;
        const slug = href.replace('/comics/', '').replace(/^\//, '').split('?')[0];
        const title =
          $(el).find('h3').text().trim() ||
          $(el).find('img').attr('alt')?.trim() ||
          '';
        const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

        if (slug && title && !items.some((i) => i.id === slug)) {
          items.push({ id: slug, title, image });
        }
      });

      return items.slice(0, 30);
    } catch {
      return [];
    }
  }

  // 3. WEEBCENTRAL
  if (provider === 'weebcentral') {
    try {
      const url =
        'https://weebcentral.com/search/data?limit=24&offset=0&sort=Latest+Updates&order=Descending&display_mode=Full+Display';
      const res = await fetch(url, {
        headers: {
          'User-Agent': BROWSER_UA,
          'HX-Request': 'true',
          'HX-Current-URL': 'https://weebcentral.com/search',
        },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const items: { id: string; title: string; image?: string }[] = [];

      $('article.bg-base-300').each((_, el) => {
        const link = $(el).find('section a').first();
        const href = link.attr('href') || '';
        const id = href.split('/series/')[1] || '';
        const title =
          $(el).find('section a .text-ellipsis').text().trim() ||
          $(el).find('section a').text().trim();
        const image =
          $(el).find('picture source').first().attr('srcset') ||
          $(el).find('picture img').attr('src');

        if (id && title) {
          items.push({ id, title, image });
        }
      });

      return items;
    } catch {
      return [];
    }
  }

  // 4. MANGAPILL
  if (provider === 'mangapill') {
    try {
      const res = await fetch('https://mangapill.com/', {
        headers: { 'User-Agent': BROWSER_UA },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);
      const items: { id: string; title: string; image?: string }[] = [];

      $('div.grid > div').each((_, el) => {
        const link = $(el).find('a').first().attr('href') || '';
        if (!link.includes('/manga/')) return;
        const id = link.replace('/manga/', '').split('?')[0];
        const title =
          $(el).find('.line-clamp-2').text().trim() ||
          $(el).find('h3, a').text().trim();
        const image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

        if (id && title && !items.some((i) => i.id === id)) {
          items.push({ id, title, image });
        }
      });

      return items;
    } catch {
      return [];
    }
  }

  // 5. FLAME COMICS
  if (provider === 'flame') {
    try {
      const res = await fetch('https://flamecomics.xyz/api/series', {
        headers: { 'User-Agent': BROWSER_UA },
      });

      if (!res.ok) return [];

      const list: any[] = await res.json();
      return list.slice(0, 24).map((m) => ({
        id: String(m.id),
        title: m.label,
        image: `https://cdn.flamecomics.xyz/uploads/images/series/${m.id}/${m.image}`,
      }));
    } catch {
      return [];
    }
  }

  return [];
}

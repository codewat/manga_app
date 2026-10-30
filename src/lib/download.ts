'use client';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ChapterItem } from '@/types/manga';

export interface DownloadProgressCallback {
  (progress: number, status: string): void;
}

export async function downloadChapterAsCBZ(
  mangaTitle: string,
  chapter: ChapterItem,
  onProgress?: DownloadProgressCallback,
  provider = 'mangadex'
): Promise<void> {
  try {
    if (onProgress) onProgress(5, 'Fetching chapter pages...');

    let pageUrls: string[] = [];

    if (provider === 'mangadex') {
      const res = await fetch(`/api/chapter/${chapter.id}`);
      if (!res.ok) throw new Error('Failed to retrieve chapter pages');
      const data = await res.json();
      pageUrls = data.pages || [];
    } else {
      const res = await fetch(
        `/api/source/${provider}?action=pages&chapterId=${encodeURIComponent(chapter.id)}`
      );
      if (!res.ok) throw new Error(`Failed to retrieve pages from ${provider}`);
      const data = await res.json();
      pageUrls = data.pages || [];
    }

    if (pageUrls.length === 0) {
      throw new Error('No pages found for this chapter');
    }

    const zip = new JSZip();
    const cleanMangaTitle = mangaTitle.replace(/[\\/:*?"<>|]/g, '_');
    const cleanChapterTitle = `Ch.${chapter.chapter || '0'}`;
    const filename = `${cleanMangaTitle} - ${cleanChapterTitle} [${provider.toUpperCase()}].cbz`;

    const total = pageUrls.length;

    for (let i = 0; i < total; i++) {
      const pageUrl = pageUrls[i];
      const pageIndex = (i + 1).toString().padStart(3, '0');
      if (onProgress) {
        const percent = 10 + Math.round(((i + 1) / total) * 80);
        onProgress(percent, `Downloading page ${i + 1} of ${total}...`);
      }

      // Fetch image through proxy to avoid CORS/Hotlink restrictions
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(pageUrl)}`;
      const imgRes = await fetch(proxyUrl);
      if (!imgRes.ok) {
        console.warn(`Failed to download page ${i + 1}, retrying directly...`);
        const directRes = await fetch(pageUrl);
        if (!directRes.ok) continue;
        const blob = await directRes.blob();
        zip.file(`${pageIndex}.jpg`, blob);
      } else {
        const blob = await imgRes.blob();
        zip.file(`${pageIndex}.jpg`, blob);
      }
    }

    if (onProgress) onProgress(95, 'Compiling CBZ comic package...');

    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    if (onProgress) onProgress(100, 'Download complete!');
    saveAs(content, filename);
  } catch (err: any) {
    console.error('Download error:', err);
    throw err;
  }
}

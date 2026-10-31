export type MangaProviderId = 'mangadex' | 'weebcentral' | 'asura' | 'flame' | 'mangapill';

export interface ProviderSource {
  id: MangaProviderId;
  name: string;
  badge: string;
  description: string;
}

export const AVAILABLE_PROVIDERS: ProviderSource[] = [
  {
    id: 'mangadex',
    name: 'MangaDex',
    badge: '🌟 Primary',
    description: 'Official scans & multi-language translations',
  },
  {
    id: 'weebcentral',
    name: 'WeebCentral',
    badge: '⚡ Complete Scans',
    description: 'High quality scans with complete chapters & fast updates',
  },
  {
    id: 'asura',
    name: 'Asura Scans',
    badge: '🗡️ Top Manhwa',
    description: 'Top action, solo & reincarnation webtoons (Solo Leveling, etc.)',
  },
  {
    id: 'flame',
    name: 'Flame Comics',
    badge: '🔥 Curated HQ',
    description: 'High-res webtoons & manhwa (Omniscient Reader, etc.)',
  },
  {
    id: 'mangapill',
    name: 'MangaPill',
    badge: '📚 Huge Catalog',
    description: 'Fast, clean, and massive library of manga & manhwa',
  },
];

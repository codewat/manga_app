export type MangaProviderId = 'mangadex' | 'weebcentral' | 'mangapill' | 'comick';

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
    description: 'High quality scans with complete chapters',
  },
  {
    id: 'mangapill',
    name: 'MangaPill',
    badge: '📖 Fast Releases',
    description: 'Fast uploads and extensive library',
  },
  {
    id: 'comick',
    name: 'ComicK',
    badge: '🚀 Aggregator',
    description: 'Aggregates releases from all scanlation groups',
  },
];

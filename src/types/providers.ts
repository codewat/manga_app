export type MangaProviderId = 'mangadex' | 'weebcentral';

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
];

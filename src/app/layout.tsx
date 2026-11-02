import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'MangaVerse - Read Manga, Manhwa & Manhua Online',
  description:
    'Free online reader for Manga, Manhwa, and Manhua with high quality reader, bookmarks, history, and cross-device sync.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-purple-600 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

import React from 'react';
import Navbar from '@/components/Navbar';
import HomeContent from '@/components/HomeContent';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-20 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        <HomeContent />
      </main>
    </div>
  );
}

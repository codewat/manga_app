'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Search,
  Bookmark,
  Home,
  Compass,
  User,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';
import { getBookmarks } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/AuthModal';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, syncNow, syncing, lastSynced } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateCounts() {
      const b = getBookmarks();
      setBookmarkCount(b.length);
    }
    updateCounts();
    window.addEventListener('mangaverse_storage_update', updateCounts);
    return () => window.removeEventListener('mangaverse_storage_update', updateCounts);
  }, []);

  // Click outside to dismiss user dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCopySyncCode = () => {
    if (!user?.syncCode) return;
    navigator.clipboard.writeText(user.syncCode);
    setCopiedSyncCode(true);
    setTimeout(() => setCopiedSyncCode(false), 2000);
  };

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Browse', icon: Compass },
    { href: '/library', label: 'Library', icon: Bookmark, badge: bookmarkCount > 0 ? bookmarkCount : null },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-0.5 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition duration-300">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
                Manga<span className="text-purple-400">Verse</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-purple-400/80 -mt-1 hidden sm:block">
                Manga • Manhwa • Manhua
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md items-center relative"
          >
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search manga, manhwa, manhua..."
              className="w-full bg-zinc-900/90 text-sm text-zinc-100 placeholder-zinc-500 pl-10 pr-4 py-2 rounded-full border border-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
            />
          </form>

          {/* Navigation Links + Auth Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="flex items-center gap-1 sm:gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition duration-150 relative ${
                      isActive
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{link.label}</span>
                    {link.badge !== null && (
                      <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Auth Button or User Profile */}
            <div className="relative" ref={dropdownRef}>
              {user ? (
                <div>
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-purple-950/60 border border-purple-800/80 hover:bg-purple-900/50 text-purple-200 text-xs font-bold transition shadow-sm"
                  >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-extrabold uppercase">
                      {user.username.charAt(0)}
                    </div>
                    <span className="hidden sm:inline max-w-[100px] truncate">@{user.username}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-zinc-800">
                      {/* User Header */}
                      <div className="pb-3 px-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold uppercase">
                            {user.username.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">@{user.username}</p>
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Cloud Synced
                            </span>
                          </div>
                        </div>

                        {/* Device Sync Code */}
                        <div className="mt-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                            <span>Device Sync Code:</span>
                            <button
                              onClick={handleCopySyncCode}
                              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                            >
                              {copiedSyncCode ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="font-mono text-center text-sm font-bold tracking-widest text-amber-400 bg-zinc-900 py-1 rounded border border-zinc-800">
                            {user.syncCode}
                          </p>
                          <p className="text-[9px] text-zinc-500 mt-1 text-center">
                            Use this code on another device to link immediately!
                          </p>
                        </div>
                      </div>

                      {/* Sync Action */}
                      <div className="py-2 space-y-1">
                        <button
                          onClick={async () => {
                            await syncNow();
                          }}
                          disabled={syncing}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${syncing ? 'animate-spin' : ''}`} />
                            Sync Library Now
                          </span>
                          {lastSynced && (
                            <span className="text-[10px] text-zinc-500">
                              {Math.round((Date.now() - lastSynced) / 60000)}m ago
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="pt-2">
                        <button
                          onClick={async () => {
                            setShowUserDropdown(false);
                            await logout();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Nav for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-6 py-2 flex items-center justify-around">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium transition ${
                isActive ? 'text-purple-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {link.badge !== null && (
                  <span className="absolute -top-1.5 -right-2 bg-purple-600 text-white text-[9px] font-bold px-1 rounded-full">
                    {link.badge}
                  </span>
                )}
              </div>
              <span>{link.label}</span>
            </Link>
          );
        })}

        {/* Mobile Profile / Login Button */}
        <button
          onClick={() => {
            if (user) setShowUserDropdown(!showUserDropdown);
            else setShowAuthModal(true);
          }}
          className="flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          <div className="relative">
            {user ? (
              <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-extrabold flex items-center justify-center uppercase">
                {user.username.charAt(0)}
              </div>
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <span>{user ? user.username.slice(0, 6) : 'Account'}</span>
        </button>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}

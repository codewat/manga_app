'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Lock, User, KeyRound, Loader2, Smartphone, ShieldCheck, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register, loginWithSyncCode } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'code'>('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [syncCode, setSyncCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await login(username, password);
        if (!res.success) {
          setError(res.error || 'Failed to sign in');
        } else {
          setSuccessMsg('Logged in successfully! Library synced.');
          setTimeout(() => onClose(), 800);
        }
      } else if (tab === 'register') {
        const res = await register(username, password);
        if (!res.success) {
          setError(res.error || 'Registration failed');
        } else {
          setSuccessMsg('Account created! Your library is now saved to the cloud.');
          setTimeout(() => onClose(), 800);
        }
      } else if (tab === 'code') {
        const res = await loginWithSyncCode(syncCode);
        if (!res.success) {
          setError(res.error || 'Invalid sync code');
        } else {
          setSuccessMsg('Device connected! Library synced.');
          setTimeout(() => onClose(), 800);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-600/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Cross-Device Sync</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Access your bookmarks & reading history from any phone, tablet, or PC!
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              tab === 'login' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              tab === 'register' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('code');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
              tab === 'code' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3 h-3" />
            <span>Sync Code</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs font-medium">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab !== 'code' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Enter 6-Digit Device Sync Code</span>
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={syncCode}
                  onChange={(e) => setSyncCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 7X8K2P"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-center uppercase text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-2">
                Get this 6-digit code from your profile on another logged-in device to connect instantly!
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/25 transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {tab === 'login'
                ? 'Sign In & Sync'
                : tab === 'register'
                ? 'Create Account & Sync'
                : 'Connect Device'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { BookmarkItem, HistoryItem, ReaderSettings } from '@/types/manga';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  syncCode: string;
  createdAt: number;
  updatedAt: number;
  bookmarks: BookmarkItem[];
  history: HistoryItem[];
  settings?: ReaderSettings;
}

// In local dev, store in <workspace>/data/users.json. In Vercel serverless, fallback to /tmp/users.json
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const JWT_SECRET = process.env.AUTH_SECRET || 'mangaverse-super-secure-token-secret-2026';

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
    }
  } catch (err) {
    console.error('Error ensuring data file:', err);
  }
}

function getAllUsers(): UserAccount[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed.users || [];
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

function saveAllUsers(users: UserAccount[]): void {
  ensureDataFile();
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users file:', err);
  }
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSyncCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function signAuthToken(payload: { id: string; username: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyAuthToken(token: string): { id: string; username: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const decodedBody = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (decodedBody.exp && Date.now() > decodedBody.exp) {
      return null; // Expired
    }

    return { id: decodedBody.id, username: decodedBody.username };
  } catch {
    return null;
  }
}

export function findUserByUsername(username: string): UserAccount | null {
  const users = getAllUsers();
  return users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase()) || null;
}

export function findUserById(id: string): UserAccount | null {
  const users = getAllUsers();
  return users.find((u) => u.id === id) || null;
}

export function findUserBySyncCode(code: string): UserAccount | null {
  const users = getAllUsers();
  return users.find((u) => u.syncCode.toUpperCase() === code.trim().toUpperCase()) || null;
}

export function createUser(username: string, password: string): UserAccount {
  const cleanUsername = username.trim();
  const existing = findUserByUsername(cleanUsername);
  if (existing) {
    throw new Error('Username is already taken');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const syncCode = generateSyncCode();

  const newUser: UserAccount = {
    id: `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    username: cleanUsername,
    passwordHash,
    salt,
    syncCode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    bookmarks: [],
    history: [],
  };

  const users = getAllUsers();
  users.push(newUser);
  saveAllUsers(users);

  return newUser;
}

export function updateUserLibrary(
  userId: string,
  data: {
    bookmarks?: BookmarkItem[];
    history?: HistoryItem[];
    settings?: ReaderSettings;
  }
): UserAccount {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    throw new Error('User not found');
  }

  const user = users[idx];
  if (data.bookmarks) user.bookmarks = data.bookmarks;
  if (data.history) user.history = data.history;
  if (data.settings) user.settings = data.settings;
  user.updatedAt = Date.now();

  users[idx] = user;
  saveAllUsers(users);

  return user;
}

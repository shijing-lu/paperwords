/**
 * PaperWords Local Multi-Tenant & User Profile Engine
 * Manages user identities, local tenant isolation, and data portability (export/import)
 */

import { db } from '../db';
import type { UserProfile, DeckItem, WordItem, ArticleItem } from '../types';

const STORAGE_CURRENT_USER_KEY = 'paperwords_current_user_id';

const AVATAR_EMOJIS = ['🦉', '🦊', '📖', '🚀', '💡', '🌱', '☕', '🎯', '⚡', '🧠'];

/**
 * Generate a short random ID
 */
export function generateShortId(prefix = 'u'): string {
  const randomStr = Math.random().toString(36).substring(2, 8);
  const timeStr = Date.now().toString(36).slice(-4);
  return `${prefix}_${randomStr}${timeStr}`;
}

/**
 * Get or initialize current active local user
 */
export async function getOrInitCurrentUser(): Promise<UserProfile> {
  const savedId = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
  if (savedId) {
    const existing = await db.users.get(savedId);
    if (existing) {
      // update lastActive
      await db.users.update(savedId, { lastActiveAt: Date.now() });
      return { ...existing, lastActiveAt: Date.now() };
    }
  }

  // Check if any user already exists in DB
  const allUsers = await db.users.toArray();
  if (allUsers.length > 0) {
    const primary = allUsers.sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, primary.id);
    return primary;
  }

  // Create brand new isolated guest user for this browser
  const newId = generateShortId('guest');
  const randomEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const newUser: UserProfile = {
    id: newId,
    nickname: `自律研友 #${randomNum}`,
    avatarEmoji: randomEmoji,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };

  await db.users.put(newUser);
  localStorage.setItem(STORAGE_CURRENT_USER_KEY, newId);
  return newUser;
}

/**
 * Create a new user profile
 */
export async function createNewUser(nickname: string, avatarEmoji?: string): Promise<UserProfile> {
  const id = generateShortId('user');
  const user: UserProfile = {
    id,
    nickname: nickname.trim() || `学习者 #${Math.floor(1000 + Math.random() * 9000)}`,
    avatarEmoji: avatarEmoji || AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)],
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
  await db.users.put(user);
  localStorage.setItem(STORAGE_CURRENT_USER_KEY, id);
  return user;
}

/**
 * Switch active user
 */
export async function switchUser(userId: string): Promise<void> {
  const target = await db.users.get(userId);
  if (!target) throw new Error('User not found');
  await db.users.update(userId, { lastActiveAt: Date.now() });
  localStorage.setItem(STORAGE_CURRENT_USER_KEY, userId);
}

/**
 * Update user nickname or avatar
 */
export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  await db.users.update(userId, { ...data, lastActiveAt: Date.now() });
}

/**
 * Delete a user and cascade clean their private decks and words
 */
export async function deleteUserAndData(userId: string): Promise<void> {
  await db.transaction('rw', db.users, db.decks, db.words, db.articles, async () => {
    await db.words.where({ userId }).delete();
    await db.decks.where({ userId }).delete();
    await db.articles.where({ userId }).delete();
    await db.users.delete(userId);
  });
}

/**
 * Export all personal data (decks, words, review states) as a backup JSON bundle
 */
export async function exportUserDataBundle(userId: string): Promise<string> {
  const user = await db.users.get(userId);
  const decks = await db.decks.where({ userId }).toArray();
  const words = await db.words.where({ userId }).toArray();
  const articles = await db.articles.where({ userId }).toArray();

  const bundle = {
    version: '1.0',
    exportTime: Date.now(),
    user,
    decks,
    words,
    articles,
  };

  return JSON.stringify(bundle, null, 2);
}

/**
 * Import a backup JSON bundle and restore to current user
 */
export async function importUserDataBundle(targetUserId: string, jsonContent: string): Promise<{ decksCount: number; wordsCount: number }> {
  const data = JSON.parse(jsonContent);
  if (!Array.isArray(data.decks) || !Array.isArray(data.words)) {
    throw new Error('无效的备份数据包格式');
  }

  const newDecks: DeckItem[] = data.decks.map((d: DeckItem) => ({
    ...d,
    userId: targetUserId,
    updatedAt: Date.now(),
  }));

  const newWords: WordItem[] = data.words.map((w: WordItem) => ({
    ...w,
    userId: targetUserId,
  }));

  await db.transaction('rw', db.decks, db.words, async () => {
    await db.decks.bulkPut(newDecks);
    await db.words.bulkPut(newWords);
  });

  return {
    decksCount: newDecks.length,
    wordsCount: newWords.length,
  };
}

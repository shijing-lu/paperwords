import Dexie, { type Table } from 'dexie';
import type { DeckItem, WordItem, ArticleItem, UserProfile, ArticleFolder } from '../types';

export interface CachedDictEntry {
  word: string;
  phonetic?: string;
  definition: string;
  pos?: string;
  tags?: string[];
  updatedAt: number;
}

export class PaperWordsDatabase extends Dexie {
  users!: Table<UserProfile, string>;
  decks!: Table<DeckItem, string>;
  words!: Table<WordItem, string>;
  articles!: Table<ArticleItem, string>;
  articleFolders!: Table<ArticleFolder, string>;
  dictionaryCache!: Table<CachedDictEntry, string>;

  constructor() {
    super('PaperWordsDB');
    this.version(1).stores({
      decks: 'id, title, createdAt, updatedAt',
      words: 'id, deckId, listIndex, [deckId+listIndex], word, [deckId+reviewState.status]',
    });
    this.version(2).stores({
      decks: 'id, title, createdAt, updatedAt',
      words: 'id, deckId, listIndex, [deckId+listIndex], word, [deckId+reviewState.status]',
      articles: 'id, title, createdAt, updatedAt',
    });
    this.version(3).stores({
      decks: 'id, title, createdAt, updatedAt',
      words: 'id, deckId, listIndex, [deckId+listIndex], word, [deckId+reviewState.status]',
      articles: 'id, title, createdAt, updatedAt',
      dictionaryCache: 'word, updatedAt',
    });
    this.version(4).stores({
      users: 'id, nickname, lastActiveAt',
      decks: 'id, userId, [userId+createdAt], title',
      words: 'id, userId, deckId, [userId+deckId], [userId+deckId+listIndex], [userId+deckId+reviewState.status]',
      articles: 'id, userId, createdAt',
      dictionaryCache: 'word, updatedAt',
    }).upgrade(async (tx) => {
      // 兼容历史老数据：自动为已有记录填充默认用户 ID
      const defaultUserId = 'user_legacy';
      await tx.table('decks').toCollection().modify((deck: any) => {
        if (!deck.userId) deck.userId = defaultUserId;
      });
      await tx.table('words').toCollection().modify((word: any) => {
        if (!word.userId) word.userId = defaultUserId;
      });
      await tx.table('articles').toCollection().modify((art: any) => {
        if (!art.userId) art.userId = defaultUserId;
      });
    });
    this.version(5).stores({
      users: 'id, nickname, lastActiveAt',
      decks: 'id, userId, [userId+createdAt], title',
      words: 'id, userId, deckId, [userId+deckId], [userId+deckId+listIndex], [userId+deckId+reviewState.status]',
      articles: 'id, userId, folderId, [userId+folderId], createdAt',
      articleFolders: 'id, userId, [userId+createdAt], name',
      dictionaryCache: 'word, updatedAt',
    });
  }
}

export const db = new PaperWordsDatabase();

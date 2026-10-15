import Dexie, { type Table } from 'dexie';
import type { DeckItem, WordItem, ArticleItem } from '../types';

export interface CachedDictEntry {
  word: string;
  phonetic?: string;
  definition: string;
  pos?: string;
  tags?: string[];
  updatedAt: number;
}

export class PaperWordsDatabase extends Dexie {
  decks!: Table<DeckItem, string>;
  words!: Table<WordItem, string>;
  articles!: Table<ArticleItem, string>;
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
  }
}

export const db = new PaperWordsDatabase();

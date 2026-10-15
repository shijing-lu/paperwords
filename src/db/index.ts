import Dexie, { type Table } from 'dexie';
import type { DeckItem, WordItem, ArticleItem } from '../types';

export class PaperWordsDatabase extends Dexie {
  decks!: Table<DeckItem, string>;
  words!: Table<WordItem, string>;
  articles!: Table<ArticleItem, string>;

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
  }
}

export const db = new PaperWordsDatabase();

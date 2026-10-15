/**
 * Comprehensive English-Chinese Dictionary Engine
 * Features:
 * 1. Fast offline local dictionary (16,800+ vocabulary covering Gaokao, CET4/6, Kaoyan, IELTS, TOEFL, TEM4/8)
 * 2. Morphological Lemmatization (e.g. 'bodies' -> 'body', 'governing' -> 'govern')
 * 3. Dexie indexed persistence cache for dynamic lookups
 * 4. Fallback public dictionary API for rare/unindexed terms
 */

import { db } from '../db';
import { getLemmatizedCandidates } from './lemmatizer';

export interface DictLookupResult {
  word: string; // Matched headword
  rawWord: string; // The original clicked word form
  lemma?: string; // Stem/root if lemmatized (e.g. 'body' when querying 'bodies')
  phonetic?: string;
  definition: string;
  pos?: string;
  tags?: string[];
  source: 'local' | 'cache' | 'online';
}

// In-memory cache for fast lookup
// Tuple format: [headword, phonetic, definition, tagsCsv]
type DictEntry = [string, string, string, string];
let localDictMap: Map<string, DictEntry> | null = null;
let dictLoadingPromise: Promise<Map<string, DictEntry>> | null = null;

/**
 * Preload or lazily load the 16,800+ word dictionary
 */
export async function loadDictionary(): Promise<Map<string, DictEntry>> {
  if (localDictMap) return localDictMap;
  if (dictLoadingPromise) return dictLoadingPromise;

  dictLoadingPromise = (async () => {
    try {
      const res = await fetch('/dict/words_dictionary.json');
      if (!res.ok) {
        console.warn('Failed to load words_dictionary.json:', res.statusText);
        localDictMap = new Map();
        return localDictMap;
      }
      const data: Record<string, DictEntry> = await res.json();
      const map = new Map<string, DictEntry>();
      for (const [key, val] of Object.entries(data)) {
        map.set(key.toLowerCase(), val);
      }
      localDictMap = map;
      return localDictMap;
    } catch (e) {
      console.error('Error parsing words_dictionary.json:', e);
      localDictMap = new Map();
      return localDictMap;
    } finally {
      dictLoadingPromise = null;
    }
  })();

  return dictLoadingPromise;
}

/**
 * Fetch online definition from free dictionary services if local dictionary misses
 */
async function fetchOnlineDefinition(word: string): Promise<DictLookupResult | null> {
  try {
    // 1. Try Free Dictionary API (English definitions and phonetics)
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    const phonetic = first.phonetic || (first.phonetics && first.phonetics.find((p: any) => p.text)?.text);
    const meanings = first.meanings || [];
    
    const defParts: string[] = [];
    for (const m of meanings.slice(0, 3)) {
      const partOfSpeech = m.partOfSpeech ? `${m.partOfSpeech}. ` : '';
      const defs = (m.definitions || []).slice(0, 2).map((d: any) => d.definition).join('; ');
      if (defs) {
        defParts.push(`${partOfSpeech}${defs}`);
      }
    }

    if (defParts.length === 0) return null;

    const defString = defParts.join(' | ');

    // Cache into IndexedDB for subsequent instant offline hits
    await db.dictionaryCache.put({
      word: word.toLowerCase(),
      phonetic: phonetic || '',
      definition: defString,
      updatedAt: Date.now(),
    });

    return {
      word: first.word || word,
      rawWord: word,
      phonetic: phonetic || '',
      definition: defString,
      source: 'online',
    };
  } catch (err) {
    return null;
  }
}

/**
 * Primary lookup function:
 * 1. Clean token
 * 2. Generate lemmatized candidates
 * 3. Search local 16.8k dictionary
 * 4. Search IndexedDB cache
 * 5. Search online fallback
 */
export async function lookupDictionary(rawWord: string): Promise<DictLookupResult | null> {
  const cleaned = rawWord.replace(/^[^\w]+|[^\w]+$/g, '').trim().toLowerCase();
  if (!cleaned) return null;

  // 1. Ensure local dictionary is loaded
  const dict = await loadDictionary();

  // 2. Generate candidate root words (e.g. bodies -> [bodies, body])
  const candidates = getLemmatizedCandidates(cleaned);

  // 3. Match against local dictionary
  for (const candidate of candidates) {
    const entry = dict.get(candidate);
    if (entry) {
      const isInflected = candidate !== cleaned;
      return {
        word: entry[0],
        rawWord,
        lemma: isInflected ? entry[0] : undefined,
        phonetic: entry[1] || undefined,
        definition: entry[2],
        tags: entry[3] ? entry[3].split(',').filter(Boolean) : [],
        source: 'local',
      };
    }
  }

  // 4. Match against IndexedDB cached lookups
  for (const candidate of candidates) {
    try {
      const cached = await db.dictionaryCache.get(candidate);
      if (cached) {
        const isInflected = candidate !== cleaned;
        return {
          word: cached.word,
          rawWord,
          lemma: isInflected ? cached.word : undefined,
          phonetic: cached.phonetic,
          definition: cached.definition,
          pos: cached.pos,
          tags: cached.tags,
          source: 'cache',
        };
      }
    } catch (e) {
      // IndexedDB query error ignored
    }
  }

  // 5. Online lookup fallback
  const onlineResult = await fetchOnlineDefinition(cleaned);
  if (onlineResult) return onlineResult;

  // Try candidate stems online as well if inflected
  if (candidates.length > 1) {
    const stemOnlineResult = await fetchOnlineDefinition(candidates[1]);
    if (stemOnlineResult) {
      stemOnlineResult.rawWord = rawWord;
      stemOnlineResult.lemma = candidates[1];
      return stemOnlineResult;
    }
  }

  return null;
}

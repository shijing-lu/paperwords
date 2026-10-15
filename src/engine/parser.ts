import type { WordItem, ReviewState } from '../types';

export interface ParseResult {
  title: string;
  words: Omit<WordItem, 'id' | 'deckId' | 'userId'>[];
  totalCount: number;
  detectedFormat: 'json' | 'eudic' | 'maimemo' | 'csv' | 'text';
}

function createInitialReviewState(): ReviewState {
  return {
    repetition: 0,
    interval: 0,
    easeFactor: 2.5,
    lastReviewDate: 0,
    nextReviewDate: Date.now(), // 初始随时可复习
    lapses: 0,
    status: 'new',
  };
}

export function parseWordFile(content: string, fileName: string, wordsPerList = 30): ParseResult {
  const trimmed = content.trim();
  const baseName = fileName.replace(/\.[^/.]+$/, '');

  // 1. 尝试解析为 JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      return parseJsonData(data, baseName, wordsPerList);
    } catch {
      // JSON 解析失败则回退到纯文本/CSV 解析
    }
  }

  // 2. 尝试解析 CSV / TSV / 欧路 / 墨墨
  return parseDelimitedText(trimmed, baseName, wordsPerList);
}

function parseJsonData(data: unknown, baseName: string, wordsPerList: number): ParseResult {
  const rawList: Array<{
    word: string;
    phonetic?: string;
    pos?: string;
    definition: string;
    examples?: string[];
    tags?: string[];
  }> = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === 'string') {
        rawList.push({ word: item.trim(), definition: '（暂无释义）' });
      } else if (typeof item === 'object' && item !== null) {
        const anyItem = item as Record<string, unknown>;
        const word = String(anyItem.word || anyItem.name || anyItem.key || '').trim();
        if (!word) continue;

        const definition = String(
          anyItem.definition ||
          anyItem.trans ||
          anyItem.translation ||
          anyItem.meaning ||
          anyItem.chinese ||
          anyItem.explain ||
          ''
        ).trim();

        const phonetic = anyItem.phonetic || anyItem.pronounce || anyItem.ipa ? String(anyItem.phonetic || anyItem.pronounce || anyItem.ipa) : undefined;
        const pos = anyItem.pos || anyItem.partOfSpeech ? String(anyItem.pos || anyItem.partOfSpeech) : undefined;
        
        let examples: string[] | undefined;
        if (Array.isArray(anyItem.examples)) {
          examples = anyItem.examples.map(String);
        } else if (typeof anyItem.example === 'string') {
          examples = [anyItem.example];
        }

        const tags = Array.isArray(anyItem.tags) ? anyItem.tags.map(String) : undefined;

        rawList.push({
          word,
          phonetic,
          pos,
          definition: definition || '（暂无释义）',
          examples,
          tags,
        });
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    // 字典映射结构 { "apple": "苹果", "banana": { "trans": "香蕉" } }
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const word = key.trim();
      if (!word) continue;
      if (typeof val === 'string') {
        rawList.push({ word, definition: val.trim() });
      } else if (typeof val === 'object' && val !== null) {
        const obj = val as Record<string, unknown>;
        const definition = String(obj.definition || obj.trans || obj.translation || obj.meaning || '').trim();
        rawList.push({
          word,
          phonetic: obj.phonetic ? String(obj.phonetic) : undefined,
          pos: obj.pos ? String(obj.pos) : undefined,
          definition: definition || '（暂无释义）',
        });
      }
    }
  }

  return formatIntoA4Lists(rawList, baseName, wordsPerList, 'json');
}

function parseDelimitedText(text: string, baseName: string, wordsPerList: number): ParseResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
  const rawList: Array<{
    word: string;
    phonetic?: string;
    pos?: string;
    definition: string;
  }> = [];

  let detectedFormat: ParseResult['detectedFormat'] = 'text';

  // 检查首行是否包含表头
  let startIndex = 0;
  if (lines.length > 0) {
    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes('word') ||
      firstLineLower.includes('单词') ||
      firstLineLower.includes('spelling')
    ) {
      startIndex = 1;
      if (firstLineLower.includes('eudic') || firstLineLower.includes('欧路')) {
        detectedFormat = 'eudic';
      } else if (firstLineLower.includes('maimemo') || firstLineLower.includes('墨墨')) {
        detectedFormat = 'maimemo';
      } else {
        detectedFormat = 'csv';
      }
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    // 格式识别优先级: 制表符 Tab -> 欧路特殊分割符 (@) -> 逗号/分号 -> 连续空格
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t').map(s => s.trim());
      if (detectedFormat === 'text') detectedFormat = 'eudic';
    } else if (line.includes('@')) {
      // 欧路导出常带有单词@释义
      parts = line.split('@').map(s => s.trim());
      detectedFormat = 'eudic';
    } else if (line.includes(',')) {
      // 简单 CSV 分割（支持双引号容错）
      parts = parseCsvLine(line);
      if (detectedFormat === 'text') detectedFormat = 'csv';
    } else {
      // 单独以空格或首个中文分界
      const match = line.match(/^([a-zA-Z\s\-']+?)\s+([\[/].*?[\]/])?\s*(.*)$/);
      if (match) {
        const word = match[1]?.trim() || '';
        const phonetic = match[2]?.trim() || '';
        const def = match[3]?.trim() || '';
        parts = [word, phonetic, def].filter(Boolean);
      } else {
        parts = [line];
      }
    }

    if (parts.length === 0) continue;
    const word = parts[0].replace(/^["']|["']$/g, '').trim();
    if (!word) continue;

    let phonetic: string | undefined;
    let definition = '';

    if (parts.length === 2) {
      definition = parts[1].replace(/^["']|["']$/g, '').trim();
    } else if (parts.length >= 3) {
      // 判断第 2 项是音标还是释义
      if (parts[1].startsWith('/') || parts[1].startsWith('[') || /^[a-zA-Zːˈˌɪeæɑɒɔʊuʌɜə]+$/.test(parts[1])) {
        phonetic = parts[1];
        definition = parts.slice(2).join('; ');
      } else {
        definition = parts.slice(1).join('; ');
      }
    } else {
      definition = '（暂无释义）';
    }

    rawList.push({
      word,
      phonetic,
      definition: definition || '（暂无释义）',
    });
  }

  return formatIntoA4Lists(rawList, baseName, wordsPerList, detectedFormat);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function formatIntoA4Lists(
  rawList: Array<{
    word: string;
    phonetic?: string;
    pos?: string;
    definition: string;
    examples?: string[];
    tags?: string[];
  }>,
  baseName: string,
  wordsPerList: number,
  detectedFormat: ParseResult['detectedFormat']
): ParseResult {
  const words: Omit<WordItem, 'id' | 'deckId' | 'userId'>[] = rawList.map((item, index) => {
    const listIndex = Math.floor(index / wordsPerList) + 1;
    const order = (index % wordsPerList) + 1;

    return {
      listIndex,
      order,
      word: item.word,
      phonetic: item.phonetic,
      pos: item.pos,
      definition: item.definition,
      examples: item.examples,
      tags: item.tags,
      reviewState: createInitialReviewState(),
    };
  });

  return {
    title: baseName || '新导入词书',
    words,
    totalCount: words.length,
    detectedFormat,
  };
}

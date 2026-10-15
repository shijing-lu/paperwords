import type { WordItem } from '../types';

export interface WordToken {
  text: string;
  isWord: boolean;
  cleanWord: string;
  matchedWord?: WordItem;
}

export interface SentenceChunk {
  index: number;
  text: string;
  tokens: WordToken[];
  hasTargetWords: boolean;
}

export interface ParagraphBlock {
  sentences: SentenceChunk[];
}

// 快速词根还原器 (去除常见单复数与时态后缀)
function getBaseForms(word: string): string[] {
  const lower = word.toLowerCase();
  const forms = [lower];

  // s / es 复数
  if (lower.endsWith('ies') && lower.length > 4) {
    forms.push(lower.slice(0, -3) + 'y');
  } else if (lower.endsWith('es') && lower.length > 3) {
    forms.push(lower.slice(0, -2));
    forms.push(lower.slice(0, -1));
  } else if (lower.endsWith('s') && lower.length > 2) {
    forms.push(lower.slice(0, -1));
  }

  // ed 过去式
  if (lower.endsWith('ied') && lower.length > 4) {
    forms.push(lower.slice(0, -3) + 'y');
  } else if (lower.endsWith('ed') && lower.length > 3) {
    forms.push(lower.slice(0, -2));
    forms.push(lower.slice(0, -1)); // 如 created -> create
  }

  // ing 进行时
  if (lower.endsWith('ing') && lower.length > 4) {
    forms.push(lower.slice(0, -3));
    forms.push(lower.slice(0, -3) + 'e'); // 如 innovating -> innovate
  }

  // ly 副词
  if (lower.endsWith('ly') && lower.length > 3) {
    forms.push(lower.slice(0, -2));
  }

  return forms;
}

export function parseArticleToParagraphs(
  content: string,
  wordMap: Map<string, WordItem>
): { paragraphs: ParagraphBlock[]; totalTargetHits: number } {
  const rawParagraphs = content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  let globalSentenceIdx = 0;
  let totalTargetHits = 0;

  const paragraphs: ParagraphBlock[] = rawParagraphs.map((paraText) => {
    // 按照句号、问号、感叹号分句（保留句尾标点）
    const rawSentences = paraText
      .match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g)
      ?.map((s) => s.trim())
      .filter(Boolean) || [paraText];

    const sentences: SentenceChunk[] = rawSentences.map((sentText) => {
      // 词法拆分 (保留空格与标点)
      const tokenMatches = sentText.match(/([a-zA-Z0-9'-]+)|([^a-zA-Z0-9'-]+)/g) || [];
      let sentHasTarget = false;

      const tokens: WordToken[] = tokenMatches.map((tokenStr) => {
        const isWord = /^[a-zA-Z0-9'-]+$/.test(tokenStr);
        if (!isWord) {
          return {
            text: tokenStr,
            isWord: false,
            cleanWord: '',
          };
        }

        const candidates = getBaseForms(tokenStr);
        let matched: WordItem | undefined;
        for (const cand of candidates) {
          if (wordMap.has(cand)) {
            matched = wordMap.get(cand);
            break;
          }
        }

        if (matched) {
          sentHasTarget = true;
          totalTargetHits += 1;
        }

        return {
          text: tokenStr,
          isWord: true,
          cleanWord: tokenStr.toLowerCase(),
          matchedWord: matched,
        };
      });

      const chunk: SentenceChunk = {
        index: globalSentenceIdx++,
        text: sentText,
        tokens,
        hasTargetWords: sentHasTarget,
      };

      return chunk;
    });

    return { sentences };
  });

  return { paragraphs, totalTargetHits };
}

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

import { getLemmatizedCandidates } from './lemmatizer';

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

        const candidates = getLemmatizedCandidates(tokenStr);
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

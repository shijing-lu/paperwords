import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Plus, Check, X, Loader2, Sparkles, Tag } from 'lucide-react';
import type { WordItem } from '../../types';
import { speechEngine } from '../../engine/speech';
import { lookupDictionary, type DictLookupResult } from '../../engine/dictionary';

interface WordPopoverProps {
  word: string;
  matchedWordItem?: WordItem;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onAddToDeck: (word: string, definition: string, phonetic?: string) => void;
  isInDeck: boolean;
}

export const WordPopover: React.FC<WordPopoverProps> = ({
  word,
  matchedWordItem,
  position,
  onClose,
  onAddToDeck,
  isInDeck,
}) => {
  const [dictResult, setDictResult] = useState<DictLookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    // If already in deck with full definition, we can still load dictionary tags/details
    async function query() {
      setIsLoading(true);
      try {
        const res = await lookupDictionary(word);
        if (!isCancelled) {
          setDictResult(res);
        }
      } catch (e) {
        console.error('Dict lookup error:', e);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    query();

    return () => {
      isCancelled = true;
    };
  }, [word]);

  if (!position) return null;

  const handlePronounce = () => {
    speechEngine.speak(dictResult?.lemma || word);
  };

  const finalPhonetic = matchedWordItem?.phonetic || dictResult?.phonetic;
  const finalDefinition =
    matchedWordItem?.definition || dictResult?.definition || (isLoading ? '正在权威词库与形态库中检索...' : '未收录此词条');

  return (
    <AnimatePresence>
      <div
        className="fixed z-50 transform -translate-x-1/2"
        style={{ left: `${position.x}px`, top: `${position.y + 12}px` }}
      >
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.95 }}
          className="bg-white/95 backdrop-blur-md border border-stone-300 rounded-lg shadow-xl p-3 w-72 text-xs text-stone-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-1.5 border-b border-stone-200">
            <div>
              <div className="flex items-baseline flex-wrap gap-1.5">
                <span className="font-bold text-sm text-stone-900 font-sans">{word}</span>
                {dictResult?.lemma && dictResult.lemma.toLowerCase() !== word.toLowerCase() && (
                  <span className="text-[11px] font-mono px-1 py-0.2 bg-amber-50 text-amber-800 rounded border border-amber-200">
                    原形: {dictResult.lemma}
                  </span>
                )}
                {finalPhonetic && (
                  <span className="font-serif-academic italic text-[11px] text-stone-500">
                    {finalPhonetic}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePronounce}
                title="发音"
                className="p-1 text-stone-400 hover:text-amber-700 hover:bg-stone-100 rounded"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Tags */}
          {dictResult?.tags && dictResult.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1.5 pb-0.5">
              {dictResult.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-stone-100 text-stone-600 border border-stone-200"
                >
                  <Tag className="w-2 h-2 text-stone-400" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Definition */}
          <div className="py-2 text-stone-700 leading-relaxed min-h-[38px] flex items-center">
            {isLoading && !dictResult && !matchedWordItem ? (
              <div className="flex items-center gap-1.5 text-stone-400 italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                <span>检索词典与词形还原中...</span>
              </div>
            ) : (
              <div>
                {matchedWordItem?.pos && (
                  <span className="font-serif italic text-stone-500 mr-1">
                    {matchedWordItem.pos}
                  </span>
                )}
                <span>{finalDefinition}</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
            {isInDeck ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                <Check className="w-3 h-3 text-emerald-600" />
                已在复习词库中
              </span>
            ) : (
              <button
                disabled={isLoading && !dictResult && !matchedWordItem}
                onClick={() => {
                  const targetWord = dictResult?.lemma || word;
                  const defToStore =
                    finalDefinition && finalDefinition !== '未收录此词条'
                      ? finalDefinition
                      : '阅读提取生词';
                  onAddToDeck(targetWord, defToStore, finalPhonetic);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded text-[11px] font-medium shadow-2xs transition"
              >
                <Plus className="w-3 h-3" />
                收入艾宾浩斯复习池
              </button>
            )}

            {dictResult?.source && (
              <span className="text-[9px] text-stone-400 font-serif">
                {dictResult.source === 'local' ? '离线词典' : dictResult.source === 'cache' ? '本地缓存' : '网络词库'}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

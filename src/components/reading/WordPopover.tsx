import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Plus, Check, X } from 'lucide-react';
import type { WordItem } from '../../types';
import { speechEngine } from '../../engine/speech';

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
  if (!position) return null;

  const handlePronounce = () => {
    speechEngine.speak(word);
  };

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
          className="bg-white/95 backdrop-blur-md border border-stone-300 rounded-lg shadow-xl p-3 w-64 text-xs text-stone-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-1.5 border-b border-stone-200">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-sm text-stone-900 font-sans">{word}</span>
                {matchedWordItem?.phonetic && (
                  <span className="font-serif-academic italic text-[11px] text-stone-500">
                    {matchedWordItem.phonetic}
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

          {/* Definition */}
          <div className="py-2 text-stone-700 leading-relaxed">
            {matchedWordItem ? (
              <div>
                {matchedWordItem.pos && (
                  <span className="font-serif italic text-stone-500 mr-1">
                    {matchedWordItem.pos}
                  </span>
                )}
                <span>{matchedWordItem.definition}</span>
              </div>
            ) : (
              <span className="text-stone-400 italic">（词库暂无释义，点击下方直接加入生词池）</span>
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
                onClick={() => {
                  onAddToDeck(word, matchedWordItem?.definition || '阅读提取生词', matchedWordItem?.phonetic);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-[11px] font-medium shadow-2xs transition"
              >
                <Plus className="w-3 h-3" />
                收入艾宾浩斯复习池
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

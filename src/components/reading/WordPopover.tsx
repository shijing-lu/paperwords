import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Plus, Check, X, Loader2, Sparkles, Tag } from 'lucide-react';
import type { WordItem } from '../../types';
import { speechEngine } from '../../engine/speech';
import { lookupDictionary, type DictLookupResult } from '../../engine/dictionary';

export interface WordTargetRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface WordPopoverProps {
  word: string;
  matchedWordItem?: WordItem;
  targetRect?: WordTargetRect | null;
  position?: { x: number; y: number } | null;
  onClose: () => void;
  onAddToDeck: (word: string, definition: string, phonetic?: string) => void;
  isInDeck: boolean;
}

export const WordPopover: React.FC<WordPopoverProps> = ({
  word,
  matchedWordItem,
  targetRect,
  position,
  onClose,
  onAddToDeck,
  isInDeck,
}) => {
  const [dictResult, setDictResult] = useState<DictLookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

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

  // 动态计算智能跟随单词的位置（始终紧贴选中的单词，杜绝掉到屏幕底部或溢出屏幕）
  const popoverPos = useMemo(() => {
    const POPOVER_WIDTH = 300;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 优先根据 DOM Rect 计算相对视口位置
    if (targetRect) {
      const wordCenterX = targetRect.left + targetRect.width / 2;
      let left = wordCenterX - POPOVER_WIDTH / 2;

      // 视口水平边缘安全约束
      if (left < 14) left = 14;
      if (left + POPOVER_WIDTH > viewportWidth - 14) {
        left = Math.max(14, viewportWidth - POPOVER_WIDTH - 14);
      }

      // 垂直空间判断：如果下方空间不足 220px 且上方更宽裕，则向上弹出
      const spaceBelow = viewportHeight - targetRect.bottom;
      const spaceAbove = targetRect.top;
      const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;

      if (placeAbove) {
        return {
          left,
          top: undefined,
          bottom: viewportHeight - targetRect.top + 8,
          isAbove: true,
        };
      }

      return {
        left,
        top: targetRect.bottom + 8,
        bottom: undefined,
        isAbove: false,
      };
    }

    // 备用 fallback（修复了 position 加上 window.scrollY 导致的 fixed 错位问题）
    if (position) {
      let left = position.x - POPOVER_WIDTH / 2;
      if (left < 14) left = 14;
      if (left + POPOVER_WIDTH > viewportWidth - 14) {
        left = Math.max(14, viewportWidth - POPOVER_WIDTH - 14);
      }

      // 如果调用方误传了带 scrollY 的坐标，纠正为相对于当前视口的坐标
      const viewportY = position.y > viewportHeight ? position.y - window.scrollY : position.y;
      const top = Math.min(viewportHeight - 200, Math.max(14, viewportY + 8));

      return {
        left,
        top,
        bottom: undefined,
        isAbove: false,
      };
    }

    return null;
  }, [targetRect, position]);

  if (!popoverPos) return null;

  const handlePronounce = () => {
    speechEngine.speak(dictResult?.lemma || word);
  };

  const finalPhonetic = matchedWordItem?.phonetic || dictResult?.phonetic;
  const finalDefinition =
    matchedWordItem?.definition ||
    dictResult?.definition ||
    (isLoading ? '正在权威词库与形态库中检索...' : '未收录此词条');

  return (
    <AnimatePresence>
      <div
        className="fixed z-50 pointer-events-auto"
        style={{
          left: `${popoverPos.left}px`,
          top: popoverPos.top !== undefined ? `${popoverPos.top}px` : undefined,
          bottom: popoverPos.bottom !== undefined ? `${popoverPos.bottom}px` : undefined,
          width: '300px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: popoverPos.isAbove ? 6 : -6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: popoverPos.isAbove ? 6 : -6, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="bg-white/95 backdrop-blur-md border border-stone-300 rounded-xl shadow-2xl p-3.5 w-full text-xs text-stone-800 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-2 border-b border-stone-200">
            <div>
              <div className="flex items-baseline flex-wrap gap-1.5">
                <span className="font-bold text-sm text-stone-900 font-sans tracking-tight">
                  {word}
                </span>
                {dictResult?.lemma && dictResult.lemma.toLowerCase() !== word.toLowerCase() && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded border border-amber-200">
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

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handlePronounce}
                title="发音"
                className="p-1 text-stone-400 hover:text-amber-700 hover:bg-stone-100 rounded-md transition"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition"
              >
                <X className="w-3.5 h-3.5" />
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
          <div className="py-2.5 text-stone-700 leading-relaxed min-h-[40px] flex items-center text-xs">
            {isLoading && !dictResult && !matchedWordItem ? (
              <div className="flex items-center gap-1.5 text-stone-400 italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                <span>检索词典与词形还原中...</span>
              </div>
            ) : (
              <div>
                {matchedWordItem?.pos && (
                  <span className="font-serif italic font-semibold text-stone-500 mr-1.5">
                    {matchedWordItem.pos}
                  </span>
                )}
                <span className="font-sans font-medium text-stone-900 leading-normal">
                  {finalDefinition}
                </span>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
            {isInDeck ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                已在复习词库中
              </span>
            ) : (
              <button
                type="button"
                disabled={isLoading && !dictResult && !matchedWordItem}
                onClick={() => {
                  const targetWord = dictResult?.lemma || word;
                  const defToStore =
                    finalDefinition && finalDefinition !== '未收录此词条'
                      ? finalDefinition
                      : '阅读提取生词';
                  onAddToDeck(targetWord, defToStore, finalPhonetic);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-md text-[11px] font-medium shadow-2xs transition"
              >
                <Plus className="w-3 h-3" />
                收入艾宾浩斯复习池
              </button>
            )}

            {dictResult?.source && (
              <span className="text-[10px] text-stone-400 font-serif">
                {dictResult.source === 'local' ? '本地词典' : dictResult.source === 'cache' ? '缓存' : '在线检索'}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

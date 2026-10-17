import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Plus, Check, X, Loader2, Sparkles, Tag, Bot } from 'lucide-react';
import type { WordItem } from '../../types';
import { speechEngine } from '../../engine/speech';
import { lookupDictionary, type DictLookupResult } from '../../engine/dictionary';
import { aiTranslateWord, isAIConfigured, type AIWordTranslationResult } from '../../engine/ai';
import { db } from '../../db';

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
  contextSentence?: string;
  targetRect?: WordTargetRect | null;
  position?: { x: number; y: number } | null;
  onClose: () => void;
  onAddToDeck: (word: string, definition: string, phonetic?: string) => void;
  isInDeck: boolean;
  onOpenAISettings?: (notice?: string) => void;
}

export const WordPopover: React.FC<WordPopoverProps> = ({
  word,
  matchedWordItem,
  contextSentence,
  targetRect,
  position,
  onClose,
  onAddToDeck,
  isInDeck,
  onOpenAISettings,
}) => {
  const [dictResult, setDictResult] = useState<DictLookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // AI 单词翻译状态
  const [aiResult, setAiResult] = useState<AIWordTranslationResult | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setAiResult(null);
    setAiError(null);

    async function query() {
      setIsLoading(true);
      try {
        // 最多检索 2.5 秒，超时自动返回 null，杜绝一直卡在检索中
        const res = await lookupDictionary(word, 2500);
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

  // 触发 AI 翻译
  const handleAITranslate = async () => {
    if (!isAIConfigured()) {
      onOpenAISettings?.('AI 单词翻译需配置 API Key，请先完成配置');
      return;
    }

    setIsAILoading(true);
    setAiError(null);

    try {
      const result = await aiTranslateWord(word, contextSentence);
      setAiResult(result);

      // 缓存入本地数据库，下次相同单词直接离线秒显
      await db.dictionaryCache.put({
        word: (result.lemma || result.word || word).toLowerCase(),
        phonetic: result.phonetic || '',
        pos: result.pos || '',
        definition: result.definition,
        updatedAt: Date.now(),
      });
    } catch (err: any) {
      console.error('AI Translate error:', err);
      setAiError(err.message || 'AI 翻译失败，请重试');
    } finally {
      setIsAILoading(false);
    }
  };

  const handlePronounce = () => {
    speechEngine.speak(aiResult?.lemma || dictResult?.lemma || word);
  };

  // 综合计算有效释义与展示数据
  const finalWord = aiResult?.word || dictResult?.word || word;
  const finalLemma = aiResult?.lemma || dictResult?.lemma;
  const finalPhonetic = matchedWordItem?.phonetic || aiResult?.phonetic || dictResult?.phonetic;
  const finalPos = matchedWordItem?.pos || aiResult?.pos || dictResult?.pos;

  const hasDefinition = Boolean(
    matchedWordItem?.definition || aiResult?.definition || dictResult?.definition
  );

  const finalDefinition =
    matchedWordItem?.definition ||
    aiResult?.definition ||
    dictResult?.definition ||
    '';

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
                  {finalWord}
                </span>
                {finalLemma && finalLemma.toLowerCase() !== finalWord.toLowerCase() && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded border border-amber-200">
                    原形: {finalLemma}
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

          {/* Definition / AI Translate Box */}
          <div className="py-2.5 text-stone-700 leading-relaxed min-h-[44px] flex items-center text-xs">
            {isLoading ? (
              // 1. 正在快速检索中 (2~3 秒内)
              <div className="flex items-center gap-1.5 text-stone-400 italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                <span>词典检索中...</span>
              </div>
            ) : hasDefinition ? (
              // 2. 已展示出释义（来自词典或已由 AI 翻译成功）
              <div className="w-full">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1">
                    {finalPos && (
                      <span className="font-serif italic font-semibold text-stone-500 mr-1.5">
                        {finalPos}
                      </span>
                    )}
                    <span className="font-sans font-medium text-stone-900 leading-normal">
                      {finalDefinition}
                    </span>
                  </div>

                  {aiResult && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-semibold font-mono">
                      <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                      AI 释义
                    </span>
                  )}
                </div>
              </div>
            ) : (
              // 3. 词典未收录/没显示出来：方框中醒目显示“AI翻译”按钮
              <div className="w-full py-0.5">
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="text-[11px] text-stone-600 font-medium">
                    词库暂未收录
                  </div>

                  <button
                    type="button"
                    onClick={handleAITranslate}
                    disabled={isAILoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-800 hover:bg-amber-900 active:scale-98 disabled:opacity-60 text-white rounded-md text-xs font-semibold shadow-2xs transition cursor-pointer"
                    title="点击调用 AI 解析该生词的准确释义与语境含义"
                  >
                    {isAILoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-200" />
                        <span>AI 解析中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>AI 翻译</span>
                      </>
                    )}
                  </button>
                </div>

                {aiError && (
                  <div className="mt-1.5 text-[10px] text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                    {aiError}
                  </div>
                )}
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
                disabled={isLoading || (!hasDefinition && !aiResult)}
                onClick={() => {
                  const targetWord = finalLemma || finalWord || word;
                  const defToStore =
                    finalDefinition && finalDefinition !== '未收录此词条'
                      ? finalDefinition
                      : '阅读提取生词';
                  onAddToDeck(targetWord, defToStore, finalPhonetic);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-md text-[11px] font-medium shadow-2xs transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                收入艾宾浩斯复习池
              </button>
            )}

            <span className="text-[10px] text-stone-400 font-serif">
              {aiResult
                ? 'AI 智能解析'
                : dictResult?.source === 'local'
                ? '本地词典'
                : dictResult?.source === 'cache'
                ? '本地缓存'
                : dictResult?.source === 'online'
                ? '在线检索'
                : ''}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

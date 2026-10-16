import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Sparkles,
  Volume2,
  Languages,
  X,
  Loader2,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ArticleItem, WordItem, ReadingModeType, SentenceAnalysisResult } from '../../types';
import { parseArticleToParagraphs, type SentenceChunk, type WordToken } from '../../engine/tokenizer';
import { speechEngine } from '../../engine/speech';
import { soundEffects } from '../../engine/soundEffects';
import { translateSentence } from '../../engine/translator';
import { aiAnalyzeSentenceSyntax, isAIConfigured } from '../../engine/ai';
import { WordPopover, type WordTargetRect } from './WordPopover';

interface ReadingReaderProps {
  article: ArticleItem;
  wordsInDeck: WordItem[];
  onOpenArticleDrawer?: () => void;
  onAddWordToDeck: (word: string, definition: string, phonetic?: string) => void;
  onOpenAISettings?: (notice?: string) => void;
}

export const ReadingReader: React.FC<ReadingReaderProps> = ({
  article,
  wordsInDeck,
  onOpenArticleDrawer,
  onAddWordToDeck,
  onOpenAISettings,
}) => {
  const [readingMode, setReadingMode] = useState<ReadingModeType>('focus');
  const [activeSentenceIdx, setActiveSentenceIdx] = useState(0);
  const [expandedTranslations, setExpandedTranslations] = useState<Map<number, string>>(new Map());
  const [loadingTranslations, setLoadingTranslations] = useState<Set<number>>(new Set());

  // AI 句子语法分析状态
  const [sentenceAnalyses, setSentenceAnalyses] = useState<Map<number, SentenceAnalysisResult>>(new Map());
  const [loadingAnalyses, setLoadingAnalyses] = useState<Set<number>>(new Set());
  const [analysisErrors, setAnalysisErrors] = useState<Map<number, string>>(new Map());

  const [popoverData, setPopoverData] = useState<{
    word: string;
    matchedWordItem?: WordItem;
    targetRect: WordTargetRect;
  } | null>(null);

  // 1. Build rapid Map lookup for deck words
  const wordMap = useMemo(() => {
    const map = new Map<string, WordItem>();
    for (const w of wordsInDeck) {
      map.set(w.word.toLowerCase(), w);
    }
    return map;
  }, [wordsInDeck]);

  // 2. Parse text into structured sentences with lexical tokens
  const { paragraphs, totalTargetHits } = useMemo(() => {
    return parseArticleToParagraphs(article.content, wordMap);
  }, [article.content, wordMap]);

  // Flattened sentences list for J/K navigation
  const allSentences = useMemo(() => {
    return paragraphs.flatMap((p) => p.sentences);
  }, [paragraphs]);

  // List of unique matched vocabulary words in this article
  const articleVocabList = useMemo(() => {
    const set = new Map<string, WordItem>();
    for (const sent of allSentences) {
      for (const token of sent.tokens) {
        if (token.matchedWord) {
          set.set(token.matchedWord.word.toLowerCase(), token.matchedWord);
        }
      }
    }
    return Array.from(set.values());
  }, [allSentences]);

  // Toggle translation for a specific sentence
  const toggleSentenceTranslation = async (sent: SentenceChunk) => {
    soundEffects.playKeyTick(620);
    setActiveSentenceIdx(sent.index);

    // If already expanded, toggle collapse
    if (expandedTranslations.has(sent.index)) {
      setExpandedTranslations((prev) => {
        const next = new Map(prev);
        next.delete(sent.index);
        return next;
      });
      return;
    }

    // Set loading
    setLoadingTranslations((prev) => new Set(prev).add(sent.index));

    try {
      const translation = await translateSentence(sent.text);
      setExpandedTranslations((prev) => {
        const next = new Map(prev);
        next.set(sent.index, translation);
        return next;
      });
    } catch (e) {
      console.error('Translation error:', e);
    } finally {
      setLoadingTranslations((prev) => {
        const next = new Set(prev);
        next.delete(sent.index);
        return next;
      });
    }
  };

  // AI 语法长难句深度拆解分析
  const handleAnalyzeSentence = async (sent: SentenceChunk) => {
    soundEffects.playKeyTick(720);

    // 检查 AI 配置
    if (!isAIConfigured()) {
      onOpenAISettings?.('长难句语法拆解需要配置 AI API Key，请先完成配置');
      return;
    }

    // 如果已经分析过了，则不需要重复请求
    if (sentenceAnalyses.has(sent.index)) {
      return;
    }

    setLoadingAnalyses((prev) => new Set(prev).add(sent.index));
    setAnalysisErrors((prev) => {
      const next = new Map(prev);
      next.delete(sent.index);
      return next;
    });

    try {
      const result = await aiAnalyzeSentenceSyntax(sent.text, article.content);
      setSentenceAnalyses((prev) => {
        const next = new Map(prev);
        next.set(sent.index, result);
        return next;
      });

      // 如果翻译卡片还没有打开，则顺带把它置为展开
      if (!expandedTranslations.has(sent.index)) {
        setExpandedTranslations((prev) => {
          const next = new Map(prev);
          next.set(sent.index, result.summaryTranslation || 'AI 语法分析已完成');
          return next;
        });
      }
    } catch (err: any) {
      setAnalysisErrors((prev) => {
        const next = new Map(prev);
        next.set(sent.index, err.message || 'AI 语法分析失败');
        return next;
      });
    } finally {
      setLoadingAnalyses((prev) => {
        const next = new Set(prev);
        next.delete(sent.index);
        return next;
      });
    }
  };

  // Keyboard navigation for reading mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key.toLowerCase() === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        soundEffects.playKeyTick(550);
        setActiveSentenceIdx((prev) => (prev < allSentences.length - 1 ? prev + 1 : prev));
      } else if (e.key.toLowerCase() === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        soundEffects.playKeyTick(650);
        setActiveSentenceIdx((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const activeSent = allSentences[activeSentenceIdx];
        if (activeSent) {
          speechEngine.speak(activeSent.text);
        }
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        const activeSent = allSentences[activeSentenceIdx];
        if (activeSent) {
          toggleSentenceTranslation(activeSent);
        }
      } else if (e.key.toLowerCase() === 'tab') {
        e.preventDefault();
        soundEffects.playKeyTick(750);
        setReadingMode((prev) => {
          if (prev === 'immersive') return 'focus';
          if (prev === 'focus') return 'cloze';
          return 'immersive';
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allSentences, activeSentenceIdx, expandedTranslations]);

  const handleWordClick = (e: React.MouseEvent, token: WordToken) => {
    e.stopPropagation();
    if (!token.isWord) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopoverData({
      word: token.text,
      matchedWordItem: token.matchedWord,
      targetRect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  return (
    <div
      onClick={() => setPopoverData(null)}
      className="w-full mx-auto"
    >
      {/* Editorial Reader Outer Shell */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Main Article Reading Sheet (3 Cols on desktop) */}
        <div className="lg:col-span-3 paper-sheet rounded-md p-6 sm:p-10 border border-[#E5E1D5] min-h-[780px]">
          {/* Article Header */}
          <div className="pb-5 border-b border-stone-200">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                {onOpenArticleDrawer && (
                  <button
                    onClick={onOpenArticleDrawer}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                    <span>全部篇章</span>
                  </button>
                )}
              </div>

              {/* Reading Sub-mode Switcher */}
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
                <button
                  onClick={() => setReadingMode('immersive')}
                  className={`px-2.5 py-1 rounded transition font-medium ${
                    readingMode === 'immersive'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="纯净原汁沉浸阅读"
                >
                  沉浸全览
                </button>
                <button
                  onClick={() => setReadingMode('focus')}
                  className={`px-2.5 py-1 rounded transition font-medium ${
                    readingMode === 'focus'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="J/K 逐句意群聚焦读"
                >
                  逐句聚焦 (J/K)
                </button>
                <button
                  onClick={() => setReadingMode('cloze')}
                  className={`px-2.5 py-1 rounded transition font-medium ${
                    readingMode === 'cloze'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="核心词挖空自测"
                >
                  真题挖空读
                </button>
              </div>
            </div>

            <h1 className="font-serif-academic text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight leading-snug">
              {article.title}
            </h1>
            <div className="text-xs text-stone-400 mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3">
              <span>{article.source || '精选外刊'}</span>
              <span>•</span>
              <span className="font-mono">{article.totalWords} 词</span>
              <span>•</span>
              <span className="text-amber-800 font-medium">
                包含 {totalTargetHits} 处重点生词
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-900 text-[11px] font-sans font-medium">
                <Languages className="w-3 h-3 text-amber-700" />
                双击任意句子显译文，右上角点“AI分析”可长难句语法拆解
              </span>
            </div>
          </div>

          {/* Article Paragraphs Body */}
          <article className="mt-6 space-y-6 font-serif-academic text-[16px] sm:text-[17px] leading-[1.85] text-stone-900">
            {paragraphs.map((para, paraIdx) => (
              <div key={paraIdx} className="space-y-2">
                <div className="indent-0">
                  {para.sentences.map((sent) => {
                    const isFocused = readingMode === 'focus' && sent.index === activeSentenceIdx;
                    const isDimmed = readingMode === 'focus' && sent.index !== activeSentenceIdx;
                    const isTranslated = expandedTranslations.has(sent.index);
                    const isLoading = loadingTranslations.has(sent.index);
                    const isAnalyzing = loadingAnalyses.has(sent.index);
                    const analysis = sentenceAnalyses.get(sent.index);
                    const analysisError = analysisErrors.get(sent.index);

                    return (
                      <React.Fragment key={sent.index}>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSentenceIdx(sent.index);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            toggleSentenceTranslation(sent);
                          }}
                          title="单击高亮聚焦，双击展开译文与AI语法分析 (快捷键 T)"
                          className={`transition-all duration-200 cursor-pointer rounded px-1 -mx-0.5 select-text ${
                            isFocused
                              ? 'bg-amber-100/75 text-stone-950 shadow-2xs ring-1 ring-amber-300'
                              : isDimmed
                              ? 'opacity-35 hover:opacity-75'
                              : isTranslated
                              ? 'bg-amber-50/90 text-amber-950 underline decoration-amber-400/80 decoration-dashed underline-offset-4'
                              : 'hover:bg-stone-100/80'
                          }`}
                        >
                          {sent.tokens.map((token, tIdx) => {
                            if (!token.isWord) {
                              return <span key={tIdx}>{token.text}</span>;
                            }

                            // Cloze mode mask check
                            const isTarget = !!token.matchedWord;
                            if (readingMode === 'cloze' && isTarget) {
                              return (
                                <span
                                  key={tIdx}
                                  onClick={(e) => handleWordClick(e, token)}
                                  className="font-mono-code font-bold bg-stone-800 text-stone-200 hover:text-amber-300 hover:bg-stone-900 px-1 py-0.2 rounded text-[13px] mx-0.5 cursor-pointer shadow-2xs"
                                  title="点击揭示原词释义"
                                >
                                  [______]
                                </span>
                              );
                            }

                            // Immersive / Focus mode: Highlight target words subtly
                            return (
                              <span
                                key={tIdx}
                                onClick={(e) => handleWordClick(e, token)}
                                className={`cursor-pointer transition-colors ${
                                  isTarget
                                    ? 'underline decoration-amber-500 decoration-2 underline-offset-3 font-semibold text-amber-950 hover:bg-amber-200/60 rounded px-0.5'
                                    : 'hover:bg-stone-100 hover:text-amber-900 rounded px-0.5'
                                }`}
                              >
                                {token.text}
                              </span>
                            );
                          })}
                          {' '}
                        </span>

                        {/* Inline Sentence Translation & AI Syntax Breakdown Callout */}
                        <AnimatePresence>
                          {(isTranslated || isLoading) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, y: -4 }}
                              animate={{ opacity: 1, height: 'auto', y: 0 }}
                              exit={{ opacity: 0, height: 0, y: -4 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden my-3"
                            >
                              <div className="p-3.5 sm:p-4 rounded-xl bg-[#FAF6EE] border-l-4 border-amber-700 border-t border-r border-b border-amber-200/80 shadow-xs text-stone-800 font-sans">
                                {/* Header with AI Analyze Button placed to the left of Speech */}
                                <div className="flex items-center justify-between text-xs text-amber-800 font-medium mb-2 pb-1.5 border-b border-amber-200/50">
                                  <div className="flex items-center gap-1.5">
                                    <Languages className="w-3.5 h-3.5 text-amber-700" />
                                    <span className="font-serif-academic font-bold tracking-wide">
                                      精读译文·长难句剖析
                                    </span>
                                    <span className="text-[10px] text-amber-700/70 font-mono">
                                      #句 {sent.index + 1}
                                    </span>
                                  </div>

                                  {/* Action Buttons: AI Analyze is to the LEFT of Volume2 */}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAnalyzeSentence(sent);
                                      }}
                                      disabled={isAnalyzing}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200/80 hover:bg-amber-300 text-amber-950 text-[11px] font-bold shadow-2xs transition disabled:opacity-50"
                                      title="AI 深度剖析当前长难句主谓宾与语法结构"
                                    >
                                      {isAnalyzing ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-amber-900" />
                                      ) : (
                                        <Sparkles className="w-3 h-3 text-amber-800" />
                                      )}
                                      <span>{isAnalyzing ? '分析中...' : 'AI分析'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        speechEngine.speak(sent.text);
                                      }}
                                      className="p-1 hover:bg-amber-100 rounded text-stone-600 hover:text-stone-900 transition"
                                      title="朗读本句原英文"
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSentenceTranslation(sent);
                                      }}
                                      className="p-1 hover:bg-amber-100 rounded text-stone-500 hover:text-stone-900 transition"
                                      title="收起译文"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Translation Text */}
                                {isLoading ? (
                                  <div className="flex items-center gap-2 py-1 text-stone-500 text-xs">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                                    <span>正在解析精选句子译文...</span>
                                  </div>
                                ) : (
                                  <div className="text-[14px] sm:text-[15px] text-stone-900 leading-relaxed font-serif-academic font-medium pt-0.5">
                                    {expandedTranslations.get(sent.index)}
                                  </div>
                                )}

                                {/* AI Syntax Analysis Error */}
                                {analysisError && (
                                  <div className="mt-2 p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                                    {analysisError}
                                  </div>
                                )}

                                {/* AI Syntax Analysis Result Panel */}
                                {analysis && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 pt-3 border-t border-amber-200/70 text-xs space-y-2.5"
                                  >
                                    <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                                      <span>长难句语法透视与骨架拆解</span>
                                    </div>

                                    {/* 1. Main Clause / Sentence Spine */}
                                    <div className="p-2.5 rounded-lg bg-white/90 border border-amber-200 shadow-2xs">
                                      <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                                        核心主干 (Sentence Spine)
                                      </div>
                                      <div className="font-mono text-xs font-semibold text-stone-900 leading-relaxed">
                                        {analysis.mainClause}
                                      </div>
                                    </div>

                                    {/* 2. Grammar Breakdown */}
                                    {analysis.grammarBreakdown && analysis.grammarBreakdown.length > 0 && (
                                      <div className="space-y-1.5">
                                        <div className="text-[11px] font-bold text-stone-700">
                                          成分结构细剖:
                                        </div>
                                        <div className="grid grid-cols-1 gap-1.5">
                                          {analysis.grammarBreakdown.map((item, bIdx) => (
                                            <div
                                              key={bIdx}
                                              className="p-2 rounded bg-stone-50 border border-stone-200 text-stone-800"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                                                  {item.role}
                                                </span>
                                                <span className="font-serif-academic italic text-[11px] text-stone-700 truncate">
                                                  "{item.part}"
                                                </span>
                                              </div>
                                              <div className="text-[11px] text-stone-600 mt-1 pl-0.5">
                                                {item.explanation}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* 3. Core Points / Clauses */}
                                    {analysis.corePoints && analysis.corePoints.length > 0 && (
                                      <div className="pt-1.5 flex flex-wrap gap-1.5">
                                        <span className="text-[11px] text-amber-900 font-bold self-center">
                                          语法考点:
                                        </span>
                                        {analysis.corePoints.map((pt, pIdx) => (
                                          <span
                                            key={pIdx}
                                            className="px-2 py-0.5 rounded-full bg-amber-100/70 text-amber-950 text-[11px] font-sans border border-amber-200"
                                          >
                                            {pt}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </article>

          {/* Reader Footer */}
          <div className="mt-10 pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
            <span>
              双击任意句子显译文并可点击 <strong className="text-amber-800">AI分析</strong> 拆解长难句语法，
              按 <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">T</kbd> 翻译，
              按 <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">J</kbd> /{' '}
              <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">K</kbd> 逐句聚焦，
              按 <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">P</kbd> 朗读，
              按 <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">Tab</kbd> 切换模式
            </span>
            <span className="font-mono text-[11px] text-stone-400">
              SENTENCE {activeSentenceIdx + 1} / {allSentences.length}
            </span>
          </div>
        </div>

        {/* Sidebar Margin Notes: Target Words In This Article */}
        <aside className="lg:col-span-1 bg-white/90 backdrop-blur-xs rounded-xl p-4 border border-stone-200/80 shadow-xs sticky top-20">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200 mb-3">
            <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>本文重点词 ({articleVocabList.length})</span>
            </div>
            <span className="text-[10px] text-stone-400">点击发音</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 text-xs">
            {articleVocabList.map((item) => (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  speechEngine.speak(item.word);
                }}
                className="p-2 rounded bg-stone-50/80 hover:bg-amber-50 hover:border-amber-200 border border-stone-200/60 cursor-pointer transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 font-sans">{item.word}</span>
                  {item.phonetic && (
                    <span className="font-serif-academic italic text-[10px] text-stone-400">
                      {item.phonetic}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-600 mt-0.5 leading-snug truncate">
                  {item.definition}
                </div>
              </div>
            ))}

            {articleVocabList.length === 0 && (
              <div className="text-center py-6 text-stone-400 text-xs">
                本篇暂无匹配的当前词单生词
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Floating Word Popover */}
      {popoverData && (
        <WordPopover
          word={popoverData.word}
          matchedWordItem={popoverData.matchedWordItem}
          targetRect={popoverData.targetRect}
          onClose={() => setPopoverData(null)}
          onAddToDeck={onAddWordToDeck}
          isInDeck={wordMap.has(popoverData.word.toLowerCase())}
        />
      )}
    </div>
  );
};

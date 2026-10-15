import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Volume2, Languages, X, Loader2 } from 'lucide-react';
import type { ArticleItem, WordItem, ReadingModeType } from '../../types';
import { parseArticleToParagraphs, type SentenceChunk, type WordToken } from '../../engine/tokenizer';
import { speechEngine } from '../../engine/speech';
import { soundEffects } from '../../engine/soundEffects';
import { translateSentence } from '../../engine/translator';
import { WordPopover } from './WordPopover';

interface ReadingReaderProps {
  article: ArticleItem;
  wordsInDeck: WordItem[];
  onOpenArticleDrawer: () => void;
  onAddWordToDeck: (word: string, definition: string, phonetic?: string) => void;
}

export const ReadingReader: React.FC<ReadingReaderProps> = ({
  article,
  wordsInDeck,
  onOpenArticleDrawer,
  onAddWordToDeck,
}) => {
  const [readingMode, setReadingMode] = useState<ReadingModeType>('focus');
  const [activeSentenceIdx, setActiveSentenceIdx] = useState(0);
  const [expandedTranslations, setExpandedTranslations] = useState<Map<number, string>>(new Map());
  const [loadingTranslations, setLoadingTranslations] = useState<Set<number>>(new Set());
  const [popoverData, setPopoverData] = useState<{
    word: string;
    matchedWordItem?: WordItem;
    position: { x: number; y: number };
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

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopoverData({
      word: token.text,
      matchedWordItem: token.matchedWord,
      position: { x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY },
    });
  };

  return (
    <div
      onClick={() => setPopoverData(null)}
      className="w-full max-w-6xl mx-auto my-5 px-3 sm:px-4"
    >
      {/* Editorial Reader Outer Shell */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Main Article Reading Sheet (3 Cols on desktop) */}
        <div className="lg:col-span-3 paper-sheet rounded-md p-6 sm:p-10 border border-[#E5E1D5] min-h-[780px]">
          {/* Article Header */}
          <div className="pb-5 border-b border-stone-200">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <button
                onClick={onOpenArticleDrawer}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-medium transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                <span>切换篇章 / 导入文章</span>
              </button>

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
                包含 {totalTargetHits} 处考研核心词
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-900 text-[11px] font-sans font-medium">
                <Languages className="w-3 h-3 text-amber-700" />
                双击任意句子显译文
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
                          title="单击高亮聚焦，双击展开/折叠本句翻译 (快捷键 T)"
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

                        {/* Inline Sentence Translation Callout */}
                        <AnimatePresence>
                          {(isTranslated || isLoading) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, y: -4 }}
                              animate={{ opacity: 1, height: 'auto', y: 0 }}
                              exit={{ opacity: 0, height: 0, y: -4 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden my-2.5"
                            >
                              <div className="p-3 sm:p-3.5 rounded-lg bg-[#FAF6EE] border-l-3 border-amber-600 border-t border-r border-b border-amber-200/70 shadow-2xs text-stone-800 font-sans">
                                <div className="flex items-center justify-between text-xs text-amber-800 font-medium mb-1.5 pb-1 border-b border-amber-200/40">
                                  <div className="flex items-center gap-1.5">
                                    <Languages className="w-3.5 h-3.5 text-amber-700" />
                                    <span className="font-serif-academic font-bold tracking-wide">
                                      真题精读·语境译文
                                    </span>
                                    <span className="text-[10px] text-amber-700/70 font-mono">
                                      #句 {sent.index + 1}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        speechEngine.speak(sent.text);
                                      }}
                                      className="p-1 hover:bg-amber-100/80 rounded text-stone-600 hover:text-stone-900 transition"
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
                                      className="p-1 hover:bg-amber-100/80 rounded text-stone-500 hover:text-stone-900 transition"
                                      title="收起译文"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

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
              双击任意句子 或 按 <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">T</kbd> 查看翻译，
              按 <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">J</kbd> /{' '}
              <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">K</kbd> 逐句聚焦，
              按 <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">P</kbd> 整句朗读，
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
            <span className="text-[10px] text-stone-400">点击查义</span>
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
          </div>
        </aside>
      </div>

      {/* Floating Word Popover */}
      {popoverData && (
        <WordPopover
          word={popoverData.word}
          matchedWordItem={popoverData.matchedWordItem}
          position={popoverData.position}
          onClose={() => setPopoverData(null)}
          onAddToDeck={onAddWordToDeck}
          isInDeck={wordMap.has(popoverData.word.toLowerCase())}
        />
      )}
    </div>
  );
};

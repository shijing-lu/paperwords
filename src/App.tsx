import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { db } from './db';
import type { ViewMode, WordItem, PageTab, ActiveRecallMode, PaperColumns, ArticleItem, WordStudyStats } from './types';
import {
  DEFAULT_DECK_ID,
  KAOYAN_DECK_ID,
  KAOYAN_DECK,
  getKaoyanWords,
  GRE_DECK_ID,
  GRE_DECK,
  DEFAULT_WORDS,
} from './data/defaultDecks';
import { DEFAULT_ARTICLES } from './data/defaultArticles';
import { calculateNextReviewState } from './engine/ebbinghaus';
import { speechEngine } from './engine/speech';
import { notificationEngine } from './engine/notifications';
import { soundEffects } from './engine/soundEffects';
import { sessionManager, type DailyLearningSession } from './engine/sessionManager';
import { recordWordEncounter } from './engine/heatmap';
import { Header } from './components/Header';
import { BentoDashboard } from './components/BentoDashboard';
import { A4Paper } from './components/paper/A4Paper';
import { ImportModal } from './components/ImportModal';
import { HotkeysModal } from './components/HotkeysModal';
import { SettingsModal } from './components/SettingsModal';
import { StatsModal } from './components/StatsModal';
import { ReadingReader } from './components/reading/ReadingReader';
import { ArticleDrawer } from './components/reading/ArticleDrawer';
import { ReinforceCardModal } from './components/ReinforceCardModal';
import { useHotkeys } from './hooks/useHotkeys';

export const App: React.FC = () => {
  // Navigation & Config States
  const [currentDeckId, setCurrentDeckId] = useState<string>(DEFAULT_DECK_ID);
  const [activeTab, setActiveTab] = useState<PageTab>('today');
  const [currentListIndex, setCurrentListIndex] = useState<number>(1);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('mask');
  const [recallMode, setRecallMode] = useState<ActiveRecallMode>('en-to-cn');

  // 修复 Bug：以 word.id 作为键集合，杜绝数字索引错位导致的“下一词中文自动显现”
  const [revealedWordIds, setRevealedWordIds] = useState<Set<string>>(new Set());

  // 用户设置：自由自定义每日新词配额 (默认 50，可输入任意数值)
  const [dailyTarget, setDailyTarget] = useState<number>(() => {
    const saved = localStorage.getItem('paperwords_daily_target');
    return saved ? Number(saved) : 50;
  });

  // 用户设置：单张 A4 纸容量 (每页单词数，默认 30)
  const [wordsPerPage, setWordsPerPage] = useState<number>(() => {
    const saved = localStorage.getItem('paperwords_words_per_page');
    return saved ? Number(saved) : 30;
  });

  // 用户设置：排版列数 (每行显示 2 个、3 个甚至 4 个单词)
  const [paperColumns, setPaperColumns] = useState<PaperColumns>(() => {
    const saved = localStorage.getItem('paperwords_paper_columns');
    return saved ? (Number(saved) as PaperColumns) : 2;
  });

  // 声音与通知系统控制 (支持用户在设置中彻底关闭铃声及桌面提醒)
  const [isKeyboardSoundEnabled, setIsKeyboardSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('paperwords_keyboard_sound') !== 'false';
  });
  const [isReviewAlarmEnabled, setIsReviewAlarmEnabled] = useState<boolean>(() => {
    return localStorage.getItem('paperwords_review_alarm_sound') !== 'false';
  });
  const [isNotificationEnabled, setIsNotificationEnabled] = useState<boolean>(() => {
    return localStorage.getItem('paperwords_notification_enabled') !== 'false';
  });
  const [notificationThreshold, setNotificationThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('paperwords_notification_threshold');
    return saved ? parseInt(saved, 10) : 20;
  });

  // 多轮递进新学会话与轮次进阶提示
  const [dailySession, setDailySession] = useState<DailyLearningSession | null>(null);
  const [roundAlert, setRoundAlert] = useState<{ type: 'advance' | 'graduation'; text: string } | null>(null);

  // Modals & Drawers
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isArticleDrawerOpen, setIsArticleDrawerOpen] = useState(false);
  const [reinforceModalData, setReinforceModalData] = useState<{
    word: WordItem;
    rating: 1 | 2 | 3;
  } | null>(null);

  // 阅读模式选中的文章 ID
  const [currentArticleId, setCurrentArticleId] = useState<string>(DEFAULT_ARTICLES[0].id);

  // 倒计时文本
  const [countdownText, setCountdownText] = useState<string | null>(null);

  // 1. Reactive DB queries
  const decks = useLiveQuery(() => db.decks.toArray(), []) || [];
  const allWordsInDeck = useLiveQuery(
    () => (currentDeckId ? db.words.where({ deckId: currentDeckId }).toArray() : []),
    [currentDeckId]
  ) || [];
  const articles = useLiveQuery(() => db.articles.toArray(), []) || [];

  // 种子数据初始化 (包含考研 335 词与预置阅读文章)
  useEffect(() => {
    async function initSeed() {
      // 1. 词书初始化
      const hasKaoyan = await db.decks.get(DEFAULT_DECK_ID);
      if (!hasKaoyan) {
        await db.transaction('rw', db.decks, db.words, async () => {
          await db.decks.put(KAOYAN_DECK);
          const kaoyanWords = getKaoyanWords().map((w, idx) => ({
            ...w,
            id: `${KAOYAN_DECK_ID}-${idx + 1}`,
          }));
          await db.words.bulkPut(kaoyanWords);

          const hasGre = await db.decks.get(GRE_DECK_ID);
          if (!hasGre) {
            await db.decks.put(GRE_DECK);
            const greWords: WordItem[] = DEFAULT_WORDS.map((w, idx) => ({
              ...w,
              id: `${GRE_DECK_ID}-${idx + 1}`,
            }));
            await db.words.bulkPut(greWords);
          }
        });
      }

      // 2. 阅读文章初始化
      const artCount = await db.articles.count();
      if (artCount === 0) {
        await db.articles.bulkPut(DEFAULT_ARTICLES);
      }
    }
    initSeed();
  }, []);

  // Update currentDeck
  const currentDeck = useMemo(() => {
    return decks.find((d) => d.id === currentDeckId) || decks[0] || null;
  }, [decks, currentDeckId]);

  // Sync currentDeckId if missing
  useEffect(() => {
    if (decks.length > 0 && !decks.some((d) => d.id === currentDeckId)) {
      setCurrentDeckId(decks[0].id);
      setCurrentListIndex(1);
      setActiveIndex(0);
    }
  }, [decks, currentDeckId]);

  // 2. 响应式词汇切片（严格遵循艾宾浩斯规律：今日新学计划中打标后立即出队归档！）
  const now = Date.now();

  // 今日零点时间戳
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // (a) 到期复习词汇：已学过的词且已到期
  const dueReviewWords = useMemo(() => {
    return allWordsInDeck
      .filter((w) => w.reviewState.status !== 'new' && w.reviewState.nextReviewDate <= now)
      .sort((a, b) => a.reviewState.nextReviewDate - b.reviewState.nextReviewDate);
  }, [allWordsInDeck, now]);

  // (b) 生词重点池：模糊或生疏
  const stumbleWords = useMemo(() => {
    return allWordsInDeck.filter(
      (w) => w.reviewState.lastRating === 2 || w.reviewState.lastRating === 3
    );
  }, [allWordsInDeck]);

  // (c) 今日已学新词数统计（今天首次打标，status !== 'new' 且 lastReviewDate >= todayStart）
  const learnedTodayCount = useMemo(() => {
    return allWordsInDeck.filter(
      (w) => w.reviewState.status !== 'new' && w.reviewState.lastReviewDate >= todayStart
    ).length;
  }, [allWordsInDeck, todayStart]);

  // 单词快速查找映射表
  const wordMap = useMemo(() => new Map(allWordsInDeck.map((w) => [w.id, w])), [allWordsInDeck]);

  // 3. 自动同步或初始化今日多轮新学会话 (In-Session Leech Elimination Loop)
  useEffect(() => {
    if (!currentDeckId || allWordsInDeck.length === 0) return;

    const existing = sessionManager.loadSession(currentDeckId);
    if (existing) {
      setDailySession(existing);
    } else {
      const unlearned = allWordsInDeck
        .filter((w) => w.reviewState.status === 'new')
        .sort((a, b) => {
          if (a.listIndex !== b.listIndex) return a.listIndex - b.listIndex;
          return a.order - b.order;
        });
      const target = unlearned.slice(0, dailyTarget);
      if (target.length > 0) {
        const newSession = sessionManager.initSession(currentDeckId, target);
        setDailySession(newSession);
      } else {
        setDailySession(null);
      }
    }
  }, [currentDeckId, allWordsInDeck, dailyTarget]);

  // 计算今日新学递进攻坚进度与准确率统计
  const sessionStats = useMemo(() => {
    if (!dailySession) return null;
    return sessionManager.calculateSessionStats(dailySession);
  }, [dailySession]);

  // 当前轮次中待学习过筛的词表 (自然保留队列先后顺序)
  const currentRoundWords = useMemo(() => {
    if (!dailySession || dailySession.isGraduated) return [];
    return dailySession.activeQueueIds
      .map((id) => wordMap.get(id))
      .filter(Boolean) as WordItem[];
  }, [dailySession, wordMap]);

  // 重置今日新学会话
  const handleResetDailySession = useCallback(() => {
    if (!currentDeckId) return;
    sessionManager.clearSession(currentDeckId);
    const unlearned = allWordsInDeck
      .filter((w) => w.reviewState.status === 'new')
      .sort((a, b) => {
        if (a.listIndex !== b.listIndex) return a.listIndex - b.listIndex;
        return a.order - b.order;
      });
    const target = unlearned.slice(0, dailyTarget);
    if (target.length > 0) {
      const newSession = sessionManager.initSession(currentDeckId, target);
      setDailySession(newSession);
    } else {
      setDailySession(null);
    }
    setRoundAlert(null);
    setCurrentListIndex(1);
    setActiveIndex(0);
  }, [currentDeckId, allWordsInDeck, dailyTarget]);

  // (d) 计算当前视图展示的单词列表与分页
  const { activeWords, totalPages, pageTitle, emptyMessage } = useMemo(() => {
    if (activeTab === 'today') {
      const words = currentRoundWords;
      const pages = Math.max(1, Math.ceil(words.length / wordsPerPage));
      const start = (currentListIndex - 1) * wordsPerPage;
      const slice = words.slice(start, start + wordsPerPage);
      return {
        activeWords: slice,
        totalPages: pages,
        pageTitle:
          dailySession && dailySession.currentRound > 1
            ? `今日新学 · 第 ${dailySession.currentRound} 轮硬骨头攻坚`
            : '今日新学计划',
        emptyMessage:
          dailySession?.isGraduated
            ? `🎉 今日新学计划已圆满毕业！全部通过多轮循环淘汰，已推入艾宾浩斯复习日程。`
            : '词库中暂无待学新词，可导入新词书或前往复习专区！',
      };
    }

    if (activeTab === 'review') {
      const pages = Math.max(1, Math.ceil(dueReviewWords.length / wordsPerPage));
      const start = (currentListIndex - 1) * wordsPerPage;
      const slice = dueReviewWords.slice(start, start + wordsPerPage);
      return {
        activeWords: slice,
        totalPages: pages,
        pageTitle: '艾宾浩斯到期复习单',
        emptyMessage: '当前周期复习已全部完成！累计达到提醒阈值后将自动弹出强提醒。',
      };
    }

    if (activeTab === 'stumble') {
      const pages = Math.max(1, Math.ceil(stumbleWords.length / wordsPerPage));
      const start = (currentListIndex - 1) * wordsPerPage;
      const slice = stumbleWords.slice(start, start + wordsPerPage);
      return {
        activeWords: slice,
        totalPages: pages,
        pageTitle: '生词与模糊重点池',
        emptyMessage: '太棒了！生词池目前为空，暂无标记为生疏或模糊的词汇。',
      };
    }

    // archive: 全量 A4 纸单
    const currentListWords = allWordsInDeck
      .filter((w) => w.listIndex === currentListIndex)
      .sort((a, b) => a.order - b.order);
    return {
      activeWords: currentListWords,
      totalPages: currentDeck?.listCount || 1,
      pageTitle: `全量 A4 纸单 · List ${currentListIndex < 10 ? `0${currentListIndex}` : currentListIndex}`,
      emptyMessage: '词库暂无单词',
    };
  }, [
    activeTab,
    currentRoundWords,
    dailySession,
    dueReviewWords,
    stumbleWords,
    allWordsInDeck,
    currentListIndex,
    currentDeck,
    wordsPerPage,
  ]);

  // Tab 切换时重置焦点与临时刮开状态
  const handleSelectTab = useCallback((tab: PageTab) => {
    setActiveTab(tab);
    setCurrentListIndex(1);
    setActiveIndex(0);
    setRevealedWordIds(new Set());
  }, []);

  // 切页或切视图时清空临时揭示集合
  useEffect(() => {
    setRevealedWordIds(new Set());
    setActiveIndex(0);
  }, [currentListIndex, viewMode, activeTab]);

  // 3. 周期检查与到期提醒控制 (支持在设置中彻底静音，并确保同一批次绝不重复轰炸)
  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = Date.now();
      const dueCount = allWordsInDeck.filter(
        (w) => w.reviewState.status !== 'new' && w.reviewState.nextReviewDate <= currentTime
      ).length;

      // 仅当允许通知且阈值未被设为 9999 (永不弹窗) 时触发
      if (isNotificationEnabled && notificationThreshold < 999 && dueCount >= notificationThreshold) {
        notificationEngine.notifyReviewDue(dueCount, () => {
          setActiveTab('review');
          setCurrentListIndex(1);
        });
      } else {
        notificationEngine.stopTitleFlashing();
      }

      if (dueCount === 0) {
        notificationEngine.resetBatch();
      }

      // 顶部胶囊展示状态
      if (notificationThreshold < 999 && dueCount >= notificationThreshold) {
        setCountdownText(`🔔 ${dueCount} 词到期 (已达阈值)`);
      } else if (dueCount > 0) {
        setCountdownText(notificationThreshold < 999 ? `⏱ 积攒到期: ${dueCount}/${notificationThreshold} 词` : `⏱ 待复习: ${dueCount} 词`);
      } else {
        // 计算下一个最近到期时间
        const upcoming = allWordsInDeck
          .filter((w) => w.reviewState.status !== 'new' && w.reviewState.nextReviewDate > currentTime)
          .sort((a, b) => a.reviewState.nextReviewDate - b.reviewState.nextReviewDate);

        if (upcoming.length > 0) {
          const diffMs = upcoming[0].reviewState.nextReviewDate - currentTime;
          const mins = Math.floor(diffMs / 60000);
          const secs = Math.floor((diffMs % 60000) / 1000);
          if (mins < 60) {
            setCountdownText(`${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`);
          } else {
            setCountdownText(`${Math.round(mins / 60)}小时后`);
          }
        } else {
          setCountdownText(null);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [allWordsInDeck, isNotificationEnabled, notificationThreshold]);

  // 揭示/隐藏特定单词（基于 word.id）
  const handleToggleReveal = useCallback((wordId: string) => {
    setRevealedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  }, []);

  // 自动纠正溢出的页码
  useEffect(() => {
    if (currentListIndex > totalPages && totalPages > 0) {
      setCurrentListIndex(totalPages);
    }
  }, [currentListIndex, totalPages]);

  // 核心打标落地执行（更新数据库、清理揭示状态、维护焦点与多轮递进）
  const executeRatingCommit = useCallback(
    async (wordId: string, rating: 1 | 2 | 3) => {
      // 记录该单词的累计学习次数与今日过筛热度
      const targetWord = allWordsInDeck.find((w) => w.id === wordId);
      if (targetWord) {
        const updatedStats = recordWordEncounter(
          targetWord.stats,
          rating,
          activeTab === 'today' ? 'today' : activeTab === 'review' ? 'review' : 'other'
        );
        await db.words.update(wordId, { stats: updatedStats });
      }

      // 1. 如果是在今日新学中，且会话处于进行中：走多轮递进淘汰引擎
      if (activeTab === 'today' && dailySession && !dailySession.isGraduated) {
        const { updatedSession, roundFinished, allGraduated } = sessionManager.recordWordRating(
          dailySession,
          wordId,
          rating
        );
        setDailySession(updatedSession);

        if (rating === 1) {
          soundEffects.playSuccessTone();
        } else {
          soundEffects.playKeyTick(420);
        }

        // 打标后清理该词的临时刮开记录
        setRevealedWordIds((prev) => {
          const next = new Set(prev);
          next.delete(wordId);
          return next;
        });

        if (allGraduated) {
          // 100% 全部通过，全员正式推入艾宾浩斯复习日程
          const graduationUpdates = sessionManager.generateGraduationUpdates(
            updatedSession,
            allWordsInDeck
          );
          await db.words.bulkPut(graduationUpdates);

          soundEffects.playGraduationTone();
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#D97706', '#059669', '#2563EB', '#E11D48'],
          });
          setRoundAlert({
            type: 'graduation',
            text: `🎓 恭喜！今日 ${updatedSession.targetWordIds.length} 词已全部攻克毕业！一轮首通率 ${Math.round((updatedSession.firstPassIds.length / updatedSession.targetWordIds.length) * 100)}%，已全员推入艾宾浩斯复习日程。`,
          });
          setActiveIndex(0);
        } else if (roundFinished) {
          // 顺利进阶到下一轮攻坚
          soundEffects.playRoundAdvanceTone();
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#D97706', '#F59E0B', '#FBBF24'],
          });
          setRoundAlert({
            type: 'advance',
            text: `🏁 第 ${updatedSession.currentRound - 1} 轮初筛完成！剩余 ${updatedSession.activeQueueIds.length} 个生疏/模糊词已进入【第 ${updatedSession.currentRound} 轮硬骨头攻坚】。继续保持！`,
          });
          setCurrentListIndex(1);
          setActiveIndex(0);
        } else {
          // 当前轮内维持位置：当前词移出队列，后面的词自动顶上
          const currentWordIdx = activeWords.findIndex((w) => w.id === wordId);
          const remainingLen = activeWords.length - 1;
          if (remainingLen <= 0) {
            setActiveIndex(0);
          } else if (currentWordIdx >= remainingLen) {
            setActiveIndex(Math.max(0, remainingLen - 1));
          } else {
            setActiveIndex(currentWordIdx);
          }
        }
        return;
      }

      // 2. 复习专区、生词专区或归档模式：直接更新数据库
      const word = allWordsInDeck.find((w) => w.id === wordId);
      if (!word) return;

      const nextState = calculateNextReviewState(word.reviewState, rating);
      await db.words.update(wordId, { reviewState: nextState });

      // 打标后清理该词的临时刮开记录
      setRevealedWordIds((prev) => {
        const next = new Set(prev);
        next.delete(wordId);
        return next;
      });

      const currentWordIdx = activeWords.findIndex((w) => w.id === wordId);
      if (currentWordIdx !== -1) {
        if (activeTab === 'review') {
          const remainingLen = activeWords.length - 1;
          if (remainingLen <= 0) {
            setActiveIndex(0);
          } else if (currentWordIdx >= remainingLen) {
            setActiveIndex(Math.max(0, remainingLen - 1));
          } else {
            setActiveIndex(currentWordIdx);
          }
        } else {
          if (currentWordIdx < activeWords.length - 1) {
            setActiveIndex(currentWordIdx + 1);
          } else if (currentListIndex < totalPages) {
            setCurrentListIndex((prev) => prev + 1);
            setActiveIndex(0);
          }
        }
      }

      if (activeTab === 'review' && dueReviewWords.length <= 1) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#059669', '#2563EB', '#D97706'],
        });
      }
    },
    [activeTab, dailySession, allWordsInDeck, activeWords, currentListIndex, totalPages, dueReviewWords.length]
  );

  // 用户点击或按键触发打标
  const handleRateWord = useCallback(
    (wordId: string, rating: 1 | 2 | 3, isFromKeyboard = false) => {
      const word = allWordsInDeck.find((w) => w.id === wordId);
      if (!word) return;

      // 核心需求：
      // 1. 如果是页面上直接鼠标点击 1 (熟练)：无需弹悬浮框，直接极速过滤出队；
      // 2. 如果当前页面已显示该词的中文释义（全显模式、中译英、或遮罩已被刮开），点击 2 (模糊) 也无需弹卡片，直接出队；
      // 3. 如果是键盘按 1，或者中文未显示时点击 2，或者评定 3 (生疏)：弹出悬浮框供核对与强化记忆。
      const isDefinitionCurrentlyVisible =
        viewMode === 'full' ||
        recallMode === 'cn-to-en' ||
        revealedWordIds.has(wordId);

      if (activeTab === 'today' || activeTab === 'review') {
        if (rating === 1 && !isFromKeyboard) {
          executeRatingCommit(wordId, 1);
          return;
        }

        if (rating === 2 && !isFromKeyboard && isDefinitionCurrentlyVisible) {
          executeRatingCommit(wordId, 2);
          return;
        }

        setReinforceModalData({ word, rating });
        return;
      }

      // 其他视图（如全量归档），直接落地
      executeRatingCommit(wordId, rating);
    },
    [allWordsInDeck, activeTab, viewMode, recallMode, revealedWordIds, executeRatingCommit]
  );

  // 用户按任意键、点击确认或在卡片中按 1/2/3 重新标记，执行出队并进入下一个单词
  const handleDismissReinforce = useCallback((overrideRating?: 1 | 2 | 3) => {
    if (!reinforceModalData) return;
    const { word, rating: initialRating } = reinforceModalData;
    const finalRating = overrideRating ?? initialRating;
    setReinforceModalData(null);
    executeRatingCommit(word.id, finalRating);
  }, [reinforceModalData, executeRatingCommit]);

  // 快捷键打标当前词 (来自键盘，按 1 时触发弹窗核对确认)
  const handleRateCurrentWord = useCallback(
    (rating: 1 | 2 | 3) => {
      const activeWord = activeWords[activeIndex];
      if (activeWord) {
        handleRateWord(activeWord.id, rating, true);
      }
    },
    [activeWords, activeIndex, handleRateWord]
  );

  // 朗读当前词
  const handlePronounceCurrentWord = useCallback(() => {
    const activeWord = activeWords[activeIndex];
    if (activeWord) {
      speechEngine.speak(activeWord.word);
    }
  }, [activeWords, activeIndex]);

  // 翻页
  const handlePrevPage = useCallback(() => {
    if (currentListIndex > 1) {
      setCurrentListIndex((prev) => prev - 1);
    }
  }, [currentListIndex]);

  const handleNextPage = useCallback(() => {
    if (currentListIndex < totalPages) {
      setCurrentListIndex((prev) => prev + 1);
    }
  }, [currentListIndex, totalPages]);

  // 模式切换
  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev: ViewMode) => {
      if (prev === 'mask') return 'speed';
      if (prev === 'speed') return 'full';
      return 'mask';
    });
  }, []);

  const handleCycleRecallMode = useCallback(() => {
    setRecallMode((prev) => {
      if (prev === 'en-to-cn') return 'cn-to-en';
      if (prev === 'cn-to-en') return 'cloze';
      return 'en-to-cn';
    });
  }, []);

  // 自定义设置更新保存
  const handleUpdateDailyTarget = (val: number) => {
    setDailyTarget(val);
    localStorage.setItem('paperwords_daily_target', String(val));
  };

  const handleUpdateWordsPerPage = (val: number) => {
    setWordsPerPage(val);
    localStorage.setItem('paperwords_words_per_page', String(val));
    setCurrentListIndex(1);
    setActiveIndex(0);
  };

  const handleUpdatePaperColumns = (cols: PaperColumns) => {
    setPaperColumns(cols);
    localStorage.setItem('paperwords_paper_columns', String(cols));
  };

  // 声音与提醒配置更新处理
  const handleToggleKeyboardSound = (enabled: boolean) => {
    setIsKeyboardSoundEnabled(enabled);
    localStorage.setItem('paperwords_keyboard_sound', String(enabled));
    soundEffects.setKeyboardSoundEnabled(enabled);
  };

  const handleToggleReviewAlarm = (enabled: boolean) => {
    setIsReviewAlarmEnabled(enabled);
    localStorage.setItem('paperwords_review_alarm_sound', String(enabled));
    soundEffects.setReviewAlarmEnabled(enabled);
    notificationEngine.setAlarmSoundEnabled(enabled);
    if (!enabled) {
      notificationEngine.stopTitleFlashing();
    }
  };

  const handleToggleNotification = (enabled: boolean) => {
    setIsNotificationEnabled(enabled);
    localStorage.setItem('paperwords_notification_enabled', String(enabled));
    notificationEngine.setEnabled(enabled);
    if (!enabled) {
      notificationEngine.stopTitleFlashing();
    }
  };

  const handleUpdateNotificationThreshold = (val: number) => {
    setNotificationThreshold(val);
    localStorage.setItem('paperwords_notification_threshold', String(val));
    if (val >= 999) {
      notificationEngine.stopTitleFlashing();
    }
  };

  // 阅读模式向当前词库收录生词
  const handleAddWordFromReading = async (word: string, definition: string, phonetic?: string) => {
    const newWordItem: WordItem = {
      id: `word-${Date.now()}`,
      deckId: currentDeckId,
      listIndex: 1,
      order: allWordsInDeck.length + 1,
      word,
      phonetic,
      pos: 'n.',
      definition,
      examples: [`From reading: "${currentArticle?.title || '阅读篇章'}"`],
      tags: ['阅读精选'],
      reviewState: {
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        lastReviewDate: 0,
        nextReviewDate: Date.now(),
        lapses: 0,
        status: 'new',
      },
    };

    await db.words.add(newWordItem);
    soundEffects.playSuccessTone();
  };

  // 当前阅读文章
  const currentArticle = useMemo(() => {
    return articles.find((a) => a.id === currentArticleId) || articles[0] || DEFAULT_ARTICLES[0];
  }, [articles, currentArticleId]);

  // 全局快捷键注册
  useHotkeys({
    wordCount: activeWords.length,
    activeIndex,
    setActiveIndex,
    columns: paperColumns,
    onToggleReveal: () => {
      const activeWord = activeWords[activeIndex];
      if (activeWord) handleToggleReveal(activeWord.id);
    },
    onRateCurrentWord: handleRateCurrentWord,
    onPronounceCurrentWord: handlePronounceCurrentWord,
    onPrevPage: handlePrevPage,
    onNextPage: handleNextPage,
    onToggleViewMode: handleToggleViewMode,
    onCycleRecallMode: handleCycleRecallMode,
    onToggleHotkeysModal: () => setIsHotkeysOpen((prev) => !prev),
    isModalOpen: isImportOpen || isHotkeysOpen || isSettingsOpen || isArticleDrawerOpen || !!reinforceModalData,
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F1EA] text-[#1C1917] pb-12 selection:bg-[#FEF08A]">
      {/* 1. Header with Task Tabs */}
      <Header
        decks={decks}
        currentDeck={currentDeck}
        activeTab={activeTab}
        dueReviewCount={dueReviewWords.length}
        stumbleCount={stumbleWords.length}
        nextReviewCountdown={countdownText}
        onSelectDeck={(deckId) => {
          setCurrentDeckId(deckId);
          setCurrentListIndex(1);
          setActiveIndex(0);
        }}
        onSelectTab={handleSelectTab}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenHotkeys={() => setIsHotkeysOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
      />

      {/* 2. Top Bento Dashboard (在单词视图下显示) */}
      {activeTab !== 'reading' && (
        <BentoDashboard
          currentDeck={currentDeck}
          wordsInDeck={allWordsInDeck}
          currentListWords={activeWords}
          currentListIndex={currentListIndex}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          onOpenImport={() => setIsImportOpen(true)}
          onSelectSpecificList={(listIdx) => {
            setCurrentListIndex(listIdx);
            setActiveIndex(0);
          }}
          activeTab={activeTab}
          sessionStats={sessionStats}
        />
      )}

      {/* 3. Main Content: A4 Paper or Reading Mode */}
      <main className="flex-1">
        {activeTab === 'reading' ? (
          <ReadingReader
            article={currentArticle}
            wordsInDeck={allWordsInDeck}
            onOpenArticleDrawer={() => setIsArticleDrawerOpen(true)}
            onAddWordToDeck={handleAddWordFromReading}
          />
        ) : (
          <A4Paper
            pageTitle={pageTitle}
            deckTitle={currentDeck?.title || '词书扫读'}
            listIndex={currentListIndex}
            totalLists={totalPages}
            words={activeWords}
            activeIndex={activeIndex}
            viewMode={viewMode}
            recallMode={recallMode}
            paperColumns={paperColumns}
            onChangeRecallMode={setRecallMode}
            onChangePaperColumns={handleUpdatePaperColumns}
            revealedWordIds={revealedWordIds}
            onSelectWord={(idx) => setActiveIndex(idx)}
            onRateWord={handleRateWord}
            onToggleReveal={handleToggleReveal}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            emptyMessage={emptyMessage}
            sessionProgress={activeTab === 'today' ? sessionStats : undefined}
            roundAlert={activeTab === 'today' ? roundAlert : undefined}
            onDismissRoundAlert={() => setRoundAlert(null)}
            onResetSession={handleResetDailySession}
            onGoToReview={() => {
              setActiveTab('review');
              setCurrentListIndex(1);
            }}
          />
        )}
      </main>

      {/* 4. Import Vocabulary Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={(newDeckId) => {
          setCurrentDeckId(newDeckId);
          handleSelectTab('today');
        }}
      />

      {/* 5. Hotkeys Guide Modal */}
      <HotkeysModal
        isOpen={isHotkeysOpen}
        onClose={() => setIsHotkeysOpen(false)}
      />

      {/* 6. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        dailyTarget={dailyTarget}
        onUpdateDailyTarget={handleUpdateDailyTarget}
        wordsPerPage={wordsPerPage}
        onUpdateWordsPerPage={handleUpdateWordsPerPage}
        paperColumns={paperColumns}
        onUpdatePaperColumns={handleUpdatePaperColumns}
        isKeyboardSoundEnabled={isKeyboardSoundEnabled}
        onToggleKeyboardSound={handleToggleKeyboardSound}
        isReviewAlarmEnabled={isReviewAlarmEnabled}
        onToggleReviewAlarm={handleToggleReviewAlarm}
        isNotificationEnabled={isNotificationEnabled}
        onToggleNotification={handleToggleNotification}
        notificationThreshold={notificationThreshold}
        onUpdateNotificationThreshold={handleUpdateNotificationThreshold}
      />

      {/* 7. Study Stats Modal (今日统计与重点攻坚记忆看板) */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        words={allWordsInDeck}
      />

      {/* 8. Article Drawer (精读文章书架与导入) */}
      <ArticleDrawer
        isOpen={isArticleDrawerOpen}
        onClose={() => setIsArticleDrawerOpen(false)}
        articles={articles}
        currentArticleId={currentArticleId}
        onSelectArticle={(id) => setCurrentArticleId(id)}
      />

      {/* 9. Reinforce Card Modal (模糊/生疏词即刻强化弹窗，按任意键继续) */}
      <ReinforceCardModal
        data={reinforceModalData}
        onDismiss={handleDismissReinforce}
      />
    </div>
  );
};

export default App;

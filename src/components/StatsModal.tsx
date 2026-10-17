import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  BarChart3,
  Flame,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Volume2,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
  Copy,
  Check,
} from 'lucide-react';
import type { WordItem } from '../types';
import { isSameDay, getWordDisplayEncounters, getWordHeatmapStyle } from '../engine/heatmap';
import { speechEngine } from '../engine/speech';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordItem[];
  onInspectWord?: (word: WordItem) => void;
}

type FilterType = 'all' | 'hardcore' | 'fuzzy' | 'passed';
type SortType = 'encounters-desc' | 'encounters-asc' | 'time-desc' | 'alphabetical';

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  words,
  onInspectWord,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('encounters-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // 1. 过滤今日学习过的所有单词（今日打标过，或者 stats.lastStudiedDate 为今天）
  const todayWords = useMemo(() => {
    return words.filter((w) => {
      if (w.stats?.lastStudiedDate && isSameDay(w.stats.lastStudiedDate)) {
        return true;
      }
      // 容错：如果 reviewState 在今天被评定过
      if (w.reviewState?.lastReviewDate && isSameDay(w.reviewState.lastReviewDate)) {
        return true;
      }
      return false;
    });
  }, [words]);

  // 2. 核心量化指标计算 (KPIs)
  const totalTodayWords = todayWords.length;

  // 今日总生疏/模糊攻坚频次
  const totalTodayEncounters = useMemo(() => {
    return todayWords.reduce((sum, w) => {
      const enc = w.stats?.todayEncounters || 0;
      return sum + enc;
    }, 0);
  }, [todayWords]);

  // 平均攻坚次数
  const avgEncounters = totalTodayWords > 0
    ? (totalTodayEncounters / totalTodayWords).toFixed(1)
    : '0';

  // 重点攻坚词 (今日看了 >= 3 次的词)
  const hardcoreWords = useMemo(() => {
    return todayWords.filter((w) => {
      const enc = w.stats?.todayEncounters || 0;
      return enc >= 3;
    });
  }, [todayWords]);

  // 3. 学习次数阶梯分布 (1次, 2次, 3-4次, 5-6次, 7+次)
  const ladderDist = useMemo(() => {
    const buckets = {
      level1: 0, // 1次
      level2: 0, // 2次
      level3: 0, // 3-4次
      level4: 0, // 5-6次
      level5: 0, // 7+次
    };

    for (const w of todayWords) {
      const enc = w.stats?.todayEncounters || 0;
      if (enc <= 1) buckets.level1++;
      else if (enc === 2) buckets.level2++;
      else if (enc <= 4) buckets.level3++;
      else if (enc <= 6) buckets.level4++;
      else buckets.level5++;
    }

    return buckets;
  }, [todayWords]);

  // 4. 表格搜索、筛选与排序
  const filteredWords = useMemo(() => {
    let result = [...todayWords];

    // 搜索过滤
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.definition.toLowerCase().includes(q)
      );
    }

    // 状态分类筛选
    if (filter === 'hardcore') {
      result = result.filter((w) => (w.stats?.todayEncounters || 0) >= 3);
    } else if (filter === 'fuzzy') {
      result = result.filter(
        (w) => w.reviewState.lastRating === 2 || w.reviewState.lastRating === 3
      );
    } else if (filter === 'passed') {
      result = result.filter((w) => w.reviewState.lastRating === 1);
    }

    // 排序
    result.sort((a, b) => {
      const encA = a.stats?.todayEncounters || 0;
      const encB = b.stats?.todayEncounters || 0;

      if (sort === 'encounters-desc') {
        if (encB !== encA) return encB - encA;
        return (b.stats?.lastStudiedDate || 0) - (a.stats?.lastStudiedDate || 0);
      }
      if (sort === 'encounters-asc') {
        if (encA !== encB) return encA - encB;
        return (a.stats?.lastStudiedDate || 0) - (b.stats?.lastStudiedDate || 0);
      }
      if (sort === 'time-desc') {
        return (b.stats?.lastStudiedDate || 0) - (a.stats?.lastStudiedDate || 0);
      }
      if (sort === 'alphabetical') {
        return a.word.localeCompare(b.word);
      }
      return 0;
    });

    return result;
  }, [todayWords, searchQuery, filter, sort]);

  // 复制难词列表
  const handleCopyHardcoreList = () => {
    if (hardcoreWords.length === 0) return;
    const text = hardcoreWords
      .map(
        (w, i) =>
          `${i + 1}. ${w.word} (${w.stats?.todayEncounters || 0}次) - ${w.definition}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-[#FAF8F3] rounded-2xl shadow-2xl border-2 border-stone-300/80 w-full max-w-4xl overflow-hidden flex flex-col h-[680px] max-h-[92vh] text-stone-900"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-100/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-100 text-amber-900 rounded-xl border border-amber-300/80 shadow-2xs">
                <BarChart3 className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-stone-900 font-sans tracking-tight">
                    今日学习统计与记忆热度看板 (Today's Analytics)
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono font-bold border border-amber-300">
                    今日 {todayWords.length} 词
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 font-sans mt-0.5">
                  基于点击过筛与记忆抗阻统计，精准捕捉每一枚高阻力硬骨头词汇
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5">
            {/* 1. 今日核心 KPI 卡片区 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white/90 rounded-xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-sans font-medium text-stone-500">今日攻克单词数</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold font-mono text-stone-900">
                    {totalTodayWords}
                  </span>
                  <span className="text-xs text-stone-400">词</span>
                </div>
                <div className="text-[10px] text-stone-400 mt-1">今天参与学习过筛的词</div>
              </div>

              <div className="p-3.5 bg-white/90 rounded-xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-sans font-medium text-stone-500">今日打标过筛总流水</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold font-mono text-amber-800">
                    {totalTodayEncounters}
                  </span>
                  <span className="text-xs text-stone-400">次点击</span>
                </div>
                <div className="text-[10px] text-stone-400 mt-1">真实记忆编码刺激流水</div>
              </div>

              <div className="p-3.5 bg-white/90 rounded-xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-sans font-medium text-stone-500">平均攻坚阻力系数</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold font-mono text-stone-900">
                    {avgEncounters}
                  </span>
                  <span className="text-xs text-stone-400">次/词</span>
                </div>
                <div className="text-[10px] text-stone-400 mt-1">
                  {Number(avgEncounters) > 2 ? '⚠️ 记忆阻力较高，多难词' : '✓ 记忆顺畅高效'}
                </div>
              </div>

              <div className="p-3.5 bg-white/90 rounded-xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-sans font-medium text-stone-500">重点攻坚难词 (≥3次)</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold font-mono text-rose-700">
                    {hardcoreWords.length}
                  </span>
                  <span className="text-xs text-stone-400">词</span>
                </div>
                <div className="text-[10px] text-rose-600 font-medium mt-1">
                  {hardcoreWords.length > 0 ? '来回看了很多遍，需强记' : '今日无顽固硬骨头'}
                </div>
              </div>
            </div>

            {/* 2. 学习次数与色彩深浅阶梯分布条 */}
            <div className="p-4 bg-white/90 rounded-xl border border-stone-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-stone-900">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-700" />
                  <span>单词记忆频次深浅阶梯分布 (Exposure Spectrum)</span>
                </div>
                <span className="text-[11px] font-normal text-stone-400">
                  颜色越深，代表该词复习重温次数越多，越需重点强化
                </span>
              </div>

              {/* 视觉多色堆叠进度条 */}
              {totalTodayWords > 0 ? (
                <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${(ladderDist.level1 / totalTodayWords) * 100}%` }}
                    className="bg-stone-300 transition-all duration-300"
                    title={`1次 (初学): ${ladderDist.level1} 词`}
                  />
                  <div
                    style={{ width: `${(ladderDist.level2 / totalTodayWords) * 100}%` }}
                    className="bg-amber-200 transition-all duration-300"
                    title={`2次 (轻度): ${ladderDist.level2} 词`}
                  />
                  <div
                    style={{ width: `${(ladderDist.level3 / totalTodayWords) * 100}%` }}
                    className="bg-amber-400 transition-all duration-300"
                    title={`3~4次 (强化): ${ladderDist.level3} 词`}
                  />
                  <div
                    style={{ width: `${(ladderDist.level4 / totalTodayWords) * 100}%` }}
                    className="bg-orange-500 transition-all duration-300"
                    title={`5~6次 (重点): ${ladderDist.level4} 词`}
                  />
                  <div
                    style={{ width: `${(ladderDist.level5 / totalTodayWords) * 100}%` }}
                    className="bg-rose-600 transition-all duration-300"
                    title={`7+次 (攻坚): ${ladderDist.level5} 词`}
                  />
                </div>
              ) : (
                <div className="h-3 w-full bg-stone-100 rounded-full" />
              )}

              {/* 色谱图例说明 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px] font-mono-code">
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-stone-100/70 border border-stone-200 text-stone-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-300 shrink-0" />
                  <span className="truncate">1次 · 初学 ({ladderDist.level1})</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-300 shrink-0" />
                  <span className="truncate">2次 · 轻度 ({ladderDist.level2})</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-950 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="truncate">3~4次 · 强化 ({ladderDist.level3})</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-orange-100/80 border border-orange-300 text-orange-950 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                  <span className="truncate">5~6次 · 重点 ({ladderDist.level4})</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-950 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                  <span className="truncate">🔥 7+次 · 攻坚 ({ladderDist.level5})</span>
                </div>
              </div>
            </div>

            {/* 3. 今日单词明细审计表 (可检索、分类筛选与排序) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* 搜索框 */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="搜索今日单词或中文释义..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-hidden focus:border-amber-400 transition"
                  />
                </div>

                {/* 筛选标签切换 */}
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                      filter === 'all' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500'
                    }`}
                  >
                    全部 ({todayWords.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('hardcore')}
                    className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer flex items-center gap-1 ${
                      filter === 'hardcore' ? 'bg-rose-100 text-rose-900 shadow-2xs font-bold' : 'text-stone-500'
                    }`}
                  >
                    <span>🔥 重点难词</span>
                    <span>({hardcoreWords.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('fuzzy')}
                    className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                      filter === 'fuzzy' ? 'bg-amber-100 text-amber-900 shadow-2xs font-bold' : 'text-stone-500'
                    }`}
                  >
                    模糊/生疏
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('passed')}
                    className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                      filter === 'passed' ? 'bg-emerald-100 text-emerald-900 shadow-2xs font-bold' : 'text-stone-500'
                    }`}
                  >
                    熟练通过
                  </button>
                </div>

                {/* 排序下拉与复制难词按钮 */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-stone-500">
                    <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortType)}
                      className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-800 outline-hidden cursor-pointer"
                    >
                      <option value="encounters-desc">学习次数 ⇣ (由多到少)</option>
                      <option value="encounters-asc">学习次数 ⇡ (由少到多)</option>
                      <option value="time-desc">最近学习时间 ⇣</option>
                      <option value="alphabetical">字母顺序 A-Z</option>
                    </select>
                  </div>

                  {hardcoreWords.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyHardcoreList}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg border border-stone-200 flex items-center gap-1 transition cursor-pointer"
                      title="复制重点攻坚生词清单"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                      <span>{copied ? '已复制！' : '复制难词'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 表格主体 */}
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
                {filteredWords.length > 0 ? (
                  <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto">
                    {filteredWords.map((word, idx) => {
                      const enc = getWordDisplayEncounters(word);
                      const heatmap = getWordHeatmapStyle(enc);

                      return (
                        <div
                          key={word.id}
                          className={`p-3 flex items-center justify-between gap-3 text-xs transition hover:brightness-98 ${heatmap.bgClass}`}
                        >
                          {/* 序号与单词基本信息 */}
                          <div className="flex items-baseline gap-2 min-w-0 flex-1">
                            <span className="font-mono text-stone-400 text-[11px] w-5 text-right shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-stone-900 font-sans text-sm tracking-tight">
                              {word.word}
                            </span>
                            {word.phonetic && (
                              <span className="text-[11px] text-stone-400 font-serif-academic italic hidden sm:inline">
                                {word.phonetic}
                              </span>
                            )}
                            <span className="text-stone-600 font-serif-academic truncate max-w-xs sm:max-w-md">
                              {word.definition}
                            </span>
                          </div>

                          {/* 学习次数色彩徽章与操作 */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* 热度徽章 */}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${heatmap.badgeClass}`}
                            >
                              {heatmap.badgeText}
                            </span>

                            {/* 最近打标状态 */}
                            {word.reviewState.lastRating === 1 ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                熟练
                              </span>
                            ) : word.reviewState.lastRating === 2 ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                <HelpCircle className="w-2.5 h-2.5 text-amber-600" />
                                模糊
                              </span>
                            ) : word.reviewState.lastRating === 3 ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                <XCircle className="w-2.5 h-2.5 text-rose-600" />
                                生疏
                              </span>
                            ) : null}

                            {/* 发音按钮 */}
                            <button
                              type="button"
                              onClick={() => speechEngine.speak(word.word)}
                              className="p-1 text-stone-400 hover:text-amber-800 hover:bg-stone-200/70 rounded transition cursor-pointer"
                              title="朗读发音"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>

                            {/* 查看词根卡片 */}
                            {onInspectWord && (
                              <button
                                type="button"
                                onClick={() => onInspectWord(word)}
                                className="p-1 text-stone-400 hover:text-amber-800 hover:bg-stone-200/70 rounded transition cursor-pointer"
                                title="查看该词词根词缀助记卡片"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-stone-400 text-xs">
                    {searchQuery ? '未找到符合条件的单词' : '今日尚无学习记录，去背几个词再来看看吧！'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-stone-100/80 border-t border-stone-200/80 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-stone-400 font-sans">
              数据每日零点自动结算归档 · 离线实时持久化
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-black rounded-xl shadow-xs transition cursor-pointer"
            >
              关闭看板
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

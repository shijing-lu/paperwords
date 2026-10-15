import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Columns2,
  Columns3,
  Columns4,
  Award,
  Sparkles,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import type { WordItem, ViewMode, ActiveRecallMode, PaperColumns } from '../../types';
import { WordRow } from './WordRow';

export interface SessionProgressInfo {
  currentRound: number;
  totalTarget: number;
  passedCount: number;
  firstPassCount: number;
  firstPassRate: number;
  passRate: number;
  remainingInRound: number;
  nextRoundPending: number;
  isGraduated: boolean;
}

interface A4PaperProps {
  pageTitle: string;
  deckTitle: string;
  listIndex: number;
  totalLists: number;
  words: WordItem[];
  activeIndex: number;
  viewMode: ViewMode;
  recallMode: ActiveRecallMode;
  paperColumns: PaperColumns;
  onChangeRecallMode: (mode: ActiveRecallMode) => void;
  onChangePaperColumns: (cols: PaperColumns) => void;
  revealedWordIds: Set<string>;
  onSelectWord: (index: number) => void;
  onRateWord: (wordId: string, rating: 1 | 2 | 3) => void;
  onToggleReveal: (wordId: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  emptyMessage?: string;
  customProgress?: { current: number; total: number; label: string };
  sessionProgress?: SessionProgressInfo | null;
  roundAlert?: { type: 'advance' | 'graduation'; text: string } | null;
  onDismissRoundAlert?: () => void;
  onResetSession?: () => void;
  onGoToReview?: () => void;
}

export const A4Paper: React.FC<A4PaperProps> = ({
  pageTitle,
  deckTitle,
  listIndex,
  totalLists,
  words,
  activeIndex,
  viewMode,
  recallMode,
  paperColumns,
  onChangeRecallMode,
  onChangePaperColumns,
  revealedWordIds,
  onSelectWord,
  onRateWord,
  onToggleReveal,
  onPrevPage,
  onNextPage,
  emptyMessage,
  customProgress,
  sessionProgress,
  roundAlert,
  onDismissRoundAlert,
  onResetSession,
  onGoToReview,
}) => {
  // Completion calculation
  const ratedCount = words.filter((w) => w.reviewState.lastRating !== undefined).length;
  const isAllRated = words.length > 0 && ratedCount === words.length;

  // Flexible Progress calculation
  const progressCurrent = customProgress ? customProgress.current : ratedCount;
  const progressTotal = customProgress ? customProgress.total : words.length;
  const progressLabel = customProgress
    ? customProgress.label
    : `本页评定进度：${ratedCount} / ${words.length}`;
  const progressPercent = Math.min(
    100,
    Math.round((progressCurrent / (progressTotal || 1)) * 100)
  );

  // Container width expands gracefully for 3 and 4 columns
  const containerMaxWidth =
    paperColumns === 4 ? 'max-w-7xl' : paperColumns === 3 ? 'max-w-6xl' : 'max-w-5xl';

  const gridColsClass =
    paperColumns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : paperColumns === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2';

  return (
    <div className={`w-full ${containerMaxWidth} mx-auto my-5 px-3 sm:px-4 transition-all duration-300`}>
      {/* A4 Paper Outer Shell (稳固纸感容器，彻底杜绝数据变动导致的重新挂载闪烁) */}
      <div className="paper-sheet rounded-md p-4 sm:p-8 border border-[#E5E1D5] min-h-[760px] flex flex-col justify-between relative overflow-hidden">
        {/* Top Paper Header Bar */}
        <div>
          <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-stone-200 gap-2.5">
            {/* Title & Info */}
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-stone-100 rounded text-stone-700">
                <FileText className="w-5 h-5 text-stone-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif-academic text-lg sm:text-xl font-bold tracking-tight text-stone-900">
                    {pageTitle}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700 font-medium font-mono-code">
                    {words.length} 词
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 font-sans truncate max-w-xs sm:max-w-md">
                  {deckTitle}
                </div>
              </div>
            </div>

            {/* Middle: 3-Dimensional Recall Mode Switcher */}
            <div className="flex items-center gap-1 bg-stone-100/90 p-0.5 rounded-lg border border-stone-200/80">
              <button
                onClick={() => onChangeRecallMode('en-to-cn')}
                className={`px-2 py-1 text-xs rounded-md transition font-medium ${
                  recallMode === 'en-to-cn'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="看英文，回忆中文释义"
              >
                英译中 (遮义)
              </button>
              <button
                onClick={() => onChangeRecallMode('cn-to-en')}
                className={`px-2 py-1 text-xs rounded-md transition font-medium ${
                  recallMode === 'cn-to-en'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="看中文，回忆英文拼写"
              >
                中译英 (遮词)
              </button>
              <button
                onClick={() => onChangeRecallMode('cloze')}
                className={`px-2 py-1 text-xs rounded-md transition font-medium ${
                  recallMode === 'cloze'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="真题例句挖空实战"
              >
                真题挖空
              </button>
            </div>

            {/* Right: Column Switcher & Pagination Controls */}
            <div className="flex items-center gap-2">
              {/* Column Layout Switcher (2, 3, 4 列) */}
              <div className="hidden sm:flex items-center gap-0.5 bg-stone-100 p-0.5 rounded border border-stone-200">
                <button
                  onClick={() => onChangePaperColumns(2)}
                  title="双列排版 (每行2个)"
                  className={`p-1 rounded text-xs transition ${
                    paperColumns === 2 ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onChangePaperColumns(3)}
                  title="三列排版 (每行3个)"
                  className={`p-1 rounded text-xs transition ${
                    paperColumns === 3 ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Columns3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onChangePaperColumns(4)}
                  title="四列排版 (每行4个)"
                  className={`p-1 rounded text-xs transition ${
                    paperColumns === 4 ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Columns4 className="w-3.5 h-3.5" />
                </button>
              </div>

              {totalLists > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onPrevPage}
                    disabled={listIndex <= 1}
                    title="上一张 A4 纸 ([)"
                    className="flex items-center gap-0.5 px-2 py-1 text-xs text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-30 rounded transition"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    前页
                  </button>

                  <span className="text-xs font-mono-code text-stone-500 px-0.5">
                    {listIndex} / {totalLists || 1}
                  </span>

                  <button
                    onClick={onNextPage}
                    disabled={listIndex >= totalLists}
                    title="下一张 A4 纸 (])"
                    className="flex items-center gap-0.5 px-2 py-1 text-xs text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-30 rounded transition"
                  >
                    后页
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 轮次切换/毕业提示横条 */}
          {roundAlert && (
            <div className={`mt-3 p-3 rounded-lg flex items-center justify-between text-xs transition-all border ${
              roundAlert.type === 'graduation'
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/90 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">{roundAlert.text}</span>
              </div>
              {onDismissRoundAlert && (
                <button
                  onClick={onDismissRoundAlert}
                  className="text-stone-500 hover:text-stone-800 font-bold px-2 py-0.5"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* 今日新学多轮递进攻坚状态栏 */}
          {sessionProgress && !sessionProgress.isGraduated && (
            <div className="bg-[#FAF7F0] border border-[#E7E2D4] rounded-lg p-2.5 my-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold tracking-wide ${
                    sessionProgress.currentRound === 1
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  {sessionProgress.currentRound === 1
                    ? '🏁 第 1 轮 · 全览初筛'
                    : `🔥 第 ${sessionProgress.currentRound} 轮 · 硬骨头攻坚`}
                </span>

                <span className="text-stone-600">
                  待过筛: <strong className="text-stone-900 font-mono">{sessionProgress.remainingInRound}</strong> 词
                </span>

                <span className="text-stone-300">|</span>

                <span className="text-stone-600" title="第1轮直接熟练掌握的比例，客观反映基础">
                  一轮首通率: <strong className="text-amber-800 font-mono">{sessionProgress.firstPassRate}%</strong>
                  <span className="text-[10px] text-stone-400 ml-1">
                    ({sessionProgress.firstPassCount}/{sessionProgress.totalTarget})
                  </span>
                </span>

                {sessionProgress.nextRoundPending > 0 && (
                  <span className="text-rose-700 font-medium text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    下一轮待攻坚: {sessionProgress.nextRoundPending} 词
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-500 text-[11px]">全员闭环通过率:</span>
                  <div className="w-24 sm:w-32 bg-stone-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${sessionProgress.passRate}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-bold text-stone-700">
                    {sessionProgress.passedCount}/{sessionProgress.totalTarget} ({sessionProgress.passRate}%)
                  </span>
                </div>

                {onResetSession && (
                  <button
                    onClick={onResetSession}
                    className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 underline underline-offset-2 ml-1"
                    title="清空当前打卡进度，重新开启 1 轮全览"
                  >
                    <RotateCcw className="w-3 h-3" />
                    重置今日
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick List Status Progress (非新学会话时正常显示) */}
          {!sessionProgress && words.length > 0 && (
            <div className="flex items-center justify-between text-xs text-stone-500 my-2.5">
              <span className="font-medium text-stone-600">{progressLabel}</span>
              <div className="flex items-center gap-2">
                <div className="w-36 sm:w-48 bg-stone-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-mono-code text-[11px] text-stone-400 w-8 text-right">
                  {progressPercent}%
                </span>
              </div>
            </div>
          )}

          {/* Dynamic N-Column Words Area (自然从左到右网格排版) */}
          {words.length > 0 ? (
            <div className={`grid ${gridColsClass} gap-x-4 gap-y-1.5 mt-3 items-start`}>
              {words.map((word, idx) => (
                <WordRow
                  key={word.id}
                  word={word}
                  index={idx}
                  isActive={activeIndex === idx}
                  viewMode={viewMode}
                  recallMode={recallMode}
                  isRevealed={revealedWordIds.has(word.id)}
                  compact={paperColumns >= 3}
                  onSelect={onSelectWord}
                  onRate={onRateWord}
                  onToggleReveal={onToggleReveal}
                />
              ))}
            </div>
          ) : sessionProgress && sessionProgress.isGraduated ? (
            /* 100% 达成全员毕业报告面板 */
            <div className="py-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200 shadow-sm">
                <Award className="w-9 h-9" />
              </div>

              <h3 className="font-serif-academic text-2xl font-bold text-stone-900 mb-2">
                🎉 今日新学计划圆满毕业！
              </h3>

              <p className="text-xs sm:text-sm text-stone-600 mb-4 leading-relaxed">
                本日规划的 <strong className="text-stone-900">{sessionProgress.totalTarget}</strong> 个新词已在多轮循环淘汰中全部达成首次掌握！
              </p>

              {/* 核心指标统计卡 */}
              <div className="w-full bg-[#FAF7F0] border border-[#E7E2D4] rounded-xl p-4 mb-4 text-left text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                  <span className="text-stone-600 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    一轮首通率 (硬掌握指标)
                  </span>
                  <span className="font-mono font-bold text-base text-amber-800">
                    {sessionProgress.firstPassRate}%
                    <span className="text-xs text-stone-500 font-normal ml-1">
                      ({sessionProgress.firstPassCount} / {sessionProgress.totalTarget} 词)
                    </span>
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                  <span className="text-stone-600 font-medium">攻坚歼灭轮次</span>
                  <span className="font-mono font-bold text-stone-800">
                    共历经 {sessionProgress.currentRound} 轮循环淘汰
                  </span>
                </div>

                <div className="flex justify-between items-center text-stone-600">
                  <span className="text-stone-600 font-medium">防假熟保护 (艾宾浩斯复习)</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" />
                    已全员推入 SM-2 第一阶段 (5m 后首轮考核)
                  </span>
                </div>
              </div>

              {/* 认知科学防假熟警示 */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl text-left text-xs text-amber-950 mb-5 leading-relaxed">
                <div className="font-bold mb-1 flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  艾宾浩斯防假熟铁律：
                </div>
                今日打标的“熟练”仅完成了短时编码。科学遗忘曲线表明，20分钟后记忆率将衰减至 58%，1小时后将掉至 44%。
                这批生词已被锁定在 8 阶梯记忆巩固日程中，系统将在 5m / 30m / 12h 到期时自动通知回刷，完成长时记忆固化！
              </div>

              {/* 动作按钮 */}
              <div className="flex items-center gap-3">
                {onGoToReview && (
                  <button
                    onClick={onGoToReview}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold shadow transition"
                  >
                    前往「艾宾浩斯待复习」
                  </button>
                )}
                {onResetSession && (
                  <button
                    onClick={onResetSession}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition border border-stone-300"
                  >
                    开启下一波新词攻坚
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* 普通空白状态 */
            <div className="py-24 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-200">
                <CheckCheck className="w-8 h-8" />
              </div>
              <h3 className="font-serif-academic text-xl font-bold text-stone-800 mb-1">
                {emptyMessage || '当前没有待处理的词汇'}
              </h3>
              <p className="text-xs text-stone-400 max-w-sm">
                当前周期内的艾宾浩斯复习节点已全部搞定。累计达到提醒阈值后将自动弹出强提醒。
              </p>
            </div>
          )}
        </div>

        {/* Paper Footer with Completion Notice & Keyboard Shortcuts */}
        <div className="mt-6 pt-3 border-t border-stone-200/80 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex items-center gap-3">
            {isAllRated ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                <CheckCheck className="w-4 h-4" />
                本张 A4 纸单全部评定完成！
              </span>
            ) : (
              <span>
                按 <kbd className="px-1 py-0.5 bg-stone-200 rounded text-stone-700 font-mono">J</kbd> /{' '}
                <kbd className="px-1 py-0.5 bg-stone-200 rounded text-stone-700 font-mono">K</kbd> 极速扫读，
                <kbd className="px-1 py-0.5 bg-stone-200 rounded text-stone-700 font-mono">Space</kbd> 刮开黑幕，
                按 <kbd className="px-1 py-0.5 bg-stone-200 rounded text-stone-700 font-mono">1</kbd> 弹窗确认 / 点击 <kbd className="px-1 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">1 熟</kbd> 免弹窗极速过滤
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono-code text-[11px] text-stone-400">
            <span>{paperColumns} COLUMNS GRID</span>
            <span>•</span>
            <span>PAGE {listIndex}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

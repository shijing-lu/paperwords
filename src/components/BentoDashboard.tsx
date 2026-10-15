import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Clock, Sparkles, Layers, EyeOff, Eye, Zap, Flame, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import type { DeckItem, WordItem, ViewMode, PageTab } from '../types';
import { computeRetentionLadder } from '../engine/ebbinghaus';
import type { SessionProgressInfo } from './paper/A4Paper';

interface BentoDashboardProps {
  currentDeck: DeckItem | null;
  wordsInDeck: WordItem[];
  currentListWords: WordItem[];
  currentListIndex: number;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onOpenImport: () => void;
  onSelectSpecificList: (listIdx: number) => void;
  activeTab?: PageTab;
  sessionStats?: SessionProgressInfo | null;
}

export const BentoDashboard: React.FC<BentoDashboardProps> = ({
  currentDeck,
  wordsInDeck,
  currentListWords,
  currentListIndex,
  viewMode,
  onChangeViewMode,
  onOpenImport,
  onSelectSpecificList,
  activeTab = 'today',
  sessionStats,
}) => {
  const [showLadderDetail, setShowLadderDetail] = useState(false);

  // Statistics calculations
  const totalWords = wordsInDeck.length;
  const masteredWords = wordsInDeck.filter(w => w.reviewState.status === 'mastered').length;
  const learningWords = wordsInDeck.filter(w => w.reviewState.status === 'learning' || w.reviewState.status === 'reviewing').length;
  const newWords = wordsInDeck.filter(w => w.reviewState.status === 'new').length;

  const currentListMastered = currentListWords.filter(w => w.reviewState.lastRating === 1).length;
  const currentListFuzzy = currentListWords.filter(w => w.reviewState.lastRating === 2).length;
  const currentListUnknown = currentListWords.filter(w => w.reviewState.lastRating === 3).length;

  // Retention ladder (8 stages anti-forgetting breakdown)
  const retentionLadder = useMemo(() => computeRetentionLadder(wordsInDeck), [wordsInDeck]);

  // Due for review count
  const now = Date.now();
  const dueReviewCount = wordsInDeck.filter(
    w => w.reviewState.status !== 'new' && w.reviewState.nextReviewDate <= now
  ).length;

  const masteryPercent = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-6">
      {/* Bento Grid: 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Card 1: Ebbinghaus Today's Due & Status */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white/90 backdrop-blur-sm border border-stone-200/80 rounded-xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider font-mono-code flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              艾宾浩斯待复习
            </span>
            <span className="text-[11px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
              5m/30m/12h
            </span>
          </div>

          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans text-stone-900 tracking-tight">
              {dueReviewCount}
            </span>
            <span className="text-xs text-stone-400">词到期</span>
          </div>

          <div className="text-[11px] text-stone-500">
            {dueReviewCount > 0 ? (
              <span className="text-rose-600 font-medium">建议立即启动红宝书模式回扫</span>
            ) : (
              <span className="text-emerald-600 font-medium">当前已全部完成复习节点</span>
            )}
          </div>
        </motion.div>

        {/* Card 2: Today's Progressive Learning Round OR Current A4 Sheet Stats */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white/90 backdrop-blur-sm border border-stone-200/80 rounded-xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between"
        >
          {activeTab === 'today' && sessionStats ? (
            <>
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-medium uppercase tracking-wider font-mono-code flex items-center gap-1.5 text-stone-900">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  今日递进攻坚
                </span>
                <span className="text-[11px] px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200 font-mono font-bold">
                  第 {sessionStats.currentRound} 轮
                </span>
              </div>

              <div className="my-2">
                {sessionStats.isGraduated ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-sans text-emerald-700 tracking-tight">
                      100% 毕业
                    </span>
                    <span className="text-xs text-stone-400">已入复习日程</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-sans text-stone-900 tracking-tight">
                      {sessionStats.remainingInRound}
                    </span>
                    <span className="text-xs text-stone-400">词待审定 (本轮)</span>
                  </div>
                )}
                <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-2">
                  <span>已攻克: <strong className="text-stone-800 font-mono">{sessionStats.passedCount}/{sessionStats.totalTarget}</strong></span>
                  <span>•</span>
                  <span>首通率: <strong className="text-amber-700 font-mono">{sessionStats.firstPassRate}%</strong></span>
                </div>
              </div>

              <div className="text-[11px] truncate">
                {sessionStats.isGraduated ? (
                  <span className="text-emerald-700 font-medium">🎉 全员达成首次熟练，等待5m后初查</span>
                ) : sessionStats.nextRoundPending > 0 ? (
                  <span className="text-rose-600 font-medium">下一轮待歼灭: {sessionStats.nextRoundPending} 词</span>
                ) : (
                  <span className="text-stone-500">模糊/生疏自动打入下轮，直至100%攻克</span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-medium uppercase tracking-wider font-mono-code flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-stone-700" />
                  当前 A4 纸单
                </span>
                <span className="text-[11px] font-mono-code text-stone-500">
                  List {currentListIndex}
                </span>
              </div>

              <div className="flex items-center gap-3 my-2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-stone-600">{currentListMastered} 熟练</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-stone-600">{currentListFuzzy} 模糊</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-xs text-stone-600">{currentListUnknown} 生疏</span>
                </div>
              </div>

              {/* List selection chips */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {Array.from({ length: currentDeck?.listCount || 1 }).map((_, idx) => {
                  const listNum = idx + 1;
                  const isCur = listNum === currentListIndex;
                  return (
                    <button
                      key={listNum}
                      onClick={() => onSelectSpecificList(listNum)}
                      className={`text-[11px] px-1.5 py-0.5 rounded font-mono transition ${
                        isCur
                          ? 'bg-stone-900 text-white font-bold'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      L{listNum}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        {/* Card 3: Memory Curve Retention Ladder (8 阶段防假熟追踪) */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white/90 backdrop-blur-sm border border-stone-200/80 rounded-xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between relative"
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider font-mono-code flex items-center gap-1.5 text-stone-900">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              防假熟记忆阶梯
            </span>
            <button
              onClick={() => setShowLadderDetail((p) => !p)}
              className="text-[11px] px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 flex items-center gap-0.5 transition"
              title="查看艾宾浩斯全部 8 阶梯分布"
            >
              <span>8阶段</span>
              {showLadderDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <div className="my-2">
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${(retentionLadder.stage7to8LongTerm / (totalWords || 1)) * 100}%` }}
                className="bg-emerald-600 transition-all duration-500"
                title={`长效固化 (7~30天): ${retentionLadder.stage7to8LongTerm} 词`}
              />
              <div
                style={{ width: `${(retentionLadder.stage4to6Consolidation / (totalWords || 1)) * 100}%` }}
                className="bg-indigo-500 transition-all duration-500"
                title={`突触巩固 (1~4天): ${retentionLadder.stage4to6Consolidation} 词`}
              />
              <div
                style={{ width: `${(retentionLadder.stage1to3Immediate / (totalWords || 1)) * 100}%` }}
                className="bg-amber-500 transition-all duration-500"
                title={`即时编码 (5m~12h): ${retentionLadder.stage1to3Immediate} 词`}
              />
              <div
                style={{ width: `${(retentionLadder.stage0New / (totalWords || 1)) * 100}%` }}
                className="bg-stone-200 transition-all duration-500"
                title={`纯新词 (待学): ${retentionLadder.stage0New} 词`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-500">
            {retentionLadder.lapsedWordsCount > 0 ? (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 shrink-0" />
                {retentionLadder.lapsedWordsCount} 词发生遗忘 (防假熟)
              </span>
            ) : (
              <span className="text-stone-500">熟练需通关8阶段方能永久固化</span>
            )}
            <span className="font-mono text-stone-400">
              {masteryPercent}% 永久固化
            </span>
          </div>

          {/* 展开的 8 阶段阶梯详情弹层 */}
          <AnimatePresence>
            {showLadderDetail && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full left-0 right-0 mt-2 z-30 bg-white border border-stone-200 rounded-xl p-3 shadow-xl text-xs space-y-1.5"
              >
                <div className="font-bold text-stone-900 pb-1.5 border-b border-stone-100 flex justify-between items-center">
                  <span>艾宾浩斯 8 阶段记忆巩固阶梯</span>
                  <span className="text-[10px] text-stone-400 font-normal">需跨越全部周期</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  {retentionLadder.stages.map((st) => (
                    <div
                      key={st.stage}
                      className="flex justify-between items-center py-0.5 px-1 rounded bg-stone-50 border border-stone-100"
                    >
                      <span className="text-stone-600 truncate">
                        S{st.stage} {st.label} ({st.interval})
                      </span>
                      <strong className="font-mono text-stone-800 ml-1">
                        {st.count}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-stone-400 pt-1 leading-tight">
                  💡 单次“熟练”仅进入 Stage 1 (5分钟)，唯有持续回刷至 Stage 8 方为长时永久记忆。
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Card 4: View Mode Switcher */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white/90 backdrop-blur-sm border border-stone-200/80 rounded-xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider font-mono-code flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-600" />
              模式切换
            </span>
            <span className="text-[11px] text-stone-400">热键 M</span>
          </div>

          <div className="grid grid-cols-3 gap-1 my-1">
            <button
              onClick={() => onChangeViewMode('full')}
              className={`flex flex-col items-center py-1.5 px-1 rounded text-xs transition ${
                viewMode === 'full'
                  ? 'bg-amber-100/80 text-amber-900 font-semibold border border-amber-300'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-600'
              }`}
            >
              <Eye className="w-3.5 h-3.5 mb-0.5" />
              全览
            </button>

            <button
              onClick={() => onChangeViewMode('mask')}
              className={`flex flex-col items-center py-1.5 px-1 rounded text-xs transition ${
                viewMode === 'mask'
                  ? 'bg-rose-100/80 text-rose-900 font-semibold border border-rose-300'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-600'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5 mb-0.5" />
              遮罩
            </button>

            <button
              onClick={() => onChangeViewMode('speed')}
              className={`flex flex-col items-center py-1.5 px-1 rounded text-xs transition ${
                viewMode === 'speed'
                  ? 'bg-indigo-100/80 text-indigo-900 font-semibold border border-indigo-300'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-600'
              }`}
            >
              <Zap className="w-3.5 h-3.5 mb-0.5" />
              极速
            </button>
          </div>

          <div className="text-[11px] text-stone-500 truncate">
            {viewMode === 'mask' && '红宝书模式：遮挡中文自测'}
            {viewMode === 'full' && '通读模式：单词释义全显'}
            {viewMode === 'speed' && '极限刷词：极速扫读'}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

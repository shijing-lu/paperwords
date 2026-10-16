import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import type { WordItem, ViewMode, ActiveRecallMode, WordStudyStats } from '../../types';
import { speechEngine } from '../../engine/speech';
import { soundEffects } from '../../engine/soundEffects';
import { getWordDisplayEncounters, getWordHeatmapStyle } from '../../engine/heatmap';

interface WordRowProps {
  word: WordItem;
  index: number;
  isActive: boolean;
  viewMode: ViewMode;
  recallMode: ActiveRecallMode;
  isRevealed: boolean;
  compact?: boolean;
  onSelect: (index: number) => void;
  onRate: (wordId: string, rating: 1 | 2 | 3) => void;
  onToggleReveal: (wordId: string) => void;
}

export const WordRow: React.FC<WordRowProps> = ({
  word,
  index,
  isActive,
  viewMode,
  recallMode,
  isRevealed,
  compact = false,
  onSelect,
  onRate,
  onToggleReveal,
}) => {
  // 核心逻辑：只有在 viewMode 为 mask/speed 且当前未刮开时才应用遮罩
  const isMaskActive = (viewMode === 'mask' || viewMode === 'speed') && !isRevealed;
  const rowRef = React.useRef<HTMLDivElement>(null);

  const encounters = getWordDisplayEncounters(word);
  const heatmap = getWordHeatmapStyle(encounters);

  React.useEffect(() => {
    if (isActive && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [isActive]);

  const handlePronounce = (e: React.MouseEvent) => {
    e.stopPropagation();
    speechEngine.speak(word.word);
  };

  const handleRateAction = (rating: 1 | 2 | 3) => {
    if (rating === 1) {
      soundEffects.playSuccessTone();
    } else {
      soundEffects.playKeyTick(400);
    }
    onRate(word.id, rating);
  };

  const getStatusBadge = () => {
    const rating = word.reviewState.lastRating;
    if (rating === 1) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
          熟练
        </span>
      );
    }
    if (rating === 2) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
          <HelpCircle className="w-2.5 h-2.5 text-amber-600" />
          模糊
        </span>
      );
    }
    if (rating === 3) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
          <XCircle className="w-2.5 h-2.5 text-rose-600" />
          生疏
        </span>
      );
    }
    return null;
  };

  // 艾宾浩斯下一轮复习提前展示标签
  const getUpcomingBadge = () => {
    if (word.reviewState.status === 'new' || !word.reviewState.nextReviewDate) return null;
    const diffMs = word.reviewState.nextReviewDate - Date.now();
    if (diffMs <= 0) return null; // 已到期无需显示预习倒计时，属于此时已到期

    let timeText = '';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) {
      timeText = `${Math.max(1, mins)}分钟后`;
    } else {
      const hours = Math.floor(mins / 60);
      if (hours < 24) {
        timeText = `${hours}小时后`;
      } else {
        const days = Math.floor(hours / 24);
        timeText = days === 1 ? '明天' : days === 2 ? '后天' : `${days}天后`;
      }
    }

    return (
      <span
        className="inline-flex items-center gap-0.5 text-[9px] font-mono font-medium text-indigo-700 bg-indigo-50/90 px-1.5 py-0.2 rounded border border-indigo-200/80 shrink-0"
        title={`艾宾浩斯下一轮建议复习时间: ${new Date(word.reviewState.nextReviewDate).toLocaleString()} (提前展示)`}
      >
        <span>⏳</span>
        <span>下一轮: {timeText}</span>
      </span>
    );
  };

  // 生成真题挖空句子
  const getClozeSentence = () => {
    if (!word.examples || word.examples.length === 0) return null;
    const example = word.examples[0];
    const regex = new RegExp(`\\b${word.word}\\b`, 'gi');
    return example.replace(regex, '______');
  };

  return (
    <div
      ref={rowRef}
      onClick={() => onSelect(index)}
      className={`relative group px-2.5 py-1.5 rounded-md transition-all cursor-pointer select-none text-xs border ${
        isActive
          ? 'border-amber-400 bg-amber-100/90 shadow-[0_2px_8px_rgba(217,119,6,0.12)] ring-1 ring-amber-400'
          : heatmap.encounters > 0
          ? `${heatmap.bgClass} ${heatmap.borderClass} hover:brightness-95`
          : 'border-transparent hover:border-stone-200 hover:bg-stone-100/50'
      }`}
    >
      {/* Morphing Active indicator on the left */}
      {isActive && (
        <motion.div
          layoutId="active-indicator"
          className="absolute left-0 top-1 bottom-1 w-1 bg-amber-600 rounded-r"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}

      <div className="flex items-start justify-between gap-1.5">
        {/* Left: Index + Word + Phonetic */}
        <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
          <span className="text-[11px] text-stone-400 font-mono-code w-4 text-right shrink-0">
            {index + 1 < 10 ? `0${index + 1}` : index + 1}
          </span>

          {recallMode === 'en-to-cn' || recallMode === 'cloze' ? (
            <>
              <span className="font-semibold text-stone-900 font-sans tracking-tight text-[14px] group-hover:text-amber-900 transition-colors">
                {word.word}
              </span>

              {word.phonetic && (
                <span className="text-[11px] text-stone-500 font-serif-academic italic tracking-wide">
                  {word.phonetic}
                </span>
              )}
            </>
          ) : (
            <span
              onClick={(e) => {
                if (isMaskActive) {
                  e.stopPropagation();
                  onToggleReveal(word.id);
                }
              }}
              className={`font-semibold font-sans tracking-tight text-[13px] ${
                isMaskActive
                  ? 'bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[11px]'
                  : 'text-stone-900'
              }`}
            >
              {isMaskActive ? '[点击/空格揭示拼写]' : word.word}
            </span>
          )}

          {word.pos && (
            <span className="text-[10px] text-stone-400 font-serif italic">
              {word.pos}
            </span>
          )}
        </div>

        {/* Right: Audio button & Status Pill */}
        <div className="flex items-center gap-1 shrink-0">
          {/* 学习次数与记忆重点视觉徽章 */}
          {heatmap.encounters > 0 && (
            <span
              className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-mono-code transition-all ${heatmap.badgeClass}`}
              title={`已过筛学习 ${heatmap.encounters} 次${heatmap.isHardcore ? ' · 重点攻坚记忆！' : ''}`}
            >
              {heatmap.badgeText}
            </span>
          )}
          {getUpcomingBadge()}
          {getStatusBadge()}
          <button
            onClick={handlePronounce}
            title="发音 (P)"
            className="p-0.5 text-stone-400 hover:text-amber-700 hover:bg-amber-100/50 rounded transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Definition & Mask Section */}
      <div className="mt-1 pl-5 flex items-center justify-between text-stone-700">
        <div
          onClick={(e) => {
            if (isMaskActive && recallMode === 'en-to-cn') {
              e.stopPropagation();
              onToggleReveal(word.id);
            }
          }}
          className={`leading-relaxed transition-all duration-150 cursor-pointer ${
            isMaskActive && recallMode === 'en-to-cn' ? 'mask-hidden' : 'mask-revealed'
          }`}
        >
          {isMaskActive && recallMode === 'en-to-cn' ? (
            <span className="inline-block px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded text-[10px] font-sans">
              [点击或 Space 刮开释义]
            </span>
          ) : (
            <span className="text-[12px]">{word.definition}</span>
          )}
        </div>

        {/* Quick inline rating buttons - 所有卡片默认直接展示，点击一遍即可快速过滤出队 */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 pl-1 shrink-0"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRateAction(1);
            }}
            title="熟练 (直接点击过滤出队，无需先选卡片)"
            className="text-[10px] px-1.5 py-0.5 bg-emerald-100/90 hover:bg-emerald-200 text-emerald-800 border border-emerald-300/80 rounded font-bold transition cursor-pointer active:scale-95 shadow-2xs"
          >
            1 熟
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRateAction(2);
            }}
            title="模糊 (点击标记为模糊)"
            className="text-[10px] px-1.5 py-0.5 bg-amber-100/90 hover:bg-amber-200 text-amber-800 border border-amber-300/80 rounded font-bold transition cursor-pointer active:scale-95 shadow-2xs"
          >
            2 糊
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRateAction(3);
            }}
            title="生疏 (点击标记为生疏)"
            className="text-[10px] px-1.5 py-0.5 bg-rose-100/90 hover:bg-rose-200 text-rose-800 border border-rose-300/80 rounded font-bold transition cursor-pointer active:scale-95 shadow-2xs"
          >
            3 生
          </button>
        </div>
      </div>

      {/* 真题挖空模式 C 展示 */}
      {recallMode === 'cloze' && getClozeSentence() && (
        <div className="mt-1 pl-5 text-[11px] text-stone-600 bg-amber-50/70 p-1 rounded border border-amber-200/60 font-sans">
          <span className="font-semibold text-amber-800">语境：</span>
          <span className="italic">{getClozeSentence()}</span>
        </div>
      )}

      {/* Example sentence (if not in compact mode or active) */}
      {!compact && recallMode !== 'cloze' && !isMaskActive && word.examples && word.examples.length > 0 && isActive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-1 pl-5 text-[11px] text-stone-500 font-serif-academic italic border-l-2 border-stone-200 ml-5"
        >
          {word.examples[0]}
        </motion.div>
      )}
    </div>
  );
};

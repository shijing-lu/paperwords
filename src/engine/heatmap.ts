import type { WordItem, WordStudyStats } from '../types';

export interface HeatmapStyle {
  encounters: number;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  badgeText: string;
  isHardcore: boolean; // 是否属于高频重点攻坚难词 (>=5次)
}

/**
 * 校验时间戳是否在今天 00:00:00 之后
 */
export function isSameDay(timestamp: number, baseDate: Date = new Date()): boolean {
  if (!timestamp) return false;
  const target = new Date(timestamp);
  return (
    target.getFullYear() === baseDate.getFullYear() &&
    target.getMonth() === baseDate.getMonth() &&
    target.getDate() === baseDate.getDate()
  );
}

/**
 * 获取当前单词用于呈现热度的学习次数
 * 规则：优先取今日学习次数；若今天尚未打标，则展示历史累计学习次数
 */
export function getWordDisplayEncounters(word: WordItem): number {
  if (!word.stats) {
    // 兼容老数据：仅在老数据曾标记为模糊 (2) 或 生疏 (3) 时算 1 次难词
    if (word.reviewState.lastRating === 2 || word.reviewState.lastRating === 3) return 1;
    return 0;
  }

  const { todayEncounters = 0, totalEncounters = 0, lastStudiedDate } = word.stats;

  if (lastStudiedDate && isSameDay(lastStudiedDate)) {
    return todayEncounters;
  }

  return totalEncounters;
}

/**
 * 根据学习次数输出对应的学术纸感渐变深浅色彩规范
 */
export function getWordHeatmapStyle(encounters: number): HeatmapStyle {
  if (encounters <= 0) {
    return {
      encounters: 0,
      bgClass: '',
      borderClass: 'border-transparent',
      badgeClass: '',
      badgeText: '',
      isHardcore: false,
    };
  }

  // 1 次：初识初学（极浅纸黄色底，低心智负担）
  if (encounters === 1) {
    return {
      encounters: 1,
      bgClass: 'bg-stone-100/70',
      borderClass: 'border-stone-200/80',
      badgeClass: 'text-stone-500 bg-stone-200/60 border border-stone-300/60',
      badgeText: '1次 · 初学',
      isHardcore: false,
    };
  }

  // 2 次：轻度巩固（柔和麦芽黄，开始形成印记）
  if (encounters === 2) {
    return {
      encounters: 2,
      bgClass: 'bg-amber-50/80',
      borderClass: 'border-amber-200/80',
      badgeClass: 'text-amber-800 bg-amber-100/90 border border-amber-300/80 font-medium',
      badgeText: '2次',
      isHardcore: false,
    };
  }

  // 3 ~ 4 次：反复过筛（醇厚琥珀金，中度认知拉锯）
  if (encounters >= 3 && encounters <= 4) {
    return {
      encounters,
      bgClass: 'bg-amber-100/75',
      borderClass: 'border-amber-300/90',
      badgeClass: 'text-amber-950 bg-amber-200/90 border border-amber-400/80 font-semibold',
      badgeText: `${encounters}次 · 强化`,
      isHardcore: false,
    };
  }

  // 5 ~ 6 次：深度攻坚（焦糖橙黄，明显突出重点）
  if (encounters >= 5 && encounters <= 6) {
    return {
      encounters,
      bgClass: 'bg-orange-100/80',
      borderClass: 'border-orange-300 ring-1 ring-orange-200/80',
      badgeClass: 'text-orange-950 bg-orange-200 border border-orange-400 font-bold',
      badgeText: `⚡ ${encounters}次 · 重点`,
      isHardcore: true,
    };
  }

  // 7 次及以上：顽固难词（醒目火漆印赭石红，重点记忆攻坚）
  return {
    encounters,
    bgClass: 'bg-rose-100/80',
    borderClass: 'border-rose-400/90 ring-1 ring-rose-300 shadow-2xs',
    badgeClass: 'text-rose-950 bg-rose-200 border border-rose-400 font-extrabold tracking-wide',
    badgeText: `🔥 ${encounters}次 · 攻坚`,
    isHardcore: true,
  };
}

/**
 * 学习打标统计累加器辅助函数
 */
export function recordWordEncounter(
  currentStats: WordStudyStats | undefined,
  rating: 1 | 2 | 3,
  sessionType: 'today' | 'review' | 'other' = 'today'
): WordStudyStats {
  const now = Date.now();
  const prevToday = currentStats?.lastStudiedDate && isSameDay(currentStats.lastStudiedDate)
    ? currentStats.todayEncounters || 0
    : 0;

  const newLog = {
    timestamp: now,
    rating,
    sessionType,
  };

  const prevHistory = currentStats?.studyHistory || [];
  // 保留最近 50 条打标流水
  const updatedHistory = [...prevHistory.slice(-49), newLog];

  // 用户规则：点击“熟悉”(1)不计入，只有点击“模糊”(2)和“生疏”(3)才会算次数
  const shouldCount = rating === 2 || rating === 3;

  return {
    totalEncounters: (currentStats?.totalEncounters || 0) + (shouldCount ? 1 : 0),
    todayEncounters: prevToday + (shouldCount ? 1 : 0),
    lastStudiedDate: now,
    firstStudiedDate: currentStats?.firstStudiedDate || now,
    studyHistory: updatedHistory,
  };
}

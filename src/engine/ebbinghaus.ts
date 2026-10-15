import type { ReviewState, MasteryStatus, WordItem } from '../types';

// 遗忘曲线间隔矩阵 (以分钟或天为单位)
// 即时周期：5分钟、30分钟、12小时 (720分钟)
// 跨天周期：1天、2天、4天、7天、15天、30天
export const EBBINGHAUS_INTERVALS_MINUTES = [
  5,        // Stage 0 -> 5m
  30,       // Stage 1 -> 30m
  12 * 60,  // Stage 2 -> 12h
];

export const EBBINGHAUS_INTERVALS_DAYS = [
  1,   // Stage 3 -> 1d
  2,   // Stage 4 -> 2d
  4,   // Stage 5 -> 4d
  7,   // Stage 6 -> 7d
  15,  // Stage 7 -> 15d
  30,  // Stage 8 -> 30d
];

/**
 * 计算用户打标后的下一个艾宾浩斯复习状态
 * @param currentState 当前复习状态
 * @param rating 1: 熟练掌握, 2: 模糊/犹豫, 3: 完全生疏
 */
export function calculateNextReviewState(
  currentState: ReviewState,
  rating: 1 | 2 | 3
): ReviewState {
  const now = Date.now();
  let { repetition, interval, easeFactor, lapses } = currentState;
  let status: MasteryStatus = currentState.status;

  if (rating === 1) {
    // 掌握 (Mastered)
    repetition += 1;
    easeFactor = Math.min(3.0, easeFactor + 0.1);

    if (repetition === 1) {
      interval = 5 / (24 * 60); // 5 分钟
      status = 'learning';
    } else if (repetition === 2) {
      interval = 30 / (24 * 60); // 30 分钟
      status = 'learning';
    } else if (repetition === 3) {
      interval = 0.5; // 12 小时
      status = 'reviewing';
    } else if (repetition === 4) {
      interval = 1; // 1 天
      status = 'reviewing';
    } else if (repetition === 5) {
      interval = 2; // 2 天
      status = 'reviewing';
    } else if (repetition === 6) {
      interval = 4; // 4 天
      status = 'reviewing';
    } else if (repetition === 7) {
      interval = 7; // 7 天
      status = 'reviewing';
    } else if (repetition >= 8) {
      interval = Math.round(interval * easeFactor);
      status = 'mastered';
    }
  } else if (rating === 2) {
    // 模糊 (Fuzzy) - 保留阶段但缩小间隔，今日重温
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    interval = 15 / (24 * 60); // 15 分钟后再次出现
    status = 'learning';
  } else {
    // 生疏 (Unknown) - 重置进度
    repetition = 0;
    lapses += 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    interval = 3 / (24 * 60); // 3 分钟后必须再次出现
    status = 'learning';
  }

  const nextReviewDate = now + Math.round(interval * 24 * 60 * 60 * 1000);

  return {
    repetition,
    interval,
    easeFactor,
    lastReviewDate: now,
    nextReviewDate,
    lapses,
    status,
    lastRating: rating,
  };
}

/**
 * 格式化下次复习相对时间
 */
export function formatNextReviewTime(nextTimestamp: number): string {
  const diffMs = nextTimestamp - Date.now();
  if (diffMs <= 0) return '已到期，需复习';

  const diffMins = Math.round(diffMs / (60 * 1000));
  if (diffMins < 60) return `${diffMins} 分钟后`;

  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时后`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} 天后`;
}

export interface RetentionLadderStats {
  stage0New: number;              // 纯新词 (未学)
  stage1to3Immediate: number;     // 瞬时编码期 (5m, 30m, 12h)
  stage4to6Consolidation: number; // 突触巩固期 (1d, 2d, 4d)
  stage7to8LongTerm: number;      // 长效记忆期 (7d, 15d, 30d)
  totalWords: number;
  totalLapses: number;            // 累计遗忘重置次数
  lapsedWordsCount: number;       // 曾发生过假熟/遗忘打回的词数
  stages: { stage: number; label: string; interval: string; count: number }[];
}

/**
 * 统计词库中处于 8 个艾宾浩斯复习周期的阶梯分布与假熟失误监测
 */
export function computeRetentionLadder(words: WordItem[]): RetentionLadderStats {
  const stages = [
    { stage: 0, label: '纯新词', interval: '待新学', count: 0 },
    { stage: 1, label: '初编码', interval: '5 分钟', count: 0 },
    { stage: 2, label: '短时记忆', interval: '30 分钟', count: 0 },
    { stage: 3, label: '日间重温', interval: '12 小时', count: 0 },
    { stage: 4, label: '次日提取', interval: '1 天', count: 0 },
    { stage: 5, label: '突触稳固', interval: '2 天', count: 0 },
    { stage: 6, label: '隔周巩固', interval: '4 天', count: 0 },
    { stage: 7, label: '周环闭合', interval: '7 天', count: 0 },
    { stage: 8, label: '永久长时', interval: '15~30 天', count: 0 },
  ];

  let totalLapses = 0;
  let lapsedWordsCount = 0;

  for (const w of words) {
    const lapses = w.reviewState.lapses || 0;
    totalLapses += lapses;
    if (lapses > 0) lapsedWordsCount += 1;

    if (w.reviewState.status === 'new') {
      stages[0].count += 1;
    } else {
      const rep = w.reviewState.repetition;
      if (rep <= 1) stages[1].count += 1;
      else if (rep === 2) stages[2].count += 1;
      else if (rep === 3) stages[3].count += 1;
      else if (rep === 4) stages[4].count += 1;
      else if (rep === 5) stages[5].count += 1;
      else if (rep === 6) stages[6].count += 1;
      else if (rep === 7) stages[7].count += 1;
      else stages[8].count += 1;
    }
  }

  const stage0New = stages[0].count;
  const stage1to3Immediate = stages[1].count + stages[2].count + stages[3].count;
  const stage4to6Consolidation = stages[4].count + stages[5].count + stages[6].count;
  const stage7to8LongTerm = stages[7].count + stages[8].count;

  return {
    stage0New,
    stage1to3Immediate,
    stage4to6Consolidation,
    stage7to8LongTerm,
    totalWords: words.length,
    totalLapses,
    lapsedWordsCount,
    stages,
  };
}

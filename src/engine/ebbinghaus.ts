import type { ReviewState, MasteryStatus, WordItem } from '../types';

/**
 * 经典标准艾宾浩斯抗遗忘记忆曲线间隔阶梯 (以“天”为单位的科学递增跨度)
 * 依据赫尔曼·艾宾浩斯记忆遗忘规律与现代 SM-2 / Anki 算法实践：
 * - 学习当天：通过多轮即时攻坚完成编码与初筛，今日任务即告达成；
 * - 第 1 次复习：1 天后 (次日清晨) —— 抵御首日最剧烈的遗忘陡坡；
 * - 第 2 次复习：2 天后 —— 强化短时记忆向中间记忆转化；
 * - 第 3 次复习：4 天后 —— 巩固突触连接；
 * - 第 4 次复习：7 天后 (1 周) —— 形成周记忆闭环；
 * - 第 5 次复习：15 天后 (半个月) —— 深层长效记忆；
 * - 第 6 次复习：30 天后 (1 个月) —— 进入稳固记忆网络；
 * - 第 7 次复习：60 天后 (2 个月) —— 超长效记忆巩固；
 * - 第 8 次及以上：90 天+ —— 转化为永久熟练掌握 (Mastered)。
 */
export const EBBINGHAUS_INTERVAL_DAYS = [
  1,   // Stage 1: 1 天后 (明天)
  2,   // Stage 2: 2 天后
  4,   // Stage 3: 4 天后
  7,   // Stage 4: 7 天后 (1 周)
  15,  // Stage 5: 15 天后 (半个月)
  30,  // Stage 6: 30 天后 (1 个月)
  60,  // Stage 7: 60 天后 (2 个月)
  90,  // Stage 8: 90 天后 (长效永久掌握)
];

// 向后兼容旧常量的导出，避免其他模块引入报错
export const EBBINGHAUS_INTERVALS_MINUTES = [1440, 2880, 5760];
export const EBBINGHAUS_INTERVALS_DAYS = EBBINGHAUS_INTERVAL_DAYS;

/**
 * 日历日归一化时间戳生成器
 * 将下一次复习时间统一对齐到目标日期的清晨 04:00 (人类睡眠记忆巩固与新一天计划的天然分界线)
 * 彻底杜绝“刚点完熟练，过了几分钟又弹出来”的碎片化骚扰！
 */
export function calculateTargetReviewDate(intervalDays: number): number {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, Math.round(intervalDays)));
  d.setHours(4, 0, 0, 0); // 统一对齐到清晨 04:00
  return d.getTime();
}

/**
 * 计算用户打标后的下一个艾宾浩斯复习状态 (严谨科学实现)
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
    // 掌握 / 熟练 (Mastered this repetition)
    repetition += 1;
    easeFactor = Math.min(3.0, easeFactor + 0.1);

    if (repetition === 1) {
      // 首次攻克掌握：进入第 1 复习期，明天 (1 天后) 开启抗遗忘复习
      interval = 1;
      status = 'learning';
    } else if (repetition === 2) {
      // 成功通过第 1 次复习：间隔翻倍至 2 天后
      interval = 2;
      status = 'reviewing';
    } else if (repetition === 3) {
      interval = 4; // 4 天后
      status = 'reviewing';
    } else if (repetition === 4) {
      interval = 7; // 7 天后 (1 周)
      status = 'reviewing';
    } else if (repetition === 5) {
      interval = 15; // 15 天后
      status = 'reviewing';
    } else if (repetition === 6) {
      interval = 30; // 30 天后
      status = 'reviewing';
    } else if (repetition === 7) {
      interval = 60; // 60 天后
      status = 'reviewing';
    } else {
      // 连续 8 次以上熟练掌握：永久牢固掌握，进入 90天+ 的超低频巩固
      interval = Math.round(Math.max(60, interval) * easeFactor);
      status = 'mastered';
    }
  } else if (rating === 2) {
    // 模糊 (Fuzzy) - 记忆出现动摇，保留状态但下次定在明天 (1 天后) 重新强化巩固
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    interval = 1;
    status = 'learning';
  } else {
    // 生疏 (Unknown) - 彻底遗忘，重置阶梯重新进入抗遗忘循环
    repetition = 0;
    lapses += 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    interval = 1; // 明天重头开始
    status = 'learning';
  }

  // 严格按日历天生成目标日期清晨 04:00 的时间戳
  const nextReviewDate = calculateTargetReviewDate(interval);

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

  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  if (diffHours < 24) {
    const diffMins = Math.round(diffMs / (60 * 1000));
    if (diffMins < 60) return `${Math.max(1, diffMins)} 分钟后`;
    return `${diffHours} 小时后`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return '明天';
  if (diffDays === 2) return '后天';
  return `${diffDays} 天后`;
}

export interface RetentionLadderStats {
  stage0New: number;              // 纯新词 (未学)
  stage1to3Immediate: number;     // 初阶记忆期 (1d, 2d, 4d)
  stage4to6Consolidation: number; // 稳固闭环期 (7d, 15d, 30d)
  stage7to8LongTerm: number;      // 永久牢固期 (60d, 90d+)
  totalWords: number;
  totalLapses: number;            // 累计遗忘重置次数
  lapsedWordsCount: number;       // 曾发生过遗忘打回的词数
  stages: { stage: number; label: string; interval: string; count: number }[];
}

/**
 * 统计词库中处于 8 个艾宾浩斯复习周期的阶梯分布
 */
export function computeRetentionLadder(words: WordItem[]): RetentionLadderStats {
  const stages = [
    { stage: 0, label: '纯新词', interval: '待新学', count: 0 },
    { stage: 1, label: '首日达成', interval: '1 天 (明天)', count: 0 },
    { stage: 2, label: '双日巩固', interval: '2 天后', count: 0 },
    { stage: 3, label: '半周复现', interval: '4 天后', count: 0 },
    { stage: 4, label: '周环闭合', interval: '7 天 (1周)', count: 0 },
    { stage: 5, label: '半月稳固', interval: '15 天', count: 0 },
    { stage: 6, label: '月度沉淀', interval: '30 天 (1月)', count: 0 },
    { stage: 7, label: '双月长效', interval: '60 天 (2月)', count: 0 },
    { stage: 8, label: '永久熟练', interval: '90天+ (永固)', count: 0 },
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

/**
 * 历史数据平滑校正函数：彻底修复用户数据库中被旧逻辑污染的“5分钟/30分钟/12小时假过期”数据
 * 将所有“之前明明已经熟练掌握了却被频繁要求复习”的单词，按科学标准重新安排到正确的下一轮时间！
 */
export function sanitizeCorruptedWordReviews(words: WordItem[]): {
  repairedWords: WordItem[];
  repairedCount: number;
} {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const repairedWords: WordItem[] = [];

  for (const w of words) {
    // 仅针对非新词且有打标记录的单词
    if (w.reviewState.status === 'new') continue;

    const { repetition, interval, lastRating, lastReviewDate, nextReviewDate } = w.reviewState;
    let needsRepair = false;

    // 判定异常场景：
    // 1. 最近一次打标是熟练 (1)，但 interval < 1 天 (之前写入了 5/1440 或 30/1440 等分钟级错误数据)
    // 2. 最近一次在今天打标了熟练 (lastReviewDate >= todayStart && lastRating === 1)，但 nextReviewDate 却定在今天之前或今天内部 (导致今天刚背完就又弹出来)
    if (lastRating === 1 && interval < 1) {
      needsRepair = true;
    } else if (lastReviewDate >= todayStart.getTime() && lastRating === 1 && nextReviewDate <= now) {
      needsRepair = true;
    }

    if (needsRepair) {
      // 按照其 repetition 阶梯，重新赋予正确的 interval (天) 和 nextReviewDate (明天凌晨 04:00 起)
      const rep = Math.max(1, repetition || 1);
      const correctInterval =
        rep === 1 ? 1 : rep === 2 ? 2 : rep === 3 ? 4 : rep === 4 ? 7 : rep === 5 ? 15 : rep === 6 ? 30 : 60;
      const targetTimestamp = calculateTargetReviewDate(correctInterval);

      repairedWords.push({
        ...w,
        reviewState: {
          ...w.reviewState,
          repetition: rep,
          interval: correctInterval,
          nextReviewDate: targetTimestamp,
          status: rep >= 7 ? 'mastered' : 'reviewing',
        },
      });
    }
  }

  return {
    repairedWords,
    repairedCount: repairedWords.length,
  };
}

/**
 * Progressive Learning Multi-Round Group & Consolidation Session Manager
 * 科学记忆法：分组小循环 (Leech Elimination) + 全体合并多轮大复习 (Consolidation) + 艾宾浩斯抗遗忘毕业
 *
 * 学习与复习节奏：
 * 1. 分组学习 (stage: 'group')：
 *    - 从第 1 组开始，依次进行第 1 轮、第 2 轮、第 3 轮学习；
 *    - 组内打标：熟练(1)出队，模糊(2)/生疏(3)进入本组下一轮硬骨头攻坚；
 *    - 本组全部轮次学完 (100%攻克) 后，再进阶开启第 2 组学习，直至所有组完成。
 * 2. 整体复习 (stage: 'consolidation')：
 *    - 当所有组数都学完后，将它们合并起来再过一遍；
 *    - 按照第 1 轮、第 2 轮、第 3 轮、第 4 轮...的节奏进行全体巩固；
 *    - 模糊/生疏词持续打入下轮，直至全体 100% 掌握。
 * 3. 毕业推入艾宾浩斯：
 *    - 全体大复习闭环后，全员毕业，排入科学艾宾浩斯日程（明天清晨开始首轮复习）。
 */

import type { WordItem } from '../types';
import { calculateTargetReviewDate } from './ebbinghaus';

export type GroupMode = 'bySize' | 'byCount';

export interface GroupConfig {
  mode: GroupMode; // 'bySize' (按每组词数, 如 33词/组) | 'byCount' (按组数, 如 分5组)
  value: number;   // 词数 (如 25, 33) 或 组数 (如 3, 5)
}

export interface WordGroup {
  groupIndex: number;          // 0, 1, 2...
  groupName: string;           // "第 1 组", "第 2 组"...
  wordIds: string[];           // 本组全量单词 ID
  currentRound: number;        // 本组内当前轮次 (1, 2, 3...)
  activeQueueIds: string[];    // 本组当前轮待过筛单词
  nextRoundWordIds: string[];  // 本组待进入下一轮的生疏词 (模糊/生疏)
  passedWordIds: string[];     // 本组已过筛掌握的单词
  isCompleted: boolean;        // 本组是否已全部过关
}

export interface DailyLearningSession {
  deckId: string;
  dateKey: string;             // YYYY-MM-DD
  targetWordIds: string[];     // 今日全部目标单词 ID (例如 100 词)
  
  // 分组配置与状态
  groupConfig: GroupConfig;
  groups: WordGroup[];
  currentGroupIndex: number;   // 当前进行的组索引 0 ~ groups.length - 1
  
  // 当前所处大阶段：'group' (分组攻坚) | 'consolidation' (全体大复习)
  stage: 'group' | 'consolidation';
  
  // 全体合并大复习阶段状态
  consolidation: {
    currentRound: number;        // 全体大复习当前轮次 (1, 2, 3, 4...)
    activeQueueIds: string[];    // 当前大复习轮待过筛单词
    nextRoundWordIds: string[];  // 待进入下一轮大复习的词
    passedWordIds: string[];     // 大复习已通过的词
  };

  // 兼容老版本的扁平视图属性 (直接映射当前活跃状态)
  currentRound: number;        // 当前活跃的轮次
  activeQueueIds: string[];    // 当前活跃队列
  passedWordIds: string[];     // 累计已通过单词
  nextRoundWordIds: string[];  // 当前下一轮待攻坚词
  
  firstPassIds: string[];      // 首次过筛直接掌握的单词 (用于一轮首通率统计)
  isGraduated: boolean;        // 是否全员大复习毕业推入艾宾浩斯
}

export type SessionEventType =
  | 'rated'
  | 'group_round_advance'
  | 'group_completed'
  | 'enter_consolidation'
  | 'consolidation_round_advance'
  | 'all_graduated';

export interface SessionRatingEvent {
  type: SessionEventType;
  title: string;
  message: string;
  groupIndex?: number;
  groupName?: string;
  nextRound?: number;
}

const STORAGE_KEY = 'paperwords_progressive_session_v3';
const GROUP_PREF_KEY = 'paperwords_group_learning_pref';

/**
 * 均匀切分单词数组到多个组中
 */
export function partitionWords(wordIds: string[], config: GroupConfig): WordGroup[] {
  const total = wordIds.length;
  if (total === 0) return [];

  let count = 1;
  if (config.mode === 'byCount') {
    count = Math.min(total, Math.max(1, Math.round(config.value)));
  } else {
    const size = Math.max(1, Math.round(config.value));
    count = Math.min(total, Math.max(1, Math.round(total / size)));
  }

  // 均衡分配：前 remainder 组分配 baseSize + 1 个，其余分配 baseSize 个
  const baseSize = Math.floor(total / count);
  const remainder = total % count;

  const groups: WordGroup[] = [];
  let startIndex = 0;

  for (let i = 0; i < count; i++) {
    const groupSize = i < remainder ? baseSize + 1 : baseSize;
    const chunk = wordIds.slice(startIndex, startIndex + groupSize);
    startIndex += groupSize;

    groups.push({
      groupIndex: i,
      groupName: `第 ${i + 1} 组`,
      wordIds: chunk,
      currentRound: 1,
      activeQueueIds: [...chunk],
      nextRoundWordIds: [],
      passedWordIds: [],
      isCompleted: false,
    });
  }

  return groups;
}

/**
 * 根据每日总词量获取合理的默认分组配置
 */
export function getDefaultGroupConfig(totalCount: number): GroupConfig {
  if (totalCount <= 30) {
    return { mode: 'bySize', value: 30 }; // 单组即可
  }
  if (totalCount <= 75) {
    return { mode: 'bySize', value: 25 }; // 2~3 组
  }
  if (totalCount <= 120) {
    return { mode: 'bySize', value: 33 }; // 3 组左右 (100词分33词一组)
  }
  return { mode: 'byCount', value: 5 };   // 200词分5组
}

export const sessionManager = {
  getTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  getStorageKey(deckId: string, userId?: string): string {
    return userId ? `${STORAGE_KEY}_${userId}_${deckId}` : `${STORAGE_KEY}_${deckId}`;
  },

  // 获取保存的分组偏好
  getSavedGroupPref(): GroupConfig | null {
    try {
      const raw = localStorage.getItem(GROUP_PREF_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  },

  // 保存分组偏好
  saveGroupPref(pref: GroupConfig) {
    try {
      localStorage.setItem(GROUP_PREF_KEY, JSON.stringify(pref));
    } catch (e) {}
  },

  // 内部辅助：刷新映射的顶层活跃字段
  syncTopLevelFields(session: DailyLearningSession): DailyLearningSession {
    if (session.stage === 'group') {
      const currentGroup = session.groups[session.currentGroupIndex] || session.groups[0];
      if (currentGroup) {
        session.currentRound = currentGroup.currentRound;
        session.activeQueueIds = [...currentGroup.activeQueueIds];
        session.nextRoundWordIds = [...currentGroup.nextRoundWordIds];
      }
    } else {
      session.currentRound = session.consolidation.currentRound;
      session.activeQueueIds = [...session.consolidation.activeQueueIds];
      session.nextRoundWordIds = [...session.consolidation.nextRoundWordIds];
    }
    return session;
  },

  // 加载会话
  loadSession(deckId: string, userId?: string): DailyLearningSession | null {
    try {
      const raw = localStorage.getItem(this.getStorageKey(deckId, userId));
      if (!raw) return null;
      const session: DailyLearningSession = JSON.parse(raw);
      if (session.dateKey !== this.getTodayKey()) {
        return null; // 过期跨天
      }
      // 容错兼容：如果是老版本缺少 groups 结构，自动升级
      if (!session.groups || session.groups.length === 0) {
        return null;
      }
      return this.syncTopLevelFields(session);
    } catch (e) {
      console.warn('Failed to load learning session:', e);
      return null;
    }
  },

  // 保存会话
  saveSession(session: DailyLearningSession, userId?: string) {
    try {
      this.syncTopLevelFields(session);
      localStorage.setItem(this.getStorageKey(session.deckId, userId), JSON.stringify(session));
    } catch (e) {
      console.warn('Failed to save learning session:', e);
    }
  },

  // 初始化会话
  initSession(
    deckId: string,
    targetWords: WordItem[],
    userId?: string,
    customGroupConfig?: GroupConfig
  ): DailyLearningSession {
    const todayKey = this.getTodayKey();
    const existing = this.loadSession(deckId, userId);
    if (existing && existing.dateKey === todayKey && existing.targetWordIds.length > 0) {
      return existing;
    }

    const ids = targetWords.map((w) => w.id);
    const pref = customGroupConfig || this.getSavedGroupPref() || getDefaultGroupConfig(ids.length);
    const groups = partitionWords(ids, pref);

    const firstGroup = groups[0] || {
      groupIndex: 0,
      groupName: '第 1 组',
      wordIds: ids,
      currentRound: 1,
      activeQueueIds: [...ids],
      nextRoundWordIds: [],
      passedWordIds: [],
      isCompleted: false,
    };

    const session: DailyLearningSession = {
      deckId,
      dateKey: todayKey,
      targetWordIds: ids,
      groupConfig: pref,
      groups,
      currentGroupIndex: 0,
      stage: 'group',
      consolidation: {
        currentRound: 1,
        activeQueueIds: [],
        nextRoundWordIds: [],
        passedWordIds: [],
      },
      currentRound: 1,
      activeQueueIds: [...firstGroup.activeQueueIds],
      passedWordIds: [],
      nextRoundWordIds: [],
      firstPassIds: [],
      isGraduated: false,
    };

    this.saveSession(session, userId);
    return session;
  },

  // 动态修改/重配分组设置
  reconfigureGroups(
    session: DailyLearningSession,
    newConfig: GroupConfig,
    userId?: string
  ): DailyLearningSession {
    this.saveGroupPref(newConfig);
    const groups = partitionWords(session.targetWordIds, newConfig);
    const updated: DailyLearningSession = {
      ...session,
      groupConfig: newConfig,
      groups,
      currentGroupIndex: 0,
      stage: 'group',
      consolidation: {
        currentRound: 1,
        activeQueueIds: [],
        nextRoundWordIds: [],
        passedWordIds: [],
      },
      currentRound: 1,
      activeQueueIds: [...(groups[0]?.activeQueueIds || session.targetWordIds)],
      passedWordIds: [],
      nextRoundWordIds: [],
      firstPassIds: [],
      isGraduated: false,
    };
    this.saveSession(updated, userId);
    return updated;
  },

  // 核心打标流转引擎 (分组小循环 + 全体大复习)
  recordWordRating(
    session: DailyLearningSession,
    wordId: string,
    rating: 1 | 2 | 3,
    userId?: string
  ): {
    updatedSession: DailyLearningSession;
    roundFinished: boolean;
    allGraduated: boolean;
    event: SessionRatingEvent;
  } {
    let updated: DailyLearningSession = JSON.parse(JSON.stringify(session));

    // ==========================================
    // 阶段 1：分组学习阶段 (stage: 'group')
    // ==========================================
    if (updated.stage === 'group') {
      const groupIdx = updated.currentGroupIndex;
      const group = updated.groups[groupIdx];

      // 从本组活跃队列移除
      group.activeQueueIds = group.activeQueueIds.filter((id) => id !== wordId);

      if (rating === 1) {
        // 熟练掌握
        if (!group.passedWordIds.includes(wordId)) {
          group.passedWordIds.push(wordId);
        }
        if (!updated.passedWordIds.includes(wordId)) {
          updated.passedWordIds.push(wordId);
        }
        // 如果是本组第 1 轮且首次接触掌握，记录为一轮首通
        if (group.currentRound === 1 && !updated.firstPassIds.includes(wordId)) {
          updated.firstPassIds.push(wordId);
        }
      } else {
        // 模糊 (2) 或 生疏 (3)：排入该组下一轮攻坚
        if (!group.nextRoundWordIds.includes(wordId)) {
          group.nextRoundWordIds.push(wordId);
        }
      }

      // 检查本组当前轮是否结束
      const groupRoundFinished = group.activeQueueIds.length === 0;

      if (!groupRoundFinished) {
        // 本组当前轮继续
        this.saveSession(updated, userId);
        return {
          updatedSession: updated,
          roundFinished: false,
          allGraduated: false,
          event: {
            type: 'rated',
            title: '打标记录',
            message: '',
          },
        };
      }

      // 本组当前轮结束：检查本组是否还有生疏词
      if (group.nextRoundWordIds.length > 0) {
        // 还有模糊/生疏词：本组进入下一轮硬骨头攻坚！
        group.currentRound += 1;
        group.activeQueueIds = [...group.nextRoundWordIds];
        group.nextRoundWordIds = [];

        this.saveSession(updated, userId);
        return {
          updatedSession: updated,
          roundFinished: true,
          allGraduated: false,
          event: {
            type: 'group_round_advance',
            title: `${group.groupName} · 第 ${group.currentRound} 轮硬骨头攻坚`,
            message: `🏁 ${group.groupName} 第 ${group.currentRound - 1} 轮初筛完成！剩余 ${group.activeQueueIds.length} 个模糊/生疏词已进入【第 ${group.currentRound} 轮攻坚】，继续保持！`,
            groupIndex: groupIdx,
            groupName: group.groupName,
            nextRound: group.currentRound,
          },
        };
      }

      // 本组全部生疏词攻克：当前组已彻底通关！
      group.isCompleted = true;

      // 检查是否还有下一组
      if (groupIdx + 1 < updated.groups.length) {
        // 进阶到下一组！
        const nextGroupIdx = groupIdx + 1;
        updated.currentGroupIndex = nextGroupIdx;
        const nextGroup = updated.groups[nextGroupIdx];

        this.saveSession(updated, userId);
        return {
          updatedSession: updated,
          roundFinished: true,
          allGraduated: false,
          event: {
            type: 'group_completed',
            title: `🎉 ${group.groupName} 全部学完！`,
            message: `太棒了！${group.groupName} (${group.wordIds.length} 词) 已全员通过多轮攻坚！现在开启【${nextGroup.groupName}】的学习！`,
            groupIndex: nextGroupIdx,
            groupName: nextGroup.groupName,
            nextRound: 1,
          },
        };
      }

      // 所有组均已学完！开启全体合并大复习 (Consolidation)
      updated.stage = 'consolidation';
      updated.consolidation = {
        currentRound: 1,
        activeQueueIds: [...updated.targetWordIds],
        nextRoundWordIds: [],
        passedWordIds: [],
      };

      this.saveSession(updated, userId);
      return {
        updatedSession: updated,
        roundFinished: true,
        allGraduated: false,
        event: {
          type: 'enter_consolidation',
          title: `🏆 全部分组初学圆满完成！`,
          message: `今日所有 ${updated.groups.length} 个学习小组均已攻克！现在将全部 ${updated.targetWordIds.length} 词合并，开启【全体大复习 · 第 1 轮】强化记忆！`,
          nextRound: 1,
        },
      };
    }

    // ==========================================
    // 阶段 2：全体合并大复习阶段 (stage: 'consolidation')
    // ==========================================
    const con = updated.consolidation;
    con.activeQueueIds = con.activeQueueIds.filter((id) => id !== wordId);

    if (rating === 1) {
      // 熟悉通过
      if (!con.passedWordIds.includes(wordId)) {
        con.passedWordIds.push(wordId);
      }
    } else {
      // 模糊/生疏：排入大复习的下一轮
      if (!con.nextRoundWordIds.includes(wordId)) {
        con.nextRoundWordIds.push(wordId);
      }
    }

    const conRoundFinished = con.activeQueueIds.length === 0;

    if (!conRoundFinished) {
      // 大复习当前轮继续
      this.saveSession(updated, userId);
      return {
        updatedSession: updated,
        roundFinished: false,
        allGraduated: false,
        event: {
          type: 'rated',
          title: '打标记录',
          message: '',
        },
      };
    }

    // 大复习当前轮结束：检查大复习是否还有未通过单词
    if (con.nextRoundWordIds.length > 0) {
      // 进入大复习下一轮！
      con.currentRound += 1;
      con.activeQueueIds = [...con.nextRoundWordIds];
      con.nextRoundWordIds = [];

      this.saveSession(updated, userId);
      return {
        updatedSession: updated,
        roundFinished: true,
        allGraduated: false,
        event: {
          type: 'consolidation_round_advance',
          title: `全体大复习 · 第 ${con.currentRound} 轮强化`,
          message: `🏁 全体复习第 ${con.currentRound - 1} 轮完成！剩余 ${con.activeQueueIds.length} 个模糊/生疏词进入【第 ${con.currentRound} 轮精细复习】！`,
          nextRound: con.currentRound,
        },
      };
    }

    // 大复习全员 100% 掌握：今日新学计划圆满毕业！
    updated.isGraduated = true;

    this.saveSession(updated, userId);
    return {
      updatedSession: updated,
      roundFinished: true,
      allGraduated: true,
      event: {
        type: 'all_graduated',
        title: `🎓 今日新学圆满毕业！`,
        message: `恭喜！今日 ${updated.targetWordIds.length} 词经“分组循环攻坚”与“全体多轮大复习”全部攻克！一轮首通率 ${Math.round((updated.firstPassIds.length / updated.targetWordIds.length) * 100)}%，已全员推入艾宾浩斯复习日程。`,
      },
    };
  },

  // 清空会话
  clearSession(deckId: string, userId?: string) {
    try {
      localStorage.removeItem(this.getStorageKey(deckId, userId));
    } catch (e) {}
  },

  // 生成推入艾宾浩斯复习日程的最终数据库更新
  generateGraduationUpdates(session: DailyLearningSession, wordsInDeck: WordItem[]): WordItem[] {
    const wordMap = new Map(wordsInDeck.map((w) => [w.id, w]));
    const now = Date.now();
    // 科学艾宾浩斯排期：明天早晨 04:00 起开始第 1 周期复习
    const nextReviewDate = calculateTargetReviewDate(1);

    const graduatedWords: WordItem[] = [];

    for (const id of session.targetWordIds) {
      const original = wordMap.get(id);
      if (!original) continue;

      const isFirstPass = session.firstPassIds.includes(id);
      const easeFactor = isFirstPass
        ? 2.5
        : Math.max(1.3, 2.5 - 0.15 * Math.min(4, session.consolidation.currentRound));
      const lapses = isFirstPass ? (original.reviewState.lapses || 0) : (original.reviewState.lapses || 0) + 1;

      graduatedWords.push({
        ...original,
        reviewState: {
          ...original.reviewState,
          repetition: 1,
          interval: 1, // 1 天后
          easeFactor,
          lastReviewDate: now,
          nextReviewDate,
          lapses,
          status: 'learning',
          lastRating: 1,
        },
      });
    }

    return graduatedWords;
  },

  // 统计指标计算 (用于 A4Paper 状态栏及看板)
  calculateSessionStats(session: DailyLearningSession) {
    const totalTarget = session.targetWordIds.length;
    const totalGroups = session.groups.length;
    const currentGroup = session.groups[session.currentGroupIndex] || session.groups[0];
    const isConsolidation = session.stage === 'consolidation';

    // 一轮首通
    const firstPassCount = session.firstPassIds.length;
    const firstPassRate = totalTarget > 0 ? Math.round((firstPassCount / totalTarget) * 100) : 0;

    // 当前活跃待过筛数
    const remainingInRound = isConsolidation
      ? session.consolidation.activeQueueIds.length
      : currentGroup?.activeQueueIds.length || 0;

    const nextRoundPending = isConsolidation
      ? session.consolidation.nextRoundWordIds.length
      : currentGroup?.nextRoundWordIds.length || 0;

    const currentRound = isConsolidation
      ? session.consolidation.currentRound
      : currentGroup?.currentRound || 1;

    // 总体闭环进度百分比
    let passRate = 0;
    if (session.isGraduated) {
      passRate = 100;
    } else if (isConsolidation) {
      // 阶段 2 (全体复习)：占后 50% 进度 (50% ~ 99%)
      const conPassed = session.consolidation.passedWordIds.length;
      passRate = 50 + Math.round((conPassed / Math.max(1, totalTarget)) * 49);
    } else {
      // 阶段 1 (分组攻坚)：占前 50% 进度 (0% ~ 49%)
      const completedGroups = session.groups.filter((g) => g.isCompleted).length;
      const currentGroupPassed = currentGroup?.passedWordIds.length || 0;
      const currentGroupTotal = currentGroup?.wordIds.length || 1;
      const groupFraction = currentGroupPassed / currentGroupTotal;
      passRate = Math.round(((completedGroups + groupFraction) / Math.max(1, totalGroups)) * 50);
    }

    return {
      totalTarget,
      totalGroups,
      currentGroupIndex: session.currentGroupIndex,
      currentGroupName: currentGroup?.groupName || '第 1 组',
      currentGroupTotal: currentGroup?.wordIds.length || 0,
      currentGroupRound: currentGroup?.currentRound || 1,
      isConsolidation,
      consolidationRound: session.consolidation.currentRound,
      currentRound,
      remainingInRound,
      nextRoundPending,
      firstPassCount,
      firstPassRate,
      passRate,
      isGraduated: session.isGraduated,
      groups: session.groups.map((g) => ({
        index: g.groupIndex,
        name: g.groupName,
        total: g.wordIds.length,
        round: g.currentRound,
        isCompleted: g.isCompleted,
        isCurrent: !isConsolidation && g.groupIndex === session.currentGroupIndex,
      })),
    };
  },
};

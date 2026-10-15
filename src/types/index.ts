export type MasteryStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

export interface ReviewState {
  repetition: number;      // 成功复习次数 (0 表示新词)
  interval: number;        // 下次复习间隔 (以天为基准，当天小数)
  easeFactor: number;      // 简易度因子 (SM-2 默认为 2.5)
  lastReviewDate: number;  // 上次打标时间戳
  nextReviewDate: number;  // 下次建议复习时间戳
  lapses: number;          // 遗忘重置次数
  status: MasteryStatus;   // 当前记忆状态
  lastRating?: number;     // 最近一次打分 (1:掌握, 2:模糊, 3:生疏)
}

export interface EtymologyPart {
  type: 'prefix' | 'root' | 'suffix' | 'stem';
  text: string;
  meaning: string;
}

export interface EtymologyData {
  formula: string;         // 如 "con- (加强) + spic (看) + -uous (充满...的)"
  meaning?: string;        // 核心字面义，如 "引人注目的，清晰可见的"
  mnemonic?: string;       // 速记口诀，如 "大家聚集在一起看 -> 显而易见的"
  cognates?: string[];     // 同根派生词，如 ["inspect 检查", "spectator 观众", "suspicious 怀疑的"]
  parts?: EtymologyPart[]; // 拆解原子片段
  source?: 'preset' | 'rule' | 'ai';
}

export interface WordStudyLog {
  timestamp: number;
  rating: 1 | 2 | 3;
  sessionType: 'today' | 'review' | 'other';
}

export interface WordStudyStats {
  totalEncounters: number;    // 历史累计学习/打标总次数
  todayEncounters: number;    // 今日学习/打标次数
  lastStudiedDate: number;    // 最近一次打标时间戳
  firstStudiedDate?: number;  // 首次学习时间戳
  studyHistory?: WordStudyLog[];
}

export interface WordItem {
  id: string;              // 唯一 UUID
  deckId: string;          // 关联词书 ID
  listIndex: number;       // 所属 A4 纸单元编号 (1, 2, 3...)
  order: number;           // 在单元内的排序
  word: string;            // 英文原词
  phonetic?: string;       // 国际音标
  pos?: string;            // 词性
  definition: string;      // 中文释义
  examples?: string[];     // 例句
  tags?: string[];         // 标签分类
  etymology?: EtymologyData; // 词根词缀助记
  stats?: WordStudyStats;    // 学习次数与统计数据
  reviewState: ReviewState;
}

export interface DeckItem {
  id: string;
  title: string;
  description?: string;
  totalWords: number;
  listCount: number;
  wordsPerList: number;    // 默认单张 A4 纸容量 (如 30 词)
  createdAt: number;
  updatedAt: number;
  sourceType: 'json' | 'eudic' | 'maimemo' | 'preset';
}

export type ViewMode = 'full' | 'mask' | 'speed';
// full: 全部显示
// mask: 红宝书遮罩模式 (默认隐藏中文释义，悬停或空格刮开)
// speed: 极速模式 (只看单词，按空格闪现释义)

export type PageTab = 'today' | 'review' | 'stumble' | 'reading' | 'archive';
// today: 今日定量新词计划 (如 50 词)
// review: 待复习池 (到期复习专区)
// stumble: 生词重点区 (模糊与生疏词)
// reading: 语境精读阅读模式 (自导入文章伴读)
// archive: 词库总览与 A4 纸单全量归档

export type ActiveRecallMode = 'en-to-cn' | 'cn-to-en' | 'cloze';
// en-to-cn: 英译中 (遮中文释义)
// cn-to-en: 中译英 (遮英文拼写)
// cloze: 真题挖空 (遮空格处的关键词)

export type PaperColumns = 2 | 3 | 4;

export type ReadingModeType = 'immersive' | 'focus' | 'cloze';

export interface ArticleItem {
  id: string;
  title: string;
  content: string;
  source?: string;
  totalWords: number;
  lexicalDensity?: number;
  readProgress: number;
  createdAt: number;
  updatedAt: number;
}

export interface StudySessionStats {
  deckId: string;
  listIndex: number;
  totalInList: number;
  mastered: number;
  fuzzy: number;
  unknown: number;
}

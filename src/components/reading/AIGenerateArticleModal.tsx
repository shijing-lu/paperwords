import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Search,
  CheckSquare,
  Square,
  Flame,
  BookOpen,
} from 'lucide-react';
import { aiGenerateArticleFromWords, isAIConfigured } from '../../engine/ai';
import { db } from '../../db';
import type { ArticleItem, ArticleFolder, WordItem } from '../../types';

interface AIGenerateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  folders: ArticleFolder[];
  defaultFolderId?: string;
  candidateWords: WordItem[]; // 今日新学或重点单词（已按背诵频次降序排序）
  onArticleGenerated: (newArticleId: string) => void;
  onOpenAISettings?: () => void;
}

const TOPIC_PRESETS = [
  '考研真题风·社会与科技伦理 (The Economist 风格)',
  '前沿科学·人工智能与神经科学 (Nature / Scientific American)',
  '人文心理·专注力与认知行为 (Psychology Today 风格)',
  '经济商业·全球化与青年就业 (Financial Times 风格)',
];

export const AIGenerateArticleModal: React.FC<AIGenerateArticleModalProps> = ({
  isOpen,
  onClose,
  userId,
  folders,
  defaultFolderId,
  candidateWords,
  onArticleGenerated,
  onOpenAISettings,
}) => {
  // 选中的单词集合
  const [selectedWordSet, setSelectedWordSet] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [topic, setTopic] = useState(TOPIC_PRESETS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(defaultFolderId || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedResult, setGeneratedResult] = useState<{
    title: string;
    content: string;
    source: string;
    targetWordsUsed: string[];
  } | null>(null);

  // 初始化：默认选择“反复背诵频次最高的 20 个单词”
  useEffect(() => {
    if (isOpen) {
      // 默认按频次排序取前 20 个
      const top20 = candidateWords.slice(0, 20).map((w) => w.word);
      setSelectedWordSet(new Set(top20));
      setSelectedFolderId(defaultFolderId || (folders[0]?.id || ''));
      setGeneratedResult(null);
      setErrorMsg('');
      setIsGenerating(false);
      setSearchQuery('');
    }
  }, [isOpen, candidateWords, defaultFolderId, folders]);

  // 搜索过滤
  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return candidateWords;
    const q = searchQuery.toLowerCase();
    return candidateWords.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q)
    );
  }, [candidateWords, searchQuery]);

  // 快速切换勾选单个单词
  const toggleWord = (word: string) => {
    setSelectedWordSet((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });
  };

  // 快捷批量选择
  const handleSelectTop20 = () => {
    const top20 = candidateWords.slice(0, 20).map((w) => w.word);
    setSelectedWordSet(new Set(top20));
  };

  const handleSelectTop50 = () => {
    const top50 = candidateWords.slice(0, 50).map((w) => w.word);
    setSelectedWordSet(new Set(top50));
  };

  const handleSelectAll = () => {
    const all = candidateWords.map((w) => w.word);
    setSelectedWordSet(new Set(all));
  };

  const handleClearAll = () => {
    setSelectedWordSet(new Set());
  };

  if (!isOpen) return null;

  const selectedCount = selectedWordSet.size;

  const handleGenerate = async () => {
    if (selectedCount === 0) {
      setErrorMsg('请至少勾选 3 个以上英语单词！');
      return;
    }

    if (!isAIConfigured()) {
      onOpenAISettings?.();
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');

    try {
      const activeTopic = customTopic.trim() || topic;
      // 保持原始按频次顺序排好的单词列表
      const wordsToGenerate = candidateWords
        .filter((w) => selectedWordSet.has(w.word))
        .map((w) => w.word);

      // 如果有不在 candidate 里的输入，合并
      for (const w of selectedWordSet) {
        if (!wordsToGenerate.includes(w)) {
          wordsToGenerate.push(w);
        }
      }

      const res = await aiGenerateArticleFromWords(wordsToGenerate, activeTopic);
      setGeneratedResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI 生成文章失败，请检查网络或密钥配置');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToDirectory = async () => {
    if (!generatedResult) return;

    try {
      const newArticleId = `article-ai-${Date.now()}`;
      const totalWords = generatedResult.content.trim().split(/\s+/).length;

      const newArticle: ArticleItem = {
        id: newArticleId,
        userId,
        folderId: selectedFolderId || undefined,
        title: generatedResult.title,
        source: generatedResult.source || 'AI 语境生词串记',
        content: generatedResult.content,
        totalWords,
        readProgress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.articles.put(newArticle);
      onArticleGenerated(newArticleId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '保存到精读目录失败');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-stone-50 border border-stone-300 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-stone-100 border-b border-stone-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-amber-600 to-amber-800 text-white rounded-lg shadow-2xs">
                <Sparkles className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h3 className="font-serif-academic font-bold text-lg text-stone-900">
                  AI 语境串记：根据今日所学单词编织文章
                </h3>
                <p className="text-xs text-stone-500">
                  默认提取反复背诵频次最高的 20 个生词，亦可自由多选 50 词甚至 200 词生成长篇外刊
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-4 text-sm">
            {/* Step 1: Word Selection & Batch Preset Buttons */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-stone-800">
                    勾选待融入文章的单词:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold font-mono">
                    已选 {selectedCount} / {candidateWords.length} 词
                  </span>
                </div>

                {/* Batch Preset Selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectTop20}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium transition"
                    title="根据背诵频次统计，选取反复背诵最多的前 20 个单词"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-700" />
                    <span>频次最高 Top 20 (默认)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectTop50}
                    className="px-2 py-1 rounded bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-medium transition"
                    title="选择频次最高的前 50 个单词"
                  >
                    Top 50
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2 py-1 rounded bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-medium transition"
                    title="全选今日所学全部单词生成长文"
                  >
                    全选 ({candidateWords.length})
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2 py-1 text-stone-400 hover:text-stone-600 transition"
                  >
                    清空
                  </button>
                </div>
              </div>

              {/* Dynamic Length Notice */}
              <div className="text-[11px] text-stone-500 mb-2">
                {selectedCount > 100 ? (
                  <span className="text-amber-800 font-medium">
                    ⚡ 已选择 {selectedCount} 词：将由 AI 创作一篇包含多个段落章节的长篇宏大学术特写综述（约 2000~3500 词），充分融合所选词汇。
                  </span>
                ) : selectedCount > 40 ? (
                  <span className="text-amber-800 font-medium">
                    ⚡ 已选择 {selectedCount} 词：将创作一篇深度专题报道（约 800~1500 词，5-8 个段落）。
                  </span>
                ) : selectedCount > 20 ? (
                  <span className="text-amber-800 font-medium">
                    ⚡ 已选择 {selectedCount} 词：将创作一篇完整社论短文（约 500~800 词）。
                  </span>
                ) : (
                  <span>
                    💡 默认选择反复背诵最多的前 20 个单词，生成约 300~500 词的标准外刊精读短文。
                  </span>
                )}
              </div>

              {/* Search Filter Box */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="搜索筛选今日单词或释义..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Word List Checkbox Grid */}
              <div className="p-3 bg-white border border-stone-300 rounded-xl max-h-[220px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredWords.length === 0 ? (
                  <div className="col-span-full py-6 text-center text-stone-400 text-xs">
                    未找到匹配的单词
                  </div>
                ) : (
                  filteredWords.map((item, idx) => {
                    const isChecked = selectedWordSet.has(item.word);
                    const encounters = item.stats?.todayEncounters || item.stats?.totalEncounters || 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleWord(item.word)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer select-none transition flex items-start gap-2 ${
                          isChecked
                            ? 'bg-amber-50/90 border-amber-300 text-stone-900 shadow-2xs'
                            : 'bg-stone-50/60 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="mt-0.5 text-amber-700 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-800" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold font-mono text-[13px] truncate">
                              {item.word}
                            </span>
                            {encounters > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-medium shrink-0">
                                背过 {encounters} 次
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate mt-0.5">
                            {item.definition}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 2: Theme / Style selection */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                文章风格与主题
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                {TOPIC_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTopic(t);
                      setCustomTopic('');
                    }}
                    className={`text-left p-2 rounded-lg border text-xs transition ${
                      topic === t && !customTopic
                        ? 'border-amber-600 bg-amber-50/80 text-amber-950 font-medium shadow-2xs'
                        : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="或自定义输入主题，例如：气候危机与未来新能源 / 哲学关于孤独的探讨"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-xs bg-white"
              />
            </div>

            {/* Folder Destination & Generate Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  保存到目录 / 文件夹
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-xs bg-white"
                >
                  <option value="">(未分类目录)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedCount === 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                      <span>AI 正在研读 {selectedCount} 个生词并创作文章...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      <span>✨ 开始生成包含所选 {selectedCount} 词的文章</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Generated Article Preview */}
            {generatedResult && (
              <div className="p-4 bg-white border border-amber-200/90 rounded-xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div>
                    <h4 className="font-serif-academic font-bold text-base text-stone-900">
                      {generatedResult.title}
                    </h4>
                    <span className="text-[11px] text-amber-800 font-medium">
                      来源：{generatedResult.source} • 成功融合 {generatedResult.targetWordsUsed.length} 处生词
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    已生成就绪
                  </span>
                </div>

                <div className="max-h-[260px] overflow-y-auto pr-2 font-serif-academic text-xs leading-relaxed text-stone-800 space-y-2 whitespace-pre-line">
                  {generatedResult.content}
                </div>

                {generatedResult.targetWordsUsed && (
                  <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-1">
                    <span className="text-[11px] text-stone-400 self-center mr-1">
                      靶向生词 ({generatedResult.targetWordsUsed.length}):
                    </span>
                    {generatedResult.targetWordsUsed.map((w) => (
                      <span
                        key={w}
                        className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/60 text-[10px] font-mono"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-stone-100 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-stone-600 hover:text-stone-900 rounded-lg transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveToDirectory}
              disabled={!generatedResult}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-40 text-white rounded-lg text-xs font-medium shadow-xs transition"
            >
              <Check className="w-4 h-4" />
              <span>保存到目录并立即进入精读</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

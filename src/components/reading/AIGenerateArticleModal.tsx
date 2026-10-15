import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, BookOpen, Check, AlertCircle, Loader2, Layers } from 'lucide-react';
import { aiGenerateArticleFromWords, isAIConfigured } from '../../engine/ai';
import { db } from '../../db';
import type { ArticleItem, ArticleFolder, WordItem } from '../../types';

interface AIGenerateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  folders: ArticleFolder[];
  defaultFolderId?: string;
  candidateWords: WordItem[]; // 今日新学或待巩固的单词候选
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
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
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

  useEffect(() => {
    if (isOpen) {
      // 默认挑选今日打标过或前 15 个生词
      const initialWords = candidateWords.slice(0, 15).map((w) => w.word);
      setSelectedWords(initialWords);
      setSelectedFolderId(defaultFolderId || (folders[0]?.id || ''));
      setGeneratedResult(null);
      setErrorMsg('');
      setIsGenerating(false);
    }
  }, [isOpen, candidateWords, defaultFolderId, folders]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (selectedWords.length === 0) {
      setErrorMsg('请至少选择或输入 3 个以上英语单词！');
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
      const res = await aiGenerateArticleFromWords(selectedWords, activeTopic);
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
          className="bg-stone-50 border border-stone-300 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-stone-100 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-amber-600 to-amber-800 text-white rounded-lg shadow-2xs">
                <Sparkles className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h3 className="font-serif-academic font-bold text-lg text-stone-900">
                  AI 语境串记：根据今日新词编织文章
                </h3>
                <p className="text-xs text-stone-500">
                  将刚背过的孤立生词融合成地道学术外刊，在阅读中形成闭环记忆
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
            {/* Step 1: Words to Include */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-stone-700">
                  待融入文章的重点生词 ({selectedWords.length})
                </label>
                <span className="text-[11px] text-stone-400">
                  已默认捕获今日正在学习的新词
                </span>
              </div>
              <div className="p-2.5 bg-white border border-stone-300 rounded-lg min-h-[50px] max-h-[100px] overflow-y-auto flex flex-wrap gap-1.5">
                {selectedWords.length === 0 ? (
                  <span className="text-xs text-stone-400">暂无选定生词，可在下方输入补充</span>
                ) : (
                  selectedWords.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-mono font-medium"
                    >
                      <span>{word}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedWords((prev) => prev.filter((w) => w !== word))}
                        className="text-stone-400 hover:text-stone-700"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Step 2: Theme / Style selection */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                精读文章风格与主题
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
                placeholder="或自定义主题，例如：气候危机与未来新能源 / 哲学关于孤独的探讨"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-xs bg-white"
              />
            </div>

            {/* Folder Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  保存到文章目录 / 文件夹
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-xs bg-white"
                >
                  <option value="">(未分类篇章)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedWords.length === 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                      <span>AI 正在研读生词并创作学术文章...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      <span>✨ 开始 AI 生成文章</span>
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

                <div className="max-h-[220px] overflow-y-auto pr-2 font-serif-academic text-xs leading-relaxed text-stone-800 space-y-2 whitespace-pre-line">
                  {generatedResult.content}
                </div>

                {generatedResult.targetWordsUsed && (
                  <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-1">
                    <span className="text-[11px] text-stone-400 self-center mr-1">靶向生词:</span>
                    {generatedResult.targetWordsUsed.map((w) => (
                      <span
                        key={w}
                        className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-mono"
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

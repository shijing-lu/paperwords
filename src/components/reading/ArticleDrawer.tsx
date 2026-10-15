import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, BookOpen, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import type { ArticleItem } from '../../types';
import { db } from '../../db';

interface ArticleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  articles: ArticleItem[];
  currentArticleId: string;
  onSelectArticle: (articleId: string) => void;
}

export const ArticleDrawer: React.FC<ArticleDrawerProps> = ({
  isOpen,
  onClose,
  userId,
  articles,
  currentArticleId,
  onSelectArticle,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newContent, setNewContent] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setNewContent(content);
      if (!newTitle) {
        setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsText(file);
  };

  const handleSaveArticle = async () => {
    if (!newContent.trim()) return;

    const title = newTitle.trim() || '自定义精读篇章';
    const totalWords = newContent.trim().split(/\s+/).length;
    const newArticle: ArticleItem = {
      id: `article-${Date.now()}`,
      userId,
      title,
      source: newSource.trim() || '自导入文章',
      content: newContent.trim(),
      totalWords,
      readProgress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.articles.add(newArticle);
    onSelectArticle(newArticle.id);
    setIsImporting(false);
    setNewTitle('');
    setNewSource('');
    setNewContent('');
  };

  const handleDeleteArticle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确认删除这篇文章吗？')) {
      await db.articles.delete(id);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-700" />
              <h3 className="font-bold text-sm text-stone-900 font-sans">
                {isImporting ? '导入新文章' : '精读文章书架'}
              </h3>
            </div>
            <button
              onClick={() => {
                if (isImporting) setIsImporting(false);
                else onClose();
              }}
              className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto flex-1 text-xs text-stone-700">
            {!isImporting ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-stone-500">共收录 {articles.length} 篇精读篇章</span>
                  <button
                    onClick={() => setIsImporting(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-medium shadow-2xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + 导入新文章
                  </button>
                </div>

                <div className="divide-y divide-stone-100 border border-stone-200 rounded-lg overflow-hidden">
                  {articles.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => {
                        onSelectArticle(art.id);
                        onClose();
                      }}
                      className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                        currentArticleId === art.id
                          ? 'bg-amber-50/80 border-l-4 border-l-amber-600'
                          : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-bold text-sm text-stone-900 truncate">
                          {art.title}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-2">
                          <span>{art.source || '自导入文章'}</span>
                          <span>•</span>
                          <span className="font-mono">{art.totalWords} 词</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {currentArticleId === art.id && (
                          <span className="text-[11px] text-amber-700 font-semibold px-2 py-0.5 bg-amber-100 rounded">
                            当前阅读
                          </span>
                        )}
                        <button
                          onClick={(e) => handleDeleteArticle(art.id, e)}
                          title="删除文章"
                          className="p-1 text-stone-300 hover:text-rose-600 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Import Article Form */
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold mb-1">文章标题</label>
                  <input
                    type="text"
                    placeholder="例如：2020 英语一阅读三 / The Economist 专栏"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">文章来源（选填）</label>
                  <input
                    type="text"
                    placeholder="例如：考研真题 / The Guardian / 华尔街日报"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold">文章英文正文</label>
                    <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-amber-800 hover:underline">
                      <Upload className="w-3 h-3" />
                      从本地上传 (.txt / .md)
                      <input
                        type="file"
                        accept=".txt,.md"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                  <textarea
                    rows={8}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="在此粘贴任意英文文章正文..."
                    className="w-full p-2.5 font-serif-academic text-xs leading-relaxed rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsImporting(false)}
                    className="px-3 py-1.5 rounded text-stone-600 hover:text-stone-900"
                  >
                    返回列表
                  </button>
                  <button
                    onClick={handleSaveArticle}
                    disabled={!newContent.trim()}
                    className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded disabled:opacity-40 shadow-2xs transition"
                  >
                    保存并开启精读
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

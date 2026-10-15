import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, Check } from 'lucide-react';
import { db } from '../../db';
import type { ArticleItem, ArticleFolder } from '../../types';

interface CreateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  folders: ArticleFolder[];
  defaultFolderId?: string;
  onCreated: (newArticleId: string) => void;
}

export const CreateArticleModal: React.FC<CreateArticleModalProps> = ({
  isOpen,
  onClose,
  userId,
  folders,
  defaultFolderId,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(defaultFolderId || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setTitle('');
      setSource('');
      setContent('');
      setSelectedFolderId(defaultFolderId || (folders[0]?.id || ''));
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, defaultFolderId, folders]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setErrorMsg('请填写文章正文或上传文本文件！');
      return;
    }

    const finalTitle = title.trim() || '未命名精读文章';
    const totalWords = content.trim().split(/\s+/).length;
    const newArticleId = `article-${Date.now()}`;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const newArticle: ArticleItem = {
        id: newArticleId,
        userId,
        folderId: selectedFolderId || undefined,
        title: finalTitle,
        source: source.trim() || '自主精读导入',
        content: content.trim(),
        totalWords,
        readProgress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.articles.put(newArticle);
      onCreated(newArticleId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '保存文章失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-stone-50 border border-stone-300 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-stone-100 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-serif-academic font-bold text-lg text-stone-900">
                新建精读文章
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-4 text-sm">
            {/* Title & Folder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  文章标题
                </label>
                <input
                  type="text"
                  placeholder="例如：The Evolution of Human Memory"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  归属目录 / 文件夹
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm bg-white"
                >
                  <option value="">(未分类目录)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Source / Note */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                文章来源 (选填)
              </label>
              <input
                type="text"
                placeholder="例如：2023 考研英语一 Text 1 / 经济学人 2024.10"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm bg-white"
              />
            </div>

            {/* Content & File Upload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  英文正文
                </label>
                <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-950 hover:underline">
                  <Upload className="w-3.5 h-3.5" />
                  <span>上传 .txt 文件</span>
                  <input
                    type="file"
                    accept=".txt,.md,.text"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <textarea
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="在此处粘贴英文短文或段落，系统会自动识别文本中的所有生词，并提供双击逐句翻译与语法拆解..."
                className="w-full p-3 font-serif-academic text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 leading-relaxed bg-white"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {errorMsg}
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
              onClick={handleSave}
              disabled={isSubmitting || !content.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-40 text-white rounded-lg text-xs font-medium shadow-xs transition"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? '正在保存...' : '保存至目录并开始精读'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileCode, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { parseWordFile, type ParseResult } from '../engine/parser';
import { db } from '../db';
import type { DeckItem, WordItem } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newDeckId: string) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [inputText, setInputText] = useState('');
  const [deckTitle, setDeckTitle] = useState('');
  const [wordsPerList, setWordsPerList] = useState(30);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle file drop or file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      const parsed = parseWordFile(content, file.name, wordsPerList);
      setParseResult(parsed);
      if (!deckTitle) {
        setDeckTitle(parsed.title);
      }
    };
    reader.readAsText(file);
  };

  // Handle manual text change
  const handleTextChange = (text: string) => {
    setInputText(text);
    if (text.trim().length > 0) {
      try {
        const parsed = parseWordFile(text, deckTitle || '自定义词库', wordsPerList);
        setParseResult(parsed);
        if (!deckTitle && parsed.title) {
          setDeckTitle(parsed.title);
        }
        setErrorMsg('');
      } catch (err: any) {
        setErrorMsg('解析失败，请检查格式');
      }
    } else {
      setParseResult(null);
    }
  };

  // Perform import to Dexie
  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.words.length === 0) {
      setErrorMsg('未识别到任何有效单词');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const newDeckId = `deck-${Date.now()}`;
      const finalTitle = deckTitle.trim() || parseResult.title || '新导入词书';
      const listCount = Math.ceil(parseResult.words.length / wordsPerList);

      const deck: DeckItem = {
        id: newDeckId,
        title: finalTitle,
        description: `包含 ${parseResult.words.length} 个单词，格式: ${parseResult.detectedFormat.toUpperCase()}`,
        totalWords: parseResult.words.length,
        listCount,
        wordsPerList,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sourceType: parseResult.detectedFormat === 'json' ? 'json' : 'eudic',
      };

      // Add words to DB
      const wordsToInsert: WordItem[] = parseResult.words.map((item, idx) => ({
        ...item,
        id: `${newDeckId}-${idx + 1}`,
        deckId: newDeckId,
      }));

      await db.transaction('rw', db.decks, db.words, async () => {
        await db.decks.add(deck);
        await db.words.bulkAdd(wordsToInsert);
      });

      onImportSuccess(newDeckId);
      onClose();
    } catch (err: any) {
      setErrorMsg(`导入失败: ${err.message || '存储异常'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/60">
            <div>
              <h3 className="text-lg font-bold font-serif-academic text-stone-900">
                导入新词库 (Import Vocabulary)
              </h3>
              <p className="text-xs text-stone-500">
                完美支持 JSON 格式，以及欧路词典、墨墨背单词等导出的 TXT / CSV 格式
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-sm">
            {/* Title & List capacity config */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  词库名称
                </label>
                <input
                  type="text"
                  placeholder="例如：雅思核心 800 词 / 计算机专业英语"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  单张 A4 纸容量
                </label>
                <select
                  value={wordsPerList}
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    setWordsPerList(count);
                    if (inputText) handleTextChange(inputText);
                  }}
                  className="w-full px-3 py-1.5 rounded border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm bg-white"
                >
                  <option value={20}>20 词 / 页 (轻松型)</option>
                  <option value={30}>30 词 / 页 (杨鹏标准 A4)</option>
                  <option value={40}>40 词 / 页 (高密度)</option>
                  <option value={50}>50 词 / 页 (极限大视野)</option>
                </select>
              </div>
            </div>

            {/* Upload or Drop */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                上传文件或粘贴文本
              </label>
              <div className="flex items-center gap-2 mb-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded border border-stone-300 transition">
                  <Upload className="w-3.5 h-3.5 text-stone-600" />
                  选择本地文件 (.json / .txt / .csv)
                  <input
                    type="file"
                    accept=".json,.txt,.csv,.tsv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <span className="text-xs text-stone-400">或者直接在下方文本框内粘贴</span>
              </div>

              <textarea
                rows={6}
                value={inputText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={`支持示例 1 (JSON):\n[\n  {"word": "ubiquitous", "definition": "无所不在的"}\n]\n\n支持示例 2 (欧路/墨墨 TXT/CSV):\nubiquitous\t/juːˈbɪkwɪtəs/\t无所不在的\nephemeral\t短暂的`}
                className="w-full p-3 font-mono-code text-xs rounded border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 leading-relaxed"
              />
            </div>

            {/* Parse preview indicator */}
            {parseResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <div className="font-semibold">
                    解析成功！检测到格式: {parseResult.detectedFormat.toUpperCase()}
                  </div>
                  <div>
                    共识别出 <strong>{parseResult.totalCount}</strong> 个单词，系统将自动切分为{' '}
                    <strong>{Math.ceil(parseResult.totalCount / wordsPerList)}</strong> 张 A4 纸单进行艾宾浩斯复习调度。
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-stone-600 hover:text-stone-900 rounded transition"
            >
              取消
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={!parseResult || parseResult.totalCount === 0 || isSubmitting}
              className="px-4 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-40 rounded shadow-xs transition"
            >
              {isSubmitting ? '正在写入数据库...' : '确认导入并开始学习'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

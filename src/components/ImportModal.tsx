import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings2,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { parseWordFile, type ParseResult } from '../engine/parser';
import { aiExtractWordsFromText, isAIConfigured } from '../engine/ai';
import { db } from '../db';
import type { DeckItem, WordItem } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onImportSuccess: (newDeckId: string) => void;
  onOpenAISettings?: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  userId,
  onImportSuccess,
  onOpenAISettings,
}) => {
  const [inputText, setInputText] = useState('');
  const [deckTitle, setDeckTitle] = useState('');
  const [wordsPerList, setWordsPerList] = useState(30);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Handle file drop or file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);

      // Try local standard parsing first
      try {
        const parsed = parseWordFile(content, file.name.replace(/\.[^/.]+$/, ''), wordsPerList);
        if (parsed.words.length > 0) {
          setParseResult(parsed);
          if (!deckTitle) setDeckTitle(parsed.title);
          setErrorMsg('');
          return;
        }
      } catch {
        // Fallback or leave for AI
      }

      if (!deckTitle) {
        setDeckTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsText(file);
  };

  // Handle manual text change
  const handleTextChange = (text: string) => {
    setInputText(text);
    setErrorMsg('');
    setAiNotice(null);

    if (text.trim().length > 0) {
      try {
        const parsed = parseWordFile(text, deckTitle || '自定义词库', wordsPerList);
        if (parsed.words.length > 0) {
          setParseResult(parsed);
          if (!deckTitle && parsed.title) {
            setDeckTitle(parsed.title);
          }
        }
      } catch {
        // Ignore syntax error if user is pasting raw messy text
      }
    } else {
      setParseResult(null);
    }
  };

  // Trigger AI analysis for unstructured or messy text
  const handleAIExtract = async () => {
    if (!inputText.trim()) {
      setErrorMsg('请先在下方输入框粘贴杂乱文本，或上传包含英语单词的文件！');
      return;
    }

    if (!isAIConfigured()) {
      setAiNotice('您尚未配置 AI API Key，请先点击此处进行配置，配置后即可一键智能清洗！');
      onOpenAISettings?.();
      return;
    }

    setIsAiProcessing(true);
    setErrorMsg('');
    setAiNotice(null);

    try {
      const extracted = await aiExtractWordsFromText(inputText);
      if (!extracted || extracted.length === 0) {
        throw new Error('AI 未能在输入内容中识别出有效的英语词汇，请确认内容包含英文单词。');
      }

      // Convert extracted words to ParseResult
      const wordItems: Omit<WordItem, 'id' | 'userId' | 'deckId'>[] = extracted.map(
        (item, idx) => ({
          listIndex: Math.floor(idx / wordsPerList) + 1,
          order: (idx % wordsPerList) + 1,
          word: item.word,
          phonetic: item.phonetic,
          pos: item.pos,
          definition: item.definition,
          examples: item.example ? [item.example] : undefined,
          reviewState: {
            repetition: 0,
            interval: 0,
            easeFactor: 2.5,
            lastReviewDate: 0,
            nextReviewDate: Date.now(),
            lapses: 0,
            status: 'new',
          },
        })
      );

      const title = deckTitle.trim() || 'AI 智能整理词单';
      setDeckTitle(title);

      const result: ParseResult = {
        title,
        words: wordItems,
        totalCount: wordItems.length,
        detectedFormat: 'json',
      };

      setParseResult(result);

      // Auto update input text with formatted JSON for user review and transparency
      const cleanJsonStr = JSON.stringify(
        extracted.map((w) => ({
          word: w.word,
          phonetic: w.phonetic,
          pos: w.pos,
          definition: w.definition,
          example: w.example,
        })),
        null,
        2
      );
      setInputText(cleanJsonStr);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI 分析提取失败，请检查网络或配置');
    } finally {
      setIsAiProcessing(false);
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
        userId,
        title: finalTitle,
        description: `包含 ${parseResult.words.length} 个单词，格式: ${parseResult.detectedFormat.toUpperCase()}`,
        totalWords: parseResult.words.length,
        listCount,
        wordsPerList,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sourceType: parseResult.detectedFormat === 'json' ? 'json' : 'eudic',
      };

      // Add words to DB with current userId
      const wordsToInsert: WordItem[] = parseResult.words.map((item, idx) => ({
        ...item,
        id: `${newDeckId}-${idx + 1}`,
        userId,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/60">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-serif-academic text-stone-900">
                  导入新词库 (Import Vocabulary)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  支持 AI 乱序清洗
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                支持标准 JSON / TXT / CSV，亦可复制任意乱七八糟的生词让 AI 自动整理
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
                  placeholder="例如：雅思核心 800 词 / 计算机专业英语 / AI 整理词单"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm"
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
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm bg-white"
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  上传文件或粘贴文本
                </label>
                {onOpenAISettings && (
                  <button
                    type="button"
                    onClick={onOpenAISettings}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 hover:underline"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>AI 配置中心</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg border border-stone-300 transition">
                  <Upload className="w-3.5 h-3.5 text-stone-600" />
                  <span>上传文件 (.json / .txt / .csv)</span>
                  <input
                    type="file"
                    accept=".json,.txt,.csv,.tsv,.md"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {/* AI Extract Action Button */}
                <button
                  type="button"
                  onClick={handleAIExtract}
                  disabled={isAiProcessing || !inputText.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-medium rounded-lg shadow-2xs transition disabled:opacity-40"
                  title="让 AI 自动识别杂乱内容中的生词、补充音标词性释义并整理为标准 JSON"
                >
                  {isAiProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  )}
                  <span>{isAiProcessing ? 'AI 正在提纯整理词汇...' : '✨ AI 智能提取并整理'}</span>
                </button>
              </div>

              <textarea
                rows={6}
                value={inputText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={`粘贴任意内容：\n1. 乱七八糟的英文文本/阅读段落/真题文章（点击上方【AI 智能提取】自动解析出词单）；\n2. 标准 JSON 格式；\n3. 欧路或墨墨导出的 TXT/CSV (制表符分隔)`}
                className="w-full p-3 font-mono-code text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 leading-relaxed"
              />
            </div>

            {/* AI Notice when not configured */}
            {aiNotice && (
              <div
                onClick={onOpenAISettings}
                className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between gap-2 text-xs text-amber-900 cursor-pointer hover:bg-amber-100/70 transition"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{aiNotice}</span>
                </div>
                <span className="font-bold underline text-amber-800 shrink-0">立即配置 →</span>
              </div>
            )}

            {/* Parse preview indicator */}
            {parseResult && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <div className="font-semibold text-emerald-900">
                    解析整理成功！格式: {parseResult.detectedFormat.toUpperCase()}
                  </div>
                  <div className="mt-0.5">
                    共识别出 <strong>{parseResult.totalCount}</strong> 个单词，系统已为您自动切分为{' '}
                    <strong>{Math.ceil(parseResult.totalCount / wordsPerList)}</strong> 张 A4 纸单，可立即开始记忆。
                  </div>
                  {parseResult.words.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60 flex flex-wrap gap-1.5">
                      {parseResult.words.slice(0, 10).map((w, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-white rounded border border-emerald-300/70 text-[11px] font-mono"
                        >
                          {w.word}
                        </span>
                      ))}
                      {parseResult.words.length > 10 && (
                        <span className="text-[11px] text-emerald-700 self-center">
                          ...等共 {parseResult.words.length} 词
                        </span>
                      )}
                    </div>
                  )}
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
          <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-stone-600 hover:text-stone-900 rounded-lg transition"
            >
              取消
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={!parseResult || parseResult.totalCount === 0 || isSubmitting || isAiProcessing}
              className="px-4 py-1.5 text-xs font-medium text-white bg-amber-800 hover:bg-amber-900 disabled:opacity-40 rounded-lg shadow-xs transition"
            >
              {isSubmitting ? '正在写入数据库...' : '确认导入并开始学习'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

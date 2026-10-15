import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  HelpCircle,
  XCircle,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Sparkles,
  Lightbulb,
  Layers,
  Settings,
  Check,
} from 'lucide-react';
import type { WordItem, EtymologyData } from '../types';
import { speechEngine } from '../engine/speech';
import { soundEffects } from '../engine/soundEffects';
import { getWordEtymology } from '../engine/etymology';
import { generateAndCacheAiEtymology, getAiConfig, saveAiConfig, getEffectiveAuthToken } from '../engine/aiEtymology';

interface ReinforceCardModalProps {
  data: {
    word: WordItem;
    rating: 1 | 2 | 3;
  } | null;
  onDismiss: (overrideRating?: 1 | 2 | 3) => void;
}

export const ReinforceCardModal: React.FC<ReinforceCardModalProps> = ({
  data,
  onDismiss,
}) => {
  const [etymology, setEtymology] = useState<EtymologyData | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiKeyPrompt, setShowAiKeyPrompt] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');

  // 当弹窗打开时，初始化词根词缀并自动朗读
  useEffect(() => {
    if (data?.word) {
      const initialEtymology = getWordEtymology(data.word);
      setEtymology(initialEtymology);
      setAiError(null);
      setShowAiKeyPrompt(false);
      speechEngine.speak(data.word.word);
    }
  }, [data]);

  // 监听键盘按键：按 3 改标生疏，按 2 改标模糊，按 1 确认熟练，任意其他键跳过到下一词
  useEffect(() => {
    if (!data) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 若当前正聚焦在输入框（如填写 API Key），不截获打标按键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // 忽略单独的修饰键
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      // 1. 按 3 / 小键盘 3：重新标记为「生疏」
      if (e.key === '3' || e.code === 'Numpad3' || e.code === 'Digit3') {
        soundEffects.playKeyTick(420);
        onDismiss(3);
        return;
      }

      // 2. 按 2 / 小键盘 2：重新标记为「模糊」
      if (e.key === '2' || e.code === 'Numpad2' || e.code === 'Digit2') {
        soundEffects.playKeyTick(480);
        onDismiss(2);
        return;
      }

      // 3. 按 1 / 小键盘 1：确认标记为「熟练」
      if (e.key === '1' || e.code === 'Numpad1' || e.code === 'Digit1') {
        soundEffects.playSuccessTone();
        onDismiss(1);
        return;
      }

      // 4. 其他任意键 (空格、回车等)：保持原先初选状态并推进到下一词
      soundEffects.playKeyTick(650);
      onDismiss();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [data, onDismiss]);

  if (!data) return null;

  const { word, rating } = data;

  // 调用 AI 深度生成词根词缀
  const handleTriggerAi = async () => {
    const config = getAiConfig();
    const token = getEffectiveAuthToken(config);
    if (!token && !config.baseUrl.includes('localhost')) {
      setShowAiKeyPrompt(true);
      return;
    }

    try {
      setIsGeneratingAi(true);
      setAiError(null);
      const res = await generateAndCacheAiEtymology(word.id, word.word, word.definition);
      if (res) {
        setEtymology(res);
        soundEffects.playSuccessTone();
      }
    } catch (err: any) {
      setAiError(err.message || 'AI 解析失败，请检查网络或 API Key / 订阅凭据');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // 保存快速填入的 API Key 或订阅凭据
  const handleSaveApiKey = () => {
    if (!inputApiKey.trim()) return;
    const current = getAiConfig();
    if (current.mode === 'subscription') {
      saveAiConfig({ subscriptionToken: inputApiKey.trim(), enabled: true });
    } else {
      saveAiConfig({ apiKey: inputApiKey.trim(), enabled: true });
    }
    setShowAiKeyPrompt(false);
    handleTriggerAi();
  };

  // 格式化例句，高亮当前单词
  const renderExample = (example: string) => {
    const regex = new RegExp(`(\\b${word.word}\\b)`, 'gi');
    const parts = example.split(regex);
    return (
      <span className="leading-relaxed">
        {parts.map((part, i) =>
          part.toLowerCase() === word.word.toLowerCase() ? (
            <span
              key={i}
              className="font-bold text-amber-900 bg-amber-100/80 px-1 py-0.5 rounded underline decoration-amber-500"
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
        onClick={() => {
          soundEffects.playKeyTick(650);
          onDismiss();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#FAF8F3] border-2 border-stone-300/80 rounded-2xl shadow-2xl p-6 sm:p-7 text-stone-900 relative overflow-hidden"
        >
          {/* Top Status Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
            <div className="flex items-center gap-1.5">
              {rating === 1 ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  已标记为熟练掌握 · 强化记忆
                </span>
              ) : rating === 2 ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded-full">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                  已标记为模糊 · 加深记忆
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-800 bg-rose-100/90 border border-rose-300 px-2.5 py-0.5 rounded-full">
                  <XCircle className="w-3.5 h-3.5 text-rose-700" />
                  已标记为生疏 · 重点攻坚
                </span>
              )}
            </div>

            <span className="text-[11px] font-mono-code text-stone-400">
              按任意键或点击继续 ↵
            </span>
          </div>

          {/* Word Core Section */}
          <div className="mt-5 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h2 className="font-serif-academic text-3xl sm:text-4xl font-extrabold text-stone-950 tracking-tight">
                  {word.word}
                </h2>
                {word.phonetic && (
                  <span className="font-serif-academic italic text-sm text-stone-500">
                    {word.phonetic}
                  </span>
                )}
                {word.pos && (
                  <span className="text-xs text-stone-400 font-serif italic">
                    {word.pos}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speechEngine.speak(word.word);
                }}
                className="p-2 rounded-full bg-stone-200/70 hover:bg-amber-100 hover:text-amber-800 text-stone-600 transition"
                title="重新朗读"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Chinese Definition Highlight Box */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 shadow-2xs">
              <div className="text-[11px] font-mono-code uppercase font-semibold text-amber-800 mb-1">
                中文释义 / 考点
              </div>
              <div className="text-base sm:text-lg font-serif-academic font-bold text-stone-900 leading-snug">
                {word.definition}
              </div>
            </div>

            {/* 核心亮点：词根词缀速记拆解模块 (Etymology & Roots/Affixes) */}
            {etymology ? (
              <div className="p-3.5 rounded-xl bg-white/90 border border-stone-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                    <Layers className="w-3.5 h-3.5 text-amber-700" />
                    <span>词根词缀拆解助记</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {etymology.source === 'preset' ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono border border-amber-200">
                        真题精编拆解
                      </span>
                    ) : etymology.source === 'ai' ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-mono border border-purple-200">
                        AI 智能生成
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-mono border border-stone-200">
                        形态学规则推导
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerAi();
                      }}
                      disabled={isGeneratingAi}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200 transition disabled:opacity-50"
                      title="调用 AI 深度联想更多背诵口诀"
                    >
                      <Sparkles className={`w-3 h-3 text-amber-600 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                      <span>{isGeneratingAi ? 'AI 解析中...' : 'AI 助记'}</span>
                    </button>
                  </div>
                </div>

                {/* 拆解片段胶囊 (前缀/词根/后缀) */}
                {etymology.parts && etymology.parts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {etymology.parts.map((p, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono-code ${
                          p.type === 'prefix'
                            ? 'bg-sky-50 text-sky-900 border border-sky-200'
                            : p.type === 'root'
                            ? 'bg-amber-100/90 text-amber-950 border border-amber-300 font-bold'
                            : 'bg-purple-50 text-purple-900 border border-purple-200'
                        }`}
                      >
                        <span className="font-semibold">{p.text}</span>
                        <span className="text-[10px] opacity-75 font-sans">({p.meaning})</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* 拆解公式 & 记忆口诀 */}
                <div className="text-xs text-stone-800 space-y-1 font-serif-academic">
                  <div className="font-sans font-medium text-stone-900 flex items-baseline gap-1.5">
                    <span className="text-stone-400 font-mono text-[11px]">拆解:</span>
                    <span className="text-amber-950 font-semibold">{etymology.formula}</span>
                  </div>

                  {etymology.mnemonic && (
                    <div className="text-[12px] text-stone-700 bg-amber-50/60 px-2.5 py-1.5 rounded-lg border border-amber-200/70 flex items-start gap-1.5 leading-relaxed">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span>{etymology.mnemonic}</span>
                    </div>
                  )}
                </div>

                {/* 同根衍生词 / 词族 (Cognates) */}
                {etymology.cognates && etymology.cognates.length > 0 && (
                  <div className="pt-1.5 border-t border-stone-200/70 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-sans text-stone-400">同根派生:</span>
                    {etymology.cognates.map((cog, i) => {
                      const pureWord = cog.split(' ')[0].replace(/[^a-zA-Z]/g, '');
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speechEngine.speak(pureWord);
                          }}
                          className="text-[11px] px-2 py-0.5 rounded bg-stone-100/80 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200 hover:border-amber-300 transition flex items-center gap-1 font-mono-code"
                          title="点击发音"
                        >
                          <span>{cog}</span>
                          <Volume2 className="w-2.5 h-2.5 text-stone-400" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* 若未匹配到本地词库，提供一键 AI 拆解按钮 */
              <div className="p-3 rounded-xl bg-stone-100/70 border border-dashed border-stone-300 flex items-center justify-between text-xs text-stone-600">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-stone-400" />
                  <span>该词暂无本地词根缓存</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerAi();
                  }}
                  disabled={isGeneratingAi}
                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-medium transition disabled:opacity-50"
                >
                  <Sparkles className={`w-3 h-3 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingAi ? 'AI 正在拆解...' : '一键 AI 拆解词根'}</span>
                </button>
              </div>
            )}

            {/* AI Key 快速输入引导框 */}
            {showAiKeyPrompt && (
              <div
                className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-stone-800 space-y-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-900 flex items-center gap-1">
                    <Settings className="w-3.5 h-3.5 text-purple-700" />
                    配置 AI API Key (DeepSeek / OpenAI)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAiKeyPrompt(false)}
                    className="text-stone-400 hover:text-stone-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-stone-500">
                  输入你的 DeepSeek / OpenAI API Key（生成一次后永久缓存本地，不重复消耗）：
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={inputApiKey}
                    onChange={(e) => setInputApiKey(e.target.value)}
                    className="flex-1 px-2.5 py-1 bg-white border border-purple-200 rounded-lg text-xs font-mono outline-hidden focus:border-purple-400"
                  />
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-medium text-xs flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>保存并生成</span>
                  </button>
                </div>
              </div>
            )}

            {aiError && (
              <div className="text-[11px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                ⚠️ {aiError}
              </div>
            )}

            {/* Example sentence if available */}
            {word.examples && word.examples.length > 0 && (
              <div className="p-3 rounded-xl bg-white/80 border border-stone-200/80 text-xs sm:text-[13px] text-stone-700 font-serif-academic">
                <div className="flex items-center gap-1 text-[11px] font-sans font-semibold text-stone-400 mb-1">
                  <BookOpen className="w-3 h-3 text-amber-700" />
                  <span>真题语境例句：</span>
                </div>
                <div className="italic pl-1 border-l-2 border-amber-400">
                  {renderExample(word.examples[0])}
                </div>
              </div>
            )}
          </div>

          {/* Quick Re-Rating Section (用户初选熟练但发现含义不一致时随时改标) */}
          <div className="mt-4 p-3 bg-stone-100/90 rounded-xl border border-stone-200/90 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-stone-700">
              <span className="font-semibold text-stone-900">释义与你想的不一致？</span>
              <span className="text-[11px] text-stone-500">直接按键重新标记：</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  soundEffects.playKeyTick(420);
                  onDismiss(3);
                }}
                className="px-2.5 py-1 text-xs rounded-lg font-medium transition bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 hover:border-rose-400 active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                title="记错了/不认识，标记为生疏（按 3）"
              >
                <kbd className="px-1 py-0.2 bg-rose-200/80 rounded font-mono text-[10px] font-bold">3</kbd>
                <span>标记为生疏</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  soundEffects.playKeyTick(480);
                  onDismiss(2);
                }}
                className="px-2.5 py-1 text-xs rounded-lg font-medium transition bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 hover:border-amber-400 active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                title="有点印象但不确定，标记为模糊（按 2）"
              >
                <kbd className="px-1 py-0.2 bg-amber-200/80 rounded font-mono text-[10px] font-bold">2</kbd>
                <span>标记为模糊</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  soundEffects.playSuccessTone();
                  onDismiss(1);
                }}
                className="px-2.5 py-1 text-xs rounded-lg font-medium transition bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                title="含义吻合，确实熟练（按 1）"
              >
                <kbd className="px-1 py-0.2 bg-emerald-200/80 rounded font-mono text-[10px] font-bold">1</kbd>
                <span>确认熟练</span>
              </button>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="mt-5 pt-3.5 border-t border-stone-200/80 flex items-center justify-between gap-3">
            <span className="text-[11px] text-stone-400 font-sans">
              按 <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono text-[10px] text-stone-700">3</kbd> 改标生疏，按 <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono text-[10px] text-stone-700">2</kbd> 改标模糊
            </span>

            <button
              type="button"
              onClick={() => {
                soundEffects.playKeyTick(650);
                onDismiss();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 active:bg-black text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <span>记住了，下一词</span>
              <kbd className="px-1.5 py-0.5 bg-stone-700 text-stone-300 rounded text-[10px] font-mono">
                Space / 任意键 ↵
              </kbd>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

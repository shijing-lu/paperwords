import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Check, Sparkles, BookOpen, RefreshCw } from 'lucide-react';
import type { GroupConfig, GroupMode } from '../engine/sessionManager';
import { partitionWords } from '../engine/sessionManager';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalWordsCount: number;
  currentConfig: GroupConfig;
  targetWordIds: string[];
  onApplyConfig: (config: GroupConfig) => void;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  isOpen,
  onClose,
  totalWordsCount,
  currentConfig,
  targetWordIds,
  onApplyConfig,
}) => {
  const [mode, setMode] = useState<GroupMode>(currentConfig.mode || 'bySize');
  const [value, setValue] = useState<number>(currentConfig.value || 33);
  const [customInput, setCustomInput] = useState<string>(String(currentConfig.value || 33));

  // 快捷预设选项
  const sizePresets = [15, 20, 25, 33, 50];
  const countPresets = [2, 3, 4, 5, 6];

  const handleSelectPreset = (val: number) => {
    setValue(val);
    setCustomInput(String(val));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomInput(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 0) {
      setValue(num);
    }
  };

  // 模拟分组切分计算
  const previewGroups = useMemo(() => {
    const dummyIds = targetWordIds.length > 0
      ? targetWordIds
      : Array.from({ length: Math.max(1, totalWordsCount) }, (_, i) => `w-${i}`);
    return partitionWords(dummyIds, { mode, value: Math.max(1, value) });
  }, [targetWordIds, totalWordsCount, mode, value]);

  const handleSave = () => {
    onApplyConfig({
      mode,
      value: Math.max(1, value),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col text-stone-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif-academic font-bold text-base text-stone-900">
                  今日新学 · 分组学习配置
                </h3>
                <p className="text-[11px] text-stone-500">
                  科学小循环攻坚：分批消化，各组 100% 攻克后再整体合并大复习
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            {/* 记忆规律小贴士 */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5 leading-relaxed">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-medium text-amber-950">艾宾浩斯小循环心法：</strong>
                从第 1 组开始，依序完成第 1 轮、第 2 轮、第 3 轮直至本组生疏词全清；再学下一组。全组攻克后自动合并为全量大词库，进行全体大复习！
              </div>
            </div>

            {/* 模式选择 */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">
                选择分组划分方式
              </label>
              <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setMode('bySize');
                    setValue(33);
                    setCustomInput('33');
                  }}
                  className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    mode === 'bySize'
                      ? 'bg-white text-stone-900 font-bold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  按每组词数 (如 33 词/组)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('byCount');
                    setValue(5);
                    setCustomInput('5');
                  }}
                  className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    mode === 'byCount'
                      ? 'bg-white text-stone-900 font-bold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  按固定组数 (如 分 5 组)
                </button>
              </div>
            </div>

            {/* 选项参数设置 */}
            {mode === 'bySize' ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-700">
                    每组单词数量 (当前总计 {totalWordsCount} 词)
                  </label>
                  <span className="text-[11px] text-amber-800 font-medium">
                    推荐 25 ~ 33 词/组
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {sizePresets.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleSelectPreset(size)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
                        value === size
                          ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold shadow-2xs'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {size} 词/组 {size === 33 && '(经典)'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">自定义每组:</span>
                  <input
                    type="number"
                    min="5"
                    max={Math.max(100, totalWordsCount)}
                    value={customInput}
                    onChange={handleCustomChange}
                    className="w-20 px-2.5 py-1 text-xs font-mono font-bold text-center border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs text-stone-500">词</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-700">
                    划分为多少组 (当前总计 {totalWordsCount} 词)
                  </label>
                  <span className="text-[11px] text-amber-800 font-medium">
                    推荐分 3 ~ 5 组
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {countPresets.map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => handleSelectPreset(cnt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
                        value === cnt
                          ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold shadow-2xs'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      平分 {cnt} 组 {cnt === 5 && '(经典)'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">自定义组数:</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={customInput}
                    onChange={handleCustomChange}
                    className="w-20 px-2.5 py-1 text-xs font-mono font-bold text-center border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs text-stone-500">组</span>
                </div>
              </div>
            )}

            {/* 实时切分预览 */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800 mb-2">
                <span>🎯 分组切分预览 ({previewGroups.length} 组)</span>
                <span className="text-[11px] font-mono text-stone-500">
                  全量: {totalWordsCount} 词
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {previewGroups.map((g) => (
                  <div
                    key={g.groupIndex}
                    className="p-2 rounded-lg bg-white border border-stone-200/90 text-xs shadow-2xs"
                  >
                    <div className="font-bold text-stone-800 flex items-center justify-between">
                      <span>{g.groupName}</span>
                      <span className="font-mono text-amber-800 font-semibold text-[11px]">
                        {g.wordIds.length} 词
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      1轮初筛 → 多轮攻坚
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2.5 pt-2 border-t border-stone-200 text-[11px] text-stone-500 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 text-emerald-600" />
                <span>各组全部通关后，合并为整体开启【多轮终极大复习】</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-stone-100 flex items-center justify-between bg-stone-50/70">
            <span className="text-xs text-stone-500">
              提示：重置分组会重新规划今日未完成学习队列
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 rounded-lg transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1 px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-medium shadow-sm transition"
              >
                <Check className="w-3.5 h-3.5" />
                应用分组设置
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

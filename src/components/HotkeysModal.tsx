import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface HotkeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '↓ / J', desc: '焦点直接下移一行 (同列下移)' },
  { key: '↑ / K', desc: '焦点直接上移一行 (同列上移)' },
  { key: '→ / L', desc: '焦点向右顺切一词' },
  { key: '← / H', desc: '焦点向左逆切一词' },
  { key: 'Space', desc: '刮开 / 隐藏当前词释义 (红宝书遮罩)' },
  { key: '1 或 A', desc: '标记为「熟练」（推迟下次复习周期）' },
  { key: '2 或 S', desc: '标记为「模糊」（15分钟后重现自测）' },
  { key: '3 或 D', desc: '标记为「生疏」（3分钟后重新扫读）' },
  { key: 'P', desc: '原生离线极速发音 (Web Speech)' },
  { key: '[ 或 PageUp', desc: '上一张 A4 纸单' },
  { key: '] 或 PageDown', desc: '下一张 A4 纸单' },
  { key: 'M', desc: '循环切换视图（全览 / 遮罩 / 极速）' },
  { key: 'Tab', desc: '切换自测维度（英译中 / 中译英 / 真题挖空）' },
  { key: '?', desc: '打开快捷键指南' },
];

export const HotkeysModal: React.FC<HotkeysModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50/60">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-amber-700" />
              <h3 className="font-bold text-sm text-stone-900 font-sans">
                键盘极速盲操指南 (Hotkeys)
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-2 text-xs">
            <p className="text-stone-500 mb-3 leading-relaxed">
              无需碰鼠标，双手放在主键区即可像打字机一样进行毫秒级高吞吐量单词扫读。
            </p>

            <div className="divide-y divide-stone-100">
              {SHORTCUTS.map((item, idx) => (
                <div key={idx} className="py-1.5 flex items-center justify-between">
                  <span className="text-stone-700 font-medium">{item.desc}</span>
                  <kbd className="px-2 py-0.5 font-mono text-[11px] font-semibold bg-stone-100 text-stone-800 rounded border border-stone-200 shadow-2xs">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 text-right">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-black rounded transition"
            >
              了解，开始盲操
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Sparkles, Coffee } from 'lucide-react';

export const SponsorWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed right-3 sm:right-5 bottom-20 z-40 flex flex-col items-end">
      {/* 展开的猫娘打赏卡片 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="mb-2 w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-rose-200 overflow-hidden text-stone-800 relative"
          >
            {/* 顶栏可爱粉红装饰猫耳与关闭 */}
            <div className="bg-gradient-to-r from-rose-100 via-pink-100 to-amber-100 px-4 py-2.5 flex items-center justify-between border-b border-rose-100">
              <div className="flex items-center gap-1.5">
                <span className="text-lg animate-bounce">🐾</span>
                <span className="font-bold text-xs text-rose-800 tracking-wide font-sans">
                  喵呜~ 主人求投喂！(ฅ'ω'ฅ)
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-rose-400 hover:text-rose-700 hover:bg-rose-200/50 rounded-full transition"
                title="收起猫爪"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 卡片内容区 */}
            <div className="p-4 text-center flex flex-col items-center">
              {/* 猫娘语录 */}
              <div className="bg-rose-50/80 border border-rose-200/70 rounded-xl p-2.5 mb-3 text-[11px] leading-relaxed text-rose-950 font-sans text-left w-full">
                <p className="font-semibold text-rose-800 flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-rose-500" />
                  <span>大人背单词辛苦啦喵~</span>
                </p>
                <p>
                  本喵给努力学习的你捏捏肩！(=^･ω･^=)
                  作者大人天天熬夜写代码，猫粮和罐罐都快见底了喵呜… (ó﹏ò｡)
                </p>
                <p className="mt-1 text-rose-700 font-medium">
                  给本喵投喂一根小鱼干，猫神大人保佑你考研考级全部一次高分上岸喵！✨
                </p>
              </div>

              {/* 二维码展示区 */}
              <div className="p-2 bg-white rounded-xl shadow-md border border-rose-100 relative group">
                <img
                  src="/sponsor_qr.jpg"
                  alt="微信赞赏码"
                  className="w-48 h-auto rounded-lg object-contain transition-transform group-hover:scale-102"
                />
                <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>微信扫一扫 · 请猫猫吃罐头</span>
                </div>
              </div>

              {/* 底部撒娇文案 */}
              <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-rose-500 font-serif-academic italic">
                <Heart className="w-3 h-3 text-rose-400 fill-rose-400 inline" />
                <span>每一口小鱼干，都会化作更新好功能的动力喵！谢谢大人~</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 右侧常驻悬浮触发胶囊 */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-full shadow-lg border-2 border-white/80 transition-all font-sans cursor-pointer group"
        title="点击投喂猫娘"
      >
        <span className="text-base group-hover:rotate-12 transition-transform">🐾</span>
        <span className="text-xs font-bold tracking-tight">投喂猫猫</span>
        <Heart className="w-3.5 h-3.5 text-rose-200 fill-rose-200 animate-pulse" />
      </motion.button>
    </div>
  );
};

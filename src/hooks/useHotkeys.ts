import { useEffect } from 'react';
import { soundEffects } from '../engine/soundEffects';

interface UseHotkeysProps {
  wordCount: number;
  activeIndex: number;
  setActiveIndex: (fn: (prev: number) => number) => void;
  columns?: number;
  onToggleReveal: (index: number) => void;
  onRateCurrentWord: (rating: 1 | 2 | 3) => void;
  onPronounceCurrentWord: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onToggleViewMode: () => void;
  onCycleRecallMode: () => void;
  onToggleHotkeysModal: () => void;
  isModalOpen: boolean;
}

/**
 * 依据当前屏幕宽度与预设布局，计算真实的实际渲染列数
 */
export function getActiveColumnCount(paperColumns: number = 2): number {
  if (typeof window === 'undefined') return paperColumns;
  const w = window.innerWidth;
  if (paperColumns === 4) {
    if (w < 640) return 1;
    if (w < 1024) return 2;
    return 4;
  }
  if (paperColumns === 3) {
    if (w < 768) return 1;
    return 3;
  }
  // paperColumns === 2
  if (w < 768) return 1;
  return 2;
}

export function useHotkeys({
  wordCount,
  activeIndex,
  setActiveIndex,
  columns = 2,
  onToggleReveal,
  onRateCurrentWord,
  onPronounceCurrentWord,
  onPrevPage,
  onNextPage,
  onToggleViewMode,
  onCycleRecallMode,
  onToggleHotkeysModal,
  isModalOpen,
}: UseHotkeysProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框或文本域内，或者打开了弹窗，不响应全局热键
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        isModalOpen
      ) {
        if (e.key === 'Escape' && isModalOpen) {
          onToggleHotkeysModal();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        // 1. 垂直下移一行 (同列向下移动，跨越当前真实列数)
        case 'j':
        case 'arrowdown': {
          e.preventDefault();
          soundEffects.playKeyTick(550);
          const cols = getActiveColumnCount(columns);
          setActiveIndex((prev) => {
            if (cols <= 1) {
              return prev < wordCount - 1 ? prev + 1 : prev;
            }
            const nextIdx = prev + cols;
            if (nextIdx < wordCount) {
              return nextIdx;
            }
            // 若直下对应位置无词（最后一行未排满），但下一行确实存在，跳至最后一行末尾有效词
            const currentRow = Math.floor(prev / cols);
            const totalRows = Math.ceil(wordCount / cols);
            if (currentRow < totalRows - 1) {
              return wordCount - 1;
            }
            return prev;
          });
          break;
        }

        // 2. 垂直上移一行 (同列向上移动，跨退当前真实列数)
        case 'k':
        case 'arrowup': {
          e.preventDefault();
          soundEffects.playKeyTick(650);
          const cols = getActiveColumnCount(columns);
          setActiveIndex((prev) => {
            if (cols <= 1) {
              return prev > 0 ? prev - 1 : 0;
            }
            const prevIdx = prev - cols;
            if (prevIdx >= 0) {
              return prevIdx;
            }
            return prev;
          });
          break;
        }

        // 3. 水平右移一词 (横向顺切)
        case 'l':
        case 'arrowright':
          e.preventDefault();
          soundEffects.playKeyTick(550);
          setActiveIndex((prev) => (prev < wordCount - 1 ? prev + 1 : prev));
          break;

        // 4. 水平左移一词 (横向逆切)
        case 'h':
        case 'arrowleft':
          e.preventDefault();
          soundEffects.playKeyTick(650);
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;

        case ' ': // 空格键刮开/收起释义
          e.preventDefault();
          soundEffects.playKeyTick(700);
          onToggleReveal(activeIndex);
          break;

        case '1':
        case 'a':
          e.preventDefault();
          onRateCurrentWord(1);
          break;

        case '2':
        case 's':
          e.preventDefault();
          onRateCurrentWord(2);
          break;

        case '3':
        case 'd':
          e.preventDefault();
          onRateCurrentWord(3);
          break;

        case 'p':
          e.preventDefault();
          onPronounceCurrentWord();
          break;

        case '[':
        case 'pageup':
          e.preventDefault();
          soundEffects.playKeyTick(500);
          onPrevPage();
          break;

        case ']':
        case 'pagedown':
          e.preventDefault();
          soundEffects.playKeyTick(500);
          onNextPage();
          break;

        case 'm':
          e.preventDefault();
          onToggleViewMode();
          break;

        case 'tab':
          e.preventDefault();
          soundEffects.playKeyTick(800);
          onCycleRecallMode();
          break;

        case '?':
          e.preventDefault();
          onToggleHotkeysModal();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    wordCount,
    activeIndex,
    setActiveIndex,
    columns,
    onToggleReveal,
    onRateCurrentWord,
    onPronounceCurrentWord,
    onPrevPage,
    onNextPage,
    onToggleViewMode,
    onCycleRecallMode,
    onToggleHotkeysModal,
    isModalOpen,
  ]);
}

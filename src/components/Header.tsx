import React from 'react';
import {
  BookMarked,
  Plus,
  Keyboard,
  ChevronDown,
  Check,
  CalendarCheck,
  Clock,
  Flame,
  Layers,
  Settings,
  BellRing,
  BookOpen,
  BarChart3
} from 'lucide-react';
import type { DeckItem, PageTab } from '../types';

interface HeaderProps {
  decks: DeckItem[];
  currentDeck: DeckItem | null;
  activeTab: PageTab;
  dueReviewCount: number;
  stumbleCount: number;
  nextReviewCountdown: string | null;
  onSelectDeck: (deckId: string) => void;
  onSelectTab: (tab: PageTab) => void;
  onOpenImport: () => void;
  onOpenHotkeys: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  decks,
  currentDeck,
  activeTab,
  dueReviewCount,
  stumbleCount,
  nextReviewCountdown,
  onSelectDeck,
  onSelectTab,
  onOpenImport,
  onOpenHotkeys,
  onOpenSettings,
  onOpenStats,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="w-full bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#E7E3D8] sticky top-0 z-30">
      {/* Upper Navigation Row */}
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* Brand & Deck Dropdown */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#1C1917] text-[#FAF9F5] flex items-center justify-center font-serif-academic text-lg font-bold shadow-xs">
            P
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="font-serif-academic font-bold text-lg text-stone-900 tracking-tight">
                PaperWords
              </h1>
              <span className="text-[10px] font-mono-code uppercase px-1.5 py-0.2 bg-stone-200/80 text-stone-600 rounded">
                v2.0
              </span>
            </div>
          </div>

          {/* Deck Dropdown Selector */}
          <div className="relative ml-2">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/70 border border-stone-200 rounded-md transition"
            >
              <BookMarked className="w-3.5 h-3.5 text-amber-700" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate">
                {currentDeck ? currentDeck.title : '选择词库'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {dropdownOpen && (
              <div
                className="absolute left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-stone-200 py-1 z-40 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  切换学习词库
                </div>
                {decks.map((deck) => (
                  <button
                    key={deck.id}
                    onClick={() => onSelectDeck(deck.id)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-stone-50 transition ${
                      currentDeck?.id === deck.id
                        ? 'bg-amber-50 text-amber-900 font-semibold'
                        : 'text-stone-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{deck.title}</div>
                      <div className="text-[10px] text-stone-400 font-mono-code">
                        {deck.totalWords} 词 · {deck.listCount} 个 A4 纸单
                      </div>
                    </div>
                    {currentDeck?.id === deck.id && (
                      <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Countdown Capsule & Controls */}
        <div className="flex items-center gap-2">
          {/* Real-time Review Countdown Capsule */}
          {nextReviewCountdown && (
            <div
              onClick={() => onSelectTab('review')}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono-code cursor-pointer transition border ${
                dueReviewCount > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                  : 'bg-stone-100/90 text-stone-600 border-stone-200 hover:bg-stone-200'
              }`}
              title="点击查看待复习专区"
            >
              {dueReviewCount > 0 ? (
                <>
                  <BellRing className="w-3.5 h-3.5 text-rose-600" />
                  <span className="font-semibold">{dueReviewCount} 词到期需复习!</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  <span>下次复习: {nextReviewCountdown}</span>
                </>
              )}
            </div>
          )}

          <button
            onClick={onOpenStats}
            title="今日学习与记忆热度统计"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md transition font-medium"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">今日统计</span>
          </button>

          <button
            onClick={onOpenSettings}
            title="学习计划与提醒设置"
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-md transition"
          >
            <Settings className="w-4 h-4 text-stone-600" />
          </button>

          <button
            onClick={onOpenHotkeys}
            title="快捷键盲操速查 (?)"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-md transition"
          >
            <Keyboard className="w-3.5 h-3.5 text-stone-500" />
            <span>按键</span>
          </button>

          <button
            onClick={onOpenImport}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-md shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导入词库</span>
          </button>
        </div>
      </div>

      {/* Lower Navigation Row: Task-Driven Page Tabs */}
      <div className="max-w-5xl mx-auto px-4 border-t border-stone-200/60 flex items-center gap-1 sm:gap-2 py-1 overflow-x-auto text-xs">
        <button
          onClick={() => onSelectTab('today')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
            activeTab === 'today'
              ? 'bg-stone-900 text-white font-semibold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>今日新学计划</span>
        </button>

        <button
          onClick={() => onSelectTab('review')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition relative ${
            activeTab === 'review'
              ? 'bg-stone-900 text-white font-semibold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>艾宾浩斯到期复习</span>
          {dueReviewCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-code font-bold ${
                activeTab === 'review'
                  ? 'bg-rose-500 text-white'
                  : 'bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              {dueReviewCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('stumble')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition relative ${
            activeTab === 'stumble'
              ? 'bg-stone-900 text-white font-semibold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-600" />
          <span>生词重点池</span>
          {stumbleCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono-code font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {stumbleCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('reading')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
            activeTab === 'reading'
              ? 'bg-stone-900 text-white font-semibold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-600" />
          <span>📰 语境精读 (阅读模式)</span>
        </button>

        <button
          onClick={() => onSelectTab('archive')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
            activeTab === 'archive'
              ? 'bg-stone-900 text-white font-semibold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>全量 A4 纸单归档</span>
        </button>
      </div>
    </header>
  );
};

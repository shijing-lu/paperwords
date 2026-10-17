import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sliders,
  Bell,
  Volume2,
  Target,
  FileText,
  Sparkles,
  BookOpen,
  KeyRound,
  CreditCard,
  Check,
  Eye,
  EyeOff,
  Activity,
  Layers,
  Columns2,
  Columns3,
  Columns4,
  ExternalLink,
} from 'lucide-react';
import { sessionManager, type GroupConfig, type GroupMode, getDefaultGroupConfig } from '../engine/sessionManager';
import { notificationEngine } from '../engine/notifications';
import { soundEffects } from '../engine/soundEffects';
import {
  getAiConfig,
  saveAiConfig,
  testAiConnection,
  PROVIDER_PRESETS,
  type AiConfig,
  type AiAccessMode,
} from '../engine/aiEtymology';
import type { PaperColumns } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyTarget: number;
  onUpdateDailyTarget: (val: number) => void;
  wordsPerPage: number;
  onUpdateWordsPerPage: (val: number) => void;
  paperColumns: PaperColumns;
  onUpdatePaperColumns: (cols: PaperColumns) => void;
  isKeyboardSoundEnabled: boolean;
  onToggleKeyboardSound: (enabled: boolean) => void;
  isReviewAlarmEnabled: boolean;
  onToggleReviewAlarm: (enabled: boolean) => void;
  isNotificationEnabled: boolean;
  onToggleNotification: (enabled: boolean) => void;
  notificationThreshold: number;
  onUpdateNotificationThreshold: (val: number) => void;
}

type SettingsTab = 'study' | 'audio' | 'ai';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  dailyTarget,
  onUpdateDailyTarget,
  wordsPerPage,
  onUpdateWordsPerPage,
  paperColumns,
  onUpdatePaperColumns,
  isKeyboardSoundEnabled,
  onToggleKeyboardSound,
  isReviewAlarmEnabled,
  onToggleReviewAlarm,
  isNotificationEnabled,
  onToggleNotification,
  notificationThreshold,
  onUpdateNotificationThreshold,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('study');
  const [notificationStatus, setNotificationStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [testSent, setTestSent] = useState(false);
  const [customDailyInput, setCustomDailyInput] = useState(String(dailyTarget));
  const [customPageWordsInput, setCustomPageWordsInput] = useState(String(wordsPerPage));
  const [groupConfig, setGroupConfig] = useState<GroupConfig>(() => {
    return sessionManager.getSavedGroupPref() || getDefaultGroupConfig(dailyTarget);
  });

  // AI 状态
  const [aiConfig, setAiConfig] = useState<AiConfig>(getAiConfig());
  const [showPassword, setShowPassword] = useState(false);
  const [isAiSaved, setIsAiSaved] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(
    null
  );

  if (!isOpen) return null;

  const handleUpdateAi = (patch: Partial<AiConfig>) => {
    const next = saveAiConfig(patch);
    setAiConfig(next);
    setTestResult(null);
    setIsAiSaved(true);
    setTimeout(() => setIsAiSaved(false), 2000);
  };

  const handleSelectPreset = (presetId: string) => {
    const found = PROVIDER_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    handleUpdateAi({
      providerId: found.id,
      mode: found.mode,
      baseUrl: found.baseUrl,
      model: found.defaultModel,
    });
  };

  const handleRunAiTest = async () => {
    setIsTestingAi(true);
    setTestResult(null);
    const res = await testAiConnection(aiConfig);
    setTestResult(res);
    setIsTestingAi(false);
    if (res.success) {
      soundEffects.playSuccessTone();
    } else {
      soundEffects.playKeyTick(400);
    }
  };

  const handleRequestNotification = async () => {
    const granted = await notificationEngine.requestPermission();
    setNotificationStatus(granted ? 'granted' : 'denied');
    if (granted) {
      notificationEngine.notifyReviewDue(3, () => {});
      setTestSent(true);
    }
  };

  const handleTestNotification = () => {
    notificationEngine.notifyReviewDue(5, () => {});
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleDailyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomDailyInput(valStr);
    const num = parseInt(valStr, 10);
    if (!isNaN(num) && num > 0) {
      onUpdateDailyTarget(num);
    }
  };

  const handleWordsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomPageWordsInput(valStr);
    const num = parseInt(valStr, 10);
    if (!isNaN(num) && num > 0) {
      onUpdateWordsPerPage(num);
    }
  };

  const currentPreset = PROVIDER_PRESETS.find((p) => p.id === aiConfig.providerId) || PROVIDER_PRESETS[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-[#FAF8F3] rounded-2xl shadow-2xl border-2 border-stone-300/80 w-full max-w-3xl overflow-hidden flex flex-col h-[620px] max-h-[90vh] text-stone-900"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-100/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg border border-amber-300">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900 font-sans tracking-tight">
                  系统偏好与配置中心 (Preferences)
                </h3>
                <p className="text-[11px] text-stone-500 font-sans">
                  个性化定制你的艾宾浩斯复习节奏、纸感排版与 AI 引擎接入
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: Left Sidebar + Right Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar Tabs */}
            <div className="w-48 sm:w-52 shrink-0 bg-stone-100/60 border-r border-stone-200/80 p-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                {/* Tab 1: 学习与排版 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('study')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-2.5 cursor-pointer ${
                    activeTab === 'study'
                      ? 'bg-amber-100/90 text-amber-950 font-bold border border-amber-300/80 shadow-2xs'
                      : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                  }`}
                >
                  <BookOpen className={`w-4 h-4 ${activeTab === 'study' ? 'text-amber-800' : 'text-stone-400'}`} />
                  <div>
                    <div className="text-xs">学习与纸张排版</div>
                    <div className="text-[10px] text-stone-400 font-normal">目标词数、A4 列数</div>
                  </div>
                </button>

                {/* Tab 2: 提醒与声音 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('audio')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-2.5 cursor-pointer ${
                    activeTab === 'audio'
                      ? 'bg-amber-100/90 text-amber-950 font-bold border border-amber-300/80 shadow-2xs'
                      : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                  }`}
                >
                  <Bell className={`w-4 h-4 ${activeTab === 'audio' ? 'text-amber-800' : 'text-stone-400'}`} />
                  <div>
                    <div className="text-xs">提醒与声音音效</div>
                    <div className="text-[10px] text-stone-400 font-normal">风铃提醒、按键音</div>
                  </div>
                </button>

                {/* Tab 3: AI 引擎接入 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between cursor-pointer ${
                    activeTab === 'ai'
                      ? 'bg-amber-100/90 text-amber-950 font-bold border border-amber-300/80 shadow-2xs'
                      : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className={`w-4 h-4 ${activeTab === 'ai' ? 'text-amber-800' : 'text-purple-600'}`} />
                    <div>
                      <div className="text-xs">AI 助记引擎</div>
                      <div className="text-[10px] text-stone-400 font-normal">API 与 订阅接入</div>
                    </div>
                  </div>
                  {aiConfig.apiKey || aiConfig.subscriptionToken ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title="AI 已配置" />
                  ) : null}
                </button>
              </div>

              {/* Bottom Version info */}
              <div className="px-2 py-2 border-t border-stone-200/70 text-[10px] text-stone-400 font-mono">
                PaperWords v1.2 · 离线优先
              </div>
            </div>

            {/* Right Content Panel */}
            <div className="flex-1 p-5 sm:p-6 overflow-y-auto bg-[#FAF8F3]/60 space-y-5">
              {/* TAB 1: 学习与排版 */}
              {activeTab === 'study' && (
                <div className="space-y-5">
                  {/* Setting 1: 每日定量新词目标 */}
                  <div className="p-4 bg-white/90 rounded-xl border border-stone-200 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-stone-900">
                        <Target className="w-4 h-4 text-amber-700" />
                        每日定量新学计划目标 (Daily Target)
                      </span>
                      <span className="font-mono-code font-bold text-amber-800 text-xs">
                        {dailyTarget} 词 / 天
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      今日新词全员首次过筛并完成多轮硬骨头淘汰后，自动推入艾宾浩斯复习日程。
                    </p>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {[30, 50, 100].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            onUpdateDailyTarget(num);
                            setCustomDailyInput(String(num));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                            dailyTarget === num
                              ? 'bg-amber-700 text-white shadow-xs'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          {num} 词/天
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 bg-stone-100 px-2 py-1 rounded-lg border border-stone-200">
                        <span className="text-[11px] text-stone-500 font-sans">自定:</span>
                        <input
                          type="number"
                          min="5"
                          max="500"
                          value={customDailyInput}
                          onChange={handleDailyInputChange}
                          className="w-12 bg-transparent text-center font-mono-code text-xs font-bold text-stone-900 outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Setting 1.5: 今日新学分组学习机制 (Group Learning) */}
                  <div className="p-4 bg-white/90 rounded-xl border border-stone-200 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-stone-900">
                        <Layers className="w-4 h-4 text-amber-700" />
                        今日新学分组学习机制 (Group Learning)
                      </span>
                      <span className="font-mono-code font-bold text-amber-800 text-xs">
                        {groupConfig.mode === 'bySize' ? `每组 ${groupConfig.value} 词` : `分 ${groupConfig.value} 组`}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      将今日新词分为小循环组：每组依次完成第1、2、3轮直至全员攻克，再学下一组。全组学完后自动合并开启多轮终极复习！
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const next: GroupConfig = { mode: 'bySize', value: 33 };
                          setGroupConfig(next);
                          sessionManager.saveGroupPref(next);
                        }}
                        className={`p-2 rounded-lg border text-left transition ${
                          groupConfig.mode === 'bySize'
                            ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="font-bold">按每组词数</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">推荐 25 ~ 33 词一组</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const next: GroupConfig = { mode: 'byCount', value: 5 };
                          setGroupConfig(next);
                          sessionManager.saveGroupPref(next);
                        }}
                        className={`p-2 rounded-lg border text-left transition ${
                          groupConfig.mode === 'byCount'
                            ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="font-bold">按固定组数</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">平分 3 ~ 5 个小组</div>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {groupConfig.mode === 'bySize'
                        ? [20, 25, 33, 50].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                const next: GroupConfig = { mode: 'bySize', value: size };
                                setGroupConfig(next);
                                sessionManager.saveGroupPref(next);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition cursor-pointer ${
                                groupConfig.value === size
                                  ? 'bg-amber-700 border-amber-800 text-white shadow-xs'
                                  : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                              }`}
                            >
                              {size} 词/组
                            </button>
                          ))
                        : [2, 3, 4, 5].map((cnt) => (
                            <button
                              key={cnt}
                              type="button"
                              onClick={() => {
                                const next: GroupConfig = { mode: 'byCount', value: cnt };
                                setGroupConfig(next);
                                sessionManager.saveGroupPref(next);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition cursor-pointer ${
                                groupConfig.value === cnt
                                  ? 'bg-amber-700 border-amber-800 text-white shadow-xs'
                                  : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                              }`}
                            >
                              平分 {cnt} 组
                            </button>
                          ))}
                    </div>
                  </div>

                  {/* Setting 2: A4 纸单每页容量 */}
                  <div className="p-4 bg-white/90 rounded-xl border border-stone-200 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-stone-900">
                        <FileText className="w-4 h-4 text-amber-700" />
                        单张 A4 纸词容量规格 (Words Per Page)
                      </span>
                      <span className="font-mono-code font-bold text-amber-800 text-xs">
                        {wordsPerPage} 词 / 页
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      模拟经典纸质红宝书/杨鹏17天排版，每张纸作为一个完整注意力闭环单元。
                    </p>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {[20, 30, 40].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            onUpdateWordsPerPage(num);
                            setCustomPageWordsInput(String(num));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                            wordsPerPage === num
                              ? 'bg-amber-700 text-white shadow-xs'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          {num} 词/页
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 bg-stone-100 px-2 py-1 rounded-lg border border-stone-200">
                        <span className="text-[11px] text-stone-500 font-sans">自定:</span>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={customPageWordsInput}
                          onChange={handleWordsPerPageChange}
                          className="w-12 bg-transparent text-center font-mono-code text-xs font-bold text-stone-900 outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Setting 3: A4 纸单列数排版 */}
                  <div className="p-4 bg-white/90 rounded-xl border border-stone-200 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-stone-900">
                        <Layers className="w-4 h-4 text-amber-700" />
                        纸面网格列数 (Layout Columns)
                      </span>
                      <span className="font-mono-code font-bold text-amber-800 text-xs">
                        {paperColumns} 列排版
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      根据屏幕宽度自由切换。配合上下左右按键进行真实二维空间焦点移动。
                    </p>
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      {[
                        { col: 2 as PaperColumns, label: '双列排版 (经典)', icon: Columns2, desc: '最适合笔记本与阅读' },
                        { col: 3 as PaperColumns, label: '三列排版 (平衡)', icon: Columns3, desc: '信息密度高，视野宽广' },
                        { col: 4 as PaperColumns, label: '四列极速 (紧凑)', icon: Columns4, desc: '大屏幕全景高效过词' },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = paperColumns === item.col;
                        return (
                          <button
                            key={item.col}
                            type="button"
                            onClick={() => onUpdatePaperColumns(item.col)}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-50/80 border-amber-400 shadow-2xs'
                                : 'bg-stone-50 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-800' : 'text-stone-500'}`} />
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-800" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-stone-900">{item.label}</div>
                              <div className="text-[10px] text-stone-400 mt-0.5">{item.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 提醒与声音 */}
              {activeTab === 'audio' && (
                <div className="space-y-5">
                  {/* Setting 1: 到期复习风铃提醒 */}
                  <div className="p-4 bg-white/90 rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-xs flex items-center gap-1.5 text-stone-900">
                        <Volume2 className="w-4 h-4 text-amber-700" />
                        到期复习风铃强提醒音
                      </span>
                      <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                        当待复习单词达到积攒阈值时播放清脆风铃音。数量未增加时绝不重复打扰。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleReviewAlarm(!isReviewAlarmEnabled)}
                      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                        isReviewAlarmEnabled ? 'bg-amber-700' : 'bg-stone-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                          isReviewAlarmEnabled ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Setting 2: 强提醒触发阈值 */}
                  <div className="p-4 bg-white/90 rounded-xl border border-stone-200 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-stone-900">
                        <Target className="w-4 h-4 text-rose-600" />
                        强提醒积攒触发阈值
                      </span>
                      <span className="font-mono-code font-bold text-stone-800 text-xs">
                        {notificationThreshold >= 999 ? '已关闭自动强提醒' : `满 ${notificationThreshold} 词`}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      避免单词频繁打断心流。积攒满设定数量后才会发出一次通知与音效。
                    </p>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {[
                        { label: '10 词', val: 10 },
                        { label: '20 词 (推荐)', val: 20 },
                        { label: '30 词', val: 30 },
                        { label: '50 词', val: 50 },
                        { label: '永不打扰', val: 9999 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => onUpdateNotificationThreshold(item.val)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                            notificationThreshold === item.val
                              ? 'bg-stone-900 text-white font-bold'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Setting 3: Windows 桌面置顶强提醒 */}
                  <div className="p-4 bg-white/90 rounded-xl border border-stone-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-stone-900">
                        <Bell className="w-4 h-4 text-amber-700" />
                        Windows 桌面原生置顶通知
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleNotification(!isNotificationEnabled)}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                          isNotificationEnabled ? 'bg-amber-700' : 'bg-stone-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                            isNotificationEnabled ? 'right-1' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      复习时间到达且达到阈值时，在屏幕右下角弹出 Windows 原生弹窗，点击可直接激活本页面。
                    </p>
                    {isNotificationEnabled && (
                      <div className="flex items-center gap-2 pt-1">
                        {notificationStatus !== 'granted' ? (
                          <button
                            type="button"
                            onClick={handleRequestNotification}
                            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium rounded-lg transition"
                          >
                            授权启用 Windows 系统通知权限
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleTestNotification}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg transition flex items-center gap-1.5"
                          >
                            <Bell className="w-3.5 h-3.5 text-stone-600" />
                            {testSent ? '测试通知已发送！' : '测试桌面通知弹窗'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Setting 4: 机械键盘按键打字音效 */}
                  <div className="p-4 bg-white/90 rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-xs flex items-center gap-1.5 text-stone-900">
                        <Volume2 className="w-4 h-4 text-stone-700" />
                        机械键盘操作打字音效
                      </span>
                      <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                        按上下左右导航、空格刮开遮罩、1/2/3 打标时提供极度解压的清脆听觉反馈。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleKeyboardSound(!isKeyboardSoundEnabled)}
                      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                        isKeyboardSoundEnabled ? 'bg-amber-700' : 'bg-stone-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                          isKeyboardSoundEnabled ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: AI 助记引擎 (支持 API Key 直连 与 订阅 两种接入方式) */}
              {activeTab === 'ai' && (
                <div className="space-y-5">
                  {/* AI 接入模式切换器 (Segmented Switch) */}
                  <div className="p-1 bg-stone-200/80 rounded-xl flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateAi({ mode: 'api-key' });
                        if (aiConfig.providerId === 'copilot' || aiConfig.providerId === 'kimi-coding') {
                          handleSelectPreset('deepseek');
                        }
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        aiConfig.mode === 'api-key'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                      <span>API Key 密钥直连模式 (推荐)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateAi({ mode: 'subscription' });
                        if (aiConfig.providerId !== 'copilot' && aiConfig.providerId !== 'kimi-coding') {
                          handleSelectPreset('copilot');
                        }
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        aiConfig.mode === 'subscription'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                      <span>平台订阅 / Token Plan 接入</span>
                    </button>
                  </div>

                  {/* 快捷服务商预设卡片 (Quick Presets) */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-stone-800 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                      <span>选择服务商预设 (一键自动填入配置)：</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PROVIDER_PRESETS.filter((p) => p.mode === aiConfig.mode).map((p) => {
                        const isCurrent = aiConfig.providerId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPreset(p.id)}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                              isCurrent
                                ? 'bg-amber-50/90 border-amber-400 text-stone-950 shadow-2xs font-semibold ring-1 ring-amber-400'
                                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold truncate">{p.name}</span>
                              {isCurrent && <Check className="w-3.5 h-3.5 text-amber-800 shrink-0" />}
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono truncate">{p.defaultModel}</span>
                          </button>
                        );
                      })}
                    </div>

                    {currentPreset && (
                      <p className="text-[11px] text-amber-900/80 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 leading-relaxed">
                        💡 {currentPreset.helpTip}
                      </p>
                    )}
                  </div>

                  {/* 凭据与接口配置表单 */}
                  <div className="p-4 bg-white/90 rounded-xl border border-stone-200 shadow-2xs space-y-3.5">
                    {/* Token / Key 输入 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-stone-900 flex items-center gap-1">
                          {aiConfig.mode === 'subscription' ? (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                              <span>{currentPreset.tokenLabel}</span>
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                              <span>{currentPreset.tokenLabel}</span>
                            </>
                          )}
                        </label>
                        <span className="text-[10px] text-stone-400">本地加密保存，仅在客户端直连</span>
                      </div>

                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={currentPreset.placeholder}
                          value={aiConfig.mode === 'subscription' ? aiConfig.subscriptionToken : aiConfig.apiKey}
                          onChange={(e) => {
                            if (aiConfig.mode === 'subscription') {
                              handleUpdateAi({ subscriptionToken: e.target.value });
                            } else {
                              handleUpdateAi({ apiKey: e.target.value });
                            }
                          }}
                          className="w-full px-3 py-2 pr-9 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono outline-hidden focus:border-amber-500 focus:bg-white transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Base URL & Model */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          接口请求地址 (Base URL)
                        </label>
                        <input
                          type="text"
                          value={aiConfig.baseUrl}
                          onChange={(e) => handleUpdateAi({ baseUrl: e.target.value })}
                          className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono outline-hidden focus:border-amber-500 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          模型调用标识 (Model Name)
                        </label>
                        <input
                          type="text"
                          value={aiConfig.model}
                          onChange={(e) => handleUpdateAi({ model: e.target.value })}
                          className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono outline-hidden focus:border-amber-500 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    {/* 连通性测试按钮与反馈 */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleRunAiTest}
                        disabled={isTestingAi}
                        className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                      >
                        <Activity className={`w-3.5 h-3.5 ${isTestingAi ? 'animate-spin' : ''}`} />
                        <span>{isTestingAi ? '正在测试连接...' : '⚡ 测试连通性'}</span>
                      </button>

                      {testResult && (
                        <div
                          className={`text-xs px-2.5 py-1 rounded-lg border font-mono flex items-center gap-1.5 ${
                            testResult.success
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <span className={testResult.success ? 'text-emerald-600' : 'text-rose-600 font-bold'}>
                            {testResult.success ? '●' : '✕'}
                          </span>
                          <span>{testResult.message}</span>
                        </div>
                      )}

                      {isAiSaved && !testResult && (
                        <span className="text-[11px] text-amber-800 font-medium">✓ 配置已自动保存至本地</span>
                      )}
                    </div>
                  </div>

                  {/* 零浪费机制说明 */}
                  <div className="p-3 bg-stone-100/70 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                    <div className="font-bold text-stone-800">🔒 本地永久缓存与零额外费用机制：</div>
                    <p>
                      每个单词一旦通过 AI 生成词根词缀与联想口诀，将<strong>永久持久化写入浏览器的 IndexedDB 数据库</strong>。
                      之后无论复习多少次，均直接以 <strong>0 毫秒从本地秒开读取</strong>，绝不重复调用 API 或消耗订阅额度。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-stone-100/80 border-t border-stone-200/80 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-stone-400 font-sans">
              设置修改即时生效 · 离线自动持久化
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-black rounded-xl shadow-xs transition cursor-pointer"
            >
              完成保存
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

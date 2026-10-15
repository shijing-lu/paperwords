import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, KeyRound, Globe, Cpu, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { getAIConfig, saveAIConfig, testAIConnection } from '../engine/ai';
import type { AIConfig } from '../types';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptNotice?: string; // 触发未配置时的提示文案
  onConfigSaved?: () => void;
}

interface ProviderPreset {
  name: string;
  baseUrl: string;
  defaultModel: string;
  hint: string;
}

const PRESETS: ProviderPreset[] = [
  {
    name: 'DeepSeek (推荐·极速且便宜)',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    hint: '支持语法拆解、词汇提取与学术外刊生成，性价比极高',
  },
  {
    name: '硅基流动 SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    hint: '国内直连免翻墙，支持 Qwen2.5 / DeepSeek 等多种免费或低价模型',
  },
  {
    name: 'OpenAI 官方',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    hint: '需国际网络环境，速度快逻辑强',
  },
  {
    name: '通义千问 DashScope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    hint: '阿里云兼容接口，中文理解与例句质量优秀',
  },
  {
    name: '月之暗面 Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    hint: '擅长长文本分析与高质量例句',
  },
  {
    name: '本地 Ollama / 自定义反代',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3:latest',
    hint: '完全本地离线运行，或输入任意 OneAPI / NewAPI / 代理地址',
  },
];

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  promptNotice,
  onConfigSaved,
}) => {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getAIConfig();
      setBaseUrl(current.baseUrl);
      setApiKey(current.apiKey);
      setModel(current.model);
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: ProviderPreset) => {
    setBaseUrl(preset.baseUrl);
    setModel(preset.defaultModel);
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: '请先填写 API Key' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testAIConnection({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim() || 'deepseek-chat',
      });
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || '测试失败' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    saveAIConfig({
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim() || 'deepseek-chat',
    });
    setSavedSuccess(true);
    setTimeout(() => {
      onConfigSaved?.();
      onClose();
    }, 600);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-stone-50 border border-stone-300 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-stone-100 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-academic font-bold text-lg text-stone-900">
                  AI 智能学术引擎配置
                </h3>
                <p className="text-xs text-stone-500">
                  支持词库智能提取整理、根据新词编织精读文章、长难句语法拆解
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5 text-sm">
            {/* Prompt Notice if triggered by an unconfigured feature */}
            {promptNotice && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-900 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">提示：尚未配置 AI API</div>
                  <div>{promptNotice}，请在下方配置任意兼容 OpenAI 规范的 API 密钥（如 DeepSeek 等）。</div>
                </div>
              </div>
            )}

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                推荐提供商快捷填入
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => {
                  const isActive = baseUrl.trim() === p.baseUrl;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`text-left p-2.5 rounded-lg border text-xs transition ${
                        isActive
                          ? 'border-amber-600 bg-amber-50/80 text-amber-950 shadow-2xs'
                          : 'border-stone-200 bg-white hover:border-stone-300 text-stone-800'
                      }`}
                    >
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-[11px] text-stone-400 truncate mt-0.5">{p.defaultModel}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-stone-500" />
                <span>API Base URL (接口基址)</span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.deepseek.com/v1"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-mono text-xs"
              />
              <div className="text-[11px] text-stone-400 mt-1">
                以兼容 OpenAI 格式为准（会自动请求 `/chat/completions`）
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-stone-500" />
                <span>API Key (密钥)</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-mono text-xs"
              />
              <div className="text-[11px] text-stone-400 mt-1">
                密钥仅保存在当前浏览器的 LocalStorage 中，不会上传到任何中间服务器
              </div>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-stone-500" />
                <span>Model (模型名称)</span>
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="deepseek-chat 或 gpt-4o-mini"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-mono text-xs"
              />
            </div>

            {/* Connection Test Output */}
            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="break-all">{testResult.message}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-stone-100 border-t border-stone-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              {isTesting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>{isTesting ? '正在测试...' : '测试连通性'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-stone-600 hover:text-stone-800 text-xs font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-medium shadow-xs transition"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>已保存！</span>
                  </>
                ) : (
                  <span>保存配置</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

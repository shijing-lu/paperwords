import type { EtymologyData } from '../types';
import { db } from '../db';

export type AiAccessMode = 'api-key' | 'subscription';

export interface ProviderPreset {
  id: string;
  name: string;
  mode: AiAccessMode;
  baseUrl: string;
  defaultModel: string;
  placeholder: string;
  tokenLabel: string;
  helpTip: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek (高性价比推荐)',
    mode: 'api-key',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    placeholder: 'sk-...',
    tokenLabel: 'DeepSeek API Key',
    helpTip: '国内超高性价比，词根词素推导与中英文记忆口诀质量极佳。',
  },
  {
    id: 'gemini',
    name: 'Google Gemini (AI Studio 免费 Key)',
    mode: 'api-key',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-flash',
    placeholder: 'AIzaSy...',
    tokenLabel: 'Gemini API Key',
    helpTip: '在 aistudio.google.com 免费领取，免会员，免费额度高达 1500次/天。',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4o-mini)',
    mode: 'api-key',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    placeholder: 'sk-...',
    tokenLabel: 'OpenAI API Key',
    helpTip: 'OpenAI 官方开发者密钥，结构化 JSON 遵循性极高。',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot 订阅',
    mode: 'subscription',
    baseUrl: 'https://api.githubcopilot.com',
    defaultModel: 'gpt-4o',
    placeholder: 'ghu_... 或 Copilot Token',
    tokenLabel: 'Copilot 订阅凭据',
    helpTip: '利用你的 GitHub Copilot 个人或企业订阅，无需额外按量付费。',
  },
  {
    id: 'kimi-coding',
    name: 'Kimi For Coding 订阅计划',
    mode: 'subscription',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    placeholder: 'sk-...',
    tokenLabel: 'Kimi 订阅 Token',
    helpTip: 'Moonshot AI 订阅计划专用端点，长文本与中文语境极佳。',
  },
  {
    id: 'qwen-plan',
    name: '通义千问 Qwen Token Plan',
    mode: 'subscription',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    placeholder: 'sk-...',
    tokenLabel: '阿里百炼订阅 Token',
    helpTip: '阿里云百炼 Token Plan 订阅包月套餐。',
  },
  {
    id: 'custom-api',
    name: '自定义 API 接口 (Ollama / 本地 / 中转)',
    mode: 'api-key',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    placeholder: 'sk-... 或留空',
    tokenLabel: 'API Key',
    helpTip: '支持本地 Ollama、LM Studio、vLLM 或第三方中转站。',
  },
  {
    id: 'custom-sub',
    name: '第三方聚合订阅中转',
    mode: 'subscription',
    baseUrl: 'https://your-proxy-endpoint.com/v1',
    defaultModel: 'default',
    placeholder: 'sub_...',
    tokenLabel: '订阅授权凭据',
    helpTip: '支持私有中转、包月网关或反向代理授权。',
  },
];

export interface AiConfig {
  mode: AiAccessMode;
  providerId: string;
  apiKey: string;
  subscriptionToken: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
}

const STORAGE_KEY = 'paperwords_ai_config';

export function getAiConfig(): AiConfig {
  if (typeof window === 'undefined') {
    return {
      mode: 'api-key',
      providerId: 'deepseek',
      apiKey: '',
      subscriptionToken: '',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      enabled: false,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode || 'api-key',
        providerId: parsed.providerId || 'deepseek',
        apiKey: parsed.apiKey || '',
        subscriptionToken: parsed.subscriptionToken || '',
        baseUrl: parsed.baseUrl || 'https://api.deepseek.com/v1',
        model: parsed.model || 'deepseek-chat',
        enabled: parsed.enabled ?? (!!parsed.apiKey || !!parsed.subscriptionToken),
      };
    }
  } catch (e) {
    console.error('Failed to parse AI config', e);
  }
  return {
    mode: 'api-key',
    providerId: 'deepseek',
    apiKey: '',
    subscriptionToken: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    enabled: false,
  };
}

export function saveAiConfig(cfg: Partial<AiConfig>): AiConfig {
  const current = getAiConfig();
  const updated = { ...current, ...cfg };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function getEffectiveAuthToken(cfg: AiConfig): string {
  return cfg.mode === 'subscription' ? cfg.subscriptionToken.trim() : cfg.apiKey.trim();
}

/**
 * 连通性测试：向目标端点发送轻量 Ping，测量真实网络延迟
 */
export async function testAiConnection(
  cfg: AiConfig
): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const token = getEffectiveAuthToken(cfg);
  if (!token && !cfg.baseUrl.includes('localhost') && !cfg.baseUrl.includes('127.0.0.1')) {
    return {
      success: false,
      latencyMs: 0,
      message: `请先填写 ${cfg.mode === 'subscription' ? '订阅凭据 Token' : 'API Key'}`,
    };
  }

  const cleanBaseUrl = cfg.baseUrl.replace(/\/+$/, '');
  const url = `${cleanBaseUrl}/chat/completions`;
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cfg.model || 'deepseek-chat',
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 5,
        temperature: 0,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        latencyMs,
        message: `HTTP ${res.status}: ${errText.slice(0, 120)}`,
      };
    }

    const data = await res.json();
    if (data.choices && data.choices.length > 0) {
      return {
        success: true,
        latencyMs,
        message: `连接成功！响应耗时 ${latencyMs}ms，模型返回正常。`,
      };
    } else {
      return {
        success: true,
        latencyMs,
        message: `已连接，响应耗时 ${latencyMs}ms。`,
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: err.message || '网络连接超时或无法访问接口',
    };
  }
}

/**
 * 异步调用 AI 生成结构化词根词缀及趣味记忆口诀，并自动持久化写入 Dexie 数据库
 */
export async function generateAndCacheAiEtymology(
  wordId: string,
  word: string,
  definition: string
): Promise<EtymologyData | null> {
  const config = getAiConfig();
  const token = getEffectiveAuthToken(config);

  if (!token && !config.baseUrl.includes('localhost')) {
    throw new Error(
      `未配置 AI 凭据，请在设置中选择 [${config.mode === 'subscription' ? '订阅接入' : 'API Key 接入'}] 并填写密钥`
    );
  }

  const cleanBaseUrl = config.baseUrl.replace(/\/+$/, '');
  const url = `${cleanBaseUrl}/chat/completions`;

  const systemPrompt = `你是一位精通英语词源学与考研/GRE单词速记的大师。
请针对用户给出的英文单词与释义，提供精确的【词根词缀拆解公式】和【生动好记的联想口诀】。
必须只输出符合以下 JSON Schema 的纯 JSON 字符串，禁止任何 markdown 代码块包裹、禁止任何额外废话：
{
  "formula": "拆解公式，如: con- (共同) + spic (看) + -uous (充满...的)",
  "meaning": "由词素推导出的字面造词本义",
  "mnemonic": "一句话生动形象的助记口诀/故事联想（25字以内）",
  "cognates": ["同根衍生词1 (含简释)", "同根衍生词2 (含简释)", "同根衍生词3 (含简释)"],
  "parts": [
    { "type": "prefix", "text": "前缀", "meaning": "前缀涵义" },
    { "type": "root", "text": "词根", "meaning": "词根涵义" },
    { "type": "suffix", "text": "后缀", "meaning": "后缀涵义" }
  ]
}`;

  const userPrompt = `单词: ${word}\n中文释义: ${definition}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI 请求失败 (${response.status}): ${errorText.slice(0, 150)}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error('AI 未返回有效内容');
  }

  // 清洗可能存在的 markdown 代码块
  const jsonStr = rawContent.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(jsonStr) as Partial<EtymologyData>;

  const etymologyResult: EtymologyData = {
    formula: parsed.formula || `${word}`,
    meaning: parsed.meaning || definition,
    mnemonic: parsed.mnemonic || '',
    cognates: parsed.cognates || [],
    parts: parsed.parts || [],
    source: 'ai',
  };

  // 永久缓存在 Dexie 数据库中，下次 0ms 免调 API
  try {
    await db.words.update(wordId, { etymology: etymologyResult });
  } catch (err) {
    console.warn('Failed to cache AI etymology in db:', err);
  }

  return etymologyResult;
}

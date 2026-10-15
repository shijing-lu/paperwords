import type { AIConfig, SentenceAnalysisResult } from '../types';

export const DEFAULT_AI_CONFIG: AIConfig = {
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.7,
};

const STORAGE_KEY = 'paperwords_ai_config';

/**
 * 获取当前持久化的 AI 配置
 */
export function getAIConfig(): AIConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...DEFAULT_AI_CONFIG };
    const parsed = JSON.parse(saved);
    return {
      baseUrl: (parsed.baseUrl || DEFAULT_AI_CONFIG.baseUrl).replace(/\/+$/, ''),
      apiKey: parsed.apiKey || '',
      model: parsed.model || DEFAULT_AI_CONFIG.model,
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.7,
    };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

/**
 * 保存 AI 配置
 */
export function saveAIConfig(config: Partial<AIConfig>): AIConfig {
  const current = getAIConfig();
  const next: AIConfig = {
    ...current,
    ...config,
    baseUrl: (config.baseUrl !== undefined ? config.baseUrl : current.baseUrl).trim().replace(/\/+$/, ''),
    apiKey: (config.apiKey !== undefined ? config.apiKey : current.apiKey).trim(),
    model: (config.model !== undefined ? config.model : current.model).trim(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/**
 * 检查用户是否已配置有效的 AI API Key
 */
export function isAIConfigured(): boolean {
  const config = getAIConfig();
  return Boolean(config.apiKey && config.apiKey.length > 5);
}

/**
 * 清洗从 LLM 响应中提取纯 JSON 字符串
 */
function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  // 去除 ```json ... ``` 或 ``` ... ``` 包裹
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    cleaned = match[1].trim();
  }
  return cleaned;
}

/**
 * 通用 OpenAI 兼容协议 Chat Completion 调用
 */
export async function callAIChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    config?: AIConfig;
    temperature?: number;
    jsonMode?: boolean;
    timeoutMs?: number;
  }
): Promise<string> {
  const config = options?.config || getAIConfig();
  if (!config.apiKey) {
    throw new Error('未配置 AI API Key，请先进入设置填写！');
  }

  // 格式化 Base URL，兼容传入带 /chat/completions 或不带的情况
  let endpoint = config.baseUrl.trim().replace(/\/+$/, '');
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = `${endpoint}/chat/completions`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeoutMs || 45000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options?.temperature ?? config.temperature ?? 0.7,
        ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errText = '';
      try {
        const errJson = await res.json();
        errText = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errText = await res.text();
      }
      throw new Error(`AI 请求失败 (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('AI 未返回有效内容');
    }
    return content;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('AI 请求响应超时，请检查网络或更换 Base URL');
    }
    throw err;
  }
}

/**
 * 测试 AI 连接配置是否通畅
 */
export async function testAIConnection(config: AIConfig): Promise<{ success: boolean; message: string }> {
  try {
    const reply = await callAIChat(
      [{ role: 'user', content: 'Reply with "OK" only.' }],
      { config, temperature: 0.1, timeoutMs: 15000 }
    );
    return { success: true, message: `连接成功！模型回复: ${reply.trim().slice(0, 30)}` };
  } catch (err: any) {
    return { success: false, message: err.message || '连接失败' };
  }
}

export interface ExtractedWordItem {
  word: string;
  phonetic?: string;
  pos?: string;
  definition: string;
  example?: string;
}

/**
 * 功能 1：让 AI 从杂乱无章的文本或笔记中提取英语单词，并格式化为标准词库格式
 */
export async function aiExtractWordsFromText(rawText: string): Promise<ExtractedWordItem[]> {
  const prompt = `你是一位专业的英语词汇学专家。用户将提供一段杂乱的文本、笔记、阅读段落或无规律单词列表。
请分析并识别其中包含的英文单词（过滤常见基础连词代词如 the/is/a/to 等，保留中高频实词与重点考研/四六级/雅思核心生词）。
对提取出的每个单词，提供国际音标（英音或美音）、词性（如 n./v./adj./adv.）、精炼准确的中文释义（用常见且贴切的释义），以及一句简明考研/实用例句。

请务必输出严格的 JSON 格式，不要输出任何多余的解释文字。格式规范如下：
[
  {
    "word": "conspicuous",
    "phonetic": "/kənˈspɪkjuəs/",
    "pos": "adj.",
    "definition": "显眼的，引人注目的",
    "example": "He was uncomfortable with such conspicuous attention."
  }
]

用户输入的杂乱文本内容如下：
${rawText.slice(0, 8000)}`;

  const responseText = await callAIChat([
    { role: 'system', content: 'You are a precise linguistic JSON extractor. Output valid JSON array only.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.3 });

  const cleaned = cleanJsonOutput(responseText);
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error('AI 返回的数据格式不符合预期数组');
  }

  return parsed.map((item: any) => ({
    word: String(item.word || '').trim(),
    phonetic: item.phonetic ? String(item.phonetic).trim() : undefined,
    pos: item.pos ? String(item.pos).trim() : undefined,
    definition: String(item.definition || '').trim(),
    example: item.example ? String(item.example).trim() : undefined,
  })).filter((item) => /^[a-zA-Z\s\-']+$/.test(item.word) && item.definition.length > 0);
}

export interface AIGeneratedArticleResult {
  title: string;
  content: string;
  source: string;
  targetWordsUsed: string[];
}

/**
 * 功能 2：根据今日新学/复习的单词，让 AI 编织一篇自然流畅的高质量精读文章
 */
export async function aiGenerateArticleFromWords(
  words: string[],
  topicPreference?: string
): Promise<AIGeneratedArticleResult> {
  const wordListStr = words.slice(0, 30).join(', ');
  const topic = topicPreference || '考研与外刊学术风格（关于科技、社会、心理学或经济探索）';

  const prompt = `你是一位顶尖的英语外刊专栏作家与考研命题专家。
现有以下重点英语单词需要学习者通过语境精读来强化记忆：
【目标生词列表】：${wordListStr}

请撰写一篇长度在 250 ~ 400 词左右的英文短文，满足以下严苛要求：
1. 风格：类似《经济学人》(The Economist)、《科学美国人》(Scientific American) 或考研英语一真题阅读；
2. 主题：${topic}；
3. 将上述【目标生词列表】中的单词自然融洽、地道地穿插在文章各处，逻辑严密，语境饱满，杜绝生硬堆砌；
4. 必须输出严格合法的 JSON 对象，不要输出 markdown 代码块外的内容。规范格式如下：
{
  "title": "英文文章标题",
  "source": "AI语境串记·外刊专栏",
  "content": "完整的英文文章正文（段落之间用双换行 \\n\\n 分割）",
  "targetWordsUsed": ["实际成功融入的单词列表"]
}`;

  const responseText = await callAIChat([
    { role: 'system', content: 'You are an elite editorial writer and English educator. Output strict JSON.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.7 });

  const cleaned = cleanJsonOutput(responseText);
  const parsed = JSON.parse(cleaned);

  if (!parsed.title || !parsed.content) {
    throw new Error('AI 未能生成有效的文章正文与标题');
  }

  return {
    title: String(parsed.title).trim(),
    source: String(parsed.source || 'AI 语境生词串记').trim(),
    content: String(parsed.content).trim(),
    targetWordsUsed: Array.isArray(parsed.targetWordsUsed) ? parsed.targetWordsUsed : words,
  };
}

/**
 * 功能 3：对英语长难句进行细致的语法拆解与剖析（主谓宾、从句、长难句结构、考点）
 */
export async function aiAnalyzeSentenceSyntax(
  sentence: string,
  context?: string
): Promise<SentenceAnalysisResult> {
  const prompt = `你是一位资深的高考/考研/GRE英语语法名师。请对以下英语句子进行深入长难句拆解与语法分析：

【目标原句】：
"${sentence}"
${context ? `\n【上下文意境】：\n"${context.slice(0, 300)}..."` : ''}

请务必按以下 JSON 结构返回分析结果，不要带有其他额外多余闲话：
{
  "sentence": "原句",
  "mainClause": "主干提取（例如：Subject + Verb + Object，用中文与英文标明核心骨架）",
  "grammarBreakdown": [
    {
      "part": "句子片段（如 'While traditional institutions rely on...'）",
      "role": "语法成分（如 '让步状语从句' / '后置定语' / '谓语动词短语'）",
      "explanation": "简要阐明该结构的作用与修饰对象"
    }
  ],
  "clauses": [
    "说明本句中存在的从句，如定语从句、名词性从句、状语从句等"
  ],
  "corePoints": [
    "重点句型/连词/固定搭配/常考考点分析"
  ],
  "summaryTranslation": "准确、地道、通顺的高分学术中文全句翻译"
}`;

  const responseText = await callAIChat([
    { role: 'system', content: 'You are a master English grammar analyst. Output valid JSON object.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.2 });

  const cleaned = cleanJsonOutput(responseText);
  const parsed = JSON.parse(cleaned);

  return {
    sentence,
    mainClause: String(parsed.mainClause || '主谓宾主干分析中'),
    grammarBreakdown: Array.isArray(parsed.grammarBreakdown) ? parsed.grammarBreakdown : [],
    clauses: Array.isArray(parsed.clauses) ? parsed.clauses : [],
    corePoints: Array.isArray(parsed.corePoints) ? parsed.corePoints : [],
    summaryTranslation: String(parsed.summaryTranslation || '').trim(),
  };
}

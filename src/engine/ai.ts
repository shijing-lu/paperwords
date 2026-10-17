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
 * 支持自定义单词数量 (20词、50词、甚至 200 词长篇宏大巨著)
 */
export async function aiGenerateArticleFromWords(
  words: string[],
  topicPreference?: string
): Promise<AIGeneratedArticleResult> {
  const wordCount = words.length;
  const wordListStr = words.join(', ');
  const topic = topicPreference || '考研与外刊学术风格（关于科技、社会、心理学或经济探索）';

  // 根据选择的单词数量，动态调整推荐文章长度和段落规模
  let targetLengthHint = '300 ~ 500 词左右（分为 3-4 个严密段落）';
  let timeoutMs = 45000;

  if (wordCount > 100) {
    targetLengthHint = `2000 ~ 3500 词左右的长篇宏大外刊特写/学术综述（分为多个章节与 8-15 个详细段落，必须全力将全部 ${wordCount} 个目标单词自然融汇入文中）`;
    timeoutMs = 150000; // 2.5分钟超时
  } else if (wordCount > 40) {
    targetLengthHint = `800 ~ 1500 词左右的深度外刊专题报道（分为 5-8 个段落，充分展开论述以自然容纳所有 ${wordCount} 个单词）`;
    timeoutMs = 90000;
  } else if (wordCount > 20) {
    targetLengthHint = `500 ~ 800 词左右的完整社论（分为 4-6 个段落，逻辑层层递进并贯穿所有 ${wordCount} 个单词）`;
    timeoutMs = 60000;
  }

  const prompt = `你是一位顶尖的英语外刊专栏作家与考研命题专家。
现有学习者提供了以下【${wordCount} 个核心英语生词】需要通过语境精读来强化记忆：
【目标生词列表（共 ${wordCount} 词）】：
${wordListStr}

请撰写一篇英文文章，满足以下严苛要求：
1. 风格：类似《经济学人》(The Economist)、《科学美国人》(Scientific American) 或考研英语一长篇真题阅读；
2. 主题：${topic}；
3. 篇幅长度与结构：${targetLengthHint}。文章必须逻辑严密、论据丰富、地道流畅，杜绝生硬堆砌；
4. 必须输出严格合法的 JSON 对象，不要输出任何多余的说明文字或 markdown 外部闲话。规范格式如下：
{
  "title": "英文文章标题",
  "source": "AI语境串记·外刊专栏",
  "content": "完整的英文文章正文（段落之间用双换行 \\n\\n 分割）",
  "targetWordsUsed": ["实际成功融入的单词列表"]
}`;

  const responseText = await callAIChat([
    { role: 'system', content: 'You are an elite editorial writer and English educator. Output strict JSON.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.7, timeoutMs });

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

export interface AIWordTranslationResult {
  word: string;
  lemma?: string;
  phonetic?: string;
  pos?: string;
  definition: string;
}

/**
 * 功能 4：AI 智能单词翻译与语境词义解析
 * 当本地词典与在线词典未收录时，调用 AI 快速解析词义、音标、词性及原形
 */
export async function aiTranslateWord(
  rawWord: string,
  contextSentence?: string
): Promise<AIWordTranslationResult> {
  const cleaned = rawWord.replace(/^[^\w]+|[^\w]+$/g, '').trim();
  const prompt = `请对英文单词或短语 "${cleaned}" 进行专业词典级权威中文释义。${
    contextSentence ? `\n该词出现在以下句子语境中：\n"${contextSentence}"\n请重点结合此句意，给出最贴切精准的释义。` : ''
  }

请务必输出严格合法的 JSON 对象，不要输出任何额外的 markdown 标签或对话文字：
{
  "word": "${cleaned}",
  "lemma": "该词的原形（如复数转单数、过去式转现在式；若本身已是原形则与word一致）",
  "phonetic": "/国际音标/",
  "pos": "词性缩写（如 n. / v. / adj. / adv.）",
  "definition": "精炼准确的中文释义（主要含义，多个含义可用分号隔开）"
}`;

  const responseText = await callAIChat([
    { role: 'system', content: 'You are a precise English-Chinese dictionary and linguistic expert. Output valid JSON object only.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.2, timeoutMs: 15000 });

  const cleanedJson = cleanJsonOutput(responseText);
  const parsed = JSON.parse(cleanedJson);

  return {
    word: String(parsed.word || cleaned).trim(),
    lemma: parsed.lemma ? String(parsed.lemma).trim() : undefined,
    phonetic: parsed.phonetic ? String(parsed.phonetic).trim() : undefined,
    pos: parsed.pos ? String(parsed.pos).trim() : undefined,
    definition: String(parsed.definition || '暂无释义').trim(),
  };
}

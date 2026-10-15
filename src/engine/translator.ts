/**
 * Reading Mode Sentence Translation Engine
 * Supports:
 * 1. Pre-cached high-quality human translations for default built-in articles (2017考研, Economist, etc.)
 * 2. In-memory and localStorage persistence caching for zero redundant queries
 * 3. Fallback online translation API (MyMemory / Google endpoint) for custom user-imported articles
 */

// Local storage key for cached translations
const TRANSLATION_CACHE_KEY = 'paperwords_sentence_translations_cache_v1';

// In-memory cache
const memoryCache = new Map<string, string>();

// Load localStorage cache into memory on init
function initCache() {
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (raw) {
      const parsed: Record<string, string> = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        memoryCache.set(k.trim().toLowerCase(), v);
      }
    }
  } catch (e) {
    console.warn('Failed to load translation cache:', e);
  }
}
initCache();

function saveCache(key: string, value: string) {
  memoryCache.set(key.trim().toLowerCase(), value);
  try {
    const current: Record<string, string> = {};
    // Keep max 500 items in localStorage to stay lightweight
    let count = 0;
    for (const [k, v] of memoryCache.entries()) {
      if (count++ > 500) break;
      current[k] = v;
    }
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to persist translation cache:', e);
  }
}

// Pre-seeded high quality authoritative translations for Kaoyan & Economist texts
const BUILTIN_SENTENCE_TRANSLATIONS: Record<string, string> = {
  // Article 1: 2017 Text 2
  "the court’s ruling is legally sound in defining a kind of favoritism that is not criminal.":
    "法院的这一裁决在法律上是合理的，因为它界定了一种不构成犯罪的偏袒行为。",
  "the court's ruling is legally sound in defining a kind of favoritism that is not criminal.":
    "法院的这一裁决在法律上是合理的，因为它界定了一种不构成犯罪的偏袒行为。",
  "in recent years, america’s foreign corrupt practices act has exerted stern enforcement across global commerce.":
    "近年来，美国的《反海外腐败法》在全球商业领域推行了极其严厉的执法监管。",
  "in recent years, america's foreign corrupt practices act has exerted stern enforcement across global commerce.":
    "近年来，美国的《反海外腐败法》在全球商业领域推行了极其严厉的执法监管。",
  "however, state-level bodies that govern the profession have faced increasing lobby pressure.":
    "然而，主管该行业的州级机构却面临着与日俱增的游说团体施压。",
  "a coalition of state agencies argued that federal statutes should not deprive the local police of constitutional powers.":
    "州级机构联盟坚称，联邦法律不应剥夺地方警方的宪法法定权力。",
  "the justices said that arizona police would be allowed to verify the legal status of individuals who come in contact with law enforcement.":
    "大法官们表示，将允许亚利桑那州警方核实与执法部门接触人员的合法身份。",
  "yet, a sovereign nation must balance civil rights against government authority.":
    "然而，一个主权独立的国家必须在公民权利与政府权力之间维持审慎的平衡。",
  "when a federal appeals court overturned the prior decision, critics began to defy the conventional doctrine.":
    "当一家联邦上诉法院推翻先前的判决时，批评人士开始公然挑战传统的教条信条。",
  "to make no compromise in convicting politicians is an audacious task, but the supreme court will hear the appeal in its next term to resolve this historic suit.":
    "在给政客定罪方面绝不妥协是一项大胆而艰巨的挑战，但最高法院将在下个开庭期审理此项上诉，以裁决这一历史性诉讼。",

  // Article 2: The Economist
  "automation should eventually boost productivity, but lengthy periods of economic stagnation have sparked fears of a manufacturing recession.":
    "自动化终将大幅提升生产力，但长期的经济停滞却引发了人们对制造业陷入衰退的深切担忧。",
  "to widen the gap between capital income and labor income creates social friction that market forces alone cannot easily mitigate.":
    "拉大资本收益与劳动收入之间的差距，正在滋生仅凭市场力量难以轻易缓解的社会摩擦与隔阂。",
  "tech giants have established a dangerous monopoly over big data.":
    "科技巨头已经对大数据领域建立了极具危险性的垄断地位。",
  "small entrepreneurs on a tight budget find it difficult to innovate or compete against such pervasive market power.":
    "预算紧张的小型创业者发现，在如此无孔不入的市场霸权面前，开展创新或与之竞争变得异常艰难。",
  "meanwhile, fiscal transfers and wage subsidies have become necessary to offset the financial burden imposed on working families.":
    "与此同时，财政转移支付与薪资补贴已成为抵消劳动者家庭所背负沉重经济负担的必要之举。",
  "if governments fail to integrate new regulatory tactics and reform their antitrust guidelines, economic volatility will fluctuate unpredictably.":
    "如果各国政府未能整合新型监管策略并改革反垄断指导方针，经济波动势必将变得难以预测与动荡不安。",
  "to revive commercial dynamism, policymakers must ensure that artificial intelligence does not simply become a tool to exploit consumer vulnerabilities.":
    "为了重振商业活力，决策者必须确保人工智能不会沦为仅仅用来剥削消费者脆弱点的工具。",
};

/**
 * Normalizes text for cache index lookup
 */
function normalizeKey(text: string): string {
  return text
    .replace(/[“”"']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Translate a sentence using:
 * 1. Pre-seeded human translations
 * 2. Memory / LocalStorage cache
 * 3. Free Online Translation APIs
 */
export async function translateSentence(sentenceText: string): Promise<string> {
  const clean = sentenceText.trim();
  if (!clean) return '';

  const key = normalizeKey(clean);

  // 1. Check built-in translations
  if (BUILTIN_SENTENCE_TRANSLATIONS[key]) {
    return BUILTIN_SENTENCE_TRANSLATIONS[key];
  }

  // 2. Check cached
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }

  // 3. Try online fetch: MyMemory API
  try {
    const encoded = encodeURIComponent(clean);
    const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|zh-CN`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const json = await res.json();
      if (json && json.responseData && json.responseData.translatedText) {
        let result = json.responseData.translatedText as string;
        // Strip any auto disclaimer tags if present
        result = result.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
        saveCache(key, result);
        return result;
      }
    }
  } catch (err) {
    console.log('MyMemory failed, attempting fallback...');
  }

  // 4. Fallback Google Web single translate
  try {
    const encoded = encodeURIComponent(clean);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encoded}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const trans = data[0].map((item: any) => item[0]).join('');
        if (trans) {
          saveCache(key, trans);
          return trans;
        }
      }
    }
  } catch (err) {
    console.warn('Google endpoint failed:', err);
  }

  // 5. Final fallback if all network requests fail
  return '（暂无预置译文，网络翻译服务连接超时，请检查网络）';
}

import fs from 'fs';
import path from 'path';

const SOURCES = [
  '初中',
  '高中',
  '四级',
  '六级',
  '专四',
  '考研',
  '雅思',
  '托福',
  '专八'
];

async function fetchVocabularyList(category) {
  const url = `https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/full_line_jsonl/sentence/${encodeURIComponent('正序')}/${encodeURIComponent(category + '.jsonl')}`;
  console.log(`Fetching ${category}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Failed to fetch ${category}: ${res.statusText}`);
      return [];
    }
    const text = await res.text();
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const list = [];
    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        list.push(item);
      } catch (e) {
        // ignore malformed lines
      }
    }
    console.log(`Fetched ${category}: ${list.length} words`);
    return list;
  } catch (err) {
    console.error(`Error fetching ${category}:`, err.message);
    return [];
  }
}

async function run() {
  const dictMap = new Map();

  for (const src of SOURCES) {
    const words = await fetchVocabularyList(src);
    for (const item of words) {
      const rawWord = (item.word || '').trim();
      if (!rawWord) continue;
      const key = rawWord.toLowerCase();

      // Format definitions: e.g. "v. 表演；起作用 / n. 行为；法令"
      let defStr = '';
      if (Array.isArray(item.translations)) {
        defStr = item.translations
          .map(t => `${t.type ? t.type + '. ' : ''}${t.translation || ''}`.trim())
          .filter(Boolean)
          .join('；');
      }

      const phonetic = item.us ? `/${item.us}/` : (item.uk ? `/${item.uk}/` : undefined);

      if (!dictMap.has(key)) {
        dictMap.set(key, {
          w: rawWord,
          p: phonetic || '',
          d: defStr,
          t: [src]
        });
      } else {
        const existing = dictMap.get(key);
        if (!existing.p && phonetic) existing.p = phonetic;
        if (!existing.d && defStr) existing.d = defStr;
        if (!existing.t.includes(src)) existing.t.push(src);
      }
    }
  }

  console.log(`Total unique vocabulary: ${dictMap.size}`);

  const dictObj = {};
  for (const [k, v] of dictMap.entries()) {
    dictObj[k] = [v.w, v.p, v.d, v.t.join(',')];
  }

  // Ensure public/dict directory exists
  const outDir = path.resolve(process.cwd(), 'public/dict');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'words_dictionary.json');
  fs.writeFileSync(outPath, JSON.stringify(dictObj));
  const stats = fs.statSync(outPath);
  console.log(`Successfully generated dictionary file: ${outPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

run();

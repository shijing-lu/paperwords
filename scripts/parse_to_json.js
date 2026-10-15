import fs from 'fs';
import path from 'path';

function parseSection(filePath, defaultCategory) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  
  const words = [];
  let currentCategory = defaultCategory;
  let currentWord = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check category header
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/#\s*([^｜|]+)/);
      if (match) {
        currentCategory = match[1].trim();
      }
      continue;
    }

    // Check word line: - **word** [phonetic]　:spoiler[definition]
    const wordMatch = trimmed.match(/^-\s+\*\*([a-zA-Z\s\-']+?)\*\*(?:\s*([\[/].*?[\]/]))?(?:[\s　]*:spoiler\[(.*)\])?$/);
    if (wordMatch) {
      if (currentWord) {
        words.push(currentWord);
      }

      const word = wordMatch[1].trim();
      const phonetic = wordMatch[2]?.trim() || '';
      let definition = wordMatch[3]?.trim() || '';

      // If definition has a closing bracket at the end
      if (definition.endsWith(']')) {
        definition = definition.slice(0, -1).trim();
      }

      // Infer pos
      let pos = '';
      const posMatch = definition.match(/(?:^|[①②③\s])(adj|adv|n|v|prep|conj|pron|art|num)\./i);
      if (posMatch) {
        pos = posMatch[1].toLowerCase() + '.';
      }

      currentWord = {
        word,
        phonetic: phonetic || undefined,
        pos: pos || undefined,
        definition: definition || '（详见真题）',
        examples: [],
        tags: ['考研', currentCategory],
      };
      continue;
    }

    // Check sub-item (考点, 例句, 派生)
    if (currentWord && trimmed.startsWith('-')) {
      const subText = trimmed.replace(/^-\s+/, '').trim();
      if (subText) {
        currentWord.examples.push(subText);
      }
    }
  }

  if (currentWord) {
    words.push(currentWord);
  }

  return words;
}

const section1Words = parseSection('./scripts/section1.txt', '政法法律');
const section2Words = parseSection('./scripts/section2.txt', '经济商业');
const section3Words = parseSection('./scripts/section3_5.txt', '教育');

const allWords = [...section1Words, ...section2Words, ...section3Words];

console.log(`Section 1 (政法法律): ${section1Words.length} 词`);
console.log(`Section 2 (经济商业): ${section2Words.length} 词`);
console.log(`Sections 3~5 (教育/医疗/观点): ${section3Words.length} 词`);
console.log(`总计解析: ${allWords.length} 词`);

// Output directory
fs.mkdirSync('./data', { recursive: true });
fs.writeFileSync('./data/kaoyan_core_335.json', JSON.stringify(allWords, null, 2), 'utf8');

console.log('Successfully written to ./data/kaoyan_core_335.json');

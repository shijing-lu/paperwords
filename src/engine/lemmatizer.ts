/**
 * English Lemmatizer & Morphological Variation Resolver
 * Handles inflections (plurals, verb tenses, participles, comparatives)
 * and irregular forms to ensure words clicked in reading articles match root dictionary entries.
 */

// High-frequency irregular verbs, nouns, and adjectives
const IRREGULAR_MAPPINGS: Record<string, string[]> = {
  // Common irregular plurals
  men: ['man'],
  women: ['woman'],
  children: ['child'],
  people: ['person'],
  teeth: ['tooth'],
  feet: ['foot'],
  geese: ['goose'],
  mice: ['mouse'],
  oxen: ['ox'],
  criteria: ['criterion'],
  phenomena: ['phenomenon'],
  data: ['datum'],
  analyses: ['analysis'],
  bases: ['basis', 'base'],
  crises: ['crisis'],
  theses: ['thesis'],

  // Irregular comparatives / superlatives
  better: ['good', 'well'],
  best: ['good', 'well'],
  worse: ['bad', 'ill'],
  worst: ['bad', 'ill'],
  farther: ['far'],
  farthest: ['far'],
  further: ['far'],
  furthest: ['far'],
  more: ['many', 'much'],
  most: ['many', 'much'],
  less: ['little'],
  least: ['little'],

  // High-frequency irregular verbs
  was: ['be'],
  were: ['be'],
  been: ['be'],
  am: ['be'],
  is: ['be'],
  are: ['be'],
  went: ['go'],
  gone: ['go'],
  goes: ['go'],
  had: ['have'],
  has: ['have'],
  did: ['do'],
  does: ['do'],
  done: ['do'],
  said: ['say'],
  says: ['say'],
  made: ['make'],
  took: ['take'],
  taken: ['take'],
  came: ['come'],
  seen: ['see'],
  saw: ['see'],
  knew: ['know'],
  known: ['know'],
  thought: ['think'],
  told: ['tell'],
  felt: ['feel'],
  found: ['find'],
  gave: ['give'],
  given: ['give'],
  left: ['leave'],
  meant: ['mean'],
  kept: ['keep'],
  let: ['let'],
  began: ['begin'],
  begun: ['begin'],
  held: ['hold'],
  brought: ['bring'],
  written: ['write'],
  wrote: ['write'],
  sat: ['sit'],
  stood: ['stand'],
  lost: ['lose'],
  paid: ['pay'],
  met: ['meet'],
  set: ['set'],
  learnt: ['learn'],
  learned: ['learn'],
  led: ['lead'],
  understood: ['understand'],
  spoke: ['speak'],
  spoken: ['speak'],
  spent: ['spend'],
  grew: ['grow'],
  grown: ['grow'],
  won: ['win'],
  bought: ['buy'],
  sent: ['send'],
  built: ['build'],
  fell: ['fall'],
  fallen: ['fall'],
  cut: ['cut'],
  became: ['become'],
  run: ['run'],
  ran: ['run'],
  read: ['read'],
  eaten: ['eat'],
  ate: ['eat'],
  drawn: ['draw'],
  drew: ['draw'],
  chosen: ['choose'],
  chose: ['choose'],
};

/**
 * Returns candidate root forms for an English word in order of likelihood.
 * e.g., 'bodies' -> ['bodies', 'body']
 *       'governing' -> ['governing', 'govern', 'governe']
 *       'statutes' -> ['statutes', 'statute']
 */
export function getLemmatizedCandidates(rawWord: string): string[] {
  const word = rawWord.trim().toLowerCase();
  if (!word || word.length <= 2) return [word];

  const candidates = new Set<string>();
  candidates.add(word); // Original form always first

  // 1. Check irregular lookup table
  if (IRREGULAR_MAPPINGS[word]) {
    for (const root of IRREGULAR_MAPPINGS[word]) {
      candidates.add(root);
    }
  }

  // 2. Plural and 3rd-person singular rules
  if (word.endsWith('ies') && word.length > 4) {
    // bodies -> body, agencies -> agency, policies -> policy
    candidates.add(word.slice(0, -3) + 'y');
  }

  if (word.endsWith('ves') && word.length > 4) {
    // lives -> life, wolves -> wolf, shelves -> shelf, knives -> knife
    candidates.add(word.slice(0, -3) + 'fe');
    candidates.add(word.slice(0, -3) + 'f');
  }

  if (word.endsWith('es') && word.length > 3) {
    // watches -> watch, boxes -> box, focuses -> focus, dresses -> dress
    const stem = word.slice(0, -2);
    if (stem.endsWith('ch') || stem.endsWith('sh') || stem.endsWith('ss') || stem.endsWith('x') || stem.endsWith('o') || stem.endsWith('z')) {
      candidates.add(stem);
    }
    // Also candidate for -e words: statutes -> statute, creates -> create
    candidates.add(word.slice(0, -1));
  }

  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) {
    // statutes -> statute, regulators -> regulator, words -> word
    candidates.add(word.slice(0, -1));
  }

  // 3. Past tense / past participle -ed rules
  if (word.endsWith('ied') && word.length > 4) {
    // studied -> study, applied -> apply
    candidates.add(word.slice(0, -3) + 'y');
  }

  if (word.endsWith('ed') && word.length > 3) {
    // repeated consonants: stopped -> stop, planned -> plan, admitted -> admit
    if (word.length > 4 && word[word.length - 3] === word[word.length - 4]) {
      candidates.add(word.slice(0, -3));
    }
    // loved -> love, lived -> live
    candidates.add(word.slice(0, -1));
    // played -> play, visited -> visit, governed -> govern
    candidates.add(word.slice(0, -2));
  }

  // 4. Present participle -ing rules
  if (word.endsWith('ing') && word.length > 4) {
    // lying -> lie, dying -> die, tying -> tie
    if (word.endsWith('ying')) {
      candidates.add(word.slice(0, -4) + 'ie');
    }
    // repeated consonants: running -> run, swimming -> swim, getting -> get
    if (word.length > 5 && word[word.length - 4] === word[word.length - 5]) {
      candidates.add(word.slice(0, -4));
    }
    // making -> make, taking -> take, creating -> create
    candidates.add(word.slice(0, -3) + 'e');
    // going -> go, reading -> read, governing -> govern
    candidates.add(word.slice(0, -3));
  }

  // 5. Comparatives & Superlatives (-er, -est)
  if (word.endsWith('ier') && word.length > 4) {
    // happier -> happy, easier -> easy
    candidates.add(word.slice(0, -3) + 'y');
  } else if (word.endsWith('er') && word.length > 3) {
    candidates.add(word.slice(0, -1)); // nicer -> nice
    candidates.add(word.slice(0, -2)); // faster -> fast
  }

  if (word.endsWith('iest') && word.length > 5) {
    // happiest -> happy
    candidates.add(word.slice(0, -4) + 'y');
  } else if (word.endsWith('est') && word.length > 4) {
    candidates.add(word.slice(0, -1)); // nicest -> nice
    candidates.add(word.slice(0, -3)); // fastest -> fast
  }

  // 6. Adverb -ly rule
  if (word.endsWith('ly') && word.length > 4) {
    if (word.endsWith('ily')) {
      // happily -> happy, easily -> easy
      candidates.add(word.slice(0, -3) + 'y');
    }
    // quickly -> quick, silently -> silent
    candidates.add(word.slice(0, -2));
  }

  return Array.from(candidates);
}

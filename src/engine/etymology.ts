import type { EtymologyData, EtymologyPart, WordItem } from '../types';

// 1. 核心高频考研/GRE/四六级专有词根词缀助记库 (即查即显，0ms 秒开)
export const CORE_ETYMOLOGY_DICT: Record<string, EtymologyData> = {
  sovereign: {
    formula: 'sover (源自 super, 在...之上) + reign (统治)',
    meaning: '处在最高统治地位的 -> 至高无上的元首/主权',
    mnemonic: '统治(reign)在所有人之上(super/sover)的人就是主权者(sovereign)。',
    cognates: ['reign (统治/执政)', 'rein (缰绳/驾驭)', 'foreign (外部的)'],
    parts: [
      { type: 'prefix', text: 'sover-', meaning: '在...之上 (源自 super)' },
      { type: 'root', text: 'reign', meaning: '统治，主宰' },
    ],
    source: 'preset',
  },
  commonwealth: {
    formula: 'common (公共的/大家的) + wealth (福祉/财富)',
    meaning: '全体公民共享的财富与福祉 -> 联邦，国家共同体',
    mnemonic: 'common(共同) + weal/wealth(福祉) = 全民命运与利益的共同体。',
    cognates: ['common (共同的)', 'wealthy (富裕的)', 'weal (福利)'],
    parts: [
      { type: 'prefix', text: 'common-', meaning: '公共的，共同的' },
      { type: 'root', text: 'wealth', meaning: '福祉，财富' },
    ],
    source: 'preset',
  },
  coalition: {
    formula: 'co- (共同) + al (生长/滋养) + -ition (名词后缀)',
    meaning: '为了特定目标联合生长在一起 -> 同盟，联合政府',
    mnemonic: 'co(一起) + al(生长，同 coalesce) = 几个党派长到一块儿去了，结成联合同盟。',
    cognates: ['coalesce (合并/聚合)', 'adolescent (正在成长中的青少年)'],
    parts: [
      { type: 'prefix', text: 'co-', meaning: '共同，一起' },
      { type: 'root', text: 'al', meaning: '滋养，生长' },
      { type: 'suffix', text: '-ition', meaning: '动作或状态名词后缀' },
    ],
    source: 'preset',
  },
  union: {
    formula: 'uni (单一/联合) + -on (名词后缀)',
    meaning: '结合成一体 -> 工会，联盟，结合',
    mnemonic: 'uni 是表示“单一、统一”的核心词根。',
    cognates: ['unite (联合)', 'unique (唯一的)', 'unify (统一)'],
    parts: [
      { type: 'root', text: 'uni', meaning: '一个，单一，统一' },
      { type: 'suffix', text: '-on', meaning: '名词后缀' },
    ],
    source: 'preset',
  },
  democracy: {
    formula: 'demo (人民/民众) + cracy (统治/政权)',
    meaning: '人民当家做主的统治形式 -> 民主制度',
    mnemonic: 'demo(民众) + cracy(统治)。对比：autocracy(独裁，auto自己), aristocracy(贵族统治)。',
    cognates: ['epidemic (流行病, epi在...之中 + dem民众)', 'demographic (人口统计的)'],
    parts: [
      { type: 'root', text: 'demo', meaning: '人民，民众' },
      { type: 'suffix', text: '-cracy', meaning: '统治方式，政权' },
    ],
    source: 'preset',
  },
  liberate: {
    formula: 'liber (自由) + -ate (动词后缀，使...)',
    meaning: '给予自由 -> 解放，使自由',
    mnemonic: 'liber词根就是自由（Liberty）。-ate动词后缀表示“使...处于自由状态”。',
    cognates: ['liberty (自由)', 'liberal (思想自由开放的)', 'liberation (解放运动)'],
    parts: [
      { type: 'root', text: 'liber', meaning: '自由' },
      { type: 'suffix', text: '-ate', meaning: '动词后缀，使产生...' },
    ],
    source: 'preset',
  },
  emancipate: {
    formula: 'e- (出/去) + man (手/掌管) + cip (拿/抓握) + -ate (动词后缀)',
    meaning: '从掌控的手中解脱出来 -> 解放，释放',
    mnemonic: '手(man)抓着(cip)你，现在放你出来(e-)，这就是彻底的“解放”。林肯的《解放黑奴宣言》即 Emancipation Proclamation。',
    cognates: ['manual (手工的)', 'manipulate (巧妙操纵)', 'participate (参与, part+cip抓取一份)'],
    parts: [
      { type: 'prefix', text: 'e-', meaning: '向外，脱离' },
      { type: 'root', text: 'man', meaning: '手' },
      { type: 'root', text: 'cip', meaning: '抓，拿取' },
      { type: 'suffix', text: '-ate', meaning: '动词后缀' },
    ],
    source: 'preset',
  },
  conservative: {
    formula: 'con- (强调/完全) + serv (保持/守护) + -ative (倾向于...的)',
    meaning: '全力保留守护旧有传统 -> 保守的，守旧的',
    mnemonic: 'serv 词根是“保留、服务”；con(全面) + serv(守护) = 全力守住既有现状不愿冒进。',
    cognates: ['preserve (保护/保存)', 'reserve (储备/保留)', 'observe (观察/遵守)'],
    parts: [
      { type: 'prefix', text: 'con-', meaning: '加强语气，完全' },
      { type: 'root', text: 'serv', meaning: '保留，守卫' },
      { type: 'suffix', text: '-ative', meaning: '形容词后缀，有...倾向的' },
    ],
    source: 'preset',
  },
  legislative: {
    formula: 'leg (法律) + is + lat (带来/提出) + -ive (形容词后缀)',
    meaning: '负责提出并制定法律的 -> 立法的',
    mnemonic: 'leg(法律) + lat(带来/承载) = 把法条带入国家秩序中的权力机构。',
    cognates: ['legal (合法的)', 'legitimate (合法的/正当的)', 'privilege (特权, privi私 + leg法)'],
    parts: [
      { type: 'root', text: 'leg', meaning: '法律' },
      { type: 'root', text: 'lat', meaning: '承载，带来，提出' },
      { type: 'suffix', text: '-ive', meaning: '形容词后缀' },
    ],
    source: 'preset',
  },
  judiciary: {
    formula: 'judic (审判/法官) + -ary (与...相关的机构/人员)',
    meaning: '与司法审判权相关的体系 -> 司法系统，法官阶层',
    mnemonic: '源自 judex/judicare(宣判法律)。judge(法官) + judicial(司法的)。',
    cognates: ['judge (法官/判断)', 'prejudice (偏见, pre事先 + judic判决)', 'judicious (明智的)'],
    parts: [
      { type: 'root', text: 'judic', meaning: '审判，断案' },
      { type: 'suffix', text: '-ary', meaning: '与...相关的系统/集合' },
    ],
    source: 'preset',
  },
  advocate: {
    formula: 'ad- (向/去) + voc (声音/呼唤) + -ate (动词/名词后缀)',
    meaning: '朝着某方向发出大声呼吁 -> 倡导，拥护；倡导者',
    mnemonic: 'ad(向着) + voc(声音) = 为某人/某事发声声援，即“倡导、支持”。',
    cognates: ['vocal (声音的)', 'provoke (挑衅, pro向前 + vok喊)', 'revoke (撤销, re往回 + vok喊)'],
    parts: [
      { type: 'prefix', text: 'ad-', meaning: '朝向，给予' },
      { type: 'root', text: 'voc', meaning: '声音，呼唤' },
      { type: 'suffix', text: '-ate', meaning: '动作后缀' },
    ],
    source: 'preset',
  },
  conspicuous: {
    formula: 'con- (全面/加强) + spic (看) + -uous (充满...的)',
    meaning: '所有人一眼都能清清楚楚看到的 -> 显眼的，引人注目的',
    mnemonic: 'con(大家) + spic(看) = 大家都在看，太显眼了！',
    cognates: ['inspect (检查, in往里 + spect看)', 'spectator (旁观者)', 'perspicuous (清晰易懂的)'],
    parts: [
      { type: 'prefix', text: 'con-', meaning: '加强语气，共同' },
      { type: 'root', text: 'spic', meaning: '看，观察' },
      { type: 'suffix', text: '-uous', meaning: '形容词后缀，具有...特质的' },
    ],
    source: 'preset',
  },
  perspective: {
    formula: 'per- (穿透/彻底) + spect (看) + -ive (名词后缀)',
    meaning: '穿透事物全局看过去的视角 -> 视角，远景，客观透视',
    mnemonic: 'per(穿透) + spect(看) = 一眼把前因后果看穿看透的“全局视角”。',
    cognates: ['spectacle (壮观场面/眼镜)', 'retrospect (回顾)', 'circumspect (谨慎的, 周围看)'],
    parts: [
      { type: 'prefix', text: 'per-', meaning: '穿透，完全' },
      { type: 'root', text: 'spect', meaning: '看，注视' },
      { type: 'suffix', text: '-ive', meaning: '名词/形容词后缀' },
    ],
    source: 'preset',
  },
  retrospect: {
    formula: 'retro- (向后/追溯) + spect (看)',
    meaning: '转过头向过去看 -> 回顾，回想',
    mnemonic: 'retro(复古/向后) + spect(看) = 回头看走过的路。In retrospect (回想起来)。',
    cognates: ['retrograde (倒退的)', 'prospect (前景, pro向前 + spect看)'],
    parts: [
      { type: 'prefix', text: 'retro-', meaning: '向后，往回' },
      { type: 'root', text: 'spect', meaning: '看' },
    ],
    source: 'preset',
  },
  contradict: {
    formula: 'contra- (相反/逆反) + dict (说/言语)',
    meaning: '专门反着别人的话说 -> 反驳，相抵触，产生矛盾',
    mnemonic: 'contra(反着) + dict(说) = 唱反调 -> 矛盾、反驳。',
    cognates: ['predict (预测, pre先 + dict说)', 'dictator (独裁者)', 'dictionary (字典)'],
    parts: [
      { type: 'prefix', text: 'contra-', meaning: '相反，对抗' },
      { type: 'root', text: 'dict', meaning: '说，讲话' },
    ],
    source: 'preset',
  },
  predict: {
    formula: 'pre- (事先/在前) + dict (说)',
    meaning: '在事情发生之前就说出来 -> 预测，预言',
    mnemonic: 'pre(提前) + dict(讲) = 提前讲明将要发生的事。',
    cognates: ['verdict (定论/判决, ver真实 + dict说)', 'indicate (指示/标明)'],
    parts: [
      { type: 'prefix', text: 'pre-', meaning: '在...之前，提前' },
      { type: 'root', text: 'dict', meaning: '说，言告' },
    ],
    source: 'preset',
  },
  precedent: {
    formula: 'pre- (前) + ced (走/行进) + -ent (名词/形容词后缀)',
    meaning: '走在前面作为范例的事物 -> 先例，前例',
    mnemonic: 'pre(在前) + ced(走) = 走在最前头的人或案例。unprecedented (史无前例的)。',
    cognates: ['recede (后退/消退)', 'concede (退让/承认)', 'exceed (超越, ex出 + ceed走)'],
    parts: [
      { type: 'prefix', text: 'pre-', meaning: '在前面' },
      { type: 'root', text: 'ced', meaning: '走，行走' },
      { type: 'suffix', text: '-ent', meaning: '名词/形容词后缀' },
    ],
    source: 'preset',
  },
  sympathy: {
    formula: 'sym- (相同/共同) + path (感受/痛苦) + -y (名词后缀)',
    meaning: '体会共同的感受与痛苦 -> 同情，共鸣',
    mnemonic: 'sym(共同) + path(感情)。对比：apathy(冷漠, a无), antipathy(反感, anti反)。',
    cognates: ['empathy (共情/同理心)', 'pathology (病理学)', 'pathetic (令人怜悯的)'],
    parts: [
      { type: 'prefix', text: 'sym-', meaning: '共同，相同' },
      { type: 'root', text: 'path', meaning: '感受，痛苦，情感' },
      { type: 'suffix', text: '-y', meaning: '名词后缀' },
    ],
    source: 'preset',
  },
  incessant: {
    formula: 'in- (否定，无) + cess (停止/走) + -ant (形容词后缀)',
    meaning: '从不停歇下来的 -> 连绵不断的，无休止的',
    mnemonic: 'in(不) + cease/cess(停止) = 永不休止。',
    cognates: ['cease (停止)', 'cessation (中断)', 'accessible (可接近的)'],
    parts: [
      { type: 'prefix', text: 'in-', meaning: '不，否定' },
      { type: 'root', text: 'cess', meaning: '走，退让，停止' },
      { type: 'suffix', text: '-ant', meaning: '形容词后缀' },
    ],
    source: 'preset',
  },
  distract: {
    formula: 'dis- (分开/分散) + tract (拉/拽)',
    meaning: '把注意力从正轨上拉开 -> 使分心，转移注意力',
    mnemonic: 'dis(散开) + tract(拉) = 思想被拉跑了，分心了。',
    cognates: ['attract (吸引, ad向 + tract拉)', 'abstract (抽象/提炼)', 'extract (拔出/提取)'],
    parts: [
      { type: 'prefix', text: 'dis-', meaning: '分开，离开' },
      { type: 'root', text: 'tract', meaning: '拉，引' },
    ],
    source: 'preset',
  },
  tractable: {
    formula: 'tract (拉/牵引) + -able (可...的)',
    meaning: '容易牵引拽着走的 -> 驯服的，温顺的，易管教的',
    mnemonic: 'tract(拉) + able(能) = 绳子一拉就能乖乖跟着走。反义词：intractable (倔强的/难处理的)。',
    cognates: ['tractor (拖拉机)', 'traction (牵引力)', 'contract (合同/收缩)'],
    parts: [
      { type: 'root', text: 'tract', meaning: '拉，牵引' },
      { type: 'suffix', text: '-able', meaning: '形容词后缀，能够...的' },
    ],
    source: 'preset',
  },
};

// 2. 常见前缀形态学知识库 (Morphological Prefixes)
export const PREFIX_RULES: { prefix: string; meaning: string }[] = [
  { prefix: 'anti', meaning: '反抗，对抗' },
  { prefix: 'auto', meaning: '自己，自动' },
  { prefix: 'contra', meaning: '相反，对抗' },
  { prefix: 'counter', meaning: '反击，相对' },
  { prefix: 'de', meaning: '向下，离开，除去' },
  { prefix: 'dis', meaning: '分开，否定，相反' },
  { prefix: 'fore', meaning: '在先，预先' },
  { prefix: 'hyper', meaning: '超级，过度' },
  { prefix: 'inter', meaning: '在...之间，相互' },
  { prefix: 'intra', meaning: '在...之内' },
  { prefix: 'intro', meaning: '向内，入内' },
  { prefix: 'micro', meaning: '微小' },
  { prefix: 'macro', meaning: '宏大' },
  { prefix: 'mis', meaning: '错误，不良' },
  { prefix: 'non', meaning: '非，不' },
  { prefix: 'over', meaning: '超过，过度' },
  { prefix: 'post', meaning: '在...之后' },
  { prefix: 'pre', meaning: '在...之前，提前' },
  { prefix: 'pro', meaning: '向前，支持，倾向' },
  { prefix: 'retro', meaning: '向后，追溯' },
  { prefix: 'semi', meaning: '半，部分' },
  { prefix: 'sub', meaning: '在...下，次级' },
  { prefix: 'super', meaning: '超级，超越' },
  { prefix: 'syn', meaning: '共同，相同' },
  { prefix: 'sym', meaning: '共同，相同' },
  { prefix: 'trans', meaning: '穿过，跨越，转换' },
  { prefix: 'ultra', meaning: '极端，超出' },
  { prefix: 'under', meaning: '在...之下，不足' },
  { prefix: 'un', meaning: '不，相反' },
  { prefix: 're', meaning: '再次，往回' },
  { prefix: 'in', meaning: '不，无，向内' },
  { prefix: 'im', meaning: '不，无，向内' },
  { prefix: 'il', meaning: '不，无' },
  { prefix: 'ir', meaning: '不，无' },
  { prefix: 'con', meaning: '共同，强调' },
  { prefix: 'com', meaning: '共同，强调' },
  { prefix: 'col', meaning: '共同' },
  { prefix: 'cor', meaning: '共同' },
  { prefix: 'ex', meaning: '向外，脱离' },
  { prefix: 'em', meaning: '进入，使成...' },
  { prefix: 'en', meaning: '进入，使成...' },
  { prefix: 'ad', meaning: '朝向，给予' },
  { prefix: 'ab', meaning: '离开，偏离' },
];

// 3. 常见核心词根知识库 (Latin / Greek Roots)
export const ROOT_RULES: { root: string; meaning: string; examples: string[] }[] = [
  { root: 'spect', meaning: '看，注视', examples: ['inspect', 'spectator', 'perspective'] },
  { root: 'spic', meaning: '看，注视', examples: ['conspicuous', 'despicable', 'suspicion'] },
  { root: 'dict', meaning: '说，讲话', examples: ['predict', 'contradict', 'dictate'] },
  { root: 'dic', meaning: '说，指示', examples: ['indicate', 'dedicate', 'judge'] },
  { root: 'ced', meaning: '走，退让', examples: ['precedent', 'concede', 'recede'] },
  { root: 'cess', meaning: '走，离开', examples: ['access', 'excess', 'process'] },
  { root: 'ceed', meaning: '走，前进', examples: ['succeed', 'proceed', 'exceed'] },
  { root: 'tract', meaning: '拉，引，拖', examples: ['attract', 'distract', 'extract'] },
  { root: 'vis', meaning: '看，视觉', examples: ['vision', 'visible', 'supervise'] },
  { root: 'vid', meaning: '看，察觉', examples: ['evident', 'video', 'provide'] },
  { root: 'duc', meaning: '引导，带领', examples: ['produce', 'introduce', 'educate'] },
  { root: 'duct', meaning: '引导，传导', examples: ['conduct', 'deduct', 'product'] },
  { root: 'mit', meaning: '送，传送', examples: ['transmit', 'admit', 'permit'] },
  { root: 'miss', meaning: '送，发射', examples: ['mission', 'dismiss', 'emission'] },
  { root: 'port', meaning: '携带，搬运', examples: ['transport', 'export', 'portable'] },
  { root: 'struct', meaning: '建造，构建', examples: ['construct', 'destroy', 'instruct'] },
  { root: 'fac', meaning: '做，制造', examples: ['factory', 'facile', 'factor'] },
  { root: 'fect', meaning: '做，产生影响', examples: ['affect', 'effect', 'perfect'] },
  { root: 'fic', meaning: '做，产生', examples: ['efficient', 'deficit', 'fiction'] },
  { root: 'gen', meaning: '出生，产生，基因', examples: ['generate', 'general', 'genius'] },
  { root: 'flu', meaning: '流动', examples: ['fluent', 'influence', 'fluid'] },
  { root: 'flux', meaning: '流动，流变', examples: ['influx', 'reflux', 'fluctuate'] },
  { root: 'form', meaning: '形状，形式', examples: ['transform', 'conform', 'reform'] },
  { root: 'press', meaning: '压，按压', examples: ['express', 'suppress', 'impress'] },
  { root: 'cur', meaning: '跑，发生，关心', examples: ['occur', 'current', 'curious'] },
  { root: 'curs', meaning: '跑，流动', examples: ['excursion', 'cursor', 'precursor'] },
  { root: 'scrib', meaning: '写，记录', examples: ['describe', 'prescribe', 'inscribe'] },
  { root: 'script', meaning: '写，文字', examples: ['manuscript', 'postscript', 'script'] },
  { root: 'sens', meaning: '感觉，知觉', examples: ['sense', 'sensitive', 'consensus'] },
  { root: 'sent', meaning: '感觉，思想', examples: ['sentiment', 'consent', 'resent'] },
  { root: 'pos', meaning: '放，放置', examples: ['compose', 'oppose', 'deposit'] },
  { root: 'posit', meaning: '放，位置', examples: ['position', 'positive', 'deposit'] },
  { root: 'cap', meaning: '抓，拿，头', examples: ['capture', 'capital', 'capable'] },
  { root: 'cept', meaning: '拿取，接受', examples: ['accept', 'concept', 'except'] },
  { root: 'cip', meaning: '拿，抓', examples: ['anticipate', 'recipe', 'discipline'] },
  { root: 'voc', meaning: '声音，呼唤', examples: ['advocate', 'vocation', 'provoke'] },
  { root: 'vok', meaning: '叫喊，唤起', examples: ['evoke', 'revoke', 'provoke'] },
  { root: 'ten', meaning: '握住，保持', examples: ['tenant', 'tenable', 'maintenance'] },
  { root: 'tain', meaning: '握住，支撑', examples: ['maintain', 'contain', 'retain'] },
  { root: 'cred', meaning: '相信，信任', examples: ['credit', 'credible', 'incredible'] },
  { root: 'serv', meaning: '守卫，服务，保留', examples: ['preserve', 'reserve', 'conservative'] },
  { root: 'leg', meaning: '法律，读，收集', examples: ['legal', 'legitimate', 'colleague'] },
  { root: 'lect', meaning: '选，读，收集', examples: ['elect', 'collect', 'lecture'] },
  { root: 'liber', meaning: '自由', examples: ['liberate', 'liberty', 'liberal'] },
  { root: 'path', meaning: '情感，感受，痛苦', examples: ['sympathy', 'empathy', 'apathy'] },
  { root: 'demo', meaning: '人民，民众', examples: ['democracy', 'democrat', 'epidemic'] },
  { root: 'aud', meaning: '听', examples: ['audio', 'audience', 'audible'] },
  { root: 'bio', meaning: '生命，生物', examples: ['biology', 'biography', 'symbiosis'] },
  { root: 'chron', meaning: '时间', examples: ['chronic', 'synchronize', 'chronology'] },
  { root: 'man', meaning: '手', examples: ['manual', 'manuscript', 'manipulate'] },
  { root: 'ped', meaning: '脚，足', examples: ['pedal', 'expedition', 'pedestrian'] },
  { root: 'rupt', meaning: '破，断裂', examples: ['erupt', 'corrupt', 'interrupt'] },
  { root: 'solv', meaning: '解开，松弛', examples: ['resolve', 'solve', 'dissolve'] },
  { root: 'solut', meaning: '解开', examples: ['solution', 'absolute', 'resolution'] },
  { root: 'vert', meaning: '转，转变', examples: ['convert', 'invert', 'divert'] },
  { root: 'vers', meaning: '转，倾向', examples: ['reverse', 'diverse', 'adversary'] },
];

// 4. 常见后缀形态学知识库 (Morphological Suffixes)
export const SUFFIX_RULES: { suffix: string; meaning: string }[] = [
  { suffix: 'tion', meaning: '名词后缀：行为、过程或状态' },
  { suffix: 'sion', meaning: '名词后缀：行为、过程或状态' },
  { suffix: 'ment', meaning: '名词后缀：结果、方式或器具' },
  { suffix: 'ness', meaning: '名词后缀：性质、状态' },
  { suffix: 'ity', meaning: '名词后缀：性质、特质或状态' },
  { suffix: 'ty', meaning: '名词后缀：状态、性质' },
  { suffix: 'ance', meaning: '名词后缀：性质、状况' },
  { suffix: 'ence', meaning: '名词后缀：性质、状况' },
  { suffix: 'ist', meaning: '名词后缀：...专家、主义者' },
  { suffix: 'ism', meaning: '名词后缀：...主义、学说、现象' },
  { suffix: 'able', meaning: '形容词后缀：可...的，能...的' },
  { suffix: 'ible', meaning: '形容词后缀：可...的，能...的' },
  { suffix: 'ive', meaning: '形容词/名词后缀：有...倾向的' },
  { suffix: 'ative', meaning: '形容词后缀：具有...性质的' },
  { suffix: 'al', meaning: '形容词/名词后缀：与...相关的' },
  { suffix: 'ous', meaning: '形容词后缀：充满...的，具有...特征的' },
  { suffix: 'ious', meaning: '形容词后缀：充满...的' },
  { suffix: 'ful', meaning: '形容词后缀：充满...的' },
  { suffix: 'less', meaning: '形容词后缀：没有...的，无...的' },
  { suffix: 'ize', meaning: '动词后缀：使...化，实行' },
  { suffix: 'ise', meaning: '动词后缀：使...化，实行' },
  { suffix: 'ate', meaning: '动词/形容词后缀：使成为...' },
  { suffix: 'ify', meaning: '动词后缀：使...化' },
  { suffix: 'fy', meaning: '动词后缀：使...化' },
  { suffix: 'ly', meaning: '副词/形容词后缀：以...方式' },
  { suffix: 'ary', meaning: '形容词/名词后缀：与...相关的场所或人' },
  { suffix: 'ory', meaning: '形容词/名词后缀：具有...性质的场所' },
  { suffix: 'ic', meaning: '形容词后缀：关于...的' },
  { suffix: 'ical', meaning: '形容词后缀：具有...特质的' },
];

/**
 * 基于形态学规则进行正则拆解分析 (Fallback Rule Engine)
 */
export function parseEtymologyByRules(rawWord: string): EtymologyData | null {
  const word = rawWord.toLowerCase().trim();
  if (word.length < 4) return null;

  // 1. 寻找匹配的核心词根
  let matchedRoot: (typeof ROOT_RULES)[0] | null = null;
  let rootIndex = -1;

  for (const r of ROOT_RULES) {
    const idx = word.indexOf(r.root);
    // 词根必须是有效子串，且保留合理的前后余量
    if (idx !== -1) {
      if (!matchedRoot || r.root.length > matchedRoot.root.length) {
        matchedRoot = r;
        rootIndex = idx;
      }
    }
  }

  if (!matchedRoot || rootIndex === -1) {
    return null;
  }

  const prefixPartStr = word.substring(0, rootIndex);
  const suffixPartStr = word.substring(rootIndex + matchedRoot.root.length);

  const parts: EtymologyPart[] = [];

  // 分析前缀
  let matchedPrefixText = '';
  let matchedPrefixMeaning = '';
  if (prefixPartStr.length > 0) {
    const foundPrefix = PREFIX_RULES.find((p) => p.prefix === prefixPartStr);
    if (foundPrefix) {
      matchedPrefixText = foundPrefix.prefix;
      matchedPrefixMeaning = foundPrefix.meaning;
      parts.push({
        type: 'prefix',
        text: `${foundPrefix.prefix}-`,
        meaning: foundPrefix.meaning,
      });
    } else {
      parts.push({
        type: 'prefix',
        text: `${prefixPartStr}-`,
        meaning: '前缀/词首音变',
      });
    }
  }

  // 词根
  parts.push({
    type: 'root',
    text: matchedRoot.root,
    meaning: matchedRoot.meaning,
  });

  // 分析后缀
  let matchedSuffixText = '';
  let matchedSuffixMeaning = '';
  if (suffixPartStr.length > 0) {
    const foundSuffix = SUFFIX_RULES.find((s) => s.suffix === suffixPartStr);
    if (foundSuffix) {
      matchedSuffixText = foundSuffix.suffix;
      matchedSuffixMeaning = foundSuffix.meaning;
      parts.push({
        type: 'suffix',
        text: `-${foundSuffix.suffix}`,
        meaning: foundSuffix.meaning,
      });
    } else {
      parts.push({
        type: 'suffix',
        text: `-${suffixPartStr}`,
        meaning: '后缀/词尾派生',
      });
    }
  }

  // 生成拆解公式
  const formula = parts.map((p) => `${p.text} (${p.meaning})`).join(' + ');

  return {
    formula,
    meaning: `包含核心词根【${matchedRoot.root} = ${matchedRoot.meaning}】`,
    mnemonic: matchedPrefixMeaning
      ? `前缀 ${matchedPrefixText}(${matchedPrefixMeaning}) + 词根 ${matchedRoot.root}(${matchedRoot.meaning})，组合形成本词核心涵义。`
      : `核心词根 ${matchedRoot.root} 表“${matchedRoot.meaning}”，是掌握本词及同族词的关键枢纽。`,
    cognates: matchedRoot.examples,
    parts,
    source: 'rule',
  };
}

/**
 * 结构化词根词缀统一获取入口 (带缓存与阶梯回退)
 */
export function getWordEtymology(word: WordItem): EtymologyData | null {
  // 1. 如果单词数据本身已携带（或已由 AI 缓存在数据库中），直接返回
  if (word.etymology && word.etymology.formula) {
    return word.etymology;
  }

  const normalized = word.word.toLowerCase().trim();

  // 2. 查预设真题精编词库 (0ms 命中)
  if (CORE_ETYMOLOGY_DICT[normalized]) {
    return CORE_ETYMOLOGY_DICT[normalized];
  }

  // 3. 走通用形态学拆解算法
  const ruleResult = parseEtymologyByRules(normalized);
  if (ruleResult) {
    return ruleResult;
  }

  return null;
}

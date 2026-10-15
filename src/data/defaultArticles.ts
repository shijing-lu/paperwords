import type { ArticleItem } from '../types';

export const DEFAULT_ARTICLES: ArticleItem[] = [
  {
    id: 'article-kaoyan-2017-text2',
    userId: 'system',
    title: '考研精读 01：美国反海外腐败与最高法院的博弈',
    source: '考研英语一真题阅读精选 (2017 Text 2)',
    content: `The court’s ruling is legally sound in defining a kind of favoritism that is not criminal. In recent years, America’s Foreign Corrupt Practices Act has exerted stern enforcement across global commerce. 

However, state-level bodies that govern the profession have faced increasing lobby pressure. A coalition of state agencies argued that federal statutes should not deprive the local police of constitutional powers. The Justices said that Arizona police would be allowed to verify the legal status of individuals who come in contact with law enforcement.

Yet, a sovereign nation must balance civil rights against government authority. When a federal appeals court overturned the prior decision, critics began to defy the conventional doctrine. To make no compromise in convicting politicians is an audacious task, but the Supreme Court will hear the appeal in its next term to resolve this historic suit.`,
    totalWords: 135,
    readProgress: 0,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: 'article-economist-tech-monopoly',
    userId: 'system',
    title: '考研精读 02：大科技公司的垄断、资本与经济衰退',
    source: 'The Economist 经济学人精选',
    content: `Automation should eventually boost productivity, but lengthy periods of economic stagnation have sparked fears of a manufacturing recession. To widen the gap between capital income and labor income creates social friction that market forces alone cannot easily mitigate.

Tech giants have established a dangerous monopoly over big data. Small entrepreneurs on a tight budget find it difficult to innovate or compete against such pervasive market power. Meanwhile, fiscal transfers and wage subsidies have become necessary to offset the financial burden imposed on working families.

If governments fail to integrate new regulatory tactics and reform their antitrust guidelines, economic volatility will fluctuate unpredictably. To revive commercial dynamism, policymakers must ensure that artificial intelligence does not simply become a tool to exploit consumer vulnerabilities.`,
    totalWords: 128,
    readProgress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

import { posts, type Post } from './posts';

interface SeriesDefinition {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  accent: 'leaf' | 'moss' | 'coral';
  categories: string[];
}

export interface PostSeries extends Omit<SeriesDefinition, 'categories'> {
  posts: Post[];
}

const definitions: SeriesDefinition[] = [
  {
    slug: 'python-roadmap',
    title: 'Python 学习路线',
    eyebrow: '从语法到实践',
    description: '循序渐进地掌握 Python 基础、工程能力与数据分析，把零散知识连接成可复用的能力。',
    accent: 'leaf',
    categories: ['Python 学习'],
  },
  {
    slug: 'build-notes',
    title: '项目实践档案',
    eyebrow: '在创造中学习',
    description: '从桌面应用到 Web 博客，用真实项目记录设计、编码与持续迭代的全过程。',
    accent: 'moss',
    categories: ['项目实践'],
  },
  {
    slug: 'reading-thinking',
    title: '阅读与思考',
    eyebrow: '把输入变成判断',
    description: '在书籍、人物和故事里寻找经验，用写作留下那些真正改变行动的思考。',
    accent: 'coral',
    categories: ['阅读随笔', '人物与思考'],
  },
];

const oldestFirst = (left: Post, right: Post) =>
  (Date.parse(left.date.replaceAll('.', '-')) || 0) - (Date.parse(right.date.replaceAll('.', '-')) || 0);

export const series: PostSeries[] = definitions.map(({ categories, ...definition }) => ({
  ...definition,
  posts: posts.filter((post) => categories.includes(post.category)).sort(oldestFirst),
}));

export const findSeriesForPost = (post: Post) =>
  series.find((item) => item.posts.some((candidate) => candidate.slug === post.slug));

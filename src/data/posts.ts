import csdnPosts from './csdn-posts.json';

type MarkdownContent = (props: Record<string, unknown>) => unknown;

interface MarkdownModule {
  Content: MarkdownContent;
  frontmatter: {
    title: string;
    date: string;
    category?: string;
    tags?: string[];
    excerpt?: string;
    readTime?: string;
    author?: string;
    draft?: boolean;
  };
}

export interface PostTocItem {
  id: string;
  text: string;
  level: 'h2' | 'h3';
}

export interface PostBase {
  slug: string;
  author: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  readTime: string;
  imageCount: number;
  toc: PostTocItem[];
}

export interface CsdnPost extends PostBase {
  source: 'csdn';
  csdnId: string;
  sourceUrl: string;
  content: string;
}

export interface NativePost extends PostBase {
  source: 'native';
  draft: boolean;
  Content: MarkdownContent;
}

export type Post = CsdnPost | NativePost;

const titleOverrides: Record<string, string> = {
  '144636126': '从零完善 Flask 博客：模板与页面',
  '144635405': '从零开发 Flask 博客：项目搭建',
  '144917800': 'Python 入门：数据分析与可视化进阶',
  '144917774': 'Python 入门：数据分析与可视化基础',
  '144917700': 'Python 入门：多线程与异步编程',
  '144893261': 'Python 入门：迭代器与生成器',
  '144893005': 'Python 入门：模块与包',
  '144892815': 'Python 入门：异常处理与文件操作',
  '144832575': 'Python 入门：数据结构与算法基础',
  '144832510': 'Python 入门：面向对象编程基础',
  '144832388': 'Python 入门：控制结构与函数',
  '144832209': '认识 Python：特点、应用与学习路径',
  '144596062': 'Python 实用技巧：写出更简洁的代码',
  '144593537': 'Qt 实战：桌面心情笔记应用',
};

const excerptOverrides: Record<string, string> = {
  '144636126': '在 Flask 博客基础上完善模板体系，拆解基础模板、首页、登录、注册和文章页面的结构与样式。',
  '144635405': '从零搭建支持注册、登录与文章发布的 Flask 博客，梳理项目结构、数据模型和表单实现。',
  '145015996': '从《你看起来好像很美味》的故事出发，重新理解爱、陪伴与成长之间温柔而坚定的力量。',
  '145013790': '回顾罗永浩从英语老师到连续创业者的经历，以及争议、理想主义与行动力如何塑造一个人。',
  '144917888': '透过余华的作品观察普通人的命运、苦难与幽默，感受文学穿透现实并安放人心的力量。',
  '144917800': '使用 Pandas、Matplotlib 完成数据探索、清洗、预处理与可视化，并通过案例串起分析流程。',
  '144917774': '认识 Pandas 与 Matplotlib，掌握表格数据处理、基础清洗和常用图表的完整入门方法。',
  '144917700': '理解线程、GIL、协程和事件循环，学会为不同 I/O 场景选择合适的 Python 并发方案。',
  '144893261': '从迭代协议到 yield，理解迭代器与生成器如何用更少内存处理连续数据和大型文件。',
  '144893005': '梳理 Python 模块、包、标准库和依赖管理，建立可复用、可维护的项目组织方式。',
  '144892902': '以《如何阅读一本书》为线索，讨论如何从翻过一本书走向真正理解、判断和吸收。',
  '144892815': '掌握异常捕获、资源管理与文件读写，让 Python 程序在真实场景中运行得更稳定。',
  '144832575': '系统认识列表、字典、栈、队列、链表以及基础排序查找算法，建立数据结构选择意识。',
  '144832510': '通过类、对象、封装、继承和多态，理解 Python 面向对象编程的核心思想与实践方式。',
  '144832388': '从条件判断、循环和函数出发，掌握 Python 程序流程控制以及变量作用域的关键概念。',
  '144832847': '整理巴菲特关于风险、长期主义与能力圈的思考，并尝试把投资智慧迁移到日常决策中。',
  '144832209': '认识 Python 的历史、语言特点、典型应用领域，以及适合初学者的学习路线。',
  '144596062': '整理一组实用的 Python 写法，在保持可读性的前提下减少重复代码并提升开发效率。',
  '144593537': '使用 Qt 与 SQLite 实现桌面笔记应用，涵盖界面布局、笔记管理、搜索与数据持久化。',
};

const decodeEntities = (value: string) => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)));

const plainText = (value: string) => decodeEntities(value)
  .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
  .replace(/<code[\s\S]*?<\/code>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const cleanExcerpt = (value: string) => plainText(value)
  .replace(/^文章浏览阅读[\d.,万w+kK次]+(?:，点赞\d+次，收藏\d+次)?。?/u, '')
  .replace(/^本文(?:介绍|讲解|主要).*?[。；]\s*/u, '')
  .slice(0, 110)
  .trim();

const enhanceLegacyContent = (raw: string, title: string) => {
  let content = raw
    .replace(/<(script|style|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<div[^>]*class=["'][^"']*(?:toc|article-catalog)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<p[^>]*>\s*(?:&nbsp;|<br\s*\/?\s*>|\s)*<\/p>/gi, '')
    .replace(/<p[^>]*>\s*\d{1,4}\s*<\/p>/gi, '')
    .replace(/<a[^>]*>\s*<\/a>/gi, '')
    .replace(/<i[^>]*>\s*<\/i>/gi, '');

  const headingMatches = [...content.matchAll(/<h([2-5])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const minimumLevel = headingMatches.length
    ? Math.min(...headingMatches.map((match) => Number(match[1])))
    : 2;
  const toc: PostTocItem[] = [];
  let headingIndex = 0;

  content = content.replace(/<h([2-5])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, rawLevel: string, rawHeading: string) => {
    const text = plainText(rawHeading).replace(/^\d+(?:\.\d+)*[、.\s]+/, '').trim();
    if (!text || text === title) return '';
    headingIndex += 1;
    const level: 'h2' | 'h3' = Number(rawLevel) <= minimumLevel ? 'h2' : 'h3';
    const id = `section-${headingIndex}`;
    toc.push({ id, text, level });
    return `<${level} id="${id}">${text}</${level}>`;
  });

  content = content.replace(/<img\b([^>]*)>/gi, (_, attributes: string) => {
    const src = attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src) return '';
    const alt = attributes.match(/\balt=["']([^"']*)["']/i)?.[1] || `${title} 配图`;
    return `<img src="${src}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy" decoding="async">`;
  });

  return { content, toc };
};

const markdownModules = import.meta.glob<MarkdownModule>('../content/posts/*.md', { eager: true });

const authoredPosts: NativePost[] = Object.entries(markdownModules)
  .map(([path, module]) => {
    const slug = path.split('/').pop()?.replace(/\.md$/, '') ?? '';
    const frontmatter = module.frontmatter;
    return {
      source: 'native' as const,
      slug,
      author: frontmatter.author || 'JM_life',
      title: frontmatter.title,
      date: String(frontmatter.date),
      category: frontmatter.category || '成长记录',
      tags: frontmatter.tags || [],
      excerpt: frontmatter.excerpt || '',
      readTime: frontmatter.readTime || '5 分钟',
      imageCount: 0,
      toc: [],
      draft: frontmatter.draft === true,
      Content: module.Content,
    };
  })
  .filter((post) => post.slug && post.title && !post.draft);

const legacyPosts: CsdnPost[] = (csdnPosts as Omit<CsdnPost, 'source'>[]).map((post) => {
  const title = titleOverrides[post.csdnId] || plainText(post.title).replace(/\s*[-—_]\s*CSDN.*$/i, '');
  const enhanced = enhanceLegacyContent(post.content, title);
  return {
    ...post,
    title,
    excerpt: excerptOverrides[post.csdnId] || cleanExcerpt(post.excerpt),
    content: enhanced.content,
    toc: enhanced.toc,
    source: 'csdn',
  };
});

const sortableDate = (date: string) => Date.parse(date.replaceAll('.', '-')) || 0;

export const posts: Post[] = [...authoredPosts, ...legacyPosts].sort(
  (left, right) => sortableDate(right.date) - sortableDate(left.date),
);

export const getRelatedPosts = (current: Post, limit = 3) => posts
  .filter((candidate) => candidate.slug !== current.slug)
  .map((candidate) => {
    const sharedTags = candidate.tags.filter((tag) => current.tags.includes(tag)).length;
    const score = (candidate.category === current.category ? 6 : 0)
      + sharedTags * 2
      + (candidate.source === current.source ? 1 : 0);
    return { candidate, score };
  })
  .sort((left, right) => right.score - left.score || sortableDate(right.candidate.date) - sortableDate(left.candidate.date))
  .slice(0, limit)
  .map(({ candidate }) => candidate);

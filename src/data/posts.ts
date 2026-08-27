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

const legacyPosts: CsdnPost[] = (csdnPosts as Omit<CsdnPost, 'source'>[]).map((post) => ({
  ...post,
  source: 'csdn',
}));

const sortableDate = (date: string) => Date.parse(date.replaceAll('.', '-')) || 0;

export const posts: Post[] = [...authoredPosts, ...legacyPosts].sort(
  (left, right) => sortableDate(right.date) - sortableDate(left.date),
);

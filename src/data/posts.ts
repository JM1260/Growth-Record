import csdnPosts from './csdn-posts.json';

export interface PostTocItem {
  id: string;
  text: string;
  level: 'h2' | 'h3';
}

export interface Post {
  slug: string;
  csdnId: string;
  sourceUrl: string;
  author: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  readTime: string;
  imageCount: number;
  toc: PostTocItem[];
  content: string;
}

export const posts = csdnPosts as Post[];


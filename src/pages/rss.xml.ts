import { posts } from '../data/posts';

const escapeXml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export const GET = ({ site }: { site: URL }) => {
  const baseUrl = new URL(import.meta.env.BASE_URL, site);
  const items = posts.map((post) => {
    const link = new URL(`posts/${post.slug}/`, baseUrl).href;
    return `<item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(post.date.replaceAll('.', '-')).toUTCString()}</pubDate>
      <category>${escapeXml(post.category)}</category>
      <description>${escapeXml(post.excerpt)}</description>
    </item>`;
  }).join('\n');

  return new Response(`<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>向光生长</title>
    <link>${baseUrl.href}</link>
    <description>记录学习、创造与生活的长期成长路线。</description>
    <language>zh-CN</language>
    ${items}
  </channel>
</rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};

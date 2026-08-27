import { posts } from '../data/posts';

export const GET = ({ site }: { site: URL }) => {
  const baseUrl = new URL(import.meta.env.BASE_URL, site);
  const routes = ['', 'roadmap/', 'series/', 'posts/', 'about/', ...posts.map((post) => `posts/${post.slug}/`)];
  const urls = routes.map((route) => `<url><loc>${new URL(route, baseUrl).href}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

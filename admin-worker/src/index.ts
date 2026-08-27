interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  ALLOWED_ORIGIN: string;
  SITE_URL: string;
}

interface Session {
  login: string;
  githubToken: string;
  exp: number;
  kind: 'session';
}

interface AuthState {
  returnTo: string;
  exp: number;
  kind: 'state';
}

interface PostInput {
  originalSlug?: string;
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  readTime: string;
  content: string;
  draft: boolean;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const OWNER_LOGIN = 'jm1260';
const POST_DIRECTORY = 'src/content/posts';
const MAX_POST_BYTES = 600_000;
const MAX_IMAGE_BYTES = 5_000_000;

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

const base64UrlEncode = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const deriveKey = async (secret: string) => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};

const seal = async (payload: Session | AuthState, secret: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(payload)));
  return `${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(encrypted))}`;
};

const unseal = async <T extends Session | AuthState>(token: string, secret: string): Promise<T> => {
  const [ivPart, dataPart] = token.split('.');
  if (!ivPart || !dataPart) throw new Error('Invalid token');
  const key = await deriveKey(secret);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64UrlDecode(ivPart) }, key, base64UrlDecode(dataPart));
  const payload = JSON.parse(decoder.decode(decrypted)) as T;
  if (!payload.exp || payload.exp < Date.now()) throw new Error('Expired token');
  return payload;
};

const corsHeaders = (request: Request, env: Env) => {
  const origin = request.headers.get('origin') || '';
  const allowed = origin === env.ALLOWED_ORIGIN || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
  return {
    'access-control-allow-origin': allowed ? origin : env.ALLOWED_ORIGIN,
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
};

const safeReturnTo = (value: string | null, env: Env) => {
  const fallback = `${env.SITE_URL}/admin/`;
  if (!value) return fallback;
  try {
    const url = new URL(value);
    const production = new URL(env.SITE_URL);
    const local = /^(127\.0\.0\.1|localhost)$/.test(url.hostname)
      && url.protocol === 'http:'
      && (url.pathname === '/Growth-Record/admin/' || url.pathname === '/admin/');
    if ((url.origin === production.origin && url.pathname === `${production.pathname}/admin/`) || local) return url.toString();
  } catch { /* use fallback */ }
  return fallback;
};

const requireSession = async (request: Request, env: Env) => {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) throw new Response('Unauthorized', { status: 401 });
  try {
    const session = await unseal<Session>(authorization.slice(7), env.SESSION_SECRET);
    if (session.kind !== 'session' || session.login.toLowerCase() !== OWNER_LOGIN) throw new Error('Unauthorized');
    return session;
  } catch {
    throw new Response('Unauthorized', { status: 401 });
  }
};

const github = async <T>(session: Session, _env: Env, path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${session.githubToken}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'growth-record-admin',
      ...init.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(detail.message || `GitHub request failed (${response.status})`);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
};

const repoPath = (env: Env, path: string) => `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
const encodeUtf8 = (value: string) => {
  const bytes = encoder.encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const decodeUtf8 = (value: string) => {
  const binary = atob(value.replace(/\n/g, ''));
  return decoder.decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
};

const validSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 100;
const yamlValue = (value: unknown) => JSON.stringify(value ?? '');
const serializePost = (post: PostInput) => `---
title: ${yamlValue(post.title)}
date: ${yamlValue(post.date)}
category: ${yamlValue(post.category || '成长记录')}
tags: ${yamlValue(post.tags || [])}
excerpt: ${yamlValue(post.excerpt || '')}
readTime: ${yamlValue(post.readTime || '5 分钟')}
author: "JM_life"
draft: ${post.draft === true}
---

${post.content.trim()}\n`;

const parseFrontmatter = (source: string, slug: string): Record<string, unknown> & { source: string; slug: string; content: string; date?: unknown } => {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`Invalid frontmatter in ${slug}`);
  const data: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
  }
  return { source: 'native', slug, ...data, content: match[2] };
};

const getFile = async (session: Session, env: Env, path: string) => {
  return github<{ sha: string; content: string }>(session, env, `${repoPath(env, path)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`);
};

const putFile = async (session: Session, env: Env, path: string, content: string, message: string, sha?: string) => {
  return github(session, env, repoPath(env, path), {
    method: 'PUT',
    body: JSON.stringify({ message, content, branch: env.GITHUB_BRANCH, ...(sha ? { sha } : {}) }),
  });
};

const listPosts = async (session: Session, env: Env) => {
  let files: Array<{ name: string; path: string; type: string }> = [];
  try {
    files = await github(session, env, `${repoPath(env, POST_DIRECTORY)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`);
  } catch (error) {
    if (error instanceof Error && error.message === 'Not Found') return [];
    throw error;
  }
  const markdown = files.filter((file) => file.type === 'file' && file.name.endsWith('.md'));
  const posts = await Promise.all(markdown.map(async (file) => {
    const data = await getFile(session, env, file.path);
    return parseFrontmatter(decodeUtf8(data.content), file.name.replace(/\.md$/, ''));
  }));
  return posts.sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
};

const validatePost = (value: unknown): PostInput => {
  if (!value || typeof value !== 'object') throw new Error('文章数据无效');
  const input = value as Partial<PostInput>;
  if (!input.title?.trim() || input.title.length > 160) throw new Error('标题不能为空且不能超过 160 个字符');
  if (!input.slug || !validSlug(input.slug)) throw new Error('文章地址只能使用小写字母、数字和连字符');
  if (input.originalSlug && !validSlug(input.originalSlug)) throw new Error('原文章地址无效');
  if (!input.content?.trim()) throw new Error('正文不能为空');
  if (encoder.encode(input.content).byteLength > MAX_POST_BYTES) throw new Error('正文内容过大');
  return {
    originalSlug: input.originalSlug,
    slug: input.slug,
    title: input.title.trim(),
    date: String(input.date || new Date().toISOString().slice(0, 10)).replaceAll('-', '.'),
    category: String(input.category || '成长记录').slice(0, 40),
    tags: Array.isArray(input.tags) ? input.tags.map(String).map((tag) => tag.slice(0, 30)).slice(0, 12) : [],
    excerpt: String(input.excerpt || '').slice(0, 320),
    readTime: String(input.readTime || '5 分钟').slice(0, 30),
    content: input.content,
    draft: input.draft === true,
  };
};

const route = async (request: Request, env: Env) => {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/api/auth/start') {
    const returnTo = safeReturnTo(url.searchParams.get('return_to'), env);
    const state = await seal({ kind: 'state', returnTo, exp: Date.now() + 10 * 60_000 }, env.SESSION_SECRET);
    const callback = `${url.origin}/api/auth/callback`;
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    authorize.searchParams.set('redirect_uri', callback);
    authorize.searchParams.set('state', state);
    return Response.redirect(authorize.toString(), 302);
  }

  if (request.method === 'GET' && url.pathname === '/api/auth/callback') {
    const stateToken = url.searchParams.get('state') || '';
    let state: AuthState;
    try { state = await unseal<AuthState>(stateToken, env.SESSION_SECRET); } catch { return new Response('Invalid or expired authorization state', { status: 400 }); }
    const destination = new URL(state.returnTo);
    const oauthError = url.searchParams.get('error');
    if (oauthError) { destination.hash = `error=${encodeURIComponent('GitHub 登录已取消')}`; return Response.redirect(destination.toString(), 302); }
    const code = url.searchParams.get('code');
    if (!code) return new Response('Missing authorization code', { status: 400 });
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': 'growth-record-admin' },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${url.origin}/api/auth/callback` }),
    });
    const tokenData = await tokenResponse.json() as { access_token?: string; error_description?: string };
    if (!tokenData.access_token) { destination.hash = `error=${encodeURIComponent(tokenData.error_description || 'GitHub 登录失败')}`; return Response.redirect(destination.toString(), 302); }
    const userResponse = await fetch('https://api.github.com/user', { headers: { authorization: `Bearer ${tokenData.access_token}`, accept: 'application/vnd.github+json', 'user-agent': 'growth-record-admin' } });
    const user = await userResponse.json() as { login?: string };
    if (user.login?.toLowerCase() !== OWNER_LOGIN) { destination.hash = `error=${encodeURIComponent('此账号没有后台权限')}`; return Response.redirect(destination.toString(), 302); }
    const session = await seal({ kind: 'session', login: user.login, githubToken: tokenData.access_token, exp: Date.now() + 8 * 60 * 60_000 }, env.SESSION_SECRET);
    destination.hash = `session=${encodeURIComponent(session)}`;
    return Response.redirect(destination.toString(), 302);
  }

  const session = await requireSession(request, env);

  if (request.method === 'GET' && url.pathname === '/api/posts') {
    return json({ user: { login: session.login }, posts: await listPosts(session, env) });
  }

  const postMatch = url.pathname.match(/^\/api\/posts\/([a-z0-9-]+)$/);
  if (request.method === 'GET' && postMatch) {
    const slug = postMatch[1];
    const file = await getFile(session, env, `${POST_DIRECTORY}/${slug}.md`);
    return json({ post: parseFrontmatter(decodeUtf8(file.content), slug) });
  }

  if (request.method === 'POST' && url.pathname === '/api/posts/save') {
    const post = validatePost(await request.json());
    const path = `${POST_DIRECTORY}/${post.slug}.md`;
    let sha: string | undefined;
    try { sha = (await getFile(session, env, path)).sha; } catch (error) { if (!(error instanceof Error && error.message === 'Not Found')) throw error; }
    await putFile(session, env, path, encodeUtf8(serializePost(post)), `${post.draft ? 'Save draft' : 'Publish'}: ${post.title}`, sha);
    if (post.originalSlug && post.originalSlug !== post.slug) {
      const oldPath = `${POST_DIRECTORY}/${post.originalSlug}.md`;
      try {
        const oldFile = await getFile(session, env, oldPath);
        await github(session, env, repoPath(env, oldPath), { method: 'DELETE', body: JSON.stringify({ message: `Rename post: ${post.originalSlug} to ${post.slug}`, sha: oldFile.sha, branch: env.GITHUB_BRANCH }) });
      } catch (error) { if (!(error instanceof Error && error.message === 'Not Found')) throw error; }
    }
    return json({ ok: true, url: `${env.SITE_URL}/posts/${post.slug}/` });
  }

  if (request.method === 'POST' && url.pathname === '/api/uploads') {
    const input = await request.json() as { slug?: string; name?: string; data?: string };
    if (!input.slug || !validSlug(input.slug)) throw new Error('请先填写有效的文章地址');
    const match = input.data?.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw new Error('仅支持 PNG、JPG、WebP 或 GIF 图片');
    const binarySize = Math.floor(match[2].length * 0.75);
    if (binarySize > MAX_IMAGE_BYTES) throw new Error('单张图片不能超过 5 MB');
    const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1];
    const stem = (input.name || 'image').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'image';
    const filename = `${Date.now()}-${stem}.${extension}`;
    const path = `public/uploads/${input.slug}/${filename}`;
    await putFile(session, env, path, match[2], `Upload image for ${input.slug}`);
    return json({ ok: true, url: `${new URL(env.SITE_URL).pathname}/uploads/${input.slug}/${filename}` });
  }

  return json({ error: 'Not found' }, 404);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const response = await route(request, env);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      headers.set('x-content-type-options', 'nosniff');
      headers.set('referrer-policy', 'no-referrer');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      if (error instanceof Response) return json({ error: error.status === 401 ? '登录已过期，请重新登录' : '请求失败' }, error.status, cors);
      const message = error instanceof Error ? error.message : '服务器处理失败';
      return json({ error: message }, 400, cors);
    }
  },
};

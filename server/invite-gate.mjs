const COOKIE = '__Host-citely_invite';
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
const securityHeaders = {
  'Cache-Control': 'private, no-store',
  'Vary': 'Cookie',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  // no-referrer makes native POST forms send Origin: null. Keep the origin
  // for our own forms while still withholding referrers from other sites.
  'Referrer-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

function respond(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { ...securityHeaders, ...extra } });
}
function redirect(location, cookie) {
  return respond(null, 303, { Location: location, ...(cookie ? { 'Set-Cookie': cookie } : {}) });
}
const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
function configured(env) {
  return typeof env.INVITE_CODE === 'string' && env.INVITE_CODE.length >= 20 &&
    typeof env.INVITE_SESSION_SECRET === 'string' && env.INVITE_SESSION_SECRET.length >= 32;
}
async function keyFor(env) {
  return crypto.subtle.importKey('raw', encoder.encode(env.INVITE_SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
function hex(bytes) { return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join(''); }
function unhex(s) { return Uint8Array.from(s.match(/../g) ?? [], b => parseInt(b, 16)); }
async function validSession(request, env) {
  const cookie = (request.headers.get('Cookie') ?? '').split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!cookie || !/^\d{10}\.[a-f0-9]{64}$/.test(cookie)) return false;
  const [expires, signature] = cookie.split('.');
  const remaining = Number(expires) - Math.floor(Date.now() / 1000);
  if (remaining <= 0 || remaining > SESSION_SECONDS) return false;
  return crypto.subtle.verify('HMAC', await keyFor(env), unhex(signature), encoder.encode(`session:v1:${expires}:${env.INVITE_CODE}`));
}

const loginCss = `:root{font-family:Inter,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#1a1714;background:#f5f5f5}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:28px}main{width:min(100%,440px);padding:40px;background:#fff;border:1px solid #dbdbdb;border-radius:16px;box-shadow:0 20px 60px #00000008}.top{display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:16px}.brand img{object-fit:contain}.language{display:flex;align-items:center;gap:6px;font-size:12px;color:#8a8278}.language a{color:#8a8278;text-decoration:none;padding:5px}.language a[aria-current]{color:#1a1714;font-weight:700}.eyebrow{font-size:12px;letter-spacing:2px;color:#8b1f30;margin:42px 0 14px}h1{font-size:29px;letter-spacing:-1px;margin:0 0 14px}p{color:#6f685c;font-size:15px;line-height:1.8}label{display:block;font-size:14px;margin:28px 0 10px}input,button{font:inherit;width:100%;min-height:48px;border-radius:7px}input{border:1px solid #b8b3ac;padding:12px;background:#fff;color:#1a1714}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #d29ba2;outline-offset:3px}button{margin-top:16px;border:0;background:#1a1714;color:#fff;cursor:pointer}button:hover{background:#8b1f30}.error{color:#8b1f30;background:#f8f1f2;border-radius:6px;padding:10px 12px;font-size:14px}.foot{font-size:12px;margin:22px 0 0;color:#6f685c}@media(max-width:480px){body{padding:18px}main{padding:28px}}`;

function loginPage(error = false, language = 'zh') {
  const en = language === 'en';
  const copy = en ? { title: 'Invited access', heading: 'Welcome to the Citely deal room', intro: 'Enter the invitation code you received to view the interactive WebMCP case study.', error: 'That invitation code is not valid. Check it and try again, or ask the person who invited you for the latest code.', label: 'Invitation code', placeholder: 'Enter invitation code', submit: 'Enter case room →', foot: 'No invitation code? Contact the person who shared this page with you.' } : { title: '受邀访问', heading: '欢迎来到 Citely 案例室', intro: '输入你收到的邀请码，查看 WebMCP 交互案例。', error: '邀请码无效，请检查后重试，或向邀请人获取最新邀请码。', label: '邀请码', placeholder: '请输入邀请码', submit: '进入案例室 →', foot: '没有邀请码？请联系向你分享此页面的人。' };
  const suffix = en ? '?lang=en' : '';
  return `<!doctype html><html lang="${en ? 'en' : 'zh-CN'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${copy.title} · Citely</title><link rel="icon" href="/brand/citely-mark.png"><link rel="stylesheet" href="/invite.css"></head><body><main><div class="top"><div class="brand"><img src="/brand/citely-mark.png" width="24" height="24" alt="">Citely</div><nav class="language" aria-label="${en ? 'Language' : '语言'}"><a href="/invite"${en ? '' : ' aria-current="page"'}>中</a><span>/</span><a href="/invite?lang=en"${en ? ' aria-current="page"' : ''}>EN</a></nav></div><p class="eyebrow">PRIVATE CASE STUDY</p><h1>${copy.heading}</h1><p>${copy.intro}</p>${error ? `<p class="error" role="alert">${copy.error}</p>` : ''}<form action="/invite${suffix}" method="post"><input type="hidden" name="lang" value="${language}"><label for="code">${copy.label}</label><input id="code" name="code" type="password" required maxlength="128" autocomplete="current-password" autocapitalize="none" spellcheck="false" placeholder="${copy.placeholder}"${error ? ' aria-invalid="true"' : ''}><button type="submit">${copy.submit}</button></form><p class="foot">${copy.foot}</p></main></body></html>`;
}

async function readCode(request) {
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/x-www-form-urlencoded')) return null;
  if (Number(request.headers.get('Content-Length')) > 1024) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1024) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const params = new URLSearchParams(new TextDecoder().decode(bytes));
  if (params.getAll('code').length !== 1) return null;
  const code = params.get('code').trim();
  return code.length <= 128 ? code : null;
}

function assetResponse(request, asset) {
  const data = request.method === 'HEAD' ? null : Uint8Array.from(atob(asset.body), c => c.charCodeAt(0));
  return respond(data, 200, { 'Content-Type': asset.type });
}

export async function handleRequest(request, env, assets) {
  const url = new URL(request.url);
  const language = url.searchParams.get('lang') === 'en' ? 'en' : 'zh';
  const suffix = language === 'en' ? '?lang=en' : '';
  const readOnly = request.method === 'GET' || request.method === 'HEAD';
  if (readOnly && url.pathname === '/brand/citely-mark.png' && assets[url.pathname]) return assetResponse(request, assets[url.pathname]);
  if (readOnly && url.pathname === '/invite.css') return respond(request.method === 'HEAD' ? null : loginCss, 200, { 'Content-Type': 'text/css; charset=utf-8' });
  if (!configured(env)) return respond('访问功能暂未配置，请联系站点管理员。', 503, { 'Content-Type': 'text/plain; charset=utf-8' });
  if (!readOnly && request.headers.get('Origin') !== url.origin) return respond('Forbidden', 403);
  if (url.pathname === '/invite/logout' && request.method === 'POST') return redirect(`/invite${suffix}`, clearCookie);
  if (url.pathname === '/invite' && request.method === 'POST') {
    const code = await readCode(request);
    if (code === null) return respond('Invalid request', 400);
    const key = await keyFor(env);
    const expected = await crypto.subtle.sign('HMAC', key, encoder.encode(`invite:${env.INVITE_CODE}`));
    if (!(await crypto.subtle.verify('HMAC', key, expected, encoder.encode(`invite:${code}`)))) {
      return respond(loginPage(true, language), 401, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': clearCookie });
    }
    const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    const signature = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`session:v1:${expires}:${env.INVITE_CODE}`)));
    return redirect(`/case-study/${suffix}`, `${COOKIE}=${expires}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`);
  }
  if (!readOnly) return respond('Method not allowed', 405, { Allow: 'GET, HEAD' });
  const authenticated = await validSession(request, env);
  if (url.pathname === '/invite') {
    return authenticated ? redirect(`/case-study/${suffix}`) : respond(request.method === 'HEAD' ? null : loginPage(false, language), 200, { 'Content-Type': 'text/html; charset=utf-8' });
  }
  if (!authenticated) return redirect(`/invite${suffix}`);
  let assetPath = url.pathname;
  if (assetPath === '/case-study') return redirect('/case-study/');
  if (assetPath.endsWith('/')) assetPath += 'index.html';
  const asset = Object.hasOwn(assets, assetPath) ? assets[assetPath] : null;
  return asset ? assetResponse(request, asset) : respond('Not found', 404);
}

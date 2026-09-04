import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../server/invite-gate.mjs';

const origin = 'https://example.test';
const env = { INVITE_CODE: 'TEST-ONLY-INVITATION-CODE-12345', INVITE_SESSION_SECRET: 'test-only-session-secret-with-at-least-32-characters' };
const assets = Object.fromEntries(['/case-study/index.html', '/index.html', '/assets/demo.js', '/brand/citely-mark.png'].map(path => [path, { type: 'text/plain', body: btoa('protected demo contents') }]));
const request = (path, options) => new Request(origin + path, options);
const post = (code, requestOrigin = origin) => request('/invite', { method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code }) });
const login = async () => (await handleRequest(post(env.INVITE_CODE), env, assets)).headers.get('Set-Cookie').split(';')[0];

test('unauthenticated page and asset URLs never reveal protected contents', async () => {
  for (const path of ['/', '/index.html', '/case-study/', '/case-study/index.html', '/assets/demo.js', '/assets/../case-study/index.html']) {
    const response = await handleRequest(request(path), env, assets);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('Location'), '/invite');
    assert.equal(await response.text(), '');
    assert.match(response.headers.get('Cache-Control'), /no-store/);
  }
});
test('login page contains no secrets or case contents and missing config fails closed', async () => {
  const response = await handleRequest(request('/invite'), env, assets);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Referrer-Policy'), 'same-origin', 'native POST forms must retain their Origin');
  assert.ok(html.includes('邀请码'));
  assert.ok(!html.includes(env.INVITE_CODE) && !html.includes(env.INVITE_SESSION_SECRET));
  assert.equal((await handleRequest(request('/'), {}, assets)).status, 503);
});
test('wrong codes, cross-origin forms and oversized submissions are rejected', async () => {
  assert.equal((await handleRequest(post('incorrect'), env, assets)).status, 401);
  assert.equal((await handleRequest(post(env.INVITE_CODE, 'https://attacker.test'), env, assets)).status, 403);
  assert.equal((await handleRequest(post(env.INVITE_CODE, 'null'), env, assets)).status, 403);
  assert.equal((await handleRequest(post('x'.repeat(1100)), env, assets)).status, 400);
});
test('correct code grants secure cookie access to pages and assets', async () => {
  const response = await handleRequest(post(env.INVITE_CODE), env, assets);
  assert.equal(response.status, 303);
  const header = response.headers.get('Set-Cookie');
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=28800']) assert.ok(header.includes(flag));
  for (const path of ['/case-study/', '/assets/demo.js', '/']) {
    const page = await handleRequest(request(path, { headers: { Cookie: header.split(';')[0] } }), env, assets);
    assert.equal(page.status, 200);
    assert.equal(await page.text(), 'protected demo contents');
    assert.match(page.headers.get('Cache-Control'), /no-store/);
  }
});
test('forged, expired, and old-code sessions cannot unlock the site', async () => {
  const cookie = await login();
  const forged = cookie.slice(0, -1) + (cookie.endsWith('a') ? 'b' : 'a');
  for (const value of [forged, '__Host-citely_invite=1.' + 'a'.repeat(64)]) {
    assert.equal((await handleRequest(request('/', { headers: { Cookie: value } }), env, assets)).status, 303);
  }
  const rotated = { ...env, INVITE_CODE: 'NEW-TEST-ONLY-INVITATION-CODE-67890' };
  assert.equal((await handleRequest(request('/', { headers: { Cookie: cookie } }), rotated, assets)).status, 303);
  const previousNow = Date.now;
  try {
    Date.now = () => previousNow() + 9 * 60 * 60 * 1000;
    assert.equal((await handleRequest(request('/', { headers: { Cookie: cookie } }), env, assets)).status, 303);
  } finally { Date.now = previousNow; }
});
test('logout expires the cookie and HEAD does not expose a body', async () => {
  const response = await handleRequest(request('/invite/logout', { method: 'POST', headers: { Origin: origin } }), env, assets);
  assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
  const head = await handleRequest(request('/case-study/', { method: 'HEAD', headers: { Cookie: await login() } }), env, assets);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

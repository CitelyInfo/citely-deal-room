import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import worker from '../dist/server/index.js';

// Exercise the artifact that Sites deploys, including the embedded real assets.
// A static output directory would allow a hosting layer to bypass the gate.
assert.deepEqual((await readdir('dist')).sort(), ['server']);
const origin = 'https://build-check.test';
const env = {
  INVITE_CODE: 'BUILD-TEST-ONLY-INVITE-12345678',
  INVITE_SESSION_SECRET: 'build-test-only-session-secret-at-least-32-characters',
};
const request = (path, options) => new Request(origin + path, options);
for (const path of ['/', '/case-study/']) {
  const response = await worker.fetch(request(path), env);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), '/invite');
}
const login = await worker.fetch(request('/invite', {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ code: env.INVITE_CODE }),
}), env);
assert.equal(login.status, 303);
const cookie = login.headers.get('Set-Cookie').split(';')[0];
for (const path of ['/', '/case-study/']) {
  const response = await worker.fetch(request(path, { headers: { Cookie: cookie } }), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Security-Policy'), /default-src 'self'/);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  const html = await response.text();
  assert.match(html, /Content-Security-Policy/);
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)];
  assert.ok(scripts.length > 0, `${path} must reference its built entry script`);
  for (const [, asset] of scripts) {
    assert.ok(asset.startsWith('/assets/'));
    const blocked = await worker.fetch(request(asset), env);
    assert.equal(blocked.status, 303, `${asset} must require an invitation`);
    const allowed = await worker.fetch(request(asset, { headers: { Cookie: cookie } }), env);
    assert.equal(allowed.status, 200);
    assert.match(allowed.headers.get('Content-Type'), /javascript/);
    assert.ok((await allowed.text()).length > 0);
  }
}
console.log('Protected Worker build, embedded pages/assets, and CSP verified.');

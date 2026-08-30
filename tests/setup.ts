// Node >=25 ships an experimental global `localStorage`/`sessionStorage` that shadows jsdom's
// real implementation: vitest's jsdom environment only installs a `window` key onto globalThis
// when that key isn't already present there, so Node's (non-functional, without
// --localstorage-file) getters win and every localStorage call throws. Detect that case and
// install a real jsdom Storage implementation in its place.
import { JSDOM } from 'jsdom';

function needsFix(): boolean {
  try {
    globalThis.localStorage.setItem('__probe', '1');
    globalThis.localStorage.removeItem('__probe');
    return false;
  } catch {
    return true;
  }
}

if (typeof window !== 'undefined' && needsFix()) {
  // Intentionally never closed: dom.window.close() would tear down the Storage objects we just
  // installed onto globalThis, so this JSDOM instance is kept alive for the life of the process.
  const dom = new JSDOM('', { url: 'http://localhost/' });
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
  }
}

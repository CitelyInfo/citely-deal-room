import { el } from './dom';

export function downloadText(filename: string, text: string, mime = 'text/markdown'): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = el('a', { href: url, download: filename }) as HTMLAnchorElement;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

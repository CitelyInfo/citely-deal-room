export function el(tag: string, attrs: Record<string, string> = {}, ...children: (Node | string | null | undefined)[]): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}
export function clear(node: HTMLElement): void { while (node.firstChild) node.removeChild(node.firstChild); }
export function clip(s: string, max: number): string { return s.length > max ? s.slice(0, max - 1) + '…' : s; }
export function fmtTime(iso: string): string { return iso.replace('T', ' ').replace(/\.\d+Z$/, 'Z'); }
export function btnEl(label: string, cls: string, on: () => void): HTMLElement {
  const b = el('button', { type: 'button', class: `btn ${cls}` }, label);
  b.addEventListener('click', on);
  return b;
}

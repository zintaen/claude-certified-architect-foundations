export const $ = (sel: string, root: ParentNode = document): HTMLElement | null =>
  root.querySelector(sel);

export const $$ = (sel: string, root: ParentNode = document): HTMLElement[] =>
  Array.from(root.querySelectorAll(sel));

export const esc = (s: string | null | undefined): string =>
  String(s || '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );

export function richText(s: string | null | undefined): string {
  if (s == null) return '';
  const escaped = esc(s);
  return escaped.replace(/`([^`\n]+?)`/g, '<code class="mark">$1</code>');
}

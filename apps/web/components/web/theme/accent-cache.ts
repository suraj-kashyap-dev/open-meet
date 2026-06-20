import { buildAccentCss } from './accent-css';

const ACCENT_CHOICE_KEY = 'open-meet:accent-choice';
const ACCENT_CSS_KEY = 'open-meet:accent-css';
const ACCENT_STYLE_ID = 'open-meet-accent-cache';

export function readCachedAccentChoice(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(ACCENT_CHOICE_KEY);
  } catch {
    return null;
  }
}

export function writeCachedAccentChoice(choice: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(ACCENT_CHOICE_KEY, choice);

    window.localStorage.setItem(ACCENT_CSS_KEY, buildAccentCss(choice));
  } catch {}
}

export function clearCachedAccentChoice(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(ACCENT_CHOICE_KEY);

    window.localStorage.removeItem(ACCENT_CSS_KEY);
  } catch {}
}

export function buildAccentBootstrapScript(): string {
  return `(()=>{try{var css=window.localStorage.getItem('${ACCENT_CSS_KEY}');if(!css)return;var existing=document.getElementById('${ACCENT_STYLE_ID}');if(existing){existing.textContent=css;return;}var style=document.createElement('style');style.id='${ACCENT_STYLE_ID}';style.textContent=css;document.head.appendChild(style);}catch{}})();`;
}

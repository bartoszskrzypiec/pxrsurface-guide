/* Language switch (EN / PL).
 *
 * Both languages are present in the HTML as sibling elements marked lang="en"
 * and lang="pl". Two CSS rules hide the inactive one, so the correct language
 * is already on screen before this file runs, and stays correct if it never
 * runs at all. All this script does is flip one attribute on <html>.
 */

const STORE_KEY = 'rmg-lang';
const SUPPORTED = ['en', 'pl'];
const root = document.documentElement;

function readStored() {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch (e) {
    // Private mode / blocked site data. Not worth failing over.
    return null;
  }
}

function writeStored(lang) {
  try {
    localStorage.setItem(STORE_KEY, lang);
  } catch (e) {
    /* ignore */
  }
}

function pickInitial() {
  const fromQuery = new URLSearchParams(location.search).get('lang');
  if (SUPPORTED.includes(fromQuery)) return fromQuery;

  const stored = readStored();
  if (SUPPORTED.includes(stored)) return stored;

  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('pl')) return 'pl';

  return 'en';
}

function apply(lang, { persist = true } = {}) {
  if (!SUPPORTED.includes(lang)) lang = 'en';

  root.dataset.lang = lang;
  root.lang = lang;

  // Swap the tab title if the page supplied a translation.
  const titleEl = document.querySelector('title');
  if (titleEl) {
    if (!titleEl.dataset.titleEn) titleEl.dataset.titleEn = titleEl.textContent;
    const alt = lang === 'pl' ? titleEl.dataset.titlePl : titleEl.dataset.titleEn;
    if (alt) titleEl.textContent = alt;
  }

  document.querySelectorAll('[data-set-lang]').forEach((btn) => {
    const active = btn.dataset.setLang === lang;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  if (persist) writeStored(lang);

  // Canvas widgets draw their own labels, so they need telling.
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

/** Current language, for widgets that draw text into a canvas. */
export function currentLang() {
  return root.dataset.lang === 'pl' ? 'pl' : 'en';
}

/** Pick from a { en, pl } string table. */
export function t(table) {
  return table[currentLang()] ?? table.en ?? '';
}

// The switch is display:none until this class lands, so it is never inert.
root.classList.add('js');

/* Only take over the document language on pages that actually ship both
   languages. The English-only guides also load viz.js (and so this module)
   for their widgets, and they must keep declaring lang="en" — otherwise a
   reader with a Polish browser, or anyone who picked PL on a bilingual page,
   would get English prose announced as Polish. */
if (document.querySelector('[data-set-lang]')) {
  apply(pickInitial(), { persist: false });
}

document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-set-lang]');
  if (btn) apply(btn.dataset.setLang);
});

/**
 * i18n (Internationalization) Utility
 * 
 * Provides static JSON dictionary-based translations for 15 languages.
 * Works on both SSR server renders and client-side script updates.
 * 
 * Supported languages: en, zh, es, hi, ar, fr, bn, pt, ru, ur, id, de, ja, sw, mr
 * RTL languages: ar, ur
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
] as const;

export type LangCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const RTL_LANGUAGES: LangCode[] = ['ar', 'ur'];

export const DEFAULT_LANG: LangCode = 'en';

// In-memory dictionary cache (SSR-side)
const dictCache = new Map<string, Record<string, string>>();

/**
 * Load a dictionary from /public/locales/{lang}.json
 * Works on both server (via fetch) and client (via fetch).
 */
export async function loadDictionary(lang: LangCode): Promise<Record<string, string>> {
  if (dictCache.has(lang)) {
    return dictCache.get(lang)!;
  }

  try {
    // On the server side, we read from the filesystem via a relative URL
    // On the client side, we fetch from the public directory
    const url = `/locales/${lang}.json`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Failed to load locale ${lang}, falling back to en`);
      if (lang !== 'en') return loadDictionary('en');
      return {};
    }
    const dict = await res.json();
    dictCache.set(lang, dict);
    return dict;
  } catch (e) {
    console.warn(`Error loading locale ${lang}:`, e);
    if (lang !== 'en') return loadDictionary('en');
    return {};
  }
}

/**
 * Get a translation string by key, with optional interpolation.
 * @param dict - The loaded dictionary object
 * @param key - The translation key (e.g. 'load_more')
 * @param params - Optional interpolation params (e.g. { seconds: 5 })
 */
export function t(dict: Record<string, string>, key: string, params?: Record<string, string | number>): string {
  let value = dict[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
}

/**
 * Detect the preferred language from cookies, localStorage, or Accept-Language header.
 * Priority: cookie > localStorage > Accept-Language > default
 */
export function detectLanguage(request?: Request): LangCode {
  const validCodes = SUPPORTED_LANGUAGES.map(l => l.code);

  // 1. Check cookie
  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/preferred_lang=([a-z]{2})/);
    if (match && validCodes.includes(match[1] as LangCode)) {
      return match[1] as LangCode;
    }
  }

  // 2. Check Accept-Language header
  if (request) {
    const acceptLang = request.headers.get('accept-language') || '';
    const preferred = acceptLang
      .split(',')
      .map(part => part.trim().split(';')[0].substring(0, 2).toLowerCase())
      .find(code => validCodes.includes(code as LangCode));
    if (preferred) {
      return preferred as LangCode;
    }
  }

  return DEFAULT_LANG;
}

/**
 * Check if a language code is RTL
 */
export function isRTL(lang: LangCode): boolean {
  return RTL_LANGUAGES.includes(lang);
}

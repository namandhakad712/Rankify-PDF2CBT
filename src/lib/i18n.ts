import { ref } from 'vue'

export type Locale = 'en' | 'hi' | 'hinglish'

const LOCALES: Locale[] = ['en', 'hi', 'hinglish']

function initial(): Locale {
  const saved = localStorage.getItem('rankify-locale') as Locale | null
  return saved && LOCALES.includes(saved) ? saved : 'en'
}

export const locale = ref<Locale>(initial())

export function setLocale(l: Locale): void {
  locale.value = l
  localStorage.setItem('rankify-locale', l)
}

type Dict = Partial<Record<string, string>>

const dicts: Record<Locale, Dict> = {
  en: {
    'nav.guide': 'Guide',
    'nav.about': 'About',
    'nav.privacy': 'Privacy',
    'nav.cta': 'Start free'
  },
  hi: {
    'nav.guide': 'गाइड',
    'nav.about': 'हमारे बारे में',
    'nav.privacy': 'प्राइवेसी',
    'nav.cta': 'मुफ़्त शुरू करें'
  },
  hinglish: {
    'nav.guide': 'Guide',
    'nav.about': 'About',
    'nav.privacy': 'Privacy',
    'nav.cta': 'Free mein shuru karo'
  }
}

/** Translate a key in the active locale; falls back to English, then the raw key. */
export function t(key: string): string {
  return dicts[locale.value][key] ?? dicts.en[key] ?? key
}

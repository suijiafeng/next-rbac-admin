import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '@/lib/i18n/locales';

const LANG_KEY = 'goods-lang';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'zh',
    fallbackLng: 'zh',
    interpolation: { escapeValue: false },
  });
}

export function readStoredLanguage(): 'zh' | 'en' {
  if (typeof window === 'undefined') return 'zh';
  return window.localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'zh';
}

export function switchLanguage(lang: 'zh' | 'en') {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANG_KEY, lang);
  }
  return i18n.changeLanguage(lang);
}

export default i18n;

export function resolveInitialLocale(
  savedLocale: string | null,
  navLanguage?: string
): 'en' | 'zh' {
  if (savedLocale === 'en' || savedLocale === 'zh') {
    return savedLocale;
  }
  if (navLanguage && navLanguage.toLowerCase().startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

export function resolveHtmlLang(
  viewMode: 'simple' | 'pro',
  locale: 'en' | 'zh'
): 'en' | 'zh-CN' {
  const activeLocale = viewMode === 'pro' ? 'en' : locale;
  return activeLocale === 'zh' ? 'zh-CN' : 'en';
}

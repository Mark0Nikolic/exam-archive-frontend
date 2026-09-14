import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en, srCyrl, srLatn } from './resources'

export const appLanguages = ['en', 'sr-Latn', 'sr-Cyrl'] as const
export type AppLanguage = (typeof appLanguages)[number]

const storageKey = 'exam-archive-language'

export function toAppLanguage(language?: string): AppLanguage {
  return appLanguages.find((candidate) => language?.toLowerCase() === candidate.toLowerCase()) ?? 'en'
}

function applyLanguage(language: string) {
  const appLanguage = toAppLanguage(language)
  document.documentElement.lang = appLanguage
  document.title = i18n.t('common.brand', { lng: appLanguage })
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', i18n.t('common.metaDescription', { lng: appLanguage }))
  localStorage.setItem(storageKey, appLanguage)
}

const storedLanguage = localStorage.getItem(storageKey)
const initialLanguage = toAppLanguage(storedLanguage ?? undefined)

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'sr-Latn': { translation: srLatn },
    'sr-Cyrl': { translation: srCyrl },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: appLanguages,
  load: 'currentOnly',
  interpolation: {
    escapeValue: false,
  },
})

applyLanguage(initialLanguage)
i18n.on('languageChanged', applyLanguage)

export default i18n

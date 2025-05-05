import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './assets/translations/de.json'
import en from './assets/translations/en.json'
import fr from './assets/translations/fr.json'
import nl from './assets/translations/nl.json'

const defaultLang = 'fr'
const fallbackLang = 'fr'

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      fr: {
        translation: fr,
      },
      nl: {
        translation: nl,
      },
      en: {
        translation: en,
      },
      de: {
        translation: de,
      },
    },
    lng: defaultLang,
    fallbackLng: fallbackLang,
    interpolation: {
      escapeValue: false,
    },
  })
  // eslint-disable-next-line no-console
  .then(() => console.log('i18n initialised'))
  .catch((e) => console.error('Error in i18n initialisation', e))

export default i18n

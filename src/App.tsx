import React, { useMemo, useEffect, Suspense } from 'react'
import { PersistGate } from 'redux-persist/integration/react'
import { Provider } from 'react-redux'
import { ConfigProvider, theme } from 'antd'

import { Router } from './navigation/Router'
import { persistor, store } from './core/store'
import { ANTD_NEW_THEME } from './style/antd/antdTheme'

import { useTranslation } from 'react-i18next'

// Import Ant Design locales
import frFR from 'antd/locale/fr_FR'
import nlNL from 'antd/locale/nl_NL'
import enGB from 'antd/locale/en_GB'
import deDE from 'antd/locale/de_DE'

// Import dayjs and its locale data
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import 'dayjs/locale/nl'
import 'dayjs/locale/en'
import 'dayjs/locale/de'

import localizedFormat from 'dayjs/plugin/localizedFormat'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
dayjs.extend(localizedFormat)
dayjs.extend(isSameOrAfter)

// Mapping from i18n language codes to antd locale objects
const antdLocales: { [key: string]: typeof enGB } = {
  fr: frFR,
  nl: nlNL,
  en: enGB,
  de: deDE,
}

// Mapping for dayjs locales
const dayjsLocales: { [key: string]: string } = {
  fr: 'fr',
  nl: 'nl',
  en: 'en',
  de: 'de',
}

// Inner component to access hooks after i18n is ready
const AppContent: React.FC = () => {
  const { i18n } = useTranslation()
  const currentLangCode = i18n.language.split('-')[0]

  // Determine Ant Design locale
  const antdLocale = useMemo(() => {
    return antdLocales[currentLangCode] || enGB // Fallback
  }, [currentLangCode])

  // Configure dayjs locale
  useEffect(() => {
    const dayjsLocale = dayjsLocales[currentLangCode]
    if (dayjsLocale) {
      dayjs.locale(dayjsLocale)
    } else {
      console.warn(`Dayjs locale not found for language code: ${currentLangCode}. Defaulting to 'en'.`)
      dayjs.locale('en')
    }
  }, [currentLangCode])
  //    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#dc2626' } }} locale={antdLocale}>

  return (
    <ConfigProvider theme={ANTD_NEW_THEME} locale={antdLocale}>
      <Provider store={store}>
        <PersistGate persistor={persistor} loading={<p>Loading Persisted State...</p>}>
          <Router />
        </PersistGate>
      </Provider>
    </ConfigProvider>
  )
}

// Main App component wraps everything in Suspense for i18n
function App() {
  return (
    <>
      {/* Suspense is crucial for i18next loading */}
      <Suspense fallback={<p>Loading Application...</p>}>
        <AppContent />
      </Suspense>
    </>
  )
}

export default App

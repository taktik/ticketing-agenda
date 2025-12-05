import { ConfigProvider } from 'antd'
import deDE from 'antd/locale/de_DE'
import enGB from 'antd/locale/en_GB'
import frFR from 'antd/locale/fr_FR'
import nlNL from 'antd/locale/nl_NL'
import dayjs from 'dayjs'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/fr'
import 'dayjs/locale/nl'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import React, { Suspense, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from './core/hooks'
import { Router } from './navigation/Router'
import { ANTD_NEW_THEME } from './style/antd/antdTheme'
import { HierarchyProvider } from './core/contexts/HierarchyContext'
import { PermissionProvider } from './core/contexts/PermissionContext'
dayjs.extend(localizedFormat)
dayjs.extend(isSameOrAfter)

const antdLocales: { [key: string]: typeof enGB } = {
  fr: frFR,
  nl: nlNL,
  en: enGB,
  de: deDE,
}

const dayjsLocales: { [key: string]: string } = {
  fr: 'fr',
  nl: 'nl',
  en: 'en',
  de: 'de',
}

const AppContent: React.FC = () => {
  const { i18n } = useTranslation()
  const currentLangCode = i18n.language.split('-')[0]
  const userId = useAppSelector((state) => state.cardinalApi.user?.id)
  const sessionKey = userId || 'guest'

  const antdLocale = useMemo(() => {
    return antdLocales[currentLangCode] || enGB
  }, [currentLangCode])

  useEffect(() => {
    const dayjsLocale = dayjsLocales[currentLangCode]
    if (dayjsLocale) {
      dayjs.locale(dayjsLocale)
    } else {
      console.warn(`Dayjs locale not found for language code: ${currentLangCode}. Defaulting to 'en'.`)
      dayjs.locale('en')
    }
  }, [currentLangCode])

  return (
    <ConfigProvider theme={ANTD_NEW_THEME} locale={antdLocale}>
      <React.Fragment key={sessionKey}>
        <HierarchyProvider>
          <PermissionProvider>
            <Router />
          </PermissionProvider>
        </HierarchyProvider>
      </React.Fragment>
    </ConfigProvider>
  )
}

function App() {
  return (
    <>
      <Suspense fallback={<p>Loading Application...</p>}>
        <AppContent />
      </Suspense>
    </>
  )
}

export default App

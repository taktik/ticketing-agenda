import { CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import React, { createContext, useContext, useMemo, useState } from 'react'

type SettingContextType = {
  selectedSite: HealthcareParty | undefined
  rootHcp: HealthcareParty | undefined
  selectedKey: string
  setSelectedKey: React.Dispatch<React.SetStateAction<string>>
  selectedKeyId: string | undefined
}

const defaultContext: SettingContextType = {
  selectedSite: undefined,
  rootHcp: undefined,
  selectedKey: 'default',
  setSelectedKey: () => {},
  selectedKeyId: undefined,
}

export const SettingContext = createContext<SettingContextType>(defaultContext)

type SettingContextProviderProps = {
  children: React.ReactNode
  selectedSite: HealthcareParty | undefined
  rootHcp: HealthcareParty | undefined
}

export const SettingContextProvider: React.FC<SettingContextProviderProps> = ({ children, selectedSite, rootHcp }) => {
  const [selectedKey, setSelectedKey] = useState<string>(selectedSite ? `site-${selectedSite.id}` : 'default')
  const selectedKeyId = useMemo(() => {
    const match = selectedKey.match(/^(site|service)-(.+)$/)
    const id = match?.[2]
    return id
  }, [selectedKey])

  return (
    <SettingContext.Provider
      value={{
        selectedSite,
        rootHcp,
        selectedKey,
        setSelectedKey,
        selectedKeyId,
      }}
    >
      {children}
    </SettingContext.Provider>
  )
}

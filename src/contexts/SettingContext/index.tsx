import { HealthcareParty } from '@icure/cardinal-sdk'
import React, { createContext, useMemo, useState } from 'react'

type SettingContextType = {
  selectedSite: HealthcareParty | undefined
  selectedKey: string
  setSelectedKey: React.Dispatch<React.SetStateAction<string>>
  selectedKeyId: string | undefined
}

const defaultContext: SettingContextType = {
  selectedSite: undefined,
  selectedKey: 'default',
  setSelectedKey: () => {},
  selectedKeyId: undefined,
}

export const SettingContext = createContext<SettingContextType>(defaultContext)

type SettingContextProviderProps = {
  children: React.ReactNode
  selectedSite: HealthcareParty | undefined
}

export const SettingContextProvider: React.FC<SettingContextProviderProps> = ({ children, selectedSite }) => {
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
        selectedKey,
        setSelectedKey,
        selectedKeyId,
      }}
    >
      {children}
    </SettingContext.Provider>
  )
}

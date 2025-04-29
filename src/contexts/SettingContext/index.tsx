import { HealthcareParty } from '@icure/cardinal-sdk'
import React, { createContext, useContext, useMemo, useState } from 'react'

type SettingContextType = {
  newSite: HealthcareParty | undefined
  setNewSite: React.Dispatch<React.SetStateAction<HealthcareParty | undefined>>
  selectedSite: HealthcareParty | undefined
  rootHcp: HealthcareParty | undefined
  selectedKey: string
  setSelectedKey: React.Dispatch<React.SetStateAction<string>>
  newService: HealthcareParty | undefined
  setNewService: React.Dispatch<React.SetStateAction<HealthcareParty | undefined>>
  selectedKeyId: string | undefined
}

const defaultContext: SettingContextType = {
  newSite: undefined,
  setNewSite: () => {},
  selectedSite: undefined,
  rootHcp: undefined,
  selectedKey: 'default',
  setSelectedKey: () => {},
  newService: undefined,
  setNewService: () => {},
  selectedKeyId: undefined,
}

export const SettingContext = createContext<SettingContextType>(defaultContext)

type SettingContextProviderProps = {
  children: React.ReactNode
  selectedSite: HealthcareParty | undefined
  rootHcp: HealthcareParty | undefined
}

export const SettingContextProvider: React.FC<SettingContextProviderProps> = ({ children, selectedSite, rootHcp }) => {
  const [newSite, setNewSite] = useState<HealthcareParty | undefined>()
  const [newService, setNewService] = useState<HealthcareParty | undefined>(undefined)
  const [selectedKey, setSelectedKey] = useState<string>(selectedSite ? `site-${selectedSite.id}` : 'default')
  const selectedKeyId = useMemo(() => {
    const match = selectedKey.match(/^(site|service)-(.+)$/)
    const id = match?.[2]
    return id
  }, [selectedKey])

  return (
    <SettingContext.Provider value={{ newSite, setNewSite, selectedSite, rootHcp, selectedKey, setSelectedKey, newService, setNewService, selectedKeyId }}>
      {children}
    </SettingContext.Provider>
  )
}

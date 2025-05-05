import { CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import React, { createContext, useContext, useMemo, useState } from 'react'

type SettingContextType = {
  newSite: HealthcareParty | undefined
  setNewSite: React.Dispatch<React.SetStateAction<HealthcareParty | undefined>>
  newService: HealthcareParty | undefined
  setNewService: React.Dispatch<React.SetStateAction<HealthcareParty | undefined>>
  newDemarche: CalendarItemType | undefined
  setNewDemarche: React.Dispatch<React.SetStateAction<CalendarItemType | undefined>>
  selectedSite: HealthcareParty | undefined
  rootHcp: HealthcareParty | undefined
  selectedKey: string
  setSelectedKey: React.Dispatch<React.SetStateAction<string>>
  selectedKeyId: string | undefined
}

const defaultContext: SettingContextType = {
  newSite: undefined,
  setNewSite: () => {},
  newService: undefined,
  setNewService: () => {},
  newDemarche: undefined,
  setNewDemarche: () => {},
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
  const [newSite, setNewSite] = useState<HealthcareParty | undefined>()
  const [newService, setNewService] = useState<HealthcareParty | undefined>(undefined)
  const [newDemarche, setNewDemarche] = useState<CalendarItemType | undefined>(undefined)
  const [selectedKey, setSelectedKey] = useState<string>(selectedSite ? `site-${selectedSite.id}` : 'default')
  const selectedKeyId = useMemo(() => {
    const match = selectedKey.match(/^(site|service)-(.+)$/)
    const id = match?.[2]
    console.log('key id', id)
    return id
  }, [selectedKey])

  return (
    <SettingContext.Provider
      value={{
        newSite,
        setNewSite,
        newService,
        setNewService,
        newDemarche,
        setNewDemarche,
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

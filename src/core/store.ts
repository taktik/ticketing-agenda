import { Action, configureStore, isRejectedWithValue, Middleware, ThunkAction } from '@reduxjs/toolkit'
import { notification } from 'antd'
import { persistStore } from 'redux-persist'
import i18nModule from '../i18n'
import { agendaApiRtk, AgendaTags } from './api/agendaApi'
import { anonymousApiRtk } from './api/anonymousApi'
import { AppointmentPollingApiRtk } from './api/appointmentPollingApi'
import { calendarItemApiRtk, CalendarItemTags } from './api/calendarItemApi'
import { contactApiRtk } from './api/contactApi'
import { calendarItemTypeApiRtk, CalendarItemTypeTags } from './api/calendarItemTypeApi'
import { dataOwnerApiRtk } from './api/dataOwnerApi'
import { emailApiRtk } from './api/emailApi'
import { groupApiRtk } from './api/groupApi'
import { healthcarePartyApiRtk, HealthcarePartyTags } from './api/healthcarePartyApi'
import { patientApiRtk } from './api/patientApi'
import { recoveryApiRtk } from './api/recoveryApi'
import { roleApiRtk } from './api/roleApi'
import { userApiRtk } from './api/userApi'
import { persistedReducer } from './reducer'

// i18next v25 types are strict and don't resolve well outside React hooks; cast to a simple function
const t = (key: string): string => (i18nModule as unknown as { t: (k: string) => string }).t(key)

const conflictMiddleware: Middleware = (storeAPI) => (next) => (action) => {
  const result = next(action)
  if (isRejectedWithValue(action) && (action.payload as { status?: number })?.status === 409) {
    storeAPI.dispatch(calendarItemApiRtk.util.invalidateTags([{ type: CalendarItemTags.CalendarItem }]))
    storeAPI.dispatch(agendaApiRtk.util.invalidateTags([{ type: AgendaTags.Agenda }]))
    storeAPI.dispatch(healthcarePartyApiRtk.util.invalidateTags([{ type: HealthcarePartyTags.HealthcareParty }]))
    storeAPI.dispatch(calendarItemTypeApiRtk.util.invalidateTags([{ type: CalendarItemTypeTags.CalendarItemType }]))
    notification.error({
      message: t('notification.conflict_title'),
      description: t('notification.conflict_description'),
      duration: 6,
    })
  }
  return result
}

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(
      conflictMiddleware,
      userApiRtk.middleware,
      patientApiRtk.middleware,
      agendaApiRtk.middleware,
      calendarItemApiRtk.middleware,
      healthcarePartyApiRtk.middleware,
      calendarItemTypeApiRtk.middleware,
      dataOwnerApiRtk.middleware,
      groupApiRtk.middleware,
      anonymousApiRtk.middleware,
      roleApiRtk.middleware,
      recoveryApiRtk.middleware,
      emailApiRtk.middleware,
      AppointmentPollingApiRtk.middleware,
      contactApiRtk.middleware,
    ),
})

export const persistor = persistStore(store)

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>

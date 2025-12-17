import { Action, configureStore, ThunkAction } from '@reduxjs/toolkit'
import { persistStore } from 'redux-persist'
import { agendaApiRtk } from './api/agendaApi'
import { anonymousApiRtk } from './api/anonymousApi'
import { AppointmentPollingApiRtk } from './api/appointmentPollingApi'
import { calendarItemApiRtk } from './api/calendarItemApi'
import { calendarItemTypeApiRtk } from './api/calendarItemTypeApi'
import { dataOwnerApiRtk } from './api/dataOwnerApi'
import { emailApiRtk } from './api/emailApi'
import { groupApiRtk } from './api/groupApi'
import { healthcarePartyApiRtk } from './api/healthcarePartyApi'
import { patientApiRtk } from './api/patientApi'
import { recoveryApiRtk } from './api/recoveryApi'
import { roleApiRtk } from './api/roleApi'
import { timeTableApiRtk } from './api/timeTableApi'
import { userApiRtk } from './api/userApi'
import { persistedReducer } from './reducer'

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(
      userApiRtk.middleware,
      patientApiRtk.middleware,
      agendaApiRtk.middleware,
      timeTableApiRtk.middleware,
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
    ),
})

export const persistor = persistStore(store)

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>

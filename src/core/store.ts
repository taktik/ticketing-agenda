import { Action, configureStore, ThunkAction } from '@reduxjs/toolkit'
import { persistStore } from 'redux-persist'
import { persistedReducer } from './reducer'
import thunk from 'redux-thunk'
import { userApiRtk } from './api/userApi'
import { patientApiRtk } from './api/patientApi'
import { agendaApiRtk } from './api/agendaApi'
import { timeTableApiRtk } from './api/timeTableApi'
import { calendarItemApiRtk } from './api/calendarItemApi'
import { healthcarePartyApiRtk } from './api/healthcarePartyApi'
import { calendarItemTypeApiRtk } from './api/calendarItemTypeApi'
import { dataOwnerApiRtk } from './api/dataOwnerApi'
import { groupApiRtk } from './api/groupApi'
import { anonymousApiRtk } from './api/anonymousApi'
import { roleApiRtk } from './api/roleApi'
import { recoveryApiRtk } from './api/recoveryApi'
import { emailApiRtk } from './api/emailApi'

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
      thunk,
    ),
})

export const persistor = persistStore(store)

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>

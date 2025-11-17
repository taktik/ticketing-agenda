import { combineReducers } from '@reduxjs/toolkit'
import { persistReducer } from 'redux-persist'
import { patientApiRtk } from './api/patientApi'
import { userApiRtk } from './api/userApi'
import { app, persistConfig } from './app'
import { cardinalApiRtk } from './services/auth.api'
import { agendaApiRtk } from './api/agendaApi'
import { timeTableApiRtk } from './api/timeTableApi'
import { calendarItemApiRtk } from './api/calendarItemApi'
import { calendarItemTypeApiRtk } from './api/calendarItemTypeApi'
import { dataOwnerApiRtk } from './api/dataOwnerApi'
import { healthcarePartyApiRtk } from './api/healthcarePartyApi'
import { groupApiRtk } from './api/groupApi'
import { anonymousApiRtk } from './api/anonymousApi'
import { roleApiRtk } from './api/roleApi'
import { recoveryApiRtk } from './api/recoveryApi'
import { emailApiRtk } from './api/emailApi'

export const appReducer = combineReducers({
  app: app.reducer,
  cardinalApi: cardinalApiRtk.reducer,
  userApi: userApiRtk.reducer,
  patientApi: patientApiRtk.reducer,
  agendaApi: agendaApiRtk.reducer,
  timeTableApi: timeTableApiRtk.reducer,
  calendarItemApi: calendarItemApiRtk.reducer,
  healthcarePartyApi: healthcarePartyApiRtk.reducer,
  calendarItemTypeApi: calendarItemTypeApiRtk.reducer,
  dataOwnerTypeApi: dataOwnerApiRtk.reducer,
  groupApi: groupApiRtk.reducer,
  anonymousApi: anonymousApiRtk.reducer,
  roleApi: roleApiRtk.reducer,
  recoveryApi: recoveryApiRtk.reducer,
  emailApi: emailApiRtk.reducer,
})

export const persistedReducer = persistReducer(persistConfig, appReducer)

export type AppState = ReturnType<typeof appReducer>

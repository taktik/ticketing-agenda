import { combineReducers } from '@reduxjs/toolkit'
import { persistReducer } from 'redux-persist'
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
import { app, persistConfig } from './app'
import { cardinalApiRtk } from './services/auth.api'

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
  AppointmentPollingApi: AppointmentPollingApiRtk.reducer,
})

export const persistedReducer = persistReducer(persistConfig, appReducer)

export type AppState = ReturnType<typeof appReducer>

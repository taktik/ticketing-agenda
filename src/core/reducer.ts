import { combineReducers } from '@reduxjs/toolkit'
import { persistReducer } from 'redux-persist'
import { contactApiRtk } from './api/contactApi'
import { deviceApiRtk } from './api/deviceApi'
import { healthElementApiRtk } from './api/healthElementApi'
import { patientApiRtk } from './api/patientApi'
import { practitionerApiRtk } from './api/practitionerApi'
import { userApiRtk } from './api/userApi'
import { app, persistConfig } from './app'
import { cardinalApiRtk } from './services/auth.api'
import { agendaApiRtk } from './api/agendaApi'
import { timeTableApiRtk } from './api/timeTableApi'
import { calendarItemApiRtk } from './api/calendarItemApi'
import { healthcarePartyApiRtk } from './api/healthcarePartyApi'

export const appReducer = combineReducers({
  app: app.reducer,
  cardinalApi: cardinalApiRtk.reducer,
  practitionerApi: practitionerApiRtk.reducer,
  userApi: userApiRtk.reducer,
  deviceApi: deviceApiRtk.reducer,
  patientApi: patientApiRtk.reducer,
  contactApi: contactApiRtk.reducer,
  healthElementApi: healthElementApiRtk.reducer,
  agendaApi: agendaApiRtk.reducer,
  timeTableApi: timeTableApiRtk.reducer,
  calendarItemApi: calendarItemApiRtk.reducer,
  healthcarePartyApi: healthcarePartyApiRtk.reducer,
})

export const persistedReducer = persistReducer(persistConfig, appReducer)

export type AppState = ReturnType<typeof appReducer>

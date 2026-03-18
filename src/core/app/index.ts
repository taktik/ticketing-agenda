import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import localForage from 'localforage'

export const persistConfig = {
  key: 'app',
  storage: localForage,
  whitelist: ['app'],
}

export interface AppState {
  cache: string
  savedCredentials?: {
    tokenTimestamp: number
    login: string
    token: string
    bearerToken?: string
  }
}

const initialState = {} as AppState

export const app = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setSavedCredentials(state, { payload: savedCredentials }: PayloadAction<{ login: string; token: string; bearerToken?: string; tokenTimestamp: number } | undefined>) {
      state.savedCredentials = savedCredentials
    },
    revertAll() {
      return initialState
    },
  },
})

export const { setSavedCredentials, revertAll } = app.actions

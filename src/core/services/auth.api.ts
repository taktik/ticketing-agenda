import {
  AuthenticationMethod,
  AuthenticationProcessTelecomType,
  CaptchaOptions,
  CardinalApis,
  CardinalSdk,
  CryptoStrategies,
  KeypairFingerprintV1String,
  KeyPairRecoverer,
  RecoveryDataKey,
  RecoveryDataUseFailureReason,
  RecoveryKeyOptions,
  RecoveryKeySize,
  RecoveryResult,
  Solution,
  spkiHexKeyToFingerprintV1,
  SpkiHexString,
  StorageFacade,
  User,
  XCryptoService,
  XRsaKeypair,
} from '@icure/cardinal-sdk'
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { Unsubscribe } from 'redux'
import { MSG_GW_URL, NIGHTLY_ICURE_CLOUD_URL, PROCESS_ID, SPEC_ID } from '../../constants'

import { revertAll, setSavedCredentials } from '../app'
import { store } from '../store'

const apiCache: { [key: string]: CardinalSdk } = {}

export class PetraCareCryptoStrategies extends CryptoStrategies {
  async notifyNewKeyCreated(sdk: CardinalApis): Promise<void> {
    const recoveryKey = await sdk.recovery.createRecoveryInfoForAvailableKeyPairs({
      includeParentsKeys: true,
      recoveryKeyOptions: new RecoveryKeyOptions.Generate({ recoveryKeySize: RecoveryKeySize.Bytes32 }),
    })

    const formattedKey = recoveryKey
      .asBase32()
      .match(/.{1,4}/g)
      ?.join('-')

    if (!!formattedKey) store.dispatch(setNewlyCreatedRecoveryKey({ recoveryKey: formattedKey }))
  }

  async recoverAndVerifySelfHierarchyKeys(
    keysData: Array<CryptoStrategies.KeyDataRecoveryRequest>,
    cryptoPrimitives: XCryptoService,
    keyPairRecoverer: KeyPairRecoverer,
  ): Promise<{ [dataOwnerId: string]: CryptoStrategies.RecoveredKeyData }> {
    let recovered: RecoveryResult<{ [dataOwnerId: string]: { [pub: SpkiHexString]: XRsaKeypair } }> | undefined = undefined
    let reason = RecoveryDataUseFailureReason.Missing
    do {
      const rk = await this.promptUserForRecoveryKey(reason)
      if (!rk) {
        break
      }
      let decodedRecoveryKey: RecoveryDataKey
      try {
        decodedRecoveryKey = RecoveryDataKey.fromBase32(rk)
      } catch (e) {
        console.warn(e)
        reason = RecoveryDataUseFailureReason.InvalidContent
        continue
      }
      recovered = await keyPairRecoverer.recoverWithRecoveryKey(decodedRecoveryKey, false)
    } while (!recovered || recovered instanceof RecoveryResult.Failure)
    if (!recovered) {
      return {}
    }
    const result: { [dataOwnerId: string]: CryptoStrategies.RecoveredKeyData } = {}
    for (const recoveryRequest of keysData) {
      const dataOwner = recoveryRequest.dataOwnerDetails.dataOwner
      const currDataOwnerRecoveredData = (recovered as RecoveryResult.Success<{ [dataOwnerId: string]: { [pub: SpkiHexString]: XRsaKeypair } }>).data[dataOwner.id]
      const currRecoveryResult: { [fp: KeypairFingerprintV1String]: XRsaKeypair } = {}
      if (currDataOwnerRecoveredData != undefined) {
        for (const unavailableKeyInfo of recoveryRequest.unavailableKeys) {
          const recoveredKey = currDataOwnerRecoveredData[unavailableKeyInfo.publicKey]
          if (recoveredKey != undefined) {
            currRecoveryResult[spkiHexKeyToFingerprintV1(unavailableKeyInfo.publicKey)] = recoveredKey
          }
        }
      }
      result[dataOwner.id] = {
        recoveredKeys: currRecoveryResult,
        keyAuthenticity: {},
      }
    }
    return result
  }

  private async promptUserForRecoveryKey(reason: RecoveryDataUseFailureReason = RecoveryDataUseFailureReason.Missing): Promise<string | undefined> {
    const promise = new Promise<string>((resolve) => {
      // let unsubscribe:
      const handleChange = () => {
        const {
          cardinalApi: { recoveryKeys },
        } = store.getState()
        if (recoveryKeys === undefined) {
          return
        }
        resolve(recoveryKeys[0])
        unsubscribe?.()
      }
      const unsubscribe: Unsubscribe | undefined = store.subscribe(handleChange)
    })

    store.dispatch(askForRecoveryKey({ reason }))
    return promise
  }
}

export interface CardinalApiState {
  email?: string
  token?: string
  user?: User
  keyPair?: { publicKey: string; privateKey: string }
  authProcess?: CardinalSdk.AuthenticationWithProcessStep
  online: boolean
  invalidEmail: boolean
  invalidToken: boolean
  waitingForToken: boolean
  firstName?: string
  lastName?: string
  dateOfBirth?: number
  mobilePhone?: string
  loginProcessStarted: boolean
  newlyCreatedRecoveryKey?: string
  recoveryKeyRequest?: { reason: string }
  recoveryKeys?: string[]
}

const cardinalApiInitialState: CardinalApiState = {
  email: undefined,
  token: undefined,
  user: undefined,
  keyPair: undefined,
  authProcess: undefined,
  online: false,
  invalidEmail: false,
  invalidToken: false,
  waitingForToken: false,
  firstName: undefined,
  lastName: undefined,
  dateOfBirth: undefined,
  mobilePhone: undefined,
  loginProcessStarted: false,
  newlyCreatedRecoveryKey: undefined,
  recoveryKeyRequest: undefined,
  recoveryKeys: undefined,
}

function getError(e: Error): FetchBaseQueryError {
  return { status: 'CUSTOM_ERROR', error: e.message, data: e }
}

export const guard = async <T>(guardedInputs: unknown[], lambda: () => Promise<T>): Promise<{ error: FetchBaseQueryError } | { data: T | undefined }> => {
  if (guardedInputs.some((x) => !x)) {
    return { data: undefined }
  }
  try {
    const res = await lambda()
    const curate = (result: T): T => {
      if (result === null || result === undefined) {
        return null as T
      } else if (Array.isArray(result)) {
        return result.map(curate) as T
      } else {
        return result as T
      }
    }
    return { data: curate(res) }
  } catch (e) {
    console.error(e)
    return { error: getError(e as Error) }
  }
}

export const getApiFromState = async (getState: () => CardinalApiState | { cardinalApi: CardinalApiState } | undefined): Promise<CardinalSdk | undefined> => {
  const state = getState()
  if (!state) {
    throw new Error('No state found')
  }

  const initialState = 'cardinalApi' in state ? state.cardinalApi : state
  const { user } = initialState

  if (!user) {
    return undefined
  }

  return apiCache[`${user.groupId}/${user.id}`] as CardinalSdk
}

export const cardinalApi = async (getState: () => unknown) => {
  const state = getState() as { cardinalApi: CardinalApiState }
  return await getApiFromState(() => state)
}

export const startAuthentication = createAsyncThunk(
  'cardinalApi/startAuthentication',
  async (
    _payload: {
      captchaToken: Solution
    },
    { getState, dispatch },
  ) => {
    const {
      cardinalApi: { email, firstName, lastName },
    } = getState() as { cardinalApi: CardinalApiState }
    dispatch(setLoginProcessStarted(true))

    if (!email) {
      throw new Error('The email was not found')
    }

    try {
      const authenticationStep = await CardinalSdk.initializeWithProcess(
        undefined,
        NIGHTLY_ICURE_CLOUD_URL,
        MSG_GW_URL,
        SPEC_ID!,
        PROCESS_ID!,
        AuthenticationProcessTelecomType.Email,
        email,
        new CaptchaOptions.Kerberus.Computed({ solution: _payload.captchaToken }),
        StorageFacade.usingBrowserLocalStorage(),
        { firstName, lastName },
        {
          useHierarchicalDataOwners: false,
          cryptoStrategies: new PetraCareCryptoStrategies(),
        },
      )

      dispatch(setLoginProcessStarted(false))
      return authenticationStep
    } catch (e) {
      console.error(`Couldn't start authentication: ${e}`)
    } finally {
      dispatch(setLoginProcessStarted(false))
    }
  },
)

export const completeAuthentication = createAsyncThunk('cardinalApi/completeAuthentication', async (_payload, { getState, dispatch }) => {
  const {
    cardinalApi: { authProcess, token },
  } = getState() as { cardinalApi: CardinalApiState }
  dispatch(setLoginProcessStarted(true))

  if (!authProcess) {
    dispatch(setLoginProcessStarted(false))
    throw new Error('No authProcess provided')
  }

  if (!token) {
    dispatch(setLoginProcessStarted(false))
    throw new Error('No token provided')
  }
  try {
    const api = await authProcess.completeAuthentication(token)
    const user = await api.user.getCurrentUser()
    const newToken = await api.user.getToken(user.id, 'rememberMe')

    apiCache[`${user.groupId}/${user.id}`] = api

    dispatch(
      setSavedCredentials({
        login: `${user.groupId}/${user.id}`,
        token: newToken,
        tokenTimestamp: +Date.now(),
      }),
    )
    return new User(user)
  } catch (e) {
    console.error(`Couldn't complete authentication: ${e}`)
    throw e
  } finally {
    dispatch(setLoginProcessStarted(false))
  }
})

export const login = createAsyncThunk('cardinalApi/login', async (_, { getState, dispatch }) => {
  const {
    cardinalApi: { email, token },
  } = getState() as { cardinalApi: CardinalApiState }
  dispatch(setLoginProcessStarted(true))

  if (!email) {
    dispatch(setLoginProcessStarted(false))
    throw new Error('No email provided')
  }

  if (!token) {
    dispatch(setLoginProcessStarted(false))
    throw new Error('No token provided')
  }

  try {
    const api = await CardinalSdk.initialize(
      undefined,
      NIGHTLY_ICURE_CLOUD_URL,
      new AuthenticationMethod.UsingCredentials.UsernamePassword(email, token),
      StorageFacade.usingBrowserLocalStorage(),
      {
        useHierarchicalDataOwners: false,
      },
    )

    const user = await api.user.getCurrentUser()

    apiCache[`${user.groupId}/${user.id}`] = api

    return new User(user)
  } catch (e) {
    console.error(`Couldn't login: ${e}`)
    dispatch(revertAll())
    dispatch(resetCredentials())
  } finally {
    dispatch(setLoginProcessStarted(false))
  }
})

export const logout = createAsyncThunk('cardinalApi/logout', async (_payload, { dispatch }) => {
  dispatch(revertAll())
  dispatch(resetCredentials())
})

export const cardinalApiRtk = createSlice({
  name: 'cardinalApi',
  initialState: cardinalApiInitialState,
  reducers: {
    setNewlyCreatedRecoveryKey: (state, { payload: { recoveryKey } }: PayloadAction<{ recoveryKey: string | undefined }>) => {
      state.newlyCreatedRecoveryKey = recoveryKey
    },
    askForRecoveryKey: (state, { payload: { reason } }: PayloadAction<{ reason: string }>) => {
      state.recoveryKeyRequest = { reason }
      state.recoveryKeys = undefined
    },
    provideRecoveryKey: (state, { payload: { recoveryKey } }: PayloadAction<{ recoveryKey: string }>) => {
      state.recoveryKeyRequest = undefined
      state.recoveryKeys = [recoveryKey]
    },
    markRecoveryKeyAsLost: (state) => {
      state.recoveryKeyRequest = undefined
      state.recoveryKeys = []
    },
    setRegistrationInformation: (
      state,
      {
        payload: { firstName, lastName, email },
      }: PayloadAction<{
        firstName: string
        lastName: string
        email: string
      }>,
    ) => {
      state.firstName = firstName
      state.lastName = lastName
      state.email = email
    },
    setToken: (state, { payload: { token } }: PayloadAction<{ token: string }>) => {
      state.token = token
      state.invalidToken = false
    },
    setEmail: (state, { payload: { email } }: PayloadAction<{ email: string }>) => {
      state.email = email
      state.invalidEmail = false
    },
    setUser: (state, { payload: { user } }: PayloadAction<{ user: User }>) => {
      state.user = user
      state.online = !!user
    },
    resetCredentials: (state) => {
      state.online = false
    },
    setLoginProcessStarted(state, { payload: status }: PayloadAction<boolean>) {
      state.loginProcessStarted = status
    },
    setWaitingForToken(state, { payload: status }: PayloadAction<boolean>) {
      state.waitingForToken = status
    },
  },
  extraReducers: (builder) => {
    builder.addCase(startAuthentication.fulfilled, (state, { payload: authProcess }) => {
      state.authProcess = authProcess
      state.waitingForToken = true
    })
    builder.addCase(startAuthentication.rejected, (state, {}) => {
      state.invalidEmail = true
    })
    builder.addCase(completeAuthentication.fulfilled, (state, { payload: user }) => {
      state.user = user as User
      state.online = !!user
      state.waitingForToken = false
    })
    builder.addCase(completeAuthentication.rejected, (state, {}) => {
      state.invalidToken = true
    })
    builder.addCase(login.fulfilled, (state, { payload: user }) => {
      state.user = user as User
      state.online = !!user
    })
    builder.addCase(login.rejected, (state, {}) => {
      state.invalidToken = true
      state.online = false
    })
  },
})

export const {
  setNewlyCreatedRecoveryKey,
  askForRecoveryKey,
  provideRecoveryKey,
  markRecoveryKeyAsLost,
  setRegistrationInformation,
  setToken,
  setEmail,
  resetCredentials,
  setLoginProcessStarted,
  setWaitingForToken,
} = cardinalApiRtk.actions

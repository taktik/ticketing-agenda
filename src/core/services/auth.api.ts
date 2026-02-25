import { AccountInfo } from '@azure/msal-browser'
import {
  AuthenticationMethod,
  AuthenticationProcessTelecomType,
  CaptchaOptions,
  CardinalAnonymousSdk,
  CardinalApis,
  CardinalBaseSdk,
  CardinalSdk,
  CryptoStrategies,
  DataOwnerWithType,
  KeyPairRecoverer,
  RecoveryDataKey,
  RecoveryKeyOptions,
  RecoveryKeySize,
  RecoveryResult,
  Solution,
  StorageFacade,
  User,
  XCryptoService,
  XRsaKeypair,
} from '@icure/cardinal-sdk'
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { msalInstance } from '../..'
import { APPLICATION_ID, BACKEND_API, EMAIL_AUTH_CODE_ADMIN_FR, ICURE_NIGHTLY_URL, MSG_GW_URL, SPEC_ID } from '../../constants'
import { agendaApiRtk } from '../api/agendaApi'
import { anonymousApiRtk } from '../api/anonymousApi'
import { calendarItemApiRtk } from '../api/calendarItemApi'
import { calendarItemTypeApiRtk } from '../api/calendarItemTypeApi'
import { dataOwnerApiRtk } from '../api/dataOwnerApi'
import { emailApiRtk } from '../api/emailApi'
import { groupApiRtk } from '../api/groupApi'
import { patientApiRtk } from '../api/patientApi'
import { recoveryApiRtk } from '../api/recoveryApi'
import { roleApiRtk } from '../api/roleApi'
import { timeTableApiRtk } from '../api/timeTableApi'
import { userApiRtk } from '../api/userApi'
import { revertAll, setSavedCredentials } from '../app'

const apiCache: { [key: string]: CardinalSdk } = {}
const anonymousApiCache: { [key: string]: CardinalAnonymousSdk } = {}

export class PetraCareCryptoStrategies extends CryptoStrategies {
  bearerTokenProvider: () => Promise<string>

  constructor(bearerTokenProvider: () => Promise<string>) {
    super()
    this.bearerTokenProvider = bearerTokenProvider
  }

  async notifyNewKeyCreated(sdk: CardinalApis): Promise<void> {
    const recoveryKey = await sdk.recovery.createRecoveryInfoForAvailableKeyPairs({
      includeParentsKeys: true,
      recoveryKeyOptions: new RecoveryKeyOptions.Generate({
        recoveryKeySize: RecoveryKeySize.Bytes32,
      }),
    })
    const formattedKey = recoveryKey.asBase32()

    const hcp = await (await sdk.dataOwner.getCurrentDataOwner()).dataOwner
    if (!!formattedKey && !!hcp) {
      try {
        const response = await fetch(`${BACKEND_API}/api/keys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await this.bearerTokenProvider()}`,
          },
          body: JSON.stringify({ userId: hcp.id, key: formattedKey }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Backend request failed')
        }

        const result = await response.json()
        console.log('Backend success message:', result.message)
      } catch (error) {
        console.error('Failed to save key via fetch:', error)
      }
    }
  }

  async fetchRecoveryKey(hcpId: string): Promise<string | undefined> {
    try {
      const response = await fetch(`${BACKEND_API}/api/keys/${hcpId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await this.bearerTokenProvider()}`,
        },
      })
      if (response.status === 404) {
        return undefined
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Request failed')
      }

      const result = await response.json()
      return result.key
    } catch (error) {
      console.error('Failed to fetch key:', error)
      throw error
    }
  }

  async generateNewKeyForDataOwner(self: DataOwnerWithType, cryptoPrimitives: XCryptoService): Promise<boolean | XRsaKeypair | 'keyless'> {
    return self.dataOwner.publicKeysForOaepWithSha256.length == 0
  }

  async recoverAndVerifySelfHierarchyKeys(
    keysData: Array<CryptoStrategies.KeyDataRecoveryRequest>,
    cryptoPrimitives: XCryptoService,
    keyPairRecoverer: KeyPairRecoverer,
  ): Promise<{ [dataOwnerId: string]: CryptoStrategies.RecoveredKeyData }> {
    const result: { [dataOwnerId: string]: CryptoStrategies.RecoveredKeyData } = {}
    for (const key of keysData) {
      const hcp = key.dataOwnerDetails.dataOwner
      if (!key.unavailableKeys || key.unavailableKeys.length === 0 || !key.unknownKeys || key.unknownKeys.length === 0) {
        result[hcp.id] = { recoveredKeys: {}, keyAuthenticity: {} }
      } else {
        const rk = hcp ? await this.fetchRecoveryKey(hcp.id) : undefined
        if (!rk) {
          throw new Error(`Can't retrieve key for dataowner ${hcp.id}`)
        }
        const decodedRecoveryKey = RecoveryDataKey.fromBase32(rk)
        const recovered = await keyPairRecoverer.recoverWithRecoveryKey(decodedRecoveryKey, false)

        if (!(recovered instanceof RecoveryResult.Success)) {
          throw new Error('Recovery of key failed')
        }

        result[hcp.id] = {
          recoveredKeys: recovered.data[hcp.id],
          keyAuthenticity: Object.fromEntries(Object.entries(recovered.data[hcp.id]).map(([a, _]) => [a, true])),
        }
      }
    }
    return result
  }
}

export interface CardinalApiState {
  email?: string
  token?: string
  azureToken?: string
  user?: User
  keyPair?: { publicKey: string; privateKey: string }
  authProcess?: CardinalBaseSdk.BaseAuthenticationWithProcessStep
  online: boolean
  invalidEmail: boolean
  invalidToken: boolean
  waitingForToken: boolean
  firstName?: string
  lastName?: string
  dateOfBirth?: number
  mobilePhone?: string
  emailLoginProcessStarted: boolean
  azureLoginProcessStarted: boolean
  autoLoginProcessStarted: boolean
  newlyCreatedRecoveryKey?: string
  recoveryKeyRequest?: { reason: string }
  recoveryKeys?: string[]
}

const cardinalApiInitialState: CardinalApiState = {
  email: undefined,
  token: undefined,
  azureToken: undefined,
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
  emailLoginProcessStarted: false,
  azureLoginProcessStarted: false,
  autoLoginProcessStarted: false,
  newlyCreatedRecoveryKey: undefined,
  recoveryKeyRequest: undefined,
  recoveryKeys: undefined,
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

export const anonymousCardinalApi = () => {
  return anonymousApiCache['anonymous'] as CardinalAnonymousSdk
}

export const azureLogin = createAsyncThunk('cardinalApi/azureLogin', async ({ account }: { account: AccountInfo }, { dispatch }) => {
  try {
    dispatch(setAzureLoginProcessStarted(true))

    if (!account.idTokenClaims?.preferred_username) {
      throw new Error('No valid prefered username')
    }
    if (!account.idToken) {
      throw new Error('No valid prefered username')
    }

    const baseSdk = await CardinalBaseSdk.initialize(APPLICATION_ID, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.ExternalAuthenticationToken('azure', account.idToken), {
      encryptedFields: { patient: [], calendarItem: [] },
    })

    const api = await baseSdk.toFullSdk(StorageFacade.usingBrowserLocalStorage(), {
      useHierarchicalDataOwners: true,
      cryptoStrategies: new PetraCareCryptoStrategies(() => baseSdk.auth.getBearerToken()),
    })

    const user = await api.user.getCurrentUser()
    const newToken = await api.user.getToken(user.id, 'rememberMe')

    apiCache[`${user.groupId}/${user.id}`] = api

    const anonymousApi = await CardinalAnonymousSdk.initialize(ICURE_NIGHTLY_URL)
    anonymousApiCache['anonymous'] = anonymousApi

    dispatch(
      setSavedCredentials({
        login: `${user.groupId}/${user.id}`,
        token: newToken,
        tokenTimestamp: +Date.now(),
      }),
    )
    dispatch(setAzureToken({ azureToken: account.idToken }))
    if (user.email) dispatch(setEmail({ email: user.email }))
    return new User(user)
  } catch (e) {
    console.error(`Couldn't start authentication: ${e}`)
  } finally {
    dispatch(setAzureLoginProcessStarted(false))
  }
})

export const startEmailAuthentication = createAsyncThunk(
  'cardinalApi/startEmailAuthentication',
  async (
    _payload: {
      captchaToken: Solution
    },
    { getState, dispatch },
  ) => {
    const {
      cardinalApi: { email, firstName, lastName },
    } = getState() as { cardinalApi: CardinalApiState }
    dispatch(setEmailLoginProcessStarted(true))
    try {
      if (!email) {
        throw new Error('The email was not found')
      }

      const authenticationStep = await CardinalBaseSdk.initializeWithProcess(
        APPLICATION_ID,
        ICURE_NIGHTLY_URL,
        MSG_GW_URL,
        SPEC_ID,
        EMAIL_AUTH_CODE_ADMIN_FR,
        AuthenticationProcessTelecomType.Email,
        email,
        new CaptchaOptions.Kerberus.Computed({ solution: _payload.captchaToken }),
        { firstName, lastName },
        {
          encryptedFields: { patient: [], calendarItem: [] },
        },
      )

      dispatch(setEmailLoginProcessStarted(false))
      return authenticationStep
    } catch (e) {
      console.error(`Couldn't start authentication: ${e}`)
    } finally {
      dispatch(setEmailLoginProcessStarted(false))
    }
  },
)

export const completeEmailAuthentication = createAsyncThunk('cardinalApi/completeEmailAuthentication', async (_payload, { getState, dispatch }) => {
  const {
    cardinalApi: { authProcess, token },
  } = getState() as { cardinalApi: CardinalApiState }
  dispatch(setEmailLoginProcessStarted(true))
  try {
    if (!authProcess) {
      dispatch(setEmailLoginProcessStarted(false))
      throw new Error('No authProcess provided')
    }

    if (!token) {
      dispatch(setEmailLoginProcessStarted(false))
      throw new Error('No token provided')
    }

    const baseSdk = await authProcess.completeAuthentication(token)

    const api = await baseSdk.toFullSdk(StorageFacade.usingBrowserLocalStorage(), {
      useHierarchicalDataOwners: true,
      cryptoStrategies: new PetraCareCryptoStrategies(() => baseSdk.auth.getBearerToken()),
    })

    const user = await api.user.getCurrentUser()
    const newToken = await api.user.getToken(user.id, 'rememberMe')

    apiCache[`${user.groupId}/${user.id}`] = api

    const anonymousApi = await CardinalAnonymousSdk.initialize(ICURE_NIGHTLY_URL)
    anonymousApiCache['anonymous'] = anonymousApi

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
    dispatch(setEmailLoginProcessStarted(false))
  }
})

export const login = createAsyncThunk('cardinalApi/login', async (_, { getState, dispatch }) => {
  const {
    cardinalApi: { email, token },
  } = getState() as { cardinalApi: CardinalApiState }
  dispatch(setAutoLoginProcessStarted(true))

  if (!email) {
    dispatch(setAutoLoginProcessStarted(false))
    throw new Error('No email provided')
  }

  if (!token) {
    dispatch(setAutoLoginProcessStarted(false))
    throw new Error('No token provided')
  }

  try {
    const api = await CardinalSdk.initialize(undefined, ICURE_NIGHTLY_URL, new AuthenticationMethod.UsingCredentials.UsernamePassword(email, token), StorageFacade.usingBrowserLocalStorage(), {
      useHierarchicalDataOwners: true,
      encryptedFields: { patient: [], calendarItem: [] },
    })
    const user = await api.user.getCurrentUser()
    apiCache[`${user.groupId}/${user.id}`] = api

    const anonymousApi = await CardinalAnonymousSdk.initialize(ICURE_NIGHTLY_URL)
    anonymousApiCache['anonymous'] = anonymousApi

    return new User(user)
  } catch (e) {
    console.error(`Couldn't login: ${e}`)
    dispatch(revertAll())
    dispatch(resetCredentials())
  } finally {
    dispatch(setAutoLoginProcessStarted(false))
  }
})

export const logout = createAsyncThunk('cardinalApi/logout', async (_payload, { dispatch }) => {
  dispatch(recoveryApiRtk.util.resetApiState())
  dispatch(emailApiRtk.util.resetApiState())
  dispatch(userApiRtk.util.resetApiState())
  dispatch(agendaApiRtk.util.resetApiState())
  dispatch(anonymousApiRtk.util.resetApiState())
  dispatch(calendarItemApiRtk.util.resetApiState())
  dispatch(calendarItemTypeApiRtk.util.resetApiState())
  dispatch(dataOwnerApiRtk.util.resetApiState())
  dispatch(patientApiRtk.util.resetApiState())
  dispatch(roleApiRtk.util.resetApiState())
  dispatch(timeTableApiRtk.util.resetApiState())
  dispatch(groupApiRtk.util.resetApiState())
  dispatch(revertAll())
  dispatch(resetCredentials())

  const activeAccount = msalInstance.getActiveAccount()
  const allAccounts = msalInstance.getAllAccounts()

  if (activeAccount || allAccounts.length > 0) {
    await msalInstance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
      account: activeAccount || undefined,
    })
  }
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
    setAzureToken: (state, { payload: { azureToken } }: PayloadAction<{ azureToken: string }>) => {
      state.azureToken = azureToken
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
    setEmailLoginProcessStarted(state, { payload: status }: PayloadAction<boolean>) {
      state.emailLoginProcessStarted = status
    },
    setAzureLoginProcessStarted(state, { payload: status }: PayloadAction<boolean>) {
      state.azureLoginProcessStarted = status
    },
    setAutoLoginProcessStarted(state, { payload: status }: PayloadAction<boolean>) {
      state.autoLoginProcessStarted = status
    },
    setWaitingForToken(state, { payload: status }: PayloadAction<boolean>) {
      state.waitingForToken = status
    },
  },
  extraReducers: (builder) => {
    builder.addCase(startEmailAuthentication.fulfilled, (state, { payload: authProcess }) => {
      state.authProcess = authProcess
      state.waitingForToken = true
    })
    builder.addCase(startEmailAuthentication.rejected, (state, {}) => {
      state.invalidEmail = true
    })
    builder.addCase(completeEmailAuthentication.fulfilled, (state, { payload: user }) => {
      state.user = user as User
      state.online = !!user
      state.waitingForToken = false
    })
    builder.addCase(completeEmailAuthentication.rejected, (state, {}) => {
      state.invalidToken = true
    })
    builder.addCase(azureLogin.fulfilled, (state, { payload: user }) => {
      state.user = user as User
      state.online = !!user
    })
    builder.addCase(azureLogin.rejected, (state, {}) => {
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
  setUser,
  setNewlyCreatedRecoveryKey,
  askForRecoveryKey,
  provideRecoveryKey,
  markRecoveryKeyAsLost,
  setRegistrationInformation,
  setToken,
  setAzureToken,
  setEmail,
  resetCredentials,
  setEmailLoginProcessStarted,
  setAzureLoginProcessStarted,
  setAutoLoginProcessStarted,
  setWaitingForToken,
} = cardinalApiRtk.actions

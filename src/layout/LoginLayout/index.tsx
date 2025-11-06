import { createSelector } from '@reduxjs/toolkit'
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { AppState } from '../../core/app'
import { useAppDispatch, useAppSelector } from '../../core/hooks'
import { CardinalApiState, login, setEmail, setToken } from '../../core/services/auth.api'
import { routes } from '../../navigation/Router'

const selectRestApiData = (state: { cardinalApi: CardinalApiState }) => state.cardinalApi
const selectAppData = (state: { app: AppState }) => state.app

const combinedSelector = createSelector([selectRestApiData, selectAppData], (cardinalApi: CardinalApiState, app: AppState) => ({
  online: cardinalApi.online,
  lsUsername: app?.savedCredentials?.login,
  lsToken: app?.savedCredentials?.token,
}))

function LoginLayout() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const { online, lsUsername, lsToken } = useAppSelector(combinedSelector)

  useEffect(() => {
    if (online) {
      navigate(routes.dashboard)
    } else if (!!lsUsername && !!lsToken && !!dispatch) {
      dispatch(setEmail({ email: lsUsername }))
      dispatch(setToken({ token: lsToken }))
      dispatch(login())
    }
  }, [online, navigate, lsUsername, lsToken, dispatch])

  return (
    <div>
      <Outlet />
    </div>
  )
}

export default LoginLayout

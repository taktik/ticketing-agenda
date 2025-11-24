import { createSelector } from '@reduxjs/toolkit'
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../core/hooks'
import { CardinalApiState } from '../../core/services/auth.api'
import { routes } from '../../navigation/Router'

const selectRestApiData = (state: { cardinalApi: CardinalApiState }) => state.cardinalApi

const combinedSelector = createSelector([selectRestApiData], (cardinalApi: CardinalApiState) => ({
  online: cardinalApi.online,
}))

function LoginLayout() {
  const navigate = useNavigate()

  const { online } = useAppSelector(combinedSelector)

  useEffect(() => {
    console.log('online', online)
    if (online) {
      navigate(routes.dashboard)
    }
  }, [online, navigate])

  return (
    <div>
      <Outlet />
    </div>
  )
}

export default LoginLayout

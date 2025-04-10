import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../core/hooks'
import LoginForm from '../../../components/authentication/LoginForm'
import { completeAuthentication, CardinalApiState, setEmail, setToken, setWaitingForToken, startAuthentication } from '../../../core/services/auth.api'

import logo from '../../../assets/logo_mouscron.png'
import '../index.css'
import { createSelector } from '@reduxjs/toolkit'

const reduxSelector = createSelector(
  (state: { cardinalApi: CardinalApiState }) => state.cardinalApi,
  (cardinalApi: CardinalApiState) => ({
    waitingForToken: cardinalApi.waitingForToken,
    loginProcessStarted: cardinalApi.loginProcessStarted,
  }),
)

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const { waitingForToken, loginProcessStarted } = useAppSelector(reduxSelector)

  const startAuthenticationProcessWithEmailAndCaptchaToken = (email: string, captchaToken: string) => {
    dispatch(setEmail({ email: email }))
    dispatch(startAuthentication({ captchaToken: captchaToken }))
  }

  const completeAuthenticationProcessWithEmailAndValidationCode = (email: string, validationCode: string) => {
    dispatch(setEmail({ email: email }))
    dispatch(setToken({ token: validationCode }))
    dispatch(completeAuthentication())
  }

  useEffect(() => {
    return () => {
      dispatch(setWaitingForToken(false))
    }
  }, [])

  return (
    <div className="auth-page">
      <div className="auth-page__logo">
        <img src={logo} alt="petra-care logo" />
      </div>

      <LoginForm
        state={loginProcessStarted ? 'loading' : waitingForToken ? 'waitingForToken' : 'initialised'}
        submitEmailForTokenRequest={(email: string, captchaToken: string) => startAuthenticationProcessWithEmailAndCaptchaToken(email, captchaToken)}
        submitEmailAndValidationTokenForAuthentication={(email: string, validationCode: string) => completeAuthenticationProcessWithEmailAndValidationCode(email, validationCode)}
      />
    </div>
  )
}

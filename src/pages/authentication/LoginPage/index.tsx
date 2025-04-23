import { Solution } from '@icure/cardinal-sdk'
import { createSelector } from '@reduxjs/toolkit'
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

import logo from '../../../assets/mouscronLogo.png'
import '../index.css'
import LoginForm from '../../../components/authentication/LoginForm'
import { ModalRecoveryKeyRequest } from '../../../components/authentication/ModalRecoveryKeyRequest'
import { useAppDispatch, useAppSelector } from '../../../core/hooks'
import { CardinalApiState, completeAuthentication, setEmail, setToken, setWaitingForToken, startAuthentication } from '../../../core/services/auth.api'

const reduxSelector = createSelector(
  (state: { cardinalApi: CardinalApiState }) => state.cardinalApi,
  (cardinalApi: CardinalApiState) => ({
    waitingForToken: cardinalApi.waitingForToken,
    loginProcessStarted: cardinalApi.loginProcessStarted,
    recoveryKeyRequest: cardinalApi.recoveryKeyRequest,
  }),
)

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const { waitingForToken, loginProcessStarted, recoveryKeyRequest } = useAppSelector(reduxSelector)

  const startAuthenticationProcessWithEmailAndCaptchaToken = (email: string, captchaToken: Solution) => {
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
        submitEmailForTokenRequest={(email: string, captchaToken: Solution) => startAuthenticationProcessWithEmailAndCaptchaToken(email, captchaToken)}
        submitEmailAndValidationTokenForAuthentication={(email: string, validationCode: string) => completeAuthenticationProcessWithEmailAndValidationCode(email, validationCode)}
      />
      {recoveryKeyRequest && createPortal(<ModalRecoveryKeyRequest />, document.body)}
    </div>
  )
}

import { MailOutlined } from '@ant-design/icons'
import { Solution } from '@icure/cardinal-sdk'
import { createSelector } from '@reduxjs/toolkit'
import { Button } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LoginForm from '../../../components/authentication/LoginForm'
import { useAppDispatch, useAppSelector } from '../../../core/hooks'
import { CardinalApiState, completeEmailAuthentication, setEmail, setToken, setWaitingForToken, startEmailAuthentication } from '../../../core/services/auth.api'
import '../index.less'

const reduxSelector = createSelector(
  (state: { cardinalApi: CardinalApiState }) => state.cardinalApi,
  (cardinalApi: CardinalApiState) => ({
    waitingForToken: cardinalApi.waitingForToken,
    emailLoginProcessStarted: cardinalApi.emailLoginProcessStarted,
    recoveryKeyRequest: cardinalApi.recoveryKeyRequest,
  }),
)

export default function EmailLogin() {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const { waitingForToken, emailLoginProcessStarted } = useAppSelector(reduxSelector)
  const [isExpanded, setIsExpanded] = useState(false)

  const startAuthenticationProcessWithEmailAndCaptchaToken = (email: string, captchaToken: Solution) => {
    dispatch(setEmail({ email: email }))
    dispatch(startEmailAuthentication({ captchaToken: captchaToken, language: i18n.language }))
  }

  const completeAuthenticationProcessWithEmailAndValidationCode = (email: string, validationCode: string) => {
    dispatch(setEmail({ email: email }))
    dispatch(setToken({ token: validationCode }))
    dispatch(completeEmailAuthentication())
  }

  useEffect(() => {
    return () => {
      dispatch(setWaitingForToken(false))
    }
  }, [dispatch])

  useEffect(() => {
    if (waitingForToken || emailLoginProcessStarted) {
      setIsExpanded(true)
    }
  }, [waitingForToken, emailLoginProcessStarted])

  if (!isExpanded) {
    return (
      <Button onClick={() => setIsExpanded(true)}>
        <span style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
          <MailOutlined />
          {t('content.sign_in_with_email')}
        </span>
      </Button>
    )
  }

  return (
    <>
      <LoginForm
        state={emailLoginProcessStarted ? 'loading' : waitingForToken ? 'waitingForToken' : 'initialised'}
        submitEmailForTokenRequest={(email: string, captchaToken: Solution) => startAuthenticationProcessWithEmailAndCaptchaToken(email, captchaToken)}
        submitEmailAndValidationTokenForAuthentication={(email: string, validationCode: string) => completeAuthenticationProcessWithEmailAndValidationCode(email, validationCode)}
      />
    </>
  )
}

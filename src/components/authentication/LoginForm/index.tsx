import { Challenge, Solution, resolveChallenge } from '@icure/cardinal-sdk'
import { Button, Form, Input } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { MSG_GW_URL, SPEC_ID } from '../../../constants'
import { SpinLoader } from '../../common/SpinLoader' 
import '../index.css'
import { KerberusWidget } from '../KerberusWidget'

interface LoginFormProps {
  state: 'initialised' | 'loading' | 'waitingForToken'
  submitEmailForTokenRequest: (email: string, captchaToken: Solution) => void
  submitEmailAndValidationTokenForAuthentication: (email: string, validationCode: string) => void
}

const LoginForm: React.FC<LoginFormProps> = ({ state, submitEmailForTokenRequest, submitEmailAndValidationTokenForAuthentication }) => {
  const { t } = useTranslation()
  const [captchaToken, setCaptchaToken] = useState<Solution | undefined>(undefined)
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const [challenge, setChallenge] = useState<Challenge | undefined>(undefined)

  useEffect(() => {
    fetch(`${MSG_GW_URL}/${SPEC_ID}/challenge`)
      .then((x) => x.json())
      .then((challenge) => setChallenge(challenge))
  }, [])

  const updateProgress = useCallback(
    (value: number) => {
      flushSync(() => {
        setProgress(value * 100)
      })
    },
    [setProgress],
  )

  useEffect(() => {
    if (challenge != undefined) {
      resolveChallenge(challenge, SPEC_ID!, undefined, updateProgress).then((solution) => {
        setProgress(undefined)
        setChallenge(undefined)
        setCaptchaToken(solution)
      })
    }
  }, [challenge])

  /**
   * This function is called each time we press on the submit button of the login form
   * Depending on the state of the api, it will either set the email to let redux start
   * the authentication ot try to log you in using the email and token
   *
   * @param values
   */
  const handleSubmit = (values: { email: string; validationCode: string }) => {
    const { email, validationCode } = values

    /** Some error management should be done here ? */
    if (email.length === 0) {
      return
    }

    if (state === 'waitingForToken') {
      /** Some error management should be done here ? */
      if (validationCode.length === 0) {
        return
      }
      submitEmailAndValidationTokenForAuthentication(email, validationCode)
    } else {
      if (!captchaToken) {
        return
      }
      submitEmailForTokenRequest(email, captchaToken)
    }
  }

  return (
    <>
      {state === 'loading' && <SpinLoader />}
      <Form onFinish={(values) => handleSubmit(values)} className="auth-form" layout="vertical">
        <div className="auth-form__title">
          <h2>{t('content.login_title')}</h2>
        </div>
        <div className="auth-form__inputs">
          <Form.Item name="email" label={t('content.email')} rules={[{ required: true, message: t('validation.email_required') }]}>
            <Input placeholder={t('content.email')} size="large" style={{ fontSize: 13 }} />
          </Form.Item>

          {state === 'waitingForToken' && (
            <Form.Item name="validationCode" label={t('content.validation_code_label')} rules={[{ required: true, message: t('validation.validation_code_required') }]}>
              <Input placeholder={t('content.validation_code_label')} size="large" style={{ fontSize: 13 }} />
            </Form.Item>
          )}
        </div>
        {!!progress && <KerberusWidget progress={progress} />}
        <Button type="primary" size="large" htmlType="submit" disabled={(state === 'initialised' && !captchaToken) || state === 'loading'}>
          {state === 'waitingForToken' ? t('content.login_button') : t('content.receive_one_time_code')}
        </Button>
      </Form>
    </>
  )
}

export default LoginForm

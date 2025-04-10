import { Challenge, resolveChallenge, Solution } from '@icure/cardinal-sdk'
import { Button, Form, Input } from 'antd'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MSG_GW_URL, SPEC_ID } from '../../../constants'

import { routes } from '../../../navigation/Router'

import '../index.css'
import { SpinLoader } from '../../common/SpinLoader'
import { KerberusWidget } from '../KerberusWidget'

interface LoginFormProps {
  state: 'initialised' | 'loading' | 'waitingForToken'
  submitEmailForTokenRequest: (email: string, captchaToken: Solution) => void
  submitEmailAndValidationTokenForAuthentication: (email: string, validationCode: string) => void
}

const LoginForm: React.FC<LoginFormProps> = ({ state, submitEmailForTokenRequest, submitEmailAndValidationTokenForAuthentication }) => {
  const [captchaToken, setCaptchaToken] = useState<Solution | undefined>(undefined)
  const [progress, setProgress] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!SPEC_ID) {
      console.error('No spec id found')
      return
    }
    let running = true
    fetch(`${MSG_GW_URL}/${SPEC_ID}/challenge`)
      .then((x) => x.json())
      .then((challenge: Challenge) => {
        if (running) {
          return resolveChallenge(challenge, SPEC_ID!, undefined, (progress) => {
            setProgress(progress * 100)
          })
        } else {
          return Promise.reject('Cancelled')
        }
      })
      .then((solution) => {
        setProgress(undefined)
        setCaptchaToken(solution)
      })
      .catch((e) => {
        console.warn(e)
      })
    return () => {
      running = false
    }
  }, [])

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
          <h2>Login</h2>
        </div>
        <div className="auth-form__inputs">
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email is required' }]}>
            <Input placeholder="Email" size="large" style={{ fontSize: 13 }} />
          </Form.Item>

          {state === 'waitingForToken' && (
            <Form.Item name="validationCode" label="Validation Code" rules={[{ required: true, message: 'Validation code is required' }]}>
              <Input placeholder="Validation Code" size="large" style={{ fontSize: 13 }} />
            </Form.Item>
          )}
        </div>
        <div className="auth-form__textHelper">
          <p>
            By login, you accept our{' '}
            <Link className="link" to="#">
              Terms of use
            </Link>{' '}
            and{' '}
            <Link className="link" to="#">
              Privacy policy
            </Link>
          </p>
        </div>
        {!!progress && <KerberusWidget progress={progress} />}
        <Button type="primary" size="large" htmlType="submit" disabled={(state === 'initialised' && !captchaToken) || state === 'loading'}>
          {state === 'waitingForToken' ? 'Log in' : 'Receive a one time code'}
        </Button>
        <div className="auth-form__textHelper">
          <p>
            Not registered yet?{' '}
            <Link className="link" to={routes.register}>
              Create an account
            </Link>
          </p>
        </div>
      </Form>
    </>
  )
}

export default LoginForm

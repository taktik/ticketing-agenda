import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AuthenticatedLayout from '../layout/AuthenticatedLayout'
import DashboardLayout from '../layout/DashboardLayout'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/authentication/LoginPage'
import RegisterPage from '../pages/authentication/RegisterPage'
import AppointmentLayout from '../layout/AppointmentLayout'
import { ConfigProvider } from 'antd'

export const routes = {
  dashboard: '/dashboard',
  login: '/',
  register: '/register',
  appointmentNew: '/appointment/new',
  appointmentConfirmation: '/appointment/confirm',
  appointmentSuccess: '/appointment/success',
  appointmentError: '/appointment/error',
  appointmentModification: '/appointment/modification',
  appointmentCancellation: '/appointment/cancel',
}

export const Router = () => (
  <ConfigProvider
    theme={{
      components: {
        Select: {
          //colorPrimary: '#e30613',
          optionSelectedBg: '#e306131a',
          //controlOutline: '#e306131a',
          optionSelectedColor: '#e30613',
        },
        Menu: {
          itemHoverBg: '#e306131a',
          itemSelectedBg: '#e30613',
          itemSelectedColor: '#ffffff',
          itemMarginBlock: '0.75rem',
          itemPaddingInline: 0,
          itemMarginInline: 0,
          itemBg: '#ffffff',
          subMenuItemBg: '#ffffff',
          itemBorderRadius: 0,
        },
      },
    }}
  >
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path={routes.login} element={<LoginPage />} />
          <Route path={routes.register} element={<RegisterPage />} />
        </Route>
        <Route element={<AuthenticatedLayout />}>
          <Route path={routes.dashboard} element={<DashboardPage />} />
        </Route>
        <Route element={<AppointmentLayout />}>
          <Route path={routes.appointmentNew} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ConfigProvider>
)

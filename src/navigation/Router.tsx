import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AuthenticatedLayout from '../layout/AuthenticatedLayout'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/authentication/LoginPage'
import RegisterPage from '../pages/authentication/RegisterPage'
import AppointmentLayout from '../layout/AppointmentLayout'
import NewPage from '../pages/appointment/NewPage'
import LoginLayout from '../layout/LoginLayout'

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
  <BrowserRouter>
    <Routes>
      <Route element={<LoginLayout />}>
        <Route path={routes.login} element={<LoginPage />} />
        <Route path={routes.register} element={<RegisterPage />} />
      </Route>
      <Route element={<AuthenticatedLayout />}>
        <Route path={routes.dashboard} element={<DashboardPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
)
//<Route element={<AppointmentLayout />}></Route>
//        <Route path={routes.appointmentNew} element={<DashboardPage />} />

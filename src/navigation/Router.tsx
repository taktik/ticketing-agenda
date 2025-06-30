import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AuthenticatedLayout from '../layout/AuthenticatedLayout'
import LoginLayout from '../layout/LoginLayout'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/authentication/LoginPage'
import RegisterPage from '../pages/authentication/RegisterPage'
import { PageNotFound } from '../pages/NotFoundPage'

export const routes = {
  dashboard: '/dashboard',
  login: '/',
  notFound: '*',
}

export const Router = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<LoginLayout />}>
        <Route path={routes.login} element={<LoginPage />} />
      </Route>
      <Route element={<AuthenticatedLayout />}>
        <Route path={routes.dashboard} element={<DashboardPage />} />
      </Route>
      <Route path={routes.notFound} element={<PageNotFound />} />
    </Routes>
  </BrowserRouter>
)

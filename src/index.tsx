import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './core/store'
import App from './App'
import './i18n'

import './style/less/index.css'

const container = document.getElementById('root')!
const root = createRoot(container)

root.render(
  <Provider store={store}>
    <App />
  </Provider>,
)

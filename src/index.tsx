import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import App from './App'
import { msalConfig } from './config/config.azure'
import { persistor, store } from './core/store'
import './i18n'
import './style/less/index.css'

const container = document.getElementById('root')!
const root = createRoot(container)

export const msalInstance = new PublicClientApplication(msalConfig)

root.render(
  <Provider store={store}>
    <PersistGate persistor={persistor} loading={<p>Loading Persisted State...</p>}>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </PersistGate>
  </Provider>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { store } from './store'
import ErrorBoundary from './components/ErrorBoundary'
import { WebSocketProvider } from './components/WebSocketProvider'
import ThemeProvider from './components/ThemeProvider'
import { OptimizationProvider } from './context/OptimizationContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <BrowserRouter>
            <WebSocketProvider>
              <OptimizationProvider>
                <App />
              </OptimizationProvider>
            </WebSocketProvider>
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
)


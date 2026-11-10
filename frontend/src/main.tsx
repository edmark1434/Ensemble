import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ConsoleRouter from './lib/ConsoleRouter.tsx'
import { bootConsoleHost } from './lib/consoleHosts.ts'
import { installDefaultAxiosCsrfInterceptor } from './lib/axios.ts'

installDefaultAxiosCsrfInterceptor()

if (!bootConsoleHost()) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ConsoleRouter>
        <App />
      </ConsoleRouter>
    </StrictMode>,
  )
}

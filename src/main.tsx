import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/effects.css'
import './styles/layout.css'
import { App } from './App'
import { installRipple } from './lib/ripple'

// Las pantallas restauran su propio scroll al animarse (ver layouts/transitions.ts).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

installRipple()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

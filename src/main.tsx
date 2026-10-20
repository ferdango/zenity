import { PostHogProvider } from '@posthog/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/effects.css'
import './styles/layout.css'
import { App } from './App'
import { POSTHOG_OPTIONS, POSTHOG_TOKEN } from './lib/analytics'
import { installRipple } from './lib/ripple'

// Las pantallas restauran su propio scroll al animarse (ver layouts/transitions.ts).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

installRipple()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {POSTHOG_TOKEN ? (
      <PostHogProvider apiKey={POSTHOG_TOKEN} options={POSTHOG_OPTIONS}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/roboto-flex/standard.css'
import '@fontsource-variable/doto/full.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/lamp.css'
import { App } from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

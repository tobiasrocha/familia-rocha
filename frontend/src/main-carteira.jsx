import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppCarteira from './AppCarteira.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppCarteira />
  </StrictMode>,
)

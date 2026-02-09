import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Voter from './voters_table.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Voter />
  </StrictMode>,
)
